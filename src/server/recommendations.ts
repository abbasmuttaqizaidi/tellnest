import { createServerFn } from '@tanstack/react-start'
import type { ReadingSessionRecord, UserPreferencesPayload } from '../lib/recommendations/engine'

export interface UserRecommendationSignals {
  profileId: string | null
  readingHistory: ReadingSessionRecord[]
  bookmarkedWorkIds: string[]
  preferences: UserPreferencesPayload | null
}

/**
 * Server Function: Fetches authenticated user's reading behavior signals
 * directly from Supabase PostgreSQL using secure Clerk server auth.
 */
export const getUserRecommendationSignalsServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<UserRecommendationSignals> => {
    try {
      // 1. Strictly resolve Clerk session server-side
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const authState = await auth()
      const clerkUserId = authState?.userId

      if (!clerkUserId) {
        return {
          profileId: null,
          readingHistory: [],
          bookmarkedWorkIds: [],
          preferences: null,
        }
      }

      const { createAdminClient } = await import('../lib/supabase/server')
      const admin = createAdminClient()

      // 2. Resolve internal profile UUID and onboarding preferences
      const { data: profile } = await admin
        .from('profiles')
        .select('id, preferences')
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle()

      if (!profile?.id) {
        return {
          profileId: null,
          readingHistory: [],
          bookmarkedWorkIds: [],
          preferences: null,
        }
      }

      // 3. Query user's bookmarked work IDs
      const { data: bookmarks } = await admin
        .from('bookmarks')
        .select('work_id')
        .eq('user_id', profile.id)

      const bookmarkedWorkIds = (bookmarks || []).map((b) => b.work_id)

      // 4. Query user's recent active reading history (past 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: historyRows } = await admin
        .from('reading_history')
        .select('work_id, chapter_id, duration_seconds, last_read_at')
        .eq('user_id', profile.id)
        .gte('last_read_at', thirtyDaysAgo)
        .order('last_read_at', { ascending: false })

      const readingHistory: ReadingSessionRecord[] = (historyRows || []).map((row) => ({
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
    } catch (e: any) {
      console.warn('[getUserRecommendationSignalsServerFn] Error:', e?.message || e)
      return {
        profileId: null,
        readingHistory: [],
        bookmarkedWorkIds: [],
        preferences: null,
      }
    }
  })
