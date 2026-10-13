import { createServerFn } from '@tanstack/react-start'
import {
  getReaderLibrary,
  saveWorkToLibrary,
  removeWorkFromLibrary,
  getReadingProgress,
  getAllUserReadingProgress,
  updateReadingProgress,
} from '../lib/supabase/queries/reader'

/**
 * Server Function: Get user's personal Library with strict pagination.
 */
export const getReaderLibraryServerFn = createServerFn({ method: 'GET' })
  .validator((params: { userId: string; limit?: number; offset?: number }) => {
    if (!params.userId) throw new Error('User ID is required')
    return {
      userId: params.userId,
      limit: Math.min(Math.max(1, params.limit || 20), 50),
      offset: Math.max(0, params.offset || 0),
    }
  })
  .handler(async ({ data }) => {
    return await getReaderLibrary(data.userId, { limit: data.limit, offset: data.offset })
  })

/**
 * Server Function: Save a work to library.
 */
export const saveWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await saveWorkToLibrary(data.userId, data.workId)
  })

/**
 * Server Function: Remove a work from library.
 */
export const removeWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await removeWorkFromLibrary(data.userId, data.workId)
  })

/**
 * Server Function: Get reading progress coordinates.
 */
export const getReadingProgressServerFn = createServerFn({ method: 'GET' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await getReadingProgress(data.userId, data.workId)
  })

/**
 * Server Function: Get all reading progress records for a user across all manuscripts.
 */
export const getAllUserReadingProgressServerFn = createServerFn({ method: 'GET' })
  .validator((params: { userId: string }) => {
    if (!params?.userId) throw new Error('userId is required')
    return params
  })
  .handler(async ({ data }) => {
    try {
      const { createAdminClient } = await import('../lib/supabase/server')
      const admin = createAdminClient()

      // Resolve profile id for the Clerk user id
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', data.userId)
        .maybeSingle()

      const targetUserId = profile?.id || data.userId

      // Fetch all works authored by this user to exclude them from reader progress
      const { data: authorWorks } = await admin
        .from('works')
        .select('id')
        .or(`author_id.eq.${targetUserId}${profile?.id && profile.id !== targetUserId ? `,author_id.eq.${profile.id}` : ''}`)

      const authorWorkIds = new Set((authorWorks || []).map((w: any) => w.id))

      const { data: records, error } = await admin
        .from('reading_progress')
        .select('id, user_id, work_id, chapter_id, progress_percent, position, last_read_at')
        .eq('user_id', targetUserId)
        .order('last_read_at', { ascending: false })

      if (error) {
        console.warn('[getAllUserReadingProgressServerFn] DB warning:', error.message)
        return []
      }
      return (records || []).filter((r: any) => !authorWorkIds.has(r.work_id))
    } catch (e: any) {
      console.warn('[getAllUserReadingProgressServerFn] Error:', e?.message || e)
      return []
    }
  })

/**
 * Server Function: Update reading progress coordinates.
 */
export const updateReadingProgressServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    userId: string
    workId: string
    chapterId: string
    progressPercent: number
    position?: string
  }) => {
    if (!params?.userId || !params?.workId || !params?.chapterId) {
      throw new Error('userId, workId, and chapterId are required')
    }
    return {
      ...params,
      progressPercent: Math.min(100, Math.max(0, params.progressPercent)),
    }
  })
  .handler(async ({ data }) => {
    try {
      const { createAdminClient } = await import('../lib/supabase/server')
      const admin = createAdminClient()

      // Resolve profile id for the Clerk user id
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', data.userId)
        .maybeSingle()

      const targetUserId = profile?.id || data.userId

      // Check if work is a UUID (custom database work) or mock string
      const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (!isWorkUuid) {
        // Mock data works (e.g. 'work-1') cannot be saved in PostgreSQL UUID columns - silently return
        return null
      }

      // Check if user is the author of this work
      const { data: workRecord } = await admin
        .from('works')
        .select('author_id')
        .eq('id', data.workId)
        .maybeSingle()

      if (
        workRecord &&
        (workRecord.author_id === targetUserId || (profile?.id && workRecord.author_id === profile.id))
      ) {
        // Author reading their own work - remove any previous reading progress record and return null
        await admin
          .from('reading_progress')
          .delete()
          .eq('user_id', targetUserId)
          .eq('work_id', data.workId)
        return null
      }

      const { data: updated, error } = await admin
        .from('reading_progress')
        .upsert(
          {
            user_id: targetUserId,
            work_id: data.workId,
            chapter_id: data.chapterId,
            progress_percent: Math.min(100, Math.max(0, data.progressPercent)),
            position: data.position || null,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,work_id' }
        )
        .select('id, user_id, work_id, chapter_id, progress_percent, position, last_read_at')
        .maybeSingle()

      if (error) {
        console.warn('[updateReadingProgressServerFn] DB warning:', error.message)
        return null
      }
      return updated
    } catch (e: any) {
      console.warn('[updateReadingProgressServerFn] Error:', e?.message || e)
      return null
    }
  })

/**
 * Server Function: Record active reading heartbeat, progress, and chapter completion.
 * Protected: Strictly authenticates caller using Clerk server auth().
 */
export const recordReadingHeartbeatServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    workId: string
    chapterId: string
    activeSecondsDelta: number
    progressPercent: number
    maxProgressPercent: number
    endMarkerReached: boolean
    isCompleted?: boolean
  }) => {
    if (!params?.workId || !params?.chapterId) {
      throw new Error('workId and chapterId are required')
    }
    return {
      workId: params.workId.trim(),
      chapterId: params.chapterId.trim(),
      // Bound the delta per heartbeat (max 60 seconds per payload) to prevent client spoofing
      activeSecondsDelta: Math.max(0, Math.min(60, Math.round(params.activeSecondsDelta || 0))),
      progressPercent: Math.min(100, Math.max(0, Math.round(params.progressPercent || 0))),
      maxProgressPercent: Math.min(100, Math.max(0, Math.round(params.maxProgressPercent || 0))),
      endMarkerReached: Boolean(params.endMarkerReached),
      isCompleted: Boolean(params.isCompleted),
    }
  })
  .handler(async ({ data }) => {
    try {
      // 1. Strictly authenticate via Clerk server session
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const authState = await auth()
      const clerkUserId = authState?.userId

      if (!clerkUserId) {
        return { success: false, reason: 'unauthenticated' }
      }

      // 2. Validate workId and chapterId format (only UUIDs can be stored in PostgreSQL)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(data.workId) || !uuidRegex.test(data.chapterId)) {
        // Non-UUID mock data works - silently acknowledge without throwing
        return { success: true, mocked: true }
      }

      const { createAdminClient } = await import('../lib/supabase/server')
      const admin = createAdminClient()

      // 3. Resolve internal profile UUID for this Clerk user
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle()

      if (!profile?.id) {
        return { success: false, reason: 'profile_not_found' }
      }

      const userId = profile.id

      // 4. Authorship safeguard: Authors must not have reading progress or history recorded for their own works
      const { data: workRecord } = await admin
        .from('works')
        .select('author_id')
        .eq('id', data.workId)
        .maybeSingle()

      if (workRecord && workRecord.author_id === userId) {
        return { success: true, own_work: true }
      }

      const now = new Date().toISOString()

      // 5. Atomic Upsert for reading_progress (Cursor and position)
      await admin
        .from('reading_progress')
        .upsert(
          {
            user_id: userId,
            work_id: data.workId,
            chapter_id: data.chapterId,
            progress_percent: data.progressPercent,
            last_read_at: now,
          },
          { onConflict: 'user_id,work_id' }
        )

      // 6. Reading History Session & Active Duration Tracking
      // Find the most recent active reading_history entry for this user, work, and chapter (within the last 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      const { data: existingSession } = await admin
        .from('reading_history')
        .select('id, duration_seconds, completed_at')
        .eq('user_id', userId)
        .eq('work_id', data.workId)
        .eq('chapter_id', data.chapterId)
        .gte('last_read_at', fourHoursAgo)
        .order('last_read_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession?.id) {
        const nextDuration = (existingSession.duration_seconds || 0) + data.activeSecondsDelta
        const shouldMarkCompleted = data.isCompleted || !!existingSession.completed_at

        await admin
          .from('reading_history')
          .update({
            duration_seconds: nextDuration,
            last_read_at: now,
            completed_at: shouldMarkCompleted ? (existingSession.completed_at || now) : null,
          })
          .eq('id', existingSession.id)
      } else {
        // Start a fresh reading session entry
        await admin
          .from('reading_history')
          .insert({
            user_id: userId,
            work_id: data.workId,
            chapter_id: data.chapterId,
            duration_seconds: data.activeSecondsDelta,
            started_at: now,
            last_read_at: now,
            completed_at: data.isCompleted ? now : null,
          })
      }

      return { success: true }
    } catch (e: any) {
      console.warn('[recordReadingHeartbeatServerFn] Error:', e?.message || e)
      return { success: false, error: e?.message || 'internal_error' }
    }
  })
