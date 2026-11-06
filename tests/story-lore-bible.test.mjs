import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeGetStoryLoreBible,
  executeSaveStoryLoreEntity,
  executeBulkLinkStoryLore,
  executeBulkUnlinkStoryLore,
  executeDeleteStoryLoreEntity,
} from '../src/server/writer.ts'

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
