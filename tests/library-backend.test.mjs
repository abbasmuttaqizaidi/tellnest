import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  projectToCompactLibraryWork,
  executeGetCompactLibraryWorks,
  executeGetLibraryWorkDetail,
} from '../src/server/library.ts'

test('Library Backend: projectToCompactLibraryWork strictly retains only required compact fields', () => {
  const rawData = {
    id: 'work-123',
    slug: 'the-whispering-gallery',
    title: 'The Whispering Gallery',
    cover_image_path: '/covers/gallery.webp',
    chapters_count: 8,
    author: {
      display_name: 'Arthur Pendelton',
      bio: 'A reclusive author of chamber mysteries',
    },
    genre: 'Mystery & Thriller',
    description: 'This is a secret draft description that should be excluded from compact list',
    extraSensoryData: 'Unnecessary payload',
    internalMetrics: 9999,
  }

  const compact = projectToCompactLibraryWork(rawData)

  // Verify required fields
  assert.equal(compact.id, 'work-123')
  assert.equal(compact.slug, 'the-whispering-gallery')
  assert.equal(compact.title, 'The Whispering Gallery')
  assert.equal(compact.cover, '/covers/gallery.webp')
  assert.equal(compact.chaptersCount, 8)
  assert.equal(compact.authorName, 'Arthur Pendelton')
  assert.equal(compact.genre, 'Mystery & Thriller')

  // Verify that extraneous fields are NOT present in the compact object
  const keys = Object.keys(compact)
  assert.deepEqual(keys.sort(), ['authorName', 'chaptersCount', 'cover', 'genre', 'id', 'slug', 'title'].sort())
  assert.equal(compact.description, undefined)
  assert.equal(compact.extraSensoryData, undefined)
  assert.equal(compact.internalMetrics, undefined)
})

test('Library Backend: executeGetCompactLibraryWorks maps DB query rows correctly', async () => {
  const mockDbRows = [
    {
      id: 'db-1',
      slug: 'shadow-river',
      title: 'Shadow River',
      cover: '/covers/shadow.webp',
      chaptersCount: 14,
      authorName: 'Elena Rostova',
      genre: 'Gothic Fiction',
    },
  ]

  const result = await executeGetCompactLibraryWorks({
    queryRows: async () => mockDbRows,
  })

  assert.equal(result.length, 1)
  assert.equal(result[0].title, 'Shadow River')
  assert.equal(result[0].authorName, 'Elena Rostova')
  assert.equal(result[0].chaptersCount, 14)
  assert.equal(result[0].genre, 'Gothic Fiction')
})

test('Library Backend: executeGetCompactLibraryWorks falls back gracefully to platform catalog', async () => {
  const result = await executeGetCompactLibraryWorks({
    queryRows: async () => [],
  })

  assert.ok(result.length > 0, 'Should fall back to platform catalog')
  assert.ok(result[0].title, 'Should have title')
  assert.ok(result[0].authorName, 'Should have authorName')
  assert.ok(result[0].genre, 'Should have genre')
})

test('Library Backend (Least Data Optimization): executeGetCompactLibraryWorks returns [] immediately when workIds is empty', async () => {
  let queryRowsCalled = false
  const result = await executeGetCompactLibraryWorks({
    workIds: [],
    queryRows: async () => {
      queryRowsCalled = true
      return []
    },
  })

  assert.deepEqual(result, [], 'Must return empty array')
  assert.equal(queryRowsCalled, false, 'Must NOT query database when target shelf is empty')
})

test('Library Backend (Least Data Optimization): executeGetCompactLibraryWorks passes workIds to queryRows', async () => {
  let capturedIds = null
  const mockRows = [
    {
      id: 'target-1',
      slug: 'targeted-story',
      title: 'Targeted Story',
      cover: '/covers/targeted.webp',
      chaptersCount: 3,
      authorName: 'Targeted Author',
      genre: 'Speculative',
    },
  ]

  const result = await executeGetCompactLibraryWorks({
    workIds: ['target-1'],
    queryRows: async (ids) => {
      capturedIds = ids
      return mockRows
    },
  })

  assert.deepEqual(capturedIds, ['target-1'])
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'target-1')
  assert.equal(result[0].title, 'Targeted Story')
})

test('Library Backend: executeGetLibraryWorkDetail fetches full story details for drawer', async () => {
  const mockDbWork = {
    id: 'db-work-456',
    slug: 'a-winter-in-kyoto',
    title: 'A Winter in Kyoto',
    description: 'Snow falls gently over traditional wooden machiya houses.',
    cover: '/covers/kyoto.webp',
    status: 'Ongoing',
    chaptersCount: 12,
    readingTimeMinutes: 45,
    totalReads: 5200,
    authorName: 'Kenji Takahashi',
    authorId: 'auth-99',
    authorAvatar: '/avatars/kenji.webp',
    authorBio: 'Writer based in Kansai.',
    category: 'Novels',
    genre: 'Literary Fiction',
    firstChapterId: 'ch-kyoto-1',
  }

  const detail = await executeGetLibraryWorkDetail('a-winter-in-kyoto', {
    findDbWork: async () => mockDbWork,
  })

  assert.ok(detail, 'Work detail must be resolved')
  assert.equal(detail.id, 'db-work-456')
  assert.equal(detail.title, 'A Winter in Kyoto')
  assert.equal(detail.author.name, 'Kenji Takahashi')
  assert.equal(detail.description, 'Snow falls gently over traditional wooden machiya houses.')
  assert.equal(detail.category, 'Novels')
  assert.equal(detail.genre, 'Literary Fiction')
  assert.equal(detail.firstChapterId, 'ch-kyoto-1')
})

test('Library Backend: executeGetLibraryWorkDetail falls back gracefully to catalog when work not in DB', async () => {
  const detail = await executeGetLibraryWorkDetail('a-winter-in-kyoto')

  assert.ok(detail, 'Should resolve catalog work')
  assert.equal(detail.title, 'A Winter in Kyoto')
  assert.ok(detail.author.name, 'Author name present')
  assert.ok(detail.description, 'Description present')
})
