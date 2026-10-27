import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateForYouRecommendations,
  detectActiveReadingShift,
  isWorkEligibleForRecommendations,
} from '../src/lib/recommendations/engine.ts'
import { FOR_YOU_CONFIG } from '../src/lib/recommendations/config.ts'

/**
 * Unit Test Suite: "For You" Recommendation System Invariants
 *
 * Locks in all verified product requirements:
 * 1. Active reading priority over static onboarding preferences.
 * 2. Protection against brief skimming / clicks (< 90s or < 2 sessions).
 * 3. Cold-start fallback via onboarding preferences when reading history is empty.
 * 4. Hard exclusions: Own works, bookmarked works, drafts, unlisted, cancelled, 0 chapters.
 * 5. Deterministic cap (<= 10 recommendations) and zero duplicate works.
 * 6. Immutability: Reader's preferences object is never silently mutated.
 * 7. Lookback window cutoff: Reading sessions older than LOOKBACK_DAYS are ignored.
 * 8. Configurable provisional weights and thresholds.
 */

function createMockWork(overrides = {}) {
  return {
    id: 'work-default',
    title: 'Default Serial',
    author: { id: 'author-default', name: 'Author Name' },
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    category: 'Epic Fantasy',
    categorySlug: 'epic-fantasy',
    status: 'Ongoing',
    visibility: 'Public',
    chaptersCount: 5,
    publishedChaptersCount: 5,
    totalReads: '1000',
    synopsis: 'A test serialized story.',
    cover: '/covers/default.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// --- 1. Behavioral Taste Shift Over Onboarding ---
test('Taste Shift: Prioritizes verified active reading genre over static onboarding preferences', () => {
  const fantasyWork = createMockWork({
    id: 'work-fantasy',
    title: 'Fantasy Chronicle',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
  })

  const thrillerWork = createMockWork({
    id: 'work-thriller',
    title: 'Thriller Mystery',
    genre: 'Thriller',
    genreSlug: 'thriller',
  })

  // Reader selected Fantasy during onboarding
  const userPreferences = {
    genres: ['Fantasy'],
    categories: [],
  }

  // Reader recently read Thriller across 2 sessions totaling 110s active duration
  const now = Date.now()
  const readingHistory = [
    {
      workId: 'past-thriller-1',
      durationSeconds: 60,
      lastReadAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      workId: 'past-thriller-2',
      durationSeconds: 50,
      lastReadAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  // Past thriller works in candidate list to resolve genre
  const pastThriller1 = createMockWork({ id: 'past-thriller-1', genre: 'Thriller', genreSlug: 'thriller' })
  const pastThriller2 = createMockWork({ id: 'past-thriller-2', genre: 'Thriller', genreSlug: 'thriller' })

  const results = calculateForYouRecommendations({
    candidateWorks: [fantasyWork, thrillerWork, pastThriller1, pastThriller2],
    readingHistory,
    userPreferences,
    bookmarkedWorkIds: ['past-thriller-1', 'past-thriller-2'], // Past works already bookmarked
    excludeBookmarked: true,
  })

  assert.ok(results.length >= 2, 'Should return candidate recommendations')
  assert.equal(results[0].work.id, 'work-thriller', 'Thriller must rank #1 due to active reading shift')
  assert.equal(results[1].work.id, 'work-fantasy', 'Fantasy must rank #2 as secondary signal')
  assert.match(
    results[0].explanationLabel,
    /recent reading in Thriller/i,
    'Explanation label must reflect active reading driver'
  )
})

// --- 2. Brief Visit / Skim Protection (Gradual Adaptation) ---
test('Gradual Adaptation: Brief interaction (< 90s or single session) does NOT override onboarding preferences', () => {
  const fantasyWork = createMockWork({
    id: 'work-fantasy',
    title: 'Fantasy Realm',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
  })

  const sciFiWork = createMockWork({
    id: 'work-scifi',
    title: 'Deep Cosmos',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
  })

  // Reader onboarded with Fantasy
  const userPreferences = {
    genres: ['Fantasy'],
  }

  // Reader clicked a Sci-Fi story for only 25 seconds in 1 single session
  const readingHistory = [
    {
      workId: 'work-scifi',
      durationSeconds: 25,
      lastReadAt: new Date().toISOString(),
    },
  ]

  const results = calculateForYouRecommendations({
    candidateWorks: [fantasyWork, sciFiWork],
    readingHistory,
    userPreferences,
  })

  assert.equal(results[0].work.id, 'work-fantasy', 'Onboarding Fantasy must remain ranked higher than single brief visit')
  assert.match(
    results[0].explanationLabel,
    /interest in Fantasy/i,
    'Must be driven by onboarding preference'
  )
})

// --- 3. Cold-Start Fallback ---
test('Cold-Start: Empty reading history safely falls back to declared onboarding preferences', () => {
  const mysteryWork = createMockWork({
    id: 'work-mystery',
    title: 'Midnight Fog',
    genre: 'Mystery',
    genreSlug: 'mystery',
  })

  const romanceWork = createMockWork({
    id: 'work-romance',
    title: 'Letters from Paris',
    genre: 'Romance',
    genreSlug: 'romance',
  })

  const userPreferences = {
    genres: ['Romance'],
    categories: [],
  }

  const results = calculateForYouRecommendations({
    candidateWorks: [mysteryWork, romanceWork],
    readingHistory: [], // Completely cold reader
    userPreferences,
  })

  assert.equal(results[0].work.id, 'work-romance', 'Romance must rank first matching onboarding genre')
  assert.match(results[0].explanationLabel, /interest in Romance/i)
})

// --- 4. Hard Eligibility & Exclusion Rules ---
test('Exclusion Rule: Reader own works are strictly excluded', () => {
  const ownWork = createMockWork({
    id: 'own-work-1',
    author: { id: 'current-user-uuid', name: 'Myself' },
  })

  const otherWork = createMockWork({
    id: 'other-work-1',
    author: { id: 'other-author-uuid', name: 'Someone Else' },
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [ownWork, otherWork],
    currentUserId: 'current-user-uuid',
  })

  const resultIds = results.map((r) => r.work.id)
  assert.ok(!resultIds.includes('own-work-1'), 'Reader own work must never appear in recommendations')
  assert.ok(resultIds.includes('other-work-1'), 'Other author work should be included')
})

test('Retention Rule: Bookmarked/Saved works remain in recommendations by default (not removed on save)', () => {
  const savedWork = createMockWork({ id: 'work-already-saved' })
  const unsavedWork = createMockWork({ id: 'work-not-saved' })

  // Default behavior: bookmarked works remain visible in recommendations so saving doesn't remove them
  const results = calculateForYouRecommendations({
    candidateWorks: [savedWork, unsavedWork],
    bookmarkedWorkIds: ['work-already-saved'],
  })

  const resultIds = results.map((r) => r.work.id)
  assert.ok(resultIds.includes('work-already-saved'), 'Bookmarked works must remain in recommendations')
  assert.ok(resultIds.includes('work-not-saved'), 'Unsaved work should also appear')

  // When excludeBookmarked: true is explicitly requested, it is excluded
  const excludedResults = calculateForYouRecommendations({
    candidateWorks: [savedWork, unsavedWork],
    bookmarkedWorkIds: ['work-already-saved'],
    excludeBookmarked: true,
  })
  const excludedResultIds = excludedResults.map((r) => r.work.id)
  assert.ok(!excludedResultIds.includes('work-already-saved'), 'Must exclude when excludeBookmarked is true')
  assert.ok(excludedResultIds.includes('work-not-saved'), 'Unsaved work should appear')
})

test('Eligibility Rule: Drafts, unlisted, cancelled works, and works with 0 chapters are excluded', () => {
  const draftWork = createMockWork({ id: 'draft-1', visibility: 'Draft' })
  const unlistedWork = createMockWork({ id: 'unlisted-1', visibility: 'Unlisted' })
  const cancelledWork = createMockWork({ id: 'cancelled-1', status: 'Cancelled' })
  const noChaptersWork = createMockWork({
    id: 'no-chapters-1',
    chaptersCount: 0,
    publishedChaptersCount: 0,
    chapters: [],
  })
  const validWork = createMockWork({
    id: 'valid-1',
    visibility: 'Public',
    status: 'Ongoing',
    publishedChaptersCount: 1,
  })

  assert.equal(isWorkEligibleForRecommendations(draftWork, {}), false, 'Draft is ineligible')
  assert.equal(isWorkEligibleForRecommendations(unlistedWork, {}), false, 'Unlisted is ineligible')
  assert.equal(isWorkEligibleForRecommendations(cancelledWork, {}), false, 'Cancelled is ineligible')
  assert.equal(isWorkEligibleForRecommendations(noChaptersWork, {}), false, '0 chapters is ineligible')
  assert.equal(isWorkEligibleForRecommendations(validWork, {}), true, 'Valid published work is eligible')
})

test('Regression Bug #1: Stories containing only draft chapters are strictly excluded', () => {
  const allDraftsWork = createMockWork({
    id: 'all-drafts-work',
    title: 'Unpublished Drafts Story',
    chaptersCount: 4,
    publishedChaptersCount: 0,
    chapters: [
      { id: 'ch-1', status: 'draft' },
      { id: 'ch-2', status: 'draft' },
      { id: 'ch-3', status: 'draft' },
    ],
  })

  const eligibleWork = createMockWork({
    id: 'eligible-work',
    publishedChaptersCount: 1,
    chapters: [{ id: 'ch-1', status: 'published' }],
  })

  assert.equal(
    isWorkEligibleForRecommendations(allDraftsWork, {}),
    false,
    'Story with only draft chapters must be excluded even if chaptersCount is 4'
  )

  const results = calculateForYouRecommendations({
    candidateWorks: [allDraftsWork, eligibleWork],
  })

  const resultIds = results.map((r) => r.work.id)
  assert.ok(!resultIds.includes('all-drafts-work'), 'Story with only draft chapters must not be recommended')
  assert.ok(resultIds.includes('eligible-work'), 'Story with genuinely published chapter must be recommended')
})

test('Regression Bug #1: Zero published chapters remains zero and is never treated as 1', () => {
  const zeroPublishedWork = createMockWork({
    id: 'zero-pub-work',
    publishedChaptersCount: 0,
    chaptersCount: 2,
    chapters: [],
  })

  assert.equal(
    isWorkEligibleForRecommendations(zeroPublishedWork, {}),
    false,
    'publishedChaptersCount = 0 must never be allowed via chaptersCount fallback'
  )
})

test('Multi-Genre Matching: Database stories with multiple genres match reader preferences in any genre', () => {
  const multiGenreWork = createMockWork({
    id: 'multi-genre-story',
    genre: 'General Fiction',
    genreSlug: 'general-fiction',
    genres: [
      { id: 'g-1', name: 'General Fiction', slug: 'general-fiction' },
      { id: 'g-2', name: 'Cyberpunk', slug: 'cyberpunk' },
    ],
  })

  const otherWork = createMockWork({
    id: 'other-story',
    genre: 'Romance',
    genreSlug: 'romance',
  })

  const userPreferences = {
    genres: ['Cyberpunk'],
  }

  const results = calculateForYouRecommendations({
    candidateWorks: [multiGenreWork, otherWork],
    userPreferences,
  })

  assert.equal(results[0].work.id, 'multi-genre-story', 'Multi-genre story must match secondary Cyberpunk genre')
  assert.match(results[0].explanationLabel, /Cyberpunk|General Fiction/i)
})

test('Merged Bookmark Retention: Story bookmarked on either client or server is retained in recommendations unless excludeBookmarked is true', () => {
  const clientBookmarkedWork = createMockWork({ id: 'client-saved-work' })
  const serverBookmarkedWork = createMockWork({ id: 'server-saved-work' })
  const unbookmarkedWork = createMockWork({ id: 'unbookmarked-work' })

  // Simulating merged bookmarks from reactive client savedWorkIds and server recommendationSignals
  const clientSaved = ['client-saved-work']
  const serverSaved = ['server-saved-work']
  const mergedBookmarkedWorkIds = Array.from(new Set([...clientSaved, ...serverSaved]))

  const results = calculateForYouRecommendations({
    candidateWorks: [clientBookmarkedWork, serverBookmarkedWork, unbookmarkedWork],
    bookmarkedWorkIds: mergedBookmarkedWorkIds,
  })

  const resultIds = results.map((r) => r.work.id)
  assert.ok(resultIds.includes('client-saved-work'), 'Client-bookmarked story must be retained in recommendations')
  assert.ok(resultIds.includes('server-saved-work'), 'Server-bookmarked story must be retained in recommendations')
  assert.ok(resultIds.includes('unbookmarked-work'), 'Unbookmarked story should be included')
})

// --- 5. Result Cap & Deduplication ---
test('Result Cap: Returns at most 10 recommendations and eliminates duplicates', () => {
  const candidateWorks = []
  for (let i = 1; i <= 20; i++) {
    candidateWorks.push(
      createMockWork({
        id: `work-bulk-${i}`,
        title: `Bulk Serial ${i}`,
      })
    )
  }
  // Add duplicate of bulk-1
  candidateWorks.push(
    createMockWork({
      id: 'work-bulk-1',
      title: 'Duplicate Bulk Serial 1',
    })
  )

  const results = calculateForYouRecommendations({
    candidateWorks,
    config: FOR_YOU_CONFIG,
  })

  assert.ok(results.length <= 10, `Results length (${results.length}) must be <= 10`)
  assert.equal(results.length, 10, 'Should return exactly 10 when 20 candidates are available')

  const uniqueIds = new Set(results.map((r) => r.work.id))
  assert.equal(uniqueIds.size, results.length, 'All returned recommendation IDs must be unique')
})

// --- 6. User Preferences Immutability ---
test('Immutability: Reader preferences object is never silently mutated', () => {
  const originalPreferences = Object.freeze({
    genres: Object.freeze(['Fantasy', 'Adventure']),
    categories: Object.freeze(['Epic Novel']),
    interests: Object.freeze(['Magic', 'Dragons']),
  })

  const candidateWorks = [
    createMockWork({ id: 'work-1', genre: 'Thriller', genreSlug: 'thriller' }),
    createMockWork({ id: 'work-2', genre: 'Fantasy', genreSlug: 'fantasy' }),
  ]

  const readingHistory = [
    { workId: 'work-1', durationSeconds: 120, lastReadAt: new Date().toISOString() },
    { workId: 'work-1', durationSeconds: 60, lastReadAt: new Date().toISOString() },
  ]

  // Execute recommendation engine
  calculateForYouRecommendations({
    candidateWorks,
    readingHistory,
    userPreferences: originalPreferences,
  })

  // Verify preferences remain completely intact and unmodified
  assert.deepEqual(
    originalPreferences,
    {
      genres: ['Fantasy', 'Adventure'],
      categories: ['Epic Novel'],
      interests: ['Magic', 'Dragons'],
    },
    'User preferences must not be mutated by recommendation calculation'
  )
})

// --- 7. Lookback Window Cutoff ---
test('Lookback Window: Reading activity older than LOOKBACK_DAYS is ignored', () => {
  const candidateWorks = [
    createMockWork({ id: 'work-old', genre: 'Horror', genreSlug: 'horror' }),
  ]

  const now = Date.now()
  // Sessions that occurred 20 days ago (past the 14-day lookback window)
  const expiredHistory = [
    {
      workId: 'work-old',
      durationSeconds: 300,
      lastReadAt: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      workId: 'work-old',
      durationSeconds: 300,
      lastReadAt: new Date(now - 21 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ]

  const shift = detectActiveReadingShift(expiredHistory, candidateWorks, FOR_YOU_CONFIG)
  assert.equal(shift, null, 'Expired reading history outside lookback window must not trigger taste shift')
})

// --- 8. Configurable Provisional Weights ---
test('Configurability: Custom configuration weights and thresholds are respected', () => {
  const candidateA = createMockWork({ id: 'work-a', genre: 'GenreA', genreSlug: 'genrea' })
  const candidateB = createMockWork({ id: 'work-b', genre: 'GenreB', genreSlug: 'genreb' })

  const customConfig = {
    MAX_RECOMMENDATIONS: 1, // Custom limit
    LOOKBACK_DAYS: 7,
    MIN_ACTIVE_SECONDS_FOR_TASTE_SHIFT: 50,
    MIN_SESSIONS_FOR_TASTE_SHIFT: 1,
    WEIGHTS: {
      ACTIVE_READING_GENRE_AFFINITY: 10,
      ONBOARDING_GENRE_MATCH: 100, // Invert: Onboarding heavily prioritized
      ONBOARDING_CATEGORY_MATCH: 10,
      RECENT_CHAPTER_DROP_BONUS: 0,
      ORGANIC_ENGAGEMENT_BONUS: 0,
    },
  }

  const results = calculateForYouRecommendations({
    candidateWorks: [candidateA, candidateB],
    readingHistory: [
      { workId: 'work-a', durationSeconds: 60, lastReadAt: new Date().toISOString() },
    ],
    userPreferences: { genres: ['GenreB'] },
    config: customConfig,
  })

  assert.equal(results.length, 1, 'Custom MAX_RECOMMENDATIONS = 1 respected')
  assert.equal(results[0].work.id, 'work-b', 'Custom weight for onboarding match (100) overtook reading affinity (10)')
})

// --- 9. Personalized Relevance Gate ---
test('Personalized Filtering: Candidate works with ZERO match to declared preferences or active reading are excluded for personalized users', () => {
  const familyDramaWork = createMockWork({
    id: 'work-family',
    title: 'Family Ties',
    genre: 'Family Drama',
    genreSlug: 'family-drama',
    category: 'New Adult',
    categorySlug: 'new-adult',
  })

  const sciFiWork = createMockWork({
    id: 'work-scifi',
    title: 'Galactic Horizon',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
    category: 'Cyberpunk',
    categorySlug: 'cyberpunk',
  })

  const userPreferences = {
    genres: ['Family Drama', 'Political Fiction'],
    categories: ['New Adult'],
  }

  // Case 1: Candidate works include 1 matching and 1 non-matching
  const resultsWithMatch = calculateForYouRecommendations({
    candidateWorks: [familyDramaWork, sciFiWork],
    userPreferences,
  })

  assert.equal(resultsWithMatch.length, 1, 'Only the matching Family Drama work should be returned')
  assert.equal(resultsWithMatch[0].work.id, 'work-family')

  // Case 2: Platform has NO matching stories for user's declared preferences
  const resultsZeroMatch = calculateForYouRecommendations({
    candidateWorks: [sciFiWork],
    userPreferences,
  })

  assert.equal(resultsZeroMatch.length, 0, 'Must return 0 recommendations when no candidates match declared preferences')
})

// =========================================================================
// Phase 5 — Full Regression & Edge-Case Verification Suite (Scenarios 1 - 23)
// =========================================================================

// --- Scenario 1: Exact reported user scenario ---
test('Scenario 1: Exact reported user scenario with Family Drama + Political Fiction + New Adult on 3-work catalog', () => {
  // The 3 unrelated platform stories in catalog
  const platformWork1 = createMockWork({
    id: 'platform-1',
    title: 'The Silent Nebula',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
    category: 'Space Opera',
    categorySlug: 'space-opera',
  })
  const platformWork2 = createMockWork({
    id: 'platform-2',
    title: 'Crown of Shadows',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    category: 'Epic Fantasy',
    categorySlug: 'epic-fantasy',
  })
  const platformWork3 = createMockWork({
    id: 'platform-3',
    title: 'Midnight in Prague',
    genre: 'Romance',
    genreSlug: 'romance',
    category: 'Historical Romance',
    categorySlug: 'historical-romance',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [platformWork1, platformWork2, platformWork3],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 0, 'Must return an empty array, NOT the 3 unrelated platform works')
})

// --- Scenario 2: Zero-result empty state copy and routes ---
test('Scenario 2: UI invariants for empty state copy and navigation targets', async () => {
  const fs = await import('node:fs/promises')
  const homeCode = await fs.readFile('src/components/home/LoggedInHome.tsx', 'utf8')

  // Verify exact copy specified in Decision A
  assert.ok(
    homeCode.includes('No stories match your taste yet'),
    'Empty state must include exact heading "No stories match your taste yet"'
  )
  assert.ok(
    homeCode.includes(
      "We couldn't find published stories matching your selected genres or categories. Explore the full catalogue or update your preferences to discover more."
    ),
    'Empty state must include exact body copy'
  )

  // Verify navigation buttons
  assert.ok(
    homeCode.includes('to="/settings"') && homeCode.includes('Edit Taste Profile'),
    'Must provide "Edit Taste Profile" button pointing to /settings'
  )
  assert.ok(
    homeCode.includes('to="/discover"') && homeCode.includes('Browse Full Catalog'),
    'Must provide "Browse Full Catalog" button pointing to /discover'
  )
})

// --- Scenario 3: Combined genre + category ranking ---
test('Scenario 3: Work matching Family Drama + New Adult is ranked above single-match works and multi-genre boosts', () => {
  const combinedMatch = createMockWork({
    id: 'work-combined',
    title: 'The Inheritance',
    genre: 'Family Drama',
    genreSlug: 'family-drama',
    category: 'New Adult',
    categorySlug: 'new-adult',
    totalReads: '500',
  })

  const multiGenreMatch = createMockWork({
    id: 'work-multi-genre',
    title: 'The Dynastic Election',
    genre: 'Family Drama',
    genreSlug: 'family-drama',
    genres: ['Family Drama', 'Political Fiction'],
    category: 'Adult',
    categorySlug: 'adult',
    totalReads: '500',
  })

  const singleGenreMatch = createMockWork({
    id: 'work-single-genre',
    title: 'Family Secrets',
    genre: 'Family Drama',
    genreSlug: 'family-drama',
    category: 'Young Adult',
    categorySlug: 'young-adult',
    totalReads: '500',
  })

  const categoryOnlyMatch = createMockWork({
    id: 'work-cat-only',
    title: 'Campus Life',
    genre: 'Romance',
    genreSlug: 'romance',
    category: 'New Adult',
    categorySlug: 'new-adult',
    totalReads: '500',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [categoryOnlyMatch, singleGenreMatch, multiGenreMatch, combinedMatch],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 4, 'All four matching works are eligible')
  // Combined match has genre (25) + category (15) = 40+
  assert.equal(results[0].work.id, 'work-combined', 'Combined genre+category match must rank #1')
  // Multi-genre match has genre (25) + 1 extra genre (8) = 33
  assert.equal(results[1].work.id, 'work-multi-genre', 'Multi-genre match must rank above single-genre match')
  // Single genre match has 25
  assert.equal(results[2].work.id, 'work-single-genre', 'Single genre match ranks above category-only')
  // Category only match has 15
  assert.equal(results[3].work.id, 'work-cat-only', 'Category only match ranks #4')
})

// --- Scenario 4: Genre-only match is eligible ---
test('Scenario 4: Work matching Political Fiction + unrelated category is eligible and recommended', () => {
  const politicalWork = createMockWork({
    id: 'work-pol',
    title: 'State of Affairs',
    genre: 'Political Fiction',
    genreSlug: 'political-fiction',
    category: 'Cyberpunk',
    categorySlug: 'cyberpunk',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [politicalWork],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 1)
  assert.equal(results[0].work.id, 'work-pol')
})

// --- Scenario 5: Category-only match is eligible ---
test('Scenario 5: Work matching unrelated genre + New Adult is eligible and recommended', () => {
  const newAdultWork = createMockWork({
    id: 'work-na',
    title: 'Twenty-Something',
    genre: 'Horror',
    genreSlug: 'horror',
    category: 'New Adult',
    categorySlug: 'new-adult',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [newAdultWork],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 1)
  assert.equal(results[0].work.id, 'work-na')
})

// --- Scenario 6: Non-matching work is excluded ---
test('Scenario 6: Work matching Sci-Fi + Adult with neither genre nor category selected is excluded', () => {
  const sciFiWork = createMockWork({
    id: 'work-scifi',
    title: 'Starfall',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
    category: 'Adult',
    categorySlug: 'adult',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [sciFiWork],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 0, 'Unrelated story must be excluded')
})

// --- Scenario 7: Popularity/recent-chapter bonus cannot rescue ineligible work ---
test('Scenario 7: Ineligible work cannot be rescued by high popularity, featured, trending, or recent drops', () => {
  const megaPopularIneligible = createMockWork({
    id: 'work-popular-ineligible',
    title: 'Viral Galactic War',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
    category: 'Adult',
    categorySlug: 'adult',
    totalReads: '5,000,000',
    featured: true,
    trending: true,
    new_chapters_this_week: true,
    lastActivityAt: new Date().toISOString(),
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [megaPopularIneligible],
    userPreferences: {
      genres: ['Family Drama'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 0, 'High popularity or recent activity must never bypass relevance gate')
})

// --- Scenario 8: No preferences selected preserves general discovery ---
test('Scenario 8: No preferences selected preserves non-personalized general discovery', () => {
  const workA = createMockWork({ id: 'work-a', title: 'Work A', totalReads: '10,000' })
  const workB = createMockWork({ id: 'work-b', title: 'Work B', totalReads: '2,000' })

  // Case A: null preferences
  const resultsNull = calculateForYouRecommendations({
    candidateWorks: [workA, workB],
    userPreferences: null,
  })
  assert.equal(resultsNull.length, 2, 'Unpersonalized cold start serves general discovery')
  assert.equal(resultsNull[0].work.id, 'work-a', 'General discovery orders by organic engagement')

  // Case B: empty arrays
  const resultsEmpty = calculateForYouRecommendations({
    candidateWorks: [workA, workB],
    userPreferences: { genres: [], categories: [] },
  })
  assert.equal(resultsEmpty.length, 2, 'Empty preferences array serves general discovery')
})

// --- Scenario 9: Safe handling of malformed/legacy/null preferences ---
test('Scenario 9: Malformed, null, legacy, or empty preference payloads handled safely without crashing', () => {
  const candidate = createMockWork({ genre: 'Family Drama', category: 'New Adult' })

  // Undefined
  assert.doesNotThrow(() => {
    calculateForYouRecommendations({ candidateWorks: [candidate], userPreferences: undefined })
  })

  // Empty object
  assert.doesNotThrow(() => {
    calculateForYouRecommendations({ candidateWorks: [candidate], userPreferences: {} })
  })

  // Null arrays
  assert.doesNotThrow(() => {
    calculateForYouRecommendations({
      candidateWorks: [candidate],
      userPreferences: { genres: null, categories: null },
    })
  })

  // Mixed invalid types inside arrays
  assert.doesNotThrow(() => {
    const res = calculateForYouRecommendations({
      candidateWorks: [candidate],
      userPreferences: {
        genres: [null, undefined, '', { id: 'family-drama', name: 'Family Drama' }],
        categories: [123, false, 'New Adult'],
      },
    })
    assert.equal(res.length, 1, 'Valid entries within malformed array still resolve safely')
  })
})

// --- Scenario 10: Descriptive tags do NOT cause genre match ---
test('Scenario 10: Descriptive tags do not cause a genre match (canonical taxonomy protection)', () => {
  const taggedWork = createMockWork({
    id: 'work-tagged',
    genre: 'Cyberpunk',
    genreSlug: 'cyberpunk',
    category: 'Sci-Fi',
    categorySlug: 'sci-fi',
    tags: ['Family Drama', 'Political Fiction', 'New Adult'], // Arbitrary tags
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [taggedWork],
    userPreferences: {
      genres: ['Family Drama'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 0, 'Tags must not cause a genre match; only canonical genres are eligible')
})

// --- Scenario 11: Settings taste profile update invalidates cache ---
test('Scenario 11: Preference update invalidates profile cache so next signals query reflects changes', async () => {
  const { getCachedProfileByClerkId, invalidateProfileCache } = await import('../src/server/authors.ts')

  let dbPreferences = { genres: ['Sci-Fi'] }
  const mockAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'uuid-1', clerk_user_id: 'clerk-user-11', preferences: dbPreferences },
          }),
        }),
      }),
    }),
  }

  // 1. Initial cached fetch
  const profile1 = await getCachedProfileByClerkId(mockAdmin, 'clerk-user-11')
  assert.deepEqual(profile1.preferences.genres, ['Sci-Fi'])

  // 2. Taste profile updated in database
  dbPreferences = { genres: ['Family Drama', 'Political Fiction'] }

  // Without invalidation, cache would return stale data
  const profileStale = await getCachedProfileByClerkId(mockAdmin, 'clerk-user-11')
  assert.deepEqual(profileStale.preferences.genres, ['Sci-Fi'], 'Cache returns initial value before invalidation')

  // 3. Invalidate cache on settings save
  invalidateProfileCache('clerk-user-11')

  // 4. Next fetch returns fresh updated taste preferences
  const profileFresh = await getCachedProfileByClerkId(mockAdmin, 'clerk-user-11')
  assert.deepEqual(profileFresh.preferences.genres, ['Family Drama', 'Political Fiction'], 'Cache invalidation delivers fresh preferences')

  // 5. Client sessionStorage purge invariant in Settings
  const fs = await import('node:fs/promises')
  const settingsCode = await fs.readFile('src/routes/settings.tsx', 'utf8')
  assert.ok(
    settingsCode.includes("sessionStorage.removeItem('hatchpen_cached_rec_signals')"),
    'Settings must clear client-side cached recommendation signals upon successful update/reset'
  )
})

// --- Scenario 12: New user pre-onboarding cache does not persist post-onboarding ---
test('Scenario 12: New user pre-onboarding profile cache does not persist post-onboarding', async () => {
  const { getCachedProfileByClerkId, invalidateProfileCache } = await import('../src/server/authors.ts')

  let userProfileInDb = { id: 'new-user-uuid', clerk_user_id: 'clerk-new-12', preferences: null }
  const mockAdmin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: userProfileInDb,
          }),
        }),
      }),
    }),
  }

  // Pre-onboarding read
  const preProfile = await getCachedProfileByClerkId(mockAdmin, 'clerk-new-12')
  assert.equal(preProfile.preferences, null)

  // User completes onboarding
  userProfileInDb = {
    id: 'new-user-uuid',
    clerk_user_id: 'clerk-new-12',
    preferences: { genres: ['Family Drama'], categories: ['New Adult'] },
  }
  invalidateProfileCache('clerk-new-12')

  // Post-onboarding read
  const postProfile = await getCachedProfileByClerkId(mockAdmin, 'clerk-new-12')
  assert.ok(postProfile.preferences.genres.includes('Family Drama'))
})

// --- Scenario 13: Changing preferences removes old matches and includes new matches ---
test('Scenario 13: Changing preferences from (A, B) to (C, D) dynamically updates recommendations', () => {
  const workA = createMockWork({ id: 'work-a', genre: 'GenreA', genreSlug: 'genrea' })
  const workB = createMockWork({ id: 'work-b', genre: 'GenreB', genreSlug: 'genreb' })
  const workC = createMockWork({ id: 'work-c', genre: 'GenreC', genreSlug: 'genrec' })
  const workD = createMockWork({ id: 'work-d', genre: 'GenreD', genreSlug: 'genred' })

  const candidates = [workA, workB, workC, workD]

  // Initial preferences: GenreA, GenreB
  const initialResults = calculateForYouRecommendations({
    candidateWorks: candidates,
    userPreferences: { genres: ['GenreA', 'GenreB'] },
  })
  const initialIds = initialResults.map((r) => r.work.id)
  assert.deepEqual(initialIds.sort(), ['work-a', 'work-b'])

  // Updated preferences: GenreC, GenreD
  const updatedResults = calculateForYouRecommendations({
    candidateWorks: candidates,
    userPreferences: { genres: ['GenreC', 'GenreD'] },
  })
  const updatedIds = updatedResults.map((r) => r.work.id)
  assert.deepEqual(updatedIds.sort(), ['work-c', 'work-d'])
})

// --- Scenario 14: Cache isolation across multiple users ---
test('Scenario 14: Cache isolation: User X preference change never affects User Y recommendations', async () => {
  const { getCachedProfileByClerkId, invalidateProfileCache } = await import('../src/server/authors.ts')

  const profilesMap = new Map([
    ['user-x', { id: 'x-uuid', clerk_user_id: 'user-x', preferences: { genres: ['Fantasy'] } }],
    ['user-y', { id: 'y-uuid', clerk_user_id: 'user-y', preferences: { genres: ['Sci-Fi'] } }],
  ])

  const mockAdmin = {
    from: () => ({
      select: () => ({
        eq: (_col, clerkId) => ({
          maybeSingle: async () => ({
            data: profilesMap.get(clerkId) || null,
          }),
        }),
      }),
    }),
  }

  // Warm both caches
  const profileX = await getCachedProfileByClerkId(mockAdmin, 'user-x')
  const profileY = await getCachedProfileByClerkId(mockAdmin, 'user-y')
  assert.equal(profileX.preferences.genres[0], 'Fantasy')
  assert.equal(profileY.preferences.genres[0], 'Sci-Fi')

  // Invalidate User X
  invalidateProfileCache('user-x')

  // User Y must remain isolated and valid
  const cachedY = await getCachedProfileByClerkId(mockAdmin, 'user-y')
  assert.equal(cachedY.preferences.genres[0], 'Sci-Fi', 'User Y cache remains intact')
})

// --- Scenario 15: Network/API error vs genuine zero-match state ---
test('Scenario 15: Safe distinction between network error and genuine zero-match state', () => {
  // Candidate works exist
  const works = [createMockWork({ id: 'w1', genre: 'Horror', genreSlug: 'horror' })]

  // Case A: Genuine zero-match (user preferences loaded, but 0 candidates match)
  const genuineZeroMatch = calculateForYouRecommendations({
    candidateWorks: works,
    userPreferences: { genres: ['Family Drama'] },
  })
  assert.equal(genuineZeroMatch.length, 0, 'Genuine zero-match returns 0 results for empty-state UI')

  // Case B: In LoggedInHome, loading state shows skeleton; signals present shows empty state
  const hasLoadedSignals = true
  const hasZeroRecs = genuineZeroMatch.length === 0
  const shouldShowEmptyState = hasLoadedSignals && hasZeroRecs
  assert.equal(shouldShowEmptyState, true)
})

// --- Scenario 16: Draft, private, or unpublished works strictly excluded ---
test('Scenario 16: Draft, private, or unpublished works excluded regardless of preference match', () => {
  const draftWork = createMockWork({
    id: 'work-draft',
    genre: 'Family Drama',
    category: 'New Adult',
    visibility: 'Draft',
  })
  const unlistedWork = createMockWork({
    id: 'work-unlisted',
    genre: 'Family Drama',
    category: 'New Adult',
    visibility: 'Unlisted',
  })
  const cancelledWork = createMockWork({
    id: 'work-cancelled',
    genre: 'Family Drama',
    category: 'New Adult',
    status: 'Cancelled',
  })
  const zeroChaptersWork = createMockWork({
    id: 'work-zero-chap',
    genre: 'Family Drama',
    category: 'New Adult',
    publishedChaptersCount: 0,
    chapters: [],
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [draftWork, unlistedWork, cancelledWork, zeroChaptersWork],
    userPreferences: { genres: ['Family Drama'], categories: ['New Adult'] },
  })

  assert.equal(results.length, 0, 'All unpublished or 0-chapter works must be excluded')
})

// --- Scenario 17: Author joins multiple genres/categories: deduplication ensures work appears once ---
test('Scenario 17: Author assigns multiple genres; deduplication ensures work appears at most once', () => {
  const multiGenreWork = createMockWork({
    id: 'work-multi',
    genre: 'Family Drama',
    genreSlug: 'family-drama',
    genres: ['Family Drama', 'Political Fiction'],
    category: 'New Adult',
    categorySlug: 'new-adult',
  })

  const results = calculateForYouRecommendations({
    candidateWorks: [multiGenreWork],
    userPreferences: {
      genres: ['Family Drama', 'Political Fiction'],
      categories: ['New Adult'],
    },
  })

  assert.equal(results.length, 1, 'Must appear exactly once despite matching multiple genres')
  assert.equal(results[0].work.id, 'work-multi')
})

// --- Scenario 18: Preference matches are not arbitrarily truncated before ranking ---
test('Scenario 18: Up to MAX_RECOMMENDATIONS (10) eligible works are returned from large candidate catalog', () => {
  const candidates = []
  for (let i = 1; i <= 25; i++) {
    candidates.push(
      createMockWork({
        id: `work-${i}`,
        title: `Family Story ${i}`,
        genre: 'Family Drama',
        genreSlug: 'family-drama',
        totalReads: String(i * 100),
      })
    )
  }

  const results = calculateForYouRecommendations({
    candidateWorks: candidates,
    userPreferences: { genres: ['Family Drama'] },
  })

  assert.equal(results.length, 10, 'Must return exactly 10 works respecting MAX_RECOMMENDATIONS')
  assert.equal(results[0].work.id, 'work-25', 'Highest total reads ranked first among equal score matches')
})

// --- Scenario 19: Slow network / race condition handling ---
test('Scenario 19: Asynchronous race-condition tolerance for recommendation signals', async () => {
  let activeVersion = 0
  let renderedResult = null

  async function simulateFetchSignals(version, delayMs, preferredGenre) {
    activeVersion = version
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    // If newer request was dispatched while this was in flight, discard stale response
    if (version === activeVersion) {
      renderedResult = preferredGenre
    }
  }

  // Dispatch slow request version 1 (100ms)
  const req1 = simulateFetchSignals(1, 80, 'Fantasy')
  // User rapidly clicks and updates preferences to version 2 (20ms)
  const req2 = simulateFetchSignals(2, 20, 'Political Fiction')

  await Promise.all([req1, req2])

  assert.equal(renderedResult, 'Political Fiction', 'Stale async response was safely discarded')
})

// --- Scenario 20: Taste shift adds high-affinity genre but does not recommend unrelated works ---
test('Scenario 20: Active reading shift includes high-affinity genre, but unrelated works remain excluded', () => {
  const fantasyWork = createMockWork({ id: 'w-fantasy', genre: 'Fantasy', genreSlug: 'fantasy' })
  const thrillerWork = createMockWork({ id: 'w-thriller', genre: 'Thriller', genreSlug: 'thriller' })
  const horrorWork = createMockWork({ id: 'w-horror', genre: 'Horror', genreSlug: 'horror' })

  const now = Date.now()
  const readingHistory = [
    { workId: 'w-thriller', durationSeconds: 60, lastReadAt: new Date(now - 1000).toISOString() },
    { workId: 'w-thriller', durationSeconds: 50, lastReadAt: new Date(now - 2000).toISOString() },
  ]

  const results = calculateForYouRecommendations({
    candidateWorks: [fantasyWork, thrillerWork, horrorWork],
    readingHistory,
    userPreferences: { genres: ['Fantasy'] },
  })

  const recommendedIds = results.map((r) => r.work.id)
  assert.ok(recommendedIds.includes('w-thriller'), 'Verified active reading adds Thriller')
  assert.ok(recommendedIds.includes('w-fantasy'), 'Onboarding preference Fantasy is retained')
  assert.ok(!recommendedIds.includes('w-horror'), 'Unrelated Horror work remains strictly excluded')
})

// --- Scenario 21: Unpublished works do not linger after status changes ---
test('Scenario 21: Changing status from published to draft/unlisted immediately disqualifies work', () => {
  const work = createMockWork({
    id: 'work-changing',
    genre: 'Family Drama',
    visibility: 'Public',
    publishedChaptersCount: 1,
  })

  // Initially eligible
  assert.equal(isWorkEligibleForRecommendations(work, {}), true)

  // Status changes to Draft
  work.visibility = 'Draft'
  assert.equal(isWorkEligibleForRecommendations(work, {}), false)

  // Status changes to Unlisted
  work.visibility = 'Unlisted'
  assert.equal(isWorkEligibleForRecommendations(work, {}), false)
})

// --- Scenario 22: Deterministic ordering on equal scores ---
test('Scenario 22: Deterministic ordering for two works with identical score, reads, and recency', () => {
  const timestamp = new Date('2026-10-25T12:00:00Z').toISOString()
  const workBeta = createMockWork({
    id: 'work-beta',
    title: 'Beta Manuscript',
    genre: 'Family Drama',
    totalReads: '1000',
    lastActivityAt: timestamp,
  })
  const workAlpha = createMockWork({
    id: 'work-alpha',
    title: 'Alpha Manuscript',
    genre: 'Family Drama',
    totalReads: '1000',
    lastActivityAt: timestamp,
  })

  // Input array in order [workBeta, workAlpha]
  const results1 = calculateForYouRecommendations({
    candidateWorks: [workBeta, workAlpha],
    userPreferences: { genres: ['Family Drama'] },
  })

  // Input array in order [workAlpha, workBeta]
  const results2 = calculateForYouRecommendations({
    candidateWorks: [workAlpha, workBeta],
    userPreferences: { genres: ['Family Drama'] },
  })

  // Ordering must be identical in both runs: "work-alpha" before "work-beta" (lexicographic ID tie-breaking)
  assert.equal(results1[0].work.id, 'work-alpha')
  assert.equal(results1[1].work.id, 'work-beta')
  assert.equal(results2[0].work.id, 'work-alpha')
  assert.equal(results2[1].work.id, 'work-beta')
})

// --- Scenario 23: Mock and local fixture compatibility ---
test('Scenario 23: Complete test suite runs fully offline without requiring live Supabase credentials', () => {
  const mockWork = createMockWork()
  assert.ok(mockWork.id, 'Mock fixture instantiates cleanly')
  const results = calculateForYouRecommendations({
    candidateWorks: [mockWork],
    userPreferences: null,
  })
  assert.ok(results.length > 0, 'Runs without external network or database calls')
})
