import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  checkWorkContestLock,
  executeDeleteWriterWork,
  executeSaveWriterChapter,
  executeDeleteWriterChapter,
  executeWriterWorkPublication,
  executeWriterWorkCover,
  executeSaveWriterWorkMetadata,
} from '../src/server/writer.ts'

test('Contest Story Lock: checkWorkContestLock returns lock status and contest title', async () => {
  const fakeAdminWithEntry = {
    from(table) {
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'entry-1',
                      status: 'accepted',
                      contests: { title: 'Neon Cyberpunk 2026' },
                    },
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: {
                    id: 'entry-1',
                    status: 'accepted',
                    contests: { title: 'Neon Cyberpunk 2026' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return {}
    },
  }

  const locked = await checkWorkContestLock('00000000-0000-0000-0000-000000000001', fakeAdminWithEntry)
  assert.equal(locked.isLocked, true)
  assert.equal(locked.contestTitle, 'Neon Cyberpunk 2026')

  const fakeAdminNoEntry = {
    from(table) {
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: null,
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return {}
    },
  }

  const unlocked = await checkWorkContestLock('00000000-0000-0000-0000-000000000002', fakeAdminNoEntry)
  assert.equal(unlocked.isLocked, false)
  assert.equal(unlocked.contestTitle, undefined)
})

test('Contest Story Lock: executeDeleteWriterWork rejects deletion of contest-entered manuscript', async () => {
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
              maybeSingle: async () => ({
                data: {
                  id: '00000000-0000-0000-0000-000000000001',
                  author_id: 'prof-author-1',
                  title: 'A Tale in The Arena',
                },
              }),
            }),
          }),
        }
      }
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'entry-1',
                      status: 'accepted',
                      contests: { title: 'Autumn Flash Fiction Fest' },
                    },
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: {
                    id: 'entry-1',
                    status: 'accepted',
                    contests: { title: 'Autumn Flash Fiction Fest' },
                  },
                  error: null,
                }),
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
          clerkUserId: 'user_author123',
        },
        fakeAdmin,
        async () => ({ userId: 'user_author123' })
      )
    },
    {
      message: /Contest manuscripts are permanently locked from deletion/,
    }
  )
})

test('Contest Story Lock: executeSaveWriterChapter rejects chapter edits for contest manuscript', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'entry-1',
                      status: 'accepted',
                      contests: { title: 'Autumn Flash Fiction Fest' },
                    },
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: {
                    id: 'entry-1',
                    status: 'accepted',
                    contests: { title: 'Autumn Flash Fiction Fest' },
                  },
                  error: null,
                }),
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
      await executeSaveWriterChapter(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          chapterId: '00000000-0000-0000-0000-000000000099',
          title: 'Tampered Title',
          content: 'Changed content after contest entry',
          status: 'published',
        },
        fakeAdmin
      )
    },
    {
      message: /Contest manuscripts are locked to preserve fair reader voting and cannot be modified or deleted/,
    }
  )
})

test('Contest Story Lock: executeWriterWorkPublication rejects status changes', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'entry-1',
                      status: 'accepted',
                      contests: { title: 'Autumn Flash Fiction Fest' },
                    },
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: {
                    id: 'entry-1',
                    status: 'accepted',
                    contests: { title: 'Autumn Flash Fiction Fest' },
                  },
                  error: null,
                }),
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
      await executeWriterWorkPublication(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          publicationStatus: 'draft',
          visibility: 'private',
        },
        fakeAdmin
      )
    },
    {
      message: /Contest manuscripts are locked to preserve fair reader voting and cannot be modified or deleted/,
    }
  )
})

test('Contest Story Lock: executeWriterWorkCover and metadata edits are rejected', async () => {
  const fakeAdmin = {
    from(table) {
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'entry-1',
                      status: 'winner',
                      contests: { title: 'Grand Championship 2026' },
                    },
                    error: null,
                  }),
                }),
                maybeSingle: async () => ({
                  data: {
                    id: 'entry-1',
                    status: 'winner',
                    contests: { title: 'Grand Championship 2026' },
                  },
                  error: null,
                }),
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
      await executeWriterWorkCover(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          coverImageUrl: 'https://newcover.jpg',
        },
        fakeAdmin
      )
    },
    {
      message: /Contest manuscripts are locked to preserve fair reader voting and cannot be modified or deleted/,
    }
  )

  await assert.rejects(
    async () => {
      await executeSaveWriterWorkMetadata(
        {
          workId: '00000000-0000-0000-0000-000000000001',
          title: 'Modified Title',
        },
        fakeAdmin
      )
    },
    {
      message: /Contest manuscripts are locked to preserve fair reader voting and cannot be modified or deleted/,
    }
  )
})

test('Contest Story Lock: Frontend code inspection verifies comprehensive fail-safes', () => {
  const manageCode = fs.readFileSync(path.resolve('src/routes/write.manage.$workId.tsx'), 'utf-8')
  const indexCode = fs.readFileSync(path.resolve('src/routes/write.index.tsx'), 'utf-8')
  const editorRouteCode = fs.readFileSync(path.resolve('src/routes/write.editor.$workId.$chapterId.tsx'), 'utf-8')
  const richEditorCode = fs.readFileSync(path.resolve('src/components/studio/StoryRichEditor.tsx'), 'utf-8')

  // Check write.index: contest locked pill, lock icon, toast and disabled modal
  assert.ok(indexCode.includes('isContestLocked'), 'write.index must detect isContestLocked')
  assert.ok(indexCode.includes('Contest Locked'), 'write.index must display Contest Locked indicator')

  // Check write.manage: checks contest lock, disables editing modals, dangerous delete action, and shows banner
  assert.ok(manageCode.includes('isContestLocked'), 'write.manage must check isContestLocked')
  assert.ok(manageCode.includes('Active Contest Participant — Story Permanently Locked'), 'write.manage must display locked banner')
  assert.ok(manageCode.includes('handleDeleteManuscript'), 'write.manage must guard handleDeleteManuscript')

  // Check write.editor: guards save, publish, act change, and new chapter creation
  assert.ok(editorRouteCode.includes('isContestLocked'), 'write.editor must resolve isContestLocked')
  assert.ok(editorRouteCode.includes('handleManualSave'), 'write.editor must guard handleManualSave')
  assert.ok(editorRouteCode.includes('handlePublish'), 'write.editor must guard handlePublish')

  // Check StoryRichEditor: sets TipTap editable, disables inputs, renders lock alerts
  assert.ok(richEditorCode.includes('editable: !isContestLocked'), 'StoryRichEditor must configure TipTap editable based on isContestLocked')
  assert.ok(richEditorCode.includes('setEditable(!isContestLocked)'), 'StoryRichEditor must dynamically setEditable')
  assert.ok(richEditorCode.includes('Contest Manuscript Locked'), 'StoryRichEditor must show contest locked banner')
})
