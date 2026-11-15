import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Unit Test Suite: Home Session Synchronization & Stuck Skeleton Prevention
 *
 * Verifies:
 * 1. markClientSessionActive emits hatchpen:logged-in event.
 * 2. __root.tsx busts clientAuthUserCache on hatchpen:logged-in and detects active session contradictions.
 * 3. ClerkSync invalidates router on authentication transition.
 * 4. AuthModal & sso-callback trigger router.invalidate() on sign-in.
 * 5. getUserSessionBootstrapServerFn prefetches readingWorks for in-progress stories.
 * 6. LoggedInHome merges readingWorks and eliminates permanent skeleton trap.
 * 7. HomePage has self-healing invalidation hook adhering to React Rule of Hooks.
 */

test('Session Sync: markClientSessionActive emits hatchpen:logged-in event', () => {
  const filePath = path.resolve('src/lib/authSession.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes("new CustomEvent('hatchpen:logged-in')"),
    'markClientSessionActive must dispatch hatchpen:logged-in event'
  )
})

test('Session Sync: __root.tsx busts clientAuthUserCache on login and detects contradictions', () => {
  const filePath = path.resolve('src/routes/__root.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes("window.addEventListener('hatchpen:logged-in'"),
    '__root.tsx must listen to hatchpen:logged-in'
  )
  assert.ok(
    content.includes('!clientAuthUserCache.user?.isAuthenticated && hasActiveSession'),
    'beforeLoad must detect contradiction when active session exists but cache says guest'
  )
})

test('Session Sync: ClerkSync invalidates router upon auth transition', () => {
  const filePath = path.resolve('src/components/ClerkSync.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('prevSignedInRef = useRef<boolean>(false)'),
    'prevSignedInRef must initialize to false to catch guest-to-auth transitions'
  )
  assert.ok(
    content.includes('router.invalidate()'),
    'ClerkSync must call router.invalidate() on auth transition'
  )
})

test('Session Sync: AuthModal & sso-callback invalidate router on login', () => {
  const modalPath = path.resolve('src/components/AuthModal.tsx')
  const modalContent = fs.readFileSync(modalPath, 'utf8')
  assert.ok(
    modalContent.includes('router.invalidate()'),
    'AuthModal must invalidate router on successful sign-in'
  )

  const ssoPath = path.resolve('src/routes/sso-callback.tsx')
  const ssoContent = fs.readFileSync(ssoPath, 'utf8')
  assert.ok(
    ssoContent.includes('router.invalidate()'),
    'sso-callback must invalidate router before redirecting'
  )
})

test('Session Sync: getUserSessionBootstrapServerFn prefetches readingWorks for in-progress stories', () => {
  const filePath = path.resolve('src/server/authors.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('readingWorks?: any[]'),
    'UserSessionBootstrap interface must include readingWorks'
  )
  assert.ok(
    content.includes('inProgressWorkIds = Array.from('),
    'getUserSessionBootstrapServerFn must collect in-progress work IDs'
  )
  assert.ok(
    content.includes('.in(\'id\', inProgressWorkIds)'),
    'getUserSessionBootstrapServerFn must query database for in-progress work details'
  )
  assert.ok(
    content.includes('readingWorks = rawWorks.map(mapLeanWorkCard)'),
    'getUserSessionBootstrapServerFn must map raw works using mapLeanWorkCard'
  )
})

test('Session Sync: LoggedInHome merges readingWorks and eliminates permanent skeleton trap', () => {
  const filePath = path.resolve('src/components/home/LoggedInHome.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('loaderData?.initialBootstrap?.readingWorks'),
    'LoggedInHome must merge initialBootstrap.readingWorks into works'
  )
  assert.ok(
    !content.includes('(Object.keys(readingProgress).length > 0 && inProgressList.length === 0)'),
    'LoggedInHome must NOT lock into infinite skeleton when readingProgress exists but matching work is not found'
  )
})

test('Session Sync: HomePage has self-healing invalidation hook adhering to React Rule of Hooks', () => {
  const filePath = path.resolve('src/routes/index.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('!loaderData?.authUser?.isAuthenticated'),
    'HomePage must detect stale guest loaderData'
  )
  assert.ok(
    content.includes('router.invalidate()'),
    'HomePage must self-heal via router.invalidate()'
  )

  // Validate React Rule of Hooks boundary
  const fnMatch = content.match(/function HomePage\(\) \{([\s\S]*?)\n\}/)
  assert.ok(fnMatch, 'HomePage function must exist')
  const body = fnMatch[1]
  const evalMarker = body.indexOf('// ALL HOOKS HAVE BEEN EXECUTED')
  assert.ok(evalMarker !== -1, 'Must have clear separation marker between hooks and view evaluation')

  const hookRegex = /(useState|useEffect|useUser|useClerk|useRouter|useLoaderData|useSearch|useApp)\(/g
  let match
  while ((match = hookRegex.exec(body)) !== null) {
    const hookIdx = match.index
    assert.ok(
      hookIdx < evalMarker,
      `Hook "${match[1]}" at index ${hookIdx} is called AFTER evalMarker ${evalMarker}. This violates React Rule of Hooks!`
    )
  }
})

test('Home Feed RPC: getHomePageDataServerFn consolidates all home feeds on server tier', () => {
  const filePath = path.resolve('src/server/home.ts')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('export const getHomePageDataServerFn = createServerFn'),
    'getHomePageDataServerFn must be an exported createServerFn'
  )
  assert.ok(
    content.includes('executeGetTopShelf'),
    'getHomePageDataServerFn must prefetch Top Shelf on server'
  )
  assert.ok(
    content.includes('executeGetTrendingWorks'),
    'getHomePageDataServerFn must prefetch Trending on server'
  )
  assert.ok(
    content.includes('executeGetBingeableWorks'),
    'getHomePageDataServerFn must prefetch Bingeable on server'
  )
  assert.ok(
    content.includes('executeGetNewVoices'),
    'getHomePageDataServerFn must prefetch New Voices on server'
  )
  assert.ok(
    content.includes('executeGetUserSessionBootstrap'),
    'getHomePageDataServerFn must prefetch User Session Bootstrap on server'
  )
  assert.ok(
    content.includes('executeGetUserRecommendationSignals'),
    'getHomePageDataServerFn must prefetch Recommendation Signals on server'
  )
})

test('Home Route Architecture: Route loader uses getHomePageDataServerFn avoiding client DB crashes', () => {
  const filePath = path.resolve('src/routes/index.tsx')
  const content = fs.readFileSync(filePath, 'utf8')

  assert.ok(
    content.includes('getHomePageDataServerFn'),
    'src/routes/index.tsx must import getHomePageDataServerFn'
  )
  assert.ok(
    content.includes('getHomePageDataServerFn({ data: { currentUserId } })'),
    'Route loader must call getHomePageDataServerFn with currentUserId'
  )
  assert.ok(
    !content.includes('executeGetTopShelf'),
    'Route loader must NOT call raw executeGetTopShelf directly in the client bundle'
  )
  assert.ok(
    !content.includes('executeGetTrendingWorks'),
    'Route loader must NOT call raw executeGetTrendingWorks directly in the client bundle'
  )
})
