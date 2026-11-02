import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Unit Test Suite: Authentication Return Flow & Performance Optimization Fixes
 *
 * Verifies:
 * 1. SSO callback single-redirect mechanism without dual-redirect racing.
 * 2. ClerkSync avoids unnecessary Supabase JWT retrieval and prevents concurrent sync calls.
 * 3. ClerkSync suppresses router.invalidate() on /sso-callback.
 * 4. Deduplication of getAuthUserServerFn between root route context and index route loader.
 * 5. Homepage loader retains authentication verification and essential data without blocking on Top Shelf.
 */

test('SSO Callback: Single redirect mechanism preserves Clerk processing and prevents redirect collisions', () => {
  const filePath = path.resolve('src/routes/sso-callback.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  // Verify AuthenticateWithRedirectCallback is retained as Clerk's canonical redirector
  assert.ok(
    content.includes('<AuthenticateWithRedirectCallback'),
    'Must include AuthenticateWithRedirectCallback component'
  )
  assert.ok(
    content.includes('signInForceRedirectUrl="/"'),
    'Must specify signInForceRedirectUrl="/" for AuthenticateWithRedirectCallback'
  )

  // Verify that an unconditional navigate({ to: '/' }) is NOT present in the effect
  assert.ok(
    !content.includes("navigate({ to: '/' })\n    }"),
    'Must not have unconditional navigate({ to: "/" }) racing with AuthenticateWithRedirectCallback'
  )

  // Verify fallback redirect is only executed if no OAuth parameters exist (e.g. direct visits)
  assert.ok(
    content.includes('hasOAuthParams'),
    'Must check for OAuth parameters before triggering fallback navigation'
  )
})

test('ClerkSync: Eliminates unused Supabase JWT retrieval while keeping profile sync intact', () => {
  const filePath = path.resolve('src/components/ClerkSync.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  // Supabase template token retrieval must be eliminated
  assert.ok(
    !content.includes("getToken({ template: 'supabase' })"),
    'Must not call getToken({ template: "supabase" })'
  )
  assert.ok(
    !content.includes('createClerkSupabaseClient'),
    'Must not call or import createClerkSupabaseClient'
  )

  // Profile sync must be preserved
  assert.ok(
    content.includes('syncClerkUserServerFn'),
    'Must preserve syncClerkUserServerFn'
  )

  // In-flight guard to avoid concurrent duplicate profile syncs
  assert.ok(
    content.includes('isSyncingRef'),
    'Must have isSyncingRef to prevent concurrent sync calls'
  )
})

test('ClerkSync: Router invalidation is safely skipped when currently on /sso-callback', () => {
  const filePath = path.resolve('src/components/ClerkSync.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes("pathname === '/sso-callback'"),
    'Must check if current route is /sso-callback'
  )
  assert.ok(
    content.includes('!isCallbackRoute'),
    'Must gate router.invalidate() to not fire on /sso-callback'
  )
})

test('Root Route: Exposes authUser via beforeLoad context to child routes', () => {
  const filePath = path.resolve('src/routes/__root.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  // Root route must use beforeLoad to pass authUser into router context
  assert.ok(
    content.includes('beforeLoad: async () =>'),
    'Root route must define beforeLoad to resolve authUser'
  )
  assert.ok(
    content.includes('loader: ({ context }) =>'),
    'Root loader must read from context'
  )
  assert.ok(
    content.includes('authUser: context?.authUser ?? null'),
    'Root loader must pass authUser from context'
  )
})

test('Index Route: Reuses authUser from context to eliminate duplicate server calls', () => {
  const filePath = path.resolve('src/routes/index.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  // Index loader must accept context and use context.authUser
  assert.ok(
    content.includes('context?.authUser ?? (await getAuthUserServerFn())'),
    'Index loader must prioritize context.authUser before falling back to getAuthUserServerFn'
  )

  // Must not block on getTopShelfServerFn in loader Promise.all
  assert.ok(
    !content.includes('getTopShelfServerFn({ data: { limit: 10 } })'),
    'Index loader must not block on getTopShelfServerFn in Promise.all'
  )

  // Essential bootstrap, rec signals, and platform works must be preserved
  assert.ok(
    content.includes('getUserSessionBootstrapServerFn'),
    'Index loader must preserve getUserSessionBootstrapServerFn'
  )
  assert.ok(
    content.includes('getUserRecommendationSignalsServerFn'),
    'Index loader must preserve getUserRecommendationSignalsServerFn'
  )
  assert.ok(
    content.includes('getPlatformWorksServerFn'),
    'Index loader must preserve getPlatformWorksServerFn'
  )
})

test('AuthSession: hasActiveClientSession detects active Clerk UAT and HatchPen session markers', () => {
  const filePath = path.resolve('src/lib/authSession.ts')
  assert.ok(fs.existsSync(filePath), 'src/lib/authSession.ts must exist')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('__client_uat'),
    'Must check __client_uat cookie to recognize active Clerk session'
  )
  assert.ok(
    content.includes('hatchpen_has_session'),
    'Must check hatchpen_has_session to bridge SSR and hydration'
  )
  assert.ok(
    content.includes('markClientSessionActive'),
    'Must export markClientSessionActive'
  )
  assert.ok(
    content.includes('clearClientSession'),
    'Must export clearClientSession'
  )
})

test('Homepage: Prevents 2-second PublicHome flash by protecting session during Clerk handshake', () => {
  const filePath = path.resolve('src/routes/index.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('hasActiveClientSession'),
    'Homepage must import and use hasActiveClientSession'
  )
  assert.ok(
    content.includes('sessionGraceExpired'),
    'Homepage must use session grace period to allow Clerk handshake to complete without flashing PublicHome'
  )
  assert.ok(
    !content.includes('if (isClerkClientReady && isUserLoaded && !isSignedIn) {\n      clearClientSession()'),
    'Homepage must NEVER clear session synchronously during render body'
  )
})

test('Logout Invariant: Explicit logout immediately clears session and renders PublicHome', () => {
  const authSessionPath = path.resolve('src/lib/authSession.ts')
  const authSessionContent = fs.readFileSync(authSessionPath, 'utf8')
  assert.ok(
    authSessionContent.includes("sessionStorage.getItem('hatchpen_just_logged_out') === 'true'"),
    'hasActiveClientSession must return false immediately if user just logged out'
  )

  const headerPath = path.resolve('src/components/Header.tsx')
  const headerContent = fs.readFileSync(headerPath, 'utf8')
  assert.ok(
    headerContent.includes('notifyClientLoggedOut()'),
    'Header logout must trigger notifyClientLoggedOut'
  )

  const indexPath = path.resolve('src/routes/index.tsx')
  const indexContent = fs.readFileSync(indexPath, 'utf8')
  assert.ok(
    indexContent.includes('hatchpen:logged-out'),
    'Homepage must listen to hatchpen:logged-out to immediately switch to PublicHome without skeleton'
  )
})

test('React Rule of Hooks Invariant: Homepage must execute ALL hooks unconditionally before any early return', () => {
  const indexPath = path.resolve('src/routes/index.tsx')
  const indexContent = fs.readFileSync(indexPath, 'utf8')

  // Find the HomePage function body
  const fnMatch = indexContent.match(/function HomePage\(\) \{([\s\S]*?)\n\}/)
  assert.ok(fnMatch, 'HomePage function must exist')
  const body = fnMatch[1]

  // Find the boundary where hooks end and conditional view rendering starts
  const evalMarker = body.indexOf('// ALL HOOKS HAVE BEEN EXECUTED')
  assert.ok(evalMarker !== -1, 'Must have clear separation marker between hooks and view evaluation')

  // Collect all hook calls in the function and ensure they all appear before evalMarker
  const hookRegex = /(useState|useEffect|useUser|useClerk|useLoaderData|useSearch|useApp)\(/g
  let match
  while ((match = hookRegex.exec(body)) !== null) {
    const hookIdx = match.index
    assert.ok(
      hookIdx < evalMarker,
      `Hook "${match[1]}" at index ${hookIdx} is called AFTER the hooks declaration section at index ${evalMarker}. This violates React Rule of Hooks!`
    )
  }

  // Ensure no early component returns (return <...) exist before evalMarker
  const codeBeforeMarker = body.slice(0, evalMarker)
  assert.ok(
    !codeBeforeMarker.includes('return <'),
    'Must NOT contain any early component JSX returns before all hooks have been declared'
  )
})
