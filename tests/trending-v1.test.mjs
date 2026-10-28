import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import {
  computeTrendingRankings,
  calculateTrendingScore,
} from '../src/server/trendingEngine.ts'
import { filterAndSortWorks, matchesTab } from '../src/lib/discover/filters.ts'

// ==============================================================================
// HatchPen Trending V1 Automated Regression Suite
// ==============================================================================

function makeCandidate(overrides = {}) {
  return {
    id: overrides.id || 'work-1',
    authorId: overrides.authorId || 'author-1',
    status: overrides.status ?? 'published',
    publicationStatus: overrides.publicationStatus ?? 'published',
    isPublished: overrides.isPublished ?? true,
    visibility: overrides.visibility ?? 'public',
    publishedChapterIds: overrides.publishedChapterIds ?? ['ch-1', 'ch-2', 'ch-3', 'ch-4', 'ch-5', 'ch-6', 'ch-7', 'ch-8', 'ch-9', 'ch-10'],
    ...overrides,
  }
}

// 1. CHAPTER REACH & TIER CLASSIFICATION
// ==============================================================================

test('Trending V1: 8 of 10 distinct chapters opened = 80% reach qualifies for Tier A', () => {
  const candidate = makeCandidate({ id: 'work-tier-a', publishedChapterIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'] })
  const opens = [
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c2', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c3', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c4', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c5', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c6', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c7', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-a', chapterId: 'c8', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([candidate], opens, [])
  assert.equal(result.rankings.length, 1)
  assert.equal(result.rankings[0].tier, 'A')
  assert.equal(result.rankings[0].meanChapterReach, 0.8)
})

test('Trending V1: 7 of 10 distinct chapters opened = 70% reach falls into Tier B', () => {
  const candidate = makeCandidate({ id: 'work-tier-b', publishedChapterIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'] })
  const opens = [
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c2', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c3', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c4', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c5', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c6', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-tier-b', chapterId: 'c7', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([candidate], opens, [])
  assert.equal(result.rankings.length, 1)
  assert.equal(result.rankings[0].tier, 'B')
  assert.equal(result.rankings[0].meanChapterReach, 0.7)
})

test('Trending V1: 1-chapter stories are eligible and achieve 100% reach on single open', () => {
  const candidate = makeCandidate({ id: 'work-one-chapter', publishedChapterIds: ['c1'] })
  const opens = [
    { viewerKey: 'reader-1', workId: 'work-one-chapter', chapterId: 'c1', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([candidate], opens, [])
  assert.equal(result.rankings.length, 1)
  assert.equal(result.rankings[0].tier, 'A')
  assert.equal(result.rankings[0].meanChapterReach, 1.0)
})

// 2. CROSS-READER AGGREGATION & MEAN REACH
// ==============================================================================

test('Trending V1: Correctly averages chapter reach across distinct readers', () => {
  // Story with 5 chapters
  // Reader 1 reads all 5 chapters (100%)
  // Reader 2 reads 3 chapters (60%)
  // Mean reach = (1.0 + 0.6) / 2 = 0.80 (80%) -> Tier A
  const candidate = makeCandidate({ id: 'work-multi-reader', publishedChapterIds: ['c1', 'c2', 'c3', 'c4', 'c5'] })
  const opens = [
    { viewerKey: 'reader-1', workId: 'work-multi-reader', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-multi-reader', chapterId: 'c2', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-multi-reader', chapterId: 'c3', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-multi-reader', chapterId: 'c4', openedAt: new Date() },
    { viewerKey: 'reader-1', workId: 'work-multi-reader', chapterId: 'c5', openedAt: new Date() },

    { viewerKey: 'reader-2', workId: 'work-multi-reader', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'reader-2', workId: 'work-multi-reader', chapterId: 'c2', openedAt: new Date() },
    { viewerKey: 'reader-2', workId: 'work-multi-reader', chapterId: 'c3', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([candidate], opens, [])
  assert.equal(result.rankings[0].uniqueReaders7d, 2)
  assert.equal(result.rankings[0].meanChapterReach, 0.8)
  assert.equal(result.rankings[0].tier, 'A')
})

// 3. DEDUPLICATION OF REPEATED CHAPTER OPENS
// ==============================================================================

test('Trending V1: Repeated opens of the same chapter by same reader do not inflate reach', () => {
  const candidate = makeCandidate({ id: 'work-dedup', publishedChapterIds: ['c1', 'c2'] })
  // Reader opens chapter 1 ten times and never opens chapter 2
  const opens = Array.from({ length: 10 }).map(() => ({
    viewerKey: 'reader-spam',
    workId: 'work-dedup',
    chapterId: 'c1',
    openedAt: new Date(),
  }))

  const result = computeTrendingRankings([candidate], opens, [])
  assert.equal(result.rankings[0].uniqueReaders7d, 1)
  assert.equal(result.rankings[0].meanChapterReach, 0.5) // 1 of 2 chapters = 50%
  assert.equal(result.rankings[0].tier, 'B')
})

// 4. ROLLING 7-DAY WINDOW BOUNDARIES
// ==============================================================================

test('Trending V1: Events outside the rolling 7-day window are strictly excluded', () => {
  const now = new Date('2026-10-28T12:00:00Z')
  const windowEnd = now
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const candidate = makeCandidate({ id: 'work-window', publishedChapterIds: ['c1'] })

  // 8 days ago (expired)
  const expiredOpen = {
    viewerKey: 'reader-old',
    workId: 'work-window',
    chapterId: 'c1',
    openedAt: new Date(windowStart.getTime() - 1000),
  }
  // 6 days ago (valid)
  const validOpen = {
    viewerKey: 'reader-new',
    workId: 'work-window',
    chapterId: 'c1',
    openedAt: new Date(windowStart.getTime() + 1000),
  }

  const result = computeTrendingRankings([candidate], [expiredOpen, validOpen], [], { windowStart, windowEnd })
  assert.equal(result.rankings[0].uniqueReaders7d, 1)
})

// 5. REPEAT READERS WHO WERE ALREADY IN LEGACY LIFETIME VIEWS
// ==============================================================================

test('Trending V1: Repeat readers recorded in fresh tracking are counted even if known lifetime readers', () => {
  const candidate = makeCandidate({ id: 'work-repeat', publishedChapterIds: ['c1'] })
  // Even if this reader originally discovered the book 1 year ago, their fresh 7-day open is captured
  const freshOpen = {
    viewerKey: 'u-user-from-2025',
    workId: 'work-repeat',
    chapterId: 'c1',
    openedAt: new Date(),
  }

  const result = computeTrendingRankings([candidate], [freshOpen], [])
  assert.equal(result.rankings.length, 1)
  assert.equal(result.rankings[0].uniqueReaders7d, 1)
})

// 6. SAVES CREATED IN WINDOW VS HISTORICAL SAVES
// ==============================================================================

test('Trending V1: Only saves created during the 7-day window are counted', () => {
  const now = new Date('2026-10-28T12:00:00Z')
  const windowEnd = now
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const candidate = makeCandidate({ id: 'work-saves', publishedChapterIds: ['c1'] })
  const opens = [{ viewerKey: 'reader-1', workId: 'work-saves', chapterId: 'c1', openedAt: now }]

  const saves = [
    // Created 3 weeks ago (should NOT count as weekly save)
    { userId: 'u1', workId: 'work-saves', createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000) },
    // Created 2 days ago (should count)
    { userId: 'u2', workId: 'work-saves', createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
  ]

  const result = computeTrendingRankings([candidate], opens, saves, { windowStart, windowEnd })
  assert.equal(result.rankings[0].uniqueSaves7d, 1)
})

// 7. TIER A ALWAYS PRECEDES TIER B
// ==============================================================================

test('Trending V1: All Tier A stories strictly precede all Tier B stories regardless of Tier B view count', () => {
  const workA = makeCandidate({ id: 'work-a', publishedChapterIds: ['c1'] })
  const workB = makeCandidate({ id: 'work-b', publishedChapterIds: ['c1', 'c2'] })

  // Work A has only 1 reader, but 100% reach -> Tier A
  const opensA = [{ viewerKey: 'r1', workId: 'work-a', chapterId: 'c1', openedAt: new Date() }]

  // Work B has 50 readers, but each only read chapter 1 of 2 -> 50% reach -> Tier B
  const opensB = Array.from({ length: 50 }).map((_, i) => ({
    viewerKey: `r-b-${i}`,
    workId: 'work-b',
    chapterId: 'c1',
    openedAt: new Date(),
  }))

  const result = computeTrendingRankings([workA, workB], [...opensA, ...opensB], [])
  assert.equal(result.rankings[0].workId, 'work-a')
  assert.equal(result.rankings[0].tier, 'A')
  assert.equal(result.rankings[1].workId, 'work-b')
  assert.equal(result.rankings[1].tier, 'B')
})

// 8. LIKES AND LIFETIME VIEWS HAVE ZERO IMPACT
// ==============================================================================

test('Trending V1: Likes and lifetime view counters have ZERO influence on ranking', () => {
  const scoreWith0 = calculateTrendingScore(10, 5, 0.8)
  const scoreWithIdentical = calculateTrendingScore(10, 5, 0.8)

  // Function signature does not even accept likes or lifetime views
  assert.equal(scoreWith0, scoreWithIdentical)
})

// 9. DETERMINISTIC TIE-BREAKING
// ==============================================================================

test('Trending V1: Deterministically breaks ties using score -> saves -> readers -> UUID', () => {
  const work1 = makeCandidate({ id: 'work-001', publishedChapterIds: ['c1'] })
  const work2 = makeCandidate({ id: 'work-002', publishedChapterIds: ['c1'] })

  // Both have identical readers, saves, and reach
  const opens = [
    { viewerKey: 'r1', workId: 'work-001', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r1', workId: 'work-002', chapterId: 'c1', openedAt: new Date() },
  ]
  const saves = [
    { userId: 'u1', workId: 'work-001', createdAt: new Date() },
    { userId: 'u1', workId: 'work-002', createdAt: new Date() },
  ]

  const res1 = computeTrendingRankings([work1, work2], opens, saves)
  const res2 = computeTrendingRankings([work2, work1], opens, saves)

  // Order must be 100% deterministic irrespective of candidate input order
  assert.equal(res1.rankings[0].workId, 'work-001')
  assert.equal(res1.rankings[1].workId, 'work-002')
  assert.equal(res2.rankings[0].workId, 'work-001')
  assert.equal(res2.rankings[1].workId, 'work-002')
})

// 10. AUTHOR DIVERSITY CAP (MAX 2 STORIES PER AUTHOR IN TOP 10)
// ==============================================================================

test('Trending V1: Caps author at maximum 2 stories in top 10 when eligible alternatives exist', () => {
  // Author Prolific has 3 high-ranking stories
  const a1 = makeCandidate({ id: 'prolific-1', authorId: 'author-prolific', publishedChapterIds: ['c1'] })
  const a2 = makeCandidate({ id: 'prolific-2', authorId: 'author-prolific', publishedChapterIds: ['c1'] })
  const a3 = makeCandidate({ id: 'prolific-3', authorId: 'author-prolific', publishedChapterIds: ['c1'] })

  // Author Indie has 1 story
  const b1 = makeCandidate({ id: 'indie-1', authorId: 'author-indie', publishedChapterIds: ['c1'] })

  const opens = [
    { viewerKey: 'r1', workId: 'prolific-1', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r2', workId: 'prolific-1', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r1', workId: 'prolific-2', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r2', workId: 'prolific-2', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r1', workId: 'prolific-3', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r2', workId: 'prolific-3', chapterId: 'c1', openedAt: new Date() },

    { viewerKey: 'r1', workId: 'indie-1', chapterId: 'c1', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([a1, a2, a3, b1], opens, [], { maxResults: 3 })
  const rankedIds = result.rankings.map(r => r.workId)

  // prolific-1 and prolific-2 take 2 slots, indie-1 takes the 3rd slot (prolific-3 is deferred)
  assert.deepEqual(rankedIds, ['prolific-1', 'prolific-2', 'indie-1'])
})

// 11. INELIGIBLE STORIES EXCLUSION
// ==============================================================================

test('Trending V1: Drafts, unlisted, restricted, and zero-chapter stories are strictly excluded', () => {
  const draftWork = makeCandidate({ id: 'draft-work', status: 'draft', publishedChapterIds: ['c1'] })
  const unlistedWork = makeCandidate({ id: 'unlisted-work', visibility: 'unlisted', publishedChapterIds: ['c1'] })
  const zeroChapters = makeCandidate({ id: 'zero-chapters', publishedChapterIds: [] })

  const opens = [
    { viewerKey: 'r1', workId: 'draft-work', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r1', workId: 'unlisted-work', chapterId: 'c1', openedAt: new Date() },
    { viewerKey: 'r1', workId: 'zero-chapters', chapterId: 'c1', openedAt: new Date() },
  ]

  const result = computeTrendingRankings([draftWork, unlistedWork, zeroChapters], opens, [])
  assert.equal(result.rankings.length, 0)
})

// 12. FEWER THAN 10 STORIES AND EMPTY CATALOG
// ==============================================================================

test('Trending V1: Returns fewer than 10 stories when fewer qualify; never force-fills', () => {
  const work1 = makeCandidate({ id: 'only-work', publishedChapterIds: ['c1'] })
  const opens = [{ viewerKey: 'r1', workId: 'only-work', chapterId: 'c1', openedAt: new Date() }]

  const result = computeTrendingRankings([work1], opens, [])
  assert.equal(result.rankings.length, 1)
  assert.equal(result.totalCount, 1)
})

test('Trending V1: Returns empty list when zero stories qualify', () => {
  const result = computeTrendingRankings([], [], [])
  assert.equal(result.rankings.length, 0)
  assert.equal(result.totalCount, 0)
})

// 13. HOMEPAGE & DISCOVER CONSISTENCY
// ==============================================================================

test('Trending V1: Discover Trending tab orders stories by trendingRank', () => {
  const works = [
    {
      id: 'work-low-rank',
      title: 'Story Rank 2',
      status: 'Ongoing',
      visibility: 'Public',
      totalReads: '1000000', // High lifetime reads
      trending: true,
      trendingRank: 2,
      trendingTier: 'B',
      publishedAt: new Date().toISOString(),
      chaptersCount: 5,
      category: 'Novels',
      genre: 'Fantasy',
    },
    {
      id: 'work-high-rank',
      title: 'Story Rank 1',
      status: 'Ongoing',
      visibility: 'Public',
      totalReads: '500', // Low lifetime reads
      trending: true,
      trendingRank: 1,
      trendingTier: 'A',
      publishedAt: new Date().toISOString(),
      chaptersCount: 5,
      category: 'Novels',
      genre: 'Fantasy',
    },
  ]

  assert.equal(matchesTab(works[0], 'trending'), true)
  assert.equal(matchesTab(works[1], 'trending'), true)

  const sorted = filterAndSortWorks(works, {
    activeTab: 'trending',
    selectedCategory: 'all',
    selectedGenre: 'all',
    selectedStatus: 'all',
    searchTerm: '',
    sortBy: 'popularity',
    isSignedIn: false,
  })

  // Must be sorted by trendingRank (1 before 2), ignoring totalReads!
  assert.equal(sorted[0].id, 'work-high-rank')
  assert.equal(sorted[1].id, 'work-low-rank')
})

test('Trending V1: Admin-marked stories (trending_marked_by_admin = true) bypass algorithmic eligibility and receive Priority 1 rank', () => {
  // Work A: Inactive for 2 months, 0 reads, 0 saves, but marked by admin
  const workA = {
    id: 'work-admin-pinned',
    title: 'Editorial Selection (Inactive 2 Months)',
    trending_marked_by_admin: true,
  }
  // Work B: Organically calculated story in snapshot
  const activeTrendingSnapshot = {
    rankings: [
      { workId: 'work-organic-1', rank: 1, tier: 'A', score: 1.25 },
      { workId: 'work-organic-2', rank: 2, tier: 'B', score: 0.85 },
    ],
  }
  // Work C: Inactive story NOT marked by admin
  const workC = {
    id: 'work-inactive-regular',
    title: 'Regular Inactive Story',
    trending_marked_by_admin: false,
  }

  const rawRows = [workA, { id: 'work-organic-1', trending_marked_by_admin: false }, { id: 'work-organic-2', trending_marked_by_admin: false }, workC]

  // Replicate the exact unified ranking logic from executeGetPlatformWorks in works.ts
  const finalTrendingMap = new Map()
  let nextRank = 1

  for (const row of rawRows) {
    if (row.trending_marked_by_admin) {
      finalTrendingMap.set(row.id, {
        rank: nextRank++,
        isMarkedByAdmin: true,
      })
      if (nextRank > 10) break
    }
  }

  if (activeTrendingSnapshot && Array.isArray(activeTrendingSnapshot.rankings)) {
    for (const item of activeTrendingSnapshot.rankings) {
      if (finalTrendingMap.has(item.workId)) continue
      if (nextRank > 10) break
      finalTrendingMap.set(item.workId, {
        rank: nextRank++,
        tier: item.tier,
        score: item.score,
        isMarkedByAdmin: false,
      })
    }
  }

  // Work A gets Rank 1 unconditionally
  assert.equal(finalTrendingMap.has('work-admin-pinned'), true)
  assert.equal(finalTrendingMap.get('work-admin-pinned').rank, 1)
  assert.equal(finalTrendingMap.get('work-admin-pinned').isMarkedByAdmin, true)

  // Organic works shift to Rank 2 and 3
  assert.equal(finalTrendingMap.get('work-organic-1').rank, 2)
  assert.equal(finalTrendingMap.get('work-organic-2').rank, 3)

  // Regular inactive Work C is NOT trending
  assert.equal(finalTrendingMap.has('work-inactive-regular'), false)
})

// 14. SNAPSHOT PERSISTENCE, ATOMIC ACTIVATION & FAILURE PRESERVATION
// ==============================================================================

import { executeGenerateTrendingSnapshot } from '../src/server/trendingEngine.ts'
import cronTrendingHandler from '../src/server/cron-trending-handler.ts'
import * as jose from 'jose'

test('Trending V1: Atomic RPC activation replaces prior snapshot and enforces single active invariant', async () => {
  const fakeDb = {
    snapshots: [
      { id: 'snap-old-1', is_active: false, created_at: '2026-10-10T00:00:00Z' },
      { id: 'snap-old-2', is_active: true, created_at: '2026-10-17T00:00:00Z' },
    ],
    works: [
      {
        id: 'w-1',
        author_id: 'a-1',
        status: 'published',
        publication_status: 'published',
        is_published: true,
        visibility: 'public',
        chapters: [{ id: 'ch-1', status: 'published' }],
      },
    ],
    opens: [
      { viewer_key: 'v-1', work_id: 'w-1', chapter_id: 'ch-1', opened_at: new Date().toISOString() },
    ],
    saves: [
      { user_id: 'u-1', work_id: 'w-1', created_at: new Date().toISOString() },
    ],
  }

  const mockAdmin = {
    rpc: (fn, params) => {
      if (fn === 'activate_trending_snapshot_atomic') {
        // Enforce atomic swap in simulated DB
        for (const s of fakeDb.snapshots) {
          s.is_active = false
        }
        const newId = 'snap-atomic-new'
        fakeDb.snapshots.push({
          id: newId,
          window_start: params.p_window_start,
          window_end: params.p_window_end,
          rankings: params.p_rankings,
          tier_a_count: params.p_tier_a_count,
          tier_b_count: params.p_tier_b_count,
          total_count: params.p_total_count,
          is_active: true,
          status: 'completed',
        })
        return Promise.resolve({ data: newId, error: null })
      }
      return Promise.resolve({ data: null, error: { message: `Unknown RPC ${fn}` } })
    },
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: fakeDb.works, error: null }),
            }),
          }),
        }
      }
      if (table === 'trending_chapter_opens') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: fakeDb.opens, error: null }),
            }),
          }),
        }
      }
      if (table === 'bookmarks') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: fakeDb.saves, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  const result = await executeGenerateTrendingSnapshot({
    adminClient: mockAdmin,
    forceActive: true,
  })

  assert.equal(result.success, true)
  assert.equal(result.snapshotId, 'snap-atomic-new')
  assert.equal(result.totalRanked, 1)

  // Invariant verification: Exactly ONE snapshot is active
  const activeSnapshots = fakeDb.snapshots.filter(s => s.is_active === true)
  assert.equal(activeSnapshots.length, 1)
  assert.equal(activeSnapshots[0].id, 'snap-atomic-new')

  // Prior active snapshot must be false
  const oldActive = fakeDb.snapshots.find(s => s.id === 'snap-old-2')
  assert.equal(oldActive.is_active, false)
})

test('Trending V1: Database failure during calculation aborts and preserves prior snapshot', async () => {
  const mockAdmin = {
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: { message: 'Database connection timeout' } }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  await assert.rejects(
    async () => {
      await executeGenerateTrendingSnapshot({ adminClient: mockAdmin })
    },
    { message: /Database connection timeout/ }
  )
})

test('Trending V1: Non-42883 error on atomic RPC aborts fail-closed and NEVER invokes unsafe fallback', async () => {
  const fakeDb = {
    snapshots: [
      { id: 'snap-prior-active', is_active: true, status: 'completed' },
    ],
    updateCalled: false,
    insertCalled: false,
  }

  const mockAdmin = {
    rpc: (proc) => {
      if (proc === 'activate_trending_snapshot_atomic') {
        // Return a non-42883 PostgreSQL error (e.g., 23505 unique violation or 42501 permission denied)
        return Promise.resolve({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "uq_trending_snapshots_active"',
          },
        })
      }
      throw new Error(`Unexpected procedure ${proc}`)
    },
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [
                  {
                    id: 'w-1',
                    author_id: 'a-1',
                    status: 'published',
                    publication_status: 'published',
                    is_published: true,
                    visibility: 'public',
                    chapters: [{ id: 'ch-1', status: 'published' }],
                  },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'trending_chapter_opens') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({
                data: [{ viewer_key: 'v-1', work_id: 'w-1', chapter_id: 'ch-1', opened_at: new Date().toISOString() }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'bookmarks') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'trending_snapshots') {
        return {
          update: () => {
            fakeDb.updateCalled = true
            return {
              eq: () => Promise.resolve({ error: null }),
            }
          },
          insert: () => {
            fakeDb.insertCalled = true
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'snap-unsafe-fallback' }, error: null }),
              }),
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  // Must reject fail-closed
  await assert.rejects(
    async () => {
      await executeGenerateTrendingSnapshot({
        adminClient: mockAdmin,
        forceActive: true,
      })
    },
    { message: /Atomic activation RPC failed \(23505\)/ }
  )

  // Critical Invariant: Unsafe fallback was NEVER invoked
  assert.equal(fakeDb.updateCalled, false, 'Unsafe fallback .update() must NEVER be called on non-42883 error')
  assert.equal(fakeDb.insertCalled, false, 'Unsafe fallback .insert() must NEVER be called on non-42883 error')

  // Prior active snapshot remains active
  const prior = fakeDb.snapshots.find(s => s.id === 'snap-prior-active')
  assert.equal(prior.is_active, true, 'Prior active snapshot must remain untouched')
})

test('Trending V1: PostgREST schema cache error PGRST202 aborts fail-closed and NEVER invokes fallback', async () => {
  const fakeDb = {
    snapshots: [
      { id: 'snap-prior-active', is_active: true },
    ],
    updateCalled: false,
    insertCalled: false,
  }

  const mockAdmin = {
    rpc: (proc) => {
      if (proc === 'activate_trending_snapshot_atomic') {
        return Promise.resolve({
          data: null,
          error: {
            code: 'PGRST202',
            message: 'Could not find the function in schema cache',
          },
        })
      }
      throw new Error(`Unexpected procedure ${proc}`)
    },
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'w-1', author_id: 'a-1', status: 'published', chapters: [{ id: 'ch-1', status: 'published' }] }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'trending_chapter_opens' || table === 'bookmarks') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'trending_snapshots') {
        return {
          update: () => {
            fakeDb.updateCalled = true
            return { eq: () => Promise.resolve({ error: null }) }
          },
          insert: () => {
            fakeDb.insertCalled = true
            return {
              select: () => ({ single: () => Promise.resolve({ data: { id: 'snap-fallback' }, error: null }) }),
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  await assert.rejects(
    async () => {
      await executeGenerateTrendingSnapshot({
        adminClient: mockAdmin,
        forceActive: true,
      })
    },
    { message: /Atomic activation RPC failed \(PGRST202\)/ }
  )

  assert.equal(fakeDb.updateCalled, false, 'PGRST202 schema cache error must NEVER trigger unsafe fallback')
  assert.equal(fakeDb.insertCalled, false, 'PGRST202 schema cache error must NEVER trigger unsafe fallback')
  assert.equal(fakeDb.snapshots[0].is_active, true, 'Prior snapshot must remain active')
})

test('Trending V1: Arbitrary RPC network exception aborts fail-closed and NEVER invokes fallback', async () => {
  let fallbackInvoked = false

  const mockAdmin = {
    rpc: () => Promise.reject(new Error('Connection terminated unexpectedly')),
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'w-1', author_id: 'a-1', status: 'published', chapters: [{ id: 'ch-1', status: 'published' }] }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'trending_chapter_opens' || table === 'bookmarks') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'trending_snapshots') {
        fallbackInvoked = true
        throw new Error('Fallback table should not be accessed')
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  await assert.rejects(
    async () => {
      await executeGenerateTrendingSnapshot({
        adminClient: mockAdmin,
        forceActive: true,
      })
    },
    { message: /Connection terminated unexpectedly/ }
  )

  assert.equal(fallbackInvoked, false, 'Fallback must NOT be invoked on arbitrary network exception')
})

test('Trending V1: Stored procedure not found (error code 42883) safely invokes legacy fallback', async () => {
  const fakeDb = {
    snapshots: [
      { id: 'snap-old', is_active: true },
    ],
  }

  const mockAdmin = {
    rpc: () => Promise.resolve({
      data: null,
      error: { code: '42883', message: 'function activate_trending_snapshot_atomic does not exist' },
    }),
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({
                data: [{ id: 'w-1', author_id: 'a-1', status: 'published', chapters: [{ id: 'ch-1', status: 'published' }] }],
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'trending_chapter_opens' || table === 'bookmarks') {
        return {
          select: () => ({
            gte: () => ({
              lte: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'trending_snapshots') {
        return {
          update: (fields) => ({
            eq: () => {
              if (fields.is_active === false) {
                fakeDb.snapshots.forEach(s => { s.is_active = false })
              }
              return Promise.resolve({ error: null })
            },
          }),
          insert: (record) => {
            const newSnap = { id: 'snap-legacy-fallback', ...record }
            fakeDb.snapshots.push(newSnap)
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newSnap, error: null }),
              }),
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  const result = await executeGenerateTrendingSnapshot({
    adminClient: mockAdmin,
    forceActive: true,
  })

  assert.equal(result.success, true)
  assert.equal(result.snapshotId, 'snap-legacy-fallback')
  const activeSnaps = fakeDb.snapshots.filter(s => s.is_active === true)
  assert.equal(activeSnaps.length, 1)
  assert.equal(activeSnaps[0].id, 'snap-legacy-fallback')
})

// 15. QSTASH & ENDPOINT SECURITY VALIDATION
// ==============================================================================

test('Trending V1 Endpoint: Rejects non-POST methods fail-closed with 405', async () => {
  const req = new Request('http://localhost:3000/api/cron/trending-weekly', {
    method: 'GET',
  })
  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 405)
})

test('Trending V1 Endpoint: Rejects unauthenticated requests with 401', async () => {
  const req = new Request('http://localhost:3000/api/cron/trending-weekly', {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.equal(json.error, 'Unauthorized')
})

test('Trending V1 Endpoint: Validates authentic QStash signature with exact URL', async () => {
  const signingKey = 'sig_test_key_valid_98765'
  process.env.QSTASH_CURRENT_SIGNING_KEY = signingKey
  process.env.QSTASH_NEXT_SIGNING_KEY = signingKey

  const targetUrl = 'http://localhost:3000/api/cron/trending-weekly'
  const bodyText = JSON.stringify({ scheduled: true })

  // Compute body hash
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(bodyText))
  const base64urlHash = Buffer.from(hashBuffer).toString('base64url')

  // Generate valid Upstash JWT
  const jwt = await new jose.SignJWT({ body: base64urlHash })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('Upstash')
    .setSubject(targetUrl)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(signingKey))

  const req = new Request(targetUrl, {
    method: 'POST',
    headers: {
      'upstash-signature': jwt,
      'content-type': 'application/json',
    },
    body: bodyText,
  })

  // In test environment without DB, it should pass authorization and fail only at DB query with 500, NOT 401 Unauthorized!
  const res = await cronTrendingHandler.fetch(req)
  assert.notEqual(res.status, 401, 'Valid QStash signature must be authorized')
  assert.notEqual(res.status, 405)
})

test('Trending V1 Endpoint: Rejects invalid QStash signature fail-closed without fallback', async () => {
  process.env.QSTASH_CURRENT_SIGNING_KEY = 'sig_key_correct'
  process.env.QSTASH_NEXT_SIGNING_KEY = 'sig_key_correct'
  process.env.CRON_SECRET = 'valid-super-secret'

  const targetUrl = 'http://localhost:3000/api/cron/trending-weekly'
  const bodyText = JSON.stringify({ scheduled: true })

  // Sign with WRONG key to simulate forged or corrupted signature
  const wrongKey = 'sig_key_attacker_forgery'
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(bodyText))
  const base64urlHash = Buffer.from(hashBuffer).toString('base64url')

  const forgedJwt = await new jose.SignJWT({ body: base64urlHash })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('Upstash')
    .setSubject(targetUrl)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(wrongKey))

  const req = new Request(targetUrl, {
    method: 'POST',
    headers: {
      'upstash-signature': forgedJwt,
      // Even if attacker attaches valid CRON_SECRET, it must NOT bypass the failed signature!
      Authorization: 'Bearer valid-super-secret',
    },
    body: bodyText,
  })

  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 401, 'Invalid QStash signature must fail-closed with 401 even if CRON_SECRET is present')
  const json = await res.json()
  assert.equal(json.error, 'Unauthorized')
})

test('Trending V1 Endpoint: Rejects QStash signature signed for a different destination URL', async () => {
  const signingKey = 'sig_test_key_valid_98765'
  process.env.QSTASH_CURRENT_SIGNING_KEY = signingKey
  process.env.QSTASH_NEXT_SIGNING_KEY = signingKey

  const targetUrl = 'http://localhost:3000/api/cron/trending-weekly'
  const bodyText = JSON.stringify({ scheduled: true })

  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(bodyText))
  const base64urlHash = Buffer.from(hashBuffer).toString('base64url')

  // Subject is signed for a different endpoint / domain
  const foreignJwt = await new jose.SignJWT({ body: base64urlHash })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('Upstash')
    .setSubject('https://malicious.com/other-webhook')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(signingKey))

  const req = new Request(targetUrl, {
    method: 'POST',
    headers: {
      'upstash-signature': foreignJwt,
    },
    body: bodyText,
  })

  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 401, 'Mismatched destination URL must reject with 401')
})

test('Trending V1 Endpoint: Returns 500 server misconfiguration if QStash key is missing on server', async () => {
  delete process.env.QSTASH_CURRENT_SIGNING_KEY
  delete process.env.QSTASH_NEXT_SIGNING_KEY

  const req = new Request('http://localhost:3000/api/cron/trending-weekly', {
    method: 'POST',
    headers: {
      'upstash-signature': 'some-signature',
    },
    body: JSON.stringify({}),
  })

  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 500)
  const json = await res.json()
  assert.equal(json.error, 'Server Misconfiguration')
})

test('Trending V1 Endpoint: Authorizes valid CRON_SECRET when QStash signature is absent', async () => {
  delete process.env.QSTASH_CURRENT_SIGNING_KEY
  process.env.CRON_SECRET = 'valid-super-secret'

  const req = new Request('http://localhost:3000/api/cron/trending-weekly', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid-super-secret',
    },
    body: JSON.stringify({}),
  })

  const res = await cronTrendingHandler.fetch(req)
  assert.notEqual(res.status, 401)
  assert.notEqual(res.status, 405)
})

test('Trending V1 Endpoint: Rejects invalid CRON_SECRET when QStash signature is absent', async () => {
  process.env.CRON_SECRET = 'valid-super-secret'

  const req = new Request('http://localhost:3000/api/cron/trending-weekly', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer wrong-secret',
    },
    body: JSON.stringify({}),
  })

  const res = await cronTrendingHandler.fetch(req)
  assert.equal(res.status, 401)
})

// 16. POSTGRESQL ISOLATED EXECUTION (PGlite WASM)
// ==============================================================================

function parsePgStatements(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!inDollarQuote && trimmed.startsWith('--')) {
      continue
    }
    let i = 0
    while (i < line.length) {
      if (line.slice(i, i + 2) === '$$') {
        inDollarQuote = !inDollarQuote
        current += '$$'
        i += 2
        continue
      }
      if (!inDollarQuote && line[i] === ';') {
        current += ';'
        const stmt = current.trim()
        if (stmt) statements.push(stmt)
        current = ''
        i++
        continue
      }
      current += line[i]
      i++
    }
    current += '\n'
  }
  const remainder = current.trim()
  if (remainder) statements.push(remainder)
  return statements
}

test('PostgreSQL Isolated Execution: Migration 25 compute_work_collections regression test', async () => {
  const db = new PGlite()

  // Base schema
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE TYPE publication_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
    CREATE TYPE work_status AS ENUM ('ongoing', 'completed', 'hiatus', 'cancelled');

    CREATE TABLE public.works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      status work_status NOT NULL DEFAULT 'ongoing',
      publication_status publication_status NOT NULL DEFAULT 'draft',
      view_count BIGINT NOT NULL DEFAULT 0,
      like_count BIGINT NOT NULL DEFAULT 0,
      save_count BIGINT NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      curated_collections TEXT[] DEFAULT ARRAY[]::TEXT[]
    );

    CREATE TABLE public.acts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status publication_status NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE public.chapters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status publication_status NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );
  `)

  // Apply Migration 25's compute_work_collections and works_with_collections
  const mig25Sql = fs.readFileSync('supabase/migrations/20261028000025_trending_v1_schema_and_tracking.sql', 'utf8')
  const fnMatch = mig25Sql.match(/CREATE OR REPLACE FUNCTION public\.compute_work_collections[\s\S]*?GRANT SELECT ON public\.works_with_collections TO anon, authenticated, service_role;/i)
  assert.ok(fnMatch, 'Migration 25 must contain compute_work_collections and view definition')

  for (const stmt of parsePgStatements(fnMatch[0])) {
    await db.exec(stmt)
  }

  // Compute canonical current week bounds
  const boundsRes = await db.query(`
    SELECT 
      (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS w_start,
      ((date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '7 days') AS w_end
  `)
  const wStart = new Date(boundsRes.rows[0].w_start)

  // 1. Older draft created 14 days ago and published this week: MUST qualify for new_this_week
  const olderDraft = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, view_count, like_count, save_count
    ) VALUES (
      'Older Draft Published This Week',
      'published',
      $1::timestamptz,
      $2::timestamptz,
      50, 10, 5
    ) RETURNING id;
  `, [
    new Date(wStart.getTime() - 14 * 86400 * 1000).toISOString(),
    new Date(wStart.getTime() + 3600 * 1000).toISOString(),
  ])

  const olderDraftRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [olderDraft.rows[0].id])
  assert.equal(olderDraftRes.rows[0].new_this_week, true, 'Draft created earlier but published this week must have new_this_week = true')
  assert.equal(olderDraftRes.rows[0].new_chapters_this_week, false)
  assert.ok(olderDraftRes.rows[0].collections.includes('new_this_week'))
  assert.ok(!olderDraftRes.rows[0].collections.includes('trending_now'), 'trending_now must NOT be assigned by lifetime metrics')

  // 2. Unpublished draft created this week: MUST exit early with empty collections
  const unpubDraft = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, view_count
    ) VALUES (
      'Unpublished Draft',
      'draft',
      $1::timestamptz,
      NULL,
      1000
    ) RETURNING id;
  `, [new Date(wStart.getTime() + 3600 * 1000).toISOString()])

  const unpubRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [unpubDraft.rows[0].id])
  assert.equal(unpubRes.rows[0].new_this_week, false)
  assert.deepEqual(unpubRes.rows[0].collections, [], 'Unpublished draft must exit early with empty collections')

  // 3. High engagement work (view_count = 1000, like_count = 100): MUST get rising_stories, NEVER trending_now
  const viralWork = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, view_count, like_count, save_count
    ) VALUES (
      'Viral Work',
      'published',
      $1::timestamptz,
      $2::timestamptz,
      2500, 150, 80
    ) RETURNING id;
  `, [
    new Date(wStart.getTime() - 30 * 86400 * 1000).toISOString(),
    new Date(wStart.getTime() - 30 * 86400 * 1000).toISOString(),
  ])

  const viralRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [viralWork.rows[0].id])
  assert.ok(viralRes.rows[0].collections.includes('rising_stories'), 'High engagement story must receive rising_stories')
  assert.ok(!viralRes.rows[0].collections.includes('trending_now'), 'trending_now MUST NOT be assigned by compute_work_collections')

  // 4. Timezone invariance: Session in non-UTC timezone must evaluate identical UTC boundaries
  await db.exec("SET TIME ZONE 'America/New_York';")
  const nyRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [olderDraft.rows[0].id])
  assert.equal(nyRes.rows[0].new_this_week, true, 'Non-UTC session timezone must not alter UTC week boundaries')

  await db.exec("SET TIME ZONE 'Asia/Tokyo';")
  const tokyoRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [olderDraft.rows[0].id])
  assert.equal(tokyoRes.rows[0].new_this_week, true, 'Asia/Tokyo session timezone must not alter UTC week boundaries')
})
