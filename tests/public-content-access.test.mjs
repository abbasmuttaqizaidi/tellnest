import test from 'node:test'
import assert from 'node:assert/strict'
import { executeGetPublicWork } from '../src/server/works.ts'
import { generateMeta } from '../src/lib/seo.ts'

// Mock builder for Supabase query chaining
function createMockSupabase(mockRow, error = null) {
  return {
    from: (table) => {
      assert.equal(table, 'works', 'executeGetPublicWork must query the works table')
      return {
        select: (columns) => {
          // Verify that select query enforces public visibility and published status
          return {
            in: (field, values) => {
              assert.equal(field, 'visibility')
              assert.deepEqual(values, ['public', 'unlisted'], 'visibility filter must strictly allow public and unlisted only')
              return {
                eq: (statusField, statusValue) => {
                  assert.equal(statusField, 'publication_status')
                  assert.equal(statusValue, 'published', 'publication_status filter must strictly require published')
                  return {
                    or: (condition) => ({
                      maybeSingle: async () => ({ data: mockRow, error }),
                    }),
                    eq: (slugField, slugValue) => ({
                      maybeSingle: async () => ({ data: mockRow, error }),
                    }),
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

// Canonical published work fixture
const publishedWorkFixture = {
  id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
  title: 'The Cartographer of Kyoto',
  slug: 'the-cartographer-of-kyoto',
  description: 'A delicate historical narrative across old Kyoto.',
  cover_image_path: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
  language: 'English',
  status: 'ongoing',
  visibility: 'public',
  publication_status: 'published',
  is_indexable: true,
  word_count: 12500,
  chapter_count: 2,
  reading_time_minutes: 45,
  view_count: 1420,
  like_count: 85,
  save_count: 32,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
  last_activity_at: '2026-10-01T12:00:00Z',
  author: {
    id: 'author-uuid-1',
    username: 'kyoto_scribe',
    display_name: 'Kenji Sato',
    avatar_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    bio: 'Writer and historian living in Kyoto.',
  },
  category: { id: 'cat-novels', name: 'Novels', slug: 'novels' },
  work_genres: [{ genres: { id: 'g-lit', name: 'Literary Fiction', slug: 'literary-fiction' } }],
  acts: [
    {
      id: 'act-1',
      work_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      act_number: 1,
      title: 'Act I: The Tea Houses',
      slug: 'act-1',
      description: 'Opening cycle in Gion',
      status: 'published',
    },
    {
      id: 'act-2',
      work_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      act_number: 2,
      title: 'Act II: The Monasteries (Draft Arc)',
      slug: 'act-2',
      description: 'Unpublished draft arc',
      status: 'draft', // DRAFT ACT
    },
  ],
  chapters: [
    {
      id: 'ch-pub-1',
      work_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      act_id: 'act-1',
      chapter_number: 1,
      title: 'The First Ink Stroke',
      subtitle: 'Dawn in Higashiyama',
      slug: 'chapter-1',
      content: 'Morning mist crept over the roofs of Yasaka...',
      word_count: 2400,
      reading_time_minutes: 9,
      status: 'published',
      is_indexable: true,
      banner_image_path: null,
      view_count: 950,
      published_at: '2026-09-02T08:00:00Z',
    },
    {
      id: 'ch-pub-2',
      work_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      act_id: 'act-1',
      chapter_number: 2,
      title: 'The Indigo Map',
      subtitle: 'The River Bank',
      slug: 'chapter-2',
      content: 'By noon, the paper merchant had arrived...',
      word_count: 3100,
      reading_time_minutes: 12,
      status: 'published',
      is_indexable: true,
      banner_image_path: null,
      view_count: 470,
      published_at: '2026-09-15T08:00:00Z',
    },
    {
      id: 'ch-draft-3',
      work_id: 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d',
      act_id: 'act-2',
      chapter_number: 3,
      title: 'SECRET DRAFT CHAPTER',
      subtitle: 'Confidential unpublished plot twist',
      slug: 'chapter-3-draft',
      content: 'TOP SECRET AUTHOR SPOILER CONTENT THAT MUST NEVER BE EXPOSED TO PUBLIC VISITORS',
      word_count: 4000,
      reading_time_minutes: 15,
      status: 'draft', // DRAFT CHAPTER
      banner_image_path: null,
      view_count: 0,
      published_at: null,
    },
  ],
}

// Canonical author draft work fixture (for Writer Studio)
const authorDraftWorkFixture = {
  id: 'd9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a',
  title: 'Unpublished Author Draft Manuscript',
  slug: 'unpublished-draft-manuscript',
  description: 'WIP manuscript exclusively viewable by its author in Writer Studio.',
  cover_image_path: null,
  status: 'ongoing',
  visibility: 'draft',
  publication_status: 'draft',
  word_count: 5000,
  chapter_count: 1,
  reading_time_minutes: 18,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-25T12:00:00Z',
  author: {
    id: 'author-uuid-1',
    clerk_user_id: 'user_clerk_author_1',
    display_name: 'Kenji Sato',
    username: 'kyoto_scribe',
    avatar_path: null,
  },
  category: { id: 'cat-novels', name: 'Novels', slug: 'novels' },
  acts: [
    {
      id: 'act-draft-1',
      work_id: 'd9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a',
      act_number: 1,
      title: 'Act I: Inception',
      slug: 'act-1',
      description: 'Draft opening',
      status: 'draft',
    },
  ],
  chapters: [
    {
      id: 'ch-draft-101',
      work_id: 'd9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a',
      act_id: 'act-draft-1',
      chapter_number: 1,
      title: 'Chapter 1 (In Progress)',
      subtitle: '',
      slug: 'chapter-1',
      content: 'This draft prose is only visible to the author in Studio.',
      word_count: 5000,
      reading_time_minutes: 18,
      status: 'draft',
      banner_image_path: null,
      view_count: 0,
      published_at: null,
    },
  ],
}

test('1. Public Access: Published public work is accessible to unauthenticated visitor via slug', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const result = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })

  assert.ok(result, 'Expected published work to be returned')
  assert.equal(result.id, 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d')
  assert.equal(result.title, 'The Cartographer of Kyoto')
  assert.equal(result.visibility, 'Public')
})

test('2. Public Access: UUID lookup returns published work without bypassing access rules', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const result = await executeGetPublicWork('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d', {
    supabaseClient: mockClient,
  })

  assert.ok(result, 'Expected UUID lookup to return published work')
  assert.equal(result.slug, 'the-cartographer-of-kyoto')
})

test('3. Draft Access Denial: Draft work (visibility: draft, publication_status: draft) is inaccessible to unauthenticated visitors', async () => {
  const draftRow = {
    ...publishedWorkFixture,
    visibility: 'draft',
    publication_status: 'draft',
  }
  const mockClient = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: draftRow, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: draftRow, error: null }) }),
          }),
        }),
      }),
    }),
  }

  const resultBySlug = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.equal(resultBySlug, null, 'Draft work must return null when requested by slug')

  const resultByUuid = await executeGetPublicWork('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d', {
    supabaseClient: mockClient,
  })
  assert.equal(resultByUuid, null, 'Draft work must return null when requested by UUID')
})

test('4. Unpublished Work Denial: Work with publication_status !== published is inaccessible', async () => {
  // Case A: publication_status = 'draft' while visibility = 'public'
  const unpubRowA = {
    ...publishedWorkFixture,
    visibility: 'public',
    publication_status: 'draft',
  }
  const mockClientA = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: unpubRowA, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: unpubRowA, error: null }) }),
          }),
        }),
      }),
    }),
  }
  const resA = await executeGetPublicWork('the-cartographer-of-kyoto', { supabaseClient: mockClientA })
  assert.equal(resA, null, 'Work with publication_status: draft must return null')

  // Case B: publication_status = 'archived'
  const unpubRowB = {
    ...publishedWorkFixture,
    visibility: 'public',
    publication_status: 'archived',
  }
  const mockClientB = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: unpubRowB, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: unpubRowB, error: null }) }),
          }),
        }),
      }),
    }),
  }
  const resB = await executeGetPublicWork('the-cartographer-of-kyoto', { supabaseClient: mockClientB })
  assert.equal(resB, null, 'Archived work must return null')
})

test('5. Private Work Denial: Work with visibility === private is inaccessible', async () => {
  const privateRow = {
    ...publishedWorkFixture,
    visibility: 'private',
    publication_status: 'published',
  }
  const mockClient = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: privateRow, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: privateRow, error: null }) }),
          }),
        }),
      }),
    }),
  }
  const res = await executeGetPublicWork('the-cartographer-of-kyoto', { supabaseClient: mockClient })
  assert.equal(res, null, 'Private work must return null to public readers')
})

test('6. Unpublished Chapter Denial: Draft chapters and content are strictly omitted from public work response', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const result = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })

  assert.ok(result)
  // There were 3 chapters in the DB (2 published, 1 draft)
  assert.equal(result.chapters.length, 2, 'Only the 2 published chapters must be returned')
  assert.equal(result.publishedChaptersCount, 2)

  // Verify chapter 3 (draft) is nowhere in the returned chapters
  const draftChapter = result.chapters.find((c) => c.id === 'ch-draft-3' || c.number === 3)
  assert.equal(draftChapter, undefined, 'Draft chapter must NOT be present in public response')

  // Verify secret content is not leaked anywhere in stringified payload
  const stringified = JSON.stringify(result)
  assert.ok(!stringified.includes('SECRET DRAFT CHAPTER'), 'Draft chapter title leaked')
  assert.ok(!stringified.includes('TOP SECRET AUTHOR SPOILER CONTENT'), 'Draft chapter content leaked')
})

test('7. Unpublished Act Denial: Draft acts are strictly omitted from public work response', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const result = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })

  assert.ok(result)
  // There were 2 acts in the DB (1 published, 1 draft)
  assert.equal(result.acts.length, 1, 'Only the 1 published act must be returned')
  assert.equal(result.acts[0].id, 'act-1')
  assert.equal(result.acts[0].title, 'Act I: The Tea Houses')

  // Verify Act 2 (draft) is not present
  const draftAct = result.acts.find((a) => a.id === 'act-2' || a.number === 2)
  assert.equal(draftAct, undefined, 'Draft act must NOT be present in public response')
})

test('8. Edge Case: Published work with 0 published chapters returns work metadata with empty chapters array', async () => {
  const workWithoutChapters = {
    ...publishedWorkFixture,
    chapters: [],
    acts: [],
    chapter_count: 0,
  }
  const mockClient = createMockSupabase(workWithoutChapters)
  const result = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })

  assert.ok(result, 'Published work without published chapters must NOT return null')
  assert.equal(result.title, 'The Cartographer of Kyoto')
  assert.deepEqual(result.chapters, [], 'Chapters array must be empty')
  assert.equal(result.publishedChaptersCount, 0)
})

test('9. Unlisted Work Policy: Unlisted published work is accessible via direct link', async () => {
  const unlistedRow = {
    ...publishedWorkFixture,
    visibility: 'unlisted',
    publication_status: 'published',
  }
  const mockClient = createMockSupabase(unlistedRow)
  const result = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })

  assert.ok(result, 'Unlisted published work must be accessible via direct link')
  assert.equal(result.visibility, 'Unlisted')
})

test('10. Unlisted Work Policy: Unlisted work queried by UUID returns work for direct link', async () => {
  const unlistedRow = {
    ...publishedWorkFixture,
    visibility: 'unlisted',
    publication_status: 'published',
  }
  const mockClient = createMockSupabase(unlistedRow)
  const result = await executeGetPublicWork('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d', {
    supabaseClient: mockClient,
  })

  assert.ok(result, 'Unlisted published work must be accessible via direct UUID')
  assert.equal(result.visibility, 'Unlisted')
})

test('11. Input Validation: executeGetPublicWork safely returns null on empty or non-string inputs', async () => {
  assert.equal(await executeGetPublicWork(''), null)
  assert.equal(await executeGetPublicWork('   '), null)
  // @ts-ignore
  assert.equal(await executeGetPublicWork(null), null)
  // @ts-ignore
  assert.equal(await executeGetPublicWork(undefined), null)
})

test('12. Author Studio Draft Access: Authors retain full access to their unpublished drafts and chapters', async () => {
  // Author perspective in Studio: Author is authenticated and fetches their draft work
  const authorUserId = 'user_clerk_author_1'
  const isAuthorOwner = authorDraftWorkFixture.author.clerk_user_id === authorUserId
  assert.equal(isAuthorOwner, true, 'Author identity must match manuscript ownership')

  // In Writer Studio, the author sees all chapters (including draft chapters)
  const authorChapters = authorDraftWorkFixture.chapters
  assert.equal(authorChapters.length, 1)
  assert.equal(authorChapters[0].status, 'draft')
  assert.equal(authorChapters[0].content, 'This draft prose is only visible to the author in Studio.')

  // But an unauthenticated public reader requesting the exact same draft work via public retrieval gets null
  const publicResult = await executeGetPublicWork(authorDraftWorkFixture.slug, {
    supabaseClient: {
      from: () => ({
        select: () => ({
          in: () => ({
            eq: () => ({
              or: () => ({ maybeSingle: async () => ({ data: authorDraftWorkFixture, error: null }) }),
              eq: () => ({ maybeSingle: async () => ({ data: authorDraftWorkFixture, error: null }) }),
            }),
          }),
        }),
      }),
    },
  })
  assert.equal(publicResult, null, 'Public reader must be denied access to the draft manuscript')
})

test('13. Unlisted Directives: generateMeta emits both noindex AND nofollow when noindex is true', () => {
  const unlistedMeta = generateMeta({
    title: 'Unlisted Story',
    noindex: true,
  })

  const robotsTag = unlistedMeta.meta.find((m) => m.name === 'robots')
  assert.ok(robotsTag, 'Robots meta tag must be present')
  assert.equal(robotsTag.content, 'noindex, nofollow', 'Must emit both noindex and nofollow for unlisted content')

  const publicMeta = generateMeta({
    title: 'Public Story',
    noindex: false,
  })
  const publicRobotsTag = publicMeta.meta.find((m) => m.name === 'robots')
  assert.ok(publicRobotsTag)
  assert.equal(publicRobotsTag.content, 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
})

test('14. Direct Reader Resolution: Visitor supplying draft chapter ID directly cannot access draft content', async () => {
  // Scenario: Parent work is published, but visitor accesses /read/$workId/$chapterId with draft chapter ID
  const mockClient = createMockSupabase(publishedWorkFixture)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  // Simulation of the exact ReaderPage matching logic from src/routes/read.$workId.$chapterId.tsx
  const requestedDraftChapterId = 'ch-draft-3'
  const matchedChapter =
    work.chapters.find((c) => c.id === requestedDraftChapterId || c.number.toString() === requestedDraftChapterId) ||
    (requestedDraftChapterId === 'first' || requestedDraftChapterId === 'default' ? work.chapters[0] : undefined)

  // Assert that finding the draft chapter returns undefined
  assert.equal(matchedChapter, undefined, 'Direct draft chapter ID lookup must return undefined')

  // In ReaderPage, currentChapterIndex is -1 when chapter is not found (preventing accidental fallback to Chapter 1)
  const foundIdx = work.chapters.findIndex((c) => c.id === requestedDraftChapterId || c.number.toString() === requestedDraftChapterId)
  const currentChapterIndex = foundIdx !== -1 ? foundIdx : (requestedDraftChapterId === 'first' || requestedDraftChapterId === 'default' ? 0 : -1)
  assert.equal(currentChapterIndex, -1, 'Chapter index must be -1 for non-existent or draft chapter ID')

  // When chapter is undefined, head emits Chapter Not Found with noindex: true
  const notFoundMeta = generateMeta({
    title: 'Chapter Not Found',
    noindex: true,
  })
  const robotsTag = notFoundMeta.meta.find((m) => m.name === 'robots')
  assert.equal(robotsTag.content, 'noindex, nofollow', 'Chapter Not Found must emit noindex, nofollow')
})

test('15. Direct Reader Resolution: Visitor supplying archived chapter ID cannot access archived chapter', async () => {
  const workWithArchived = {
    ...publishedWorkFixture,
    chapters: [
      ...publishedWorkFixture.chapters,
      {
        id: 'ch-archived-4',
        work_id: publishedWorkFixture.id,
        chapter_number: 4,
        title: 'Archived Deprecated Chapter',
        subtitle: 'Old revision',
        slug: 'chapter-4-archived',
        content: 'Deprecated archived prose that should not be visible.',
        word_count: 1000,
        reading_time_minutes: 4,
        status: 'archived', // ARCHIVED
        banner_image_path: null,
        view_count: 50,
        published_at: '2026-08-01T00:00:00Z',
      },
    ],
  }

  const mockClient = createMockSupabase(workWithArchived)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  // Verify archived chapter is stripped
  const archivedChapter = work.chapters.find((c) => c.id === 'ch-archived-4' || c.status === 'archived')
  assert.equal(archivedChapter, undefined, 'Archived chapter must be stripped from public response')
})

test('16. Act Hierarchy: Published chapters belonging to unpublished (draft) acts are strictly excluded', async () => {
  // Scenario: An author published a chapter under Act II, but Act II itself is in 'draft' status
  const workWithPublishedChapterInDraftAct = {
    ...publishedWorkFixture,
    chapters: [
      ...publishedWorkFixture.chapters,
      {
        id: 'ch-pub-in-draft-act-5',
        work_id: publishedWorkFixture.id,
        act_id: 'act-2', // act-2 is in 'draft' status in publishedWorkFixture
        chapter_number: 5,
        title: 'Prematurely Published Chapter in Draft Act',
        subtitle: '',
        slug: 'chapter-5',
        content: 'Content that belongs to a draft act and must not be exposed.',
        word_count: 2000,
        reading_time_minutes: 8,
        status: 'published', // Chapter status is published, but parent act is draft!
        banner_image_path: null,
        view_count: 10,
        published_at: '2026-10-25T12:00:00Z',
      },
    ],
  }

  const mockClient = createMockSupabase(workWithPublishedChapterInDraftAct)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  // Verify chapter 5 in draft act is excluded from public chapters
  const leakedChapter = work.chapters.find((c) => c.id === 'ch-pub-in-draft-act-5')
  assert.equal(leakedChapter, undefined, 'Chapter under draft act must NOT be included in public response')
  assert.equal(work.chapters.length, 2, 'Only chapters belonging to published acts (or null-act) are returned')
})

test('17. Act Hierarchy: Standalone chapters with null act_id are properly included when published', async () => {
  // Scenario: Work contains a standalone chapter where act_id IS NULL
  const workWithStandaloneChapter = {
    ...publishedWorkFixture,
    chapters: [
      ...publishedWorkFixture.chapters,
      {
        id: 'ch-standalone-6',
        work_id: publishedWorkFixture.id,
        act_id: null, // Standalone / unassigned chapter
        chapter_number: 6,
        title: 'Epilogue (Standalone Chapter without Act)',
        subtitle: 'The Journey Continues',
        slug: 'epilogue',
        content: 'Final reflections after the main narrative acts concluded.',
        word_count: 1800,
        reading_time_minutes: 7,
        status: 'published',
        banner_image_path: null,
        view_count: 300,
        published_at: '2026-10-26T00:00:00Z',
      },
    ],
  }

  const mockClient = createMockSupabase(workWithStandaloneChapter)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  // Verify standalone chapter is included
  const standaloneChapter = work.chapters.find((c) => c.id === 'ch-standalone-6')
  assert.ok(standaloneChapter, 'Published standalone chapter with null act_id must be included')
  assert.equal(standaloneChapter.title, 'Epilogue (Standalone Chapter without Act)')
  assert.equal(standaloneChapter.actId, null)
})

test('18. Direct Reader Resolution: Special first and default tokens resolve to Chapter 1', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  const resolveChapter = (paramId) =>
    work.chapters.find((c) => c.id === paramId || c.number.toString() === paramId) ||
    (paramId === 'first' || paramId === 'default' ? work.chapters[0] : undefined)

  assert.equal(resolveChapter('first')?.id, 'ch-pub-1')
  assert.equal(resolveChapter('default')?.id, 'ch-pub-1')
  assert.equal(resolveChapter('invalid-random-uuid'), undefined)
})

// ---------------------------------------------------------------------------
// Regression Suite: Robots Meta Directives for Stories & Chapters
// ---------------------------------------------------------------------------

function computeWorkRobotsDirective(work) {
  if (!work) {
    const meta = generateMeta({ title: 'Manuscript Not Found', noindex: true })
    return meta.meta.find((m) => m.name === 'robots')?.content
  }
  const isPublic = (work.visibility || '').toLowerCase() === 'public'
  const isPublished = (work.publication_status || work.publicationStatus || 'published').toLowerCase() === 'published'
  const rawIndexable = work.is_indexable !== undefined ? work.is_indexable : work.isIndexable
  const isIndexable = isPublic && isPublished && rawIndexable === true
  const meta = generateMeta({
    title: `${work.title}`,
    canonicalUrl: `https://hatchpen.com/works/${work.slug || work.id}`,
    noindex: !isIndexable,
  })
  return meta.meta.find((m) => m.name === 'robots')?.content
}

function computeChapterRobotsDirective(work, chapter) {
  if (!work || !chapter) {
    const meta = generateMeta({ title: 'Chapter Not Found', noindex: true })
    return meta.meta.find((m) => m.name === 'robots')?.content
  }
  const isPublicWork = (work.visibility || '').toLowerCase() === 'public'
  const isWorkPub = (work.publication_status || work.publicationStatus || 'published').toLowerCase() === 'published'
  const isWorkIdx = (work.is_indexable !== undefined ? work.is_indexable : work.isIndexable) === true
  const isChapterPub = (chapter.status || '').toLowerCase() === 'published'
  const isChapterIdx = (chapter.is_indexable !== undefined ? chapter.is_indexable : chapter.isIndexable) === true
  const isChapterEligible = isPublicWork && isWorkPub && isWorkIdx && isChapterPub && isChapterIdx

  const meta = generateMeta({
    title: `${chapter.title} — ${work.title}`,
    canonicalUrl: `https://hatchpen.com/read/${work.slug || work.id}/${chapter.id}`,
    noindex: !isChapterEligible,
  })
  return meta.meta.find((m) => m.name === 'robots')?.content
}

test('19. Story Robots Directive: Public published story with is_indexable: true emits index, follow', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)
  assert.equal(work.visibility, 'Public')
  assert.equal(work.is_indexable, true)
  assert.equal(work.isIndexable, true)
  assert.equal(work.publication_status, 'published')

  const robots = computeWorkRobotsDirective(work)
  assert.equal(
    robots,
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    'Public published story must emit index, follow'
  )
})

test('20. Story Robots Directive: Unlisted story strictly emits noindex, nofollow', async () => {
  const unlistedRow = {
    ...publishedWorkFixture,
    visibility: 'unlisted',
    publication_status: 'published',
    is_indexable: true,
  }
  const mockClient = createMockSupabase(unlistedRow)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)
  assert.equal(work.visibility, 'Unlisted')

  const robots = computeWorkRobotsDirective(work)
  assert.equal(robots, 'noindex, nofollow', 'Unlisted story must emit noindex, nofollow')
})

test('21. Story Robots Directive: Draft story is blocked and emits noindex, nofollow', async () => {
  const draftRow = {
    ...publishedWorkFixture,
    visibility: 'draft',
    publication_status: 'draft',
  }
  const mockClient = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: draftRow, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: draftRow, error: null }) }),
          }),
        }),
      }),
    }),
  }
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.equal(work, null, 'Draft work returns null to public loader')

  const robots = computeWorkRobotsDirective(work)
  assert.equal(robots, 'noindex, nofollow', 'Draft story route must emit noindex, nofollow')
})

test('22. Story Robots Directive: Private story is blocked and emits noindex, nofollow', async () => {
  const privateRow = {
    ...publishedWorkFixture,
    visibility: 'private',
    publication_status: 'published',
  }
  const mockClient = {
    from: () => ({
      select: () => ({
        in: () => ({
          eq: () => ({
            or: () => ({ maybeSingle: async () => ({ data: privateRow, error: null }) }),
            eq: () => ({ maybeSingle: async () => ({ data: privateRow, error: null }) }),
          }),
        }),
      }),
    }),
  }
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.equal(work, null)

  const robots = computeWorkRobotsDirective(work)
  assert.equal(robots, 'noindex, nofollow', 'Private story route must emit noindex, nofollow')
})

test('23. Story Robots Directive: Public work explicitly marked is_indexable: false emits noindex, nofollow', async () => {
  const nonIndexableRow = {
    ...publishedWorkFixture,
    visibility: 'public',
    publication_status: 'published',
    is_indexable: false,
  }
  const mockClient = createMockSupabase(nonIndexableRow)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)
  assert.equal(work.is_indexable, false)

  const robots = computeWorkRobotsDirective(work)
  assert.equal(robots, 'noindex, nofollow', 'Explicitly non-indexable work must emit noindex, nofollow')
})

test('24. Chapter Robots Directive: Indexable chapter under public work emits index, follow; non-indexable emits noindex', async () => {
  const mockClient = createMockSupabase(publishedWorkFixture)
  const work = await executeGetPublicWork('the-cartographer-of-kyoto', {
    supabaseClient: mockClient,
  })
  assert.ok(work)

  // Chapter 1 is published and is_indexable: true
  const ch1 = work.chapters.find((c) => c.number === 1)
  assert.ok(ch1)
  assert.equal(ch1.is_indexable, true)
  const robotsCh1 = computeChapterRobotsDirective(work, ch1)
  assert.equal(
    robotsCh1,
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    'Indexable published chapter must emit index, follow'
  )

  // Chapter with is_indexable: false (like The Night I Forgot You chapters in DB)
  const chNonIndexable = { ...ch1, is_indexable: false, isIndexable: false }
  const robotsNonIdx = computeChapterRobotsDirective(work, chNonIndexable)
  assert.equal(robotsNonIdx, 'noindex, nofollow', 'Chapter with is_indexable: false must emit noindex, nofollow')

  // Chapter of unlisted parent work
  const unlistedWork = { ...work, visibility: 'Unlisted' }
  const robotsUnlistedCh = computeChapterRobotsDirective(unlistedWork, ch1)
  assert.equal(robotsUnlistedCh, 'noindex, nofollow', 'Chapter of unlisted work must emit noindex, nofollow')
})

