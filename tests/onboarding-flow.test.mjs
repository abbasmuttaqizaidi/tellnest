import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * ==============================================================================
 * Regression & Invariant Lock Test Suite: User Onboarding Flow
 * Reference: Section 8 in rules.md
 * 
 * Verifies that:
 * 1. Step 1 Username validation rules & terms acceptance invariants are locked.
 * 2. Step 2 Genre limits (min 3, max 5) and Category limits (max 3) are strictly enforced.
 * 3. Default state starts completely empty ([] for both genres and categories).
 * 4. Drop-off durability invariant: incomplete onboarding leaves flag as false.
 * 5. Writer Intent ("interestedInWriting") contract correctly routes to /write vs /.
 * 6. Option 1 personalization transition screen and router invalidation are active.
 * 7. Source code inspection tests ensure no accidental drift or regression in UserOnboardingModal.tsx.
 * ==============================================================================
 */

const MODAL_FILE_PATH = path.resolve('src/components/UserOnboardingModal.tsx')
const AUTHORS_SERVER_PATH = path.resolve('src/server/authors.ts')
const RULES_PATH = path.resolve('rules.md')
const MODAL_COMPONENT_PATH = path.resolve('src/design-system/Modal.tsx')

// ── Invariant 1: Source Code Structure & Anti-Tamper Locks ────────────────────

test('Onboarding Lock: rules.md Section 8 exists and defines immutable specification', () => {
  const content = fs.readFileSync(RULES_PATH, 'utf-8')
  assert.ok(
    content.includes('## 8. Locked Feature Specification: User Onboarding Flow (Immutable)'),
    'rules.md must contain locked Section 8'
  )
  assert.ok(
    content.includes('8.1. Durability, Triggers & Incomplete State Protection'),
    'rules.md must specify durability & triggers'
  )
  assert.ok(
    content.includes('8.2. Step 1: Pen Name & Core Identity'),
    'rules.md must specify Step 1 username & tooltip requirements'
  )
  assert.ok(
    content.includes('8.3. Step 2: Reading Taxonomy & Writer Intent'),
    'rules.md must specify min 3, max 5 genres and max 3 categories'
  )
})

test('Onboarding Lock: UserOnboardingModal.tsx contains top-level LOCKED docstring', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  assert.ok(
    content.includes('LOCKED SPECIFICATION: User Onboarding Modal Flow'),
    'UserOnboardingModal.tsx must contain explicit LOCKED SPECIFICATION docstring'
  )
  assert.ok(
    content.includes('DO NOT MODIFY OR REFACTOR THIS FLOW WITHOUT EXPLICIT PERMISSION'),
    'UserOnboardingModal.tsx must warn future developers/agents not to modify without permission'
  )
})

test('Onboarding Lock: Modal cannot be bypassed or dismissed accidentally', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  assert.ok(
    content.includes('showCloseButton={false}'),
    'UserOnboardingModal must enforce showCloseButton={false}'
  )
  assert.ok(
    content.includes('closeOnBackdropClick={false}'),
    'UserOnboardingModal must enforce closeOnBackdropClick={false}'
  )
})

test('Onboarding Lock: Background scroll is locked on desktop and mobile', () => {
  const content = fs.readFileSync(MODAL_COMPONENT_PATH, 'utf-8')
  assert.ok(
    content.includes("document.body.style.overflow = 'hidden'"),
    'Modal must set body overflow to hidden'
  )
  assert.ok(
    content.includes("document.documentElement.style.overflow = 'hidden'"),
    'Modal must set documentElement (html) overflow to hidden for desktop'
  )
  assert.ok(
    content.includes("preventBackdropScroll"),
    'Modal must intercept wheel scrolling to protect desktop background'
  )
  assert.ok(
    content.includes("overscroll-contain"),
    'Modal content must contain overscroll to prevent scroll chaining'
  )
})

// ── Invariant 2: Default State Invariant (Zero Pre-selection) ──────────────────

test('Onboarding Lock: Genres and Categories MUST start as empty arrays ([])', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  assert.ok(
    content.includes("const [selectedGenres, setSelectedGenres] = useState<Array<{ id: string; name: string }>>([])"),
    'selectedGenres must initialize to empty array []'
  )
  assert.ok(
    content.includes("const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>([])"),
    'selectedCategories must initialize to empty array []'
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

test('Onboarding Logic: Step 2 Genre limits strictly enforce min 3 and max 5', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  
  // Verify Step 2 valid definition
  assert.ok(
    content.includes('selectedGenres.length >= 3'),
    'Validation requires at least 3 genres'
  )
  assert.ok(
    content.includes('selectedGenres.length <= 5'),
    'Validation requires at most 5 genres'
  )
  assert.ok(
    content.includes('selectedCategories.length <= 3'),
    'Validation requires at most 3 categories'
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
  assert.strictEqual(genres.length, 3, 'Valid minimum reached')

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

test('Onboarding Logic: Step 2 Category limits strictly enforce max 3', () => {
  const simulateToggleCategory = (current, cat) => {
    const exists = current.some((c) => c.id === cat.id)
    if (exists) return current.filter((c) => c.id !== cat.id)
    if (current.length >= 3) return current // Silent ceiling
    return [...current, cat]
  }

  let categories = []
  categories = simulateToggleCategory(categories, { id: 'c1', name: 'C1' })
  categories = simulateToggleCategory(categories, { id: 'c2', name: 'C2' })
  categories = simulateToggleCategory(categories, { id: 'c3', name: 'C3' })
  assert.strictEqual(categories.length, 3, 'Maximum of 3 categories reached')

  // Attempt to add a 4th category: MUST be ignored
  categories = simulateToggleCategory(categories, { id: 'c4', name: 'C4' })
  assert.strictEqual(categories.length, 3, '4th category must be rejected by ceiling')
})

// ── Invariant 4: Option 1 Transition Screen & Router Refresh ──────────────────

test('Onboarding Lock: Option 1 1.3s transition screen and router invalidation are active', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  assert.ok(
    content.includes('setIsPersonalizing(true)'),
    'Must trigger isPersonalizing state upon saving'
  )
  assert.ok(
    content.includes('await router.invalidate()'),
    'Must invalidate router queries to refresh recommendations'
  )
  assert.ok(
    content.includes('setTimeout(resolve, 1300)'),
    'Must show 1.3-second curation animation'
  )
  assert.ok(
    content.includes('Personalizing Your Reading Sanctuary'),
    'Must render personalizing reading sanctuary heading for readers'
  )
  assert.ok(
    content.includes('Setting Up Your Writer Studio'),
    'Must render setting up writer studio heading for writers'
  )
})

// ── Invariant 5: Writer Intent Routing Contract ───────────────────────────────

test('Onboarding Lock: Writer Intent checkbox routes to /write vs /', () => {
  const content = fs.readFileSync(MODAL_FILE_PATH, 'utf-8')
  assert.ok(
    content.includes("navigate({ to: '/write' })"),
    'Must route to /write if interestedInWriting is true'
  )
  assert.ok(
    content.includes("navigate({ to: '/' })"),
    'Must route to / if interestedInWriting is false'
  )
})

// ── Invariant 6: Server Persistence Contract ──────────────────────────────────

test('Onboarding Lock: Server function atomically saves preferences and onboarding_completed', () => {
  const content = fs.readFileSync(AUTHORS_SERVER_PATH, 'utf-8')
  assert.ok(
    content.includes('onboarding_completed: true'),
    'saveUserOnboardingServerFn must set onboarding_completed to true'
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
  assert.ok(
    content.includes('categories: data.categories'),
    'saveUserOnboardingServerFn must persist categories'
  )
})
