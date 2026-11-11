/**
 * Client Session Verification & Synchronization Helpers
 *
 * Provides unified, fail-safe detection of active Clerk sessions during client-side
 * hydration before the remote `@clerk/clerk-js` bundle has fully initialized.
 */

export function hasClerkUatCookie(): boolean {
  if (typeof document === 'undefined') return false
  const match = document.cookie.match(/(?:^|;\s*)__client_uat=([0-9]+)/)
  if (!match) return false
  const uat = Number(match[1])
  return !Number.isNaN(uat) && uat > 0
}

export function hasActiveClientSession(): boolean {
  if (typeof window === 'undefined') return false

  // 1. Explicit user logout always trumps any stale session indicators
  if (sessionStorage.getItem('hatchpen_just_logged_out') === 'true') {
    return false
  }

  // 2. OAuth in-flight return signals (returning from Google/Clerk OAuth redirect)
  if (
    sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true' ||
    sessionStorage.getItem('hatchpen_oauth_in_flight') === 'true' ||
    window.location.search.includes('__clerk') ||
    window.location.hash.includes('__clerk')
  ) {
    return true
  }

  // 3. Clerk synchronous cookies:
  // - __client_uat: Client User Action Timestamp set synchronously by Clerk upon login
  // - __session: Clerk JWT session cookie
  const hasClerkCookie = hasClerkUatCookie() || document.cookie.includes('__session')

  // 4. Explicit HatchPen markers: Valid ONLY when backed by active Clerk cookies or OAuth return
  if (localStorage.getItem('hatchpen_has_session') === 'true' || document.cookie.includes('hatchpen_has_session=true')) {
    if (hasClerkCookie) {
      return true
    }
    // Stale leftover from prior session: purge to prevent false positive
    try {
      localStorage.removeItem('hatchpen_has_session')
      document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    } catch {}
    return false
  }

  return hasClerkCookie
}

export function markClientSessionActive(): void {
  if (typeof window === 'undefined') return
  // If user explicitly logged out, do not reactivate session until they explicitly sign in/up again
  if (sessionStorage.getItem('hatchpen_just_logged_out') === 'true') {
    return
  }
  try {
    localStorage.setItem('hatchpen_has_session', 'true')
    document.cookie = 'hatchpen_has_session=true; path=/; max-age=31536000; SameSite=Lax'
  } catch {}
}

export function clearClientSession(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('hatchpen_has_session')
    localStorage.removeItem('hatchpen_cached_bookmarks')
    localStorage.removeItem('hatchpen_username')
    localStorage.removeItem('hatchpen_display_name')
    localStorage.removeItem('hatchpen_custom_avatar')
    localStorage.removeItem('tellnest_custom_avatar')

    // Clean user onboarding flags from previous accounts in this browser
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('hatchpen_onboarding_completed_')) {
        keysToRemove.push(k)
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k)
    }

    sessionStorage.removeItem('hatchpen_just_signed_up_google')
    sessionStorage.removeItem('hatchpen_oauth_in_flight')
    sessionStorage.removeItem('hatchpen_auth_return_url')
    document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
    document.cookie = '__client_uat=0; path=/; SameSite=Lax'
  } catch {}
}

export function notifyClientLoggedOut(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem('hatchpen_just_logged_out', 'true')
    clearClientSession()
    window.dispatchEvent(new CustomEvent('hatchpen:logged-out'))
  } catch {}
}
