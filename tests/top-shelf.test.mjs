import test from 'node:test'
import assert from 'node:assert/strict'
import { getTopShelfWorks, isWorkTopShelfEligible } from '../src/lib/recommendations/topShelf.ts'

// ==============================================================================
// HatchPen Top Shelf Test Suite
// ==============================================================================

test('Top Shelf Capacity: Returns at most 10 unique works even if catalog has 50 stories', () => {
  const candidateWorks = Array.from({ length: 30 }, (_, i) => ({
    id: `story-${i + 1}`,
    title: `Story ${i + 1}`,
    visibility: 'Public',
    status: 'Completed',
    publishedChaptersCount: 3,
    totalSaves: 100 - i, // 100, 99, 98...
    likeCount: 50,
    totalReads: '1000',
    publishedAt: '2026-01-01T00:00:00.000Z',
    author: { id: `author-${i}` },
  }))

  const topShelf = getTopShelfWorks(candidateWorks, { limit: 10 })

  // Exactly 10 works
  assert.equal(topShelf.length, 10)

  // Highest saved comes first (100, 99, 98...)
  assert.equal(topShelf[0].id, 'story-1')
  assert.equal(topShelf[9].id, 'story-10')
})

test('Top Shelf Deduplication: Strictly guarantees zero duplicate works in output', () => {
  const candidateWorksWithDuplicates = [
    {
      id: 'story-dup',
      title: 'Duplicate Story',
      visibility: 'Public',
      status: 'Ongoing',
      publishedChaptersCount: 2,
      totalSaves: 500,
      likeCount: 200,
      author: { id: 'auth-1' },
    },
    {
      id: 'story-dup', // Duplicate entry in candidate pool
      title: 'Duplicate Story Clone',
      visibility: 'Public',
      status: 'Ongoing',
      publishedChaptersCount: 2,
      totalSaves: 500,
      likeCount: 200,
      author: { id: 'auth-1' },
    },
    {
      id: 'story-other',
      title: 'Other Story',
      visibility: 'Public',
      status: 'Ongoing',
      publishedChaptersCount: 2,
      totalSaves: 300,
      likeCount: 100,
      author: { id: 'auth-2' },
    },
  ]

  const topShelf = getTopShelfWorks(candidateWorksWithDuplicates, { limit: 10 })

  // Only 2 unique items
  assert.equal(topShelf.length, 2)
  const uniqueIds = new Set(topShelf.map((w) => w.id))
  assert.equal(uniqueIds.size, 2)
  assert.equal(topShelf[0].id, 'story-dup')
  assert.equal(topShelf[1].id, 'story-other')
})

test('Top Shelf Ordering: Total Saves DESC -> Hearts DESC -> Reads DESC', () => {
  const works = [
    {
      id: 'work-low-saves-high-hearts',
      title: 'Story A',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalSaves: 50,
      likeCount: 1000,
      totalReads: '500',
    },
    {
      id: 'work-high-saves',
      title: 'Story B',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalSaves: 200,
      likeCount: 10,
      totalReads: '100',
    },
    {
      id: 'work-equal-saves-more-hearts',
      title: 'Story C',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalSaves: 200,
      likeCount: 50,
      totalReads: '100',
    },
  ]

  const ranked = getTopShelfWorks(works, { limit: 10 })

  assert.equal(ranked.length, 3)
  // Story C (200 saves, 50 hearts) > Story B (200 saves, 10 hearts) > Story A (50 saves)
  assert.equal(ranked[0].id, 'work-equal-saves-more-hearts')
  assert.equal(ranked[1].id, 'work-high-saves')
  assert.equal(ranked[2].id, 'work-low-saves-high-hearts')
})

test('Top Shelf Invariants: Strictly excludes 0 chapters, drafts, private and own stories', () => {
  const works = [
    {
      id: 'work-draft',
      title: 'Draft Novel',
      visibility: 'Public',
      status: 'Draft',
      publishedChaptersCount: 5,
      totalSaves: 999,
    },
    {
      id: 'work-private',
      title: 'Private Novel',
      visibility: 'Private',
      status: 'Completed',
      publishedChaptersCount: 5,
      totalSaves: 999,
    },
    {
      id: 'work-zero-ch',
      title: 'Zero Chapters',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 0,
      totalSaves: 999,
    },
    {
      id: 'work-own',
      title: 'My Own Novel',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 5,
      totalSaves: 999,
      author: { id: 'reader-user-id' },
    },
  ]

  const topShelf = getTopShelfWorks(works, { currentUserId: 'reader-user-id', limit: 10 })
  assert.equal(topShelf.length, 0)
})

test('Top Shelf Cross-Section Co-existence: Stories in Recommended or Trending CAN also freely appear in Top Shelf', () => {
  const popularWork = {
    id: 'story-popular-everywhere',
    title: 'The Great Chronicle',
    visibility: 'Public',
    status: 'Completed',
    publishedChaptersCount: 12,
    totalSaves: 5000,
    likeCount: 2000,
    totalReads: '100000',
    trending: true, // Also Trending
    featured: true, // Also Recommended/Featured
  }

  // Top Shelf does NOT exclude stories that appear in other sections
  const topShelf = getTopShelfWorks([popularWork], { limit: 10 })
  assert.equal(topShelf.length, 1)
  assert.equal(topShelf[0].id, 'story-popular-everywhere')
})

test('Top Shelf Public Visibility: Computes top 10 for unauthenticated public visitors', () => {
  const publicCatalog = Array.from({ length: 15 }, (_, i) => ({
    id: `public-work-${i + 1}`,
    title: `Public Manuscript ${i + 1}`,
    visibility: 'Public',
    status: 'Ongoing',
    publishedChaptersCount: 4,
    totalSaves: 500 - i * 10,
    likeCount: 100 - i,
    totalReads: '5000',
    publishedAt: '2026-05-01T00:00:00.000Z',
    author: { id: `author-${i + 1}`, name: `Author ${i + 1}` },
  }))

  // Public visitor: currentUserId is undefined / null
  const publicTopShelf = getTopShelfWorks(publicCatalog, {
    currentUserId: null,
    currentUserProfileId: null,
    limit: 10,
  })

  // Exactly 10 works returned
  assert.equal(publicTopShelf.length, 10)
  assert.equal(publicTopShelf[0].id, 'public-work-1')
  assert.equal(publicTopShelf[0].totalSaves, 500)
  assert.equal(publicTopShelf[9].id, 'public-work-10')
  assert.equal(publicTopShelf[9].totalSaves, 410)
})

test('Top Shelf Architectural Parity: TopShelfSection integrated in PublicHome and PublicMobileStories', async () => {
  const fs = await import('node:fs')
  
  // 1. Verify TopShelfSection.tsx exists
  const componentContent = fs.readFileSync('src/components/home/TopShelfSection.tsx', 'utf8')
  assert.ok(componentContent.includes('export function TopShelfSection'), 'TopShelfSection must be exported')
  assert.ok(componentContent.includes('getTopShelfWorks'), 'TopShelfSection must consume getTopShelfWorks')

  // 2. Verify Desktop PublicHome integration
  const publicHomeContent = fs.readFileSync('src/components/home/PublicHome.tsx', 'utf8')
  assert.ok(publicHomeContent.includes('TopShelfSection'), 'PublicHome must import TopShelfSection')
  assert.ok(publicHomeContent.includes('<TopShelfSection'), 'PublicHome must render TopShelfSection for desktop public view')

  // 3. Verify Mobile PublicMobileStories integration
  const mobileContent = fs.readFileSync('src/components/PublicMobileStories.tsx', 'utf8')
  assert.ok(mobileContent.includes('TopShelfSection'), 'PublicMobileStories must import TopShelfSection')
  assert.ok(mobileContent.includes('<TopShelfSection'), 'PublicMobileStories must render TopShelfSection for mobile public view')

  // 4. Verify LoggedInHome reuse
  const loggedInContent = fs.readFileSync('src/components/home/LoggedInHome.tsx', 'utf8')
  assert.ok(loggedInContent.includes('TopShelfSection'), 'LoggedInHome must reuse TopShelfSection')
})
