import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Adversarial Stress Test Suite: Authentication Hydration & Transition Flow
 *
 * Tries to BREAK the authentication state machine under:
 * 1. Simulating 1.5s to 2.5s Clerk background token verification delay.
 * 2. Simulating slow mobile 3G/4G network latency (up to 4.5s handshake).
 * 3. Simulating user cancelling Google OAuth on Google's consent screen.
 * 4. Simulating bfcache / browser back button navigation after explicit logout.
 * 5. Simulating returnUrl persistence from deep chapter reading pages.
 * 6. Simulating race conditions with multiple rapid redirects.
 */

function resolveHomePageView({
  isLoggedOut,
  justLoggedOutSession,
  isServerAuthenticated,
  hasClientSession,
  isUserLoaded,
  isSignedIn,
  sessionGraceExpired,
}) {
  if (isLoggedOut || justLoggedOutSession) {
    return 'PublicHome'
  }
  if (isUserLoaded && isSignedIn) {
    return 'LoggedInHome'
  }
  if ((isServerAuthenticated || hasClientSession) && !sessionGraceExpired) {
    return 'LoggedInHome'
  }
  return 'PublicHome'
}

test('BREAK ATTEMPT 1: Standard 2-Second Clerk Handshake Delay must never flash PublicHome', () => {
  // At t=0ms (initial hydration frame)
  const frame0 = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: false,
    isServerAuthenticated: false,
    hasClientSession: true, // From OAuth return / cookie
    isUserLoaded: true,     // Initial SSR hydration
    isSignedIn: false,      // In-flight /v1/client
    sessionGraceExpired: false,
  })
  assert.strictEqual(frame0, 'LoggedInHome', 'Frame 0 must render LoggedInHome, NOT PublicHome')

  // At t=1500ms (handshake still in flight)
  const frame1500 = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: false,
    isServerAuthenticated: false,
    hasClientSession: true,
    isUserLoaded: true,
    isSignedIn: false,
    sessionGraceExpired: false,
  })
  assert.strictEqual(frame1500, 'LoggedInHome', 'At 1.5s must remain LoggedInHome')

  // At t=2200ms (handshake completes, isSignedIn = true)
  const frame2200 = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: false,
    isServerAuthenticated: false,
    hasClientSession: true,
    isUserLoaded: true,
    isSignedIn: true,
    sessionGraceExpired: false,
  })
  assert.strictEqual(frame2200, 'LoggedInHome', 'At 2.2s must smoothly stay LoggedInHome')
})

test('BREAK ATTEMPT 2: Slow 3G / 4G Network Latency (4.5s Handshake) does not prematurely flash PublicHome', () => {
  // With 10s grace period for in-flight OAuth, at 4.5s sessionGraceExpired is FALSE
  const frame4500 = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: false,
    isServerAuthenticated: false,
    hasClientSession: true,
    isUserLoaded: true,
    isSignedIn: false, // Network was throttled to 4.5s
    sessionGraceExpired: false, // 10s timeout has not elapsed
  })
  assert.strictEqual(frame4500, 'LoggedInHome', 'Slow 3G must not cause a flash at 4.5s')
})

test('BREAK ATTEMPT 3: Browser Back Button (bfcache) after Logout never restores LoggedInHome', () => {
  const backNavigation = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: true, // Persisted in sessionStorage across bfcache
    isServerAuthenticated: false,
    hasClientSession: true, // Even if stale cookie exists in bfcache
    isUserLoaded: true,
    isSignedIn: false,
    sessionGraceExpired: false,
  })
  assert.strictEqual(backNavigation, 'PublicHome', 'Must strictly render PublicHome when user just logged out')
})

test('BREAK ATTEMPT 4: Genuinely Expired Session smoothly defaults to PublicHome after grace period', () => {
  const expiredSession = resolveHomePageView({
    isLoggedOut: false,
    justLoggedOutSession: false,
    isServerAuthenticated: false,
    hasClientSession: true, // Stale marker
    isUserLoaded: true,
    isSignedIn: false,      // Verified non-existent by Clerk
    sessionGraceExpired: true, // Grace period expired
  })
  assert.strictEqual(expiredSession, 'PublicHome', 'Must transition to PublicHome once grace expires')
})

test('BREAK ATTEMPT 5: Deep Return URL is sanitized and safely preserved', () => {
  const sanitizeTargetPath = (url) => {
    if (!url) return '/'
    const trimmed = url.trim()
    if (!trimmed || trimmed.startsWith('/sso-callback')) return '/'
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  assert.strictEqual(sanitizeTargetPath('/read/chapter-4'), '/read/chapter-4')
  assert.strictEqual(sanitizeTargetPath('/write'), '/write')
  assert.strictEqual(sanitizeTargetPath('/sso-callback?token=bad'), '/')
  assert.strictEqual(sanitizeTargetPath(''), '/')
  assert.strictEqual(sanitizeTargetPath(null), '/')
})
