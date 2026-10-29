import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { executeSaveWriterWorkMetadata } from '../src/server/writer.ts'

test('Writer Manuscript Editing: executeSaveWriterWorkMetadata updates all metadata fields', async () => {
  const existingWork = {
    id: 'work-uuid-1234-5678-9012-345678901234',
    author_id: 'author-123',
    title: 'Original Title',
    slug: 'original-title-abcde',
    description: 'Original synopsis',
    cover_image_path: '/original-cover.webp',
    language: 'English',
    status: 'ongoing',
    visibility: 'draft',
    publication_status: 'draft',
    content_rating: 'general',
    content_warning_required: false,
    category_id: 'cat-1',
  }

  const updatedRecords = {
    works: [],
    deletedWorkGenres: [],
    insertedWorkGenres: [],
    deletedWorkTags: [],
    insertedWorkTags: [],
    insertedTags: [],
  }

  const mockAdmin = {
    from: (table) => {
      return {
        select: (cols) => {
          return {
            eq: (field, val) => ({
              maybeSingle: async () => {
                if (table === 'works') {
                  return { data: { ...existingWork }, error: null }
                }
                if (table === 'categories') {
                  return { data: { id: 'cat-sci-fi', name: 'Novels', slug: 'novels' }, error: null }
                }
                return { data: null, error: null }
              },
            }),
            ilike: (field, val) => ({
              maybeSingle: async () => {
                if (table === 'categories') {
                  return { data: { id: 'cat-novels', name: 'Novels' }, error: null }
                }
                if (table === 'genres') {
                  return { data: { id: 'genre-sci-fi', name: 'Science Fiction' }, error: null }
                }
                return { data: null, error: null }
              },
            }),
            or: (filterStr) => ({
              maybeSingle: async () => {
                if (table === 'tags') {
                  if (filterStr.includes('cyberpunk')) {
                    return { data: { id: 'tag-cyberpunk', name: 'Cyberpunk', slug: 'cyberpunk' }, error: null }
                  }
                  return { data: null, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }
        },
        delete: () => ({
          eq: (field, val) => {
            if (table === 'work_genres') updatedRecords.deletedWorkGenres.push({ field, val })
            if (table === 'work_tags') updatedRecords.deletedWorkTags.push({ field, val })
            return Promise.resolve({ error: null })
          },
        }),
        insert: (payload) => {
          if (table === 'work_genres') updatedRecords.insertedWorkGenres.push(payload)
          if (table === 'work_tags') updatedRecords.insertedWorkTags.push(payload)
          if (table === 'tags') {
            updatedRecords.insertedTags.push(payload)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: { id: 'tag-new-' + payload.slug, ...payload }, error: null }),
              }),
            }
          }
          return Promise.resolve({ error: null })
        },
        update: (payload) => ({
          eq: (field, val) => ({
            select: () => ({
              single: async () => {
                const merged = { ...existingWork, ...payload }
                updatedRecords.works.push(merged)
                return { data: merged, error: null }
              },
            }),
          }),
        }),
      }
    },
  }

  const result = await executeSaveWriterWorkMetadata(
    {
      workId: existingWork.id,
      title: 'New Futuristic Saga',
      subtitle: 'A thrilling chronicle of deep space',
      description: 'An updated epic synopsis of intergalactic survival.',
      categoryName: 'Novels',
      genreName: 'Science Fiction',
      cover: 'https://res.cloudinary.com/demo/image/upload/sample.webp',
      tags: ['Cyberpunk', 'Space-Opera'],
      language: 'English',
      status: 'Completed',
      visibility: 'Public',
      publicationStatus: 'Published',
      isMature: true,
    },
    mockAdmin
  )

  // 1. Verify result properties
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.title, 'New Futuristic Saga')
  assert.strictEqual(result.subtitle, 'A thrilling chronicle of deep space')
  assert.strictEqual(result.description, 'An updated epic synopsis of intergalactic survival.')
  assert.strictEqual(result.status, 'Completed')
  assert.strictEqual(result.visibility, 'Public')
  assert.strictEqual(result.isMature, true)
  assert.strictEqual(result.cover, 'https://res.cloudinary.com/demo/image/upload/sample.webp')

  // 2. Verify work_genres junction was refreshed
  assert.ok(updatedRecords.deletedWorkGenres.length > 0, 'work_genres must be cleared before re-assigning')
  assert.ok(
    updatedRecords.insertedWorkGenres.some((g) => g.genre_id === 'genre-sci-fi'),
    'work_genres must have the new genre assigned'
  )

  // 3. Verify work_tags junction and missing tag insertion
  assert.ok(updatedRecords.deletedWorkTags.length > 0, 'work_tags must be cleared before re-assigning')
  assert.ok(
    updatedRecords.insertedTags.some((t) => t.slug === 'space-opera'),
    'New tag Space-Opera must be inserted into tags table'
  )
})

test('Writer Manuscript Editing: Validates required fields fail-closed', async () => {
  await assert.rejects(
    async () => {
      await executeSaveWriterWorkMetadata({
        workId: '',
        title: 'Valid Title',
      })
    },
    { message: /Work ID is required/ }
  )

  await assert.rejects(
    async () => {
      await executeSaveWriterWorkMetadata({
        workId: 'work-123',
        title: '   ',
      })
    },
    { message: /Manuscript title is required/ }
  )
})

test('Writer Manuscript Editing UI Invariants: write.manage and write.new', async () => {
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )
  const newWorkFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.new.tsx'),
    'utf-8'
  )
  const writerServerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/writer.ts'),
    'utf-8'
  )

  // 1. Verify write.manage contains Edit Details button
  assert.ok(
    manageFile.includes('openEditStoryModal'),
    'write.manage must implement openEditStoryModal trigger'
  )
  assert.ok(
    manageFile.includes('Edit Details'),
    'write.manage must display Edit Details action button'
  )

  // 2. Verify write.manage contains comprehensive Edit Manuscript Details Modal
  assert.ok(
    manageFile.includes('Edit Manuscript Details'),
    'write.manage must feature Edit Manuscript Details modal title'
  )
  assert.ok(
    manageFile.includes('handleSaveStoryDetails'),
    'write.manage must handle form submission via handleSaveStoryDetails'
  )
  assert.ok(
    manageFile.includes('updateWriterWorkMetadataServerFn'),
    'write.manage must submit updates through updateWriterWorkMetadataServerFn'
  )

  // 3. Verify all manuscript creation fields are present in the edit modal:
  assert.ok(manageFile.includes('editTitle'), 'Modal must have editable title')
  assert.ok(manageFile.includes('editSubtitle'), 'Modal must have editable subtitle')
  assert.ok(manageFile.includes('editDescription'), 'Modal must have editable synopsis / description')
  assert.ok(manageFile.includes('editCategory'), 'Modal must have editable category')
  assert.ok(manageFile.includes('editGenre'), 'Modal must have editable primary genre')
  assert.ok(manageFile.includes('editTags'), 'Modal must have editable thematic tags')
  assert.ok(manageFile.includes('editCover'), 'Modal must have editable cover artwork')
  assert.ok(manageFile.includes('editLanguage'), 'Modal must have editable manuscript language')
  assert.ok(manageFile.includes('editStatus'), 'Modal must have editable serialization status')
  assert.ok(manageFile.includes('editVisibility'), 'Modal must have editable catalog visibility')
  assert.ok(manageFile.includes('editIsMature'), 'Modal must have editable mature rating flag')

  // 4. Verify hero card showcases category, genre, mature flag, and synopsis
  assert.ok(
    manageFile.includes('work.genre'),
    'Hero card must display work.genre pill'
  )
  assert.ok(
    manageFile.includes('18+ Mature'),
    'Hero card must display 18+ Mature badge when isMature is true'
  )
  assert.ok(
    manageFile.includes('work.synopsis || work.description'),
    'Hero card must display manuscript synopsis preview'
  )

  // 5. Verify write.new passes isMature to createWriterWorkServerFn
  assert.ok(
    newWorkFile.includes('isMature'),
    'write.new must include isMature in createWriterWorkServerFn payload'
  )

  // 6. Verify getWriterWorkDetailsServerFn in writer.ts queries work_genres and work_tags
  assert.ok(
    writerServerFile.includes('work_genres(genres(id, name, slug))'),
    'getWriterWorkDetailsServerFn must fetch work_genres from database'
  )
  assert.ok(
    writerServerFile.includes('work_tags(tags(id, name, slug))'),
    'getWriterWorkDetailsServerFn must fetch work_tags from database'
  )
})
