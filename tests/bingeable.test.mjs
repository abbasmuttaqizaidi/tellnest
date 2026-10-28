import test from 'node:test'
import assert from 'node:assert/strict'
import { isWorkBingeable, calculateBingeableReads } from '../src/lib/recommendations/bingeable.ts'
import { filterAndOrderNewVoicesStories } from '../src/lib/recommendations/newVoices.ts'

// ==============================================================================
// HatchPen Bingeable Reads Test Suite
// ==============================================================================

test('Bingeable Eligibility: 1 or 2 published chapters qualify for Bingeable Reads', () => {
  const oneChapterStory = {
    id: 'story-1-ch',
    title: 'The Silent Hour',
    visibility: 'Public',
    status: 'Completed',
    publicationStatus: 'published',
    publishedChaptersCount: 1,
    chaptersCount: 1,
  }

  const twoChapterStory = {
    id: 'story-2-ch',
    title: 'Echoes at Dawn',
    visibility: 'Public',
    status: 'Ongoing',
    publicationStatus: 'published',
    publishedChaptersCount: 2,
    chaptersCount: 2,
  }

  assert.equal(isWorkBingeable(oneChapterStory), true)
  assert.equal(isWorkBingeable(twoChapterStory), true)
})

test('Bingeable Eligibility: 3 or more chapters are strictly excluded from Bingeable Reads', () => {
  const threeChapterStory = {
    id: 'story-3-ch',
    title: 'The Cold Perimeter',
    visibility: 'Public',
    status: 'Ongoing',
    publicationStatus: 'published',
    publishedChaptersCount: 3,
    chaptersCount: 3,
  }

  const tenChapterStory = {
    id: 'story-10-ch',
    title: 'Wanderers of the Ash',
    visibility: 'Public',
    status: 'Ongoing',
    publicationStatus: 'published',
    publishedChaptersCount: 10,
    chaptersCount: 10,
  }

  assert.equal(isWorkBingeable(threeChapterStory), false)
  assert.equal(isWorkBingeable(tenChapterStory), false)
})

test('Bingeable Eligibility: 0 chapters, drafts, private, or cancelled stories are excluded', () => {
  const zeroChapterStory = {
    id: 'story-0-ch',
    title: 'Empty Canvas',
    visibility: 'Public',
    status: 'Completed',
    publicationStatus: 'published',
    publishedChaptersCount: 0,
    chaptersCount: 0,
  }

  const draftStory = {
    id: 'story-draft',
    title: 'Draft Notebook',
    visibility: 'Public',
    status: 'Draft',
    publicationStatus: 'draft',
    publishedChaptersCount: 1,
    chaptersCount: 1,
  }

  const unlistedStory = {
    id: 'story-unlisted',
    title: 'Hidden Tale',
    visibility: 'Unlisted',
    status: 'Completed',
    publicationStatus: 'published',
    publishedChaptersCount: 1,
    chaptersCount: 1,
  }

  const cancelledStory = {
    id: 'story-cancelled',
    title: 'Cancelled Novella',
    visibility: 'Public',
    status: 'cancelled',
    publicationStatus: 'published',
    publishedChaptersCount: 2,
    chaptersCount: 2,
  }

  assert.equal(isWorkBingeable(zeroChapterStory), false)
  assert.equal(isWorkBingeable(draftStory), false)
  assert.equal(isWorkBingeable(unlistedStory), false)
  assert.equal(isWorkBingeable(cancelledStory), false)
})

test('New Voices Exclusion: Bingeable stories (<= 2 chapters) NEVER appear in New Voices Showcase', () => {
  const authorCreated = '2024-01-01T00:00:00.000Z'
  const refDate = new Date('2024-02-01T00:00:00.000Z')

  const candidateStories = [
    {
      id: 'story-bingeable-1ch',
      title: 'Bingeable Short (1 ch)',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 1,
      publishedChaptersCount: 1,
      publishedAt: '2024-01-20T00:00:00.000Z',
      author: { id: 'auth-1', name: 'Author One', createdAt: authorCreated },
    },
    {
      id: 'story-bingeable-2ch',
      title: 'Bingeable Arc (2 ch)',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 2,
      publishedChaptersCount: 2,
      publishedAt: '2024-01-21T00:00:00.000Z',
      author: { id: 'auth-2', name: 'Author Two', createdAt: authorCreated },
    },
    {
      id: 'story-serial-4ch',
      title: 'Serial Novel (4 ch)',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 4,
      publishedChaptersCount: 4,
      publishedAt: '2024-01-22T00:00:00.000Z',
      author: { id: 'auth-3', name: 'Author Three', createdAt: authorCreated },
    },
  ]

  // Filter with excludeBingeable: true
  const showcase = filterAndOrderNewVoicesStories(candidateStories, null, refDate, { excludeBingeable: true })

  // Only the 4-chapter serial qualifies for New Voices Showcase
  assert.equal(showcase.length, 1)
  assert.equal(showcase[0].id, 'story-serial-4ch')

  // Both 1-chapter and 2-chapter bingeable stories are strictly excluded
  assert.ok(!showcase.some((s) => s.id === 'story-bingeable-1ch'))
  assert.ok(!showcase.some((s) => s.id === 'story-bingeable-2ch'))
})

test('Bingeable Personalization: Ranks works matching user genre preferences and excludes own works', () => {
  const works = [
    {
      id: 'work-fantasy',
      title: 'The Forest Whisper',
      genre: 'Fantasy',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalReads: '100',
      author: { id: 'other-author' },
    },
    {
      id: 'work-scifi',
      title: 'Station Orbit',
      genre: 'Sci-Fi',
      visibility: 'Public',
      status: 'Ongoing',
      publishedChaptersCount: 2,
      totalReads: '100',
      author: { id: 'other-author-2' },
    },
    {
      id: 'work-own',
      title: 'My Own Novella',
      genre: 'Fantasy',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalReads: '500',
      author: { id: 'user-self' },
    },
  ]

  const ranked = calculateBingeableReads({
    candidateWorks: works,
    userPreferences: { genres: ['Fantasy'] },
    currentUserId: 'user-self',
  })

  // Author's own work is excluded
  assert.ok(!ranked.some((w) => w.id === 'work-own'))

  // Fantasy work is ranked first due to genre preference match + Completed bonus
  assert.equal(ranked.length, 2)
  assert.equal(ranked[0].id, 'work-fantasy')
  assert.equal(ranked[1].id, 'work-scifi')
})
