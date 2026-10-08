import { createServerFn } from '@tanstack/react-start'
import { supabase } from '../lib/supabase/client'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy'

export interface TaxonomyCategoryItem {
  id: string
  name: string
  slug: string
  description?: string
  accentLetter?: string
}

export interface TaxonomyGenreItem {
  id: string
  name: string
  slug: string
  group?: string
  description?: string
}

export interface TaxonomyResponse {
  categories: TaxonomyCategoryItem[]
  genres: TaxonomyGenreItem[]
}

// In-memory cache for ultra-fast server response (avoids hitting DB on every request)
let cachedTaxonomy: TaxonomyResponse | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

/**
 * Lightweight, cached API / Server Function to get all categories and genres from DB.
 * Only returns minimal, lightweight fields (id, name, slug, description).
 * Automatically falls back to canonical taxonomy if DB is unavailable.
 */
export const getTaxonomyServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<TaxonomyResponse> => {
    const now = Date.now()
    if (cachedTaxonomy && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedTaxonomy
    }

    try {
      // Lightweight parallel query selecting ONLY active categories & genres with minimal fields
      const [catRes, genRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug, description, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('genres')
          .select('id, name, slug, description, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ])

      const categories: TaxonomyCategoryItem[] =
        catRes.data && catRes.data.length > 0
          ? catRes.data.map((c) => {
              const matched = GLOBAL_CATEGORIES.find((gc) => gc.slug === c.slug)
              return {
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description || undefined,
                accentLetter: matched?.accentLetter || c.name.charAt(0),
              }
            })
          : GLOBAL_CATEGORIES.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description,
              accentLetter: c.accentLetter,
            }))

      const genres: TaxonomyGenreItem[] =
        genRes.data && genRes.data.length > 0
          ? genRes.data.map((g) => {
              const matched = GLOBAL_GENRES.find((gg) => gg.slug === g.slug)
              return {
                id: g.id,
                name: g.name,
                slug: g.slug,
                group: matched?.group || 'Other',
                description: g.description || undefined,
              }
            })
          : GLOBAL_GENRES.map((g) => ({
              id: g.id,
              name: g.name,
              slug: g.slug,
              group: g.group,
              description: g.description,
            }))

      cachedTaxonomy = { categories, genres }
      cacheTimestamp = now
      return cachedTaxonomy
    } catch (err) {
      console.warn('[getTaxonomyServerFn] Fallback to canonical taxonomy:', err)
      return {
        categories: GLOBAL_CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          accentLetter: c.accentLetter,
        })),
        genres: GLOBAL_GENRES.map((g) => ({
          id: g.id,
          name: g.name,
          slug: g.slug,
          group: g.group,
          description: g.description,
        })),
      }
    }
  })
