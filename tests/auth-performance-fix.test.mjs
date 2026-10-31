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
