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
  let updatedPayload = null
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
          updatedPayload = payload
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
  assert.ok(updatedPayload.published_at)
  assert.equal(updatedPayload.is_indexable, true)
  assert.equal(updatedPayload.last_activity_type, 'work_metadata_updated')
})

test('Writer Publication: Conceals work when publicationStatus is set to draft', async () => {
  let updatedPayload = null
  const mockAdmin = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: 'work-123', published_at: '2026-10-20T10:00:00Z', visibility: 'public', publication_status: 'published' },
            error: null,
          }),
        }),
      }),
      update: (payload) => {
        updatedPayload = payload
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
    }),
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
  assert.equal(updatedPayload.is_indexable, false)
  assert.equal(updatedPayload.last_activity_type, 'work_metadata_updated')
})
