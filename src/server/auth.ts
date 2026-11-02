import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

export interface ServerAuthState {
  userId: string | null
  isAuthenticated: boolean
  onboardingCompleted?: boolean
}

/**
 * Server Function: Resolves Clerk session & authentication state
 * directly from the incoming HTTP request on the server.
 */
export const getAuthUserServerFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ServerAuthState> => {
    try {
      const authState = await auth()
      const userId = authState?.userId ?? null
      let onboardingCompleted = false

      if (userId) {
        try {
          const { createAdminClient } = await import('../lib/supabase/server')
          const { getCachedProfileByClerkId } = await import('./authors')
          const admin = createAdminClient()
          const profile = await getCachedProfileByClerkId(admin, userId)
          onboardingCompleted = profile?.onboarding_completed === true
        } catch {}
      }

      console.log('[getAuthUserServerFn] Server Auth Resolved:', {
        userId,
        isAuthenticated: !!userId,
        onboardingCompleted,
      })
      return {
        userId,
        isAuthenticated: !!userId,
        onboardingCompleted,
      }
    } catch (e: any) {
      console.error('[getAuthUserServerFn] Server Auth FAILED:', e?.message || e)
      return {
        userId: null,
        isAuthenticated: false,
        onboardingCompleted: false,
      }
    }
  }
)
