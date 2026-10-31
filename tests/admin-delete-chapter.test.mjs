import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeAdminDeleteChapter,
  generateAdminToken,
} from '../src/server/admin.ts'

test('Admin Chapter Deletion: Rejects calls without valid admin token', async () => {
  await assert.rejects(
    async () => {
      await executeAdminDeleteChapter({
        adminToken: 'invalid-fake-token',
        workId: '00000000-0000-0000-0000-000000000001',
        chapterId: '00000000-0000-0000-0000-000000000002',
      })
    },
    { message: /Unauthorized: Invalid administration key/ }
  )

  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeAdminDeleteChapter({
        adminToken: '',
        workId: '00000000-0000-0000-0000-000000000001',
        chapterId: '00000000-0000-0000-0000-000000000002',
      })
    },
    { message: /Unauthorized: Invalid administration key/ }
  )
})

test('Admin Chapter Deletion: Validates required workId and chapterId', async () => {
  const { token: adminToken } = generateAdminToken()

  await assert.rejects(
    async () => {
      await executeAdminDeleteChapter({
        adminToken,
        workId: '',
        chapterId: '00000000-0000-0000-0000-000000000002',
      })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      await executeAdminDeleteChapter({
        adminToken,
        workId: '00000000-0000-0000-0000-000000000001',
        chapterId: '',
      })
    },
    { message: /Chapter ID is required/ }
  )
})

test('Admin Chapter Deletion: Successfully deletes chapter and recalculates aggregates', async () => {
  const { token: adminToken } = generateAdminToken()
  const workUuid = '11111111-1111-1111-1111-111111111111'
  const chapterUuid = '22222222-2222-2222-2222-222222222222'

  let deletedChapterId = null
  let updatedWorkPayload = null

  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: (fields) => ({
            eq: (f1, v1) => {
              if (f1 === 'id') {
                return {
                  eq: (f2, v2) => ({
                    maybeSingle: async () => ({
                      data: {
                        id: chapterUuid,
                        title: 'Chapter Two: The Descent',
                        chapter_number: 2,
                      },
                      error: null,
                    }),
                  }),
                }
              }
              // remaining chapters query (eq('work_id', workUuid))
              return Promise.resolve({
                data: [
                  { id: 'ch-1', status: 'published', word_count: 1200, reading_time_minutes: 6 },
                  { id: 'ch-3', status: 'draft', word_count: 800, reading_time_minutes: 4 },
                ],
              })
            },
          }),
          delete: () => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => {
                deletedChapterId = v1
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
                data: {
                  publication_status: 'published',
                  visibility: 'public',
                },
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
      throw new Error(`Unexpected table ${table}`)
    },
  }

  const result = await executeAdminDeleteChapter(
    {
      adminToken,
      workId: workUuid,
      chapterId: chapterUuid,
    },
    mockAdmin
  )

  assert.equal(result.success, true)
  assert.equal(result.remainingCount, 2)
  assert.equal(result.publishedCount, 1)
  assert.equal(result.workRevertedToDraft, false)
  assert.equal(result.deletedChapterTitle, 'Chapter Two: The Descent')
  assert.equal(deletedChapterId, chapterUuid)

  assert.equal(updatedWorkPayload.chapter_count, 1)
  assert.equal(updatedWorkPayload.word_count, 2000)
  assert.equal(updatedWorkPayload.reading_time_minutes, 10)
  assert.equal(updatedWorkPayload.last_activity_type, 'work_metadata_updated')
  assert.match(updatedWorkPayload.last_activity_detail.summaryText, /removed by admin/)
})

test('Admin Chapter Deletion: Reverts work to draft when last published chapter is deleted', async () => {
  const { token: adminToken } = generateAdminToken()
  const workUuid = '11111111-1111-1111-1111-111111111111'
  const chapterUuid = '22222222-2222-2222-2222-222222222222'

  let updatedWorkPayload = null

  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: (fields) => ({
            eq: (f1, v1) => {
              if (f1 === 'id') {
                return {
                  eq: (f2, v2) => ({
                    maybeSingle: async () => ({
                      data: {
                        id: chapterUuid,
                        title: 'The Solo Chapter',
                        chapter_number: 1,
                      },
                      error: null,
                    }),
                  }),
                }
              }
              // 0 remaining published chapters
              return Promise.resolve({
                data: [
                  { id: 'ch-draft', status: 'draft', word_count: 500, reading_time_minutes: 3 },
                ],
              })
            },
          }),
          delete: () => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => ({ error: null }),
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  publication_status: 'published',
                  visibility: 'public',
                },
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
      throw new Error(`Unexpected table ${table}`)
    },
  }

  const result = await executeAdminDeleteChapter(
    {
      adminToken,
      workId: workUuid,
      chapterId: chapterUuid,
    },
    mockAdmin
  )

  assert.equal(result.success, true)
  assert.equal(result.remainingCount, 1)
  assert.equal(result.publishedCount, 0)
  assert.equal(result.workRevertedToDraft, true)

  assert.equal(updatedWorkPayload.publication_status, 'draft')
  assert.equal(updatedWorkPayload.visibility, 'draft')
  assert.equal(updatedWorkPayload.is_indexable, false)
})
