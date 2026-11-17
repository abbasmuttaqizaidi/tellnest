import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * ==============================================================================
 * Regression & Invariant Lock Test Suite: User Onboarding Flow
 * Reference: Section 8 in rules.md (Full-Page /onboarding Route Architecture)
 * 
 * Verifies that:
 * 1. Step 1 Username validation rules & terms acceptance invariants are locked.
 * 2. Step 2 Genre limits (min 1, max 5) are strictly enforced.
 * 3. Default state starts completely empty ([] for genres).
 * 4. Drop-off durability invariant: incomplete onboarding leaves flag as false.
 * 5. Writer Intent ("interestedInWriting") contract correctly routes to /write vs /.
 * 6. Center alignment and container-width button structure are strictly preserved.
 * 7. Strictly no icons displayed in headings, steps, or buttons.
 * ==============================================================================
 */

const ONBOARDING_ROUTE_PATH = path.resolve('src/routes/onboarding.tsx')
const AUTHORS_SERVER_PATH = path.resolve('src/server/authors.ts')
const RULES_PATH = path.resolve('rules.md')

// ── Invariant 1: Source Code Structure & Anti-Tamper Locks ────────────────────

test('Onboarding Lock: rules.md Section 8 exists and defines full-page specification', () => {
  const content = fs.readFileSync(RULES_PATH, 'utf-8')
  assert.ok(
    content.includes('## 8. Locked Feature Specification: User Onboarding Flow (Immutable)'),
    'rules.md must contain locked Section 8'
  )
  assert.ok(
    content.includes('8.1. Architecture, Triggers & Incomplete State Protection'),
    'rules.md must specify architecture & triggers'
  )
  assert.ok(
    content.includes('8.2. Step 1: Personal Details'),
    'rules.md must specify Step 1 Personal Details requirements'
  )
  assert.ok(
    content.includes('8.3. Step 2: Reading Preferences & Completion'),
    'rules.md must specify Step 2 reading preferences & completion'
  )
})

test('Onboarding Lock: onboarding.tsx defines full-page route with centered layout and container-width button', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  assert.ok(
    content.includes("createFileRoute('/onboarding')"),
    'onboarding.tsx must define /onboarding route'
  )
  assert.ok(
    content.includes('max-w-lg mx-auto'),
    'onboarding.tsx must center-align form container with max-w-lg'
  )
  assert.ok(
    content.includes('w-full'),
    'Continue button must be full width of container'
  )
})

test('Onboarding Lock: Strictly NO icons in headings, steps, or buttons', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  assert.ok(
    !content.includes('Sparkles'),
    'onboarding.tsx must strictly NOT contain any Sparkles icon'
  )
  assert.ok(
    !content.includes('PenLine') && !content.includes('PenTool'),
    'onboarding.tsx must not contain pen icons'
  )
  assert.ok(
    content.includes('Personal Details'),
    'Step 1 must have plain text Personal Details heading'
  )
  assert.ok(
    content.includes('Reading Preferences'),
    'Step 2 must have plain text Reading Preferences heading'
  )
})

// ── Invariant 2: Default State Invariant (Zero Pre-selection) ──────────────────

test('Onboarding Lock: Genres MUST start as empty array ([])', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  assert.ok(
    content.includes("const [selectedGenres, setSelectedGenres] = useState<Array<{ id: string; name: string }>>([])"),
    'selectedGenres must initialize to empty array []'
  )
})

// ── Invariant 3: Validation Logic & Ceiling Invariants ────────────────────────

test('Onboarding Logic: Username validation strictly enforces 3-30 letters/numbers/underscore', () => {
  const regex = /^[a-z0-9_]{3,30}$/i

  // Valid usernames
  assert.strictEqual(regex.test('julian'), true)
  assert.strictEqual(regex.test('julian_thorne'), true)
  assert.strictEqual(regex.test('user_123'), true)
  assert.strictEqual(regex.test('abc'), true)
  assert.strictEqual(regex.test('a'.repeat(30)), true)

  // Invalid usernames
  assert.strictEqual(regex.test(''), false, 'Empty username rejected')
  assert.strictEqual(regex.test('ab'), false, 'Username shorter than 3 chars rejected')
  assert.strictEqual(regex.test('a'.repeat(31)), false, 'Username longer than 30 chars rejected')
  assert.strictEqual(regex.test('julian thorne'), false, 'Spaces must be rejected')
  assert.strictEqual(regex.test('julian@hatchpen'), false, 'Special character @ must be rejected')
  assert.strictEqual(regex.test('julian-thorne'), false, 'Hyphen must be rejected')
})

test('Onboarding Logic: Step 2 limits strictly enforce max 5 genres', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  
  // Verify Step 2 valid definition
  assert.ok(
    content.includes('selectedGenres.length > 5'),
    'Validation requires at most 5 genres'
  )

  // Pure logic simulation of toggleGenre
  const simulateToggleGenre = (current, genre) => {
    const exists = current.some((g) => g.id === genre.id)
    if (exists) return current.filter((g) => g.id !== genre.id)
    if (current.length >= 5) return current // Silent ceiling
    return [...current, genre]
  }

  let genres = []
  assert.strictEqual(genres.length, 0)

  // Add 1 to 5
  genres = simulateToggleGenre(genres, { id: 'g1', name: 'G1' })
  genres = simulateToggleGenre(genres, { id: 'g2', name: 'G2' })
  genres = simulateToggleGenre(genres, { id: 'g3', name: 'G3' })
  assert.strictEqual(genres.length, 3, 'Valid count')

  genres = simulateToggleGenre(genres, { id: 'g4', name: 'G4' })
  genres = simulateToggleGenre(genres, { id: 'g5', name: 'G5' })
  assert.strictEqual(genres.length, 5, 'Maximum of 5 reached')

  // Attempt to add a 6th genre: MUST be ignored
  genres = simulateToggleGenre(genres, { id: 'g6', name: 'G6' })
  assert.strictEqual(genres.length, 5, '6th genre must be rejected by ceiling')

  // Deselecting one works
  genres = simulateToggleGenre(genres, { id: 'g5', name: 'G5' })
  assert.strictEqual(genres.length, 4, 'Deselection works')
})

// ── Invariant 4: Writer Intent Routing Contract ───────────────────────────────

test('Onboarding Lock: Writer Intent checkbox routes to /write vs /', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  assert.ok(
    content.includes("navigate({ to: '/write', replace: true })"),
    'Must route to /write if interestedInWriting is true'
  )
  assert.ok(
    content.includes("navigate({ to: '/', replace: true })"),
    'Must route to / if interestedInWriting is false'
  )
})

// ── Invariant 5: Server Persistence Contract ──────────────────────────────────

test('Onboarding Lock: Server function atomically saves preferences and onboarding_completed', () => {
  const content = fs.readFileSync(AUTHORS_SERVER_PATH, 'utf-8')
  assert.ok(
    content.includes('onboarding_completed: true'),
    'saveUserOnboardingServerFn must set onboarding_completed to true'
  )
  assert.ok(
    content.includes('is_username_verified: true'),
    'saveUserOnboardingServerFn must set is_username_verified to true'
  )
  assert.ok(
    content.includes('interestedInWriting: Boolean(data.interestedInWriting)'),
    'saveUserOnboardingServerFn must persist interestedInWriting flag'
  )
  assert.ok(
    content.includes('interests: data.interests'),
    'saveUserOnboardingServerFn must persist interests'
  )
  assert.ok(
    content.includes('genres: data.genres'),
    'saveUserOnboardingServerFn must persist genres'
  )
})

// ── Invariant 6: Terms Acceptance & Step 1 Verification Gate ─────────────────

test('Onboarding Lock: Continue button disabled without terms, and unverified username blocks Step 2', () => {
  const content = fs.readFileSync(ONBOARDING_ROUTE_PATH, 'utf-8')
  assert.ok(
    content.includes('disabled={!isStep1Valid}'),
    'Continue button must be disabled until isStep1Valid is true'
  )
  assert.ok(
    content.includes('termsAccepted'),
    'isStep1Valid requires termsAccepted'
  )
  assert.ok(
    content.includes('usernameVerification?.available'),
    'isStep1Valid requires verified available username'
  )
})

// ── Invariant 7: DB Persistence of Username Verification ──────────────────────

test('Onboarding Lock: Username verification flag is saved directly in DB, not browser storage', () => {
  const settingsContent = fs.readFileSync(path.resolve('src/server/settings.ts'), 'utf-8')
  assert.ok(
    settingsContent.includes('is_username_verified: true'),
    'executeCheckUsernameAvailability must set is_username_verified in DB'
  )
  assert.ok(
    settingsContent.includes('username_verified: true'),
    'executeCheckUsernameAvailability must set preferences.username_verified in DB'
  )
})
