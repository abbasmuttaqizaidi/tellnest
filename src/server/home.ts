import { createServerFn } from '@tanstack/react-start'
import {
  executeGetTopShelf,
  executeGetTrendingWorks,
  executeGetBingeableWorks,
  executeGetNewVoices,
} from './works'
import {
  executeGetUserSessionBootstrap,
  type UserSessionBootstrap,
} from './authors'
import {
  executeGetUserRecommendationSignals,
  type UserRecommendationSignals,
} from './recommendations'
import { isReligiousWork } from '../lib/discover/filters'
import type { ServerAuthState } from './auth'

export interface HomeFeedData {
  authUser: ServerAuthState
  initialBootstrap: UserSessionBootstrap | null
  initialRecSignals: UserRecommendationSignals | null
  initialWorks: any[] | null
  initialTopShelf: any[] | null
  initialTrending: any[] | null
  initialBingeable: any[] | null
  initialNewVoices: any[] | null
  catalogError: boolean
}

/**
 * Server Function: Unified Home Feed Pre-fetcher
 *
 * Consolidates all home page section queries (Top Shelf, Trending, Bingeable,
 * New Voices, User Bootstrap with reading works, and Recommendation Signals)
 * into a SINGLE high-performance RPC call running strictly on the server.
 *
 * Benefits:
 * 1. Zero client-side DB query errors: Raw server code NEVER executes in browser.
 * 2. Instant client-side navigation (e.g. clicking logo or home route from other pages).
 * 3. 0ms waterfall: Fetches all 6 feeds concurrently on serverless backend.
 * 4. Eliminates stuck skeleton and empty home screen flushes.
 */
export const getHomePageDataServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { currentUserId?: string | null }) => ({
    currentUserId: params?.currentUserId || null,
  }))
  .handler(async ({ data }): Promise<HomeFeedData> => {
    let authUser: ServerAuthState = {
      userId: null,
      isAuthenticated: false,
      onboardingCompleted: false,
      avatarUrl: null,
      displayName: null,
      username: null,
    }

    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const authState = await auth()
      const userId = authState?.userId || data?.currentUserId || null

      if (userId) {
        try {
          const { createAdminClient } = await import('../lib/supabase/server')
          const { getCachedProfileByClerkId } = await import('./authors')
          const admin = createAdminClient()
          const profile = await getCachedProfileByClerkId(admin, userId)
          authUser = {
            userId,
            isAuthenticated: true,
            onboardingCompleted: profile?.onboarding_completed === true,
            avatarUrl: profile?.avatar_path || null,
            displayName: profile?.display_name || null,
            username: profile?.username || null,
          }
        } catch {
          authUser = {
            userId,
            isAuthenticated: true,
            onboardingCompleted: false,
            avatarUrl: null,
            displayName: null,
            username: null,
          }
        }
      }
    } catch {}

    const isAuth = Boolean(authUser.isAuthenticated && authUser.userId)

    const [
      bootstrap,
      recSignals,
      topShelfDirect,
      trendingDirect,
      bingeableDirect,
      newVoicesDirect,
    ] = await Promise.all([
      isAuth
        ? executeGetUserSessionBootstrap(authUser.userId!).catch((err) => {
            console.warn('[getHomePageDataServerFn] Bootstrap failed:', err?.message || err)
            return null
          })
        : null,
      isAuth
        ? executeGetUserRecommendationSignals({ clientClerkUserId: authUser.userId! }).catch((err) => {
            console.warn('[getHomePageDataServerFn] Rec signals failed:', err?.message || err)
            return null
          })
        : null,
      executeGetTopShelf({ limit: 10, currentUserId: authUser.userId }).catch(() => null),
      executeGetTrendingWorks({ limit: 10 }).catch(() => null),
      executeGetBingeableWorks({ limit: 10, currentUserId: authUser.userId }).catch(() => null),
      isAuth
        ? executeGetNewVoices({ excludeBingeable: true }).catch(() => null)
        : null,
    ])

    const cleanTopShelf = Array.isArray(topShelfDirect)
      ? topShelfDirect.filter((w) => !isReligiousWork(w))
      : null
    const cleanTrending = Array.isArray(trendingDirect)
      ? trendingDirect.filter((w) => !isReligiousWork(w))
      : null
    const cleanBingeable = Array.isArray(bingeableDirect)
      ? bingeableDirect.filter((w) => !isReligiousWork(w))
      : null
    const cleanNewVoices = Array.isArray(newVoicesDirect)
      ? newVoicesDirect.filter((w) => !isReligiousWork(w))
      : null

    const initialTopShelf = cleanTopShelf && cleanTopShelf.length > 0 ? cleanTopShelf : null

    return {
      authUser,
      initialBootstrap: bootstrap,
      initialRecSignals: recSignals,
      initialWorks: null,
      initialTopShelf,
      initialTrending: cleanTrending ? cleanTrending.slice(0, 10) : null,
      initialBingeable: cleanBingeable ? cleanBingeable.slice(0, 10) : null,
      initialNewVoices: cleanNewVoices ? cleanNewVoices.slice(0, 10) : null,
      catalogError: false,
    }
  })
