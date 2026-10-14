import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterAndSortWorks,
  parseTotalReads,
  getUtcWeekBoundaries,
  isWorkNewThisWeek,
  isWorkNewChaptersThisWeek,
  isPublicPublishedWork,
  matchesGenre,
  matchesCategory,
  matchesStatus,
  matchesSearch,
  matchesTab,
} from '../src/lib/discover/filters.ts'

/**
 * Fixed reference time for independent oracle verification:
 * Wednesday, October 14, 2026 12:00:00.000 UTC
 * UTC Week Window: [2026-10-12T00:00:00.000Z, 2026-10-19T00:00:00.000Z)
 */
const TEST_REF_DATE = new Date('2026-10-14T12:00:00.000Z')

// Deterministic 12-Story Fixture with explicitly defined properties
const FIXTURES = [
  {
    id: 's-01',
    title: 'Chronicles of the Solar Wind',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    genres: [
      { id: 'g-1', name: 'Fantasy', slug: 'fantasy' },
      { id: 'g-2', name: 'Science Fiction', slug: 'sci-fi' },
    ],
    tags: ['Epic', 'Solar', 'Adventure'],
    status: 'Ongoing',
    visibility: 'Public',
    trending: true,
    rising: false,
    featured: false,
    synopsis: 'A voyage across stellar currents.',
    fullDescription: 'Detailed stellar space journey narrative.',
    chaptersCount: 1,
    publishedChaptersCount: 1,
    totalReads: '1.2M',
    totalSaves: 120,
    ratingScore: 4.9,
    publishedAt: '2026-10-14T10:00:00.000Z', // In current week
    updatedAt: '2026-10-14T10:00:00.000Z',
    author: { id: 'a-1', name: 'Arthur Vance', handle: 'avance' },
    chapters: [{ id: 'c-01', number: 1, title: 'Ch 1', status: 'published', publishedAt: '2026-10-14T10:00:00.000Z' }],
  },
  {
    id: 's-02',
    title: 'The Silicon Monolith',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Science Fiction',
    genreSlug: 'sci-fi',
    genres: [
      { id: 'g-2', name: 'Science Fiction', slug: 'sci-fi' },
      { id: 'g-1', name: 'Fantasy', slug: 'fantasy' },
    ],
    tags: ['Cyberpunk', 'AI'],
    status: 'Completed',
    visibility: 'Public',
    trending: false,
    rising: true,
    featured: false,
    synopsis: 'Sentient architecture awakening beneath the city.',
    fullDescription: 'An investigative reporter meets a thinking building.',
    chaptersCount: 1,
    publishedChaptersCount: 1,
    totalReads: '500K',
    totalSaves: 90,
    ratingScore: 4.7,
    publishedAt: '2026-10-13T09:00:00.000Z', // In current week
    updatedAt: '2026-10-13T09:00:00.000Z',
    author: { id: 'a-2', name: 'Elena Rostova', handle: 'erostova' },
    chapters: [{ id: 'c-02', number: 1, title: 'Ch 1', status: 'published', publishedAt: '2026-10-13T09:00:00.000Z' }],
  },
  {
    id: 's-03',
    title: 'Notes on the Northern Rail',
    category: 'Short Stories',
    categorySlug: 'short-stories',
    genre: 'Literary Fiction',
    genreSlug: 'literary-fiction',
    genres: [{ id: 'g-3', name: 'Literary Fiction', slug: 'literary-fiction' }],
    tags: ['Atmospheric', 'Train'],
    status: 'Completed',
    visibility: 'Public',
    trending: false,
    rising: false,
    featured: false,
    synopsis: 'Short reflections from winter locomotives.',
    fullDescription: 'Sparse poetic prose following railway lines in winter.',
    chaptersCount: 2,
    publishedChaptersCount: 2,
    totalReads: '300K',
    totalSaves: 40,
    ratingScore: 4.8,
    publishedAt: '2026-09-01T00:00:00.000Z', // Old publication (prior month)
    updatedAt: '2026-10-14T08:00:00.000Z', // Updated this week!
    author: { id: 'a-3', name: 'Julian Montgomery', handle: 'jmontgomery' },
    chapters: [
      { id: 'c-03a', number: 1, title: 'Departure', status: 'published', publishedAt: '2026-09-01T00:00:00.000Z' },
      { id: 'c-03b', number: 2, title: 'Waystation', status: 'published', publishedAt: '2026-10-14T08:00:00.000Z' }, // New chapter this week!
    ],
  },
  {
    id: 's-04',
    title: 'Fragments in Birch',
    category: 'Poetry',
    categorySlug: 'poetry',
    genre: 'Literary Fiction',
    genreSlug: 'literary-fiction',
    genres: [{ id: 'g-3', name: 'Literary Fiction', slug: 'literary-fiction' }],
    tags: ['Lyric', 'Nature'],
    status: 'Ongoing',
    visibility: 'Public',
    trending: false,
    rising: false,
    featured: false,
    synopsis: 'Meditations on northern trees and paper.',
    fullDescription: 'A collection of fifty free-verse lyric fragments.',
    chaptersCount: 1,
    publishedChaptersCount: 1,
    totalReads: '50K',
    totalSaves: 10,
    ratingScore: 4.2,
    publishedAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    author: { id: 'a-4', name: 'Silvia Crane', handle: 'scrane' },
    chapters: [{ id: 'c-04', number: 1, title: 'Invocation', status: 'published', publishedAt: '2026-08-01T00:00:00.000Z' }],
  },
  {
    id: 's-05',
    title: 'Dialectics of the Fog',
    category: 'Essays',
    categorySlug: 'essays',
    genre: 'Philosophy',
    genreSlug: 'philosophy',
    genres: [{ id: 'g-4', name: 'Philosophy', slug: 'philosophy' }],
    tags: ['Aesthetics', 'Baltic'],
    status: 'Completed',
    visibility: 'Public',
    trending: true,
    rising: false,
    featured: false,
    synopsis: 'Philosophical inquiries into maritime fog.',
    fullDescription: 'Discussions of clarity, obscurity, and maritime perception.',
    chaptersCount: 1,
    publishedChaptersCount: 1,
    totalReads: '150K',
    totalSaves: 30,
    ratingScore: 4.6,
    publishedAt: '2026-10-12T01:00:00.000Z', // Monday 1am - in current week
    updatedAt: '2026-10-12T01:00:00.000Z',
    author: { id: 'a-5', name: 'Marcus K', handle: 'marcus_k' },
    chapters: [{ id: 'c-05', number: 1, title: 'Origins', status: 'published', publishedAt: '2026-10-12T01:00:00.000Z' }],
  },
  {
    id: 's-06',
    title: 'The Tomorrow Archive',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    status: 'Ongoing',
    visibility: 'Public',
    publishedAt: '2026-10-15T00:00:00.000Z', // FUTURE timestamp relative to Oct 14 12:00 UTC
    totalReads: '80K',
    ratingScore: 4.5,
    chapters: [{ id: 'c-06', number: 1, status: 'published', publishedAt: '2026-10-15T00:00:00.000Z' }],
  },
  {
    id: 's-07',
    title: 'Secret Draft Manuscript',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Mystery',
    genreSlug: 'mystery',
    status: 'Draft', // Draft status
    visibility: 'Public',
    publishedAt: null, // Null published date
    totalReads: '90K',
    ratingScore: 4.3,
  },
  {
    id: 's-08',
    title: 'Private Diary of an Inventor',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Mystery',
    genreSlug: 'mystery',
    status: 'Ongoing',
    visibility: 'Private', // Non-public
    publishedAt: '2026-10-14T00:00:00.000Z',
    totalReads: '200K',
    ratingScore: 4.4,
  },
  {
    id: 's-09',
    title: 'A Garden in Granada',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Romance',
    genreSlug: 'romance',
    genres: [{ id: 'g-5', name: 'Romance', slug: 'romance' }],
    tags: ['Historical', 'Spain'],
    status: 'Completed',
    visibility: 'Public',
    trending: true,
    rising: false,
    totalReads: '600K',
    totalSaves: 150,
    ratingScore: 4.1,
    publishedAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    author: { id: 'a-6', name: 'Clara Diaz', handle: 'claradiaz' },
  },
  {
    id: 's-10',
    title: 'Shadows of the Mill',
    category: 'Short Stories',
    categorySlug: 'short-stories',
    genre: 'Horror',
    genreSlug: 'horror',
    genres: [{ id: 'g-6', name: 'Horror', slug: 'horror' }],
    tags: ['Ghost', 'Dark'],
    status: 'Ongoing',
    visibility: 'Public',
    trending: false,
    rising: false,
    totalReads: '25K',
    ratingScore: 4.0,
    publishedAt: '2026-10-11T23:59:59.000Z', // 1 second BEFORE Monday 00:00 UTC (Prior week boundary)
    updatedAt: '2026-10-11T23:59:59.000Z',
    author: { id: 'a-7', name: 'Derrick Poe', handle: 'dpoe' },
  },
  {
    id: 's-11',
    title: 'The Alabaster Gates',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    genres: [{ id: 'g-1', name: 'Fantasy', slug: 'fantasy' }],
    tags: ['Palace', 'Court'],
    status: 'Completed',
    visibility: 'Public',
    trending: false,
    rising: true,
    totalReads: '500K',
    totalSaves: 85,
    ratingScore: 4.7,
    publishedAt: '2026-10-14T11:00:00.000Z', // In week
    updatedAt: '2026-10-14T11:00:00.000Z',
    author: { id: 'a-8', name: 'Gwenith Vance', handle: 'gvance' },
  },
  {
    id: 's-12',
    title: 'Corrupted Date Entry',
    category: 'Essays',
    categorySlug: 'essays',
    genre: 'Literary Fiction',
    genreSlug: 'literary-fiction',
    status: 'Ongoing',
    visibility: 'Public',
    publishedAt: 'invalid-non-numeric-timestamp', // Corrupted
    totalReads: '10K',
    ratingScore: 3.8,
  },
]

// ==============================================================================
// 1. INDEPENDENT RESULT ORACLE: INDIVIDUAL FILTERS
// ==============================================================================

test('Oracle: Tab "all" matches only valid published public works, sorted by popularity', () => {
  // Expected: s-06 (future), s-07 (draft), s-08 (private), and s-12 (invalid date) are strictly excluded.
  // Expected order by reads:
  // s-01: 1.2M
  // s-09: 600K
  // s-02: 500K (id tie-break s-02 before s-11)
  // s-11: 500K
  // s-03: 300K
  // s-05: 150K
  // s-04: 50K
  // s-10: 25K
  const EXPECTED_IDS = ['s-01', 's-09', 's-02', 's-11', 's-03', 's-05', 's-04', 's-10']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Tab "new_this_week" matches only works initially published in current UTC week', () => {
  // Qualifying: s-01 (Oct 14), s-02 (Oct 13), s-11 (Oct 14), s-05 (Oct 12 01:00)
  // Excluded:
  // s-10: Published Oct 11 23:59:59 (Sunday before Monday boundary)
  // s-03: Published in Sept (even though updated this week)
  // s-06: Future timestamp (Oct 15 > now Oct 14 12:00)
  // Expected popularity order: s-01 (1.2M), s-02 (500K), s-11 (500K), s-05 (150K)
  const EXPECTED_IDS = ['s-01', 's-02', 's-11', 's-05']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'new_this_week',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Tab "new_chapters" matches established works with chapters published this week', () => {
  // s-03 is established from Sept and has ch2 published Oct 14 08:00 UTC
  // Brand-new works (s-01, s-02, s-05, s-11) do NOT qualify for new_chapters_this_week
  const EXPECTED_IDS = ['s-03']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'new_chapters',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Tab "trending" matches works with trending=true (featured alone does NOT qualify)', () => {
  // In FIXTURES, only s-01, s-09, s-05 have trending=true
  const EXPECTED_IDS = ['s-01', 's-09', 's-05']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)

  // Verify that adding a featured-only story does NOT cause it to appear in Trending
  const withFeaturedOnly = [
    ...FIXTURES,
    {
      id: 's-curator-pick',
      title: 'Curator Spotlight',
      category: 'Novels',
      categorySlug: 'novels',
      genre: 'Fantasy',
      genreSlug: 'fantasy',
      status: 'Completed',
      visibility: 'Public',
      featured: true,
      trending: false,
      publishedAt: '2026-10-14T00:00:00.000Z',
      totalReads: '800K',
      ratingScore: 4.8,
    },
  ]

  const resultWithFeatured = filterAndSortWorks(withFeaturedOnly, {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.equal(
    resultWithFeatured.some((w) => w.id === 's-curator-pick'),
    false,
    'Featured-only work must not appear in Trending'
  )
})

test('Oracle: Tab "rising" enforces authenticated visibility protection', () => {
  // Authenticated: s-02 (500K), s-11 (500K)
  const authResult = filterAndSortWorks(FIXTURES, {
    activeTab: 'rising',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(authResult.map((r) => r.id), ['s-02', 's-11'])

  // Anonymous visitor: 0 results
  const anonResult = filterAndSortWorks(FIXTURES, {
    activeTab: 'rising',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(anonResult, [])
})

test('Oracle: Tab "completed" matches works with status="Completed"', () => {
  // Completed: s-09 (600K), s-02 (500K), s-11 (500K), s-03 (300K), s-05 (150K)
  const EXPECTED_IDS = ['s-09', 's-02', 's-11', 's-03', 's-05']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'completed',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Category and Genre multi-group matching (OR semantics on genres)', () => {
  // Category 'novels': s-01, s-09, s-02, s-11
  const novels = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'novels',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(novels.map((r) => r.id), ['s-01', 's-09', 's-02', 's-11'])

  // Genre 'sci-fi' matches s-01 (secondary) and s-02 (primary)
  const scifi = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'sci-fi',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(scifi.map((r) => r.id), ['s-01', 's-02'])

  // Genre 'fantasy' matches s-01 (primary), s-02 (secondary), s-11 (primary)
  const fantasy = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'fantasy',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(fantasy.map((r) => r.id), ['s-01', 's-02', 's-11'])
})

// ==============================================================================
// 2. COMBINED FILTER CONJUNCTIONS
// ==============================================================================

test('Oracle: Combined Tab "new_this_week" + Category "novels" + Genre "fantasy"', () => {
  // New this week novels in fantasy: s-01 (1.2M), s-02 (500K secondary), s-11 (500K primary)
  const EXPECTED_IDS = ['s-01', 's-02', 's-11']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'new_this_week',
    selectedCategory: 'novels',
    selectedGenre: 'fantasy',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Combined Tab "completed" + Category "novels" + Genre "sci-fi"', () => {
  // Only s-02 is Completed, in Novels, and has Sci-Fi
  const EXPECTED_IDS = ['s-02']

  const result = filterAndSortWorks(FIXTURES, {
    activeTab: 'completed',
    selectedCategory: 'novels',
    selectedGenre: 'sci-fi',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })

  assert.deepEqual(result.map((r) => r.id), EXPECTED_IDS)
})

test('Oracle: Search combined with Category filter', () => {
  // Searching 'rail' across all works matches s-03
  const searchRail = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: 'rail',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(searchRail.map((r) => r.id), ['s-03'])

  // Searching 'rail' with Category 'novels' yields 0 (since s-03 is short-stories)
  const searchRailNovels = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'novels',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: 'rail',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_REF_DATE,
  })
  assert.deepEqual(searchRailNovels, [])
})

// ==============================================================================
// 3. PROPERTY & INVARIANT ASSERTIONS
// ==============================================================================

test('Invariants: Every result in any query satisfies public publication invariants', () => {
  const queryPermutations = [
    { activeTab: 'all', selectedCategory: 'all', selectedGenre: 'all', selectedStatus: 'all' },
    { activeTab: 'new_this_week', selectedCategory: 'novels', selectedGenre: 'all', selectedStatus: 'all' },
    { activeTab: 'trending', selectedCategory: 'all', selectedGenre: 'all', selectedStatus: 'Completed' },
    { activeTab: 'all', selectedCategory: 'short-stories', selectedGenre: 'all', selectedStatus: 'all' },
  ]

  for (const q of queryPermutations) {
    const results = filterAndSortWorks(FIXTURES, {
      ...q,
      searchTerm: '',
      sortBy: 'popularity',
      isSignedIn: true,
      nowDate: TEST_REF_DATE,
    })

    // Invariant 1: No duplicates
    const ids = results.map((r) => r.id)
    assert.equal(new Set(ids).size, ids.length, 'Results must contain unique IDs')

    // Invariant 2: Universal public publication predicate
    for (const work of results) {
      assert.equal(isPublicPublishedWork(work, TEST_REF_DATE), true)
      assert.notEqual(work.status, 'Draft')
      assert.equal(work.visibility.toLowerCase(), 'public')
      assert.ok(work.publishedAt, 'Must have publishedAt')
      assert.ok(new Date(work.publishedAt).getTime() <= TEST_REF_DATE.getTime(), 'Must not be future published')
    }
  }
})

test('Invariants: Multi-filter order commutativity', () => {
  // Condition 1: Category Novels + Status Completed + Genre Fantasy
  // Sequence 1: filterAndSortWorks with category=novels, genre=fantasy, status=Completed
  const res1 = filterAndSortWorks(FIXTURES, {
    activeTab: 'all',
    selectedCategory: 'novels',
    selectedGenre: 'fantasy',
    selectedStatus: 'Completed',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
    nowDate: TEST_REF_DATE,
  })

  // Sequence 2: Filter manual order
  const manual = FIXTURES
    .filter((w) => matchesStatus(w, 'Completed'))
    .filter((w) => matchesGenre(w, 'fantasy'))
    .filter((w) => matchesCategory(w, 'novels'))
    .filter((w) => isPublicPublishedWork(w, TEST_REF_DATE))

  assert.deepEqual(
    res1.map((w) => w.id).sort(),
    manual.map((w) => w.id).sort()
  )
})
