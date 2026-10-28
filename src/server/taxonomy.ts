import { createServerFn } from '@tanstack/react-start'
import { supabase } from '../lib/supabase/client.ts'
import { createAdminClient } from '../lib/supabase/server.ts'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy.ts'

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
 * Core taxonomy resolution logic.
 * Merges active database rows with canonical taxonomy and sorts both categories
 * and genres alphabetically by name.
 */
export async function executeGetTaxonomy(options?: {
  supabaseClient?: any
  adminClient?: any
  skipCache?: boolean
}): Promise<TaxonomyResponse> {
  const now = Date.now()
  if (!options?.skipCache && cachedTaxonomy && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedTaxonomy
  }

  const client = options?.supabaseClient || supabase

  try {
    // Lightweight parallel query selecting active categories & genres
    const [catRes, genRes] = await Promise.all([
      client
        .from('categories')
        .select('id, name, slug, description, display_order')
        .eq('is_active', true),
      client
        .from('genres')
        .select('id, name, slug, description, display_order')
        .eq('is_active', true),
    ])

    const catMap = new Map<string, TaxonomyCategoryItem>()
    if (catRes.data && catRes.data.length > 0) {
      for (const c of catRes.data) {
        const matched = GLOBAL_CATEGORIES.find((gc) => gc.slug === c.slug)
        catMap.set(c.slug, {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || undefined,
          accentLetter: matched?.accentLetter || c.name.charAt(0),
        })
      }
    }

    // Merge canonical GLOBAL_CATEGORIES so missing categories (e.g. Religion & Spirituality) are ALWAYS included
    const missingCategories: Array<{ name: string; slug: string; description: string; display_order: number }> = []
    for (const gc of GLOBAL_CATEGORIES) {
      if (!catMap.has(gc.slug)) {
        catMap.set(gc.slug, {
          id: gc.id,
          name: gc.name,
          slug: gc.slug,
          description: gc.description,
          accentLetter: gc.accentLetter,
        })
        missingCategories.push({
          name: gc.name,
          slug: gc.slug,
          description: gc.description,
          display_order: gc.displayOrder,
        })
      }
    }

    const genMap = new Map<string, TaxonomyGenreItem>()
    if (genRes.data && genRes.data.length > 0) {
      for (const g of genRes.data) {
        const matched = GLOBAL_GENRES.find((gg) => gg.slug === g.slug)
        genMap.set(g.slug, {
          id: g.id,
          name: g.name,
          slug: g.slug,
          group: matched?.group || 'Other',
          description: g.description || undefined,
        })
      }
    }

    // Merge canonical GLOBAL_GENRES so missing genres (e.g. Faith & Spirituality) are ALWAYS included
    const missingGenres: Array<{ name: string; slug: string; description: string; display_order: number }> = []
    for (const gg of GLOBAL_GENRES) {
      if (!genMap.has(gg.slug)) {
        genMap.set(gg.slug, {
          id: gg.id,
          name: gg.name,
          slug: gg.slug,
          group: gg.group,
          description: gg.description,
        })
        missingGenres.push({
          name: gg.name,
          slug: gg.slug,
          description: gg.description,
          display_order: gg.displayOrder,
        })
      }
    }

    // Safe non-blocking sync to DB if any canonical items were missing
    if (missingCategories.length > 0 || missingGenres.length > 0) {
      try {
        const admin = options?.adminClient || createAdminClient()
        if (missingCategories.length > 0) {
          await admin.from('categories').upsert(
            missingCategories.map((c) => ({
              name: c.name,
              slug: c.slug,
              description: c.description,
              display_order: c.display_order,
              is_active: true,
            })),
            { onConflict: 'slug' }
          )
        }
        if (missingGenres.length > 0) {
          await admin.from('genres').upsert(
            missingGenres.map((g) => ({
              name: g.name,
              slug: g.slug,
              description: g.description,
              display_order: g.display_order,
              is_active: true,
            })),
            { onConflict: 'slug' }
          )
        }
      } catch {
        // Ignore background sync errors gracefully
      }
    }

    // Sort alphabetically by name
    const categories: TaxonomyCategoryItem[] = Array.from(catMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    const genres: TaxonomyGenreItem[] = Array.from(genMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

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
      })).sort((a, b) => a.name.localeCompare(b.name)),
      genres: GLOBAL_GENRES.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        group: g.group,
        description: g.description,
      })).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }
}

/**
 * Lightweight, cached API / Server Function to get all categories and genres from DB.
 * Only returns minimal, lightweight fields (id, name, slug, description).
 * Automatically merges with canonical taxonomy and sorts alphabetically by name.
 */
export const getTaxonomyServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<TaxonomyResponse> => {
    return await executeGetTaxonomy()
  })
