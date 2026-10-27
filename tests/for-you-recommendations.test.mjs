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
