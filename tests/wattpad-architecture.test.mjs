import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Unit Test Suite: Wattpad-Style Route Decoupling Architecture
 *
 * Verifies:
 * 1. __root.tsx code-splits interactive modals (AuthModal, PublicWriteModal, UserOnboardingModal, MobileContestAnnouncementModal) via React.lazy.
 * 2. UserOnboardingModal is conditionally mounted only for un-onboarded authenticated users, keeping it out of public DOM & payload.
 * 3. ClerkSync is strictly mounted only when the user is authenticated.
 * 4. getAuthUserServerFn returns avatarUrl, displayName, and username for Frame-0 public header rendering.
 * 5. AppContext accepts initialAuthUser and seeds customAvatarUrl, userDisplayName, and userProfileUsername synchronously.
 * 6. AppContext defers reloadWriterWorksFromDb from executing on public routes.
 * 7. AppContext defers Supabase Realtime WebSocket connection to browser idle time.
 * 8. Header supports serverUser props and speculative prefetching on hover/focus.
 * 9. Nitro route rules in vite.config.ts define public SWR edge cache headers for /wattpad-alternative and /hatchpen-hits.
 */

test('Wattpad Architecture: __root.tsx code-splits modals using React.lazy', () => {
  const rootPath = path.resolve('src/routes/__root.tsx')
  const content = fs.readFileSync(rootPath, 'utf8')

  assert.ok(
    content.includes("React.lazy(() => import('../components/AuthModal')"),
    '__root.tsx must lazy-load AuthModal via React.lazy'
  )
  assert.ok(
    content.includes("React.lazy(() => import('../components/PublicWriteModal')"),
    '__root.tsx must lazy-load PublicWriteModal via React.lazy'
  )
  assert.ok(
    content.includes("React.lazy(() => import('../components/UserOnboardingModal')"),
    '__root.tsx must lazy-load UserOnboardingModal via React.lazy'
  )
  assert.ok(
    content.includes("React.lazy(() => import('../components/MobileContestAnnouncementModal')"),
    '__root.tsx must lazy-load MobileContestAnnouncementModal via React.lazy'
  )
  assert.ok(
    content.includes('<Suspense fallback={null}>'),
    '__root.tsx must protect lazy modals with Suspense fallback'
  )
})

test('Wattpad Architecture: UserOnboardingModal and ClerkSync are conditionally mounted', () => {
  const rootPath = path.resolve('src/routes/__root.tsx')
  const content = fs.readFileSync(rootPath, 'utf8')

  assert.ok(
    content.includes('Boolean(rootData?.isAuthenticated) && <ClerkSync />'),
    'ClerkSync must strictly mount only when user is authenticated'
  )
  assert.ok(
    content.includes('Boolean(rootData?.isAuthenticated && !rootData?.authUser?.onboardingCompleted)'),
    'UserOnboardingModal must strictly mount only when authenticated user has not completed onboarding'
  )
})

test('Wattpad Architecture: getAuthUserServerFn resolves avatar, username, and displayName for Frame-0 SSR', () => {
  const authPath = path.resolve('src/server/auth.ts')
  const content = fs.readFileSync(authPath, 'utf8')

  assert.ok(
    content.includes('avatarUrl?: string | null'),
    'ServerAuthState must include avatarUrl'
  )
  assert.ok(
    content.includes('displayName?: string | null'),
    'ServerAuthState must include displayName'
  )
  assert.ok(
    content.includes('username?: string | null'),
    'ServerAuthState must include username'
  )
  assert.ok(
    content.includes('profile?.avatar_path'),
    'getAuthUserServerFn must extract avatar_path from cached profile'
  )
})

test('Wattpad Architecture: AppContext accepts initialAuthUser and seeds profile state synchronously', () => {
  const appCtxPath = path.resolve('src/context/AppContext.tsx')
  const content = fs.readFileSync(appCtxPath, 'utf8')

  assert.ok(
    content.includes('initialAuthUser?: ServerAuthState | null'),
    'AppProvider must accept initialAuthUser prop'
  )
  assert.ok(
    content.includes('if (initialAuthUser?.displayName) return initialAuthUser.displayName'),
    'userDisplayName must initialize from initialAuthUser'
  )
  assert.ok(
    content.includes('if (initialAuthUser?.username) return initialAuthUser.username'),
    'userProfileUsername must initialize from initialAuthUser'
  )
  assert.ok(
    content.includes('if (initialAuthUser?.avatarUrl) return initialAuthUser.avatarUrl'),
    'customAvatarUrl must initialize from initialAuthUser'
  )
})

test('Wattpad Architecture: AppContext defers writer works and WebSocket listeners from public routes', () => {
  const appCtxPath = path.resolve('src/context/AppContext.tsx')
  const content = fs.readFileSync(appCtxPath, 'utf8')

  assert.ok(
    content.includes("window.location.pathname.startsWith('/write')"),
    'reloadWriterWorksFromDb must be gated to writer studio / library / admin routes'
  )
  assert.ok(
    content.includes('requestIdleCallback(connectChannel'),
    'Supabase Realtime notifications listener must defer connection to browser idle time'
  )
})

test('Wattpad Architecture: Header supports serverUser props and speculative prefetching on hover', () => {
  const headerPath = path.resolve('src/components/Header.tsx')
  const content = fs.readFileSync(headerPath, 'utf8')

  assert.ok(
    content.includes('serverUser?: {'),
    'HeaderProps must accept serverUser'
  )
  assert.ok(
    content.includes('serverUser?.avatarUrl'),
    'Header must use serverUser.avatarUrl for Frame-0 avatar render'
  )
  assert.ok(
    content.includes('const preloadAuthModal = () =>'),
    'Header must define preloadAuthModal'
  )
  assert.ok(
    content.includes('const preloadWriteModal = () =>'),
    'Header must define preloadWriteModal'
  )
  assert.ok(
    content.includes('onMouseEnter={preloadAuthModal}'),
    'Header must trigger preloadAuthModal on hover'
  )
})

test('Wattpad Architecture: vite.config.ts configures public Edge SWR caching headers', () => {
  const vitePath = path.resolve('vite.config.ts')
  const content = fs.readFileSync(vitePath, 'utf8')

  assert.ok(
    content.includes("'/wattpad-alternative'"),
    'vite.config.ts must configure route rule for /wattpad-alternative'
  )
  assert.ok(
    content.includes("'/hatchpen-hits'"),
    'vite.config.ts must configure route rule for /hatchpen-hits'
  )
  assert.ok(
    content.includes('s-maxage=600, stale-while-revalidate=86400'),
    'vite.config.ts must set s-maxage=600 and stale-while-revalidate for marketing pages'
  )
})
