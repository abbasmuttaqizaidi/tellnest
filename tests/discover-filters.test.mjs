import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterAndSortWorks,
  parseTotalReads,
  getUtcWeekBoundaries,
  isWorkNewThisWeek,
  isWorkNewChaptersThisWeek,
  matchesGenre,
  matchesCategory,
  matchesStatus,
  matchesSearch,
  matchesTab,
} from '../src/lib/discover/filters.ts'
import { WORKS } from '../src/data/mockData.ts'
import { executeGetPlatformWorks } from '../src/server/works.ts'

// Fixed test reference time: Wednesday, October 14, 2026 12:00:00 UTC
// Week boundary: Monday, Oct 12, 2026 00:00:00 UTC to Monday, Oct 19, 2026 00:00:00 UTC
const TEST_NOW = new Date('2026-10-14T12:00:00.000Z')
const WEEK_START = new Date('2026-10-12T00:00:00.000Z')
const WEEK_END = new Date('2026-10-19T00:00:00.000Z')

function createTestStory(overrides = {}) {
  return {
    id: overrides.id || 'test-story-1',
    title: overrides.title || 'The Test Manuscript',
    category: overrides.category || 'Novels',
    categorySlug: overrides.categorySlug || 'novels',
    genre: overrides.genre || 'Literary Fiction',
    genreSlug: overrides.genreSlug || 'literary-fiction',
    genres: overrides.genres || [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
    tags: overrides.tags || ['Archival', 'Philosophical'],
    status: overrides.status || 'Ongoing',
    visibility: overrides.visibility || 'Public',
    isMature: false,
    trending: overrides.trending || false,
    rising: overrides.rising || false,
    featured: overrides.featured || false,
    synopsis: overrides.synopsis || 'A brief test synopsis about cartography.',
    fullDescription: overrides.fullDescription || 'A full narrative description.',
    chaptersCount: overrides.chaptersCount || 1,
    publishedChaptersCount: overrides.publishedChaptersCount || 1,
    totalReads: overrides.totalReads !== undefined ? overrides.totalReads : '100K',
    totalSaves: overrides.totalSaves || 10,
    ratingScore: overrides.ratingScore || 4.8,
    createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
    publishedAt: overrides.publishedAt !== undefined ? overrides.publishedAt : '2026-01-01T00:00:00.000Z',
    author: overrides.author || {
      id: 'author-1',
      name: 'Julian Montgomery',
      handle: 'jmontgomery',
      avatar: 'https://example.com/avatar.jpg',
    },
    chapters: overrides.chapters || [
      {
        id: 'ch-1',
        number: 1,
        title: 'Chapter One',
        status: 'published',
        publishedAt: '2026-01-01T00:00:00.000Z',
        wordCount: 1500,
        readTimeMinutes: 6,
        content: 'Sample chapter content.',
      },
    ],
    ...overrides,
  }
}

// ==============================================================================
// 1. POPULARITY SORTING & READS PARSING TESTS
// ==============================================================================
test('Popularity Sorting: parseTotalReads correctly parses formatted and raw counts', () => {
  assert.equal(parseTotalReads('2.4M'), 2400000)
  assert.equal(parseTotalReads('1.2M'), 1200000)
  assert.equal(parseTotalReads('640K'), 640000)
  assert.equal(parseTotalReads('215K'), 215000)
  assert.equal(parseTotalReads('500'), 500)
  assert.equal(parseTotalReads(500), 500)
  assert.equal(parseTotalReads('0'), 0)
  assert.equal(parseTotalReads(''), 0)
  assert.equal(parseTotalReads(null), 0)
  assert.equal(parseTotalReads(undefined), 0)
})

test('Popularity Sorting: Orders 2.4M > 1.2M > 640K > 215K > 500 > 0 correctly', () => {
  const stories = [
    createTestStory({ id: 's-500', totalReads: '500' }),
    createTestStory({ id: 's-1.2m', totalReads: '1.2M' }),
    createTestStory({ id: 's-215k', totalReads: '215K' }),
    createTestStory({ id: 's-2.4m', totalReads: '2.4M' }),
    createTestStory({ id: 's-640k', totalReads: '640K' }),
    createTestStory({ id: 's-0', totalReads: '0' }),
  ]

  const sorted = filterAndSortWorks(stories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  const order = sorted.map((s) => s.id)
  assert.deepEqual(order, ['s-2.4m', 's-1.2m', 's-640k', 's-215k', 's-500', 's-0'])
})

// ==============================================================================
// 2. GENRE MATCHING (PRIMARY & SECONDARY WITH OR SEMANTICS)
// ==============================================================================
test('Genre Filter: Matches primary genre and secondary genres via OR semantics', () => {
  const multiGenreStory = createTestStory({
    id: 'multi-g',
    genre: 'Philosophical Fiction',
    genreSlug: 'philosophical-fiction',
    genres: [
      { id: 'g-1', name: 'Philosophical Fiction', slug: 'philosophical-fiction' },
      { id: 'g-2', name: 'Literary Fiction', slug: 'literary-fiction' },
      { id: 'g-3', name: 'Mystery', slug: 'mystery' },
    ],
  })

  // Matches primary
  assert.equal(matchesGenre(multiGenreStory, 'philosophical-fiction'), true)
  // Matches secondary 1
  assert.equal(matchesGenre(multiGenreStory, 'literary-fiction'), true)
  // Matches secondary 2
  assert.equal(matchesGenre(multiGenreStory, 'mystery'), true)
  // Does not match unrelated
  assert.equal(matchesGenre(multiGenreStory, 'science-fiction'), false)
  // 'all' matches everything
  assert.equal(matchesGenre(multiGenreStory, 'all'), true)
})

test('Genre Filter: Filtering works by genre returns only stories having that genre', () => {
  const stories = [
    createTestStory({ id: 's-1', genreSlug: 'fantasy', genres: [{ slug: 'fantasy', name: 'Fantasy' }] }),
    createTestStory({ id: 's-2', genreSlug: 'mystery', genres: [{ slug: 'mystery', name: 'Mystery' }] }),
    createTestStory({ id: 's-3', genreSlug: 'novels', genres: [{ slug: 'fantasy', name: 'Fantasy' }] }),
  ]

  const fantasyWorks = filterAndSortWorks(stories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'fantasy',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  assert.equal(fantasyWorks.length, 2)
  assert.deepEqual(fantasyWorks.map((w) => w.id), ['s-1', 's-3'])
})

// ==============================================================================
// 3. DATABASE GENRE AGGREGATION (executeGetPlatformWorks)
// ==============================================================================
test('DB Genre Mapping: executeGetPlatformWorks correctly aggregates genres from row.genres', async () => {
  const mockDbRows = [
    {
      id: 'db-work-1',
      title: 'A Sci-Fi Adventure',
      slug: 'a-sci-fi-adventure',
      category_name: 'Novels',
      category_slug: 'novels',
      genres: [
        { id: 'g-sci', name: 'Science Fiction', slug: 'science-fiction' },
        { id: 'g-thr', name: 'Thriller', slug: 'thriller' },
      ],
      visibility: 'public',
      status: 'ongoing',
      view_count: 1200,
      save_count: 45,
      collections: ['trending_now'],
      created_at: '2026-09-01T00:00:00.000Z',
      published_at: '2026-09-01T00:00:00.000Z',
    },
  ]

  const result = await executeGetPlatformWorks({
    queryRows: async () => mockDbRows,
    getAuthState: async () => ({ userId: 'user-1' }),
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].genre, 'Science Fiction')
  assert.equal(result[0].genreSlug, 'science-fiction')
  assert.equal(result[0].genres.length, 2)
  assert.equal(result[0].genres[1].slug, 'thriller')
})

// ==============================================================================
// 4. WEEK BOUNDARIES & DATE-SENSITIVE TESTS
// ==============================================================================
test('Week Boundaries: Correctly computes UTC Monday 00:00 to next Monday 00:00', () => {
  const boundaries = getUtcWeekBoundaries(TEST_NOW)
  assert.equal(boundaries.startUtc.toISOString(), '2026-10-12T00:00:00.000Z')
  assert.equal(boundaries.endUtc.toISOString(), '2026-10-19T00:00:00.000Z')
})

test('New This Week: Story published at exact start of week is eligible', () => {
  const story = createTestStory({
    id: 'start-of-week',
    publishedAt: '2026-10-12T00:00:00.000Z', // Monday 00:00:00 UTC
  })
  assert.equal(isWorkNewThisWeek(story, TEST_NOW), true)
})

test('New This Week: Story published immediately before next week is eligible', () => {
  const story = createTestStory({
    id: 'end-of-week',
    publishedAt: '2026-10-18T23:59:59.999Z', // Sunday 23:59:59 UTC
  })
  assert.equal(isWorkNewThisWeek(story, new Date('2026-10-18T23:59:59.999Z')), true)
})

test('New This Week: Story published on next Monday 00:00 is ineligible (exclusive boundary)', () => {
  const story = createTestStory({
    id: 'next-week',
    publishedAt: '2026-10-19T00:00:00.000Z',
  })
  assert.equal(isWorkNewThisWeek(story, TEST_NOW), false)
})

test('New This Week: Story created earlier but published this week qualifies', () => {
  const story = createTestStory({
    id: 'created-early-pub-now',
    createdAt: '2026-08-01T00:00:00.000Z',
    publishedAt: '2026-10-13T10:00:00.000Z', // Tuesday of this week
  })
  assert.equal(isWorkNewThisWeek(story, TEST_NOW), true)
})

test('New This Week: Draft created this week but not published is excluded', () => {
  const draftStory = createTestStory({
    id: 'draft-this-week',
    status: 'Draft',
    visibility: 'Draft',
    createdAt: '2026-10-13T10:00:00.000Z',
    publishedAt: undefined,
  })
  assert.equal(isWorkNewThisWeek(draftStory, TEST_NOW), false)
})

test('New This Week: Missing or invalid publication timestamps are ineligible', () => {
  const noPubDate = createTestStory({ id: 'no-pub', publishedAt: undefined })
  const invalidDate = createTestStory({ id: 'inv-pub', publishedAt: 'invalid-date' })
  assert.equal(isWorkNewThisWeek(noPubDate, TEST_NOW), false)
  assert.equal(isWorkNewThisWeek(invalidDate, TEST_NOW), false)
})

// ==============================================================================
// 5. NEW CHAPTERS THIS WEEK
// ==============================================================================
test('New Chapters This Week: Story published earlier with a new chapter published this week qualifies', () => {
  const story = createTestStory({
    id: 'established-with-new-ch',
    publishedAt: '2026-01-01T00:00:00.000Z',
    chapters: [
      { id: 'ch-1', number: 1, status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'ch-2', number: 2, status: 'published', publishedAt: '2026-10-13T15:00:00.000Z' }, // This week
    ],
  })
  assert.equal(isWorkNewChaptersThisWeek(story, TEST_NOW), true)
})

test('New Chapters This Week: Brand new story published this week does NOT qualify as new_chapters', () => {
  const newStory = createTestStory({
    id: 'brand-new-story',
    publishedAt: '2026-10-13T10:00:00.000Z', // Brand new this week
    chapters: [
      { id: 'ch-1', number: 1, status: 'published', publishedAt: '2026-10-13T10:00:00.000Z' },
    ],
  })
  assert.equal(isWorkNewThisWeek(newStory, TEST_NOW), true)
  assert.equal(isWorkNewChaptersThisWeek(newStory, TEST_NOW), false)
})

test('New Chapters This Week: Unpublished chapter updated this week does NOT qualify', () => {
  const story = createTestStory({
    id: 'draft-ch-update',
    publishedAt: '2026-01-01T00:00:00.000Z',
    chapters: [
      { id: 'ch-1', number: 1, status: 'published', publishedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'ch-2', number: 2, status: 'draft', publishedAt: '2026-10-13T15:00:00.000Z' }, // DRAFT chapter
    ],
  })
  assert.equal(isWorkNewChaptersThisWeek(story, TEST_NOW), false)
})

// ==============================================================================
// 6. DEFAULT TAB (ALL STORIES) & CLEAR FILTERS
// ==============================================================================
test('Discover Tabs: All Stories tab returns all public published stories without week constraint', () => {
  const stories = [
    createTestStory({ id: 'old-story', publishedAt: '2024-05-01T00:00:00.000Z' }),
    createTestStory({ id: 'this-week-story', publishedAt: '2026-10-13T00:00:00.000Z' }),
  ]

  const allResult = filterAndSortWorks(stories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })

  assert.equal(allResult.length, 2)

  const newThisWeekResult = filterAndSortWorks(stories, {
    activeTab: 'new_this_week',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })

  assert.equal(newThisWeekResult.length, 1)
  assert.equal(newThisWeekResult[0].id, 'this-week-story')
})

test('Completed Works: Filters strictly by status === Completed', () => {
  const stories = [
    createTestStory({ id: 's-completed', status: 'Completed' }),
    createTestStory({ id: 's-ongoing', status: 'Ongoing' }),
    createTestStory({ id: 's-hiatus', status: 'On Hiatus' }),
  ]

  const completed = filterAndSortWorks(stories, {
    activeTab: 'completed',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })

  assert.equal(completed.length, 1)
  assert.equal(completed[0].id, 's-completed')
})

// ==============================================================================
// 7. MULTI-FILTER COMPOSITION (AND ACROSS GROUPS)
// ==============================================================================
test('Filter Composition: AND semantics across Category, Genre, Status, and Search', () => {
  const stories = [
    createTestStory({
      id: 'match-all',
      title: 'The Silent Atlas',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Ongoing',
      tags: ['Cartography'],
    }),
    createTestStory({
      id: 'wrong-cat',
      title: 'The Silent Map',
      categorySlug: 'essays',
      genreSlug: 'fantasy',
      status: 'Ongoing',
    }),
    createTestStory({
      id: 'wrong-genre',
      title: 'The Silent Globe',
      categorySlug: 'novels',
      genreSlug: 'mystery',
      status: 'Ongoing',
    }),
    createTestStory({
      id: 'wrong-status',
      title: 'The Silent Chart',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Completed',
    }),
    createTestStory({
      id: 'wrong-search',
      title: 'Echoes of Stone',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Ongoing',
      tags: ['Geology'],
    }),
  ]

  const result = filterAndSortWorks(stories, {
    activeTab: 'all',
    selectedCategory: 'novels',
    selectedGenre: 'fantasy',
    selectedStatus: 'Ongoing',
    searchTerm: 'silent',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'match-all')
})

// ==============================================================================
// 8. VISIBILITY & SECURITY INVARIANTS
// ==============================================================================
test('Visibility Protection: Drafts, unlisted, and private stories are excluded from discovery', () => {
  const stories = [
    createTestStory({ id: 'pub-story', visibility: 'Public', status: 'Ongoing' }),
    createTestStory({ id: 'draft-status', visibility: 'Public', status: 'Draft' }),
    createTestStory({ id: 'unlisted-story', visibility: 'Unlisted', status: 'Ongoing' }),
    createTestStory({ id: 'private-story', visibility: 'Private', status: 'Ongoing' }),
  ]

  const result = filterAndSortWorks(stories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'pub-story')
})

test('Rising Stories Protection: Anonymous users cannot view Rising Stories', () => {
  const stories = [
    createTestStory({ id: 'rising-story', rising: true, collection: ['rising_stories'] }),
  ]

  // Anonymous request
  const anonResult = filterAndSortWorks(stories, {
    activeTab: 'rising',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })
  assert.equal(anonResult.length, 0)

  // Signed in request
  const authResult = filterAndSortWorks(stories, {
    activeTab: 'rising',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })
  assert.equal(authResult.length, 1)
})

// ==============================================================================
// 9. MOCK DATASET BASELINE COVERAGE
// ==============================================================================
test('Mock Baseline Coverage: All 8 mock stories render and filter correctly under All Stories', () => {
  const result = filterAndSortWorks(WORKS, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })

  assert.equal(result.length, 8)
  // Top read mock story should be 'work-4' (340K reads) followed by 'work-2' (215K reads)
  assert.equal(result[0].id, 'work-4')
  assert.equal(result[1].id, 'work-2')
})

// ==============================================================================
// 10. WEEKLY COLLECTION PARITY & ANTI-OVERRIDE
// ==============================================================================
test('Weekly Parity: Database created_at flag CANNOT falsely qualify an old published story', async () => {
  // Simulates a row where the SQL view wrongly set new_this_week: true (because created_at was this week),
  // but published_at was an old date (2025-01-01)
  const mockDbRows = [
    {
      id: 'db-old-published',
      title: 'Old Story Created Recently',
      slug: 'old-story-created-recently',
      category_name: 'Novels',
      category_slug: 'novels',
      genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
      visibility: 'public',
      status: 'ongoing',
      new_this_week: true, // WRONG SQL VIEW FLAG
      collections: ['new_this_week'], // WRONG SQL VIEW FLAG
      created_at: new Date().toISOString(), // Created this week
      published_at: '2025-01-01T00:00:00.000Z', // Published in 2025!
    },
  ]

  const result = await executeGetPlatformWorks({
    queryRows: async () => mockDbRows,
    getAuthState: async () => ({ userId: 'user-1' }),
  })

  // The application mapping must correct this using published_at
  assert.equal(result[0].new_this_week, false)
  assert.equal(result[0].collection.includes('new_this_week'), false)

  // Filtering must also reject it
  assert.equal(isWorkNewThisWeek(result[0]), false)
})

test('Weekly Parity: Database story published this week is properly qualified even if created earlier', async () => {
  const currentWeekTimestamp = new Date(Date.now() - 3600 * 1000).toISOString() // 1 hour ago
  const mockDbRows = [
    {
      id: 'db-new-published',
      title: 'Established Draft Published This Week',
      slug: 'established-draft-published-this-week',
      category_name: 'Novels',
      category_slug: 'novels',
      genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
      visibility: 'public',
      status: 'ongoing',
      new_this_week: false, // Old view might have false if created_at was long ago
      collections: [],
      created_at: '2024-01-01T00:00:00.000Z', // Created long ago
      published_at: currentWeekTimestamp, // First published today!
    },
  ]

  const result = await executeGetPlatformWorks({
    queryRows: async () => mockDbRows,
    getAuthState: async () => ({ userId: 'user-1' }),
  })

  assert.equal(result[0].new_this_week, true)
  assert.equal(result[0].collection.includes('new_this_week'), true)
  assert.equal(isWorkNewThisWeek(result[0]), true)
})

// ==============================================================================
// 11. COMBINED DATASET & DEDUPLICATION INVARIANTS
// ==============================================================================
test('Combined Dataset: Real DB stories and mock stories coexist and deduplicate by ID', () => {
  const mockStories = [...WORKS]
  // Create a real DB story with matching ID to 'work-2' (should overwrite mock work-2)
  const realStoryOverwritingMock = createTestStory({
    id: 'work-2',
    title: 'A Winter in Kyoto (Updated from Database)',
    totalReads: '500K',
  })
  // Create a completely new real DB story
  const realNewStory = createTestStory({
    id: 'db-unique-999',
    title: 'A Unique Supabase Masterpiece',
    totalReads: '1.5M',
  })

  // AppContext deduplication simulation
  let combined = [...mockStories]
  const dbBatch = [realStoryOverwritingMock, realNewStory]

  for (const dbW of dbBatch) {
    const idx = combined.findIndex((w) => w.id === dbW.id)
    if (idx >= 0) {
      combined[idx] = { ...combined[idx], ...dbW }
    } else {
      combined.unshift(dbW)
    }
  }

  // Combined length should be 8 mock + 1 new = 9 (no duplicate work-2)
  assert.equal(combined.length, 9)
  const work2Instances = combined.filter((w) => w.id === 'work-2')
  assert.equal(work2Instances.length, 1)
  assert.equal(work2Instances[0].title, 'A Winter in Kyoto (Updated from Database)')

  // Filter and sort over combined dataset
  const filtered = filterAndSortWorks(combined, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  // Highest reads should be 'db-unique-999' with 1.5M reads
  assert.equal(filtered[0].id, 'db-unique-999')
})

// ==============================================================================
// 12. SEARCH & SORT EDGE CASES
// ==============================================================================
test('Search: handles whitespace trimming, case-insensitivity, apostrophes, and diacritics', () => {
  const story1 = createTestStory({
    id: 'story-accent',
    title: 'Café de L\'Étoile',
    author: { id: 'a1', name: 'René O\'Connor', handle: 'rene_writer' },
    synopsis: 'A traveler\'s journey through Paris.',
    tags: ['Historical', 'Traveler\'s Journal'],
  })
  const story2 = createTestStory({
    id: 'story-kyoto',
    title: 'A Winter in Kyōto',
    synopsis: 'Snow falling over ancient temples.',
  })

  // Whitespace trimming
  assert.equal(matchesSearch(story1, '   café   '), true)
  assert.equal(matchesSearch(story1, '   cafe   '), true) // Accent-folded match

  // Diacritic query against plain text
  assert.equal(matchesSearch(story2, 'Kyōto'), true)
  assert.equal(matchesSearch(story2, 'kyoto'), true) // Folded

  // Apostrophe in title, synopsis, author, and tags
  assert.equal(matchesSearch(story1, "L'Étoile"), true)
  assert.equal(matchesSearch(story1, "l'etoile"), true)
  assert.equal(matchesSearch(story1, "O'Connor"), true)
  assert.equal(matchesSearch(story1, "traveler's"), true)
  assert.equal(matchesSearch(story1, 'rene_writer'), true)

  // Empty or whitespace-only search matches everything
  assert.equal(matchesSearch(story1, ''), true)
  assert.equal(matchesSearch(story1, '    '), true)
})

test('Sorting: deterministic tie-breaking on identical metrics', () => {
  const sA = createTestStory({ id: 'work-alpha', totalReads: 100, ratingScore: 4.5 })
  const sB = createTestStory({ id: 'work-beta', totalReads: 100, ratingScore: 4.5 })
  const sC = createTestStory({ id: 'work-gamma', totalReads: 100, ratingScore: 4.5 })

  // Passing array in reverse ID order
  const sorted = filterAndSortWorks([sC, sB, sA], {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: true,
  })

  // Should break tie deterministically by id ascending
  assert.deepEqual(
    sorted.map((s) => s.id),
    ['work-alpha', 'work-beta', 'work-gamma']
  )
})

// ==============================================================================
// 13. FILTER ORDER COMMUTATIVITY & INVARIANCE
// ==============================================================================
test('Filter Invariance: Multi-filter conjunction is commutative', () => {
  const dataset = [
    createTestStory({ id: 's1', categorySlug: 'novels', genreSlug: 'fantasy', status: 'Completed' }),
    createTestStory({ id: 's2', categorySlug: 'novels', genreSlug: 'sci-fi', status: 'Completed' }),
    createTestStory({ id: 's3', categorySlug: 'short-stories', genreSlug: 'fantasy', status: 'Completed' }),
    createTestStory({ id: 's4', categorySlug: 'novels', genreSlug: 'fantasy', status: 'Ongoing' }),
  ]

  // Sequence A: Category -> Genre -> Status
  const stepA1 = dataset.filter((w) => matchesCategory(w, 'novels'))
  const stepA2 = stepA1.filter((w) => matchesGenre(w, 'fantasy'))
  const stepA3 = stepA2.filter((w) => matchesStatus(w, 'Completed'))

  // Sequence B: Status -> Genre -> Category
  const stepB1 = dataset.filter((w) => matchesStatus(w, 'Completed'))
  const stepB2 = stepB1.filter((w) => matchesGenre(w, 'fantasy'))
  const stepB3 = stepB2.filter((w) => matchesCategory(w, 'novels'))

  assert.deepEqual(
    stepA3.map((s) => s.id),
    ['s1']
  )
  assert.deepEqual(
    stepB3.map((s) => s.id),
    ['s1']
  )
  assert.deepEqual(stepA3, stepB3)
})

// ==============================================================================
// 14. INDEPENDENT CORRECTNESS ORACLE VERIFICATION
// ==============================================================================
test('Independent Oracle: Fixed 10-story test fixture produces exact expected output', () => {
  const fixtureStories = [
    createTestStory({
      id: 'fix-1',
      title: 'Echoes of Eternity',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Ongoing',
      publishedAt: '2026-10-14T08:00:00.000Z', // In week
      totalReads: '50K',
      trending: true,
    }),
    createTestStory({
      id: 'fix-2',
      title: 'Neon Shadows',
      categorySlug: 'novels',
      genreSlug: 'cyberpunk',
      status: 'Completed',
      publishedAt: '2026-10-13T10:00:00.000Z', // In week
      totalReads: '120K',
      trending: true,
    }),
    createTestStory({
      id: 'fix-3',
      title: 'Whispers in the Mist',
      categorySlug: 'novels',
      genreSlug: 'mystery',
      status: 'Ongoing',
      publishedAt: '2026-09-01T00:00:00.000Z', // Old
      totalReads: '300K',
      trending: false,
      rising: true,
    }),
    createTestStory({
      id: 'fix-4',
      title: 'The Starlight Navigator',
      categorySlug: 'short-stories',
      genreSlug: 'sci-fi',
      status: 'Completed',
      publishedAt: '2026-08-15T00:00:00.000Z',
      totalReads: '90K',
    }),
    createTestStory({
      id: 'fix-5',
      title: 'Sunken Relics',
      categorySlug: 'novels',
      genreSlug: 'adventure',
      status: 'Ongoing',
      visibility: 'Private', // Should be excluded
      publishedAt: '2026-10-14T00:00:00.000Z',
      totalReads: '1M',
    }),
    createTestStory({
      id: 'fix-6',
      title: 'The Alchemist\'s Secret',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Completed',
      publishedAt: '2026-10-10T00:00:00.000Z', // Prior week
      totalReads: '250K',
    }),
    createTestStory({
      id: 'fix-7',
      title: 'Tales from the Northern Forest',
      categorySlug: 'poetry',
      genreSlug: 'literary-fiction',
      status: 'Ongoing',
      publishedAt: '2026-10-14T09:00:00.000Z', // In week
      totalReads: '10K',
    }),
    createTestStory({
      id: 'fix-8',
      title: 'Clockwork Dreams',
      categorySlug: 'novels',
      genreSlug: 'steampunk',
      status: 'Ongoing',
      publishedAt: null, // Draft - should be excluded
      totalReads: '5K',
    }),
    createTestStory({
      id: 'fix-9',
      title: 'Beyond the Horizon',
      categorySlug: 'novels',
      genreSlug: 'fantasy',
      status: 'Completed',
      publishedAt: '2026-07-01T00:00:00.000Z',
      totalReads: '450K',
      trending: true,
    }),
    createTestStory({
      id: 'fix-10',
      title: 'Midnight Musings',
      categorySlug: 'essays',
      genreSlug: 'philosophy',
      status: 'Completed',
      publishedAt: '2026-10-13T00:00:00.000Z', // In week
      totalReads: '15K',
    }),
  ]

  // Query 1: All public works sorted by popularity
  // Expected: 8 public works (fix-5 private and fix-8 draft excluded)
  // Expected order: fix-9 (450K), fix-3 (300K), fix-6 (250K), fix-2 (120K), fix-4 (90K), fix-1 (50K), fix-10 (15K), fix-7 (10K)
  const q1 = filterAndSortWorks(fixtureStories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })
  assert.deepEqual(
    q1.map((w) => w.id),
    ['fix-9', 'fix-3', 'fix-6', 'fix-2', 'fix-4', 'fix-1', 'fix-10', 'fix-7']
  )

  // Query 2: Tab 'new_this_week', genre 'fantasy'
  // Only fix-1 is new this week and fantasy (fix-6 was prior week, fix-9 was months ago)
  const q2 = filterAndSortWorks(fixtureStories, {
    activeTab: 'new_this_week',
    selectedCategory: 'all',
    selectedGenre: 'fantasy',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })
  assert.deepEqual(
    q2.map((w) => w.id),
    ['fix-1']
  )

  // Query 3: Tab 'completed', category 'novels', sort by popularity
  // Public, Completed, Novels: fix-9 (450K), fix-6 (250K), fix-2 (120K)
  const q3 = filterAndSortWorks(fixtureStories, {
    activeTab: 'completed',
    selectedCategory: 'novels',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })
  assert.deepEqual(
    q3.map((w) => w.id),
    ['fix-9', 'fix-6', 'fix-2']
  )

  // Query 4: Search for "secret", tab 'all'
  // Matches fix-6 ('The Alchemist\'s Secret')
  const q4 = filterAndSortWorks(fixtureStories, {
    activeTab: 'all',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: 'secret',
    sortBy: 'popularity',
    isSignedIn: false,
    nowDate: TEST_NOW,
  })
  assert.deepEqual(
    q4.map((w) => w.id),
    ['fix-6']
  )
})

// ==============================================================================
// 15. TRENDING SEMANTICS & EDITORIAL SEPARATION REGRESSION TESTS
// ==============================================================================

test('Trending Semantics: featured story without trending signal does NOT appear in Trending', () => {
  const featuredOnly = createTestStory({
    id: 'story-featured-only',
    title: 'Staff Spotlight Selection',
    featured: true,
    trending: false,
    collection: ['editor_picks'],
  })

  assert.equal(matchesTab(featuredOnly, 'trending', false), false)

  const res = filterAndSortWorks([featuredOnly], {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })
  assert.equal(res.length, 0)
})

test('Trending Semantics: trending story without featured signal DOES appear in Trending', () => {
  const trendingOnly = createTestStory({
    id: 'story-trending-only',
    title: 'High Velocity Phenomenon',
    featured: false,
    trending: true,
    collection: ['trending_now'],
  })

  assert.equal(matchesTab(trendingOnly, 'trending', false), true)

  const res = filterAndSortWorks([trendingOnly], {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })
  assert.equal(res.length, 1)
  assert.equal(res[0].id, 'story-trending-only')
})

test('Trending Semantics: story with neither signal does NOT appear in Trending', () => {
  const neitherStory = createTestStory({
    id: 'story-standard',
    title: 'Regular Library Work',
    featured: false,
    trending: false,
    collection: [],
  })

  assert.equal(matchesTab(neitherStory, 'trending', false), false)

  const res = filterAndSortWorks([neitherStory], {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })
  assert.equal(res.length, 0)
})

test('Trending Semantics: real database row mapping reflects editorial collections without false Trending qualification', async () => {
  const mockDbRows = [
    {
      id: 'db-work-editor-pick',
      title: 'Curator Staff Favorite',
      status: 'ongoing',
      publication_status: 'published',
      visibility: 'public',
      published_at: '2026-10-01T00:00:00.000Z',
      created_at: '2026-10-01T00:00:00.000Z',
      collections: ['editor_picks'],
      genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
    },
    {
      id: 'db-work-trending',
      title: 'High Engagement Story',
      status: 'ongoing',
      publication_status: 'published',
      visibility: 'public',
      published_at: '2026-10-01T00:00:00.000Z',
      created_at: '2026-10-01T00:00:00.000Z',
      collections: ['trending_now'],
      genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
    },
    {
      id: 'db-work-plain',
      title: 'Plain Published Manuscript',
      status: 'ongoing',
      publication_status: 'published',
      visibility: 'public',
      published_at: '2026-10-01T00:00:00.000Z',
      created_at: '2026-10-01T00:00:00.000Z',
      collections: [],
      genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
    },
  ]

  const mapped = await executeGetPlatformWorks({
    queryRows: async () => mockDbRows,
    getAuthState: async () => ({ userId: 'user-1' }),
  })

  const editorPick = mapped.find((w) => w.id === 'db-work-editor-pick')
  const trendingWork = mapped.find((w) => w.id === 'db-work-trending')
  const plainWork = mapped.find((w) => w.id === 'db-work-plain')

  // 1. Verify editorPick properties
  assert.equal(editorPick.featured, true, 'editor_picks should set featured: true')
  assert.equal(editorPick.trending, false, 'editor_picks without trending_now should have trending: false')
  assert.equal(editorPick.editorPick, true, 'editorPick flag preserved')
  assert.equal(matchesTab(editorPick, 'trending', false), false, 'editorPick must NOT qualify for Trending')

  // 2. Verify trendingWork properties
  assert.equal(trendingWork.featured, false, 'trending_now without editorial picks should have featured: false')
  assert.equal(trendingWork.trending, true, 'trending_now should set trending: true')
  assert.equal(matchesTab(trendingWork, 'trending', false), true, 'trendingWork MUST qualify for Trending')

  // 3. Verify plainWork properties
  assert.equal(plainWork.featured, false, 'plain work must not be featured')
  assert.equal(plainWork.trending, false, 'plain work must not be trending')
  assert.equal(matchesTab(plainWork, 'trending', false), false, 'plain work must NOT qualify for Trending')
})

// ==============================================================================
// 14. SQL AND APPLICATION LEVEL WEEKLY CALCULATION PARITY (MIGRATION 15)
// ==============================================================================

/**
 * JavaScript implementation of PostgreSQL Migration 15 compute_work_collections logic
 * to verify contract parity between database SQL function and application layer.
 */
function simulateSqlComputeWorkCollections(work, nowDate = new Date()) {
  const week = getUtcWeekBoundaries(nowDate)
  const weekStartMs = week.startUtc.getTime()
  const nextWeekStartMs = week.endUtc.getTime()
  const nowMs = nowDate.getTime()

  // Only published works participate in public discovery collections
  if (work.publication_status !== 'published') {
    return {
      new_this_week: false,
      new_chapters_this_week: false,
      collections: [],
    }
  }

  const pubDateMs = work.published_at ? new Date(work.published_at).getTime() : 0
  let isNewThisWeek = false
  let isNewChaptersThisWeek = false
  const collections = Array.isArray(work.curated_collections) ? [...work.curated_collections] : []

  // 1. Check New This Week [week_start, next_week_start) and <= now
  if (work.published_at && pubDateMs >= weekStartMs && pubDateMs < nextWeekStartMs && pubDateMs <= nowMs) {
    isNewThisWeek = true
    isNewChaptersThisWeek = false
    collections.push('new_this_week')
  } else if (work.published_at && pubDateMs < weekStartMs) {
    // 2. Check New Chapters This Week: older work with new chapters published this week
    const hasRecentAct = (work.acts || []).some(
      (a) => a.status === 'published' && new Date(a.created_at).getTime() >= weekStartMs && new Date(a.created_at).getTime() < nextWeekStartMs
    )
    const hasRecentChapter = (work.chapters || []).some(
      (c) =>
        c.status === 'published' &&
        new Date(c.published_at || c.created_at).getTime() >= weekStartMs &&
        new Date(c.published_at || c.created_at).getTime() < nextWeekStartMs
    )
    if (hasRecentAct || hasRecentChapter) {
      isNewChaptersThisWeek = true
      collections.push('new_chapters_this_week')
    }
  }

  return {
    new_this_week: isNewThisWeek,
    new_chapters_this_week: isNewChaptersThisWeek,
    collections,
  }
}

test('SQL & Application Parity: Created this week and published this week', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z') // Wednesday
  const week = getUtcWeekBoundaries(refDate)

  const work = {
    id: 'work-new-created-new-pub',
    title: 'Brand New Story',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: new Date(week.startUtc.getTime() + 3600 * 1000).toISOString(),
    published_at: new Date(week.startUtc.getTime() + 7200 * 1000).toISOString(),
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  // 1. SQL calculation simulation
  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, true)
  assert.ok(sqlRes.collections.includes('new_this_week'))

  // 2. Application executeGetPlatformWorks mapping
  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, true)
  assert.ok(appMapped[0].collection.includes('new_this_week'))

  // 3. Discover filtering function
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), true)
})

test('SQL & Application Parity: Created earlier (draft) but published this week', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate)

  const work = {
    id: 'work-old-draft-new-pub',
    title: 'Story Drafted Months Ago First Published This Week',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-06-01T00:00:00.000Z', // 4 months ago
    published_at: new Date(week.startUtc.getTime() + 3600 * 1000).toISOString(), // Published this week
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, true, 'SQL function must qualify story published this week regardless of created_at')
  assert.ok(sqlRes.collections.includes('new_this_week'))

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, true)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), true)
})

test('SQL & Application Parity: Created this week but still a draft (null published_at)', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate)

  const work = {
    id: 'work-draft-this-week',
    title: 'Manuscript Draft Created Today',
    status: 'ongoing',
    publication_status: 'draft',
    visibility: 'draft',
    created_at: new Date(week.startUtc.getTime() + 3600 * 1000).toISOString(),
    published_at: null, // Draft has null publication timestamp
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, false, 'Draft must NEVER qualify for new_this_week')
  assert.equal(sqlRes.collections.length, 0)

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, false)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), false)
})

test('SQL & Application Parity: Published before this week', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate)

  const work = {
    id: 'work-old-published',
    title: 'Older Published Novel',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-05T00:00:00.000Z', // Published in January
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, false)
  assert.ok(!sqlRes.collections.includes('new_this_week'))

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, false)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), false)
})

test('SQL & Application Parity: Exact UTC week-start boundary', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate) // Monday 00:00:00.000 UTC

  const work = {
    id: 'work-exact-week-start',
    title: 'Story Published at Monday 00:00:00 UTC Exact',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-09-01T00:00:00.000Z',
    published_at: week.startUtc.toISOString(), // Exact start boundary
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, true, 'Exact start boundary must qualify (inclusive)')
  assert.ok(sqlRes.collections.includes('new_this_week'))

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, true)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), true)
})

test('SQL & Application Parity: Exact next-week boundary (exclusive upper bound)', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate) // next Monday 00:00:00.000 UTC

  const work = {
    id: 'work-exact-next-week',
    title: 'Story Published at Next Monday 00:00:00 UTC Exact',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-09-01T00:00:00.000Z',
    published_at: week.endUtc.toISOString(), // Exact exclusive upper bound
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(sqlRes.new_this_week, false, 'Exact next week boundary must NOT qualify (exclusive)')
  assert.ok(!sqlRes.collections.includes('new_this_week'))

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, false)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), false)
})

test('SQL & Application Parity: Republished stories retaining original published_at', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')
  const week = getUtcWeekBoundaries(refDate)

  // Story was first published in January 2026. Author edited & republished it this week.
  // publishWork sets last_published_at = now, but preserves published_at = 2026-01-10!
  const work = {
    id: 'work-republished',
    title: 'Republished Established Story',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-10T00:00:00.000Z', // Original immutable publication timestamp
    last_published_at: new Date(week.startUtc.getTime() + 1000).toISOString(), // Republished this week!
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  assert.equal(
    sqlRes.new_this_week,
    false,
    'Republished story with older published_at must NOT qualify as new_this_week'
  )
  assert.ok(!sqlRes.collections.includes('new_this_week'))

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, false)
  assert.equal(isWorkNewThisWeek(appMapped[0], refDate), false)
})

test('SQL & Application Parity: Published story with null published_at preserves curated editorial collections', async () => {
  const refDate = new Date('2026-10-14T12:00:00.000Z')

  const work = {
    id: 'work-published-null-timestamp',
    title: 'Published Story with Unset Timestamp',
    status: 'ongoing',
    publication_status: 'published',
    visibility: 'public',
    created_at: '2026-01-01T00:00:00.000Z',
    published_at: null, // Legacy row with null published_at
    curated_collections: ['editor_picks', 'spotlight'],
    category_name: 'Novels',
    category_slug: 'novels',
    genres: [{ id: 'g-1', name: 'Literary Fiction', slug: 'literary-fiction' }],
  }

  const sqlRes = simulateSqlComputeWorkCollections(work, refDate)
  // Must NOT qualify for new_this_week
  assert.equal(sqlRes.new_this_week, false)
  assert.ok(!sqlRes.collections.includes('new_this_week'))
  // MUST preserve curated editorial collections
  assert.ok(sqlRes.collections.includes('editor_picks'), 'Curated editor_picks must NOT be stripped')
  assert.ok(sqlRes.collections.includes('spotlight'), 'Curated spotlight must NOT be stripped')

  const appMapped = await executeGetPlatformWorks({
    queryRows: async () => [{ ...work, ...sqlRes }],
    getAuthState: async () => ({ userId: 'user-1' }),
    refDate,
  })
  assert.equal(appMapped[0].new_this_week, false)
  assert.equal(appMapped[0].editorPick, true)
  assert.ok(appMapped[0].collection.includes('editor_picks'))
})





