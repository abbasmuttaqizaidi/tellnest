import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'

export interface ServerAuthState {
  userId: string | null
  isAuthenticated: boolean
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
      console.log('[getAuthUserServerFn] Server Auth Resolved:', { userId, isAuthenticated: !!userId })
      return {
        userId,
        isAuthenticated: !!userId,
      }
    } catch (e: any) {
      console.error('[getAuthUserServerFn] Server Auth FAILED:', e?.message || e)
      return {
        userId: null,
        isAuthenticated: false,
      }
    }
  }
)
