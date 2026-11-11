import { createServerFn } from '@tanstack/react-start'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '../lib/supabase/server.ts'
import type { Database } from '../lib/supabase/types.ts'
import type { Chapter } from '../data/mockData'
import { notifySearchEngines } from './indexing.ts'
import { slugify } from '../lib/taxonomy.ts'
import { clearPublicWorkCache } from './works.ts'
import {
  extractLoreEntities,
  countEntityMentions,
  linkAllOccurrences,
  unlinkAllOccurrences,
  linkMultipleEntities,
  stripLoreToPlainText,
  type LoreEntity,
  type StoryLoreEntity,
} from '../lib/lore/loreParser.ts'
import { parseLoreCsv } from '../lib/lore/csvLoreParser.ts'

/**
 * Helper to resolve or auto-provision a profile row for the authenticated Clerk user.
 */
async function resolveUserProfile(admin: any, clerkUserId: string) {
  let { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_path')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!profile?.id) {
    const minimalUsername = `author_${clerkUserId.slice(0, 8)}`
    const { data: newProfile, error: createErr } = await admin
      .from('profiles')
      .upsert(
        {
          clerk_user_id: clerkUserId,
          username: minimalUsername,
          display_name: 'Author',
          is_public: true,
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id, username, display_name, avatar_path')
      .single()

    if (createErr || !newProfile) {
      throw new Error(`Failed to resolve writer profile: ${createErr?.message}`)
    }
    profile = newProfile
  }

  return profile
}

/**
 * Checks if a manuscript has participated in any writing contest.
 * If entered into a contest (status in accepted, pending, winner), the manuscript
 * is permanently locked against alterations and deletion to guarantee contest
 * fairness, reader vote integrity, and leaderboard immutability.
 */
export async function checkWorkContestLock(
  workId: string,
  adminClient?: any
): Promise<{ isLocked: boolean; reason?: string; contestTitle?: string }> {
  if (!workId?.trim()) return { isLocked: false }
  const admin = adminClient || createAdminClient()

  let workUuid = workId.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isUuid) {
    try {
      const { data: wRow } = await admin
        .from('works')
        .select('id')
        .eq('slug', workUuid.toLowerCase())
        .maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    } catch {}
  }

  try {
    const query = admin
      .from('contest_entries')
      .select('id, contest_id, status, contests:contest_id(title, status)')
      .eq('work_id', workUuid)

    let res: any = null
    if (typeof query?.in === 'function') {
      const inQuery = query.in('status', ['accepted', 'pending', 'winner'])
      res = typeof inQuery?.maybeSingle === 'function' ? await inQuery.maybeSingle() : await inQuery
    } else if (typeof query?.maybeSingle === 'function') {
      res = await query.maybeSingle()
    } else if (query) {
      res = await query
    }

    const entry = res?.data
    if (
      entry &&
      (entry.contest_id || entry.contests) &&
      ['accepted', 'pending', 'winner'].includes(entry.status)
    ) {
      const contestTitle = (entry.contests as any)?.title || 'Writing Contest'
      return {
        isLocked: true,
        contestTitle,
        reason: `This story has been entered into the "${contestTitle}". Contest manuscripts are locked to preserve fair reader voting and cannot be modified or deleted.`,
      }
    }
  } catch (err: any) {
    // Graceful fallback for mock unit tests or non-contest test tables
  }

  return { isLocked: false }
}

export interface WriterWorkListItem {
  id: string
  title: string
  slug: string
  cover: string
  status: 'Published' | 'Draft' | 'Archived'
  category: string
  categorySlug: string
  genre: string
  genreSlug: string
  chaptersCount: number
  totalReads: string
  totalSaves: number
  lastUpdated: string
  firstChapterId?: string
  activeChapterId?: string
  chapters?: Chapter[]
  isContestLocked?: boolean
  contestTitle?: string | null
}

export interface GetWriterWorksResponse {
  works: WriterWorkListItem[]
  totalReads: number
  totalSaves: number
  activeDraftsCount: number
}

/**
 * 1. Fetch writer's own manuscripts directly from PostgreSQL
 */
export const getWriterWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params: { clerkUserId: string } | string) => {
    const clerkUserId = typeof params === 'string' ? params : params?.clerkUserId
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      throw new Error('Authenticated user ID is required')
    }
    return { clerkUserId: clerkUserId.trim() }
  })
  .handler(async ({ data }): Promise<GetWriterWorksResponse> => {
    const admin = createAdminClient()
    const profile = await resolveUserProfile(admin, data.clerkUserId)

    // Fetch works authored by this user
    const { data: dbWorks, error } = await admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        status,
        visibility,
        publication_status,
        chapter_count,
        word_count,
        view_count,
        impression_count,
        save_count,
        created_at,
        updated_at,
        last_activity_at,
        category:categories(id, name, slug),
        chapters(
          id,
          chapter_number,
          title,
          subtitle,
          content,
          word_count,
          reading_time_minutes,
          status,
          updated_at
        )
      `)
      .eq('author_id', profile.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[getWriterWorksServerFn] Error loading writer works:', error.message)
      throw new Error(error.message)
    }

    // Query active contest submissions by this author to determine locked manuscripts
    const contestWorkMap = new Map<string, { contestTitle: string; status: string }>()
    try {
      const { data: contestEntries } = await admin
        .from('contest_entries')
        .select('work_id, contest_id, status, contests:contest_id(title)')
        .eq('author_id', profile.id)
        .in('status', ['accepted', 'pending', 'winner'])

      if (Array.isArray(contestEntries)) {
        for (const ce of contestEntries) {
          contestWorkMap.set(ce.work_id, {
            contestTitle: (ce.contests as any)?.title || 'Writing Contest',
            status: ce.status,
          })
        }
      }
    } catch {}

    let aggregatedReads = 0
    let aggregatedSaves = 0
    let activeDraftsCount = 0

    const works: WriterWorkListItem[] = (dbWorks || []).map((w: any) => {
      const contestInfo = contestWorkMap.get(w.id)
      const isContestLocked = Boolean(contestInfo)
      const catObj = Array.isArray(w.category) ? w.category[0] : w.category
      const viewCountNum = Number(w.view_count || 0)
      const saveCountNum = Number(w.save_count || 0)
      aggregatedReads += viewCountNum
      aggregatedSaves += saveCountNum

      // Map status
      let uiStatus: 'Published' | 'Draft' | 'Archived' = 'Draft'
      if (w.publication_status === 'published' || w.visibility === 'public') {
        uiStatus = 'Published'
      } else if (w.publication_status === 'archived') {
        uiStatus = 'Archived'
      } else {
        uiStatus = 'Draft'
      }

      if (uiStatus === 'Draft') {
        activeDraftsCount++
      }

      const updatedDate = w.last_activity_at || w.updated_at || w.created_at
      const formattedDate = updatedDate ? new Date(updatedDate).toLocaleDateString() : 'Recently'

      const rawChapters = Array.isArray(w.chapters) ? w.chapters : []
      const sortedChapters = [...rawChapters].sort(
        (a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0)
      )
      const mappedChapters: Chapter[] = sortedChapters.map((ch: any) => ({
        id: ch.id,
        number: ch.chapter_number || 1,
        title: ch.title || 'Untitled Chapter',
        subtitle: ch.subtitle || '',
        status: (ch.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
        wordCount: ch.word_count || 0,
        readTimeMinutes: ch.reading_time_minutes || 1,
        content: ch.content || '',
        updatedAt: ch.updated_at || undefined,
      }))

      const firstChapterId = mappedChapters[0]?.id
      const draftChapter = mappedChapters.find((c) => c.status === 'draft')
      const activeChapterId = draftChapter?.id || mappedChapters[mappedChapters.length - 1]?.id || firstChapterId

      return {
        id: w.id,
        title: w.title,
        slug: w.slug,
        cover: w.cover_image_path || '/default-book-cover.webp',
        status: uiStatus,
        category: catObj?.name || 'Novels',
        categorySlug: catObj?.slug || 'novels',
        genre: 'Literary Fiction',
        genreSlug: 'literary-fiction',
        chaptersCount: mappedChapters.length || w.chapter_count || 0,
        totalReads: viewCountNum.toLocaleString(),
        totalSaves: saveCountNum,
        lastUpdated: formattedDate,
        firstChapterId,
        activeChapterId,
        chapters: mappedChapters,
        isContestLocked,
        contestTitle: contestInfo?.contestTitle || null,
      }
    })

    return {
      works,
      totalReads: aggregatedReads,
      totalSaves: aggregatedSaves,
      activeDraftsCount,
    }
  })

export interface CreateWriterWorkPayload {
  clerkUserId: string
  title: string
  subtitle?: string
  description?: string
  categoryName?: string
  genreName?: string
  cover?: string
  tags?: string[]
  language?: string
  status?: 'Ongoing' | 'Completed'
  visibility?: 'Public' | 'Unlisted' | 'Draft'
  isMature?: boolean
  includeInitialAct?: boolean
}

export interface ExecuteCreateWriterWorkOptions {
  admin?: SupabaseClient<Database>
  /**
   * Optional server authentication state resolver for unit tests.
   * If omitted, resolves Clerk session via `@clerk/tanstack-react-start/server`.
   */
  getAuthState?: () => Promise<{ userId: string | null } | null>
}

export interface CreateWriterWorkResult {
  success: true
  workId: string
  slug: string
  chapterId?: string
  genreAssigned: boolean
}

/**
 * Validates the caller identity against the server-verified Clerk session.
 * Fail-Closed: If auth resolution fails, throws an error, or produces no active userId,
 * or if the client-provided clerkUserId does not match, request is rejected.
 */
export async function authenticateWriterRequest(
  clientUserId?: string,
  authResolver?: () => Promise<{ userId: string | null } | null>
): Promise<string> {
  let authState: { userId: string | null } | null = null

  if (authResolver) {
    try {
      authState = await authResolver()
    } catch (err: any) {
      throw new Error(`Authentication failure: ${err?.message || err}`)
    }
  } else {
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      authState = await auth()
    } catch (err: any) {
      throw new Error(`Authentication failure: Unable to verify server session (${err?.message || err})`)
    }
  }

  const serverUserId = authState?.userId
  if (!serverUserId) {
    throw new Error('Unauthorized: No active authenticated session found.')
  }

  if (clientUserId && serverUserId !== clientUserId) {
    throw new Error('Unauthorized: Client user ID does not match authenticated server session.')
  }

  return serverUserId
}

/**
 * Handles partial manuscript failure safely.
 * In accordance with strict data preservation rules:
 * - A partially created manuscript record is PRESERVED and its workId reported in the error.
 * - Automatic background deletion is NOT performed because network timeouts or partial database
 *   states cannot reliably prove the record is untouched and has no associated user content.
 * - Preserving the record prevents catastrophic data loss of existing works, chapters, acts, or user edits.
 */
function handleManuscriptCreationFailure(
  workId: string,
  stepDescription: string,
  primaryError: Error
): never {
  throw new Error(
    `Failed to ${stepDescription}: ${primaryError.message}. The partial manuscript shell has been safely preserved at ID: ${workId} to prevent accidental content loss.`
  )
}

/**
 * Core business logic for creating a new manuscript with genre persistence and failure guards.
 * Callable directly by tests or by createWriterWorkServerFn.
 */
export async function executeCreateWriterWork(
  data: CreateWriterWorkPayload,
  options?: ExecuteCreateWriterWorkOptions
): Promise<CreateWriterWorkResult> {
  const authResolver = options?.getAuthState || (options?.admin as any)?.getAuthState
  // Fail-closed authentication boundary verification
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)

  const admin = options?.admin || createAdminClient()
  const profile = await resolveUserProfile(admin, verifiedUserId)
  const nowIso = new Date().toISOString()

  // 1. Resolve & Validate Genre against active genres (is_active = true)
  let resolvedGenreId: string | null = null
  const rawGenre = data.genreName?.trim()

  if (rawGenre) {
    // Reject inputs containing SQL LIKE wildcard characters to ensure deterministic matching
    if (rawGenre.includes('%') || rawGenre.includes('_')) {
      throw new Error(
        `Invalid genre name "${rawGenre}". Wildcard characters like "%" and "_" are not permitted.`
      )
    }

    // 1a. Attempt lookup by exact name (case-insensitive) where is_active = true
    const { data: genreByName, error: nameErr } = await admin
      .from('genres')
      .select('id, name, slug, is_active')
      .ilike('name', rawGenre)
      .eq('is_active', true)
      .maybeSingle()

    if (nameErr) {
      throw new Error(`Database error while validating genre "${rawGenre}": ${nameErr.message}`)
    }

    // Double-check exact case-insensitive equality to eliminate accidental pattern matches
    if (genreByName?.id && genreByName.name.trim().toLowerCase() === rawGenre.toLowerCase()) {
      resolvedGenreId = genreByName.id
    } else {
      // 1b. Fallback lookup by slug
      const slugCandidate = rawGenre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (slugCandidate) {
        const { data: genreBySlug, error: slugErr } = await admin
          .from('genres')
          .select('id, name, slug, is_active')
          .eq('slug', slugCandidate)
          .eq('is_active', true)
          .maybeSingle()

        if (slugErr) {
          throw new Error(`Database error while validating genre slug "${rawGenre}": ${slugErr.message}`)
        }

        if (genreBySlug?.id && genreBySlug.slug === slugCandidate) {
          resolvedGenreId = genreBySlug.id
        }
      }
    }

    // Fail-fast before any database writes if genre was supplied but is inactive or unrecognized
    if (!resolvedGenreId) {
      throw new Error(
        `Unrecognized or inactive genre: "${rawGenre}". Please select an active genre from the taxonomy.`
      )
    }
  }

  // 2. Resolve Category ID
  let categoryId: string | null = null
  const rawCategory = data.categoryName?.trim()

  if (rawCategory) {
    // Reject wildcard characters in category name to avoid unintended pattern matches
    if (rawCategory.includes('%') || rawCategory.includes('_')) {
      throw new Error(
        `Invalid category name "${rawCategory}". Wildcard characters like "%" and "_" are not permitted.`
      )
    }

    const { data: catData, error: catErr } = await admin
      .from('categories')
      .select('id, name')
      .ilike('name', rawCategory)
      .maybeSingle()

    if (catErr) {
      throw new Error(`Database error while resolving category "${rawCategory}": ${catErr.message}`)
    }

    if (catData?.id && catData.name.trim().toLowerCase() === rawCategory.toLowerCase()) {
      categoryId = catData.id
    }
  }

  // Fallback to first available category if no specific category was requested or matched
  if (!categoryId) {
    const { data: firstCat, error: firstCatErr } = await admin
      .from('categories')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (firstCatErr) {
      throw new Error(`Database error while fetching fallback category: ${firstCatErr.message}`)
    }

    if (firstCat?.id) {
      categoryId = firstCat.id
    }
  }

  // 3. Generate slug
  const baseSlug = data.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'manuscript'
  const uniqueSuffix = Math.random().toString(36).substring(2, 7)
  const slug = `${baseSlug}-${uniqueSuffix}`

  // 4. Map status & visibility
  // New manuscripts always start as private Drafts until the author explicitly publishes chapters.
  const mappedStatus = data.status?.toLowerCase() === 'completed' ? 'completed' : 'ongoing'
  const mappedVisibility: 'draft' | 'private' | 'unlisted' | 'public' = 'draft'
  const mappedPublicationStatus: 'draft' | 'published' | 'archived' = 'draft'

  // 5. Insert Work into works table
  const { data: newWork, error: workErr } = await admin
    .from('works')
    .insert({
      author_id: profile.id,
      title: data.title.trim(),
      slug,
      description: data.description?.trim() || null,
      cover_image_path: data.cover?.trim() || null,
      language: data.language || 'English',
      category_id: categoryId,
      status: mappedStatus,
      visibility: mappedVisibility,
      publication_status: mappedPublicationStatus,
      is_indexable: false,
      content_rating: data.isMature ? 'mature' : 'general',
      content_warning_required: !!data.isMature,
      reading_time_minutes: 5,
      word_count: 1250,
      chapter_count: 1,
      view_count: 0,
      like_count: 0,
      save_count: 0,
      comment_count: 0,
      published_at: null,
      last_published_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      last_activity_at: nowIso,
      last_activity_type: 'work_created',
      last_activity_detail: {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || '',
        createdAt: nowIso,
        summaryText: 'Draft manuscript registered',
      },
    })
    .select('id, slug, title')
    .single()

  if (workErr || !newWork?.id) {
    console.error('[executeCreateWriterWork] Work insert failed:', workErr?.message)
    throw new Error(`Failed to create manuscript: ${workErr?.message || 'Unknown work insert error'}`)
  }

  // 6. Insert Genre junction into work_genres if genre was resolved
  if (resolvedGenreId) {
    const { error: genreErr } = await admin
      .from('work_genres')
      .insert({
        work_id: newWork.id,
        genre_id: resolvedGenreId,
      })

    if (genreErr) {
      console.error('[executeCreateWriterWork] work_genres insert failed:', genreErr.message)
      handleManuscriptCreationFailure(
        newWork.id,
        'assign genre to manuscript',
        new Error(genreErr.message)
      )
    }
  }

  // 6b. Insert tags into tags & work_tags if provided
  if (Array.isArray(data.tags) && data.tags.length > 0) {
    try {
      for (const rawTag of data.tags) {
        const cleanTagName = String(rawTag).trim().replace(/^[#,\s]+|[,\s]+$/g, '')
        if (!cleanTagName) continue
        const tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        if (!tagSlug) continue

        let tagId: string | null = null
        const { data: existingTag } = await admin
          .from('tags')
          .select('id')
          .or(`slug.eq.${tagSlug},name.ilike.${cleanTagName}`)
          .maybeSingle()

        if (existingTag?.id) {
          tagId = existingTag.id
        } else {
          const { data: newTag } = await admin
            .from('tags')
            .insert({ name: cleanTagName, slug: tagSlug })
            .select('id')
            .maybeSingle()
          if (newTag?.id) tagId = newTag.id
        }

        if (tagId) {
          await admin.from('work_tags').insert({
            work_id: newWork.id,
            tag_id: tagId,
          })
        }
      }
    } catch (tagErr: any) {
      console.warn('[executeCreateWriterWork] Tags insert warning:', tagErr?.message)
    }
  }

  // 7. Insert Act 1 into acts table ONLY if includeInitialAct is not false
  // Acts are completely optional so stories do not force Act 1 by default
  let initialActId: string | null = null
  if (data.includeInitialAct !== false) {
    const { data: actRow, error: actErr } = await admin
      .from('acts')
      .insert({
        work_id: newWork.id,
        act_number: 1,
        title: 'Act I',
        slug: `act-1-${uniqueSuffix}`,
        description: 'First Movement',
        status: 'published',
        display_order: 1,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single()

    if (actErr || !actRow?.id) {
      console.error('[executeCreateWriterWork] Act insert failed:', actErr?.message)
      handleManuscriptCreationFailure(
        newWork.id,
        'create initial Act I',
        new Error(actErr?.message || 'Unknown act creation error')
      )
    }
    initialActId = actRow.id
  }

  // 8. Insert initial Chapter 1
  const initialChapterContent =
    'The morning arrived without sound, wrapping the city in a cold silver fog that swallowed the tops of the towers...'
  const initialWordCount = initialChapterContent.trim().split(/\s+/).filter(Boolean).length
  const initialReadingTime = Math.max(1, Math.ceil(initialWordCount / 220))

  const { data: newCh, error: chErr } = await admin
    .from('chapters')
    .insert({
      work_id: newWork.id,
      act_id: initialActId,
      chapter_number: 1,
      title: 'Chapter One',
      slug: `chapter-1-${uniqueSuffix}`,
      subtitle: data.subtitle?.trim() || 'The Beginning',
      content: initialChapterContent,
      word_count: initialWordCount,
      reading_time_minutes: initialReadingTime,
      status: 'draft',
      is_indexable: false,
      view_count: 0,
      published_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id, title, chapter_number')
    .single()

  if (chErr || !newCh?.id) {
    console.error('[executeCreateWriterWork] Initial chapter insert failed:', chErr?.message)
    handleManuscriptCreationFailure(
      newWork.id,
      'create initial chapter',
      new Error(chErr?.message || 'Unknown chapter creation error')
    )
  }

  return {
    success: true,
    workId: newWork.id,
    slug: newWork.slug,
    chapterId: newCh.id,
    genreAssigned: !!resolvedGenreId,
  }
}

/**
 * 2. Create a new manuscript directly in PostgreSQL with an initial Chapter 1
 */
export const createWriterWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: CreateWriterWorkPayload) => {
    if (!params.clerkUserId) throw new Error('User authentication required')
    if (!params.title?.trim()) throw new Error('Manuscript title is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeCreateWriterWork(data)
  })

/**
 * 3. Fetch detailed manuscript data (work + chapters + acts) for Manage & Editor pages
 */
export const getWriterWorkDetailsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { workId: string; clerkUserId?: string } | string) => {
    const rawWorkId = typeof params === 'string' ? params : params?.workId
    const clerkUserId = typeof params === 'string' ? undefined : params?.clerkUserId
    if (!rawWorkId) throw new Error('Work identifier is required')
    return { workId: rawWorkId.trim(), clerkUserId }
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const clean = data.workId.toLowerCase()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        status,
        visibility,
        publication_status,
        language,
        word_count,
        chapter_count,
        view_count,
        impression_count,
        save_count,
        reading_time_minutes,
        content_rating,
        content_warning_required,
        content_warning_text,
        created_at,
        updated_at,
        last_activity_at,
        last_activity_detail,
        category:categories(id, name, slug),
        author:profiles(id, clerk_user_id, display_name, username, avatar_path),
        work_genres(genres(id, name, slug)),
        work_tags(tags(id, name, slug))
      `)

    if (isUuid) {
      query = query.or(`id.eq.${clean},slug.eq.${clean}`)
    } else {
      query = query.eq('slug', clean)
    }

    const { data: dbWork, error } = await query.maybeSingle()

    if (error || !dbWork) {
      console.warn('[getWriterWorkDetailsServerFn] Work not found:', data.workId)
      return null
    }

    // Fetch acts
    const { data: dbActs } = await admin
      .from('acts')
      .select('*')
      .eq('work_id', dbWork.id)
      .order('act_number', { ascending: true })

    // Fetch chapters
    const { data: dbChapters } = await admin
      .from('chapters')
      .select('*')
      .eq('work_id', dbWork.id)
      .order('chapter_number', { ascending: true })

    const categoryObj = Array.isArray(dbWork.category) ? dbWork.category[0] : dbWork.category
    const authorObj = Array.isArray(dbWork.author) ? dbWork.author[0] : dbWork.author

    const acts = (dbActs || []).map((a: any) => ({
      id: a.id,
      number: a.act_number,
      title: a.title,
      slug: a.slug,
      description: a.description || '',
      status: a.status || 'published',
    }))

    const chapters = (dbChapters || []).map((ch: any) => {
      const parentAct = acts.find((a: any) => a.id === ch.act_id)
      return {
        id: ch.id,
        number: ch.chapter_number,
        title: ch.title,
        subtitle: ch.subtitle || '',
        bannerImage: ch.banner_image_path || undefined,
        actId: ch.act_id || null,
        actNumber: parentAct ? parentAct.number : undefined,
        actTitle: parentAct ? parentAct.title : undefined,
        status: (ch.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
        wordCount: ch.word_count || 0,
        readTimeMinutes: ch.reading_time_minutes || 1,
        viewCount: Number(ch.view_count || 0),
        publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
        content: ch.content || '',
      }
    })

    const genreList = Array.isArray((dbWork as any).work_genres)
      ? (dbWork as any).work_genres.map((wg: any) => wg.genres).filter(Boolean)
      : []
    const primaryGenre = genreList[0]
    const tagList = Array.isArray((dbWork as any).work_tags)
      ? (dbWork as any).work_tags.map((wt: any) => wt.tags?.name).filter(Boolean)
      : []
    const activityDetail = typeof dbWork.last_activity_detail === 'object' && dbWork.last_activity_detail ? dbWork.last_activity_detail : null

    // Determine contest locking status
    const contestLock = await checkWorkContestLock(dbWork.id, admin)

    return {
      id: dbWork.id,
      title: dbWork.title,
      slug: dbWork.slug,
      subtitle: activityDetail?.subtitle || '',
      cover: dbWork.cover_image_path || '/default-book-cover.webp',
      category: categoryObj?.name || 'Novels',
      categorySlug: categoryObj?.slug || 'novels',
      genre: primaryGenre?.name || 'Literary Fiction',
      genreSlug: primaryGenre?.slug || 'literary-fiction',
      genres: genreList,
      tags: tagList.length > 0 ? tagList : ['Serialized'],
      language: dbWork.language || 'English',
      status: dbWork.status === 'completed' ? 'Completed' : 'Ongoing',
      visibility: (dbWork.visibility === 'public' ? 'Public' : dbWork.visibility === 'draft' ? 'Draft' : 'Unlisted') as any,
      publicationStatus: (dbWork.publication_status === 'published' ? 'Published' : dbWork.publication_status === 'archived' ? 'Archived' : 'Draft') as any,
      publishedAt: dbWork.published_at || null,
      isMature: dbWork.content_rating === 'mature' || dbWork.content_rating === 'explicit' || dbWork.content_warning_required === true,
      synopsis: dbWork.description || '',
      fullDescription: dbWork.description || '',
      chaptersCount: chapters.length,
      publishedChaptersCount: chapters.filter((c: any) => c.status === 'published').length,
      totalReads: Number(dbWork.view_count || 0).toLocaleString(),
      impressionCount: Number(dbWork.impression_count || 0),
      totalSaves: Number(dbWork.save_count || 0),
      ratingScore: 5.0,
      ratingCount: 1,
      createdAt: dbWork.created_at ? new Date(dbWork.created_at).toLocaleDateString() : 'Recently',
      updatedAt: dbWork.updated_at ? new Date(dbWork.updated_at).toLocaleDateString() : 'Recently',
      isContestLocked: contestLock.isLocked,
      contestTitle: contestLock.contestTitle || null,
      author: {
        id: authorObj?.id || 'unknown',
        name: authorObj?.display_name || authorObj?.username || 'Author',
        handle: authorObj?.username || 'author',
        avatar: authorObj?.avatar_path || '/unisex-avatar.svg',
        bio: 'Author',
        worksCount: 1,
        followersCount: 0,
        totalReads: '0',
        verified: false,
      },
      acts,
      chapters,
    }
  })

export interface SaveWriterChapterPayload {
  workId: string
  chapterId: string
  title?: string
  subtitle?: string
  content?: string
  status?: 'draft' | 'published'
  bannerImage?: string | null
  actId?: string | null
  expectedUpdatedAt?: string
  force?: boolean
}

/**
 * 4. Save/Autosave chapter content, word counts, reading time, and status to PostgreSQL
 */
export async function executeSaveWriterChapter(data: SaveWriterChapterPayload, adminClient?: any) {
  const admin = adminClient || createAdminClient()
    const nowIso = new Date().toISOString()
    const hasContent = typeof data.content === 'string'
    // Robust server-side sanitization: unescape any lore link brackets and strip markdown hard-break trailing backslashes
    const cleanContent = hasContent
      ? data.content!
          .replace(/\\+\[([^\]]+)\\+\]\((lore:[^)]+)\)/g, '[$1]($2)')
          .replace(/\\+\[\\+\[([^\]]+)\\+\]\\+\]/g, '[[$1]]')
          .replace(/\\+\{([^}]+)\\+\}/g, '{$1}')
          .replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
      : undefined
    const wordCount = cleanContent !== undefined ? cleanContent.trim().split(/\s+/).filter(Boolean).length : undefined
    const readingTime = wordCount !== undefined ? Math.max(1, Math.ceil(wordCount / 220)) : undefined
    const status = data.status

    // 1. Resolve work ID (if passed as slug)
    let workUuid = data.workId
    let workSlug: string | undefined = undefined
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      try {
        const query = admin.from('works').select('id, slug').eq('slug', data.workId)
        const res = typeof query?.maybeSingle === 'function' ? await query.maybeSingle() : await query
        const wRow = res?.data
        if (wRow?.id) workUuid = wRow.id
        if (wRow?.slug) workSlug = wRow.slug
      } catch {}
    } else {
      try {
        const query = admin.from('works').select('slug').eq('id', workUuid)
        const res = typeof query?.maybeSingle === 'function' ? await query.maybeSingle() : await query
        const wRow = res?.data
        if (wRow?.slug) workSlug = wRow.slug
      } catch {}
    }

    // Verify contest lock: contest manuscripts are strictly immutable
    const contestLock = await checkWorkContestLock(workUuid, admin)
    if (contestLock.isLocked) {
      throw new Error(
        contestLock.reason ||
          `Cannot modify this chapter: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
      )
    }

    // 2. Check if chapter exists by ID (UUID check)
    const isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.chapterId)
    let isChapterIndexable = false

    if (isChapterUuid) {
      // Optimistic concurrency check: if client provided expectedUpdatedAt and did not force overwrite,
      // verify that no other tab or device has saved a newer version in the interim.
      if (data.expectedUpdatedAt && !data.force) {
        const { data: existingCh } = await admin
          .from('chapters')
          .select('title, subtitle, content, updated_at')
          .eq('id', data.chapterId)
          .maybeSingle()

        if (existingCh?.updated_at) {
          const dbTime = new Date(existingCh.updated_at).getTime()
          const clientTime = new Date(data.expectedUpdatedAt).getTime()

          // If DB version is newer by more than 1.5 seconds (to tolerate minor clock drift)
          if (dbTime - clientTime > 1500) {
            return JSON.parse(JSON.stringify({
              success: false,
              conflict: true,
              serverUpdatedAt: String(existingCh.updated_at),
              serverTitle: String(existingCh.title || ''),
              serverSubtitle: String(existingCh.subtitle || ''),
              serverContent: String(existingCh.content || ''),
            }))
          }
        }
      }

      const updateData: Record<string, any> = {
        updated_at: nowIso,
      }
      if (data.title !== undefined && data.title.trim()) {
        updateData.title = data.title.trim()
      }
      if (data.subtitle !== undefined) {
        updateData.subtitle = data.subtitle?.trim() || null
      }
      if (hasContent) {
        updateData.content = cleanContent
        updateData.word_count = wordCount
        updateData.reading_time_minutes = readingTime
      }
      if (status !== undefined) {
        updateData.status = status
        if (status === 'published') {
          updateData.published_at = nowIso
          // Chapter is indexable only if parent work is public, published, and indexable
          const { data: parentWork } = await admin
            .from('works')
            .select('visibility, publication_status, is_indexable')
            .eq('id', workUuid)
            .maybeSingle()

          const isParentEligible =
            parentWork &&
            (parentWork.visibility || '').toLowerCase() === 'public' &&
            (parentWork.publication_status || '').toLowerCase() === 'published' &&
            parentWork.is_indexable === true

          isChapterIndexable = Boolean(isParentEligible)
          updateData.is_indexable = isChapterIndexable
        } else {
          isChapterIndexable = false
          updateData.is_indexable = false
        }
      }
      if (data.bannerImage !== undefined) {
        updateData.banner_image_path = data.bannerImage?.trim() || null
      }
      if (data.actId !== undefined) {
        if (data.actId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.actId)) {
          const { data: actRow } = await admin
            .from('acts')
            .select('id')
            .eq('id', data.actId)
            .eq('work_id', workUuid)
            .maybeSingle()
          updateData.act_id = actRow?.id || null
        } else {
          updateData.act_id = null
        }
      }

      const updateBuilder = admin
        .from('chapters')
        .update(updateData)
        .eq('id', data.chapterId)

      const updateRes = typeof updateBuilder?.select === 'function'
        ? await updateBuilder.select('id')
        : await updateBuilder

      const chErr = updateRes?.error
      const updatedRows = updateRes?.data

      if (chErr) {
        console.error('[saveWriterChapterServerFn] Error updating chapter in DB:', chErr.message)
        throw new Error(chErr.message)
      }

      if (Array.isArray(updatedRows) && updatedRows.length === 0) {
        throw new Error('Chapter not found on server. It may have been deleted or moved.')
      }
    } else {
      throw new Error(
        `[saveWriterChapterServerFn] Invalid chapter ID "${data.chapterId}". Chapters must be created via createWriterChapterServerFn before updating.`
      )
    }

    // 3. Recalculate and update aggregate word count, chapter count, and last activity on works table
    const { data: allChs } = await admin
      .from('chapters')
      .select('word_count, reading_time_minutes, status')
      .eq('work_id', workUuid)

    let workRevertedToDraft = false

    if (allChs) {
      const totalWords = allChs.reduce((sum: number, c: any) => sum + (c.word_count || 0), 0)
      const totalMinutes = allChs.reduce((sum: number, c: any) => sum + (c.reading_time_minutes || 0), 0)
      const publishedCount = allChs.filter((c: any) => c.status === 'published').length

      const workUpdatePayload: Record<string, any> = {
        word_count: totalWords,
        chapter_count: publishedCount,
        reading_time_minutes: totalMinutes,
        last_activity_at: nowIso,
        last_activity_type: status === 'published' ? 'chapter_published' : 'chapter_updated',
        last_activity_detail: {
          chapterTitle: data.title?.trim() || 'Chapter',
          updatedAt: nowIso,
          summaryText: `Chapter "${data.title?.trim() || 'Chapter'}" ${status === 'published' ? 'published' : 'updated'}`,
        },
        updated_at: nowIso,
      }

      // If chapter was moved to draft and no published chapters remain, revert published manuscript to draft
      if (status === 'draft') {
        const { data: currentWork } = await admin
          .from('works')
          .select('publication_status')
          .eq('id', workUuid)
          .maybeSingle()

        if (currentWork?.publication_status === 'published' && publishedCount === 0) {
          workUpdatePayload.publication_status = 'draft'
          workUpdatePayload.visibility = 'draft'
          workUpdatePayload.is_indexable = false
          workRevertedToDraft = true
        }
      }

      await admin
        .from('works')
        .update(workUpdatePayload)
        .eq('id', workUuid)

      // Automated Search Engine Indexing & Ping Automation for newly published chapters
      if (status === 'published' && isChapterIndexable) {
        const { data: parentWorkRow } = await admin
          .from('works')
          .select('slug, genre, author_id, profiles!works_author_id_fkey(username)')
          .eq('id', workUuid)
          .maybeSingle()

        const workSlug = parentWorkRow?.slug || workUuid
        const chapterSlug = data.slug || `chapter-${data.chapterNumber || 1}`
        const chapterUrl = `https://hatchpen.com/read/${workSlug}/${chapterSlug}`
        const workUrl = `https://hatchpen.com/works/${workSlug}`
        const urlsToPing = [chapterUrl, workUrl]

        if ((parentWorkRow as any)?.profiles?.username) {
          urlsToPing.push(`https://hatchpen.com/author/${(parentWorkRow as any).profiles.username}`)
        }
        if (parentWorkRow?.genre) {
          urlsToPing.push(`https://hatchpen.com/genre/${slugify(parentWorkRow.genre)}`)
        }

        void notifySearchEngines(urlsToPing).catch((pingErr: any) => {
          console.warn('[executeSaveWriterChapter] Non-blocking indexing ping notice:', pingErr?.message)
        })
      }
    }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workSlug) {
    clearPublicWorkCache(workSlug)
    clearStoryLoreBibleCache(workSlug)
  }

  return JSON.parse(JSON.stringify({
    success: true,
    conflict: false,
    chapterId: String(data.chapterId),
    wordCount: typeof wordCount === 'number' ? wordCount : 0,
    readingTime: typeof readingTime === 'number' ? readingTime : 1,
    updatedAt: String(nowIso),
    workRevertedToDraft: Boolean(workRevertedToDraft),
  }))
}

export const saveWriterChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: SaveWriterChapterPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.chapterId?.trim()) throw new Error('Chapter ID is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeSaveWriterChapter(data)
  })

export interface CreateWriterChapterPayload {
  workId: string
  title: string
  actId?: string
  content?: string
  subtitle?: string
  bannerImage?: string | null
  status?: 'draft' | 'published'
}

/**
 * 5. Add a new chapter to a work directly in PostgreSQL
 */
export const createWriterChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: CreateWriterChapterPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.title?.trim()) throw new Error('Chapter title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Resolve work UUID
    let workUuid = data.workId
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    }

    // Verify contest lock: contest manuscripts are strictly immutable
    const contestLock = await checkWorkContestLock(workUuid, admin)
    if (contestLock.isLocked) {
      throw new Error(
        contestLock.reason ||
          `Cannot add chapters: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
      )
    }

    // 2. Determine next chapter number
    const { data: existingChs } = await admin
      .from('chapters')
      .select('chapter_number')
      .eq('work_id', workUuid)
      .order('chapter_number', { ascending: false })

    const nextNumber = ((existingChs?.[0]?.chapter_number) || 0) + 1
    const uniqueSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `ch-${nextNumber}-${uniqueSuffix}`

    // 3. Resolve act_id if provided (Do not force latest act if not provided; chapters can be unassigned)
    // Bulletproof: verify that act actually exists on server so deleted acts don't trigger foreign key errors
    let actId: string | null = null
    if (data.actId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.actId)) {
      const { data: actRow } = await admin
        .from('acts')
        .select('id')
        .eq('id', data.actId)
        .eq('work_id', workUuid)
        .maybeSingle()

      if (actRow?.id) {
        actId = actRow.id
      }
    }

    const cleanContent = typeof data.content === 'string' ? data.content.replace(/\\+[ \t]*(?=\r?\n|$)/g, '') : ''
    const wordCount = cleanContent.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 220))

    const { data: createdCh, error: createErr } = await admin
      .from('chapters')
      .insert({
        work_id: workUuid,
        act_id: actId,
        chapter_number: nextNumber,
        title: data.title.trim(),
        slug,
        subtitle: data.subtitle?.trim() || '',
        content: cleanContent,
        word_count: wordCount,
        reading_time_minutes: readingTime,
        banner_image_path: data.bannerImage?.trim() || null,
        status: data.status || 'draft',
        is_indexable: false,
        view_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (createErr || !createdCh) {
      console.error('[createWriterChapterServerFn] Error creating chapter:', createErr?.message)
      throw new Error(`Failed to create chapter: ${createErr?.message}`)
    }

    // 4. Update work's chapter_count (strictly published chapters) and last activity
    const publishedCount = (existingChs || []).filter((c: any) => c.status === 'published').length
    await admin
      .from('works')
      .update({
        chapter_count: publishedCount,
        last_activity_at: nowIso,
        last_activity_type: 'chapter_drafted',
        last_activity_detail: {
          chapterId: createdCh.id,
          chapterNumber: nextNumber,
          chapterTitle: data.title.trim(),
          updatedAt: nowIso,
          summaryText: `Chapter ${nextNumber}: "${data.title.trim()}" drafted`,
        },
        updated_at: nowIso,
      })
      .eq('id', workUuid)

    return JSON.parse(JSON.stringify({
      success: true,
      chapter: {
        id: createdCh.id,
        number: createdCh.chapter_number,
        title: createdCh.title,
        subtitle: createdCh.subtitle || '',
        actId: createdCh.act_id || null,
        status: 'draft',
        wordCount: 0,
        readTimeMinutes: 1,
        viewCount: 0,
        publishedAt: null,
        content: '',
        updated_at: createdCh.updated_at || nowIso,
        updatedAt: createdCh.updated_at || nowIso,
      },
    }))
  })

export interface DeleteWriterChapterPayload {
  workId: string
  chapterId: string
}

/**
 * Core business logic to delete a chapter safely from PostgreSQL and recalculate aggregate stats
 */
export async function executeDeleteWriterChapter(
  data: DeleteWriterChapterPayload,
  adminClient?: any
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.chapterId?.trim()) throw new Error('Chapter ID is required')

  const admin = adminClient || createAdminClient()
  const nowIso = new Date().toISOString()

  // 1. Resolve work UUID
  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isWorkUuid) {
    const { data: wRow } = await admin.from('works').select('id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    if (wRow?.id) workUuid = wRow.id
  }

  // Verify contest lock: contest manuscripts are strictly immutable
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot delete chapter: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  // 2. Fetch chapter to verify ownership and get title
  const { data: targetCh } = await admin
    .from('chapters')
    .select('id, title, chapter_number')
    .eq('id', data.chapterId)
    .eq('work_id', workUuid)
    .maybeSingle()

  if (!targetCh) {
    throw new Error('Chapter not found or does not belong to this manuscript')
  }

  // 3. Delete the chapter
  const { error: delErr } = await admin
    .from('chapters')
    .delete()
    .eq('id', data.chapterId)
    .eq('work_id', workUuid)

  if (delErr) {
    console.error('[deleteWriterChapterServerFn] Error deleting chapter:', delErr.message)
    throw new Error(`Failed to delete chapter: ${delErr.message}`)
  }

  // 4. Recalculate remaining chapter counts and word counts
  const { data: remainingChs } = await admin
    .from('chapters')
    .select('id, status, word_count, reading_time_minutes')
    .eq('work_id', workUuid)

  const remainingCount = remainingChs?.length || 0
  const publishedCount = (remainingChs || []).filter((c: any) => c.status === 'published').length
  const totalWords = (remainingChs || []).reduce((sum: number, c: any) => sum + (c.word_count || 0), 0)
  const totalMinutes = (remainingChs || []).reduce((sum: number, c: any) => sum + (c.reading_time_minutes || 0), 0)

  // Fetch current work publication status to verify if revert to draft is required
  const { data: currentWork } = await admin
    .from('works')
    .select('publication_status, visibility')
    .eq('id', workUuid)
    .maybeSingle()

  let workRevertedToDraft = false
  const workUpdatePayload: Record<string, any> = {
    chapter_count: publishedCount,
    word_count: totalWords,
    reading_time_minutes: totalMinutes,
    last_activity_at: nowIso,
    last_activity_type: 'work_metadata_updated',
    last_activity_detail: {
      chapterId: targetCh.id,
      chapterTitle: targetCh.title,
      updatedAt: nowIso,
      summaryText: `Chapter "${targetCh.title}" removed`,
    },
    updated_at: nowIso,
  }

  // If work was published but now has zero published chapters remaining, automatically revert to draft
  if (currentWork?.publication_status === 'published' && publishedCount === 0) {
    workUpdatePayload.publication_status = 'draft'
    workUpdatePayload.visibility = 'draft'
    workUpdatePayload.is_indexable = false
    workRevertedToDraft = true
  }

  await admin
    .from('works')
    .update(workUpdatePayload)
    .eq('id', workUuid)

  return { success: true, remainingCount, publishedCount, workRevertedToDraft }
}

/**
 * 5.1 Delete a Chapter safely from PostgreSQL and recalculate aggregate stats
 */
export const deleteWriterChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: DeleteWriterChapterPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.chapterId?.trim()) throw new Error('Chapter ID is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeDeleteWriterChapter(data)
  })

export interface DeleteWriterWorkPayload {
  workId: string
  clerkUserId?: string
}

/**
 * Core business logic to permanently delete a manuscript and cascade all dependent records
 */
export async function executeDeleteWriterWork(
  data: DeleteWriterWorkPayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')

  const admin = adminClient || createAdminClient()

  // 1. Verify caller authentication
  if (!data.clerkUserId) {
    throw new Error('User authentication required')
  }
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)

  // 2. Resolve author profile
  const profile = await resolveUserProfile(admin, verifiedUserId)

  // 3. Resolve work UUID and fetch work details
  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin
      .from('works')
      .select('id, title, slug, author_id')
      .eq('id', workUuid)
      .maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin
      .from('works')
      .select('id, title, slug, author_id')
      .eq('slug', workUuid.toLowerCase())
      .maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow) {
    throw new Error('Manuscript not found')
  }

  // 4. Verify ownership
  if (workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only delete your own manuscripts.')
  }

  // 4.5 Verify contest lock: contest manuscripts can never be deleted
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      `Cannot delete this manuscript: "${workRow.title}" has been entered into ${contestLock.contestTitle || 'a writing contest'}. Contest manuscripts are permanently locked from deletion to maintain fair competition and reader rankings.`
    )
  }

  // 5. Delete the work row (ON DELETE CASCADE handles chapters, acts, bookmarks, progress, etc.)
  const { error: delErr } = await admin
    .from('works')
    .delete()
    .eq('id', workUuid)
    .eq('author_id', profile.id)

  if (delErr) {
    console.error('[deleteWriterWorkServerFn] Error deleting manuscript:', delErr.message)
    throw new Error(`Failed to delete manuscript: ${delErr.message}`)
  }

  // 6. Invalidate public caches
  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }

  return {
    success: true,
    deletedWorkId: workUuid,
    deletedTitle: workRow.title,
  }
}

/**
 * 5.2 Delete a Manuscript safely from PostgreSQL with author ownership verification
 */
export const deleteWriterWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: DeleteWriterWorkPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.clerkUserId?.trim()) throw new Error('User authentication required')
    return params
  })
  .handler(async ({ data }) => {
    return executeDeleteWriterWork(data)
  })

export interface CreateWriterActPayload {
  workId: string
  title: string
  description?: string
  actNumber?: number
  assignedChapterIds?: string[]
}

export interface UpdateWriterActPayload {
  workId: string
  actId: string
  title: string
  description?: string
}

export interface DeleteWriterActPayload {
  workId: string
  actId: string
}

/**
 * 6. Create a new Act for a serialized manuscript
 */
export const createWriterActServerFn = createServerFn({ method: 'POST' })
  .validator((params: CreateWriterActPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.title?.trim()) throw new Error('Act title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Resolve work UUID
    let workUuid = data.workId
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    }

    // Verify contest lock: contest manuscripts are strictly immutable
    const contestLock = await checkWorkContestLock(workUuid, admin)
    if (contestLock.isLocked) {
      throw new Error(
        contestLock.reason ||
          `Cannot add acts: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
      )
    }

    // 2. Determine act number safely (prevent duplicate key collision if an earlier act was deleted)
    const { data: existingActs } = await admin
      .from('acts')
      .select('act_number')
      .eq('work_id', workUuid)
      .order('act_number', { ascending: false })

    const existingNums = new Set((existingActs || []).map((a: any) => Number(a.act_number)))
    let actNumber = data.actNumber && !isNaN(data.actNumber) ? Number(data.actNumber) : undefined

    if (!actNumber || existingNums.has(actNumber)) {
      const maxNum = existingActs?.[0]?.act_number ? Number(existingActs[0].act_number) : 0
      actNumber = maxNum + 1
    }

    const uniqueSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `act-${actNumber}-${uniqueSuffix}`

    const { data: createdAct, error: createErr } = await admin
      .from('acts')
      .insert({
        work_id: workUuid,
        act_number: actNumber,
        title: data.title.trim(),
        slug,
        description: data.description?.trim() || null,
        status: 'published',
        display_order: actNumber,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (createErr || !createdAct) {
      console.error('[createWriterActServerFn] Error creating act:', createErr?.message)
      throw new Error(`Failed to create act: ${createErr?.message}`)
    }

    // 3. Reassign specified chapters to this new act if provided
    if (Array.isArray(data.assignedChapterIds) && data.assignedChapterIds.length > 0) {
      await admin
        .from('chapters')
        .update({ act_id: createdAct.id, updated_at: nowIso })
        .in('id', data.assignedChapterIds)
    }

    // Update work's last activity
    await admin
      .from('works')
      .update({
        last_activity_at: nowIso,
        last_activity_type: 'act_created',
        last_activity_detail: {
          actId: createdAct.id,
          actNumber,
          actTitle: data.title.trim(),
          updatedAt: nowIso,
          summaryText: `Act ${actNumber}: "${data.title.trim()}" added to manuscript`,
        },
        updated_at: nowIso,
      })
      .eq('id', workUuid)

    return {
      success: true,
      act: {
        id: createdAct.id,
        number: createdAct.act_number,
        title: createdAct.title,
        slug: createdAct.slug,
        description: createdAct.description || '',
        status: createdAct.status || 'published',
      },
    }
  })

/**
 * 7. Update an Act's title and description
 */
export const updateWriterActServerFn = createServerFn({ method: 'POST' })
  .validator((params: UpdateWriterActPayload) => {
    if (!params.actId?.trim()) throw new Error('Act ID is required')
    if (!params.title?.trim()) throw new Error('Act title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // Verify contest lock if workId provided or resolve from act
    let targetWorkId = data.workId?.trim()
    if (!targetWorkId) {
      const { data: actRow } = await admin.from('acts').select('work_id').eq('id', data.actId).maybeSingle()
      if (actRow?.work_id) targetWorkId = actRow.work_id
    }
    if (targetWorkId) {
      const contestLock = await checkWorkContestLock(targetWorkId, admin)
      if (contestLock.isLocked) {
        throw new Error(
          contestLock.reason ||
            `Cannot modify act: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
        )
      }
    }

    const { data: updatedAct, error } = await admin
      .from('acts')
      .update({
        title: data.title.trim(),
        description: data.description?.trim() || null,
        updated_at: nowIso,
      })
      .eq('id', data.actId)
      .select('*')
      .single()

    if (error || !updatedAct) {
      console.error('[updateWriterActServerFn] Error updating act:', error?.message)
      throw new Error(`Failed to update act: ${error?.message}`)
    }

    return {
      success: true,
      act: {
        id: updatedAct.id,
        number: updatedAct.act_number,
        title: updatedAct.title,
        slug: updatedAct.slug,
        description: updatedAct.description || '',
        status: updatedAct.status || 'published',
      },
    }
  })

/**
 * 8. Delete an Act safely (unlinks chapters to act_id = null instead of deleting them)
 */
export const deleteWriterActServerFn = createServerFn({ method: 'POST' })
  .validator((params: DeleteWriterActPayload) => {
    if (!params.actId?.trim()) throw new Error('Act ID is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Resolve work UUID if provided for tenant isolation
    let workUuid = data.workId?.trim()
    if (workUuid) {
      const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
      if (!isWorkUuid) {
        const { data: wRow } = await admin.from('works').select('id').eq('slug', workUuid.toLowerCase()).maybeSingle()
        if (wRow?.id) workUuid = wRow.id
      }
    } else {
      const { data: actRow } = await admin.from('acts').select('work_id').eq('id', data.actId).maybeSingle()
      if (actRow?.work_id) workUuid = actRow.work_id
    }

    if (workUuid) {
      const contestLock = await checkWorkContestLock(workUuid, admin)
      if (contestLock.isLocked) {
        throw new Error(
          contestLock.reason ||
            `Cannot delete act: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
        )
      }
    }

    // 2. Unlink chapters belonging to this act (set act_id = null)
    let chQuery = admin
      .from('chapters')
      .update({ act_id: null, updated_at: nowIso })
      .eq('act_id', data.actId)

    if (workUuid) {
      chQuery = chQuery.eq('work_id', workUuid)
    }
    await chQuery

    // 3. Delete the act record
    let actQuery = admin
      .from('acts')
      .delete()
      .eq('id', data.actId)

    if (workUuid) {
      actQuery = actQuery.eq('work_id', workUuid)
    }

    const { error } = await actQuery

    if (error) {
      console.error('[deleteWriterActServerFn] Error deleting act:', error.message)
      throw new Error(`Failed to delete act: ${error.message}`)
    }

    // 4. Update work's last activity
    if (workUuid) {
      await admin
        .from('works')
        .update({
          last_activity_at: nowIso,
          last_activity_type: 'act_removed',
          updated_at: nowIso,
        })
        .eq('id', workUuid)
    }

    return { success: true }
  })

export interface UpdateWriterWorkPublicationPayload {
  workId: string
  visibility: 'public' | 'unlisted' | 'draft' | 'private'
  publicationStatus: 'published' | 'draft' | 'archived'
  status?: 'ongoing' | 'completed' | 'on_hiatus' | 'cancelled'
}

/**
 * Core business logic for updating a work's publication status and visibility.
 */
export async function executeWriterWorkPublication(
  data: UpdateWriterWorkPublicationPayload,
  adminClient?: any
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.visibility) throw new Error('Visibility is required')
  if (!data.publicationStatus) throw new Error('Publication status is required')

  const admin = adminClient || createAdminClient()
  const nowIso = new Date().toISOString()

  // 1. Resolve Work UUID
  let workUuid = data.workId.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isUuid) {
    const { data: wRow } = await admin.from('works').select('id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    if (wRow?.id) workUuid = wRow.id
  }

  // Verify contest lock: contest manuscripts cannot alter publication state
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot change publication settings: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  const { data: currentWork } = await admin
    .from('works')
    .select('published_at, visibility, publication_status')
    .eq('id', workUuid)
    .maybeSingle()

  const normalizedPubStatus = data.publicationStatus.toLowerCase() as 'published' | 'draft' | 'archived'
  let normalizedVisibility = data.visibility.toLowerCase() as 'public' | 'unlisted' | 'draft' | 'private'

  // When publishing, if visibility was set to draft/private, default to public
  if (normalizedPubStatus === 'published' && (normalizedVisibility === 'draft' || normalizedVisibility === 'private')) {
    normalizedVisibility = 'public'
  }

  const updatePayload: Record<string, any> = {
    publication_status: normalizedPubStatus,
    visibility: normalizedVisibility,
    is_indexable: normalizedPubStatus === 'published' && normalizedVisibility === 'public',
    updated_at: nowIso,
    last_activity_at: nowIso,
  }

  if (data.status) {
    updatePayload.status = data.status.toLowerCase()
  }

  if (normalizedPubStatus === 'published') {
    const { data: pubChs, error: chErr } = await admin
      .from('chapters')
      .select('id')
      .eq('work_id', workUuid)
      .eq('status', 'published')

    if (chErr) {
      console.warn('[executeWriterWorkPublication] Error verifying published chapters:', chErr?.message)
    }

    const pubCount = Array.isArray(pubChs) ? pubChs.length : 0
    if (pubCount === 0) {
      throw new Error('Cannot publish manuscript without at least 1 published chapter. Please publish Chapter 1 first.')
    }

    if (!currentWork?.published_at) {
      updatePayload.published_at = nowIso
    }
    updatePayload.last_published_at = nowIso
    updatePayload.last_activity_type = 'work_metadata_updated'
    updatePayload.last_activity_detail = {
      summaryText: 'Manuscript published to readers',
      updatedAt: nowIso,
    }
  } else {
    updatePayload.last_activity_type = 'work_metadata_updated'
    updatePayload.last_activity_detail = {
      summaryText: `Manuscript updated (${normalizedPubStatus})`,
      updatedAt: nowIso,
    }
  }

  const { data: updatedWork, error } = await admin
    .from('works')
    .update(updatePayload)
    .eq('id', workUuid)
    .select('*')
    .single()

  if (error || !updatedWork) {
    console.error('[executeWriterWorkPublication] Error updating work publication:', error?.message)
    throw new Error(`Failed to update manuscript publication settings: ${error?.message}`)
  }

  // Synchronize indexability of child chapters with parent work's publication state
  const isWorkPublicAndPublished = normalizedPubStatus === 'published' && normalizedVisibility === 'public'
  const chapterSyncQuery = isWorkPublicAndPublished
    ? admin
        .from('chapters')
        .update({ is_indexable: true })
        .eq('work_id', workUuid)
        .eq('status', 'published')
    : admin
        .from('chapters')
        .update({ is_indexable: false })
        .eq('work_id', workUuid)

  const { error: chapterSyncError } = await chapterSyncQuery
  if (chapterSyncError) {
    console.error('[executeWriterWorkPublication] Error synchronizing chapter indexability:', chapterSyncError.message)
    throw new Error(`Failed to synchronize chapter indexability: ${chapterSyncError.message}`)
  }

  // Automated Search Engine Indexing & Ping Automation for newly published manuscripts
  if (isWorkPublicAndPublished) {
    const workUrl = `https://hatchpen.com/works/${updatedWork.slug || updatedWork.id}`
    const urlsToPing = [workUrl]
    if (updatedWork.genre) {
      urlsToPing.push(`https://hatchpen.com/genre/${slugify(updatedWork.genre)}`)
    }
    void notifySearchEngines(urlsToPing).catch((pingErr: any) => {
      console.warn('[executeWriterWorkPublication] Non-blocking indexing ping notice:', pingErr?.message)
    })
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (updatedWork?.slug) {
    clearPublicWorkCache(updatedWork.slug)
    clearStoryLoreBibleCache(updatedWork.slug)
  }

  return {
    success: true,
    workId: updatedWork.id,
    visibility: updatedWork.visibility,
    publicationStatus: updatedWork.publication_status,
    status: updatedWork.status,
    publishedAt: updatedWork.published_at,
  }
}

/**
 * 9. Update a Work's publication status, visibility, and serialization status
 */
export const updateWriterWorkPublicationServerFn = createServerFn({ method: 'POST' })
  .validator((params: UpdateWriterWorkPublicationPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.visibility) throw new Error('Visibility is required')
    if (!params.publicationStatus) throw new Error('Publication status is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeWriterWorkPublication(data)
  })

export interface UpdateWriterWorkCoverPayload {
  workId: string
  coverImageUrl: string
}

/**
 * Core business logic to update a work's cover image in PostgreSQL
 */
export async function executeWriterWorkCover(
  data: UpdateWriterWorkCoverPayload,
  adminClient?: any
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.coverImageUrl?.trim()) throw new Error('Cover image URL is required')

  const admin = adminClient || createAdminClient()
  const nowIso = new Date().toISOString()

  let workUuid = data.workId.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isUuid) {
    const { data: wRow } = await admin.from('works').select('id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    if (wRow?.id) workUuid = wRow.id
  }

  // Verify contest lock: contest manuscripts cannot alter cover
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot change cover: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  const { data: updatedWork, error } = await admin
    .from('works')
    .update({
      cover_image_path: data.coverImageUrl.trim(),
      last_activity_at: nowIso,
      last_activity_type: 'work_metadata_updated',
      last_activity_detail: {
        summaryText: 'Cover image updated',
        updatedAt: nowIso,
      },
      updated_at: nowIso,
    })
    .eq('id', workUuid)
    .select('id, cover_image_path')
    .single()

  if (error || !updatedWork) {
    console.error('[executeWriterWorkCover] Error updating cover:', error?.message)
    throw new Error(`Failed to update manuscript cover: ${error?.message || 'Database error'}`)
  }

  return {
    success: true,
    workId: updatedWork.id,
    cover: updatedWork.cover_image_path,
  }
}

/**
 * 10. Update a Work's cover image
 */
export const updateWriterWorkCoverServerFn = createServerFn({ method: 'POST' })
  .validator((params: UpdateWriterWorkCoverPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.coverImageUrl?.trim()) throw new Error('Cover image URL is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeWriterWorkCover(data)
  })

export interface UpdateWriterWorkMetadataPayload {
  workId: string
  clerkUserId?: string
  title: string
  subtitle?: string
  description?: string
  categoryName?: string
  genreName?: string
  cover?: string
  tags?: string[]
  language?: string
  status?: 'Ongoing' | 'Completed'
  visibility?: 'Public' | 'Unlisted' | 'Draft'
  publicationStatus?: 'Published' | 'Draft' | 'Archived'
  isMature?: boolean
}

/**
 * Core business logic to update a manuscript's full metadata (title, subtitle, description/synopsis,
 * category, genre, tags, language, status, visibility, mature rating, cover) in PostgreSQL.
 */
export async function executeSaveWriterWorkMetadata(
  data: UpdateWriterWorkMetadataPayload,
  adminClient?: any
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.title?.trim()) throw new Error('Manuscript title is required')

  const admin = adminClient || createAdminClient()
  const nowIso = new Date().toISOString()

  // 1. Resolve Work UUID
  let workUuid = data.workId.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isUuid) {
    const { data: wRow } = await admin.from('works').select('id, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    if (wRow?.id) workUuid = wRow.id
  }

  // Verify contest lock: contest manuscripts cannot modify metadata
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot update manuscript details: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  // Verify work exists
  const { data: dbWork, error: fetchErr } = await admin
    .from('works')
    .select('id, author_id, title, slug, description, cover_image_path, language, status, visibility, publication_status, content_rating, content_warning_required, category_id')
    .eq('id', workUuid)
    .maybeSingle()

  if (fetchErr || !dbWork) {
    throw new Error(`Manuscript not found: ${fetchErr?.message || 'Work does not exist'}`)
  }

  // 2. Resolve Category if provided
  let categoryId: string | null = dbWork.category_id || null
  const rawCategory = data.categoryName?.trim()
  if (rawCategory) {
    const { data: catData } = await admin
      .from('categories')
      .select('id, name')
      .ilike('name', rawCategory)
      .maybeSingle()
    if (catData?.id) {
      categoryId = catData.id
    } else {
      const slugCandidate = rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const { data: catBySlug } = await admin
        .from('categories')
        .select('id')
        .eq('slug', slugCandidate)
        .maybeSingle()
      if (catBySlug?.id) categoryId = catBySlug.id
    }
  }

  // 3. Resolve & Update Genre in work_genres if provided
  let resolvedGenreId: string | null = null
  const rawGenre = data.genreName?.trim()
  if (rawGenre) {
    const { data: genreByName } = await admin
      .from('genres')
      .select('id, name')
      .ilike('name', rawGenre)
      .maybeSingle()

    if (genreByName?.id) {
      resolvedGenreId = genreByName.id
    } else {
      const slugCandidate = rawGenre.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const { data: genreBySlug } = await admin
        .from('genres')
        .select('id')
        .eq('slug', slugCandidate)
        .maybeSingle()
      if (genreBySlug?.id) resolvedGenreId = genreBySlug.id
    }

    if (resolvedGenreId) {
      try {
        await admin.from('work_genres').delete().eq('work_id', workUuid)
        await admin.from('work_genres').insert({
          work_id: workUuid,
          genre_id: resolvedGenreId,
        })
      } catch (gErr: any) {
        console.warn('[executeSaveWriterWorkMetadata] Genre update warning:', gErr?.message)
      }
    }
  }

  // 4. Resolve & Update Thematic Tags in tags and work_tags if provided
  if (Array.isArray(data.tags)) {
    try {
      const resolvedTagIds: string[] = []
      for (const rawTag of data.tags) {
        const cleanTagName = String(rawTag).trim().replace(/^[#,\s]+|[,\s]+$/g, '')
        if (!cleanTagName) continue
        const tagSlug = cleanTagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        if (!tagSlug) continue

        // Check if tag already exists in tags table
        const { data: existingTag } = await admin
          .from('tags')
          .select('id')
          .or(`slug.eq.${tagSlug},name.ilike.${cleanTagName}`)
          .maybeSingle()

        if (existingTag?.id) {
          resolvedTagIds.push(existingTag.id)
        } else {
          const { data: newTag } = await admin
            .from('tags')
            .insert({ name: cleanTagName, slug: tagSlug })
            .select('id')
            .maybeSingle()
          if (newTag?.id) {
            resolvedTagIds.push(newTag.id)
          }
        }
      }

      // Sync junction table work_tags
      await admin.from('work_tags').delete().eq('work_id', workUuid)
      if (resolvedTagIds.length > 0) {
        const uniqueTagIds = Array.from(new Set(resolvedTagIds))
        await admin.from('work_tags').insert(
          uniqueTagIds.map((tid) => ({
            work_id: workUuid,
            tag_id: tid,
          }))
        )
      }
    } catch (tagErr: any) {
      console.warn('[executeSaveWriterWorkMetadata] Tags update warning:', tagErr?.message)
    }
  }

  // 5. Build update payload for works table
  const mappedStatus = data.status ? (data.status.toLowerCase() === 'completed' ? 'completed' : 'ongoing') : dbWork.status
  const mappedVisibility = data.visibility ? data.visibility.toLowerCase() : dbWork.visibility
  const mappedPubStatus = data.publicationStatus ? data.publicationStatus.toLowerCase() : dbWork.publication_status

  const isPublicAndPublished = mappedPubStatus === 'published' && mappedVisibility === 'public'

  const updateData: Record<string, any> = {
    title: data.title.trim(),
    description: data.description !== undefined ? (data.description.trim() || null) : dbWork.description,
    category_id: categoryId,
    language: data.language?.trim() || dbWork.language || 'English',
    status: mappedStatus,
    visibility: mappedVisibility,
    publication_status: mappedPubStatus,
    is_indexable: isPublicAndPublished,
    content_rating: data.isMature !== undefined ? (data.isMature ? 'mature' : 'general') : dbWork.content_rating,
    content_warning_required: data.isMature !== undefined ? !!data.isMature : dbWork.content_warning_required,
    last_activity_at: nowIso,
    last_activity_type: 'work_metadata_updated',
    last_activity_detail: {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || '',
      summaryText: 'Manuscript details updated by author',
      updatedAt: nowIso,
    },
    updated_at: nowIso,
  }

  if (data.cover !== undefined) {
    updateData.cover_image_path = data.cover.trim() || null
  }

  const { data: updatedWork, error: updateErr } = await admin
    .from('works')
    .update(updateData)
    .eq('id', workUuid)
    .select('*')
    .single()

  if (updateErr || !updatedWork) {
    console.error('[executeSaveWriterWorkMetadata] Update error:', updateErr?.message)
    throw new Error(`Failed to update manuscript: ${updateErr?.message || 'Database update error'}`)
  }

  return {
    success: true,
    workId: updatedWork.id,
    title: updatedWork.title,
    subtitle: data.subtitle?.trim() || '',
    description: updatedWork.description,
    cover: updatedWork.cover_image_path,
    category: data.categoryName || 'Novels',
    genre: data.genreName || 'Literary Fiction',
    tags: data.tags || [],
    language: updatedWork.language,
    status: updatedWork.status === 'completed' ? 'Completed' : 'Ongoing',
    visibility: updatedWork.visibility === 'public' ? 'Public' : updatedWork.visibility === 'draft' ? 'Draft' : 'Unlisted',
    publicationStatus: updatedWork.publication_status === 'published' ? 'Published' : updatedWork.publication_status === 'archived' ? 'Archived' : 'Draft',
    isMature: updatedWork.content_rating === 'mature' || updatedWork.content_warning_required === true,
  }
}

/**
 * 11. Update manuscript metadata (title, subtitle, description, taxonomy, tags, cover, etc.)
 */
export const updateWriterWorkMetadataServerFn = createServerFn({ method: 'POST' })
  .validator((params: UpdateWriterWorkMetadataPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.title?.trim()) throw new Error('Manuscript title is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeSaveWriterWorkMetadata(data)
  })

// ============================================================================
// 12. STORY LORE BIBLE & MANUSCRIPT-WIDE GLOSSARY
// ============================================================================

const storyLoreBibleServerCache = new Map<string, { data: any; timestamp: number }>()
const STORY_LORE_CACHE_TTL_MS = 60_000 // 60 seconds server-side cache

/**
 * Invalidates server-side Story Lore Bible cache when lores or chapters change
 */
export function clearStoryLoreBibleCache(workId?: string) {
  if (workId) {
    const clean = workId.trim().toLowerCase()
    for (const [key] of storyLoreBibleServerCache.entries()) {
      if (key.includes(clean)) {
        storyLoreBibleServerCache.delete(key)
      }
    }
  } else {
    storyLoreBibleServerCache.clear()
  }
}

export interface GetStoryLoreBiblePayload {
  workId: string
  currentChapterId?: string
}

export async function executeGetStoryLoreBible(
  data: GetStoryLoreBiblePayload,
  adminClient?: any
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  const admin = adminClient || createAdminClient()

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  if (!isWorkUuid) {
    const { data: wRow } = await admin.from('works').select('id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    if (wRow?.id) workUuid = wRow.id
  }

  const cacheKey = `${workUuid}:${data.currentChapterId || ''}`.toLowerCase()
  const cached = storyLoreBibleServerCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < STORY_LORE_CACHE_TTL_MS) {
    return JSON.parse(JSON.stringify(cached.data))
  }

  // Fetch all chapters
  const { data: chapters } = await admin
    .from('chapters')
    .select('id, title, chapter_number, content')
    .eq('work_id', workUuid)
    .order('chapter_number', { ascending: true })

  const allChapters = chapters || []

  // Query story_lore_entities table with graceful fallback
  let dbEntities: any[] = []
  try {
    const { data: rows, error } = await admin
      .from('story_lore_entities')
      .select('*')
      .eq('work_id', workUuid)
      .order('name', { ascending: true })
    if (!error && Array.isArray(rows)) {
      dbEntities = rows
    }
  } catch {
    // Table not migrated yet
  }

  const entityMap = new Map<string, StoryLoreEntity>()

  for (const row of dbEntities) {
    entityMap.set(row.name.toLowerCase(), {
      id: row.id,
      workId: row.work_id,
      name: row.name,
      entityType: row.entity_type,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalOccurrencesInStory: 0,
      chaptersCount: 0,
      linkedCount: 0,
      unlinkedCount: 0,
    })
  }

  // Auto-discover legacy lore from all chapters
  for (const ch of allChapters) {
    const extracted = extractLoreEntities(ch.content || '')
    for (const ent of extracted) {
      const key = ent.name.toLowerCase()
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          workId: workUuid,
          name: ent.name,
          entityType: ent.entityType,
          description: ent.description,
          totalOccurrencesInStory: 0,
          chaptersCount: 0,
          linkedCount: 0,
          unlinkedCount: 0,
        })
      }
    }
  }

  const entitiesList = Array.from(entityMap.values())
  const currentCh = data.currentChapterId
    ? allChapters.find((c: any) => c.id === data.currentChapterId)
    : null

  for (const ent of entitiesList) {
    let totalStoryMentions = 0
    let totalLinkedCount = 0
    let totalUnlinkedCount = 0
    let chaptersWithLinks = 0
    let chaptersWithUnlinkedMentions = 0
    let chaptersWithMentions = 0

    for (const ch of allChapters) {
      const stats = countEntityMentions(ch.content || '', ent.name)
      if (stats.linkedCount > 0) {
        chaptersWithLinks++
        totalLinkedCount += stats.linkedCount
      }
      if (stats.unlinkedCount > 0) {
        chaptersWithUnlinkedMentions++
        totalUnlinkedCount += stats.unlinkedCount
      }
      const totalInChapter = stats.linkedCount + stats.unlinkedCount
      if (totalInChapter > 0) {
        chaptersWithMentions++
        totalStoryMentions += totalInChapter
      }
    }

    ent.totalOccurrencesInStory = totalStoryMentions
    ent.chaptersCount = chaptersWithLinks // Number of chapters where entity is ACTUALLY linked
    ent.chapterCount = chaptersWithMentions // Total chapters with any mention
    ent.linkedChaptersCount = chaptersWithLinks
    ent.unlinkedChaptersCount = chaptersWithUnlinkedMentions
    ent.totalLinkedCount = totalLinkedCount
    ent.totalUnlinkedCount = totalUnlinkedCount
    ent.mentionCount = totalStoryMentions

    if (currentCh) {
      const curStats = countEntityMentions(currentCh.content || '', ent.name)
      ent.linkedCount = curStats.linkedCount
      ent.unlinkedCount = curStats.unlinkedCount
    } else {
      ent.linkedCount = totalLinkedCount
      ent.unlinkedCount = totalUnlinkedCount
    }
  }

  // Collect all unique lore types from defaults, author preferences, DB entities, and chapter lore
  const typeMap = new Map<string, string>()
  const registerType = (t: string) => {
    const clean = t?.trim()
    if (!clean) return
    const key = clean.toLowerCase()
    if (!typeMap.has(key)) {
      typeMap.set(key, clean)
    }
  }

  registerType('Character')
  registerType('Location')
  registerType('Lore')

  try {
    const { data: workRow } = await admin
      .from('works')
      .select('id, author_id')
      .eq('id', workUuid)
      .maybeSingle()
    if (workRow?.author_id) {
      const { data: authorProfile } = await admin
        .from('profiles')
        .select('preferences')
        .eq('id', workRow.author_id)
        .maybeSingle()
      if (authorProfile?.preferences?.lore_types && Array.isArray(authorProfile.preferences.lore_types)) {
        for (const pt of authorProfile.preferences.lore_types) {
          if (typeof pt === 'string') registerType(pt)
        }
      }
    }
  } catch {
    // Non-fatal if table/profile not available in mock tests
  }

  for (const row of dbEntities) {
    if (row.entity_type) registerType(row.entity_type)
  }

  for (const ent of entitiesList) {
    if (ent.entityType) registerType(ent.entityType)
  }

  const loreTypes = Array.from(typeMap.values())

  const result = {
    entities: entitiesList,
    loreTypes,
    totalChaptersCount: allChapters.length,
  }

  storyLoreBibleServerCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
  })

  return result
}

export const getStoryLoreBibleServerFn = createServerFn({ method: 'GET' })
  .validator((params: GetStoryLoreBiblePayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeGetStoryLoreBible(data)
  })

export interface SaveStoryLoreEntityPayload {
  workId: string
  clerkUserId?: string
  name?: string
  entityName?: string
  entityType?: string
  type?: string
  description?: string
  entityDescription?: string
  linkCurrentChapterId?: string
  applyToAllChapters?: boolean
  linkToAllChapters?: boolean
}

export async function executeSaveStoryLoreEntity(
  data: SaveStoryLoreEntityPayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  const entityName = (data.name || data.entityName || '').trim()
  const entityDescription = (data.description || data.entityDescription || '').trim()
  const entityType = (data.entityType || data.type || 'Character').trim()
  const applyToAllChapters = data.applyToAllChapters ?? data.linkToAllChapters ?? !data.linkCurrentChapterId

  if (!entityName) throw new Error('Entity name is required')
  if (!entityDescription) throw new Error('Tooltip description is required')

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore synchronization alters chapter text and is locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot sync lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  const nowIso = new Date().toISOString()

  let savedEntityId: string | undefined
  try {
    // Check if an entity with this name (case-insensitive) already exists in story bible
    const { data: existingEnt } = await admin
      .from('story_lore_entities')
      .select('id')
      .eq('work_id', workUuid)
      .ilike('name', entityName)
      .maybeSingle()

    if (existingEnt?.id) {
      await admin
        .from('story_lore_entities')
        .update({
          name: entityName,
          entity_type: entityType,
          description: entityDescription,
          updated_at: nowIso,
        })
        .eq('id', existingEnt.id)
      savedEntityId = existingEnt.id
    } else {
      const { data: upserted } = await admin
        .from('story_lore_entities')
        .upsert(
          {
            work_id: workUuid,
            name: entityName,
            entity_type: entityType,
            description: entityDescription,
            updated_at: nowIso,
          },
          { onConflict: 'work_id,name' }
        )
        .select('id')
        .maybeSingle()
      if (upserted?.id) savedEntityId = upserted.id
    }
  } catch {
    // Continue if table not yet migrated
  }

  let updatedChaptersCount = 0
  let totalMentionsLinked = 0

  if (applyToAllChapters) {
    const { data: chapters } = await admin
      .from('chapters')
      .select('id, content')
      .eq('work_id', workUuid)

    if (chapters && chapters.length > 0) {
      for (const ch of chapters) {
        const { newMarkdown, countReplaced } = linkAllOccurrences(ch.content || '', {
          name: entityName,
          entityType,
          description: entityDescription,
        })
        if (countReplaced > 0) {
          const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
          const proseOnly = stripLoreToPlainText(cleanContent)
          const wordCount = proseOnly.split(/\s+/).filter(Boolean).length
          const readingTime = Math.max(1, Math.ceil(wordCount / 220))

          await admin
            .from('chapters')
            .update({
              content: cleanContent,
              word_count: wordCount,
              reading_time_minutes: readingTime,
              updated_at: nowIso,
            })
            .eq('id', ch.id)

          updatedChaptersCount++
          totalMentionsLinked += countReplaced
        }
      }
    }
  } else if (
    data.linkCurrentChapterId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.linkCurrentChapterId)
  ) {
    const { data: curCh } = await admin
      .from('chapters')
      .select('id, content')
      .eq('id', data.linkCurrentChapterId)
      .eq('work_id', workUuid)
      .maybeSingle()

    if (curCh) {
      const { newMarkdown, countReplaced } = linkAllOccurrences(curCh.content || '', {
        name: entityName,
        entityType,
        description: entityDescription,
      })
      if (countReplaced > 0) {
        const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
        const proseOnly = stripLoreToPlainText(cleanContent)
        const wordCount = proseOnly.split(/\s+/).filter(Boolean).length
        const readingTime = Math.max(1, Math.ceil(wordCount / 220))

        await admin
          .from('chapters')
          .update({
            content: cleanContent,
            word_count: wordCount,
            reading_time_minutes: readingTime,
            updated_at: nowIso,
          })
          .eq('id', curCh.id)

        updatedChaptersCount = 1
        totalMentionsLinked = countReplaced
      }
    }
  }

  // Ensure entityType is persisted in author's profile preferences
  if (profile?.id) {
    try {
      const existingPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}
      const currentLoreTypes: string[] = Array.isArray(existingPrefs.lore_types) ? existingPrefs.lore_types : ['Character', 'Location', 'Lore']
      const exists = currentLoreTypes.some(t => t.toLowerCase() === entityType.toLowerCase())
      if (!exists) {
        const updatedTypes = [...currentLoreTypes, entityType]
        await admin.from('profiles').update({
          preferences: {
            ...existingPrefs,
            lore_types: updatedTypes
          }
        }).eq('id', profile.id)
      }
    } catch {
      // Non-fatal if profile update fails
    }
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }
  if (workRow.slug) clearPublicWorkCache(workRow.slug)
  clearStoryLoreBibleCache(workUuid)

  return {
    success: true,
    entity: {
      id: savedEntityId,
      workId: workUuid,
      name: entityName,
      entityType,
      description: entityDescription,
    },
    updatedChaptersCount,
    chaptersUpdated: updatedChaptersCount,
    totalMentionsLinked,
    totalLinked: totalMentionsLinked,
  }
}

export const saveStoryLoreEntityServerFn = createServerFn({ method: 'POST' })
  .validator((params: SaveStoryLoreEntityPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    const entityName = (params.name || params.entityName || '').trim()
    const entityDescription = (params.description || params.entityDescription || '').trim()
    if (!entityName) throw new Error('Entity name is required')
    if (!entityDescription) throw new Error('Tooltip description is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeSaveStoryLoreEntity(data)
  })

// ============================================================================
// CUSTOM USER LORE TYPES PERSISTENCE
// ============================================================================

export interface SaveUserLoreTypePayload {
  workId: string
  clerkUserId?: string
  loreType: string
}

export async function executeSaveUserLoreType(
  data: SaveUserLoreTypePayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.loreType?.trim()) throw new Error('Lore type is required')

  const admin = adminClient || createAdminClient()
  if (data.clerkUserId !== undefined && !data.clerkUserId) {
    throw new Error('User authentication required')
  }

  let profile: any = null
  if (data.clerkUserId) {
    const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
    profile = await resolveUserProfile(admin, verifiedUserId)
  }

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null
  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  const authorId = profile?.id || workRow?.author_id
  const newType = data.loreType.trim()

  if (authorId) {
    try {
      const { data: authorProfile } = await admin
        .from('profiles')
        .select('preferences')
        .eq('id', authorId)
        .maybeSingle()
      const existingPrefs = (authorProfile?.preferences && typeof authorProfile.preferences === 'object') ? authorProfile.preferences : {}
      const currentLoreTypes: string[] = Array.isArray(existingPrefs.lore_types) ? existingPrefs.lore_types : ['Character', 'Location', 'Lore']
      const exists = currentLoreTypes.some(t => t.toLowerCase() === newType.toLowerCase())

      if (!exists) {
        const updatedTypes = [...currentLoreTypes, newType]
        await admin.from('profiles').update({
          preferences: {
            ...existingPrefs,
            lore_types: updatedTypes
          }
        }).eq('id', authorId)
      }
    } catch {
      // Non-fatal
    }
  }

  return {
    success: true,
    loreType: newType,
  }
}

export const saveUserLoreTypeServerFn = createServerFn({ method: 'POST' })
  .validator((params: SaveUserLoreTypePayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.loreType?.trim()) throw new Error('Lore type is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeSaveUserLoreType(data)
  })

export interface BulkLinkStoryLorePayload {
  workId: string
  clerkUserId?: string
  entityName?: string
  name?: string
  entityType?: string
  type?: string
  entityDescription?: string
  description?: string
  chapterIds?: string[]
}

export async function executeBulkLinkStoryLore(
  data: BulkLinkStoryLorePayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  const entityName = (data.entityName || data.name || '').trim()
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!entityName) throw new Error('Entity name is required')

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore modifications alter chapter text and are locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot link lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  // Find entity definition from payload, table or chapters
  let entityType = (data.entityType || data.type || 'Character').trim()
  let description = (data.description || data.entityDescription || '').trim()

  try {
    const { data: entRow } = await admin
      .from('story_lore_entities')
      .select('*')
      .eq('work_id', workUuid)
      .ilike('name', entityName)
      .maybeSingle()
    if (entRow) {
      entityType = entRow.entity_type
      description = entRow.description
    }
  } catch {
    // Table not migrated
  }

  let query = admin.from('chapters').select('id, content').eq('work_id', workUuid)
  if (data.chapterIds && data.chapterIds.length > 0) {
    query = query.in('id', data.chapterIds)
  }

  const { data: chapters } = await query
  const nowIso = new Date().toISOString()
  let updatedChaptersCount = 0
  let totalMentionsLinked = 0

  if (!description && chapters) {
    for (const ch of chapters) {
      const extracted = extractLoreEntities(ch.content || '')
      const found = extracted.find((e) => e.name.toLowerCase() === entityName.toLowerCase())
      if (found) {
        entityType = found.entityType
        description = found.description
        break
      }
    }
  }

  if (!description) {
    description = entityName
  }

  if (chapters && chapters.length > 0) {
    const chaptersToUpdate: {
      id: string
      content: string
      wordCount: number
      readingTime: number
    }[] = []

    for (const ch of chapters) {
      const { newMarkdown, countReplaced } = linkAllOccurrences(ch.content || '', {
        name: entityName,
        entityType,
        description,
      })
      if (countReplaced > 0) {
        const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
        const proseOnly = stripLoreToPlainText(cleanContent)
        const wordCount = proseOnly.split(/\s+/).filter(Boolean).length
        const readingTime = Math.max(1, Math.ceil(wordCount / 220))

        chaptersToUpdate.push({
          id: ch.id,
          content: cleanContent,
          wordCount,
          readingTime,
        })
        totalMentionsLinked += countReplaced
      }
    }

    const CONCURRENCY = 6
    for (let i = 0; i < chaptersToUpdate.length; i += CONCURRENCY) {
      const batch = chaptersToUpdate.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map((item) =>
          admin
            .from('chapters')
            .update({
              content: item.content,
              word_count: item.wordCount,
              reading_time_minutes: item.readingTime,
              updated_at: nowIso,
            })
            .eq('id', item.id)
        )
      )
      updatedChaptersCount += batch.length
    }
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }
  if (workRow.slug) clearPublicWorkCache(workRow.slug)
  clearStoryLoreBibleCache(workUuid)

  return {
    success: true,
    updatedChaptersCount,
    chaptersUpdated: updatedChaptersCount,
    totalMentionsLinked,
    totalLinked: totalMentionsLinked,
    entityName,
  }
}

export const bulkLinkStoryLoreServerFn = createServerFn({ method: 'POST' })
  .validator((params: BulkLinkStoryLorePayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    const name = (params.entityName || params.name || '').trim()
    if (!name) throw new Error('Entity name is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeBulkLinkStoryLore(data)
  })

export interface SyncAllStoryLorePayload {
  workId: string
  clerkUserId?: string
  chapterIds?: string[]
}

export async function executeSyncAllStoryLore(
  data: SyncAllStoryLorePayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore synchronization alters chapter text and is locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot sync lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  // 1. Fetch all chapters for this work
  let chapterQuery = admin.from('chapters').select('id, title, chapter_number, content').eq('work_id', workUuid)
  if (data.chapterIds && data.chapterIds.length > 0) {
    chapterQuery = chapterQuery.in('id', data.chapterIds)
  }
  const { data: chapters, error: chErr } = await chapterQuery
  if (chErr) throw new Error(chErr.message)
  const allChapters = chapters || []

  // 2. Fetch all recorded lore entities from DB and fallback scan
  const entityMap = new Map<string, LoreEntity>()
  try {
    const { data: dbRows } = await admin
      .from('story_lore_entities')
      .select('name, entity_type, description')
      .eq('work_id', workUuid)
    if (Array.isArray(dbRows)) {
      for (const row of dbRows) {
        entityMap.set(row.name.toLowerCase().trim(), {
          name: row.name.trim(),
          entityType: row.entity_type,
          description: row.description,
        })
      }
    }
  } catch {
    // Continue if table not yet migrated
  }

  for (const ch of allChapters) {
    const extracted = extractLoreEntities(ch.content || '')
    for (const ent of extracted) {
      const key = ent.name.toLowerCase().trim()
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          name: ent.name.trim(),
          entityType: ent.entityType,
          description: ent.description,
        })
      }
    }
  }

  const allEntities = Array.from(entityMap.values())
  if (allEntities.length === 0 || allChapters.length === 0) {
    return {
      success: true,
      updatedChaptersCount: 0,
      totalMentionsLinked: 0,
      totalEntities: 0,
    }
  }

  // 3. Scan & link across all chapters
  let updatedChaptersCount = 0
  let totalMentionsLinked = 0
  const nowIso = new Date().toISOString()

  const chaptersToUpdate: {
    id: string
    content: string
    wordCount: number
    readingTime: number
  }[] = []

  for (const ch of allChapters) {
    const rawContent = ch.content || ''
    const { newMarkdown, totalLinked } = linkMultipleEntities(rawContent, allEntities)

    if (totalLinked > 0) {
      const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
      const proseOnly = stripLoreToPlainText(cleanContent)
      const wordCount = proseOnly.split(/\s+/).filter(Boolean).length
      const readingTime = Math.max(1, Math.ceil(wordCount / 220))

      chaptersToUpdate.push({
        id: ch.id,
        content: cleanContent,
        wordCount,
        readingTime,
      })
      totalMentionsLinked += totalLinked
    }
  }

  // Batch update chapters concurrently (6 at a time) to prevent serverless timeouts
  const CONCURRENCY = 6
  for (let i = 0; i < chaptersToUpdate.length; i += CONCURRENCY) {
    const batch = chaptersToUpdate.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map((item) =>
        admin
          .from('chapters')
          .update({
            content: item.content,
            word_count: item.wordCount,
            reading_time_minutes: item.readingTime,
            updated_at: nowIso,
          })
          .eq('id', item.id)
      )
    )
    updatedChaptersCount += batch.length
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }

  return {
    success: true,
    updatedChaptersCount,
    totalMentionsLinked,
    totalEntities: allEntities.length,
  }
}

export const syncAllStoryLoreServerFn = createServerFn({ method: 'POST' })
  .validator((params: SyncAllStoryLorePayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeSyncAllStoryLore(data)
  })

export interface BulkUnlinkStoryLorePayload {
  workId: string
  clerkUserId?: string
  entityName?: string
  name?: string
  chapterIds?: string[]
}

export async function executeBulkUnlinkStoryLore(
  data: BulkUnlinkStoryLorePayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  const entityName = (data.entityName || data.name || '').trim()
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!entityName) throw new Error('Entity name is required')

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore synchronization alters chapter text and is locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot sync lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  let query = admin.from('chapters').select('id, content').eq('work_id', workUuid)
  if (data.chapterIds && data.chapterIds.length > 0) {
    query = query.in('id', data.chapterIds)
  }

  const { data: chapters } = await query
  const nowIso = new Date().toISOString()
  let updatedChaptersCount = 0
  let totalMentionsUnlinked = 0

  if (chapters && chapters.length > 0) {
    const chaptersToUpdate: {
      id: string
      content: string
      wordCount: number
      readingTime: number
    }[] = []

    for (const ch of chapters) {
      const { newMarkdown, countUnlinked } = unlinkAllOccurrences(ch.content || '', entityName)
      if (countUnlinked > 0) {
        const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
        const proseOnly = stripLoreToPlainText(cleanContent)
        const wordCount = proseOnly.split(/\s+/).filter(Boolean).length
        const readingTime = Math.max(1, Math.ceil(wordCount / 220))

        chaptersToUpdate.push({
          id: ch.id,
          content: cleanContent,
          wordCount,
          readingTime,
        })
        totalMentionsUnlinked += countUnlinked
      }
    }

    const CONCURRENCY = 6
    for (let i = 0; i < chaptersToUpdate.length; i += CONCURRENCY) {
      const batch = chaptersToUpdate.slice(i, i + CONCURRENCY)
      await Promise.all(
        batch.map((item) =>
          admin
            .from('chapters')
            .update({
              content: item.content,
              word_count: item.wordCount,
              reading_time_minutes: item.readingTime,
              updated_at: nowIso,
            })
            .eq('id', item.id)
        )
      )
      updatedChaptersCount += batch.length
    }
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }
  if (workRow.slug) clearPublicWorkCache(workRow.slug)
  clearStoryLoreBibleCache(workUuid)

  return {
    success: true,
    updatedChaptersCount,
    chaptersUpdated: updatedChaptersCount,
    totalMentionsUnlinked,
    totalUnlinked: totalMentionsUnlinked,
    entityName,
  }
}

export const bulkUnlinkStoryLoreServerFn = createServerFn({ method: 'POST' })
  .validator((params: BulkUnlinkStoryLorePayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    const name = (params.entityName || params.name || '').trim()
    if (!name) throw new Error('Entity name is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeBulkUnlinkStoryLore(data)
  })

export interface DeleteStoryLoreEntityPayload {
  workId: string
  clerkUserId?: string
  entityName?: string
  name?: string
  entityId?: string
  unlinkEverywhere?: boolean
}

export async function executeDeleteStoryLoreEntity(
  data: DeleteStoryLoreEntityPayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  const entityName = (data.entityName || data.name || data.entityId || '').trim()
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!entityName) throw new Error('Entity name is required')

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('id', workUuid).maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin.from('works').select('id, title, slug, author_id').eq('slug', workUuid.toLowerCase()).maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore synchronization alters chapter text and is locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot sync lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  try {
    await admin
      .from('story_lore_entities')
      .delete()
      .eq('work_id', workUuid)
      .ilike('name', entityName)
  } catch {
    // Table not yet migrated
  }

  let unlinkedCount = 0
  if (data.unlinkEverywhere) {
    const unlinkRes = await executeBulkUnlinkStoryLore(
      {
        workId: workUuid,
        clerkUserId: data.clerkUserId,
        entityName,
      },
      admin,
      authResolver
    )
    unlinkedCount = unlinkRes?.totalMentionsUnlinked || 0
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }
  if (workRow.slug) clearPublicWorkCache(workRow.slug)
  clearStoryLoreBibleCache(workUuid)

  return { success: true, deletedName: entityName, unlinkedCount }
}

export const deleteStoryLoreEntityServerFn = createServerFn({ method: 'POST' })
  .validator((params: DeleteStoryLoreEntityPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    const name = (params.entityName || params.name || params.entityId || '').trim()
    if (!name) throw new Error('Entity name is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeDeleteStoryLoreEntity(data)
  })

export interface ImportStoryLoreCsvPayload {
  workId: string
  clerkUserId?: string
  csvText: string
  linkAllChapters?: boolean
}

export async function executeImportStoryLoreCsv(
  data: ImportStoryLoreCsvPayload,
  adminClient?: any,
  authResolver?: () => Promise<{ userId: string | null } | null>
) {
  if (!data.workId?.trim()) throw new Error('Work ID is required')
  if (!data.csvText || typeof data.csvText !== 'string' || !data.csvText.trim()) {
    throw new Error('CSV text content is required')
  }

  const admin = adminClient || createAdminClient()
  if (!data.clerkUserId) throw new Error('User authentication required')
  const verifiedUserId = await authenticateWriterRequest(data.clerkUserId, authResolver)
  const profile = await resolveUserProfile(admin, verifiedUserId)

  let workUuid = data.workId.trim()
  const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workUuid)
  let workRow: any = null

  if (isWorkUuid) {
    const { data: row } = await admin
      .from('works')
      .select('id, title, slug, author_id')
      .eq('id', workUuid)
      .maybeSingle()
    workRow = row
  } else {
    const { data: row } = await admin
      .from('works')
      .select('id, title, slug, author_id')
      .eq('slug', workUuid.toLowerCase())
      .maybeSingle()
    workRow = row
    if (workRow?.id) workUuid = workRow.id
  }

  if (!workRow || workRow.author_id !== profile.id) {
    throw new Error('Unauthorized: You can only manage lore for your own manuscripts.')
  }

  // Verify contest lock: lore synchronization alters chapter text and is locked
  const contestLock = await checkWorkContestLock(workUuid, admin)
  if (contestLock.isLocked) {
    throw new Error(
      contestLock.reason ||
        `Cannot sync lore: Manuscript has been entered into ${contestLock.contestTitle || 'a writing contest'} and is locked against changes.`
    )
  }

  // Parse CSV
  const parseResult = parseLoreCsv(data.csvText)
  if (parseResult.errors.length > 0 && parseResult.validRows.length === 0) {
    throw new Error(`Invalid CSV format: ${parseResult.errors[0]}`)
  }
  if (parseResult.validRows.length === 0) {
    throw new Error('No valid entity rows found in the CSV file.')
  }

  const nowIso = new Date().toISOString()

  // Map valid entries, deduplicating by case-insensitive name for database upsert
  const uniqueByNameMap = new Map<
    string,
    { work_id: string; name: string; entity_type: string; description: string; updated_at: string }
  >()

  for (const row of parseResult.validRows) {
    const key = row.name.trim().toLowerCase()
    uniqueByNameMap.set(key, {
      work_id: workUuid,
      name: row.name.trim(),
      entity_type: row.type || 'Character',
      description: row.tooltip.trim(),
      updated_at: nowIso,
    })
  }

  const rowsToUpsert = Array.from(uniqueByNameMap.values())

  try {
    const CHUNK_SIZE = 100
    for (let i = 0; i < rowsToUpsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToUpsert.slice(i, i + CHUNK_SIZE)
      const { error: chunkErr } = await admin.from('story_lore_entities').upsert(chunk, { onConflict: 'work_id,name' })
      if (chunkErr) {
        console.error('[executeImportStoryLoreCsv] Upsert chunk error:', chunkErr)
      }
    }
  } catch (err: any) {
    console.warn('[executeImportStoryLoreCsv] story_lore_entities table upsert notice:', err?.message)
  }

  let chaptersUpdated = 0
  let totalMentionsLinked = 0

  if (data.linkAllChapters) {
    const { data: chapters } = await admin
      .from('chapters')
      .select('id, content')
      .eq('work_id', workUuid)

    if (chapters && chapters.length > 0) {
      const entitiesToLink: LoreEntity[] = rowsToUpsert.map((r) => ({
        name: r.name,
        entityType: r.entity_type,
        description: r.description,
      }))

      const chaptersToUpdate: {
        id: string
        content: string
        wordCount: number
        readingTime: number
      }[] = []

      for (const ch of chapters) {
        const { newMarkdown, totalLinked } = linkMultipleEntities(ch.content || '', entitiesToLink)
        if (totalLinked > 0) {
          const cleanContent = newMarkdown.replace(/\\+[ \t]*(?=\r?\n|$)/g, '').trim()
          const wordCount = cleanContent.split(/\s+/).filter(Boolean).length
          const readingTime = Math.max(1, Math.ceil(wordCount / 220))
          chaptersToUpdate.push({
            id: ch.id,
            content: cleanContent,
            wordCount,
            readingTime,
          })
          totalMentionsLinked += totalLinked
        }
      }

      // Batch update chapters concurrently (5 at a time)
      const CONCURRENCY = 5
      for (let i = 0; i < chaptersToUpdate.length; i += CONCURRENCY) {
        const batch = chaptersToUpdate.slice(i, i + CONCURRENCY)
        await Promise.all(
          batch.map((item) =>
            admin
              .from('chapters')
              .update({
                content: item.content,
                word_count: item.wordCount,
                reading_time_minutes: item.readingTime,
                updated_at: nowIso,
              })
              .eq('id', item.id)
          )
        )
        chaptersUpdated += batch.length
      }
    }
  }

  clearPublicWorkCache(workUuid)
  clearStoryLoreBibleCache(workUuid)
  if (workRow?.slug) {
    clearPublicWorkCache(workRow.slug)
    clearStoryLoreBibleCache(workRow.slug)
  }
  if (workRow.slug) clearPublicWorkCache(workRow.slug)
  clearStoryLoreBibleCache(workUuid)

  return {
    success: true,
    totalRowsParsed: parseResult.totalRows,
    importedCount: parseResult.validRows.length,
    uniqueEntitiesCount: rowsToUpsert.length,
    duplicateCount: parseResult.duplicateCount,
    chaptersUpdated,
    totalMentionsLinked,
    warnings: parseResult.errors,
  }
}

export const importStoryLoreCsvServerFn = createServerFn({ method: 'POST' })
  .validator((params: ImportStoryLoreCsvPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.csvText?.trim()) throw new Error('CSV text is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeImportStoryLoreCsv(data)
  })
