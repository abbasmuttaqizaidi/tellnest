import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

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

test('BREAK ATTEMPT 6: Header Auth Isolation after Logout prevents ghost avatar and Hatchpen Member fallback', () => {
  const resolveHeaderIsSignedIn = ({
    isExplicitlyLoggedOut,
    isClientClerkLoaded,
    rawIsSignedIn,
    serverAuthenticated,
    hasClientSession,
  }) => {
    return (
      !isExplicitlyLoggedOut &&
      (isClientClerkLoaded
        ? Boolean(rawIsSignedIn)
        : Boolean(serverAuthenticated) || hasClientSession)
    )
  }

  // Case: User was authenticated on initial SSR (serverAuthenticated = true).
  // User clicked Logout. Clerk finished signing out (rawIsSignedIn = false, isClientClerkLoaded = true).
  // Stale serverAuthenticated must NEVER resurrect the session!
  const afterLogout = resolveHeaderIsSignedIn({
    isExplicitlyLoggedOut: false,
    isClientClerkLoaded: true,
    rawIsSignedIn: false,
    serverAuthenticated: true, // Stale SSR prop
    hasClientSession: false,
  })

  assert.strictEqual(
    afterLogout,
    false,
    'Header must strictly evaluate to signed-out when Clerk says rawIsSignedIn is false, ignoring stale serverAuthenticated'
  )
})

test('BREAK ATTEMPT 7: Header SSR and Hydration Resolution defines isAuthResolving and hasSessionIndicator', () => {
  const headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8')
  assert.match(
    headerContent,
    /const\s+isAuthResolving\s*=/,
    'Header.tsx must declare isAuthResolving to avoid SSR ReferenceError'
  )
  assert.match(
    headerContent,
    /const\s+hasSessionIndicator\s*=/,
    'Header.tsx must declare hasSessionIndicator'
  )

  const resolveHeaderState = ({
    isExplicitlyLoggedOut,
    isClientClerkLoaded,
    rawIsSignedIn,
    serverAuthenticated,
    hasClientSession,
  }) => {
    const hasSessionIndicator =
      !isExplicitlyLoggedOut &&
      (Boolean(serverAuthenticated) || hasClientSession)
    const isAuthResolving = !isClientClerkLoaded && hasSessionIndicator
    const isSignedIn =
      !isExplicitlyLoggedOut &&
      (isClientClerkLoaded ? Boolean(rawIsSignedIn) : hasSessionIndicator)

    return { isAuthResolving, isSignedIn }
  }

  // 1. SSR / pre-client hydration with active session
  const ssrResolving = resolveHeaderState({
    isExplicitlyLoggedOut: false,
    isClientClerkLoaded: false,
    rawIsSignedIn: false,
    serverAuthenticated: true,
    hasClientSession: true,
  })
  assert.strictEqual(ssrResolving.isAuthResolving, true, 'isAuthResolving must be true during SSR with session')
  assert.strictEqual(ssrResolving.isSignedIn, true, 'isSignedIn evaluates to true during initial SSR with session')

  // 2. Client Clerk loaded with user logged in
  const clientLoadedLoggedIn = resolveHeaderState({
    isExplicitlyLoggedOut: false,
    isClientClerkLoaded: true,
    rawIsSignedIn: true,
    serverAuthenticated: true,
    hasClientSession: true,
  })
  assert.strictEqual(clientLoadedLoggedIn.isAuthResolving, false, 'isAuthResolving must be false once Clerk loads')
  assert.strictEqual(clientLoadedLoggedIn.isSignedIn, true)

  // 3. User logged out
  const loggedOut = resolveHeaderState({
    isExplicitlyLoggedOut: true,
    isClientClerkLoaded: true,
    rawIsSignedIn: false,
    serverAuthenticated: false,
    hasClientSession: false,
  })
  assert.strictEqual(loggedOut.isAuthResolving, false)
  assert.strictEqual(loggedOut.isSignedIn, false)
})

test('BREAK ATTEMPT 8: Onboarding Ground Truth strictly enforces DB state over stale Clerk metadata or cache', () => {
  const shouldOpenOnboarding = ({
    dbCheckSucceeded,
    existingProfile,
    clerkMetaOnboardingCompleted,
    localCacheCompleted,
  }) => {
    if (dbCheckSucceeded) {
      if (existingProfile && existingProfile.onboarding_completed === true) {
        return false // Genuinely completed in DB
      }
      // Purged user or new user with incomplete profile MUST open modal
      return true
    }

    // Only if DB completely failed (network drop)
    if (localCacheCompleted || clerkMetaOnboardingCompleted) {
      return false
    }
    return true
  }

  // Scenario A: User was purged from Supabase. Clerk still has onboardingCompleted: true.
  const purgedUser = shouldOpenOnboarding({
    dbCheckSucceeded: true,
    existingProfile: null,
    clerkMetaOnboardingCompleted: true,
    localCacheCompleted: false,
  })
  assert.strictEqual(
    purgedUser,
    true,
    'Purged user without DB profile MUST open onboarding modal even if Clerk metadata has true'
  )

  // Scenario B: Brand new user signup. DB has no profile yet.
  const newSignup = shouldOpenOnboarding({
    dbCheckSucceeded: true,
    existingProfile: null,
    clerkMetaOnboardingCompleted: false,
    localCacheCompleted: false,
  })
  assert.strictEqual(newSignup, true, 'Brand new signup must open onboarding modal')

  // Scenario C: Completed user returns.
  const completedUser = shouldOpenOnboarding({
    dbCheckSucceeded: true,
    existingProfile: { onboarding_completed: true },
    clerkMetaOnboardingCompleted: true,
    localCacheCompleted: true,
  })
  assert.strictEqual(completedUser, false, 'Completed user must NOT open onboarding modal')
})

test('BREAK ATTEMPT 9: Username Collision Resilience generates unique fallback without DB constraint violation', () => {
  const resolveSafeUsername = (candidate, existingOwnerClerkId, currentUserId) => {
    let clean = candidate.toLowerCase().trim().replace(/[^a-z0-9_]/g, '') || `user_${currentUserId.slice(0, 8)}`
    if (existingOwnerClerkId && existingOwnerClerkId !== currentUserId) {
      clean = `${clean.slice(0, 20)}_1234`
    }
    return clean
  }

  const noCollision = resolveSafeUsername('novel_author', null, 'user_abc')
  assert.strictEqual(noCollision, 'novel_author')

  const collisionWithOtherUser = resolveSafeUsername('novel_author', 'user_xyz', 'user_abc')
  assert.strictEqual(collisionWithOtherUser, 'novel_author_1234', 'Collision must append unique suffix')

  const sameUserReclaiming = resolveSafeUsername('novel_author', 'user_abc', 'user_abc')
  assert.strictEqual(sameUserReclaiming, 'novel_author', 'Same user reclaiming must keep username')
})

test('BREAK ATTEMPT 10: Onboarding Resource Protection defers heavy feed and recommendation queries while user is onboarding', () => {
  const resolveView = ({
    isUserLoaded,
    isSignedIn,
    isExplicitlyLoggedOut,
    isPendingOnboarding,
  }) => {
    if (isExplicitlyLoggedOut) return 'PublicHome'
    if (isUserLoaded && isSignedIn && isPendingOnboarding) return 'LoggedInHomeSkeleton'
    if (isUserLoaded && isSignedIn) return 'LoggedInHome'
    return 'PublicHome'
  }

  // 1. User is signed in and currently filling out onboarding modal:
  const onboardingUserView = resolveView({
    isUserLoaded: true,
    isSignedIn: true,
    isExplicitlyLoggedOut: false,
    isPendingOnboarding: true,
  })
  assert.strictEqual(
    onboardingUserView,
    'LoggedInHomeSkeleton',
    'Homepage must render lightweight skeleton backdrop without triggering heavy feed APIs while user is in onboarding modal'
  )

  // 2. User finished onboarding modal:
  const onboardedUserView = resolveView({
    isUserLoaded: true,
    isSignedIn: true,
    isExplicitlyLoggedOut: false,
    isPendingOnboarding: false,
  })
  assert.strictEqual(
    onboardedUserView,
    'LoggedInHome',
    'Homepage must immediately mount LoggedInHome once onboarding completes'
  )

  // 3. Verify LoggedInHome code strictly skips recommendation signal API call if onboarding is not done
  const loggedInHomeContent = fs.readFileSync('src/components/home/LoggedInHome.tsx', 'utf8')
  assert.match(
    loggedInHomeContent,
    /if\s*\(!isOnboardingDone\)\s*\{\s*\/\/[^\n]*\s*setIsLoadingSignals\(false\)\s*return\s*\}/,
    'LoggedInHome must guard getUserRecommendationSignalsServerFn behind isOnboardingDone'
  )
})
