import { createServerFn } from '@tanstack/react-start'
import type { ReadingSessionRecord, UserPreferencesPayload } from '../lib/recommendations/engine'

export interface UserRecommendationSignals {
  profileId: string | null
  readingHistory: ReadingSessionRecord[]
  bookmarkedWorkIds: string[]
  preferences: UserPreferencesPayload | null
}

export class UnauthorizedError extends Error {
  status = 401
  statusCode = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export interface RecommendationDependencies {
  getAuthState?: () => Promise<{ userId?: string | null } | null>
  createAdminClient?: () => any
  setResponseStatus?: (status: number) => void
}

/**
 * Core business logic: Fetches authenticated user's reading behavior signals
 * directly from Supabase PostgreSQL using secure Clerk server auth.
 * Fails closed and reports 401 Unauthorized for unauthenticated callers.
 */
export async function executeGetUserRecommendationSignals(
  dependencies: RecommendationDependencies = {}
): Promise<UserRecommendationSignals> {
  const authFn = dependencies.getAuthState || (async () => {
    const { auth } = await import('@clerk/tanstack-react-start/server')
    return await auth()
  })

  const authState = await authFn()
  const clerkUserId = authState?.userId

  if (!clerkUserId) {
    if (dependencies.setResponseStatus) {
      dependencies.setResponseStatus(401)
    } else {
      try {
        const { setResponseStatus } = await import('@tanstack/react-start/server')
        setResponseStatus(401)
      } catch {
        // Outside active server request context
      }
    }
    throw new UnauthorizedError('Unauthorized: Authentication required for recommendation signals')
  }

  const adminClientFactory = dependencies.createAdminClient || (async () => {
    const { createAdminClient } = await import('../lib/supabase/server.ts')
    return createAdminClient()
  })

  const admin = await adminClientFactory()

  // 2. Resolve internal profile UUID and onboarding preferences (with in-memory cache)
  const { getCachedProfileByClerkId } = await import('./authors.ts')
  const profile = await getCachedProfileByClerkId(admin, clerkUserId)

  if (!profile?.id) {
    return {
      profileId: null,
      readingHistory: [],
      bookmarkedWorkIds: [],
      preferences: null,
    }
  }

  // 3 & 4. Query user bookmarks and recent reading history (past 30 days) concurrently
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { data: bookmarks, error: bookmarkErr },
    { data: historyRows, error: historyErr },
  ] = await Promise.all([
    admin.from('bookmarks').select('work_id').eq('user_id', profile.id),
    admin
      .from('reading_history')
      .select('work_id, chapter_id, duration_seconds, last_read_at')
      .eq('user_id', profile.id)
      .gte('last_read_at', thirtyDaysAgo)
      .order('last_read_at', { ascending: false }),
  ])

  if (bookmarkErr) {
    console.warn('[executeGetUserRecommendationSignals] Bookmarks query error:', bookmarkErr.message)
  }
  if (historyErr) {
    console.warn('[executeGetUserRecommendationSignals] History query error:', historyErr.message)
  }

  const bookmarkedWorkIds = (bookmarks || []).map((b: any) => b.work_id)

  const readingHistory: ReadingSessionRecord[] = (historyRows || []).map((row: any) => ({
    workId: row.work_id,
    chapterId: row.chapter_id,
    durationSeconds: Number(row.duration_seconds || 0),
    lastReadAt: row.last_read_at,
  }))

  return {
    profileId: profile.id,
    readingHistory,
    bookmarkedWorkIds,
    preferences: (profile.preferences as UserPreferencesPayload) || null,
  }
}

/**
 * Server Function: Fetches authenticated user's reading behavior signals
 * directly from Supabase PostgreSQL using secure Clerk server auth.
 */
export const getUserRecommendationSignalsServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<UserRecommendationSignals> => {
    return await executeGetUserRecommendationSignals()
  })
