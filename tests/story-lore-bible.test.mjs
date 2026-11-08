import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeGetStoryLoreBible,
  executeSaveStoryLoreEntity,
  executeBulkLinkStoryLore,
  executeBulkUnlinkStoryLore,
  executeDeleteStoryLoreEntity,
  executeSaveUserLoreType,
} from '../src/server/writer.ts'
import {
  linkAllOccurrences,
  countEntityMentions,
} from '../src/lib/lore/loreParser.ts'

const mockAuthResolver = async () => ({ userId: 'user_author123' })

function createQueryMock(data, error = null) {
  const result = { data, error }
  const obj = {
    order: async () => result,
    maybeSingle: async () => result,
    single: async () => result,
    eq: () => obj,
    in: () => obj,
    ilike: () => obj,
    then: (resolve, reject) => {
      if (error) reject ? reject(error) : resolve(result)
      else resolve(result)
    },
  }
  return obj
}

test('Story Lore Bible: Validates required workId and authentication', async () => {
  await assert.rejects(
    async () => {
      await executeGetStoryLoreBible({ workId: '' })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      await executeSaveStoryLoreEntity({
        workId: '00000000-0000-0000-0000-000000000001',
        name: 'Arthur',
        entityType: 'Character',
        description: 'King',
        clerkUserId: '',
      })
    },
    { message: /User authentication required/ }
  )
})

test('Story Lore Bible: Get returns merged lore from DB entities and chapter text', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'works') {
        return {
          select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001' }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'lore-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                name: 'Arthur Pendragon',
                entity_type: 'Character',
                description: 'King of Camelot',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]),
        }
      }
      if (table === 'chapters') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'ch-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: 'In the court of [Arthur Pendragon](lore:Character|King%20of%20Camelot), the realm thrived.',
              },
              {
                id: 'ch-2',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: 'Arthur Pendragon returned to [Camelot](lore:Location|Legendary%20Castle).',
              },
            ]),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeGetStoryLoreBible(
    { workId: '00000000-0000-0000-0000-000000000001' },
    fakeAdmin
  )

  assert.ok(res.entities)
  assert.equal(res.entities.length, 2) // Arthur Pendragon (from DB) + Camelot (discovered from ch-2)

  const arthur = res.entities.find((e) => e.name === 'Arthur Pendragon')
  assert.ok(arthur)
  assert.equal(arthur.entityType, 'Character')
  assert.equal(arthur.description, 'King of Camelot')
  assert.equal(arthur.chapterCount, 2) // mentions in both ch-1 and ch-2
  assert.equal(arthur.chaptersCount, 1) // ONLY 1 chapter where Arthur is actually linked!
  assert.equal(arthur.linkedChaptersCount, 1)
  assert.equal(arthur.unlinkedChaptersCount, 1)
  assert.equal(arthur.totalLinkedCount, 1)
  assert.equal(arthur.totalUnlinkedCount, 1)
  assert.equal(arthur.mentionCount, 2)

  const camelot = res.entities.find((e) => e.name === 'Camelot')
  assert.ok(camelot)
  assert.equal(camelot.entityType, 'Location')
  assert.equal(camelot.chapterCount, 1)
  assert.equal(camelot.mentionCount, 1)
})

test('Story Lore Bible: Save upserts entity and optionally links across chapters', async () => {
  let upsertedRow = null
  let updatedChapterContent = null

  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-author-1', clerk_user_id: 'user_author123' }),
        }
      }
      if (table === 'works') {
        return {
          select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-author-1' }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () => createQueryMock(null),
          upsert: (data) => {
            upsertedRow = data
            return {
              select: () => createQueryMock({ id: 'lore-new-1', ...data }),
            }
          },
        }
      }
      if (table === 'chapters') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'ch-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: 'Navya stood silently in the rain.',
              },
            ]),
          update: (updateData) => ({
            eq: async () => {
              updatedChapterContent = updateData.content
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const saveRes = await executeSaveStoryLoreEntity(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      name: 'Navya',
      entityType: 'Character',
      description: 'Lead protagonist',
      applyToAllChapters: true,
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(saveRes.success, true)
  assert.equal(saveRes.totalLinked, 1)
  assert.equal(saveRes.chaptersUpdated, 1)
  assert.ok(upsertedRow)
  assert.equal(upsertedRow.name, 'Navya')
  assert.ok(updatedChapterContent.includes('[Navya](lore:Character|Lead%20protagonist)'))
})

test('Story Lore Bible: Bulk link respects exact case and skips existing links', async () => {
  let updatedContent = null

  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-author-1', clerk_user_id: 'user_author123' }),
        }
      }
      if (table === 'works') {
        return {
          select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-author-1' }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () =>
            createQueryMock({
              id: 'lore-1',
              work_id: '00000000-0000-0000-0000-000000000001',
              name: 'Karna',
              entity_type: 'Character',
              description: 'The undefeated warrior',
            }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'ch-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: 'Karna raised his bow. But karna lower case should NOT be linked.',
              },
            ]),
          update: (updateData) => ({
            eq: async () => {
              updatedContent = updateData.content
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeBulkLinkStoryLore(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      entityName: 'Karna',
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(res.success, true)
  assert.equal(res.totalLinked, 1) // Only uppercase Karna linked
  assert.ok(updatedContent.includes('[Karna](lore:Character|The%20undefeated%20warrior)'))
  assert.ok(updatedContent.includes('But karna lower case should NOT be linked'))
})

test('Story Lore Bible: Bulk unlink removes lore markdown and preserves plain text', async () => {
  let updatedContent = null

  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-author-1', clerk_user_id: 'user_author123' }),
        }
      }
      if (table === 'works') {
        return {
          select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-author-1' }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'ch-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: '[Karna](lore:Character|Warrior) stood bravely.',
              },
            ]),
          update: (updateData) => ({
            eq: async () => {
              updatedContent = updateData.content
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeBulkUnlinkStoryLore(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      entityName: 'Karna',
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(res.success, true)
  assert.equal(res.totalUnlinked, 1)
  assert.equal(updatedContent, 'Karna stood bravely.')
})

test('Story Lore Bible: Delete entity deletes from DB table and unlinks occurrences', async () => {
  let deletedFromTable = false
  let updatedContent = null

  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-author-1', clerk_user_id: 'user_author123' }),
        }
      }
      if (table === 'works') {
        return {
          select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-author-1' }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          delete: () => ({
            eq: () => ({
              ilike: async () => {
                deletedFromTable = true
                return { error: null }
              },
              eq: async () => {
                deletedFromTable = true
                return { error: null }
              },
            }),
          }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'ch-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                content: '[Arthur](lore:Character|King) returned.',
              },
            ]),
          update: (updateData) => ({
            eq: async () => {
              updatedContent = updateData.content
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeDeleteStoryLoreEntity(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      entityName: 'Arthur',
      unlinkEverywhere: true,
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(res.success, true)
  assert.equal(deletedFromTable, true)
  assert.equal(res.unlinkedCount, 1)
  assert.equal(updatedContent, 'Arthur returned.')
})

test('Admin Story Lore: Validates admin authentication and required fields', async () => {
  const { executeAdminDeleteLoreEntity, generateAdminToken } = await import('../src/server/admin.ts')

  // Fails with missing adminToken
  await assert.rejects(
    async () => {
      await executeAdminDeleteLoreEntity({
        adminToken: '',
        workId: '00000000-0000-0000-0000-000000000001',
        entityName: 'Arthur',
      })
    },
    { message: /Admin authorization token is required/ }
  )

  // Fails with invalid adminToken
  await assert.rejects(
    async () => {
      await executeAdminDeleteLoreEntity({
        adminToken: 'invalid-token',
        workId: '00000000-0000-0000-0000-000000000001',
        entityName: 'Arthur',
      })
    },
    { message: /Unauthorized: Invalid administration key/ }
  )

  const { token: validToken } = generateAdminToken()

  // Fails with missing workId
  await assert.rejects(
    async () => {
      await executeAdminDeleteLoreEntity({
        adminToken: validToken,
        workId: '',
        entityName: 'Arthur',
      })
    },
    { message: /Work ID is required/ }
  )

  // Fails with missing entityName
  await assert.rejects(
    async () => {
      await executeAdminDeleteLoreEntity({
        adminToken: validToken,
        workId: '00000000-0000-0000-0000-000000000001',
        entityName: '',
      })
    },
    { message: /Entity name is required/ }
  )
})

test('Admin Bulk Lore Import: Allows admin to import CSV and link entities across any manuscript', async () => {
  const { executeAdminImportStoryLoreCsv, generateAdminToken } = await import('../src/server/admin.ts')
  const { token: validToken } = generateAdminToken()

  const mockWorkId = '00000000-0000-0000-0000-000000000099'
  const upsertedEntities = []
  const updatedChapters = []

  const mockAdminClient = {
    from(table) {
      if (table === 'works') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { id: mockWorkId, title: 'The Royal Tale', slug: 'the-royal-tale' },
                  }),
                }
              },
            }
          },
        }
      }
      if (table === 'story_lore_entities') {
        return {
          upsert: async (rows) => {
            upsertedEntities.push(...rows)
            return { error: null }
          },
        }
      }
      if (table === 'chapters') {
        return {
          select() {
            return {
              eq(col, val) {
                return Promise.resolve({
                  data: [
                    { id: 'ch-1', title: 'Chapter 1', content: 'Evan walked into Morrow House and met Sameer.' },
                    { id: 'ch-2', title: 'Chapter 2', content: 'Quiet morning.' },
                  ],
                })
              },
            }
          },
          update(updates) {
            return {
              eq(col, val) {
                updatedChapters.push({ id: val, updates })
                return Promise.resolve({ error: null })
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const csv = [
    'Type,Name,Description',
    'Character,Evan,Protagonist; tenant of Apartment 306.',
    'Character,Sameer,Resident of Apartment 305.',
    'Location,Morrow House,Old apartment building.',
  ].join('\n')

  const res = await executeAdminImportStoryLoreCsv(
    {
      adminToken: validToken,
      workId: mockWorkId,
      csvText: csv,
      linkAllChapters: true,
    },
    mockAdminClient
  )

  assert.equal(res.success, true)
  assert.equal(res.importedCount, 3)
  assert.equal(res.chaptersUpdated, 1) // ch-1 has mentions of Evan, Sameer, Morrow House
  assert.equal(res.totalMentionsLinked, 3)
  assert.equal(upsertedEntities.length, 3)
})

test('Sync Lores: Automatically scans all chapters and links all recorded story lore in single pass', async () => {
  const { executeSyncAllStoryLore } = await import('../src/server/writer.ts')
  const { executeAdminSyncAllStoryLore, generateAdminToken } = await import('../src/server/admin.ts')

  const mockWorkId = '00000000-0000-0000-0000-000000000055'
  const mockAuthorProfileId = '00000000-0000-0000-0000-000000000056'
  const mockClerkUserId = 'user_lore_sync_test'
  const { token: validToken } = generateAdminToken()

  const updatedChapters = []

  const mockAdminClient = {
    from(table) {
      if (table === 'profiles') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { id: mockAuthorProfileId, clerk_user_id: mockClerkUserId },
                  }),
                }
              },
            }
          },
        }
      }
      if (table === 'works') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { id: mockWorkId, title: 'Mystery of Morrow House', slug: 'mystery-of-morrow-house', author_id: mockAuthorProfileId },
                  }),
                }
              },
            }
          },
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: [
                    { name: 'Evan', entity_type: 'Character', description: 'Tenant of Apt 306' },
                    { name: 'Morrow House', entity_type: 'Location', description: 'Old building' },
                  ],
                })
              },
            }
          },
        }
      }
      if (table === 'chapters') {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({
                  data: [
                    { id: 'ch-1', title: 'Arrival', content: 'Evan entered Morrow House late at night.' },
                    { id: 'ch-2', title: 'Next Morning', content: 'Evan looked out the window.' },
                    { id: 'ch-3', title: 'The Street', content: 'The weather was cold.' },
                  ],
                })
              },
            }
          },
          update(updates) {
            return {
              eq(col, val) {
                updatedChapters.push({ id: val, updates })
                return Promise.resolve({ error: null })
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  // 1. Author sync test
  const authorRes = await executeSyncAllStoryLore(
    {
      workId: mockWorkId,
      clerkUserId: mockClerkUserId,
    },
    mockAdminClient,
    async () => ({ userId: mockClerkUserId })
  )

  assert.equal(authorRes.success, true)
  assert.equal(authorRes.totalEntities, 2)
  assert.equal(authorRes.updatedChaptersCount, 2) // ch-1 (Evan & Morrow House) and ch-2 (Evan)
  assert.equal(authorRes.totalMentionsLinked, 3)

  // 2. Admin sync test
  updatedChapters.length = 0
  const adminRes = await executeAdminSyncAllStoryLore(
    {
      adminToken: validToken,
      workId: mockWorkId,
    },
    mockAdminClient
  )

  assert.equal(adminRes.success, true)
  assert.equal(adminRes.totalEntities, 2)
  assert.equal(adminRes.updatedChaptersCount, 2)
  assert.equal(adminRes.totalMentionsLinked, 3)
})

test('Edge Case: Curly vs straight apostrophes match seamlessly', () => {
  const entity = {
    name: "D'Artagnan",
    entityType: 'Character',
    description: 'Heroic musketeer',
  }

  // Text contains smart curly apostrophe ’ (U+2019)
  const textWithCurly = 'Then D’Artagnan drew his blade.'
  const counts = countEntityMentions(textWithCurly, "D'Artagnan")
  assert.equal(counts.unlinkedCount, 1)

  const { newMarkdown, countReplaced } = linkAllOccurrences(textWithCurly, entity)
  assert.equal(countReplaced, 1)
  assert.ok(newMarkdown.includes('[D’Artagnan](lore:Character|Heroic%20musketeer)'))
})

test('Edge Case: Multi-word entity length sorting prevents substring shadowing', () => {
  const entLong = {
    name: 'Arthur Pendragon',
    entityType: 'Character',
    description: 'High King',
  }
  const entShort = {
    name: 'Arthur',
    entityType: 'Character',
    description: 'King',
  }

  const text = 'Arthur Pendragon sat with Arthur in the hall.'

  // When sorted descending by length:
  const sorted = [entShort, entLong].sort((a, b) => b.name.length - a.name.length)
  let result = text
  for (const ent of sorted) {
    const { newMarkdown } = linkAllOccurrences(result, ent)
    result = newMarkdown
  }

  // Both should be cleanly linked without corrupting "Arthur Pendragon" into "[Arthur] Pendragon"
  assert.ok(result.includes('[Arthur Pendragon](lore:Character|High%20King)'))
  assert.ok(result.includes('[Arthur](lore:Character|King)'))
  assert.ok(!result.includes('[Arthur](lore:Character|King) Pendragon'))
})

test('Edge Case: Unpersisted chapter ID "new" does not crash backend', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return { select: () => createQueryMock({ id: 'prof-1', clerk_user_id: 'user_author123' }) }
      }
      if (table === 'works') {
        return { select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-1' }) }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () => createQueryMock(null),
          upsert: (data) => ({ select: () => createQueryMock({ id: 'lore-1', ...data }) }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () => {
            throw new Error('Should not query chapters table with "new" id!')
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  // Should succeed gracefully and skip DB query for non-UUID "new"
  const res = await executeSaveStoryLoreEntity(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      name: 'Karna',
      entityType: 'Character',
      description: 'Warrior',
      linkCurrentChapterId: 'new',
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(res.success, true)
})

test('Custom Lore Types: Persists new custom type to author profile preferences and returns in loreTypes', async () => {
  let savedPreferences = null
  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-1', clerk_user_id: 'user_author123', preferences: { lore_types: ['Character', 'Location', 'Lore'] } }),
          update: (data) => {
            savedPreferences = data.preferences
            return createQueryMock({ id: 'prof-1' })
          },
        }
      }
      if (table === 'works') {
        return { select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-1' }) }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () =>
            createQueryMock([
              {
                id: 'lore-1',
                work_id: '00000000-0000-0000-0000-000000000001',
                name: 'Voldemort',
                entity_type: 'Villain',
                description: 'Dark Lord',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]),
        }
      }
      if (table === 'chapters') {
        return {
          select: () => createQueryMock([]),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  // 1. Test executeSaveUserLoreType
  const saveTypeRes = await executeSaveUserLoreType(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      loreType: 'Villain',
    },
    fakeAdmin,
    mockAuthResolver
  )
  assert.equal(saveTypeRes.success, true)
  assert.equal(saveTypeRes.loreType, 'Villain')
  assert.ok(savedPreferences?.lore_types?.includes('Villain'))

  // 2. Test executeGetStoryLoreBible returns loreTypes including custom types
  const bibleRes = await executeGetStoryLoreBible(
    { workId: '00000000-0000-0000-0000-000000000001' },
    fakeAdmin
  )
  assert.ok(Array.isArray(bibleRes.loreTypes))
  assert.ok(bibleRes.loreTypes.includes('Character'))
  assert.ok(bibleRes.loreTypes.includes('Location'))
  assert.ok(bibleRes.loreTypes.includes('Lore'))
  assert.ok(bibleRes.loreTypes.includes('Villain'))
})

test('Payload Alias Robustness: Accepts both entityName/name and entityDescription/description', async () => {
  let savedName = ''
  let savedType = ''
  let savedDesc = ''
  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => createQueryMock({ id: 'prof-1', clerk_user_id: 'user_author123' }),
          update: () => createQueryMock({ id: 'prof-1' }),
        }
      }
      if (table === 'works') {
        return { select: () => createQueryMock({ id: '00000000-0000-0000-0000-000000000001', author_id: 'prof-1' }) }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () => createQueryMock(null),
          upsert: (payload) => {
            savedName = payload.name
            savedType = payload.entity_type
            savedDesc = payload.description
            return { select: () => createQueryMock({ id: 'lore-123', ...payload }) }
          },
        }
      }
      if (table === 'chapters') {
        return {
          select: () => createQueryMock([]),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  // Caller sends entityName and entityDescription and custom type 'Villan'
  const res = await executeSaveStoryLoreEntity(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_author123',
      entityName: 'Mogambo',
      entityType: 'Villan',
      entityDescription: 'Iconic antagonist',
    },
    fakeAdmin,
    mockAuthResolver
  )

  assert.equal(res.success, true)
  assert.equal(savedName, 'Mogambo')
  assert.equal(savedType, 'Villan')
  assert.equal(savedDesc, 'Iconic antagonist')
})

test('Audit: linkAllOccurrences and countEntityMentions API robustness', async () => {
  const { linkAllOccurrences, countEntityMentions } = await import('../src/lib/lore/loreParser.ts')

  const sampleProse = 'Arthur drew Excalibur from the stone. Arthur looked at Merlin.'

  // 1. Invocation with object
  const objRes = linkAllOccurrences(sampleProse, {
    name: 'Arthur',
    entityType: 'Character',
    description: 'King of the Britons',
  })
  assert.equal(objRes.countReplaced, 2)
  assert.equal(objRes.replacedCount, 2)
  assert.ok(objRes.newMarkdown.includes('[Arthur](lore:Character|King%20of%20the%20Britons)'))

  // 2. Invocation with positional arguments (as in StoryLoreModal)
  const posRes = linkAllOccurrences(sampleProse, 'Arthur', 'Character', 'King of the Britons')
  assert.equal(posRes.countReplaced, 2)
  assert.equal(posRes.replacedCount, 2)
  assert.equal(posRes.newMarkdown, objRes.newMarkdown)

  // 3. countEntityMentions alias support
  const stats = countEntityMentions(objRes.newMarkdown, 'Arthur')
  assert.equal(stats.linkedCount, 2)
  assert.equal(stats.linked, 2)
  assert.equal(stats.unlinkedCount, 0)
  assert.equal(stats.unlinked, 0)
})

test('Multi-Lore Sequential Binding: Linking Entity B accumulates on top of Entity A without wiping it out', async () => {
  const { linkAllOccurrences, countEntityMentions } = await import('../src/lib/lore/loreParser.ts')

  let currentContent = "Sameer and Mr. D'Souza were discussing the situation with Evan."

  // User links Sameer
  const step1 = linkAllOccurrences(currentContent, {
    name: 'Sameer',
    entityType: 'Character',
    description: "Evan's neighbour",
  })
  assert.equal(step1.countReplaced, 1)
  currentContent = step1.newMarkdown

  // User immediately links Mr. D'Souza
  const step2 = linkAllOccurrences(currentContent, {
    name: "Mr. D'Souza",
    entityType: 'Character',
    description: 'Landlord of Apartment 306',
  })
  assert.equal(step2.countReplaced, 1)
  currentContent = step2.newMarkdown

  // User links Evan
  const step3 = linkAllOccurrences(currentContent, {
    name: 'Evan',
    entityType: 'Character',
    description: 'Protagonist',
  })
  assert.equal(step3.countReplaced, 1)
  currentContent = step3.newMarkdown

  // Verify all 3 are independently and simultaneously linked without corruption
  const sameerStats = countEntityMentions(currentContent, 'Sameer')
  const dsouzaStats = countEntityMentions(currentContent, "Mr. D'Souza")
  const evanStats = countEntityMentions(currentContent, 'Evan')

  assert.equal(sameerStats.linkedCount, 1)
  assert.equal(sameerStats.unlinkedCount, 0)
  assert.equal(dsouzaStats.linkedCount, 1)
  assert.equal(dsouzaStats.unlinkedCount, 0)
  assert.equal(evanStats.linkedCount, 1)
  assert.equal(evanStats.unlinkedCount, 0)

  // Verify markdown contains all 3 lore links
  assert.ok(currentContent.includes('[Sameer](lore:Character|Evan%27s%20neighbour)'))
  assert.ok(currentContent.includes("[Mr. D'Souza](lore:Character|Landlord%20of%20Apartment%20306)"))
  assert.ok(currentContent.includes('[Evan](lore:Character|Protagonist)'))
})

test('Lore Client Cache: Stores, retrieves, and invalidates Story Lore Bible seamlessly', async () => {
  const {
    getClientLoreBibleCache,
    setClientLoreBibleCache,
    invalidateClientLoreBibleCache,
  } = await import('../src/lib/lore/loreClientCache.ts')

  const testWorkId = 'work-cache-test-123'

  // Initially empty
  assert.equal(getClientLoreBibleCache(testWorkId), null)

  // Store in cache
  setClientLoreBibleCache(testWorkId, {
    entities: [{ name: 'Sameer', entityType: 'Character', description: 'Friend' }],
    loreTypes: ['Character', 'Location'],
    totalChaptersCount: 3,
  })

  const cached = getClientLoreBibleCache(testWorkId)
  assert.ok(cached !== null)
  assert.equal(cached.entities.length, 1)
  assert.equal(cached.entities[0].name, 'Sameer')
  assert.equal(cached.totalChaptersCount, 3)

  // Invalidate
  invalidateClientLoreBibleCache(testWorkId)
  assert.equal(getClientLoreBibleCache(testWorkId), null)
})

test('Mentions Tab Filter: Distinguishes lores with unlinked appearances from unmentioned or fully-linked lores', async () => {
  const entities = [
    {
      name: 'Sameer',
      entityType: 'Character',
      description: 'Friend',
      linkedChaptersCount: 2,
      totalUnlinkedCount: 1, // Appeared unlinked in Ch 3 -> Should match Mentions
    },
    {
      name: "Mr. D'Souza",
      entityType: 'Character',
      description: 'Landlord',
      linkedChaptersCount: 1,
      totalUnlinkedCount: 1, // Appeared unlinked in Ch 3 -> Should match Mentions
    },
    {
      name: 'Apartment 305',
      entityType: 'Location',
      description: 'Flat',
      linkedChaptersCount: 0,
      totalUnlinkedCount: 0, // Recorded in Bible, NEVER appeared in chapter text -> Should NOT match Mentions
    },
    {
      name: 'Hermione',
      entityType: 'Character',
      description: 'Wizard',
      linkedChaptersCount: 1,
      totalUnlinkedCount: 0, // Fully linked everywhere it appeared -> Should NOT match Mentions
    },
  ]

  // Filter for 'mentions': lores that appeared in some chapter but are not yet linked there
  const filterByTab = (tab) => {
    return entities.filter((ent) => {
      const linkedChapters = Number(ent.linkedChaptersCount || 0)
      const totalUnlinked = Number(ent.totalUnlinkedCount || 0)
      const isLinked = linkedChapters > 0

      if (tab === 'all') return true
      if (tab === 'linked') return isLinked
      if (tab === 'unlinked') return !isLinked
      if (tab === 'mentions') return totalUnlinked > 0
      return true
    })
  }

  const mentionsTabList = filterByTab('mentions')
  assert.equal(mentionsTabList.length, 2)
  assert.deepEqual(
    mentionsTabList.map((e) => e.name),
    ['Sameer', "Mr. D'Souza"]
  )

  const linkedTabList = filterByTab('linked')
  assert.equal(linkedTabList.length, 3) // Sameer, Mr. D'Souza, Hermione

  const unlinkedTabList = filterByTab('unlinked')
  assert.equal(unlinkedTabList.length, 1) // Apartment 305
})

test('Lore Architecture: Accurate Word Count & Parallel Concurrency Batching', async () => {
  const { stripLoreToPlainText } = await import('../src/lib/lore/loreParser.ts')
  const { executeSyncAllStoryLore } = await import('../src/server/writer.ts')

  // 1. Verify stripLoreToPlainText ensures payload URLs do not artificially inflate word count
  const rawWithLore = 'Evan walked into the [Morrow House](lore:Location%7CAn%20ancient%20gothic%20mansion%20with%20dark%20mysteries) alone.'
  const cleanProse = stripLoreToPlainText(rawWithLore)
  assert.equal(cleanProse, 'Evan walked into the Morrow House alone.')
  const wordCount = cleanProse.split(/\s+/).filter(Boolean).length
  assert.equal(wordCount, 7) // 7 actual spoken/read words, not inflated by the 7 words inside the lore tooltip payload

  // 2. Verify executeSyncAllStoryLore updates multiple chapters concurrently without timing out
  const mockWorkId = '00000000-0000-0000-0000-000000000088'
  const mockAuthorProfileId = '00000000-0000-0000-0000-000000000089'
  const mockClerkUserId = 'user_lore_concurrency_test'

  const updatedIds = []
  const mockAdminClient = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: mockAuthorProfileId, clerk_user_id: mockClerkUserId },
              }),
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: mockWorkId, author_id: mockAuthorProfileId },
              }),
            }),
          }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ name: 'Aria', entity_type: 'Character', description: 'Rebel pilot' }],
            }),
          }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [
                { id: 'ch-1', title: 'Chapter 1', content: 'Aria checked her engines.' },
                { id: 'ch-2', title: 'Chapter 2', content: 'Aria flew into the storm.' },
                { id: 'ch-3', title: 'Chapter 3', content: 'Aria landed safely.' },
              ],
            }),
          }),
          update: (updates) => ({
            eq: async (col, val) => {
              updatedIds.push(val)
              assert.ok(updates.word_count > 0)
              assert.ok(updates.reading_time_minutes >= 1)
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeSyncAllStoryLore(
    { workId: mockWorkId, clerkUserId: mockClerkUserId },
    mockAdminClient,
    async () => ({ userId: mockClerkUserId })
  )

  assert.equal(res.success, true)
  assert.equal(res.updatedChaptersCount, 3)
  assert.equal(res.totalMentionsLinked, 3)
  assert.deepEqual(updatedIds.sort(), ['ch-1', 'ch-2', 'ch-3'])
})

test('Lore Cache Invalidation: executeSyncAllStoryLore evicts both work UUID and slug from public cache', async () => {
  const { executeSyncAllStoryLore } = await import('../src/server/writer.ts')
  const { clearPublicWorkCache } = await import('../src/server/works.ts')

  const mockWorkId = '00000000-0000-0000-0000-000000000099'
  const mockWorkSlug = 'aria-chronicles-test'
  const mockAuthorProfileId = '00000000-0000-0000-0000-000000000098'
  const mockClerkUserId = 'user_lore_cache_invalidation_test'

  const mockAdminClient = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: mockAuthorProfileId, clerk_user_id: mockClerkUserId },
              }),
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: mockWorkId, slug: mockWorkSlug, author_id: mockAuthorProfileId },
              }),
            }),
          }),
        }
      }
      if (table === 'story_lore_entities') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ name: 'Aria', entity_type: 'Character', description: 'Heroine' }],
            }),
          }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'ch-cache-1', title: 'Chapter 1', content: 'Aria flew.' }],
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeSyncAllStoryLore(
    { workId: mockWorkId, clerkUserId: mockClerkUserId },
    mockAdminClient,
    async () => ({ userId: mockClerkUserId })
  )

  assert.equal(res.success, true)
  assert.equal(res.updatedChaptersCount, 1)
})
