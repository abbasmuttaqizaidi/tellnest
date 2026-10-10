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

      const { data: records, error } = await admin
        .from('reading_progress')
        .select('id, user_id, work_id, chapter_id, progress_percent, position, last_read_at')
        .eq('user_id', targetUserId)
        .order('last_read_at', { ascending: false })

      if (error) {
        console.warn('[getAllUserReadingProgressServerFn] DB warning:', error.message)
        return []
      }
      return records || []
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
