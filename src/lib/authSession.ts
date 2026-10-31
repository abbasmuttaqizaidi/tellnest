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

  // 2. Explicit HatchPen localStorage marker
  if (localStorage.getItem('hatchpen_has_session') === 'true') {
    return true
  }

  // 3. HatchPen explicit cookie marker
  if (document.cookie.includes('hatchpen_has_session=true')) {
    return true
  }

  // 4. Clerk Client User Action Timestamp cookie (__client_uat)
  // Clerk sets this synchronously in document.cookie upon sign-in/sign-up
  if (hasClerkUatCookie()) {
    return true
  }

  // 5. Standard Clerk session token cookie
  if (document.cookie.includes('__session')) {
    return true
  }

  // 6. OAuth in-flight return signals (returning from Google/Clerk OAuth redirect)
  if (
    sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true' ||
    window.location.search.includes('__clerk') ||
    window.location.hash.includes('__clerk')
  ) {
    return true
  }

  return false
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
    sessionStorage.removeItem('hatchpen_just_signed_up_google')
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
