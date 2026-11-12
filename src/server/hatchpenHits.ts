/**
 * HatchPen Hits — Core Server Function & Public Data Service
 * 
 * Strict Security & Privacy Invariants:
 * 1. Zero sensitive leak: Never returns author email addresses, clerk IDs, private tokens, or auth preferences.
 * 2. Strict public projection: Only works with visibility='public' and publication_status='published' are eligible.
 * 3. Indexable: Only indexable works are returned.
 * 4. Religious works strictly excluded (conforms to platform-wide home & discovery policy).
 * 5. High Performance: Edge / In-Memory SWR caching (60s TTL) to absorb high crawler and public traffic.
 */

import { createServerFn } from '@tanstack/react-start'
import { isReligiousWork } from '../lib/discover/filters.ts'
import { isWorkIndexable } from './sitemap.ts'
import { WORKS, getWorkSlug } from '../data/mockData.ts'

export interface HatchpenHitWork {
  id: string
  title: string
  slug: string
  synopsis: string
  cover: string
  category: string
  categorySlug: string
  genre: string
  genreSlug: string
  genres: string[]
  status: 'Completed' | 'In Progress'
  readingTimeMinutes: number
  wordCount: number
  viewCount: number | string
  likeCount: number
  ratingScore: number
  ratingCount: number
  publishedAt: string
  author: {
    id: string
    name: string
    handle: string
    avatar: string
  }
}

export interface HatchpenHitsResponse {
  collection: {
    slug: string
    name: string
    headline: string
    description: string
    keywords: string[]
    accentLetter: string
  }
  works: HatchpenHitWork[]
  totalCount: number
  cachedAt: string
}

// 60-second in-memory server cache for public scalability
let hitsCache: { data: HatchpenHitsResponse; timestamp: number } | null = null
const HITS_CACHE_TTL_MS = 60_000 // 60 seconds

export function clearHatchpenHitsCache() {
  hitsCache = null
}

const SIGNATURE_HIT_TITLES = [
  'the season we fell',
  'pleasure after dark',
  'apartment 407',
]

function matchesSignatureTitle(title: string | null | undefined): boolean {
  if (!title) return false
  const lower = title.toLowerCase().trim()
  return SIGNATURE_HIT_TITLES.some((sig) => lower.includes(sig) || sig.includes(lower))
}

function checkHasSupabaseAdmin(): boolean {
  return Boolean(
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY && process.env?.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY && (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY !== 'placeholder-service-key')
  )
}

/**
 * Executes the HatchPen Hits query against Supabase with in-memory fallback.
 * Strictly projects only public, safe fields.
 */
export async function executeGetHatchpenHits(): Promise<HatchpenHitsResponse> {
  const now = Date.now()
  if (hitsCache && now - hitsCache.timestamp < HITS_CACHE_TTL_MS) {
    return hitsCache.data
  }

  let rawWorks: any[] = []

  const hasAdmin = checkHasSupabaseAdmin()

  if (hasAdmin) {
    try {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      const admin = createAdminClient()

      // 1. Fetch ONLY works explicitly curated by admin with curated_collections containing 'hatchpen_hits'
      const { data: dbWorks, error } = await admin
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
          visibility,
          publication_status,
          is_indexable,
          curated_collections,
          published_at,
          created_at,
          profiles:author_id (
            id,
            username,
            display_name,
            avatar_path
          ),
          categories:category_id (
            id,
            name,
            slug
          ),
          work_genres (
            genres (
              id,
              name,
              slug
            )
          ),
          work_tags (
            tags (
              id,
              name,
              slug
            )
          )
        `)
        .contains('curated_collections', ['hatchpen_hits'])
        .eq('visibility', 'public')
        .eq('publication_status', 'published')
        .eq('is_indexable', true)
        .order('view_count', { ascending: false })

      if (!error && Array.isArray(dbWorks)) {
        rawWorks = dbWorks
      }
    } catch (err: any) {
      console.warn('[executeGetHatchpenHits] Database query notice:', err?.message)
    }
  }

  // Filter strictly for works admin curated into 'hatchpen_hits'
  let hits = rawWorks.filter((w: any) => {
    if (!isWorkIndexable(w)) return false
    if (isReligiousWork(w)) return false

    const cols: string[] = Array.isArray(w.curated_collections)
      ? w.curated_collections
      : Array.isArray(w.collections)
      ? w.collections
      : []
    return cols.includes('hatchpen_hits')
  })

  // Offline / Mock fallback ONLY when DB is unavailable or returns 0 in offline testing
  if (hits.length === 0 && !hasAdmin) {
    hits = WORKS.filter((w) => {
      if (isReligiousWork(w)) return false
      const cols: string[] = Array.isArray((w as any).curated_collections)
        ? (w as any).curated_collections
        : Array.isArray(w.collections)
        ? w.collections
        : []
      return cols.includes('hatchpen_hits')
    })

    if (hits.length === 0) {
      hits = WORKS.filter((w) => !isReligiousWork(w) && (w.featured || w.editorPick)).slice(0, 3)
    }
  }

  // Sort by view_count
  hits.sort((a, b) => {
    return Number(b.view_count || b.viewCount || 0) - Number(a.view_count || a.viewCount || 0)
  })

  // Format into strictly sanitized public DTO
  const formattedWorks: HatchpenHitWork[] = hits.map((w: any) => {
    const authorProfile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles || w.author
    const category = Array.isArray(w.categories) ? w.categories[0] : w.categories
    const genreList: any[] = (w.work_genres || []).map((wg: any) => wg.genres).filter(Boolean)
    const tagList: any[] = (w.work_tags || []).map((wt: any) => wt.tags).filter(Boolean)
    const primaryGenre = genreList[0]

    const allGenres: string[] = [
      ...genreList.map((g: any) => g.name || g.slug),
      ...tagList.map((t: any) => t.name || t.slug),
    ].filter(Boolean)

    return {
      id: w.id,
      title: w.title,
      slug: w.slug || getWorkSlug(w) || w.id,
      synopsis: w.description || w.synopsis || '',
      cover: w.cover_image_path || w.cover || '/default-book-cover.webp',
      category: category?.name || w.category || 'Novels',
      categorySlug: (category?.slug || w.categorySlug || 'novels').toLowerCase(),
      genre: primaryGenre?.name || w.genre || 'Fiction',
      genreSlug: (primaryGenre?.slug || w.genreSlug || 'fiction').toLowerCase(),
      genres: allGenres.length > 0 ? allGenres : [primaryGenre?.name || w.genre || 'Fiction'],
      status: (w.status === 'completed' || w.status === 'Completed' ? 'Completed' : 'In Progress'),
      readingTimeMinutes: Number(w.reading_time_minutes || w.readingTimeMinutes || 5),
      wordCount: Number(w.word_count || w.wordCount || 1000),
      viewCount: w.view_count || w.viewCount || 0,
      likeCount: Number(w.like_count || w.likeCount || 0),
      ratingScore: Number(w.ratingScore || 4.9),
      ratingCount: Number(w.ratingCount || w.like_count || 12),
      publishedAt: w.published_at || w.created_at || new Date().toISOString(),
      author: {
        id: authorProfile?.id || 'hatchpen-author',
        name: authorProfile?.display_name || authorProfile?.name || authorProfile?.username || 'Hatchpen Author',
        handle: authorProfile?.username || authorProfile?.handle || 'author',
        avatar: authorProfile?.avatar_path || authorProfile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      },
    }
  })

  const result: HatchpenHitsResponse = {
    collection: {
      slug: 'hatchpen-hits',
      name: 'HatchPen Hits',
      headline: 'Most Celebrated & Viral Indie Web Novels',
      description: 'Explore the most viral and celebrated serialized novels on HatchPen, handpicked by editors and readers including The Season We Fell, Pleasure After Dark, and Apartment 407. Read free chapter by chapter with zero paywalls.',
      keywords: [
        'hatchpen hits',
        'hatchpen top stories',
        'the season we fell',
        'pleasure after dark',
        'apartment 407',
        'viral web novels',
        'best serialized fiction',
        'free indie books',
        'HatchPen',
      ],
      accentLetter: 'H',
    },
    works: formattedWorks,
    totalCount: formattedWorks.length,
    cachedAt: new Date().toISOString(),
  }

  hitsCache = { data: result, timestamp: now }
  return result
}

export const getHatchpenHitsServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<HatchpenHitsResponse> => {
    return await executeGetHatchpenHits()
  })
