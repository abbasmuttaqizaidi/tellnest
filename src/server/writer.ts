import { createServerFn } from '@tanstack/react-start'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '../lib/supabase/server.ts'
import type { Database } from '../lib/supabase/types.ts'
import type { Chapter } from '../data/mockData'

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

    let aggregatedReads = 0
    let aggregatedSaves = 0
    let activeDraftsCount = 0

    const works: WriterWorkListItem[] = (dbWorks || []).map((w: any) => {
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
        cover: w.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
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
  clientUserId: string,
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

  if (serverUserId !== clientUserId) {
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
      content_rating: 'general',
      content_warning_required: false,
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
        save_count,
        reading_time_minutes,
        created_at,
        updated_at,
        last_activity_at,
        category:categories(id, name, slug),
        author:profiles(id, clerk_user_id, display_name, username, avatar_path)
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
        actId: ch.act_id,
        actNumber: parentAct ? parentAct.number : 1,
        actTitle: parentAct ? parentAct.title : undefined,
        status: (ch.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
        wordCount: ch.word_count || 0,
        readTimeMinutes: ch.reading_time_minutes || 1,
        viewCount: Number(ch.view_count || 0),
        publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
        content: ch.content || '',
      }
    })

    return {
      id: dbWork.id,
      title: dbWork.title,
      slug: dbWork.slug,
      subtitle: '',
      cover: dbWork.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      category: categoryObj?.name || 'Novels',
      categorySlug: categoryObj?.slug || 'novels',
      genre: 'Literary Fiction',
      genreSlug: 'literary-fiction',
      tags: ['Serialized'],
      language: dbWork.language || 'English',
      status: dbWork.status === 'completed' ? 'Completed' : 'Ongoing',
      visibility: (dbWork.visibility === 'public' ? 'Public' : dbWork.visibility === 'draft' ? 'Draft' : 'Unlisted') as any,
      publicationStatus: (dbWork.publication_status === 'published' ? 'Published' : dbWork.publication_status === 'archived' ? 'Archived' : 'Draft') as any,
      publishedAt: dbWork.published_at || null,
      isMature: false,
      synopsis: dbWork.description || '',
      fullDescription: dbWork.description || '',
      chaptersCount: chapters.length,
      publishedChaptersCount: chapters.filter((c: any) => c.status === 'published').length,
      totalReads: Number(dbWork.view_count || 0).toLocaleString(),
      totalSaves: Number(dbWork.save_count || 0),
      ratingScore: 5.0,
      ratingCount: 1,
      createdAt: dbWork.created_at ? new Date(dbWork.created_at).toLocaleDateString() : 'Recently',
      updatedAt: dbWork.updated_at ? new Date(dbWork.updated_at).toLocaleDateString() : 'Recently',
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
    // Robust server-side sanitization: strip any markdown hard-break trailing backslashes
    const cleanContent = hasContent ? data.content!.replace(/\\+[ \t]*(?=\r?\n|$)/g, '') : undefined
    const wordCount = cleanContent !== undefined ? cleanContent.trim().split(/\s+/).filter(Boolean).length : undefined
    const readingTime = wordCount !== undefined ? Math.max(1, Math.ceil(wordCount / 220)) : undefined
    const status = data.status

    // 1. Resolve work ID (if passed as slug)
    let workUuid = data.workId
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    }

    // 2. Check if chapter exists by ID (UUID check)
    const isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.chapterId)

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

          updateData.is_indexable = Boolean(isParentEligible)
        } else {
          updateData.is_indexable = false
        }
      }
      if (data.bannerImage !== undefined) {
        updateData.banner_image_path = data.bannerImage?.trim() || null
      }
      if (data.actId !== undefined) {
        updateData.act_id = data.actId || null
      }

      const { error: chErr } = await admin
        .from('chapters')
        .update(updateData)
        .eq('id', data.chapterId)

      if (chErr) {
        console.error('[saveWriterChapterServerFn] Error updating chapter in DB:', chErr.message)
        throw new Error(chErr.message)
      }
    } else {
      // If chapter was created optimistically with non-UUID, insert into DB
      const { data: existingChs } = await admin
        .from('chapters')
        .select('chapter_number')
        .eq('work_id', workUuid)
        .order('chapter_number', { ascending: false })
        .limit(1)

      const nextNum = (existingChs?.[0]?.chapter_number || 0) + 1
      const uniqueSuffix = Math.random().toString(36).substring(2, 6)
      const chSlug = `ch-${nextNum}-${uniqueSuffix}`

      let isIndexable = false
      if (status === 'published') {
        const { data: parentWork } = await admin
          .from('works')
          .select('visibility, publication_status, is_indexable')
          .eq('id', workUuid)
          .maybeSingle()

        isIndexable = Boolean(
          parentWork &&
          (parentWork.visibility || '').toLowerCase() === 'public' &&
          (parentWork.publication_status || '').toLowerCase() === 'published' &&
          parentWork.is_indexable === true
        )
      }

      const { data: newCh, error: insertErr } = await admin
        .from('chapters')
        .insert({
          work_id: workUuid,
          chapter_number: nextNum,
          title: data.title?.trim() || 'Untitled Chapter',
          subtitle: data.subtitle?.trim() || null,
          slug: chSlug,
          content: cleanContent || '',
          word_count: wordCount || 0,
          reading_time_minutes: readingTime || 1,
          status: status || 'draft',
          is_indexable: isIndexable,
          published_at: status === 'published' ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('[saveWriterChapterServerFn] Error inserting chapter into DB:', insertErr.message)
        throw new Error(insertErr.message)
      }
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
    let actId: string | null = null
    if (data.actId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.actId)) {
      actId = data.actId
    }

    const { data: createdCh, error: createErr } = await admin
      .from('chapters')
      .insert({
        work_id: workUuid,
        act_id: actId,
        chapter_number: nextNumber,
        title: data.title.trim(),
        slug,
        subtitle: '',
        content: '',
        word_count: 0,
        reading_time_minutes: 1,
        status: 'draft',
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

    // 2. Determine act number
    let actNumber = data.actNumber
    if (!actNumber || isNaN(actNumber)) {
      const { data: existingActs } = await admin
        .from('acts')
        .select('act_number')
        .eq('work_id', workUuid)
        .order('act_number', { ascending: false })
        .limit(1)

      actNumber = ((existingActs?.[0]?.act_number) || 0) + 1
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

    // 1. Unlink chapters belonging to this act (set act_id = null)
    await admin
      .from('chapters')
      .update({ act_id: null, updated_at: nowIso })
      .eq('act_id', data.actId)

    // 2. Delete the act record
    const { error } = await admin
      .from('acts')
      .delete()
      .eq('id', data.actId)

    if (error) {
      console.error('[deleteWriterActServerFn] Error deleting act:', error.message)
      throw new Error(`Failed to delete act: ${error.message}`)
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
