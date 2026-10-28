import { createServerFn } from '@tanstack/react-start'
import {
  getPublicWorkBySlug,
  getDiscoverWorks,
  getWorkById,
  createWork,
  updateWork,
  publishWork,
} from '../lib/supabase/queries/works.ts'
import type { WorkStatus } from '../lib/supabase/types.ts'
import { getUtcWeekBoundaries, filterAndSortWorks } from '../lib/discover/filters.ts'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy.ts'
import { isWorkIndexable } from './sitemap.ts'

/**
 * Server Function: Get a full public work (with acts and chapters) by id or slug.
 * Used by Route loader, SSR head, and Reader components so DB works are instantly resolved without flash or 404.
 */
export interface PublicWorkDependencies {
  supabaseClient?: any
}

/**
 * Core business logic: Fetch a public or unlisted published work by ID or slug.
 * Strictly enforces:
 *  - visibility IN ('public', 'unlisted')
 *  - publication_status === 'published'
 *  - only published chapters are returned
 *  - only published acts are returned
 *  - works with 0 published chapters return valid work metadata with empty chapters array
 *  - draft and unpublished works return null
 */
export async function executeGetPublicWork(
  idOrSlug: string,
  dependencies: PublicWorkDependencies = {}
) {
  if (!idOrSlug || typeof idOrSlug !== 'string' || !idOrSlug.trim()) {
    return null
  }
  const clean = idOrSlug.trim().toLowerCase()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

  let client = dependencies.supabaseClient
  if (!client) {
    const { supabase } = await import('../lib/supabase/client.ts')
    client = supabase
  }

  let query = client
    .from('works')
    .select(`
      id,
      title,
      slug,
      description,
      cover_image_path,
      language,
      status,
      visibility,
      publication_status,
      is_indexable,
      word_count,
      chapter_count,
      reading_time_minutes,
      view_count,
      like_count,
      save_count,
      impression_count,
      created_at,
      updated_at,
      last_activity_at,
      author:profiles!works_author_id_fkey(
        id,
        username,
        display_name,
        avatar_path,
        bio
      ),
      category:categories(id, name, slug),
      work_genres (genres (id, name, slug)),
      acts(
        id,
        work_id,
        act_number,
        title,
        slug,
        description,
        status
      ),
      chapters(
        id,
        work_id,
        act_id,
        chapter_number,
        title,
        subtitle,
        slug,
        content,
        word_count,
        reading_time_minutes,
        status,
        is_indexable,
        banner_image_path,
        view_count,
        published_at
      )
    `)
    .in('visibility', ['public', 'unlisted'])
    .eq('publication_status', 'published')

  if (isUuid) {
    query = query.or(`id.eq.${clean},slug.eq.${clean}`)
  } else {
    query = query.eq('slug', clean)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data) return null

  // Defense-in-depth: enforce allowed visibility and publication status
  if (!['public', 'unlisted'].includes(data.visibility) || data.publication_status !== 'published') {
    return null
  }

  let mappedStatus: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled' = 'Ongoing'
  if (data.status === 'completed') mappedStatus = 'Completed'
  else if (data.status === 'on_hiatus') mappedStatus = 'On Hiatus'
  else if (data.status === 'cancelled') mappedStatus = 'Cancelled'

  const rawChapters = ((data as any).chapters || [])
  const rawActs = ((data as any).acts || [])
  const publishedActs = rawActs.filter((a: any) => (a.status || '').toLowerCase() === 'published')
  const publishedActIds = new Set<string>(publishedActs.map((a: any) => a.id))

  // Public readers strictly only see published chapters whose act is published (or null for standalone chapters)
  const publishedChapters = rawChapters.filter((c: any) => {
    if ((c.status || '').toLowerCase() !== 'published') return false
    if (c.act_id && !publishedActIds.has(c.act_id)) return false
    return true
  })
  const publishedCount = publishedChapters.length

  const mappedActs = publishedActs
    .sort((a: any, b: any) => (a.act_number || 0) - (b.act_number || 0))
    .map((act: any) => {
      const actChapters = publishedChapters.filter((c: any) => c.act_id === act.id)
      const actViewCount = actChapters.reduce((sum: number, c: any) => sum + (c.view_count || 0), 0)
      return {
        id: act.id,
        workId: act.work_id,
        number: act.act_number,
        title: act.title,
        slug: act.slug,
        description: act.description || '',
        status: act.status || 'published',
        viewCount: actViewCount,
      }
    })

  const mappedChapters = publishedChapters
    .sort((a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0))
    .map((ch: any) => {
      const parentAct = mappedActs.find((a: any) => a.id === ch.act_id)
      return {
        id: ch.id,
        number: ch.chapter_number,
        title: ch.title,
        subtitle: ch.subtitle || '',
        bannerImage: ch.banner_image_path || undefined,
        actId: ch.act_id,
        actNumber: parentAct ? parentAct.number : 1,
        actTitle: parentAct ? parentAct.title : undefined,
        status: ch.status || 'published',
        is_indexable: ch.is_indexable === true,
        isIndexable: ch.is_indexable === true,
        wordCount: ch.word_count || 0,
        readTimeMinutes: ch.reading_time_minutes || 1,
        viewCount: Number(ch.view_count || 0),
        publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
        content: ch.content || '',
      }
    })

  const authorObj = (data as any).author
  const categoryObj = (data as any).category
  const genreList = ((data as any).work_genres || []).map((wg: any) => wg.genres).filter(Boolean)
  const primaryGenre = genreList[0]

  return {
    id: data.id,
    title: data.title,
    slug: data.slug || '',
    subtitle: '',
    cover:
      data.cover_image_path ||
      '/default-book-cover.webp',
    category: categoryObj?.name || 'Novels',
    categorySlug: categoryObj?.slug || 'novels',
    genre: primaryGenre?.name || 'Literary Fiction',
    genreSlug: primaryGenre?.slug || 'literary-fiction',
    tags: [
      ...genreList.map((g: any) => g.name),
      'Serialized',
      'Archival',
    ],
    language: data.language || 'English',
    status: mappedStatus,
    visibility: (data.visibility === 'public' ? 'Public' : 'Unlisted') as any,
    publication_status: data.publication_status || 'published',
    publicationStatus: data.publication_status || 'published',
    is_indexable: data.is_indexable === true,
    isIndexable: data.is_indexable === true,
    isMature: false,
    featured: true,
    trending: false,
    rising: false,
    editorPick: false,
    synopsis: data.description || '',
    fullDescription: data.description || '',
    chaptersCount: publishedCount,
    publishedChaptersCount: publishedCount,
    totalReads: String(data.view_count || '0'),
    impressionCount: Number(data.impression_count || 0),
    totalSaves: Number(data.save_count || 0),
    likeCount: Number(data.like_count || 0),
    like_count: Number(data.like_count || 0),
    ratingScore: 5.0,
    ratingCount: Number(data.like_count || 0),
    createdAt: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
    updatedAt: data.updated_at ? new Date(data.updated_at).toISOString() : new Date().toISOString(),
    lastActivityAt: data.last_activity_at ? new Date(data.last_activity_at).toISOString() : data.created_at,
    author: {
      id: authorObj?.id || 'author-unknown',
      name: authorObj?.display_name || 'Hatchpen Author',
      handle: authorObj?.username || 'author',
      avatar:
        authorObj?.avatar_path ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bio: authorObj?.bio || '',
      location: '',
      worksCount: 1,
      followersCount: 0,
      totalReads: String(data.view_count || '0'),
    },
    acts: mappedActs,
    chapters: mappedChapters,
  }
}

/**
 * Server Function: Get a single public or unlisted published work by ID or slug.
 * Used by Route loader, SSR head, and Reader components so DB works are instantly resolved without flash or 404.
 */
export const getPublicWorkServerFn = createServerFn({ method: 'GET' })
  .validator((idOrSlug: string) => {
    if (typeof idOrSlug !== 'string' || !idOrSlug.trim()) {
      throw new Error('Valid work id or slug is required')
    }
    return idOrSlug.trim()
  })
  .handler(async ({ data: idOrSlug }) => {
    return await executeGetPublicWork(idOrSlug)
  })

/**
 * Server Function: Get a public author profile by ID or handle.
 */
export const getPublicAuthorServerFn = createServerFn({ method: 'GET' })
  .validator((idOrHandle: string) => {
    if (typeof idOrHandle !== 'string' || !idOrHandle.trim()) {
      throw new Error('Valid author identifier is required')
    }
    return idOrHandle.trim()
  })
  .handler(async ({ data: idOrHandle }) => {
    const { supabase } = await import('../lib/supabase/client')
    const clean = idOrHandle.trim().toLowerCase()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_path, bio, location, is_verified, is_public, preferences')

    if (isUuid) {
      query = query.or(`id.eq.${clean},username.eq.${clean}`)
    } else {
      query = query.or(`username.eq.${clean},clerk_user_id.eq.${clean}`)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return null

    // Query live followers, authored published works count, and public views aggregate
    const [{ count: followersCount }, { count: worksCount }, { data: worksData }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
      supabase.from('works').select('*', { count: 'exact', head: true }).eq('author_id', data.id).eq('visibility', 'public').eq('publication_status', 'published'),
      supabase.from('works').select('view_count').eq('author_id', data.id).eq('visibility', 'public').eq('publication_status', 'published'),
    ])

    const totalReadsNum = (worksData || []).reduce((acc: number, w: any) => acc + (Number(w.view_count) || 0), 0)

    const pJson = (data.preferences && typeof data.preferences === 'object') ? data.preferences : {}
    const pPriv = (pJson.privacy && typeof pJson.privacy === 'object') ? pJson.privacy : {}

    return {
      id: data.id,
      name: data.display_name,
      handle: data.username,
      avatar:
        data.avatar_path ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bio: data.bio || '',
      location: data.location || '',
      worksCount: worksCount ?? 0,
      followersCount: followersCount ?? 0,
      totalReads: String(totalReadsNum),
      verified: Boolean(data.is_verified),
      isPublic: data.is_public ?? false,
      worksVisibility: (pPriv.worksVisibility === 'hidden' ? 'hidden' : 'public') as 'public' | 'hidden',
      showAvatar: pPriv.showAvatar !== undefined ? Boolean(pPriv.showAvatar) : true,
      showName: pPriv.showName !== undefined ? Boolean(pPriv.showName) : true,
      showUsername: pPriv.showUsername !== undefined ? Boolean(pPriv.showUsername) : true,
      showReads: Boolean(pPriv.showReads ?? false),
      showFollowers: Boolean(pPriv.showFollowers ?? false),
      showWorksCount: Boolean(pPriv.showWorksCount ?? false),
      showReadingHistory: Boolean(pPriv.showReadingHistory ?? false),
    }
  })

export interface PaginatedDiscoverParams {
  page?: number
  limit?: number
  tab?: 'all' | 'new_this_week' | 'new_chapters' | 'trending' | 'rising'
  category?: string
  genre?: string
  status?: string
  search?: string
  seed?: number
}

export interface PaginatedDiscoverResponse {
  works: any[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  seed?: number
}

export async function executeGetPaginatedDiscoverWorks(
  params: PaginatedDiscoverParams = {},
  dependencies: PlatformWorksDependencies = {}
): Promise<PaginatedDiscoverResponse> {
  const allWorks = await executeGetPlatformWorks(dependencies)

  const authFn = dependencies.getAuthState || (async () => {
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      return await auth()
    } catch {
      return null
    }
  })
  let authState = null
  try {
    authState = await authFn()
  } catch {}
  const isSignedIn = Boolean(authState?.userId)

  const tab = params.tab || 'all'
  const category = params.category || 'all'
  const genre = params.genre || 'all'
  const status = params.status || 'all'
  const search = params.search || ''
  const seed = typeof params.seed === 'number' && !isNaN(params.seed) ? params.seed : undefined

  const filtered = filterAndSortWorks(allWorks, {
    activeTab: tab as any,
    selectedCategory: category,
    selectedGenre: genre,
    selectedStatus: status,
    searchTerm: search,
    sortBy: 'popularity',
    isSignedIn,
    seed,
  })

  const pageSize = Math.min(Math.max(1, params.limit || 14), 50)
  const totalCount = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const requestedPage = Math.max(1, params.page || 1)
  const safePage = Math.min(requestedPage, totalPages)
  const offset = (safePage - 1) * pageSize
  const paginatedWorks = filtered.slice(offset, offset + pageSize)

  return {
    works: paginatedWorks,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
    seed,
  }
}

/**
 * Server Function: Get paginated discovery feed with full filtering and deterministic order.
 * Fetches exactly 14 manuscripts per page by default.
 */
export const getPaginatedDiscoverWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params?: PaginatedDiscoverParams) => {
    return {
      page: Math.max(1, Number(params?.page) || 1),
      limit: Math.min(Math.max(1, Number(params?.limit) || 14), 50),
      tab: params?.tab,
      category: params?.category,
      genre: params?.genre,
      status: params?.status,
      search: params?.search,
      seed: typeof params?.seed === 'number' && !isNaN(params.seed) ? params.seed : undefined,
    }
  })
  .handler(async ({ data }) => {
    return await executeGetPaginatedDiscoverWorks(data)
  })

/**
 * Server Function: Get paginated discovery feed.
 * Enforces pagination limits (max 50) and filters.
 */
export const getDiscoverWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { categoryId?: string; status?: WorkStatus; limit?: number; offset?: number }) => {
    const limit = Math.min(Math.max(1, params?.limit || 14), 50)
    const offset = Math.max(0, params?.offset || 0)
    return {
      categoryId: params?.categoryId,
      status: params?.status,
      limit,
      offset,
    }
  })
  .handler(async ({ data }) => {
    return await getDiscoverWorks(data)
  })

/**
 * Server Function: Create a new Work draft in Writer Studio.
 * Validates inputs and creates a minimal draft.
 */
export const createWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    authorProfileId: string
    title: string
    slug: string
    description?: string
    cover_image_path?: string
    category_id?: string
    language?: string
  }) => {
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    if (!payload.title || payload.title.trim().length < 2) throw new Error('Title must be at least 2 characters')
    if (!payload.slug || payload.slug.trim().length < 2) throw new Error('Slug must be at least 2 characters')

    return {
      ...payload,
      title: payload.title.trim(),
      slug: payload.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    }
  })
  .handler(async ({ data }) => {
    return await createWork(data.authorProfileId, data)
  })

/**
 * Server Function: Update an existing Work.
 * Enforces IDOR protection by checking authorProfileId.
 */
export const updateWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    workId: string
    authorProfileId: string
    updates: {
      title?: string
      description?: string
      cover_image_path?: string
      category_id?: string
    }
  }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    return await updateWork(data.workId, data.authorProfileId, data.updates)
  })

/**
 * Server Function: Publish a Work.
 * Enforces author IDOR check and triggers background content moderation if configured.
 */
export const publishWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: { workId: string; authorProfileId: string; visibility?: 'public' | 'unlisted' }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    const published = await publishWork(data.workId, data.authorProfileId, data.visibility || 'public')
    clearPlatformWorksCache()

    // Optional background non-blocking invocation to content-moderation edge function
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/content-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          targetType: 'work',
          targetId: data.workId,
          content: `${published?.title || ''}\n${published?.description || ''}`,
        }),
      }).catch((err) => {
        // Log background error without interrupting user response
        console.warn('[publishWorkServerFn] Non-blocking moderation trigger error:', err?.message)
      })
    }

    return published
  })

const platformWorksCache = new Map<string, { data: any[]; timestamp: number }>()
const PLATFORM_WORKS_CACHE_TTL_MS = 30_000 // 30 seconds server-side cache
const topShelfCache = new Map<string, { data: any[]; timestamp: number }>()
const TOP_SHELF_CACHE_TTL_MS = 60_000 // 60 seconds server-side cache for Top Shelf

export function clearPlatformWorksCache() {
  platformWorksCache.clear()
  topShelfCache.clear()
}

export function clearTopShelfCache() {
  topShelfCache.clear()
}

export interface PlatformWorksDependencies {
  getAuthState?: () => Promise<{ userId?: string | null } | null>
  createAdminClient?: () => any
  queryRows?: () => Promise<any[]>
  refDate?: Date
}

/**
 * Execute fetching platform works with server-side authorization check.
 * Strips protected discovery collections ('rising_stories', 'new_voices', 'fresh_voices')
 * and sets rising: false for unauthenticated requests while preserving public story reading.
 */
export async function executeGetPlatformWorks(
  dependencies: PlatformWorksDependencies = {}
) {
  const authFn = dependencies.getAuthState || (async () => {
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      return await auth()
    } catch {
      return null
    }
  })

  let authState: { userId?: string | null } | null = null
  try {
    authState = await authFn()
  } catch {
    authState = null
  }

  const isAuthenticated = Boolean(authState?.userId)
  const cacheKey = isAuthenticated ? 'auth' : 'anon'

  if (!dependencies.queryRows) {
    const cached = platformWorksCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < PLATFORM_WORKS_CACHE_TTL_MS) {
      return cached.data
    }
  }

  let admin: any = null
  if (!dependencies.queryRows) {
    const adminClientFactory = dependencies.createAdminClient || (async () => {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      return createAdminClient()
    })
    admin = await adminClientFactory()
  }

  try {
    const q = `
      SELECT
        w.id,
        w.title,
        w.slug,
          w.description,
          w.cover_image_path,
          w.status,
          w.visibility,
          w.publication_status,
          w.word_count,
          w.chapter_count,
          w.reading_time_minutes,
          w.view_count,
          w.like_count,
          w.save_count,
          w.created_at,
          w.updated_at,
          w.published_at,
          w.last_activity_at,
          w.last_activity_type,
          w.last_activity_detail,
          w.new_this_week,
          w.new_chapters_this_week,
          w.collections,
          p.id AS author_id,
          p.display_name AS author_name,
          p.username AS author_handle,
          p.avatar_path AS author_avatar,
          p.bio AS author_bio,
          p.created_at AS author_created_at,
          c.name AS category_name,
          c.slug AS category_slug,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', g.id,
                  'name', g.name,
                  'slug', g.slug
                ) ORDER BY g.display_order ASC
              )
              FROM work_genres wg
              JOIN genres g ON g.id = wg.genre_id
              WHERE wg.work_id = w.id
            ),
            '[]'
          ) AS genres,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', a.id,
                  'workId', a.work_id,
                  'number', a.act_number,
                  'title', a.title,
                  'slug', a.slug,
                  'description', a.description,
                  'status', a.status,
                  'chapters', COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', ch.id,
                          'workId', ch.work_id,
                          'number', ch.chapter_number,
                          'title', ch.title,
                          'slug', ch.slug,
                          'content', ch.content,
                          'wordCount', ch.word_count,
                          'readTimeMinutes', ch.reading_time_minutes,
                          'status', ch.status,
                          'publishedAt', ch.published_at,
                          'actId', ch.act_id,
                          'actNumber', a.act_number,
                          'actTitle', a.title
                        ) ORDER BY ch.chapter_number ASC
                      )
                      FROM chapters ch
                      WHERE ch.act_id = a.id
                    ),
                    '[]'
                  )
                ) ORDER BY a.act_number ASC
              )
              FROM acts a
              WHERE a.work_id = w.id
            ),
            '[]'
          ) AS acts,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ch.id,
                  'workId', ch.work_id,
                  'number', ch.chapter_number,
                  'title', ch.title,
                  'slug', ch.slug,
                  'content', ch.content,
                  'wordCount', ch.word_count,
                  'readTimeMinutes', ch.reading_time_minutes,
                  'status', ch.status,
                  'publishedAt', ch.published_at,
                  'actId', ch.act_id
                ) ORDER BY ch.chapter_number ASC
              )
              FROM chapters ch
              WHERE ch.work_id = w.id
            ),
            '[]'
          ) AS chapters
        FROM works_with_collections w
        LEFT JOIN profiles p ON p.id = w.author_id
        LEFT JOIN categories c ON c.id = w.category_id
        WHERE w.visibility = 'public' AND w.publication_status = 'published'
        ORDER BY w.last_activity_at DESC NULLS LAST;
      `

      // Use queryRows in tests, or Supabase Admin REST client (HTTPS), falling back to direct pg
      let rawRows: any[] = []
      let querySucceeded = false
      let lastQueryError: Error | null = null

      if (dependencies.queryRows) {
        rawRows = await dependencies.queryRows()
        querySucceeded = true
      } else {
        // 1. Primary: Query via Supabase REST API (HTTPS) - works in serverless environments (Vercel) without port 5432
        try {
          const { createAdminClient } = await import('../lib/supabase/server.ts')
          const admin = createAdminClient()
          const { data: supaRows, error: supaErr } = await admin
            .from('works_with_collections')
            .select(`
              *,
              profiles:author_id (id, username, display_name, avatar_path, bio, created_at),
              categories:category_id (id, name, slug),
              work_genres (genres (id, name, slug)),
              acts (id, act_number, title, slug, description, status),
              chapters (id, chapter_number, title, slug, word_count, reading_time_minutes, status, published_at, act_id)
            `)
            .eq('visibility', 'public')
            .eq('publication_status', 'published')
            .order('last_activity_at', { ascending: false })

          if (!supaErr && Array.isArray(supaRows)) {
            querySucceeded = true
            rawRows = supaRows.map((w: any) => ({
              id: w.id,
              author_id: w.author_id,
              title: w.title,
              slug: w.slug,
              description: w.description,
              cover_image_path: w.cover_image_path,
              language: w.language,
              category_id: w.category_id,
              status: w.status,
              visibility: w.visibility,
              publication_status: w.publication_status,
              is_indexable: w.is_indexable,
              content_rating: w.content_rating,
              reading_time_minutes: w.reading_time_minutes,
              word_count: w.word_count,
              chapter_count: w.chapter_count,
              view_count: w.view_count,
              impression_count: w.impression_count,
              like_count: w.like_count,
              save_count: w.save_count,
              comment_count: w.comment_count,
              published_at: w.published_at,
              last_published_at: w.last_published_at,
              created_at: w.created_at,
              updated_at: w.updated_at,
              last_activity_at: w.last_activity_at,
              last_activity_type: w.last_activity_type,
              last_activity_detail: w.last_activity_detail,
              collections: w.collections,
              trending_marked_by_admin: Boolean(w.trending_marked_by_admin),
              author_name: w.profiles?.display_name || w.profiles?.username || 'Hatchpen Author',
              author_handle: w.profiles?.username || 'author',
              author_avatar: w.profiles?.avatar_path || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
              author_bio: w.profiles?.bio || '',
              author_created_at: w.profiles?.created_at,
              category_name: w.categories?.name || 'Novels',
              category_slug: w.categories?.slug || 'novels',
              genres: (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean),
              acts: w.acts || [],
              chapters: w.chapters || [],
            }))
          } else if (supaErr) {
            lastQueryError = new Error(supaErr.message)
            console.warn('[executeGetPlatformWorks] Supabase REST query notice:', supaErr.message)
          }
        } catch (supaEx: any) {
          lastQueryError = supaEx instanceof Error ? supaEx : new Error(String(supaEx))
          console.warn('[executeGetPlatformWorks] Supabase REST query exception:', supaEx?.message)
        }

        // 2. Secondary fallback: direct pg connection if available and REST didn't succeed
        if (!querySucceeded && process.env.DATABASE_URL) {
          try {
            const { Client } = await import('pg')
            const client = new Client({
              connectionString: process.env.DATABASE_URL,
            })
            await client.connect()
            const res = await client.query(q)
            await client.end()
            rawRows = res.rows || []
            querySucceeded = true
            lastQueryError = null
          } catch (pgErr: any) {
            lastQueryError = pgErr instanceof Error ? pgErr : new Error(String(pgErr))
            console.warn('[executeGetPlatformWorks] Direct pg query fallback error:', pgErr?.message)
          }
        }
      }

      if (!querySucceeded) {
        throw lastQueryError || new Error('Database query failed to fetch platform works')
      }

      // Fetch active Trending V1 snapshot to map canonical weekly rankings
      let activeTrendingSnapshot: any = null
      try {
        const { getActiveTrendingSnapshot } = await import('./trendingEngine.ts')
        activeTrendingSnapshot = await getActiveTrendingSnapshot(admin)
      } catch (trendErr: any) {
        console.warn('[executeGetPlatformWorks] Failed to fetch active trending snapshot:', trendErr?.message)
      }

      // Build unified trending ranking map:
      // Priority 1: Admin Force-Marked stories (trending_marked_by_admin === true)
      //              Unconditionally receive top ranks (#1, #2, ...), bypassing all algorithmic thresholds
      // Priority 2: Algorithmic Trending V1 snapshot rankings (fills remaining slots up to 10)
      const finalTrendingMap = new Map<string, { rank: number; tier?: 'A' | 'B'; score?: number; isMarkedByAdmin: boolean }>()
      let nextRank = 1

      // 1. Assign top sequential ranks to admin-marked stories
      for (const row of rawRows) {
        if (row.trending_marked_by_admin) {
          finalTrendingMap.set(row.id, {
            rank: nextRank++,
            isMarkedByAdmin: true,
          })
          if (nextRank > 10) break
        }
      }

      // 2. Assign remaining slots to algorithmic snapshot rankings (skipping any already marked by admin)
      if (activeTrendingSnapshot && Array.isArray(activeTrendingSnapshot.rankings)) {
        for (const item of activeTrendingSnapshot.rankings) {
          if (finalTrendingMap.has(item.workId)) continue
          if (nextRank > 10) break
          finalTrendingMap.set(item.workId, {
            rank: nextRank++,
            tier: item.tier,
            score: item.score,
            isMarkedByAdmin: false,
          })
        }
      }

      return rawRows.map((row: any) => {
        let mappedStatus: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled' = 'Ongoing'
        if (row.status === 'completed') mappedStatus = 'Completed'
        else if (row.status === 'on_hiatus') mappedStatus = 'On Hiatus'
        else if (row.status === 'cancelled') mappedStatus = 'Cancelled'

        const mappedGenres: Array<{ id?: string; name: string; slug: string }> = Array.isArray(row.genres)
          ? row.genres
          : []
        const primaryGenre = mappedGenres[0] || { name: 'Literary Fiction', slug: 'literary-fiction' }

        // Calculate weekly publication flags from actual published_at timestamps (overriding view created_at logic)
        const { startUtc, endUtc } = getUtcWeekBoundaries(dependencies.refDate)
        const pubDateMs = row.published_at ? new Date(row.published_at).getTime() : 0
        const isNewThisWeek = pubDateMs >= startUtc.getTime() && pubDateMs < endUtc.getTime()

        // Acts and chapter publication eligibility
        const rawActs = Array.isArray(row.acts) ? row.acts : []
        const publishedActs = rawActs.filter((a: any) => (a.status || '').toLowerCase() === 'published')
        const publishedActIds = new Set<string>(publishedActs.map((a: any) => a.id))

        let hasNewChaptersThisWeek = false
        if (!isNewThisWeek && Array.isArray(row.chapters)) {
          for (const ch of row.chapters) {
            const isPub = (ch.status || '').toLowerCase() === 'published'
            const actId = ch.actId || ch.act_id
            const isActValid = !actId || publishedActIds.has(actId)
            if (isPub && isActValid && ch.publishedAt) {
              const chDateMs = new Date(ch.publishedAt).getTime()
              if (chDateMs >= startUtc.getTime() && chDateMs < endUtc.getTime()) {
                hasNewChaptersThisWeek = true
                break
              }
            }
          }
        }

        let rawCollections: string[] = Array.isArray(row.collections) ? [...row.collections] : []
        if (isNewThisWeek) {
          if (!rawCollections.includes('new_this_week')) rawCollections.push('new_this_week')
          rawCollections = rawCollections.filter((c) => c !== 'new_chapters_this_week')
        } else {
          rawCollections = rawCollections.filter((c) => c !== 'new_this_week')
          if (hasNewChaptersThisWeek) {
            if (!rawCollections.includes('new_chapters_this_week')) rawCollections.push('new_chapters_this_week')
          } else {
            rawCollections = rawCollections.filter((c) => c !== 'new_chapters_this_week')
          }
        }

        const trendingMeta = finalTrendingMap.get(row.id)
        // If snapshot or admin-marked story is present, that is canonical.
        // Fallback for mock test environment without DB: rawCollections 'trending_now'.
        const isTrending = finalTrendingMap.size > 0
          ? Boolean(trendingMeta)
          : (Boolean(row.trending_marked_by_admin) || rawCollections.includes('trending_now'))

        // Strict Trending isolation & Admin Override
        if (finalTrendingMap.size > 0 || row.trending_marked_by_admin) {
          if (isTrending) {
            if (!rawCollections.includes('trending_now')) rawCollections.push('trending_now')
          } else {
            rawCollections = rawCollections.filter((c) => c !== 'trending_now')
          }
        }

        const publishedChapters = Array.isArray(row.chapters)
          ? row.chapters.filter((ch: any) => {
              if ((ch.status || '').toLowerCase() !== 'published') return false
              const actId = ch.actId || ch.act_id
              if (actId && !publishedActIds.has(actId)) return false
              return true
            })
          : []
        const publishedCount =
          publishedChapters.length > 0
            ? publishedChapters.length
            : (Number(row.publishedChaptersCount || row.chapter_count) || 0)

        return {
          id: row.id,
          title: row.title,
          slug: row.slug || '',
          subtitle: '',
          cover: row.cover_image_path || '/default-book-cover.webp',
          category: row.category_name || 'Novels',
          categorySlug: row.category_slug || 'novels',
          genre: primaryGenre.name,
          genreSlug: primaryGenre.slug,
          genres: mappedGenres,
          tags: ['Serialized', 'Archival'],
          language: row.language || 'English',
          status: mappedStatus,
          visibility: (row.visibility === 'public' ? 'Public' : 'Unlisted') as any,
          publicationStatus: row.publication_status || 'published',
          isIndexable: row.is_indexable !== false,
          isMature: false,
          featured:
            rawCollections.includes('editor_picks') ||
            rawCollections.includes('spotlight') ||
            rawCollections.includes('staff_favorites'),
          trending: isTrending,
          trendingRank: trendingMeta?.rank,
          trendingTier: trendingMeta?.tier,
          trendingScore: trendingMeta?.score,
          trendingMarkedByAdmin: Boolean(row.trending_marked_by_admin),
          rising: isAuthenticated && rawCollections.includes('rising_stories'),
          editorPick: rawCollections.includes('editor_picks'),
          new_this_week: isNewThisWeek,
          new_chapters_this_week: hasNewChaptersThisWeek,
          collection: isAuthenticated
            ? rawCollections
            : rawCollections.filter(
                (c: string) => c !== 'rising_stories' && c !== 'new_voices' && c !== 'fresh_voices'
              ),
          synopsis: row.description || '',
          fullDescription: row.description || '',
          chaptersCount: publishedCount,
          publishedChaptersCount: publishedCount,
          totalReads: String(row.view_count || '0'),
          impressionCount: Number(row.impression_count || 0),
          totalSaves: Number(row.save_count || 0),
          likeCount: Number(row.like_count || 0),
          like_count: Number(row.like_count || 0),
          ratingScore: 5.0,
          ratingCount: Number(row.like_count || 0),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          publishedAt: row.published_at
            ? new Date(row.published_at).toISOString()
            : undefined,
          lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : row.created_at,
          lastActivityType: row.last_activity_type,
          lastActivityDetail: row.last_activity_detail,
          author: {
            id: row.author_id || 'author-unknown',
            name: row.author_name || 'Hatchpen Author',
            handle: row.author_handle || 'author',
            avatar: row.author_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
            bio: row.author_bio || '',
            location: '',
            worksCount: 1,
            followersCount: '0',
            createdAt: row.author_created_at ? new Date(row.author_created_at).toISOString() : undefined,
          },
          acts: Array.isArray(row.acts)
            ? row.acts.map((act: any) => ({
                id: act.id,
                workId: act.work_id || row.id,
                number: act.act_number ?? act.number ?? 1,
                title: act.title || `Act ${act.act_number || 1}`,
                slug: act.slug || '',
                description: act.description || '',
                status: act.status || 'published',
                viewCount: Number(act.view_count || 0),
              }))
            : [],
          chapters: publishedChapters.map((ch: any) => ({
            id: ch.id,
            number: ch.chapter_number ?? ch.number ?? 1,
            title: ch.title || 'Untitled Chapter',
            subtitle: ch.subtitle || '',
            bannerImage: ch.banner_image_path || ch.bannerImage || undefined,
            actId: ch.act_id || ch.actId || undefined,
            status: 'published' as const,
            wordCount: Number(ch.word_count ?? ch.wordCount ?? 0),
            readTimeMinutes: Number(ch.reading_time_minutes ?? ch.readTimeMinutes ?? 1),
            viewCount: Number(ch.view_count || 0),
            publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
            content: ch.content || '',
          })),
        }
      })

      if (!dependencies.queryRows) {
        platformWorksCache.set(cacheKey, { data: mappedResult, timestamp: Date.now() })
      }

      return mappedResult
    } catch (err: any) {
      console.warn('[executeGetPlatformWorks] Fallback / error fetching DB works:', err?.message)
      throw err
    }
}

/**
 * Server Function: Get all published works with dynamic collection attributes.
 * Backed directly by PostgreSQL works_with_collections view.
 * Exposes new_this_week, new_chapters_this_week, and collection string array.
 * Protected discovery collections (rising_stories, new_voices) require authentication.
 */
export const getPlatformWorksServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return await executeGetPlatformWorks()
  })

export interface CategoryPageData {
  category: {
    id: string
    name: string
    slug: string
    description: string
    accentLetter: string
    displayOrder: number
  } | null
  works: any[]
  isNotFound: boolean
}

/**
 * Core business logic: Fetch category metadata and eligible published works.
 * Strictly enforces:
 *  - Only recognized canonical categories
 *  - Only public, published, indexable works (visibility === 'Public', publication_status === 'published', isIndexable !== false)
 */
export async function executeGetCategoryPageData(
  slug: string,
  dependencies: PlatformWorksDependencies = {}
): Promise<CategoryPageData> {
  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return { category: null, works: [], isNotFound: true }
  }
  const normalizedSlug = slug.trim().toLowerCase()
  const category = GLOBAL_CATEGORIES.find((c) => c.slug.toLowerCase() === normalizedSlug) || null
  if (!category) {
    return { category: null, works: [], isNotFound: true }
  }

  const allWorks = await executeGetPlatformWorks(dependencies)
  const categoryWorks = allWorks.filter((w: any) => {
    const matchCategory =
      (w.categorySlug && w.categorySlug.toLowerCase() === normalizedSlug) ||
      (w.category && w.category.toLowerCase().replace(/\s+/g, '-') === normalizedSlug)
    return matchCategory && isWorkIndexable(w)
  })

  return {
    category,
    works: categoryWorks,
    isNotFound: false,
  }
}

/**
 * Server Function: Get category page data with preloaded SEO-eligible works.
 */
export const getCategoryPageDataServerFn = createServerFn({ method: 'GET' })
  .validator((slug: string) => String(slug || ''))
  .handler(async ({ data }) => {
    return await executeGetCategoryPageData(data)
  })

export interface GenrePageData {
  genre: {
    id: string
    name: string
    slug: string
    group: string
    description: string
    displayOrder: number
  } | null
  works: any[]
  isNotFound: boolean
}

/**
 * Core business logic: Fetch genre metadata and eligible published works.
 * Strictly enforces:
 *  - Only recognized canonical genres
 *  - Only public, published, indexable works (visibility === 'Public', publication_status === 'published', isIndexable !== false)
 */
export async function executeGetGenrePageData(
  slug: string,
  dependencies: PlatformWorksDependencies = {}
): Promise<GenrePageData> {
  if (!slug || typeof slug !== 'string' || !slug.trim()) {
    return { genre: null, works: [], isNotFound: true }
  }
  const normalizedSlug = slug.trim().toLowerCase()
  const genre = GLOBAL_GENRES.find((g) => g.slug.toLowerCase() === normalizedSlug) || null
  if (!genre) {
    return { genre: null, works: [], isNotFound: true }
  }

  const allWorks = await executeGetPlatformWorks(dependencies)
  const genreWorks = allWorks.filter((w: any) => {
    const matchGenre =
      (w.genreSlug && w.genreSlug.toLowerCase() === normalizedSlug) ||
      (w.genre && w.genre.toLowerCase().replace(/\s+/g, '-') === normalizedSlug) ||
      (Array.isArray(w.genres) && w.genres.some((g: any) => g.slug && g.slug.toLowerCase() === normalizedSlug))
    return matchGenre && isWorkIndexable(w)
  })

  return {
    genre,
    works: genreWorks,
    isNotFound: false,
  }
}

/**
 * Server Function: Get genre page data with preloaded SEO-eligible works.
 */
export const getGenrePageDataServerFn = createServerFn({ method: 'GET' })
  .validator((slug: string) => String(slug || ''))
  .handler(async ({ data }) => {
    return await executeGetGenrePageData(data)
  })

export interface NewVoicesDependencies {
  getAuthState?: () => Promise<{ userId?: string | null } | null>
  getPlatformWorks?: () => Promise<any[]>
  setResponseStatus?: (status: number) => void
}

/**
 * Core business logic: Fetches published, public stories from eligible New Voices writers
 * (accounts within their 5 calendar month eligibility window).
 * Rejects unauthenticated requests with HTTP 401 fail-closed.
 */
export async function executeGetNewVoices(
  dependencies: NewVoicesDependencies = {}
) {
  const authFn = dependencies.getAuthState || (async () => {
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      return await auth()
    } catch {
      return null
    }
  })

  const authState = await authFn()
  const clerkUserId = authState?.userId

  if (!clerkUserId) {
    if (dependencies.setResponseStatus) {
      dependencies.setResponseStatus(401)
    } else {
      try {
        const { setResponseStatus } = await import('@tanstack/react-start/server')
        setResponseStatus(401)
      } catch {}
    }
    const { UnauthorizedError } = await import('./recommendations.ts')
    throw new UnauthorizedError('Unauthorized: Authentication required to access New Voices')
  }

  const platformWorksFactory = dependencies.getPlatformWorks || (() => executeGetPlatformWorks())
  const works = await platformWorksFactory()

  const { filterAndOrderNewVoicesStories } = await import('../lib/recommendations/newVoices.ts')
  const shouldExcludeBingeable = dependencies.excludeBingeable ?? false
  return filterAndOrderNewVoicesStories(works, clerkUserId, new Date(), { excludeBingeable: shouldExcludeBingeable })
}

/**
 * Server Function: Fetches qualifying published debut stories by eligible New Voices writers.
 * Authenticated members only. Excludes <= 2 chapters bingeable stories.
 */
export const getNewVoicesServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return await executeGetNewVoices({ excludeBingeable: true })
  })

export interface TopShelfDependencies extends PlatformWorksDependencies {
  getPlatformWorks?: () => Promise<any[]>
  getTopShelfWorks?: (candidateWorks: any[], options?: any) => any[]
}

/**
 * Executes Top Shelf extraction with server memory caching.
 * Protects client devices by avoiding full-catalog iterations on low-power devices.
 */
export async function executeGetTopShelf(
  options: {
    limit?: number
    currentUserId?: string | null
    currentUserProfileId?: string | null
  } = {},
  dependencies: TopShelfDependencies = {}
) {
  const limit = Math.max(1, Math.min(50, options.limit || 10))
  const userId = options.currentUserId || 'anon'
  const cacheKey = `${userId}:${limit}`

  if (!dependencies.queryRows && !dependencies.getPlatformWorks) {
    const cached = topShelfCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < TOP_SHELF_CACHE_TTL_MS) {
      return cached.data
    }
  }

  // 1. Explicit mock dependency check (for tests)
  if (dependencies.getPlatformWorks) {
    const works = await dependencies.getPlatformWorks()
    const { getTopShelfWorks } = dependencies.getTopShelfWorks
      ? { getTopShelfWorks: dependencies.getTopShelfWorks }
      : await import('../lib/recommendations/topShelf.ts')
    return getTopShelfWorks(works, {
      currentUserId: options.currentUserId,
      currentUserProfileId: options.currentUserProfileId,
      limit,
    })
  }

  // 2. Primary Standard Path: Direct Database SQL/REST query with LIMIT
  try {
    const adminClientFactory = dependencies.createAdminClient || (async () => {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      return createAdminClient()
    })
    const admin = await adminClientFactory()

    let query = admin
      .from('works_with_collections')
      .select(`
        *,
        profiles:author_id (id, username, display_name, avatar_path, bio, created_at),
        categories:category_id (id, name, slug),
        work_genres (genres (id, name, slug)),
        acts (id, act_number, title, slug, description, status),
        chapters (id, chapter_number, title, slug, word_count, reading_time_minutes, status, published_at, act_id)
      `)
      .eq('visibility', 'public')
      .eq('publication_status', 'published')
      .neq('status', 'cancelled')
      .neq('status', 'draft')
      .order('save_count', { ascending: false })
      .order('like_count', { ascending: false })
      .order('view_count', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(limit)

    if (options.currentUserProfileId) {
      query = query.neq('author_id', options.currentUserProfileId)
    }

    const { data: supaRows, error: supaErr } = await query

    if (!supaErr && Array.isArray(supaRows) && supaRows.length > 0) {
      const mappedDirectWorks = supaRows.map((w: any) => {
        const rawRow = {
          id: w.id,
          author_id: w.author_id,
          title: w.title,
          slug: w.slug,
          description: w.description,
          cover_image_path: w.cover_image_path,
          language: w.language,
          category_id: w.category_id,
          status: w.status,
          visibility: w.visibility,
          publication_status: w.publication_status,
          is_indexable: w.is_indexable,
          content_rating: w.content_rating,
          reading_time_minutes: w.reading_time_minutes,
          word_count: w.word_count,
          chapter_count: w.chapter_count,
          view_count: w.view_count,
          impression_count: w.impression_count,
          like_count: w.like_count,
          save_count: w.save_count,
          comment_count: w.comment_count,
          published_at: w.published_at,
          last_published_at: w.last_published_at,
          created_at: w.created_at,
          updated_at: w.updated_at,
          last_activity_at: w.last_activity_at,
          last_activity_type: w.last_activity_type,
          last_activity_detail: w.last_activity_detail,
          collections: w.collections,
          trending_marked_by_admin: Boolean(w.trending_marked_by_admin),
          author_name: w.profiles?.display_name || w.profiles?.username || 'Hatchpen Author',
          author_handle: w.profiles?.username || 'author',
          author_avatar: w.profiles?.avatar_path || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
          author_bio: w.profiles?.bio || '',
          author_created_at: w.profiles?.created_at,
          category_name: w.categories?.name || 'Novels',
          category_slug: w.categories?.slug || 'novels',
          genres: (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean),
          acts: w.acts || [],
          chapters: w.chapters || [],
        }

        const mappedGenres = Array.isArray(rawRow.genres) ? rawRow.genres : []
        const primaryGenre = mappedGenres[0] || { name: 'Literary Fiction', slug: 'literary-fiction' }

        const rawActs = Array.isArray(rawRow.acts) ? rawRow.acts : []
        const publishedActs = rawActs.filter((a: any) => (a.status || '').toLowerCase() === 'published')
        const publishedActIds = new Set<string>(publishedActs.map((a: any) => a.id))

        const publishedChapters = Array.isArray(rawRow.chapters)
          ? rawRow.chapters.filter((ch: any) => {
              if ((ch.status || '').toLowerCase() !== 'published') return false
              const actId = ch.actId || ch.act_id
              if (actId && !publishedActIds.has(actId)) return false
              return true
            })
          : []
        const publishedCount =
          publishedChapters.length > 0
            ? publishedChapters.length
            : (Number(rawRow.chapter_count) || 0)

        return {
          id: rawRow.id,
          title: rawRow.title,
          slug: rawRow.slug || '',
          subtitle: '',
          cover: rawRow.cover_image_path || '/default-book-cover.webp',
          category: rawRow.category_name || 'Novels',
          categorySlug: rawRow.category_slug || 'novels',
          genre: primaryGenre.name,
          genreSlug: primaryGenre.slug,
          genres: mappedGenres,
          tags: ['Serialized', 'Archival'],
          language: rawRow.language || 'English',
          status: (rawRow.status === 'completed' ? 'Completed' : rawRow.status === 'on_hiatus' ? 'On Hiatus' : 'Ongoing') as any,
          visibility: (rawRow.visibility === 'public' ? 'Public' : 'Unlisted') as any,
          publicationStatus: rawRow.publication_status || 'published',
          isIndexable: rawRow.is_indexable !== false,
          isMature: false,
          featured: false,
          trending: false,
          rising: false,
          editorPick: false,
          new_this_week: false,
          new_chapters_this_week: false,
          collection: [],
          synopsis: rawRow.description || '',
          fullDescription: rawRow.description || '',
          chaptersCount: publishedCount,
          publishedChaptersCount: publishedCount,
          totalReads: String(rawRow.view_count || '0'),
          impressionCount: Number(rawRow.impression_count || 0),
          totalSaves: Number(rawRow.save_count || 0),
          likeCount: Number(rawRow.like_count || 0),
          like_count: Number(rawRow.like_count || 0),
          ratingScore: 5.0,
          ratingCount: Number(rawRow.like_count || 0),
          createdAt: rawRow.created_at ? new Date(rawRow.created_at).toISOString() : new Date().toISOString(),
          updatedAt: rawRow.updated_at ? new Date(rawRow.updated_at).toISOString() : new Date().toISOString(),
          publishedAt: rawRow.published_at ? new Date(rawRow.published_at).toISOString() : undefined,
          lastActivityAt: rawRow.last_activity_at ? new Date(rawRow.last_activity_at).toISOString() : rawRow.created_at,
          lastActivityType: rawRow.last_activity_type,
          lastActivityDetail: rawRow.last_activity_detail,
          author: {
            id: rawRow.author_id || 'author-unknown',
            name: rawRow.author_name || 'Hatchpen Author',
            handle: rawRow.author_handle || 'author',
            avatar: rawRow.author_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
            bio: rawRow.author_bio || '',
            location: '',
            worksCount: 1,
            followersCount: '0',
            createdAt: rawRow.author_created_at ? new Date(rawRow.author_created_at).toISOString() : undefined,
          },
          acts: Array.isArray(rawRow.acts)
            ? rawRow.acts.map((act: any) => ({
                id: act.id,
                workId: act.work_id || rawRow.id,
                number: act.act_number ?? act.number ?? 1,
                title: act.title || `Act ${act.act_number || 1}`,
                slug: act.slug || '',
                description: act.description || '',
                status: act.status || 'published',
                viewCount: Number(act.view_count || 0),
              }))
            : [],
          chapters: publishedChapters.map((ch: any) => ({
            id: ch.id,
            workId: ch.work_id || rawRow.id,
            number: ch.chapter_number ?? ch.number ?? 1,
            title: ch.title || `Chapter ${ch.chapter_number || 1}`,
            slug: ch.slug || '',
            content: ch.content || '',
            wordCount: Number(ch.word_count || 0),
            readTimeMinutes: Number(ch.reading_time_minutes || 0),
            status: ch.status || 'published',
            publishedAt: ch.published_at || ch.publishedAt,
            actId: ch.act_id || ch.actId,
          })),
        }
      })

      if (!dependencies.queryRows) {
        topShelfCache.set(cacheKey, { data: mappedDirectWorks, timestamp: Date.now() })
      }
      return mappedDirectWorks
    }
  } catch (err: any) {
    console.warn('[executeGetTopShelf] Direct DB query fallback:', err?.message || err)
  }

  // 3. Graceful Fallback: In-memory calculation from platform works (for tests/offline mock)
  const platformWorksFactory = dependencies.getPlatformWorks || (() => executeGetPlatformWorks(dependencies))
  const works = await platformWorksFactory()

  const { getTopShelfWorks } = dependencies.getTopShelfWorks
    ? { getTopShelfWorks: dependencies.getTopShelfWorks }
    : await import('../lib/recommendations/topShelf.ts')

  const topShelf = getTopShelfWorks(works, {
    currentUserId: options.currentUserId,
    currentUserProfileId: options.currentUserProfileId,
    limit,
  })

  if (!dependencies.queryRows) {
    topShelfCache.set(cacheKey, { data: topShelf, timestamp: Date.now() })
  }

  return topShelf
}

/**
 * Server Function: Precomputes and returns Top Shelf manuscripts with 60s memory caching.
 * Offloads sorting computation from client devices to the server tier.
 */
export const getTopShelfServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { limit?: number }) => ({
    limit: params?.limit ? Math.min(Math.max(1, Number(params.limit)), 50) : 10,
  }))
  .handler(async ({ data }) => {
    let currentUserId: string | null = null
    try {
      const { auth } = await import('@clerk/tanstack-react-start/server')
      const authState = await auth()
      currentUserId = authState?.userId || null
    } catch {}

    return await executeGetTopShelf({ limit: data?.limit, currentUserId })
  })

// In-memory rate limiting to prevent spam loops from inflating views (max 30 view attempts per min per viewerKey)
const viewerRateLimitMap = new Map<string, { count: number; resetAt: number }>()
export function checkViewerRateLimit(viewerKey: string): boolean {
  const now = Date.now()

  // Periodic pruning of expired entries to prevent memory growth in long-running processes
  if (viewerRateLimitMap.size > 5000) {
    for (const [key, val] of viewerRateLimitMap.entries()) {
      if (now > val.resetAt) {
        viewerRateLimitMap.delete(key)
      }
    }
  }

  const record = viewerRateLimitMap.get(viewerKey)
  if (!record || now > record.resetAt) {
    viewerRateLimitMap.set(viewerKey, { count: 1, resetAt: now + 60_000 })
    return true
  }
  record.count++
  if (record.count > 30) {
    return false
  }
  return true
}

async function incrementWorkViewAtomic(admin: any, workId: string) {
  // 1. Try atomic Postgres RPC
  try {
    const { error: rpcErr } = await admin.rpc('increment_work_view', { work_id: workId })
    if (!rpcErr) return
  } catch {}

  // 2. Direct PG query fallback if available
  if (process.env.DATABASE_URL) {
    try {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2500 })
      await client.connect()
      try {
        await client.query('UPDATE works SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [workId])
        return
      } finally {
        await client.end()
      }
    } catch {}
  }

  // 3. REST update fallback
  try {
    const { data: currentWork } = await admin.from('works').select('view_count').eq('id', workId).single()
    const newWorkViews = (currentWork?.view_count || 0) + 1
    await admin.from('works').update({ view_count: newWorkViews }).eq('id', workId)
  } catch {}
}

async function incrementWorkImpressionAtomic(admin: any, workId: string) {
  // 1. Try atomic Postgres RPC
  try {
    const { error: rpcErr } = await admin.rpc('increment_work_impression', { p_work_id: workId })
    if (!rpcErr) return
  } catch {}

  // 2. Direct PG query fallback if available
  if (process.env.DATABASE_URL) {
    try {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2500 })
      await client.connect()
      try {
        await client.query('UPDATE works SET impression_count = COALESCE(impression_count, 0) + 1 WHERE id = $1', [workId])
        return
      } finally {
        await client.end()
      }
    } catch {}
  }

  // 3. REST update fallback
  try {
    const { data: currentWork } = await admin.from('works').select('impression_count').eq('id', workId).single()
    const newCount = (currentWork?.impression_count || 0) + 1
    await admin.from('works').update({ impression_count: newCount }).eq('id', workId)
  } catch {}
}

async function incrementChapterViewAtomic(admin: any, chapterId: string) {
  // 1. Try atomic Postgres RPC
  try {
    const { error: rpcErr } = await admin.rpc('increment_chapter_view', { chapter_id: chapterId })
    if (!rpcErr) return
  } catch {}

  // 2. Direct PG query fallback if available
  if (process.env.DATABASE_URL) {
    try {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2500 })
      await client.connect()
      try {
        await client.query('UPDATE chapters SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1', [chapterId])
        return
      } finally {
        await client.end()
      }
    } catch {}
  }

  // 3. REST update fallback
  try {
    const { data: currentChapter } = await admin.from('chapters').select('view_count').eq('id', chapterId).single()
    const newChViews = (currentChapter?.view_count || 0) + 1
    await admin.from('chapters').update({ view_count: newChViews }).eq('id', chapterId)
  } catch {}
}

/**
 * Server Function: Track view strictly with zero duplicates across 3 layers:
 * 1. Book View: Triggered once per viewer per work (increments works.view_count)
 * 2. Chapter View: Triggered once per viewer per chapter (increments chapters.view_count)
 * 3. Act View: Implicitly computed as sum of its chapters' views
 */
export const trackStrictViewServerFn = createServerFn({ method: 'POST' })
  .validator((params: { viewerKey: string; workId: string; chapterId?: string }) => {
    if (!params.viewerKey || !params.viewerKey.trim()) {
      throw new Error('Viewer key is required for deduplication')
    }
    if (!params.workId || !params.workId.trim()) {
      throw new Error('Work ID is required')
    }
    return {
      viewerKey: params.viewerKey.trim(),
      workId: params.workId.trim(),
      chapterId: params.chapterId?.trim() || undefined,
    }
  })
  .handler(async ({ data: { viewerKey, workId, chapterId } }) => {
    if (!checkViewerRateLimit(viewerKey)) {
      return { success: false, rateLimited: true, isNewWorkView: false, isNewChapterView: false }
    }

    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve work UUID if passed as slug
    let targetWorkUuid = workId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workId)
    if (!isUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', workId).maybeSingle()
      if (wRow?.id) targetWorkUuid = wRow.id
      else return { success: false, message: 'Work not found' }
    }

    let isNewWorkView = false
    let isNewChapterView = false

    // 2. Strict Book-level View Deduplication
    let shouldIncrementWork = false
    try {
      const { error: insertWorkErr } = await admin.from('unique_views').insert({
        viewer_key: viewerKey,
        work_id: targetWorkUuid,
        chapter_id: null,
        view_type: 'work',
      })

      if (!insertWorkErr) {
        shouldIncrementWork = true
      } else if (insertWorkErr.code === '23505') {
        // Duplicate constraint caught safely - no increment
        shouldIncrementWork = false
      } else {
        // Table unapplied or other operational error: fallback to counting the view
        shouldIncrementWork = true
      }
    } catch (e: any) {
      if (e?.code !== '23505') {
        shouldIncrementWork = true
      }
    }

    if (shouldIncrementWork) {
      isNewWorkView = true
      await incrementWorkViewAtomic(admin, targetWorkUuid)
    }

    // 3. Strict Chapter-level View Deduplication
    if (chapterId) {
      let targetChapterUuid = chapterId
      let isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)

      if (!isChapterUuid) {
        // 1. Try slug match
        const { data: chRow } = await admin.from('chapters').select('id').eq('work_id', targetWorkUuid).eq('slug', chapterId).maybeSingle()
        if (chRow?.id) {
          targetChapterUuid = chRow.id
          isChapterUuid = true
        } else {
          // 2. Try numeric chapter_number match (e.g. 'ch-1', 'chapter-2', '1')
          const numMatch = chapterId.match(/\d+/)
          if (numMatch) {
            const chNum = parseInt(numMatch[0], 10)
            const { data: numRow } = await admin.from('chapters').select('id').eq('work_id', targetWorkUuid).eq('chapter_number', chNum).maybeSingle()
            if (numRow?.id) {
              targetChapterUuid = numRow.id
              isChapterUuid = true
            }
          }
        }
      }

      // Guard: Only insert into PostgreSQL UUID columns if we resolved to a valid UUID format
      if (isChapterUuid) {
        let shouldIncrementChapter = false
        try {
          const { error: insertChErr } = await admin.from('unique_views').insert({
            viewer_key: viewerKey,
            work_id: targetWorkUuid,
            chapter_id: targetChapterUuid,
            view_type: 'chapter',
          })

          if (!insertChErr) {
            shouldIncrementChapter = true
          } else if (insertChErr.code === '23505') {
            // Duplicate chapter view caught safely - no increment
            shouldIncrementChapter = false
          } else {
            // Table unapplied fallback
            shouldIncrementChapter = true
          }
        } catch (e: any) {
          if (e?.code !== '23505') {
            shouldIncrementChapter = true
          }
        }

        if (shouldIncrementChapter) {
          isNewChapterView = true
          await incrementChapterViewAtomic(admin, targetChapterUuid)
        }

        // Trending V1: Record chapter open in rolling engagement table
        // Deduplicate repeated opens by same viewer within 1 hour to prevent mount/refresh spam
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
          const { data: recentOpen } = await admin
            .from('trending_chapter_opens')
            .select('id')
            .eq('viewer_key', viewerKey)
            .eq('chapter_id', targetChapterUuid)
            .gte('opened_at', oneHourAgo)
            .limit(1)
            .maybeSingle()

          if (!recentOpen) {
            await admin.from('trending_chapter_opens').insert({
              viewer_key: viewerKey,
              work_id: targetWorkUuid,
              chapter_id: targetChapterUuid,
            })
          }
        } catch (openErr: any) {
          // Non-blocking: table unapplied or operational errors do not break user reading flow
          console.warn('[trackStrictViewServerFn] Error recording trending chapter open:', openErr?.message)
        }
      }
    }

    return {
      success: true,
      isNewWorkView,
      isNewChapterView,
    }
  })

/**
 * Server Function: Track unique story impressions strictly in Database:
 * - Triggered ONLY when a user lands on the story overview page (/works/$workId).
 * - NOT triggered on chapter reads.
 * - Deduplicated cross-device for authenticated members (u-${user.id}) and anonymous visitors (v-${uuid}).
 * - Even if the user never opens a chapter and immediately navigates away or closes tab: impression +1.
 * - Repeated visits from same device or another device (logged in as same user) will NOT increment impression_count.
 */
export const trackWorkImpressionServerFn = createServerFn({ method: 'POST' })
  .validator((params: { viewerKey: string; workId: string }) => {
    if (!params.viewerKey || !params.viewerKey.trim()) {
      throw new Error('Viewer key is required for deduplication')
    }
    if (!params.workId || !params.workId.trim()) {
      throw new Error('Work ID is required')
    }
    return {
      viewerKey: params.viewerKey.trim(),
      workId: params.workId.trim(),
    }
  })
  .handler(async ({ data: { viewerKey, workId } }) => {
    if (!checkViewerRateLimit(viewerKey)) {
      return { success: false, rateLimited: true, isNewImpression: false }
    }

    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve work UUID if passed as slug
    let targetWorkUuid = workId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workId)
    if (!isUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', workId).maybeSingle()
      if (wRow?.id) targetWorkUuid = wRow.id
      else return { success: false, message: 'Work not found' }
    }

    let isNewImpression = false

    // 2. Strict Unique Impression Deduplication (Database constraint on (viewer_key, work_id))
    try {
      const { error: insertErr } = await admin.from('unique_impressions').insert({
        viewer_key: viewerKey,
        work_id: targetWorkUuid,
      })

      if (!insertErr) {
        isNewImpression = true
      } else if (insertErr.code === '23505') {
        // Unique constraint caught safely (already viewed on this or another device)
        isNewImpression = false
      } else {
        console.warn('[trackWorkImpressionServerFn] unique_impressions insert error:', insertErr.message)
      }
    } catch (e: any) {
      if (e?.code !== '23505') {
        console.warn('[trackWorkImpressionServerFn] Exception during impression insert:', e?.message)
      }
    }

    if (isNewImpression) {
      await incrementWorkImpressionAtomic(admin, targetWorkUuid)
    }

    return {
      success: true,
      isNewImpression,
    }
  })

/**
 * Server Function: Get all bookmarked work IDs for an authenticated user from PostgreSQL DB.
 */
export const getUserBookmarksServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required')
    }
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve user profile ID from Clerk user ID (with in-memory cache)
    const { getCachedProfileByClerkId } = await import('./authors')
    const profile = await getCachedProfileByClerkId(admin, clerkUserId)

    if (!profile?.id) {
      return { bookmarkIds: [] }
    }

    // 2. Fetch all bookmarked work IDs from bookmarks table
    const { data: bookmarks, error } = await admin
      .from('bookmarks')
      .select('work_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getUserBookmarksServerFn] DB Error:', error.message)
      return { bookmarkIds: [] }
    }

    return {
      bookmarkIds: (bookmarks || []).map((b) => b.work_id),
    }
  })

/**
 * Server Function: Toggle bookmark (add/remove) in PostgreSQL DB for authenticated user.
 */
export const toggleBookmarkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; workId: string }) => {
    if (!params.clerkUserId || typeof params.clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required')
    }
    if (!params.workId || typeof params.workId !== 'string') {
      throw new Error('Valid workId is required')
    }
    return {
      clerkUserId: params.clerkUserId.trim(),
      workId: params.workId.trim(),
    }
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve user profile ID
    let { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', data.clerkUserId)
      .maybeSingle()

    if (!profile?.id) {
      // Auto-create/upsert minimal profile if not yet created
      const minimalUsername = `user_${data.clerkUserId.slice(0, 8)}`
      const { data: newProfile, error: createErr } = await admin
        .from('profiles')
        .upsert(
          {
            clerk_user_id: data.clerkUserId,
            username: minimalUsername,
            display_name: 'HatchPen Reader',
            is_public: true,
          },
          { onConflict: 'clerk_user_id' }
        )
        .select('id')
        .single()

      if (createErr || !newProfile) {
        throw new Error(`Failed to resolve user profile: ${createErr?.message}`)
      }
      profile = newProfile
    }

    // 2. Check if already bookmarked in DB
    const { data: existing } = await admin
      .from('bookmarks')
      .select('id')
      .eq('user_id', profile.id)
      .eq('work_id', data.workId)
      .maybeSingle()

    let isSaved = false

    if (existing) {
      // Remove bookmark from DB
      await admin
        .from('bookmarks')
        .delete()
        .eq('user_id', profile.id)
        .eq('work_id', data.workId)
      isSaved = false

      // Decrement work save_count safely if work is a DB UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (isUuid) {
        const { data: workRow } = await admin.from('works').select('save_count').eq('id', data.workId).maybeSingle()
        if (workRow) {
          const newCount = Math.max(0, (workRow.save_count || 0) - 1)
          await admin.from('works').update({ save_count: newCount }).eq('id', data.workId)
        }
      }
    } else {
      // Add bookmark to DB
      await admin.from('bookmarks').insert({
        user_id: profile.id,
        work_id: data.workId,
      })
      isSaved = true

      // Increment work save_count safely if work is a DB UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (isUuid) {
        const { data: workRow } = await admin.from('works').select('save_count').eq('id', data.workId).maybeSingle()
        if (workRow) {
          const newCount = (workRow.save_count || 0) + 1
          await admin.from('works').update({ save_count: newCount }).eq('id', data.workId)
        }
      }
    }

    // Return updated list of bookmark IDs for this user
    const { data: allUserBookmarks } = await admin
      .from('bookmarks')
      .select('work_id')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    return {
      success: true,
      isSaved,
      bookmarkIds: (allUserBookmarks || []).map((b) => b.work_id),
    }
  })

// Server in-memory cache for Cloudinary platform assets (1 hour TTL)
interface CloudinaryCacheEntry {
  assets: Array<{
    publicId: string
    secureUrl: string
    assetFolder: string
    format: string
    width?: number
    height?: number
    aspectRatio?: number
    createdAt?: string
  }>
  timestamp: number
}

const CLOUDINARY_ASSETS_CACHE: Record<string, CloudinaryCacheEntry> = {}
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Server Function: Fetch platform-defined curated images from Cloudinary folders
 * (e.g. 'book_cover' and 'banner' asset folders) using the Cloudinary Admin Search API.
 * Uses 1-hour in-memory cache to save Cloudinary API limits, with forceRefresh capability.
 */
export const getCloudinaryPlatformAssetsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { folder: 'book_cover' | 'banner' | 'all'; forceRefresh?: boolean } | 'book_cover' | 'banner' | 'all') => {
    if (typeof params === 'string') {
      return { folder: params, forceRefresh: false }
    }
    return {
      folder: params?.folder || 'book_cover',
      forceRefresh: Boolean(params?.forceRefresh),
    }
  })
  .handler(async ({ data }) => {
    const { folder, forceRefresh } = data
    const cacheKey = folder

    // 1. Check server-side memory cache
    if (!forceRefresh) {
      const cached = CLOUDINARY_ASSETS_CACHE[cacheKey]
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { assets: cached.assets, fromCache: true }
      }
    }

    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'pxluxw9a'
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!apiKey || !apiSecret) {
      console.warn('[getCloudinaryPlatformAssetsServerFn] Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET')
      return { assets: [] }
    }

    try {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      let expression = 'asset_folder:book_cover'
      if (folder === 'banner') {
        expression = 'asset_folder:banner'
      } else if (folder === 'all') {
        expression = 'asset_folder:book_cover OR asset_folder:banner'
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression,
          max_results: 100,
          sort_by: [{ created_at: 'desc' }],
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[getCloudinaryPlatformAssetsServerFn] Search API Error:', errText)
        // If API fails, fall back to existing cache if available
        if (CLOUDINARY_ASSETS_CACHE[cacheKey]) {
          return { assets: CLOUDINARY_ASSETS_CACHE[cacheKey].assets, fromCache: true }
        }
        return { assets: [] }
      }

      const resData = await res.json()
      const assets = (resData.resources || []).map((r: any) => ({
        publicId: r.public_id,
        secureUrl: r.secure_url,
        assetFolder: r.asset_folder || (folder === 'banner' ? 'banner' : 'book_cover'),
        format: r.format,
        width: r.width,
        height: r.height,
        aspectRatio: r.aspect_ratio,
        createdAt: r.created_at,
      }))

      // Store in memory cache
      CLOUDINARY_ASSETS_CACHE[cacheKey] = {
        assets,
        timestamp: Date.now(),
      }

      return { assets, fromCache: false }
    } catch (err: any) {
      console.error('[getCloudinaryPlatformAssetsServerFn] Error:', err.message)
      if (CLOUDINARY_ASSETS_CACHE[cacheKey]) {
        return { assets: CLOUDINARY_ASSETS_CACHE[cacheKey].assets, fromCache: true }
      }
      return { assets: [] }
    }
  })

