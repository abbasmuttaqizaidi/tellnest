import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * ==============================================================================
 * Test Suite: Public Reader Authentication Gate & Paywall Lifecycle
 *
 * Verifies that:
 * 1. Public user reading Chapter 1 of multi-chapter story sees dismissible login/signup modal on load.
 * 2. If user dismisses Chapter 1 modal, Chapter 1 remains readable for free.
 * 3. Moving to Chapter 2+ strictly enforces compulsory account creation (unclosable modal + gated content).
 * 4. Single-chapter stories strictly enforce compulsory account creation from initial load (cannot be closed).
 * 5. AuthModal component strictly respects `authModalCanClose === false` (no close button, no backdrop dismissal, no escape key).
 * ==============================================================================
 */

const READER_ROUTE_PATH = path.resolve('src/routes/read.$workId.$chapterId.tsx')
const AUTH_MODAL_PATH = path.resolve('src/components/AuthModal.tsx')
const APP_CONTEXT_PATH = path.resolve('src/context/AppContext.tsx')

test('Reader Paywall: AppContext supports canClose, title, and reason in openAuthModal', () => {
  const contextContent = fs.readFileSync(APP_CONTEXT_PATH, 'utf-8')
  assert.ok(
    contextContent.includes('authModalCanClose: boolean'),
    'AppContext must declare authModalCanClose state'
  )
  assert.ok(
    contextContent.includes('openAuthModal: (returnUrl?: string, options?: AuthModalOptions) => void'),
    'openAuthModal must accept options parameter with canClose'
  )
  assert.ok(
    contextContent.includes('setAuthModalCanClose(options?.canClose !== false)'),
    'openAuthModal must set authModalCanClose based on options'
  )
  assert.ok(
    contextContent.includes('if (!force && !authModalCanClose && !isSignedIn) return'),
    'closeAuthModal must block unforced closing when authModalCanClose is false, but allow closing when force=true or isSignedIn'
  )
})

test('Reader Paywall: AuthModal automatically closes when user signs in with force=true', () => {
  const modalContent = fs.readFileSync(AUTH_MODAL_PATH, 'utf-8')
  assert.ok(
    modalContent.includes('closeAuthModal(true)'),
    'AuthModal must force-close modal when user signs in'
  )
})

test('Reader Paywall: AuthModal hides close button and blocks escape/backdrop when unclosable', () => {
  const modalContent = fs.readFileSync(AUTH_MODAL_PATH, 'utf-8')
  assert.ok(
    modalContent.includes('authModalCanClose'),
    'AuthModal must consume authModalCanClose from context'
  )
  assert.ok(
    modalContent.includes('{authModalCanClose && ('),
    'Close button (X) must only render when authModalCanClose is true'
  )
  assert.ok(
    modalContent.includes('if (authModalCanClose && e.target === e.currentTarget) closeAuthModal()'),
    'Backdrop click must not close modal when authModalCanClose is false'
  )
  assert.ok(
    modalContent.includes('if (authModalCanClose && e.key === \'Escape\' && isAuthModalOpen)'),
    'Escape key must not close modal when authModalCanClose is false'
  )
})

test('Reader Paywall: Reader route shows dismissible modal on Chapter 1 and compulsory modal on Chapter 2+', () => {
  const routeContent = fs.readFileSync(READER_ROUTE_PATH, 'utf-8')

  // Invariant 1: Distinguishes single-chapter vs multi-chapter and chapter 1 vs chapter 2+
  assert.ok(
    routeContent.includes('const isSingleChapterStory = totalChapters === 1'),
    'Must identify single-chapter stories'
  )
  assert.ok(
    routeContent.includes('const isCompulsoryAuth = Boolean(isUserLoaded && !isSignedIn && (isSingleChapterStory || !isFirstChapter))'),
    'Must declare isCompulsoryAuth for single-chapter stories or Chapter 2+'
  )

  // Invariant 2: Single-chapter story forces unclosable auth modal immediately
  assert.ok(
    routeContent.includes('if (isSingleChapterStory) {'),
    'Must handle single-chapter story condition'
  )
  assert.ok(
    routeContent.includes('canClose: false'),
    'Must set canClose: false for single chapter and Chapter 2+'
  )

  // Invariant 3: Chapter 1 of multi-chapter story allows closing modal (free preview)
  assert.ok(
    routeContent.includes('else if (isFirstChapter) {'),
    'Must handle Chapter 1 condition'
  )
  assert.ok(
    routeContent.includes('canClose: true'),
    'Must set canClose: true for Chapter 1'
  )

  // Invariant 4: Chapter 2+ gates narrative prose with locked gate card and dynamic chapter number
  assert.ok(
    routeContent.includes('{isCompulsoryAuth ? ('),
    'Must conditionally render locked gate when isCompulsoryAuth is true'
  )
  assert.ok(
    routeContent.includes('Sign In / Sign Up to Continue'),
    'Must provide Sign In / Sign Up CTA on locked chapters'
  )
  assert.ok(
    routeContent.includes('`Create Free Account to Read Chapter ${chapter?.number || 2}`'),
    'Locked gate card must dynamically display current chapter number'
  )

  // Invariant 5: Anonymous reading progress flush guard & useApp state exports
  assert.ok(
    routeContent.includes('isAuthModalOpen,'),
    'read.$workId.$chapterId.tsx must destructure isAuthModalOpen from useApp()'
  )
  assert.ok(
    routeContent.includes('if (!work || !chapter || !isSignedIn || isCompulsoryAuth || isOwnWork(work.id)) return'),
    'flushPendingSave must guard against unauthenticated or compulsory gated readers'
  )
})

test('Search Auth Gate: Strictly triggers sign in/up auth modal on search clicks for public users', () => {
  const headerContent = fs.readFileSync(path.resolve('src/components/Header.tsx'), 'utf-8')
  const searchRouteContent = fs.readFileSync(path.resolve('src/routes/search.tsx'), 'utf-8')
  const mobileStoriesContent = fs.readFileSync(path.resolve('src/components/PublicMobileStories.tsx'), 'utf-8')
  const routeHeaderContent = fs.readFileSync(path.resolve('src/components/RouteHeader.tsx'), 'utf-8')

  // Header.tsx checks
  assert.ok(
    headerContent.includes('if (!isSignedIn) {\n          openAuthModal(undefined, {\n            canClose: true,\n            title: \'Sign In to Search\','),
    'Cmd+K shortcut in Header.tsx must strictly open auth modal for public users'
  )
  assert.ok(
    headerContent.includes('onClickCapture={(e) => {\n                if (!isSignedIn) {\n                  e.preventDefault()'),
    'OmniSearch in Header.tsx must intercept clicks with onClickCapture to open auth modal for public users'
  )

  // PublicMobileStories.tsx checks
  assert.ok(
    mobileStoriesContent.includes('onOpenAuth()') && mobileStoriesContent.includes('<span>Search</span>'),
    'Public mobile drawer Search button must trigger onOpenAuth()'
  )

  // RouteHeader.tsx checks
  assert.ok(
    routeHeaderContent.includes('if (!isSignedIn) {\n                  openAuthModal(undefined, {\n                    canClose: true,\n                    title: \'Sign In to Search\','),
    'RouteHeader quick search button must strictly open auth modal for public users'
  )

  // search.tsx checks
  assert.ok(
    searchRouteContent.includes('// Strictly open auth modal if an unauthenticated user lands directly on /search'),
    'search.tsx must include direct landing auth check'
  )
  assert.ok(
    searchRouteContent.includes('if (!enforceAuth()) return'),
    'search.tsx must enforce auth on input changes and form submissions'
  )
})
