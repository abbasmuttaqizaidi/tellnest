import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Resilient chapter resolution algorithm as implemented in ChapterEditorPage
 */
function resolveChapter(work, chapterId) {
  if (!work || !Array.isArray(work.chapters) || work.chapters.length === 0) {
    return null
  }

  // 1. Exact ID match
  const exact = work.chapters.find((c) => c.id === chapterId)
  if (exact) return exact

  // 2. Conventional aliases ('ch-1', 'first', 'default', '1')
  if (chapterId === 'ch-1' || chapterId === 'first' || chapterId === 'default' || chapterId === '1') {
    const ch1 = work.chapters.find((c) => c.number === 1 || c.chapter_number === 1)
    if (ch1) return ch1
    return work.chapters[0]
  }

  // 3. Chapter number fallback
  const match = typeof chapterId === 'string' ? chapterId.match(/\d+/) : null
  if (match) {
    const num = parseInt(match[0], 10)
    const byNum = work.chapters.find((c) => c.number === num || c.chapter_number === num)
    if (byNum) return byNum
  }

  // 4. Default to first draft or first chapter
  return work.chapters.find((c) => c.status === 'draft') || work.chapters[0]
}

/**
 * Drafting Desk chapter ID calculation as implemented in DraftingDesk.tsx
 */
function resolveDeskChapterId(activeWork, activeChapter) {
  return (
    activeChapter?.id ||
    activeWork?.firstChapterId ||
    activeWork?.chapters?.[0]?.id ||
    'first'
  )
}

test('Chapter Resolution: Resolves exact UUID match when requested', () => {
  const work = {
    id: 'work-100',
    title: 'The Alchemist Path',
    chapters: [
      { id: 'uuid-ch-1', number: 1, title: 'Chapter One', status: 'draft' },
      { id: 'uuid-ch-2', number: 2, title: 'Chapter Two', status: 'draft' },
    ],
  }

  const resolved = resolveChapter(work, 'uuid-ch-2')
  assert.equal(resolved?.id, 'uuid-ch-2')
  assert.equal(resolved?.number, 2)
})

test('Chapter Resolution: Gracefully resolves "ch-1" to real Chapter 1 UUID instead of failing', () => {
  const work = {
    id: 'work-101',
    title: 'Echoes of the Sea',
    chapters: [
      { id: 'real-db-uuid-1', number: 1, title: 'Chapter One', status: 'draft' },
    ],
  }

  // Before our fix, searching for 'ch-1' returned undefined, causing "Chapter Not Found"
  const resolved = resolveChapter(work, 'ch-1')
  assert.ok(resolved, 'Must not return null/undefined')
  assert.equal(resolved.id, 'real-db-uuid-1')
  assert.equal(resolved.title, 'Chapter One')
})

test('Chapter Resolution: Gracefully resolves "first" or "default" to initial chapter', () => {
  const work = {
    id: 'work-102',
    title: 'Mountain Pass',
    chapters: [
      { id: 'uuid-alpha', number: 1, title: 'Ascent', status: 'published' },
      { id: 'uuid-beta', number: 2, title: 'Summit', status: 'draft' },
    ],
  }

  const resolvedFirst = resolveChapter(work, 'first')
  assert.equal(resolvedFirst?.id, 'uuid-alpha')

  const resolvedDefault = resolveChapter(work, 'default')
  assert.equal(resolvedDefault?.id, 'uuid-alpha')
})

test('Chapter Resolution: Resolves numeric chapter numbers (e.g. "chapter-2")', () => {
  const work = {
    id: 'work-103',
    title: 'City Lights',
    chapters: [
      { id: 'uuid-ch-1', number: 1, title: 'Dawn' },
      { id: 'uuid-ch-2', number: 2, title: 'Dusk' },
    ],
  }

  const resolved = resolveChapter(work, 'chapter-2')
  assert.equal(resolved?.id, 'uuid-ch-2')
})

test('Chapter Resolution: Unknown ID falls back to active draft chapter or first chapter', () => {
  const work = {
    id: 'work-104',
    title: 'Starlight',
    chapters: [
      { id: 'uuid-published', number: 1, title: 'Start', status: 'published' },
      { id: 'uuid-draft', number: 2, title: 'WIP', status: 'draft' },
    ],
  }

  const resolved = resolveChapter(work, 'non-existent-random-id')
  assert.equal(resolved?.id, 'uuid-draft', 'Should prefer draft chapter')
})

test('Drafting Desk: Prioritizes active chapter UUID over hardcoded "ch-1"', () => {
  const activeWork = {
    id: 'work-200',
    title: 'New Manuscript',
    firstChapterId: 'uuid-1234',
    chapters: [{ id: 'uuid-1234', number: 1, title: 'Chapter One' }],
  }
  const activeChapter = activeWork.chapters[0]

  const deskChapterId = resolveDeskChapterId(activeWork, activeChapter)
  assert.equal(deskChapterId, 'uuid-1234', 'Must link directly to the real chapter UUID')
})

test('Drafting Desk: Falls back to firstChapterId if activeChapter is not yet loaded', () => {
  const activeWork = {
    id: 'work-201',
    title: 'New Manuscript',
    firstChapterId: 'uuid-5678',
  }

  const deskChapterId = resolveDeskChapterId(activeWork, null)
  assert.equal(deskChapterId, 'uuid-5678')
})

test('Act Management: Groups chapters correctly under their corresponding Act', () => {
  const acts = [
    { id: 'act-1', number: 1, title: 'Act I: Awakening' },
    { id: 'act-2', number: 2, title: 'Act II: The Journey' },
  ]
  const chapters = [
    { id: 'ch-1', number: 1, title: 'The Start', actId: 'act-1', wordCount: 1500 },
    { id: 'ch-2', number: 2, title: 'The Call', actId: 'act-1', wordCount: 2200 },
    { id: 'ch-3', number: 3, title: 'Crossing the Boundary', actId: 'act-2', wordCount: 3100 },
  ]

  const act1Chapters = chapters.filter((c) => c.actId === 'act-1')
  const act2Chapters = chapters.filter((c) => c.actId === 'act-2')

  assert.equal(act1Chapters.length, 2)
  assert.equal(act2Chapters.length, 1)

  const act1WordCount = act1Chapters.reduce((acc, c) => acc + c.wordCount, 0)
  const act2WordCount = act2Chapters.reduce((acc, c) => acc + c.wordCount, 0)

  assert.equal(act1WordCount, 3700)
  assert.equal(act2WordCount, 3100)
})

test('Act Management: Next act number calculation properly increments', () => {
  const existingActs = [
    { id: 'act-1', number: 1, title: 'Act I' },
    { id: 'act-2', number: 2, title: 'Act II' },
  ]

  const nextNumber = ((existingActs[existingActs.length - 1]?.number) || 0) + 1
  assert.equal(nextNumber, 3)
})

// ---------------------------------------------------------------------------
// Reader Page: findReaderChapter Semantic Permalinks Resolution Tests
// ---------------------------------------------------------------------------

test('Reader SEO Resolution: findReaderChapter resolves semantic chapter slugs and numbers', async () => {
  const { findReaderChapter } = await import('../src/data/mockData.ts')

  const chapters = [
    { id: 'b56e8901-1111-4000-8000-000000000001', number: 1, slug: 'prologue-the-beginning-a1b2', title: 'Prologue' },
    { id: 'b56e8901-2222-4000-8000-000000000002', number: 2, slug: 'chapter-2-the-descent-c3d4', title: 'The Descent' },
    { id: 'b56e8901-3333-4000-8000-000000000003', number: 3, slug: 'chapter-3-revelations-e5f6', title: 'Revelations' },
  ]

  // 1. Exact ID
  assert.equal(findReaderChapter(chapters, 'b56e8901-2222-4000-8000-000000000002')?.title, 'The Descent')

  // 2. Exact Chapter Slug
  assert.equal(findReaderChapter(chapters, 'prologue-the-beginning-a1b2')?.title, 'Prologue')
  assert.equal(findReaderChapter(chapters, 'chapter-3-revelations-e5f6')?.title, 'Revelations')

  // 3. SEO Permalinks & Aliases ('chapter-1', 'ch-2', '3')
  assert.equal(findReaderChapter(chapters, 'chapter-1')?.title, 'Prologue')
  assert.equal(findReaderChapter(chapters, 'ch-2')?.title, 'The Descent')
  assert.equal(findReaderChapter(chapters, '3')?.title, 'Revelations')
  assert.equal(findReaderChapter(chapters, 'first')?.title, 'Prologue')
  assert.equal(findReaderChapter(chapters, 'default')?.title, 'Prologue')

  // 4. Case-insensitivity
  assert.equal(findReaderChapter(chapters, 'CHAPTER-2')?.title, 'The Descent')
  assert.equal(findReaderChapter(chapters, 'Ch-1')?.title, 'Prologue')
})

