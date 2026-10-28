import test from 'node:test'
import assert from 'node:assert/strict'
import { isWorkBingeable, calculateBingeableReads, getWorkPublishedChapterCount } from '../src/lib/recommendations/bingeable.ts'
import { filterAndOrderNewVoicesStories } from '../src/lib/recommendations/newVoices.ts'

// ==============================================================================
// Adversarial Stress Tests: Breaking Bingeable & New Voices Edge Cases
// ==============================================================================

test('VULNERABILITY 1: NaN / Negative metrics corrupting Sort order', () => {
  const malformedWorks = [
    {
      id: 'work-nan-reads',
      title: 'Corrupted Reads Story',
      genre: 'Fantasy',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalReads: 'corrupted_string_not_a_number',
      totalSaves: -10, // Negative saves
      publishedAt: 'invalid-date-string', // Corrupted date
      author: { id: 'auth-1' },
    },
    {
      id: 'work-valid',
      title: 'Valid Story',
      genre: 'Fantasy',
      visibility: 'Public',
      status: 'Completed',
      publishedChaptersCount: 1,
      totalReads: '500',
      totalSaves: 20,
      publishedAt: '2026-01-01T00:00:00.000Z',
      author: { id: 'auth-2' },
    },
  ]

  const ranked = calculateBingeableReads({
    candidateWorks: malformedWorks,
    userPreferences: { genres: ['Fantasy'] },
  })

  // Both should still be ranked and not throw NaN in sort
  assert.equal(ranked.length, 2)
  assert.equal(ranked[0].id, 'work-valid')
  assert.equal(ranked[1].id, 'work-nan-reads')
})

test('VULNERABILITY 2: Draft chapters disguised under generic chaptersCount', () => {
  // A story with 0 published chapters and 2 draft chapters in `work.chapters`
  const sneakyDraftStory = {
    id: 'work-sneaky',
    title: 'Sneaky Drafts',
    visibility: 'Public',
    status: 'Ongoing',
    chaptersCount: 2, // Says 2 chapters!
    chapters: [
      { id: 'ch-1', status: 'draft' },
      { id: 'ch-2', status: 'draft' },
    ],
    author: { id: 'auth-sneaky' },
  }

  const count = getWorkPublishedChapterCount(sneakyDraftStory)
  // Should detect 0 published chapters!
  assert.equal(count, 0, `Expected 0 published chapters, got ${count}`)
  assert.equal(isWorkBingeable(sneakyDraftStory), false)
})

test('VULNERABILITY 3: New Voices exclusion inconsistency with draft chapters', () => {
  // A story with 2 published chapters and 1 draft chapter (total 3 chapters in array)
  // Published count = 2 -> Should be Bingeable, and MUST BE EXCLUDED from New Voices!
  const story = {
    id: 'story-edge',
    title: 'Edge Story',
    status: 'Published',
    visibility: 'Public',
    publishedChaptersCount: 2,
    chaptersCount: 3,
    chapters: [
      { id: 'c1', status: 'published' },
      { id: 'c2', status: 'published' },
      { id: 'c3', status: 'draft' },
    ],
    publishedAt: '2026-02-01T00:00:00.000Z',
    author: { id: 'writer-1', createdAt: '2026-01-01T00:00:00.000Z' },
  }

  assert.equal(isWorkBingeable(story), true)

  const showcase = filterAndOrderNewVoicesStories([story], null, new Date('2026-02-15T00:00:00.000Z'), { excludeBingeable: true })
  // MUST NOT appear in New Voices!
  assert.equal(showcase.length, 0, 'Bingeable story with 2 published chapters leaked into New Voices!')
})

test('VULNERABILITY 4: String chaptersCount ("1" or "2")', () => {
  const stringCountStory = {
    id: 'story-str',
    title: 'String Count Story',
    visibility: 'Public',
    status: 'Completed',
    publishedChaptersCount: '2', // String from API or JSON
    author: { id: 'auth-str' },
  }

  const count = getWorkPublishedChapterCount(stringCountStory)
  assert.equal(count, 2)
  assert.equal(isWorkBingeable(stringCountStory), true)
})
