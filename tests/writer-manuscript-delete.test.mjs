import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  executeDeleteWriterWork,
} from '../src/server/writer.ts'

test('Writer Manuscript Deletion: Validates required workId and authentication', async () => {
  await assert.rejects(
    async () => {
      await executeDeleteWriterWork({
        workId: '',
        clerkUserId: 'user_author123',
      })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      await executeDeleteWriterWork({
        workId: '00000000-0000-0000-0000-000000000001',
        clerkUserId: '',
      })
    },
    { message: /User authentication required/ }
  )
})

test('Writer Manuscript Deletion: Rejects deletion if manuscript not found', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-author-1', clerk_user_id: 'user_author123' },
              }),
            }),
          }),
        }
      }
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }
      }
      return {}
    },
  }

  await assert.rejects(
    async () => {
      await executeDeleteWriterWork(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          clerkUserId: 'user_author123',
        },
        fakeAdmin,
        async () => ({ userId: 'user_author123' })
      )
    },
    { message: /Manuscript not found/ }
  )
})

test('Writer Manuscript Deletion: Rejects deletion if caller is not manuscript author', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-attacker', clerk_user_id: 'user_attacker' },
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
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  title: 'Author 1 Story',
                  slug: 'author-1-story',
                  author_id: 'prof-real-author',
                },
              }),
            }),
          }),
        }
      }
      return {}
    },
  }

  await assert.rejects(
    async () => {
      await executeDeleteWriterWork(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          clerkUserId: 'user_attacker',
        },
        fakeAdmin,
        async () => ({ userId: 'user_attacker' })
      )
    },
    { message: /Unauthorized: You can only delete your own manuscripts/ }
  )
})

test('Writer Manuscript Deletion: Author successfully deletes own manuscript', async () => {
  let deletedWorkId = null
  let deletedAuthorId = null

  const fakeAdmin = {
    from(table) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'prof-real-author', clerk_user_id: 'user_real_author' },
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
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  title: 'My Masterpiece',
                  slug: 'my-masterpiece',
                  author_id: 'prof-real-author',
                },
              }),
            }),
          }),
          delete: () => ({
            eq: (col1, val1) => ({
              eq: (col2, val2) => {
                if (col1 === 'id') deletedWorkId = val1
                if (col2 === 'author_id') deletedAuthorId = val2
                return { error: null }
              },
            }),
          }),
        }
      }
      return {}
    },
  }

  const result = await executeDeleteWriterWork(
    {
      workId: '00000000-0000-0000-0000-000000000001',
      clerkUserId: 'user_real_author',
    },
    fakeAdmin,
    async () => ({ userId: 'user_real_author' })
  )

  assert.equal(result.success, true)
  assert.equal(result.deletedWorkId, '00000000-0000-0000-0000-000000000001')
  assert.equal(result.deletedTitle, 'My Masterpiece')
  assert.equal(deletedWorkId, '00000000-0000-0000-0000-000000000001')
  assert.equal(deletedAuthorId, 'prof-real-author')
})

test('Writer Manuscript Deletion UI Invariants: write.manage and write.index', async () => {
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )
  const indexFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.index.tsx'),
    'utf-8'
  )

  // 1. write.manage must import deleteWriterWorkServerFn
  assert.ok(
    manageFile.includes('deleteWriterWorkServerFn'),
    'write.manage.$workId must import and use deleteWriterWorkServerFn'
  )

  // 2. write.manage must have Danger Zone & confirmation modal
  assert.ok(
    manageFile.includes('Danger Zone: Delete Manuscript'),
    'write.manage.$workId must render a dedicated Danger Zone card'
  )
  assert.ok(
    manageFile.includes('Delete Manuscript?'),
    'write.manage.$workId must render a deletion confirmation modal'
  )
  assert.ok(
    manageFile.includes('Permanently Delete'),
    'write.manage.$workId must render a permanent deletion action button'
  )

  // 3. write.index must import deleteWriterWorkServerFn and have delete modal
  assert.ok(
    indexFile.includes('deleteWriterWorkServerFn'),
    'write.index must import and use deleteWriterWorkServerFn'
  )
  assert.ok(
    indexFile.includes('Delete Story'),
    'write.index must offer a Delete Story button on cards'
  )
})
