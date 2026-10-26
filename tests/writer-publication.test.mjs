import test from 'node:test'
import assert from 'node:assert/strict'
import { executeWriterWorkPublication } from '../src/server/writer.ts'

test('Writer Publication: Rejects request with missing workId', async () => {
  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeWriterWorkPublication({
        workId: '',
        publicationStatus: 'published',
        visibility: 'public',
      })
    },
    { message: /Work ID is required/ }
  )
})

test('Writer Publication: Rejects request with missing publicationStatus', async () => {
  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeWriterWorkPublication({
        workId: 'test-work-id',
        visibility: 'public',
      })
    },
    { message: /Publication status is required/ }
  )
})

test('Writer Publication: Rejects request with missing visibility', async () => {
  await assert.rejects(
    async () => {
      // @ts-ignore
      await executeWriterWorkPublication({
        workId: 'test-work-id',
        publicationStatus: 'published',
      })
    },
    { message: /Visibility is required/ }
  )
})

test('Writer Publication: Rejects publication when manuscript has 0 published chapters', async () => {
  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [], // No published chapters
                error: null,
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'work-123', published_at: null, visibility: 'draft', publication_status: 'draft' },
              error: null,
            }),
          }),
        }),
      }
    },
  }

  await assert.rejects(
    async () => {
      await executeWriterWorkPublication(
        {
          workId: 'work-123',
          publicationStatus: 'published',
          visibility: 'public',
        },
        mockAdmin
      )
    },
    { message: /Cannot publish manuscript without at least 1 published chapter/ }
  )
})

test('Writer Publication: Promotes visibility from draft to public when publicationStatus is published', async () => {
  let updatedWorkPayload = null
  let updatedChapterPayload = null
  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({
                data: [{ id: 'ch-1', status: 'published' }],
                error: null,
              }),
            }),
          }),
          update: (payload) => {
            updatedChapterPayload = payload
            return {
              eq: () => ({
                eq: async () => ({ error: null }),
              }),
            }
          },
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'work-123', published_at: null, visibility: 'draft', publication_status: 'draft' },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedWorkPayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'work-123',
                    publication_status: payload.publication_status,
                    visibility: payload.visibility,
                    status: payload.status || 'ongoing',
                    published_at: payload.published_at,
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

  const result = await executeWriterWorkPublication(
    {
      workId: 'work-123',
      publicationStatus: 'published',
      visibility: 'draft',
    },
    mockAdmin
  )

  assert.equal(result.success, true)
  assert.equal(result.publicationStatus, 'published')
  assert.equal(result.visibility, 'public')
  assert.ok(updatedWorkPayload.published_at)
  assert.equal(updatedWorkPayload.is_indexable, true)
  assert.equal(updatedWorkPayload.last_activity_type, 'work_metadata_updated')
  assert.ok(updatedChapterPayload, 'Chapters must be synchronized on work publication')
  assert.equal(updatedChapterPayload.is_indexable, true, 'Published chapters must become indexable')
})

test('Writer Publication: Conceals work when publicationStatus is set to draft', async () => {
  let updatedWorkPayload = null
  let updatedChapterPayload = null
  const mockAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          update: (payload) => {
            updatedChapterPayload = payload
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'work-123', published_at: '2026-10-20T10:00:00Z', visibility: 'public', publication_status: 'published' },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedWorkPayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'work-123',
                    publication_status: payload.publication_status,
                    visibility: payload.visibility,
                    status: 'ongoing',
                    published_at: '2026-10-20T10:00:00Z',
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

  const result = await executeWriterWorkPublication(
    {
      workId: 'work-123',
      publicationStatus: 'draft',
      visibility: 'draft',
    },
    mockAdmin
  )

  assert.equal(result.success, true)
  assert.equal(result.publicationStatus, 'draft')
  assert.equal(result.visibility, 'draft')
  assert.equal(updatedWorkPayload.is_indexable, false)
  assert.equal(updatedWorkPayload.last_activity_type, 'work_metadata_updated')
  assert.ok(updatedChapterPayload, 'Chapters must be updated when work is concealed')
  assert.equal(updatedChapterPayload.is_indexable, false, 'Chapters must become non-indexable when work is concealed')
})
