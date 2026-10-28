import { createServerFn } from '@tanstack/react-start'
import { WORKS, AUTHORS, getWorkSlug } from '../data/mockData.ts'

export interface SearchStoriesResultItem {
  id: string
  title: string
  subtitle?: string
  slug: string
  synopsis: string
  cover: string
  category: string
  categorySlug: string
  genre: string
  genreSlug: string
  genres: string[]
  status: 'Completed' | 'In Progress' | 'Hiatus'
  readingTimeMinutes?: number
  wordCount?: number
  viewCount?: string | number
  ratingScore: number
  ratingCount: number
  author: {
    id: string
    name: string
    handle: string
    avatar: string
    bio?: string
  }
}

export interface SearchAuthorsResultItem {
  id: string
  username: string
  displayName: string
  avatar: string
  bio?: string
  worksCount?: number
}

export interface GlobalSearchResponse {
  query: string
  type: 'stories' | 'author' | 'genre'
  stories: SearchStoriesResultItem[]
  authors: SearchAuthorsResultItem[]
  totalCount: number
  page?: number
  hasMore?: boolean
}

export interface GlobalSearchOptions {
  query: string
  type?: 'stories' | 'author' | 'genre'
  genreSlugs?: string[]
  limit?: number
  page?: number
}

const hasSupabaseAdmin = Boolean(
  (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY && process.env?.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key') ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY && (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key')
)

function mapMockWorkToSearchResult(w: any): SearchStoriesResultItem {
  const genreList: string[] = Array.isArray(w.genres)
    ? w.genres.map((g: any) => (typeof g === 'string' ? g : g.name || g.slug)).filter(Boolean)
    : [w.genre || 'Fiction']

  const primaryGenreSlug = (w.genreSlug || (typeof w.genres?.[0] === 'object' ? w.genres[0].slug : '') || 'fiction').toLowerCase()
  const primaryGenreName = w.genre || (typeof w.genres?.[0] === 'object' ? w.genres[0].name : '') || 'Fiction'

  return {
    id: w.id,
    title: w.title,
    subtitle: w.subtitle,
    slug: w.slug || getWorkSlug(w),
    synopsis: w.synopsis || w.description || '',
    cover: w.cover || w.cover_image_path || '/default-book-cover.webp',
    category: w.category || 'Novels',
    categorySlug: (w.categorySlug || 'novels').toLowerCase(),
    genre: primaryGenreName,
    genreSlug: primaryGenreSlug,
    genres: genreList.length > 0 ? genreList : [primaryGenreName],
    status: (w.status === 'Completed' || w.status === 'completed' ? 'Completed' : 'In Progress') as any,
    readingTimeMinutes: w.readingTimeMinutes || w.reading_time_minutes || 5,
    wordCount: w.wordCount || w.word_count || 1000,
    viewCount: w.totalReads || w.viewCount || 0,
    ratingScore: w.ratingScore || 4.8,
    ratingCount: w.ratingCount || w.like_count || 0,
    author: {
      id: w.author?.id || 'author-unknown',
      name: w.author?.name || 'Hatchpen Author',
      handle: w.author?.handle || w.author?.username || 'author',
      avatar: w.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: w.author?.bio || '',
    },
  }
}

/**
 * Execute fast global story search against Supabase with in-memory mock fallback.
 * Supports three modes: stories (ILIKE text search), author (profile search), genre (two-step genre filter).
 * Scalable to millions of records via GIN trigram indexing.
 * Never performs full-catalogue memory downloads.
 */
export async function executeGlobalSearch({
  query,
  type = 'stories',
  genreSlugs,
  limit = 24,
  page = 1,
}: GlobalSearchOptions): Promise<GlobalSearchResponse> {
  const clean = (query || '').replace(/["'“”]/g, '').trim()
  const lowerQuery = clean.toLowerCase()
  const isParameterVariant = lowerQuery.includes('parameter')
  const isPerimeterVariant = lowerQuery.includes('perimeter')

  const matchesTitle = (title: string) => {
    if (!title) return false
    const t = title.toLowerCase()
    if (t.includes(lowerQuery)) return true
    if (isParameterVariant && t.includes(lowerQuery.replace(/parameter/g, 'perimeter'))) return true
    if (isPerimeterVariant && t.includes(lowerQuery.replace(/perimeter/g, 'parameter'))) return true
    return false
  }

  const cappedLimit = Math.min(Math.max(1, limit), 50)
  const validPage = Math.max(1, page || 1)
  const from = (validPage - 1) * cappedLimit
  const to = from + cappedLimit - 1

  // ── Author mode ────────────────────────────────────────────────────────────
  if (type === 'author') {
    let authors: SearchAuthorsResultItem[] = []
    let totalCount = 0

    if (clean.length < 2) {
      return { query: clean, type: 'author', stories: [], authors: [], totalCount: 0, page: validPage, hasMore: false }
    }

    if (hasSupabaseAdmin) {
      try {
        const { createAdminClient } = await import('../lib/supabase/server.ts')
        const admin = createAdminClient()
        const sanitized = clean.replace(/[,()]/g, ' ').trim()

        const { data: rows, error, count } = await admin
          .from('profiles')
          .select('id, username, display_name, avatar_path, bio, preferences', { count: 'exact' })
          .eq('is_public', true)
          .or(`display_name.ilike.%${sanitized}%,username.ilike.%${sanitized}%,bio.ilike.%${sanitized}%`)
          .not('display_name', 'is', null)
          .range(from, to)

        if (!error && Array.isArray(rows)) {
          if (count !== null && count !== undefined) totalCount = count
          authors = (rows as any[])
            .filter((p: any) => p.display_name || p.username)
            .map((p: any) => {
              const priv = (p.preferences && typeof p.preferences === 'object' && p.preferences.privacy) || {}
              const showAvatar = priv.showAvatar !== false
              const showName = priv.showName !== false
              const showUsername = priv.showUsername !== false
              return {
                id: p.id,
                username: p.username || '',
                displayName: showName
                  ? (p.display_name || p.username || '')
                  : showUsername && p.username
                    ? `@${p.username}`
                    : 'Anonymous Author',
                avatar: showAvatar
                  ? (p.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80')
                  : '/unisex-avatar.svg',
                bio: p.bio || undefined,
              }
            })
        }
      } catch (e: any) {
        console.warn('[executeGlobalSearch] Author DB query notice:', e?.message)
      }
    }

    // Offline / Mock fallback resilience when DB returns 0 authors
    if (authors.length === 0) {
      const lowerQuery = clean.toLowerCase()
      const matchingMockAuthors: SearchAuthorsResultItem[] = AUTHORS.filter((a) => {
        const nameMatch = a.name.toLowerCase().includes(lowerQuery)
        const handleMatch = a.handle.toLowerCase().includes(lowerQuery)
        const bioMatch = (a.bio || '').toLowerCase().includes(lowerQuery)
        return nameMatch || handleMatch || bioMatch
      }).map((a) => ({
        id: a.id,
        username: a.handle,
        displayName: a.name,
        avatar: a.avatar,
        bio: a.bio,
        worksCount: a.worksCount || 1,
      }))
      authors = matchingMockAuthors
    }

    const effectiveTotal = Math.max(totalCount, authors.length)

    return {
      query: clean,
      type: 'author',
      stories: [],
      authors: authors.slice(0, cappedLimit),
      totalCount: effectiveTotal,
      page: validPage,
      hasMore: to + 1 < effectiveTotal,
    }
  }

  // ── Genre mode ─────────────────────────────────────────────────────────────
  if (type === 'genre') {
    if (!genreSlugs || genreSlugs.length === 0) {
      return { query: '', type: 'genre', stories: [], authors: [], totalCount: 0, page: validPage, hasMore: false }
    }

    let dbStories: SearchStoriesResultItem[] = []
    let totalDbCount = 0

    if (hasSupabaseAdmin) {
      try {
        const { createAdminClient } = await import('../lib/supabase/server.ts')
        const admin = createAdminClient()

        // Step 1: Resolve genre slugs → genre IDs
        const { data: genreRows, error: genreErr } = await admin
          .from('genres')
          .select('id')
          .in('slug', genreSlugs)

        if (!genreErr && Array.isArray(genreRows) && genreRows.length > 0) {
          const genreIds = genreRows.map((g: any) => g.id)

          // Step 2: Resolve genre IDs → work IDs via work_genres join table
          const { data: wgRows, error: wgErr } = await admin
            .from('work_genres')
            .select('work_id')
            .in('genre_id', genreIds)

          if (!wgErr && Array.isArray(wgRows) && wgRows.length > 0) {
            const workIds = [...new Set(wgRows.map((r: any) => r.work_id))]

            // Step 3: Fetch works with full projection + optional text search filter
            let worksQuery = admin
              .from('works')
              .select(`
                id,
                title,
                slug,
                description,
                cover_image_path,
                status,
                word_count,
                reading_time_minutes,
                view_count,
                like_count,
                created_at,
                profiles:author_id (id, username, display_name, avatar_path, bio),
                categories:category_id (id, name, slug),
                work_genres (genres (id, name, slug)),
                work_tags (tags (id, name, slug))
              `, { count: 'exact' })
              .in('id', workIds)
              .eq('visibility', 'public')
              .eq('publication_status', 'published')

            if (clean.length >= 2) {
              const sanitized = clean.replace(/[,()]/g, ' ').trim()
              if (isParameterVariant) {
                const altSanitized = sanitized.replace(/parameter/gi, 'perimeter')
                worksQuery = worksQuery.or(`title.ilike.%${sanitized}%,title.ilike.%${altSanitized}%`)
              } else {
                worksQuery = worksQuery.ilike('title', `%${sanitized}%`)
              }
            }

            const { data: rows, error, count } = await worksQuery
              .order('view_count', { ascending: false })
              .range(from, to)

            if (count !== null && count !== undefined) {
              totalDbCount = count
            }

            if (!error && Array.isArray(rows) && rows.length > 0) {
              dbStories = rows.map((w: any) => {
                const authorProfile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
                const category = Array.isArray(w.categories) ? w.categories[0] : w.categories
                const genreList: any[] = (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean)
                const tagList: any[] = (w.work_tags || []).map((wt: any) => wt.tags).filter(Boolean)
                const primaryGenre = genreList[0]

                return {
                  id: w.id,
                  title: w.title,
                  slug: w.slug || w.id,
                  synopsis: w.description || '',
                  cover: w.cover_image_path || '/default-book-cover.webp',
                  category: category?.name || 'Novels',
                  categorySlug: category?.slug || 'novels',
                  genre: primaryGenre?.name || 'Fiction',
                  genreSlug: primaryGenre?.slug || 'fiction',
                  genres: [
                    ...genreList.map((g: any) => g.name || g.slug),
                    ...tagList.map((t: any) => t.name || t.slug),
                  ],
                  status: (w.status === 'completed' ? 'Completed' : 'In Progress') as any,
                  readingTimeMinutes: w.reading_time_minutes || 5,
                  wordCount: w.word_count || 1000,
                  viewCount: w.view_count || 0,
                  ratingScore: 4.8,
                  ratingCount: w.like_count || 0,
                  author: {
                    id: authorProfile?.id || w.author_id || 'author-unknown',
                    name: authorProfile?.display_name || authorProfile?.username || 'Hatchpen Author',
                    handle: authorProfile?.username || 'author',
                    avatar: authorProfile?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                    bio: authorProfile?.bio || '',
                  },
                }
              })
              if (clean.length >= 2) {
                dbStories = dbStories.filter((s) => matchesTitle(s.title))
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[executeGlobalSearch] Genre DB query notice:', e?.message)
      }
    }

    // Offline / Mock fallback resilience when DB returns 0 stories
    if (dbStories.length === 0) {
      const lowerGenreSlugs = genreSlugs.map((s) => s.toLowerCase())
      dbStories = WORKS.filter((w) => {
        const primarySlug = (w.genreSlug || (typeof w.genres?.[0] === 'object' ? w.genres[0].slug : '') || '').toLowerCase()
        const primaryName = (w.genre || (typeof w.genres?.[0] === 'object' ? w.genres[0].name : '') || '').toLowerCase()
        const allG = (Array.isArray(w.genres) ? w.genres : []).map((g: any) => {
          if (typeof g === 'string') return g.toLowerCase()
          return `${g.slug || ''} ${g.name || ''}`.toLowerCase()
        })
        return lowerGenreSlugs.some((slug) => {
          const simplified = slug.replace(/-/g, ' ')
          return (
            primarySlug === slug ||
            primarySlug.includes(slug) ||
            primaryName.includes(simplified) ||
            allG.some((g: string) => g.includes(simplified) || g.includes(slug))
          )
        })
      })
      .filter((w) => {
        if (clean.length >= 2) {
          return matchesTitle(w.title)
        }
        return true
      })
      .map(mapMockWorkToSearchResult)
    }

      const effectiveTotal = Math.max(totalDbCount, dbStories.length)

      return {
        query: clean,
        type: 'genre',
        stories: dbStories.slice(0, cappedLimit),
        authors: [],
        totalCount: effectiveTotal,
        page: validPage,
        hasMore: to + 1 < effectiveTotal,
      }
  }

  // ── Stories mode (default) ─────────────────────────────────────────────────
  if (clean.length < 2) {
    return {
      query: clean,
      type: 'stories',
      stories: [],
      authors: [],
      totalCount: 0,
      page: validPage,
      hasMore: false,
    }
  }

  const sanitized = clean.replace(/[,()]/g, ' ').trim()

  let dbStories: SearchStoriesResultItem[] = []
  let totalDbCount = 0

  if (hasSupabaseAdmin) {
    try {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      const admin = createAdminClient()

      // PostgreSQL ILIKE search with strict projection (Least Data Principle)
      // Uses idx_works_title_trgm and idx_works_description_trgm GIN indexes for fast sub-50ms lookup
      let worksQuery = admin
        .from('works')
        .select(`
          id,
          title,
          slug,
          description,
          cover_image_path,
          status,
          word_count,
          reading_time_minutes,
          view_count,
          like_count,
          created_at,
          profiles:author_id (id, username, display_name, avatar_path, bio),
          categories:category_id (id, name, slug),
          work_genres (genres (id, name, slug)),
          work_tags (tags (id, name, slug))
        `, { count: 'exact' })
        .eq('visibility', 'public')
        .eq('publication_status', 'published')

      if (isParameterVariant) {
        const altSanitized = sanitized.replace(/parameter/gi, 'perimeter')
        worksQuery = worksQuery.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%,title.ilike.%${altSanitized}%`)
      } else {
        worksQuery = worksQuery.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
      }

      const { data: rows, error, count } = await worksQuery
        .order('view_count', { ascending: false })
        .range(from, to)

      if (count !== null && count !== undefined) {
        totalDbCount = count
      }

      if (!error && Array.isArray(rows) && rows.length > 0) {
        dbStories = rows.map((w: any) => {
          const authorProfile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
          const category = Array.isArray(w.categories) ? w.categories[0] : w.categories
          const genreList: any[] = (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean)
          const tagList: any[] = (w.work_tags || []).map((wt: any) => wt.tags).filter(Boolean)
          const primaryGenre = genreList[0]

          return {
            id: w.id,
            title: w.title,
            slug: w.slug || w.id,
            synopsis: w.description || '',
            cover: w.cover_image_path || '/default-book-cover.webp',
            category: category?.name || 'Novels',
            categorySlug: category?.slug || 'novels',
            genre: primaryGenre?.name || 'Fiction',
            genreSlug: primaryGenre?.slug || 'fiction',
            genres: [
              ...genreList.map((g: any) => g.name || g.slug),
              ...tagList.map((t: any) => t.name || t.slug),
            ],
            status: (w.status === 'completed' ? 'Completed' : 'In Progress') as any,
            readingTimeMinutes: w.reading_time_minutes || 5,
            wordCount: w.word_count || 1000,
            viewCount: w.view_count || 0,
            ratingScore: 4.8,
            ratingCount: w.like_count || 0,
            author: {
              id: authorProfile?.id || w.author_id || 'author-unknown',
              name: authorProfile?.display_name || authorProfile?.username || 'Hatchpen Author',
              handle: authorProfile?.username || 'author',
              avatar: authorProfile?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              bio: authorProfile?.bio || '',
            },
          }
        }).filter((s) => matchesTitle(s.title))

        // Sort by view count
        dbStories.sort((a, b) => {
          return Number(b.viewCount || 0) - Number(a.viewCount || 0)
        })
      }
    } catch (e: any) {
      console.warn('[executeGlobalSearch] DB query notice:', e?.message)
    }
  }

  // Offline / Mock fallback resilience when DB returns 0 stories
  if (dbStories.length === 0) {
    dbStories = WORKS.filter((w) => matchesTitle(w.title))
      .map(mapMockWorkToSearchResult)

    // Sort by view count
    dbStories.sort((a, b) => {
      return Number(b.viewCount || 0) - Number(a.viewCount || 0)
    })
  }

  const effectiveTotal = Math.max(totalDbCount, dbStories.length)

  return {
    query: clean,
    type: 'stories',
    stories: dbStories.slice(0, cappedLimit),
    authors: [],
    totalCount: effectiveTotal,
    page: validPage,
    hasMore: to + 1 < effectiveTotal,
  }
}

/**
 * Server Function: Multi-mode global search endpoint.
 * Supports stories (text ILIKE), author (profile search), and genre (two-step filter).
 * Callable from client routes, headers, and search drawers.
 */
export const globalSearchServerFn = createServerFn({ method: 'GET' })
  .validator((params: { query: string; type?: 'stories' | 'author' | 'genre'; genreSlugs?: string[]; limit?: number; page?: number }) => {
    return {
      query: typeof params?.query === 'string' ? params.query.trim() : '',
      type: (params?.type === 'author' || params?.type === 'genre' ? params.type : 'stories') as 'stories' | 'author' | 'genre',
      genreSlugs: Array.isArray(params?.genreSlugs) ? params.genreSlugs.filter(Boolean).slice(0, 3) : undefined,
      limit: typeof params?.limit === 'number' ? params.limit : 24,
      page: typeof params?.page === 'number' ? params.page : 1,
    }
  })
  .handler(async ({ data }) => {
    return await executeGlobalSearch(data)
  })

export interface QuestionnaireParams {
  mood: string
  categorySlug?: string
  genreSlug?: string
  limit?: number
}

/**
 * Dynamic Questionnaire Recommendations:
 * Queries Supabase DB works joined with categories and genres,
 * scores candidates against mood keywords and user choices,
 * merges resiliently with mock works, and returns curated recommendations.
 */
export async function executeGetQuestionnaireRecommendations({
  mood,
  categorySlug,
  genreSlug,
  limit = 8,
}: QuestionnaireParams): Promise<SearchStoriesResultItem[]> {
  const cappedLimit = Math.min(Math.max(1, limit), 24)
  const normCategory = (categorySlug || 'all').toLowerCase().trim()
  const normGenre = (genreSlug || 'all').toLowerCase().trim()
  const normMood = (mood || 'quiet').toLowerCase().trim()

  // Thematic mood profiles with baseline affinities & semantic keywords
  const MOOD_PROFILES: Record<string, { keywords: string[]; affinity: Record<string, number> }> = {
    quiet: {
      keywords: ['quiet', 'solitude', 'slow', 'reflective', 'stillness', 'isolation', 'winter', 'kyoto', 'subarctic', 'peace', 'philosophical', 'meditation'],
      affinity: {
        'a-winter-in-kyoto': 100,
        'notes-on-subarctic-light': 100,
        'the-long-apprenticeship': 90,
        'the-cartographer-of-lost-ships': 65,
        'the-cold-perimeter': 55,
        'the-bureaucracy-of-miracles': 35,
        'the-starlight-clockmaker': 0,
        'the-redacted-script': 0,
      },
    },
    suspense: {
      keywords: ['suspense', 'thriller', 'mystery', 'bunker', 'vault', 'telemetry', 'secrets', 'conspiracy', 'espionage', 'cold', 'perimeter', 'tension', 'paranoid', 'gritty', 'dark'],
      affinity: {
        'the-cold-perimeter': 100,
        'the-redacted-script': 100,
        'the-bureaucracy-of-miracles': 70,
        'the-cartographer-of-lost-ships': 40,
        'a-winter-in-kyoto': 0,
        'notes-on-subarctic-light': 0,
        'the-long-apprenticeship': 0,
        'the-starlight-clockmaker': 0,
      },
    },
    emotional: {
      keywords: ['romance', 'love', 'heartbreak', 'emotional', 'bittersweet', 'tender', 'loss', 'grief', 'memory', 'nostalgia', 'coming-of-age', 'melancholic'],
      affinity: {
        'the-long-apprenticeship': 100,
        'notes-on-subarctic-light': 90,
        'a-winter-in-kyoto': 60,
        'the-starlight-clockmaker': 40,
        'the-cartographer-of-lost-ships': 20,
        'the-cold-perimeter': 10,
        'the-bureaucracy-of-miracles': 0,
        'the-redacted-script': 0,
      },
    },
    comforting: {
      keywords: ['comfort', 'cozy', 'gentle', 'warm', 'humor', 'light', 'everyday', 'clockmaker', 'miracles', 'friendship', 'hopeful', 'dreamlike', 'ramen'],
      affinity: {
        'the-starlight-clockmaker': 100,
        'a-winter-in-kyoto': 80,
        'the-long-apprenticeship': 75,
        'the-bureaucracy-of-miracles': 20,
        'notes-on-subarctic-light': 10,
        'the-cartographer-of-lost-ships': 10,
        'the-cold-perimeter': 0,
        'the-redacted-script': 0,
      },
    },
    curious: {
      keywords: ['ideas', 'intellectual', 'science', 'philosophy', 'history', 'worldbuilding', 'system', 'bureaucracy', 'cartographer', 'script', 'telemetry', 'horology', 'maps'],
      affinity: {
        'the-bureaucracy-of-miracles': 100,
        'the-cartographer-of-lost-ships': 100,
        'the-cold-perimeter': 85,
        'the-starlight-clockmaker': 75,
        'the-redacted-script': 65,
        'a-winter-in-kyoto': 60,
        'the-long-apprenticeship': 55,
        'notes-on-subarctic-light': 45,
      },
    },
  }

  // Genre cluster definitions for graceful thematic matching
  const GENRE_CLUSTERS: Record<string, string[]> = {
    suspense: ['mystery', 'thriller', 'psychological-thriller', 'crime', 'espionage-spy', 'horror', 'dark-fantasy', 'dystopian'],
    scifi: ['science-fiction', 'cyberpunk', 'space-opera', 'dystopian', 'philosophical-fiction'],
    quiet: ['literary-fiction', 'contemporary-fiction', 'essays', 'poetry', 'slice-of-life', 'memoir-autobiography'],
    historical: ['historical-fiction', 'war-fiction', 'alternate-history', 'historical-romance'],
    emotional: ['romance', 'dark-romance', 'contemporary-romance', 'historical-romance', 'lgbtq-romance', 'erotic-romance', 'family-drama', 'coming-of-age'],
    comforting: ['childrens-fiction', 'middle-grade', 'fantasy', 'slice-of-life', 'comedy', 'humor'],
    curious: ['philosophical-fiction', 'political-fiction', 'non-fiction', 'essays', 'magical-realism', 'general-fiction'],
  }

  const profile = MOOD_PROFILES[normMood] || MOOD_PROFILES.quiet
  const keywords = profile.keywords

  let dbStories: SearchStoriesResultItem[] = []

  if (hasSupabaseAdmin) {
    try {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      const admin = createAdminClient()

      const { data: rows, error } = await admin
        .from('works')
        .select(`
          id,
          title,
          slug,
          description,
          cover_image_path,
          status,
          word_count,
          reading_time_minutes,
          view_count,
          like_count,
          created_at,
          profiles:author_id (id, username, display_name, avatar_path, bio),
          categories:category_id (id, name, slug),
          work_genres (genres (id, name, slug)),
          work_tags (tags (id, name, slug))
        `)
        .eq('visibility', 'public')
        .eq('publication_status', 'published')

      if (!error && Array.isArray(rows) && rows.length > 0) {
        for (const w of rows as any[]) {
          const authorProfile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
          const category = Array.isArray(w.categories) ? w.categories[0] : w.categories
          const genreList: any[] = (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean)
          const tagList: any[] = (w.work_tags || []).map((wt: any) => wt.tags).filter(Boolean)
          const primaryGenre = genreList[0]

          dbStories.push({
            id: w.id,
            title: w.title,
            slug: w.slug || w.id,
            synopsis: w.description || '',
            cover: w.cover_image_path || '/default-book-cover.webp',
            category: category?.name || 'Novels',
            categorySlug: (category?.slug || 'novels').toLowerCase(),
            genre: primaryGenre?.name || 'Fiction',
            genreSlug: (primaryGenre?.slug || 'fiction').toLowerCase(),
            genres: [
              ...genreList.map((g: any) => g.name || g.slug),
              ...tagList.map((t: any) => t.name || t.slug),
            ],
            status: (w.status === 'completed' ? 'Completed' : 'In Progress') as any,
            readingTimeMinutes: w.reading_time_minutes || 5,
            wordCount: w.word_count || 1000,
            viewCount: w.view_count || 0,
            ratingScore: 4.8,
            ratingCount: w.like_count || 0,
            author: {
              id: authorProfile?.id || w.author_id || 'author-unknown',
              name: authorProfile?.display_name || authorProfile?.username || 'Hatchpen Author',
              handle: authorProfile?.username || 'author',
              avatar: authorProfile?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              bio: authorProfile?.bio || '',
            },
          })
        }
      }
    } catch (err: any) {
      console.warn('[executeGetQuestionnaireRecommendations] DB query notice:', err?.message)
    }
  }

  // Candidate pool: DB stories augmented with catalog works, deduplicated by ID & slug
  const mockStories: SearchStoriesResultItem[] = WORKS.map((w) => ({
    id: w.id,
    title: w.title,
    subtitle: w.subtitle,
    slug: getWorkSlug(w),
    synopsis: w.synopsis,
    cover: w.cover,
    category: w.category,
    categorySlug: w.categorySlug.toLowerCase(),
    genre: w.genre,
    genreSlug: (w.genreSlug || '').toLowerCase(),
    genres: w.tags || [w.genre],
    status: (w.status === 'Completed' ? 'Completed' : 'In Progress') as any,
    readingTimeMinutes: (w as any).readingTimeMinutes || 5,
    wordCount: (w as any).wordCount || 1000,
    viewCount: w.totalReads || (w as any).viewCount || 0,
    ratingScore: w.ratingScore,
    ratingCount: w.ratingCount,
    author: {
      id: w.author.id,
      name: w.author.name,
      handle: w.author.handle,
      avatar: w.author.avatar,
      bio: w.author.bio,
    },
  }))

  const seenIds = new Set<string>()
  const allCandidateStories: SearchStoriesResultItem[] = []
  for (const s of [...dbStories, ...mockStories]) {
    if (!seenIds.has(s.id) && !seenIds.has(s.slug)) {
      seenIds.add(s.id)
      seenIds.add(s.slug)
      allCandidateStories.push(s)
    }
  }

  // Rank and score candidates
  const scored = allCandidateStories.map((story) => {
    let score = 0
    const slugKey = story.slug.toLowerCase()

    // 1. Mood affinity
    if (typeof profile.affinity[slugKey] === 'number') {
      score += profile.affinity[slugKey]
    } else {
      // Dynamic candidate calculation for DB items
      const textToMatch = `${story.title} ${story.synopsis} ${story.genre} ${story.genres.join(' ')}`.toLowerCase()
      let kwMatches = 0
      for (const kw of keywords) {
        if (textToMatch.includes(kw)) kwMatches++
      }
      score += Math.min(kwMatches * 20, 80)
    }

    const baseMoodScore = score

    // 2. Format / Category weighting
    const storyCat = story.categorySlug.toLowerCase()
    if (normCategory !== 'all') {
      if (storyCat === normCategory) {
        score += 80
      } else {
        score -= 40
      }
    } else {
      score += 15
    }

    // 3. Genre weighting
    const storyGenre = story.genreSlug.toLowerCase()
    const allStoryGenres = [storyGenre, ...story.genres.map((g) => g.toLowerCase())]
    if (normGenre !== 'all') {
      if (allStoryGenres.includes(normGenre)) {
        score += 90
      } else {
        const matchingCluster = Object.values(GENRE_CLUSTERS).find(
          (c) => c.includes(normGenre) && allStoryGenres.some((g) => c.includes(g))
        )
        if (matchingCluster) {
          score += 45
        } else {
          score -= 40
        }
      }
    } else {
      score += 15
    }

    // 4. Slight popularity tiebreaker
    const rawViews = typeof story.viewCount === 'string'
      ? parseFloat(story.viewCount) * (story.viewCount.includes('M') ? 1000000 : story.viewCount.includes('K') ? 1000 : 1)
      : Number(story.viewCount || 0)
    const safeViews = isNaN(rawViews) ? 0 : rawViews
    score += Math.min(safeViews / 10000, 10)

    return { story, score, baseMoodScore }
  })
  // Filter out works with low/negative scores or 0 mood relevance (unless exact genre match)
  const filtered = scored.filter((item) => {
    if (normCategory === 'all' && normGenre === 'all') {
      return item.baseMoodScore >= 35 && item.score >= 40
    }
    return item.score >= 40
  })

  // Sort descending by calculated score
  filtered.sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  const finalStories: SearchStoriesResultItem[] = []
  for (const item of filtered) {
    if (!seen.has(item.story.id) && !seen.has(item.story.slug)) {
      seen.add(item.story.id)
      seen.add(item.story.slug)
      finalStories.push(item.story)
    }
    if (finalStories.length >= cappedLimit) break
  }

  // Resilient fallback: if filters were extremely narrow and returned 0, return top mood matches
  if (finalStories.length === 0) {
    const fallbackSorted = scored.filter(item => item.baseMoodScore >= 30).sort((a, b) => b.baseMoodScore - a.baseMoodScore)
    for (const item of fallbackSorted) {
      if (!seen.has(item.story.id) && !seen.has(item.story.slug)) {
        seen.add(item.story.id)
        seen.add(item.story.slug)
        finalStories.push(item.story)
      }
      if (finalStories.length >= cappedLimit) break
    }
  }

  return finalStories
}

/**
 * Server Function: Questionnaire Recommendations endpoint.
 * Returns dynamically scored and filtered reading recommendations from Supabase DB and catalog.
 */
export const getQuestionnaireRecommendationsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { mood: string; categorySlug?: string; genreSlug?: string; limit?: number }) => {
    return {
      mood: typeof params?.mood === 'string' ? params.mood : 'quiet',
      categorySlug: typeof params?.categorySlug === 'string' ? params.categorySlug : 'all',
      genreSlug: typeof params?.genreSlug === 'string' ? params.genreSlug : 'all',
      limit: typeof params?.limit === 'number' ? params.limit : 8,
    }
  })
  .handler(async ({ data }) => {
    return await executeGetQuestionnaireRecommendations(data)
  })
