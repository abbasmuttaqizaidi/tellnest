/**
 * HatchPen Dynamic Sitemap Generator
 * Produces standard XML sitemap for search engine crawlers conforming to Sitemaps XML protocol 0.9.
 *
 * Invariants:
 * 1. Strictly canonical host (https://hatchpen.com)
 * 2. Unlisted, draft, archived, private, and non-indexable content are strictly EXCLUDED
 * 3. Includes all 16 canonical categories and 33 canonical genres
 * 4. Includes eligible published public works, their published chapters, and active authors
 * 5. Strict URL uniqueness and XML character escaping
 */

import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy.ts'
import { supabase as defaultSupabase } from '../lib/supabase/client.ts'

export const CANONICAL_BASE_URL = 'https://hatchpen.com'

export interface SitemapUrlEntry {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * Escapes characters with special meaning in XML.
 */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validates whether a work meets the strict requirements for public search engine indexing.
 * Policy:
 * 1. Visibility must be strictly 'public' (case-insensitive, excludes unlisted/draft/private)
 * 2. Publication status must be strictly 'published' (case-insensitive, excludes draft/archived)
 * 3. is_indexable must be strictly true (rejects false, undefined, null)
 */
export function isSitemapEligibleWork(work: {
  visibility?: string | null
  publication_status?: string | null
  publicationStatus?: string | null
  is_indexable?: boolean | null
  isIndexable?: boolean | null
}): boolean {
  if (!work) return false
  const visibility = (work.visibility || '').toLowerCase()
  const pubStatus = (work.publication_status || work.publicationStatus || '').toLowerCase()
  if (visibility !== 'public') return false
  if (pubStatus !== 'published') return false

  const rawIndexable = work.is_indexable !== undefined ? work.is_indexable : work.isIndexable
  if (rawIndexable !== true) return false
  return true
}

export const isWorkIndexable = isSitemapEligibleWork

/**
 * Validates whether a chapter meets the strict requirements for public search engine indexing.
 * Policy:
 * 1. Parent work must be eligible for indexing (public, published, indexable)
 * 2. Chapter status must be strictly 'published' (case-insensitive, excludes draft/archived)
 * 3. Chapter is_indexable must be strictly true (rejects false, undefined, null)
 * 4. If chapter belongs to an act (act_id is set), that act must be published.
 *    Standalone chapters (act_id is null/undefined) are eligible if work and chapter are published and indexable.
 */
export function isSitemapEligibleChapter(
  chapter: {
    status?: string | null
    is_indexable?: boolean | null
    isIndexable?: boolean | null
    act_id?: string | null
    actId?: string | null
    act?: { status?: string | null } | null
  },
  parentWork: {
    visibility?: string | null
    publication_status?: string | null
    publicationStatus?: string | null
    is_indexable?: boolean | null
    isIndexable?: boolean | null
  },
  publishedActIds?: Set<string>
): boolean {
  if (!isSitemapEligibleWork(parentWork)) return false
  if (!chapter) return false
  const status = (chapter.status || '').toLowerCase()
  if (status !== 'published') return false

  const rawIndexable = chapter.is_indexable !== undefined ? chapter.is_indexable : chapter.isIndexable
  if (rawIndexable !== true) return false

  // Hierarchy check: chapters belonging to unpublished acts must not be indexed
  const actId = chapter.act_id || chapter.actId
  if (actId && publishedActIds && !publishedActIds.has(actId)) {
    return false
  }
  if (chapter.act && chapter.act.status && (chapter.act.status || '').toLowerCase() !== 'published') {
    return false
  }

  return true
}

export const isChapterIndexable = isSitemapEligibleChapter

/**
 * Formats a Date or date string to YYYY-MM-DD for sitemap lastmod.
 */
export function formatLastmod(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return undefined
    return d.toISOString().split('T')[0]
  } catch {
    return undefined
  }
}

export interface BuildSitemapOptions {
  supabaseClient?: any
}

/**
 * Builds all canonical sitemap entries.
 */
export async function buildSitemapEntries(options?: BuildSitemapOptions): Promise<SitemapUrlEntry[]> {
  const entries: SitemapUrlEntry[] = []
  const seenUrls = new Set<string>()

  function addEntry(entry: SitemapUrlEntry) {
    if (!seenUrls.has(entry.loc)) {
      seenUrls.add(entry.loc)
      entries.push(entry)
    }
  }

  // 1. Core Discovery & Catalog Pages
  addEntry({
    loc: `${CANONICAL_BASE_URL}/`,
    changefreq: 'daily',
    priority: 1.0,
  })
  addEntry({
    loc: `${CANONICAL_BASE_URL}/discover`,
    changefreq: 'daily',
    priority: 0.9,
  })
  addEntry({
    loc: `${CANONICAL_BASE_URL}/pricing`,
    changefreq: 'monthly',
    priority: 0.7,
  })

  // 2. All 16 Canonical Categories
  for (const cat of GLOBAL_CATEGORIES) {
    if (cat.slug) {
      addEntry({
        loc: `${CANONICAL_BASE_URL}/category/${cat.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
      })
    }
  }

  // 3. All 33 Canonical Literary Genres
  for (const genre of GLOBAL_GENRES) {
    if (genre.slug) {
      addEntry({
        loc: `${CANONICAL_BASE_URL}/genre/${genre.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
      })
    }
  }

  // 4. Live Published Works, Authors, and Chapters from Database
  const client = options?.supabaseClient || defaultSupabase
  try {
    const { data: works, error: worksError } = await client
      .from('works')
      .select('id, slug, title, updated_at, published_at, visibility, publication_status, is_indexable, author_id, profiles!works_author_id_fkey(id, username)')
      .eq('visibility', 'public')
      .eq('publication_status', 'published')
      .eq('is_indexable', true)
      .order('updated_at', { ascending: false })

    if (worksError) {
      console.warn('[buildSitemapEntries] Error querying works:', worksError.message)
    } else if (Array.isArray(works) && works.length > 0) {
      const eligibleWorks = works.filter(isSitemapEligibleWork)
      const eligibleWorkIds: string[] = []

      // Authors with at least 1 eligible published work
      const seenAuthors = new Set<string>()

      for (const work of eligibleWorks) {
        eligibleWorkIds.push(work.id)
        const workSlug = work.slug || work.id
        const lastmod = formatLastmod(work.updated_at || work.published_at)

        addEntry({
          loc: `${CANONICAL_BASE_URL}/works/${workSlug}`,
          lastmod,
          changefreq: 'weekly',
          priority: 0.9,
        })

        // Eligible Author Profile
        const author = work.profiles
        if (author) {
          const authorHandle = author.username || author.id
          if (authorHandle && !seenAuthors.has(authorHandle)) {
            seenAuthors.add(authorHandle)
            addEntry({
              loc: `${CANONICAL_BASE_URL}/author/${authorHandle}`,
              changefreq: 'monthly',
              priority: 0.7,
            })
          }
        }
      }

      // Chapters belonging to eligible works (filtering out chapters in unpublished acts)
      if (eligibleWorkIds.length > 0) {
        // Query acts for eligible works to verify act publication status
        let publishedActIds: Set<string> | undefined
        try {
          const { data: acts, error: actsError } = await client
            .from('acts')
            .select('id, work_id, status')
            .in('work_id', eligibleWorkIds)

          if (!actsError && Array.isArray(acts)) {
            publishedActIds = new Set<string>(
              acts
                .filter((a: any) => (a.status || '').toLowerCase() === 'published')
                .map((a: any) => a.id)
            )
          }
        } catch {
          // Acts table lookup is optional/graceful if not available
        }

        const { data: chapters, error: chaptersError } = await client
          .from('chapters')
          .select('id, work_id, act_id, title, status, is_indexable, updated_at, published_at')
          .in('work_id', eligibleWorkIds)
          .eq('status', 'published')
          .eq('is_indexable', true)

        if (chaptersError) {
          console.warn('[buildSitemapEntries] Error querying chapters:', chaptersError.message)
        } else if (Array.isArray(chapters)) {
          const workMap = new Map<string, any>()
          for (const w of eligibleWorks) {
            workMap.set(w.id, w)
          }

          for (const ch of chapters) {
            const parentWork = workMap.get(ch.work_id)
            if (parentWork && isSitemapEligibleChapter(ch, parentWork, publishedActIds)) {
              const workSlug = parentWork.slug || parentWork.id
              const lastmod = formatLastmod(ch.updated_at || ch.published_at)
              addEntry({
                loc: `${CANONICAL_BASE_URL}/read/${workSlug}/${ch.id}`,
                lastmod,
                changefreq: 'weekly',
                priority: 0.7,
              })
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[buildSitemapEntries] Unexpected error retrieving database sitemap entries:', err?.message || err)
  }

  return entries
}

/**
 * Generates valid Sitemap XML 0.9 string from sitemap entries.
 */
export async function generateSitemapXml(options?: BuildSitemapOptions): Promise<string> {
  const entries = await buildSitemapEntries(options)

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

  for (const entry of entries) {
    xml += '  <url>\n'
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`
    if (entry.lastmod) {
      xml += `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n`
    }
    if (entry.changefreq) {
      xml += `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>\n`
    }
    if (typeof entry.priority === 'number') {
      xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`
    }
    xml += '  </url>\n'
  }

  xml += '</urlset>\n'
  return xml
}
