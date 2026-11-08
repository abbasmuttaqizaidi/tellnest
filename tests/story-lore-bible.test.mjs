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
