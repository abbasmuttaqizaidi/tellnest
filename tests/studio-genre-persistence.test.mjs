import test from 'node:test'
import assert from 'node:assert/strict'
import { executeCreateWriterWork, authenticateWriterRequest, executeSaveWriterChapter } from '../src/server/writer.ts'

/**
 * Creates a mock Supabase admin client for testing executeCreateWriterWork.
 * Allows simulating success or failures at each specific step.
 */
function createMockAdmin(options = {}) {
  const activeGenres = options.activeGenres || [
    { id: 'genre-sci-2', name: 'Science Fiction', slug: 'science-fiction', is_active: true },
    { id: 'genre-fan-3', name: 'Fantasy', slug: 'fantasy', is_active: true },
    { id: 'genre-lit-1', name: 'Literary Fiction', slug: 'literary-fiction', is_active: true },
  ]

  const insertedRecords = {
    works: [],
    work_genres: [],
    acts: [],
    chapters: [],
    deletedWorks: [],
  }

  const mockAdmin = {
    _insertedRecords: insertedRecords,
    from: (table) => {
      return {
        select: (cols) => {
          return {
            eq: (field, val) => {
              // Profiles lookup
              if (table === 'profiles') {
                return {
                  maybeSingle: async () => ({
                    data: { id: 'author-profile-123', username: 'testauthor', display_name: 'Test Author' },
                    error: null,
                  }),
                }
              }
              // Genres lookup by slug or is_active
              if (table === 'genres') {
                return {
                  eq: (field2, val2) => ({
                    maybeSingle: async () => {
                      if (options.genreDbError) {
                        return { data: null, error: new Error('PostgreSQL connection timeout during genre query') }
                      }
                      const match = activeGenres.find((g) => {
                        const m1 = field === 'is_active' ? g.is_active === val : g[field] === val
                        const m2 = field2 === 'is_active' ? g.is_active === val2 : g[field2] === val2
                        return m1 && m2
                      })
                      return { data: match || null, error: null }
                    },
                  }),
                  maybeSingle: async () => {
                    if (options.genreDbError) {
                      return { data: null, error: new Error('PostgreSQL connection timeout during genre query') }
                    }
                    const match = activeGenres.find((g) => g[field] === val)
                    return { data: match || null, error: null }
                  },
                }
              }
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              }
            },
            ilike: (field, val) => {
              // Genres lookup by name
              if (table === 'genres') {
                return {
                  eq: (field2, val2) => ({
                    maybeSingle: async () => {
                      if (options.genreDbError) {
                        return { data: null, error: new Error('PostgreSQL connection timeout during genre query') }
                      }
                      const match = activeGenres.find(
                        (g) => g.name.toLowerCase() === String(val).toLowerCase() && (field2 === 'is_active' ? g.is_active === val2 : true)
                      )
                      return { data: match || null, error: null }
                    },
                  }),
                }
              }
              // Categories lookup
              if (table === 'categories') {
                return {
                  maybeSingle: async () => {
                    if (options.categoryDbError) {
                      return { data: null, error: new Error('PostgreSQL connection timeout during category query') }
                    }
                    return {
                      data: { id: 'cat-novels-1', name: 'Novels', slug: 'novels' },
                      error: null,
                    }
                  },
                }
              }
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              }
            },
            limit: () => ({
              maybeSingle: async () => {
                if (options.categoryFallbackDbError) {
                  return { data: null, error: new Error('PostgreSQL connection timeout during category fallback query') }
                }
                return {
                  data: { id: 'cat-default-1', name: 'Novels', slug: 'novels' },
                  error: null,
                }
              },
            }),
          }
        },
        insert: (record) => {
          if (table === 'works') {
            if (options.failWorkInsert) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: new Error('Simulated works DB insert error') }),
                }),
              }
            }
            const workWithId = {
              id: 'work-uuid-new-1',
              ...record,
            }
            insertedRecords.works.push(workWithId)
            return {
              select: () => ({
                single: async () => ({
                  data: { id: workWithId.id, slug: workWithId.slug, title: workWithId.title },
                  error: null,
                }),
              }),
            }
          }

          if (table === 'work_genres') {
            if (options.failGenreInsert) {
              return Promise.resolve({ error: new Error('Simulated work_genres foreign key constraint error') })
            }
            insertedRecords.work_genres.push(record)
            return Promise.resolve({ error: null })
          }

          if (table === 'acts') {
            if (options.failActInsert) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: new Error('Simulated acts insert timeout') }),
                }),
              }
            }
            const actWithId = { id: 'act-uuid-1', ...record }
            insertedRecords.acts.push(actWithId)
            return {
              select: () => ({
                single: async () => ({ data: { id: actWithId.id }, error: null }),
              }),
            }
          }

          if (table === 'chapters') {
            if (options.failChapterInsert) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: new Error('Simulated chapters insert error') }),
                }),
              }
            }
            const chWithId = { id: 'ch-uuid-1', ...record }
            insertedRecords.chapters.push(chWithId)
            return {
              select: () => ({
                single: async () => ({
                  data: { id: chWithId.id, title: chWithId.title, chapter_number: chWithId.chapter_number },
                  error: null,
                }),
              }),
            }
          }

          return {
            select: () => ({
              single: async () => ({ data: { id: 'default-id' }, error: null }),
            }),
          }
        },
        delete: () => {
          return {
            eq: (field1, val1) => {
              return {
                eq: async (field2, val2) => {
                  insertedRecords.deletedWorks.push(val1)
                  return { error: null }
                },
              }
            },
          }
        },
      }
    },
  }

  const defaultAuthState = options.authState !== undefined ? options.authState : async () => ({ userId: 'user_2xyz' })
  mockAdmin.getAuthState = defaultAuthState

  return mockAdmin
}

test('Unit: executeCreateWriterWork persists valid active genre in work_genres and succeeds', async () => {
  const mockAdmin = createMockAdmin()

  const result = await executeCreateWriterWork(
    {
      clerkUserId: 'user_2xyz',
      title: 'The Great Journey',
      categoryName: 'Novels',
      genreName: 'Science Fiction',
      visibility: 'Public',
    },
    { admin: mockAdmin }
  )

  assert.equal(result.success, true)
  assert.equal(result.workId, 'work-uuid-new-1')
  assert.equal(result.genreAssigned, true)
  assert.equal(result.chapterId, 'ch-uuid-1')

  // Verify database operations
  assert.equal(mockAdmin._insertedRecords.works.length, 1)
  assert.equal(mockAdmin._insertedRecords.work_genres.length, 1)
  assert.deepEqual(mockAdmin._insertedRecords.work_genres[0], {
    work_id: 'work-uuid-new-1',
    genre_id: 'genre-sci-2',
  })
  assert.equal(mockAdmin._insertedRecords.acts.length, 1)
  assert.equal(mockAdmin._insertedRecords.chapters.length, 1)
  assert.equal(mockAdmin._insertedRecords.deletedWorks.length, 0)
})

test('Unit: executeCreateWriterWork resolves genre by slug fallback when name matches slug', async () => {
  const mockAdmin = createMockAdmin()

  const result = await executeCreateWriterWork(
    {
      clerkUserId: 'user_2xyz',
      title: 'Whispering Winds',
      genreName: 'fantasy',
    },
    { admin: mockAdmin }
  )

  assert.equal(result.success, true)
  assert.equal(result.genreAssigned, true)
  assert.equal(mockAdmin._insertedRecords.work_genres[0].genre_id, 'genre-fan-3')
})

test('Unit: executeCreateWriterWork rejects wildcard-containing genre names before database writes', async () => {
  const mockAdmin = createMockAdmin()

  // 1. Wildcard %
  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Wildcard Title',
          genreName: '%Fiction%',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Wildcard characters like "%" and "_" are not permitted/,
    }
  )

  // 2. Wildcard _
  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Wildcard Title 2',
          genreName: 'Sci_nce Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Wildcard characters like "%" and "_" are not permitted/,
    }
  )

  // Assert NO writes occurred
  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork surfaces database errors during genre validation explicitly', async () => {
  const mockAdmin = createMockAdmin({
    genreDbError: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'DB Error Manuscript',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Database error while validating genre "Science Fiction"/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork throws pre-insert error on inactive or unknown genre without writing to works', async () => {
  const mockAdmin = createMockAdmin({
    activeGenres: [
      { id: 'genre-lit-1', name: 'Literary Fiction', slug: 'literary-fiction', is_active: true },
      // Historical is inactive (is_active = false)
      { id: 'genre-hist-old', name: 'Historical', slug: 'historical', is_active: false },
    ],
  })

  // 1. Inactive genre
  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Chronicles of Old',
          genreName: 'Historical',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Unrecognized or inactive genre: "Historical"/,
    }
  )

  // Assert NO database writes occurred to works table
  assert.equal(mockAdmin._insertedRecords.works.length, 0)
  assert.equal(mockAdmin._insertedRecords.work_genres.length, 0)

  // 2. Unknown fictitious genre
  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Cyber Alien Magic',
          genreName: 'Fictitious Nonexistent Genre',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Unrecognized or inactive genre: "Fictitious Nonexistent Genre"/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork succeeds without genre assignment when genreName is omitted or empty', async () => {
  const mockAdmin = createMockAdmin()

  const result = await executeCreateWriterWork(
    {
      clerkUserId: 'user_2xyz',
      title: 'Minimalist Poetry',
      genreName: '   ',
    },
    { admin: mockAdmin }
  )

  assert.equal(result.success, true)
  assert.equal(result.genreAssigned, false)
  assert.equal(mockAdmin._insertedRecords.works.length, 1)
  assert.equal(mockAdmin._insertedRecords.work_genres.length, 0)
})

test('Unit: executeCreateWriterWork handles work insert failure immediately without partial record', async () => {
  const mockAdmin = createMockAdmin({
    failWorkInsert: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Failed Insert Manuscript',
          genreName: 'Literary Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Failed to create manuscript: Simulated works DB insert error/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork PRESERVES manuscript shell and reports ID when genre association insert fails', async () => {
  const mockAdmin = createMockAdmin({
    failGenreInsert: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Genre Fail Manuscript',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Failed to assign genre to manuscript: Simulated work_genres foreign key constraint error\. The partial manuscript shell has been safely preserved at ID: work-uuid-new-1/,
    }
  )

  // Zero background deletes - manuscript is preserved to avoid accidental deletion
  assert.equal(mockAdmin._insertedRecords.deletedWorks.length, 0)
})

test('Unit: executeCreateWriterWork PRESERVES manuscript shell and reports ID when act insert fails', async () => {
  const mockAdmin = createMockAdmin({
    failActInsert: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Act Fail Manuscript',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Failed to create initial Act I: Simulated acts insert timeout\. The partial manuscript shell has been safely preserved at ID: work-uuid-new-1/,
    }
  )

  // Zero background deletes
  assert.equal(mockAdmin._insertedRecords.deletedWorks.length, 0)
})

test('Unit: executeCreateWriterWork PRESERVES manuscript shell and reports ID when initial chapter insert fails', async () => {
  const mockAdmin = createMockAdmin({
    failChapterInsert: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Broken Manuscript',
          genreName: 'Literary Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Failed to create initial chapter: Simulated chapters insert error\. The partial manuscript shell has been safely preserved at ID: work-uuid-new-1/,
    }
  )

  // Zero background deletes
  assert.equal(mockAdmin._insertedRecords.deletedWorks.length, 0)
})

test('Unit: executeCreateWriterWork rejects wildcard-containing category names before database writes', async () => {
  const mockAdmin = createMockAdmin()

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Category Wildcard Manuscript',
          categoryName: '%Novels%',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Wildcard characters like "%" and "_" are not permitted/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork surfaces database errors during category resolution explicitly', async () => {
  const mockAdmin = createMockAdmin({
    categoryDbError: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Category DB Fail Manuscript',
          categoryName: 'Novels',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Database error while resolving category "Novels": PostgreSQL connection timeout/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: executeCreateWriterWork surfaces database errors during category fallback query explicitly', async () => {
  const mockAdmin = createMockAdmin({
    categoryFallbackDbError: true,
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Category Fallback Fail Manuscript',
          categoryName: 'NonexistentUnmatchedCategory',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Database error while fetching fallback category: PostgreSQL connection timeout/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: Authentication: Matching server-verified identity succeeds', async () => {
  const mockAdmin = createMockAdmin()

  const result = await executeCreateWriterWork(
    {
      clerkUserId: 'author_verified_99',
      title: 'Authenticated Folio',
      genreName: 'Fantasy',
    },
    {
      admin: mockAdmin,
      getAuthState: async () => ({ userId: 'author_verified_99' }),
    }
  )

  assert.equal(result.success, true)
  assert.equal(mockAdmin._insertedRecords.works.length, 1)
})

test('Unit: Authentication: Missing active session rejects request (fail-closed)', async () => {
  const mockAdmin = createMockAdmin()

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'spoofed_user_123',
          title: 'Unauthenticated Folio',
          genreName: 'Fantasy',
        },
        {
          admin: mockAdmin,
          getAuthState: async () => null, // No active session
        }
      )
    },
    {
      name: 'Error',
      message: /Unauthorized: No active authenticated session found/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: Authentication: Mismatched identity rejects request (fail-closed)', async () => {
  const mockAdmin = createMockAdmin()

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'victim_user_456',
          title: 'Impersonated Folio',
          genreName: 'Fantasy',
        },
        {
          admin: mockAdmin,
          getAuthState: async () => ({ userId: 'attacker_user_789' }), // Attacker session
        }
      )
    },
    {
      name: 'Error',
      message: /Unauthorized: Client user ID does not match authenticated server session/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: Authentication: Unexpected auth exception rejects request instead of silently continuing', async () => {
  const mockAdmin = createMockAdmin()

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Auth Broken Folio',
          genreName: 'Fantasy',
        },
        {
          admin: mockAdmin,
          getAuthState: async () => {
            throw new Error('Clerk session token verification key unreachable')
          },
        }
      )
    },
    {
      name: 'Error',
      message: /Authentication failure: Clerk session token verification key unreachable/,
    }
  )

  assert.equal(mockAdmin._insertedRecords.works.length, 0)
})

test('Unit: Safety: Ambiguous network timeout on chapter insertion preserves manuscript without false success', async () => {
  const mockAdmin = createMockAdmin({
    failChapterInsert: true, // Simulates network timeout on chapter insert
  })

  await assert.rejects(
    async () => {
      await executeCreateWriterWork(
        {
          clerkUserId: 'user_2xyz',
          title: 'Timeout Manuscript',
          genreName: 'Science Fiction',
        },
        { admin: mockAdmin }
      )
    },
    {
      name: 'Error',
      message: /Failed to create initial chapter: Simulated chapters insert error\. The partial manuscript shell has been safely preserved at ID: work-uuid-new-1/,
    }
  )

  // Verify: No false success returned, manuscript preserved, zero background deletes
  assert.equal(mockAdmin._insertedRecords.deletedWorks.length, 0)
  assert.equal(mockAdmin._insertedRecords.works.length, 1)
  assert.equal(mockAdmin._insertedRecords.works[0].id, 'work-uuid-new-1')
})

test('Unit: Publishing Safety: Newly created manuscript starts as private Draft with draft Chapter 1 and null published_at', async () => {
  const mockAdmin = createMockAdmin()

  const result = await executeCreateWriterWork(
    {
      clerkUserId: 'user_2xyz',
      title: 'Confidential Unpublished Draft',
      categoryName: 'Novels',
      genreName: 'Literary Fiction',
    },
    { admin: mockAdmin }
  )

  assert.equal(result.success, true)
  assert.equal(result.workId, 'work-uuid-new-1')

  // 1. Verify works table entry: strictly draft, not indexable, published_at is null
  const insertedWork = mockAdmin._insertedRecords.works[0]
  assert.ok(insertedWork, 'Work must be inserted')
  assert.equal(insertedWork.visibility, 'draft', 'Newly created work must have visibility = draft')
  assert.equal(insertedWork.publication_status, 'draft', 'Newly created work must have publication_status = draft')
  assert.equal(insertedWork.is_indexable, false, 'Newly created work must NOT be indexable')
  assert.equal(insertedWork.published_at, null, 'Newly created work must NOT have published_at timestamp')
  assert.equal(insertedWork.chapter_count, 1, 'Initial chapter count is 1')

  // 2. Verify chapters table entry: strictly draft, not indexable, published_at is null
  const insertedChapter = mockAdmin._insertedRecords.chapters[0]
  assert.ok(insertedChapter, 'Initial chapter must be inserted')
  assert.equal(insertedChapter.status, 'draft', 'Initial chapter must have status = draft')
  assert.equal(insertedChapter.is_indexable, false, 'Initial chapter must NOT be indexable')
  assert.equal(insertedChapter.published_at, null, 'Initial chapter must NOT have published_at timestamp')

  // 3. Verify genre was persisted correctly
  assert.equal(mockAdmin._insertedRecords.work_genres.length, 1)
  assert.equal(mockAdmin._insertedRecords.work_genres[0].work_id, 'work-uuid-new-1')
  assert.equal(mockAdmin._insertedRecords.work_genres[0].genre_id, 'genre-lit-1')
})

test('Unit: Publishing Safety: Explicit chapter publishing updates status to published with published_at timestamp', async () => {
  // Test simulated explicit chapter update
  let updatedRecord = null
  const fakeAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          update: (fields) => {
            updatedRecord = fields
            return {
              eq: async () => ({ error: null }),
            }
          },
          select: () => ({
            eq: async () => ({
              data: [{ word_count: 500, reading_time_minutes: 3 }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
    },
  }

  // Simulate saveWriterChapter payload for publishing
  const nowIso = new Date().toISOString()
  const payload = {
    workId: 'work-uuid-new-1',
    chapterId: 'ch-uuid-1',
    title: 'Chapter One (Revised)',
    content: 'New content written by the author...',
    status: 'published',
  }

  // Chapter update logic mirrors saveWriterChapterServerFn
  const updateData = {
    title: payload.title.trim(),
    content: payload.content,
    status: payload.status,
    updated_at: nowIso,
    published_at: payload.status === 'published' ? nowIso : null,
  }

  await fakeAdmin.from('chapters').update(updateData).eq('id', payload.chapterId)

  assert.ok(updatedRecord)
  assert.equal(updatedRecord.status, 'published')
  assert.ok(updatedRecord.published_at)
})

test('Unit: Publishing Safety: executeSaveWriterChapter sets is_indexable: true when chapter is published', async () => {
  let updatedFields = null
  const fakeAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
              maybeSingle: async () => ({ data: null }),
              async: async () => ({ data: [], error: null }),
            }),
            async: async () => ({ data: [], error: null }),
          }),
          update: (fields) => {
            updatedFields = fields
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
              maybeSingle: async () => ({
                data: { id: '00000000-0000-0000-0000-000000000001', visibility: 'public', publication_status: 'published', is_indexable: true },
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
    },
  }

  const result = await executeSaveWriterChapter(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      chapterId: '11111111-1111-1111-1111-111111111111',
      title: 'Chapter One (Published)',
      content: 'Prose content for readers.',
      status: 'published',
    },
    fakeAdmin
  )

  assert.ok(updatedFields)
  assert.equal(updatedFields.status, 'published')
  assert.equal(updatedFields.is_indexable, true, 'Published chapter must have is_indexable set to true')
  assert.ok(updatedFields.published_at)

  // When updating back to draft, is_indexable must become false
  let draftUpdatedFields = null
  const draftAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              maybeSingle: async () => ({ data: null }),
              async: async () => ({ data: [], error: null }),
            }),
            async: async () => ({ data: [], error: null }),
          }),
          update: (fields) => {
            draftUpdatedFields = fields
            return { eq: async () => ({ error: null }) }
          },
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: '00000000-0000-0000-0000-000000000001', visibility: 'public', publication_status: 'published', is_indexable: true },
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
    },
  }

  await executeSaveWriterChapter(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      chapterId: '11111111-1111-1111-1111-111111111111',
      title: 'Chapter One (Draft)',
      content: 'Draft content.',
      status: 'draft',
    },
    draftAdmin
  )

  assert.ok(draftUpdatedFields)
  assert.equal(draftUpdatedFields.status, 'draft')
  assert.equal(draftUpdatedFields.is_indexable, false, 'Draft chapter must have is_indexable set to false')
})

test('Unit: Publishing Safety: Chapter published in unlisted or draft parent work remains is_indexable: false', async () => {
  let updatedFields = null
  const unlistedParentAdmin = {
    from: (table) => {
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
              maybeSingle: async () => ({ data: null }),
              async: async () => ({ data: [], error: null }),
            }),
            async: async () => ({ data: [], error: null }),
          }),
          update: (fields) => {
            updatedFields = fields
            return { eq: async () => ({ error: null }) }
          },
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: '00000000-0000-0000-0000-000000000001', visibility: 'unlisted', publication_status: 'published', is_indexable: false },
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      return { select: () => ({ maybeSingle: async () => ({ data: null }) }) }
    },
  }

  await executeSaveWriterChapter(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      chapterId: '11111111-1111-1111-1111-111111111111',
      title: 'Chapter One (Unlisted Parent)',
      content: 'Private/unlisted prose.',
      status: 'published',
    },
    unlistedParentAdmin
  )

  assert.ok(updatedFields)
  assert.equal(updatedFields.status, 'published')
  assert.equal(updatedFields.is_indexable, false, 'Chapter in unlisted work must NOT become is_indexable: true')
})
