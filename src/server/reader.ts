import { createServerFn } from '@tanstack/react-start'
import {
  getReaderLibrary,
  saveWorkToLibrary,
  removeWorkFromLibrary,
  getReadingProgress,
  getAllUserReadingProgress,
} from '../lib/supabase/queries/reader'
import { saveReadingProgressAtomicCore } from './readingProgressCore.ts'
import type { SaveProgressPayload } from '../lib/readingProgress/types.ts'

export { saveReadingProgressAtomicCore }

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

      // Resolve profile id for the Clerk user id (with in-memory cache)
      const { getCachedProfileByClerkId } = await import('./authors')
      const profile = await getCachedProfileByClerkId(admin, data.userId)

      const targetUserId = profile?.id || data.userId

      // Fetch all works authored by this user to exclude them from reader progress
      const { data: authorWorks } = await admin
        .from('works')
        .select('id')
        .or(`author_id.eq.${targetUserId}${profile?.id && profile.id !== targetUserId ? `,author_id.eq.${profile.id}` : ''}`)

      const authorWorkIds = new Set((authorWorks || []).map((w: any) => w.id))

      const { data: records, error } = await admin
        .from('reading_progress')
        .select(`
          id,
          user_id,
          work_id,
          chapter_id,
          progress_percent,
          position,
          last_read_at,
          chapter:chapters(id, chapter_number, title)
        `)
        .eq('user_id', targetUserId)
        .order('last_read_at', { ascending: false })

      if (error) {
        console.warn('[getAllUserReadingProgressServerFn] DB warning:', error.message)
        return []
      }
      return (records || [])
        .filter((r: any) => !authorWorkIds.has(r.work_id))
        .map((r: any) => {
          const ch = Array.isArray(r.chapter) ? r.chapter[0] : r.chapter
          return {
            id: r.id,
            user_id: r.user_id,
            work_id: r.work_id,
            chapter_id: r.chapter_id,
            progress_percent: Math.min(100, Math.max(0, Math.round(Number(r.progress_percent || 0)))),
            position: r.position,
            last_read_at: r.last_read_at,
            chapter_number: ch?.chapter_number || null,
            chapter_title: ch?.title || null,
          }
        })
    } catch (e: any) {
      console.warn('[getAllUserReadingProgressServerFn] Error:', e?.message || e)
      return []
    }
  })

/**
 * Server Function: Atomically save paragraph-based reading progress.
 * Authenticated via Clerk server auth().
 * Enforces monotonic whole-story progress_percent while allowing last_position to move backwards.
 */
export const saveReadingProgressServerFn = createServerFn({ method: 'POST' })
  .validator((params: SaveProgressPayload) => {
    if (!params?.workId || !params?.chapterId) {
      throw new Error('workId and chapterId are required')
    }
    return {
      workId: String(params.workId).trim(),
      chapterId: String(params.chapterId).trim(),
      batchId: String(params.batchId || '').trim(),
      paragraphId: String(params.paragraphId || '').trim(),
      orderIndex: Math.max(0, Math.round(Number(params.orderIndex) || 0)),
      totalParagraphs: Math.max(0, Math.round(Number(params.totalParagraphs) || 0)),
      lastPosition: typeof params.lastPosition === 'string'
        ? params.lastPosition
        : JSON.stringify(params.lastPosition || {}),
    }
  })
  .handler(async ({ data }) => {
    try {
      // 1. Strictly authenticate via Clerk server session
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const authState = await auth()
      const clerkUserId = authState?.userId

      if (!clerkUserId) {
        return { success: false, reason: 'unauthenticated', batchId: data.batchId }
      }

      // 2. Validate workId and chapterId format (only UUIDs can be stored in PostgreSQL)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(data.workId) || !uuidRegex.test(data.chapterId)) {
        // Non-UUID mock data works - acknowledge cleanly without database error
        return {
          success: true,
          mocked: true,
          batchId: data.batchId,
          progressPercent: data.totalParagraphs > 0 ? (data.orderIndex / data.totalParagraphs) * 100 : 0,
          lastPosition: data.lastPosition,
        }
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
        return { success: false, reason: 'profile_not_found', batchId: data.batchId }
      }

      const userId = profile.id

      // 4. Authorship safeguard: Authors must not have reading progress recorded for their own works
      const { data: workRecord } = await admin
        .from('works')
        .select('author_id')
        .eq('id', data.workId)
        .maybeSingle()

      if (workRecord && workRecord.author_id === userId) {
        return { success: true, own_work: true, batchId: data.batchId }
      }

      // 5. Execute atomic PostgreSQL persistence
      return await saveReadingProgressAtomicCore(admin, {
        userId,
        workId: data.workId,
        chapterId: data.chapterId,
        batchId: data.batchId,
        paragraphId: data.paragraphId,
        orderIndex: data.orderIndex,
        totalParagraphs: data.totalParagraphs,
        lastPosition: data.lastPosition,
      })
    } catch (e: any) {
      console.warn('[saveReadingProgressServerFn] Error:', e?.message || e)
      return {
        success: false,
        batchId: data.batchId,
        progressPercent: 0,
        lastPosition: null,
        error: e?.message || 'internal_error',
      }
    }
  })
