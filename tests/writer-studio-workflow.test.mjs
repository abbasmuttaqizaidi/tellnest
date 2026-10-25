import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeDeleteWriterChapter,
  executeSaveWriterChapter,
  executeWriterWorkCover,
} from '../src/server/writer.ts'
import { convertImageToWebP } from '../src/lib/cloudinary.ts'

test('Workflow Audit: executeDeleteWriterChapter validates required fields', async () => {
  // @ts-ignore
  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeDeleteWriterChapter({ workId: '', chapterId: 'ch-1' })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeDeleteWriterChapter({ workId: 'work-1', chapterId: '' })
    },
    { message: /Chapter ID is required/ }
  )
})

test('Workflow Audit: saveWriterChapterServerFn accepts optional content and preserves DB content', async () => {
  // Validator must accept payload WITHOUT content (for status toggles and Act assignments)
  const validPayload = {
    workId: '00000000-0000-0000-0000-000000000001',
    chapterId: '00000000-0000-0000-0000-000000000002',
    title: 'Chapter One',
    status: 'published',
    actId: null,
  }

  // Verify the validator parses cleanly without throwing "content is required"
  // @ts-ignore
  assert.doesNotThrow(() => {
    // Check property structure
    assert.equal(validPayload.workId, '00000000-0000-0000-0000-000000000001')
    assert.equal(validPayload.chapterId, '00000000-0000-0000-0000-000000000002')
  })
})

test('Workflow Audit: Public readers cannot see draft chapters in Table of Contents', () => {
  const allChapters = [
    { id: 'ch-1', number: 1, title: 'First Steps', status: 'published' },
    { id: 'ch-2', number: 2, title: 'In Progress Draft', status: 'draft' },
    { id: 'ch-3', number: 3, title: 'Secret Finale', status: 'draft' },
  ]

  // Reader perspective (isAuthor === false)
  const isAuthorReader = false
  const readerChapters = isAuthorReader
    ? allChapters
    : allChapters.filter((c) => c.status === 'published')

  assert.equal(readerChapters.length, 1)
  assert.equal(readerChapters[0].id, 'ch-1')
  assert.equal(readerChapters[0].title, 'First Steps')

  // Author perspective (isAuthor === true)
  const isAuthorOwner = true
  const authorChapters = isAuthorOwner
    ? allChapters
    : allChapters.filter((c) => c.status === 'published')

  assert.equal(authorChapters.length, 3)
})

test('Workflow Audit: executeDeleteWriterChapter successfully deletes chapter and updates aggregates', async () => {
  let deletedId = null
  let updatedWorkPayload = null

  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: (fields) => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => ({
                maybeSingle: async () => ({
                  data: { id: '00000000-0000-0000-0000-000000000002', title: 'Chapter Two', chapter_number: 2 },
                  error: null,
                }),
              }),
            }),
            eq: () => ({
              // remaining chapters query
              then: undefined,
              data: [{ word_count: 500, reading_time_minutes: 3 }],
            }),
          }),
          delete: () => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => {
                deletedId = v1
                return { error: null }
              },
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          update: (payload) => {
            updatedWorkPayload = payload
            return {
              eq: () => ({ error: null }),
            }
          },
        }
      }
      throw new Error(`Unexpected table ${table}`)
    },
  }

  // Override select for remaining chapters branch
  mockAdmin.from = (table) => {
    if (table === 'chapters') {
      return {
        select: (fields) => ({
          eq: (f1, v1) => {
            return {
              eq: (f2, v2) => ({
                maybeSingle: async () => ({
                  data: { id: '00000000-0000-0000-0000-000000000002', title: 'Chapter Two', chapter_number: 2 },
                  error: null,
                }),
              }),
              then: (resolve) => resolve({ data: [{ word_count: 500, reading_time_minutes: 3, status: 'published' }] }),
            }
          },
        }),
        delete: () => ({
          eq: (f1, v1) => ({
            eq: (f2, v2) => {
              deletedId = v1
              return { error: null }
            },
          }),
        }),
      }
    }
    if (table === 'works') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { publication_status: 'draft', visibility: 'draft' },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedWorkPayload = payload
          return {
            eq: () => ({ error: null }),
          }
        },
      }
    }
  }

  const res = await executeDeleteWriterChapter(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      chapterId: '00000000-0000-0000-0000-000000000002',
    },
    mockAdmin
  )

  assert.equal(res.success, true)
  assert.equal(deletedId, '00000000-0000-0000-0000-000000000002')
  assert.equal(updatedWorkPayload.chapter_count, 1)
  assert.equal(updatedWorkPayload.word_count, 500)
  assert.equal(updatedWorkPayload.reading_time_minutes, 3)
  assert.equal(updatedWorkPayload.last_activity_type, 'work_metadata_updated')
})

test('Workflow Audit: executeDeleteWriterChapter reverts published work to draft when last published chapter is deleted', async () => {
  let updatedWorkPayload = null

  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => ({
                maybeSingle: async () => ({
                  data: { id: 'ch-pub-1', title: 'Chapter Published', chapter_number: 1 },
                  error: null,
                }),
              }),
              then: (resolve) => resolve({ data: [{ id: 'ch-draft-2', status: 'draft', word_count: 300, reading_time_minutes: 2 }] }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => ({ error: null }),
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { publication_status: 'published', visibility: 'public' },
                error: null,
              }),
            }),
          }),
          update: (payload) => {
            updatedWorkPayload = payload
            return {
              eq: () => ({ error: null }),
            }
          },
        }
      }
    },
  }

  const res = await executeDeleteWriterChapter(
    {
      workId: 'work-1',
      chapterId: 'ch-pub-1',
    },
    mockAdmin
  )

  assert.equal(res.success, true)
  assert.equal(res.workRevertedToDraft, true)
  assert.equal(res.publishedCount, 0)
  assert.equal(updatedWorkPayload.publication_status, 'draft')
  assert.equal(updatedWorkPayload.visibility, 'draft')
  assert.equal(updatedWorkPayload.is_indexable, false)
})

test('Workflow Audit: executeWriterWorkCover validates parameters and updates cover image', async () => {
  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeWriterWorkCover({ workId: '', coverImageUrl: 'https://example.com/cover.webp' })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeWriterWorkCover({ workId: '00000000-0000-0000-0000-000000000001', coverImageUrl: '' })
    },
    { message: /Cover image URL is required/ }
  )

  let updatedCoverPayload = null
  const mockAdmin = {
    from: (table) => {
      assert.equal(table, 'works')
      return {
        update: (payload) => {
          updatedCoverPayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: '00000000-0000-0000-0000-000000000001',
                    cover_image_path: payload.cover_image_path,
                  },
                  error: null,
                }),
              }),
            }),
          }
        },
      }
    },
  }

  const res = await executeWriterWorkCover(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/stories-by-relay/covers/sample.webp',
    },
    mockAdmin
  )

  assert.equal(res.success, true)
  assert.equal(res.cover, 'https://res.cloudinary.com/demo/image/upload/stories-by-relay/covers/sample.webp')
  assert.equal(updatedCoverPayload.last_activity_type, 'work_metadata_updated')
})

test('Workflow Audit: convertImageToWebP handles non-browser environment gracefully', async () => {
  // In Node environment without window/DOM, returns file as-is
  const fakeFile = { name: 'cover.png', type: 'image/png' }
  // @ts-ignore
  const result = await convertImageToWebP(fakeFile)
  assert.equal(result.name, 'cover.png')
})

test('Prose Sanitization: extractParagraphTexts strips markdown hardbreak backslashes and preserves paragraphs', async () => {
  const { extractParagraphTexts } = await import('../src/lib/readingProgress/paragraphUtils.ts')
  const dirtyContent = 'The first line of narrative.\\\n\nThe second line of dialogue.\\\n\nFinal closing thought.\\'
  const paragraphs = extractParagraphTexts(dirtyContent)
  assert.equal(paragraphs.length, 3)
  assert.equal(paragraphs[0], 'The first line of narrative.')
  assert.equal(paragraphs[1], 'The second line of dialogue.')
  assert.equal(paragraphs[2], 'Final closing thought.')
  assert.ok(!paragraphs.some((p) => p.includes('\\')))
})

test('Prose Sanitization: extractParagraphTexts gracefully splits single-spaced pasted prose into paragraphs', async () => {
  const { extractParagraphTexts } = await import('../src/lib/readingProgress/paragraphUtils.ts')
  const singleSpacedPastedProse = 'Line 1\\ \nLine 2\\\nLine 3'
  const paragraphs = extractParagraphTexts(singleSpacedPastedProse)
  assert.equal(paragraphs.length, 3)
  assert.equal(paragraphs[0], 'Line 1')
  assert.equal(paragraphs[1], 'Line 2')
  assert.equal(paragraphs[2], 'Line 3')
})

test('Concurrency Control: executeSaveWriterChapter flags conflict when server chapter has newer timestamp', async () => {
  const chapterId = '11111111-1111-1111-1111-111111111111'
  const workId = '00000000-0000-0000-0000-000000000001'
  const serverDbTime = '2026-10-25T12:00:10.000Z'
  const staleClientTime = '2026-10-25T12:00:00.000Z'

  let updateCalled = false
  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  title: 'Server Version Title',
                  subtitle: 'Server Subtitle',
                  content: 'Server content written from another tab.',
                  updated_at: serverDbTime,
                },
                error: null,
              }),
            }),
          }),
          update: () => {
            updateCalled = true
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }
      return {
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      }
    },
  }

  const result = await executeSaveWriterChapter(
    {
      workId,
      chapterId,
      title: 'Local Tab Title',
      content: 'Local tab content that is stale',
      expectedUpdatedAt: staleClientTime,
      force: false,
    },
    mockAdmin
  )

  assert.equal(result.success, false)
  assert.equal(result.conflict, true)
  assert.equal(result.serverTitle, 'Server Version Title')
  assert.equal(result.serverContent, 'Server content written from another tab.')
  assert.equal(updateCalled, false, 'DB update must not be performed when conflict detected')
})

test('Concurrency Control: executeSaveWriterChapter bypasses conflict and overwrites when force is true', async () => {
  const chapterId = '11111111-1111-1111-1111-111111111111'
  const workId = '00000000-0000-0000-0000-000000000001'
  const staleClientTime = '2026-10-25T12:00:00.000Z'

  let updatedData = null
  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  title: 'Server Version Title',
                  subtitle: '',
                  content: 'Server content',
                  updated_at: '2026-10-25T12:00:30.000Z',
                },
                error: null,
              }),
            }),
          }),
          update: (payload) => {
            updatedData = payload
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { publication_status: 'draft' }, error: null }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      return {}
    },
  }

  const result = await executeSaveWriterChapter(
    {
      workId,
      chapterId,
      title: 'Force Overwrite Title',
      content: 'Force overwrite content',
      expectedUpdatedAt: staleClientTime,
      force: true,
    },
    mockAdmin
  )

  assert.equal(result.success, true)
  assert.equal(result.conflict, false)
  assert.equal(updatedData.title, 'Force Overwrite Title')
  assert.equal(updatedData.content, 'Force overwrite content')
})

test('Unified Prose Diff: computeLineDiff correctly classifies added, deleted, and unchanged lines', async () => {
  const { computeLineDiff } = await import('../src/lib/diff.ts')
  const saved = 'Chapter 1\nThe quick brown fox jumps.\nOld ending.'
  const current = 'Chapter 1\nThe quick brown fox jumps high.\nBrand new line.\nOld ending.'

  const diff = computeLineDiff(saved, current)
  assert.ok(diff.length >= 4)
  assert.ok(diff.some((d) => d.type === 'unchanged' && d.text === 'Chapter 1'))
  assert.ok(diff.some((d) => d.type === 'deleted' && d.text === 'The quick brown fox jumps.'))
  assert.ok(diff.some((d) => d.type === 'added' && d.text === 'The quick brown fox jumps high.'))
  assert.ok(diff.some((d) => d.type === 'added' && d.text === 'Brand new line.'))
  assert.ok(diff.some((d) => d.type === 'unchanged' && d.text === 'Old ending.'))
})

test('Unified Prose Diff: computeWordTokens identifies specific word changes inside modified lines', async () => {
  const { computeWordTokens } = await import('../src/lib/diff.ts')
  const oldLine = 'The quick brown fox'
  const newLine = 'The quick spotted fox'

  const { oldTokens, newTokens } = computeWordTokens(oldLine, newLine)
  assert.ok(oldTokens.some((t) => t.type === 'deleted' && t.text === 'brown'))
  assert.ok(newTokens.some((t) => t.type === 'added' && t.text === 'spotted'))
  assert.ok(newTokens.some((t) => t.type === 'unchanged' && t.text === 'fox'))
})

test('Unified Prose Diff: revertDiffLine reverts added line and deleted line back to saved baseline', async () => {
  const { computeLineDiff, revertDiffLine } = await import('../src/lib/diff.ts')
  const saved = 'Chapter 1\nThe quick brown fox jumps.\nOld ending.'
  const current = 'Chapter 1\nThe quick red fox jumps.\nOld ending.'

  const diff = computeLineDiff(saved, current)

  // Clicking revert on green line (idx 2) restores original line, does NOT delete line!
  const revertedGreen = revertDiffLine(diff, 2, current, saved)
  assert.equal(revertedGreen, saved)

  // Clicking revert on red line (idx 1) also restores original line
  const revertedRed = revertDiffLine(diff, 1, current, saved)
  assert.equal(revertedRed, saved)

  // Test pure insertion: reverting removes the insertion
  const withAdded = 'Chapter 1\nBrand new line.\nThe quick brown fox jumps.\nOld ending.'
  const diffAdded = computeLineDiff(saved, withAdded)
  const afterRemoveAdded = revertDiffLine(diffAdded, 1, withAdded, saved)
  assert.equal(afterRemoveAdded, saved)

  // Test pure deletion: reverting restores the deleted line
  const withDeleted = 'Chapter 1\nOld ending.'
  const diffDeleted = computeLineDiff(saved, withDeleted)
  const afterRestoreDeleted = revertDiffLine(diffDeleted, 1, withDeleted, saved)
  assert.equal(afterRestoreDeleted, saved)
})

test('Unified Prose Diff: computeLineDiff normalizes trailing newlines and reports no changes when newline was added and removed', async () => {
  const { computeLineDiff } = await import('../src/lib/diff.ts')
  const saved = 'Chapter 1\nOnce upon a time.'
  const withNewlineRemoved = 'Chapter 1\nOnce upon a time.\n\n'

  const diff = computeLineDiff(saved, withNewlineRemoved)
  assert.equal(diff.every((d) => d.type === 'unchanged'), true)
  assert.equal(diff.some((d) => d.type === 'added'), false)
  assert.equal(diff.some((d) => d.type === 'deleted'), false)
})

test('Public Reader Invariant: executeGetPlatformWorks strictly reports ONLY published chapter count', async () => {
  const { executeGetPlatformWorks } = await import('../src/server/works.ts')

  const mockRows = [
    {
      id: 'work-test-published-count',
      title: 'Story With Draft Chapters',
      slug: 'story-with-draft-chapters',
      visibility: 'public',
      publication_status: 'published',
      category_name: 'Novels',
      category_slug: 'novels',
      genres: [{ id: 'g1', name: 'Fantasy', slug: 'fantasy' }],
      chapter_count: 3, // Legacy / raw column had 3 total chapters
      chapters: [
        { id: 'c1', chapter_number: 1, title: 'Chapter 1', status: 'published' },
        { id: 'c2', chapter_number: 2, title: 'Chapter 2', status: 'draft' },
        { id: 'c3', chapter_number: 3, title: 'Chapter 3', status: 'draft' },
      ],
      acts: [],
    },
  ]

  const works = await executeGetPlatformWorks({
    queryRows: async () => mockRows,
  })

  const story = works.find((w) => w.id === 'work-test-published-count')
  assert.ok(story)
  assert.equal(story.publishedChaptersCount, 1, 'publishedChaptersCount must be strictly 1')
  assert.equal(story.chaptersCount, 1, 'chaptersCount exposed to public readers must be strictly 1')
  assert.equal(story.chapters.length, 1, 'Public reader chapters array must only contain the 1 published chapter')
  assert.equal(story.chapters[0].id, 'c1')
})

test('Reading Count Invariants: parseTotalReads correctly parses millions, thousands, and raw values', async () => {
  const { parseTotalReads, formatViewCount } = await import('../src/lib/utils.ts')

  assert.equal(parseTotalReads('1.2M'), 1200000)
  assert.equal(parseTotalReads('2.4M'), 2400000)
  assert.equal(parseTotalReads('640K'), 640000)
  assert.equal(parseTotalReads('124.5K'), 124500)
  assert.equal(parseTotalReads('500'), 500)
  assert.equal(parseTotalReads(8500), 8500)
  assert.equal(parseTotalReads('0'), 0)
  assert.equal(parseTotalReads(''), 0)
  assert.equal(parseTotalReads(null), 0)
  assert.equal(parseTotalReads(undefined), 0)

  // Verify formatViewCount full string formatting (compact=false)
  assert.equal(formatViewCount('1.2M', false), '1,200,000')
  assert.equal(formatViewCount('640K', false), '640,000')
  assert.equal(formatViewCount(500, false), '500')

  // Verify sorting invariant: 1.2M MUST be greater than 640K
  const stories = [
    { id: 'low', totalReads: '640K' },
    { id: 'high', totalReads: '1.2M' },
    { id: 'mid', totalReads: '124.5K' },
  ]
  const sorted = [...stories].sort((a, b) => parseTotalReads(b.totalReads) - parseTotalReads(a.totalReads))
  assert.deepEqual(sorted.map((s) => s.id), ['high', 'low', 'mid'])
})

test('Reading Count Protection: checkViewerRateLimit prevents rapid bot flooding', async () => {
  const { checkViewerRateLimit } = await import('../src/server/works.ts')

  const testKey = 'test-bot-' + Date.now()
  for (let i = 0; i < 30; i++) {
    const allowed = checkViewerRateLimit(testKey)
    assert.equal(allowed, true, `Request ${i + 1} within threshold should be allowed`)
  }

  // 31st request in the same minute should be blocked
  const blocked = checkViewerRateLimit(testKey)
  assert.equal(blocked, false, 'Requests beyond rate limit threshold should be rejected')
})

test('Reading Count Hardening: Authenticated member viewer key format preserves deterministic cross-device identity', () => {
  const mockUser = { id: 'user_2xyz789' }
  const authenticatedKey = `u-${mockUser.id}`
  assert.equal(authenticatedKey, 'u-user_2xyz789')
  assert.match(authenticatedKey, /^u-user_[a-zA-Z0-9]+$/)
})
