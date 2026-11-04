/**
 * HatchPen Dynamic RSS 2.0 Feed Generator
 *
 * Produces standard RSS 2.0 XML with atom:link self-reference for search engine crawlers,
 * newsletters, literary aggregators, and RSS reader applications.
 *
 * Invariants:
 * 1. Strict canonical host (https://hatchpen.com)
 * 2. Unlisted, draft, archived, private, and non-indexable content are strictly EXCLUDED
 * 3. Dates conform to RFC 822 standard (e.g. "Thu, 29 Oct 2026 12:00:00 GMT")
 * 4. Special characters are escaped or safely wrapped in CDATA
 * 5. Bounded query (top 50 recent works) for edge performance
 */

import { escapeXml, isSitemapEligibleWork, CANONICAL_BASE_URL } from './sitemap.ts'
import { SITE_NAME, DEFAULT_DESCRIPTION } from '../lib/seo.ts'
import { supabase as defaultSupabase } from '../lib/supabase/client.ts'

export interface RssFeedItem {
  title: string
  link: string
  guid: string
  pubDate: string
  author?: string
  description?: string
  category?: string
  enclosure?: {
    url: string
    type: string
  }
}

export interface GenerateRssOptions {
  supabaseClient?: any
  limit?: number
  currentDate?: Date
}

/**
 * Formats a timestamp into standard RFC 822 date string.
 */
export function formatRfc822Date(dateInput?: string | number | Date | null): string {
  if (!dateInput) return new Date().toUTCString()
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return new Date().toUTCString()
    return d.toUTCString()
  } catch {
    return new Date().toUTCString()
  }
}

/**
 * Wraps text inside XML CDATA block safely handling nested CDATA terminations.
 */
export function cdata(text: string): string {
  const safeText = (text || '').replace(/]]>/g, ']]]]><![CDATA[>')
  return `<![CDATA[${safeText}]]>`
}

/**
 * Fetches recent public published works and generates RSS 2.0 XML string.
 */
export async function generateRssXml(options: GenerateRssOptions = {}): Promise<string> {
  const limit = Math.min(100, Math.max(1, options.limit || 50))
  const client = options.supabaseClient || defaultSupabase
  const now = options.currentDate || new Date()
  const lastBuildDate = formatRfc822Date(now)

  const items: RssFeedItem[] = []

  try {
    const { data: works, error } = await client
      .from('works')
      .select('id, slug, title, description, cover_image_path, updated_at, created_at, published_at, visibility, publication_status, is_indexable, author_id, profiles!works_author_id_fkey(id, username, display_name)')
      .eq('visibility', 'public')
      .eq('publication_status', 'published')
      .eq('is_indexable', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      console.warn('[generateRssXml] Database query warning:', error.message)
    } else if (Array.isArray(works) && works.length > 0) {
      const eligibleWorks = works.filter(isSitemapEligibleWork)

      for (const w of eligibleWorks) {
        const canonicalSlug = w.slug || w.id
        const storyUrl = `${CANONICAL_BASE_URL}/works/${canonicalSlug}`
        const authorProfile = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
        const authorName = authorProfile?.display_name || authorProfile?.username || 'HatchPen Author'
        const pubDate = formatRfc822Date(w.published_at || w.created_at || w.updated_at)
        const description = (w.description || w.synopsis || '').slice(0, 300)
        const cover = w.cover_image_path || w.cover

        const item: RssFeedItem = {
          title: w.title,
          link: storyUrl,
          guid: storyUrl,
          pubDate,
          author: authorName,
          description,
          category: w.genre || w.category || undefined,
        }

        if (cover && typeof cover === 'string' && cover.startsWith('http')) {
          item.enclosure = {
            url: cover,
            type: cover.endsWith('.png') ? 'image/png' : 'image/jpeg',
          }
        }

        items.push(item)
      }
    }
  } catch (err: any) {
    console.warn('[generateRssXml] Fallback notice:', err?.message || err)
  }

  // Construct RSS 2.0 XML Document
  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${escapeXml(SITE_NAME)} — Writings. Beyond the Hype.</title>`,
    `    <link>${CANONICAL_BASE_URL}</link>`,
    `    <description>${escapeXml(DEFAULT_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${CANONICAL_BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />`,
    '    <image>',
    `      <url>${CANONICAL_BASE_URL}/icon-512.png</url>`,
    `      <title>${escapeXml(SITE_NAME)}</title>`,
    `      <link>${CANONICAL_BASE_URL}</link>`,
    '    </image>',
  ]

  for (const item of items) {
    xmlLines.push('    <item>')
    xmlLines.push(`      <title>${cdata(item.title)}</title>`)
    xmlLines.push(`      <link>${escapeXml(item.link)}</link>`)
    xmlLines.push(`      <guid isPermaLink="true">${escapeXml(item.guid)}</guid>`)
    xmlLines.push(`      <pubDate>${item.pubDate}</pubDate>`)
    if (item.author) {
      xmlLines.push(`      <author>${cdata(item.author)}</author>`)
    }
    if (item.category) {
      xmlLines.push(`      <category>${cdata(item.category)}</category>`)
    }
    if (item.description) {
      xmlLines.push(`      <description>${cdata(item.description)}</description>`)
    }
    if (item.enclosure) {
      xmlLines.push(
        `      <enclosure url="${escapeXml(item.enclosure.url)}" length="0" type="${item.enclosure.type}" />`
      )
    }
    xmlLines.push('    </item>')
  }

  xmlLines.push('  </channel>')
  xmlLines.push('</rss>')

  return xmlLines.join('\n')
}

export interface GenerateStoryRssOptions extends GenerateRssOptions {
  workData?: any
  chaptersData?: any[]
}

/**
 * Generates an RSS 2.0 XML feed for an individual serialized story's published chapters.
 * Enables instant syndication for serial fiction aggregators and web fiction indexing bots.
 * Returns null if the work is private, draft, unlisted, not indexable, or not found.
 */
export async function generateStoryRssXml(
  slugOrId: string,
  options: GenerateStoryRssOptions = {}
): Promise<string | null> {
  if (!slugOrId || typeof slugOrId !== 'string' || !slugOrId.trim()) {
    return null
  }

  const clean = slugOrId.trim().toLowerCase()
  const client = options.supabaseClient || defaultSupabase
  const now = options.currentDate || new Date()
  const lastBuildDate = formatRfc822Date(now)

  let work = options.workData
  if (!work) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
      let query = client
        .from('works')
        .select('id, slug, title, description, cover_image_path, language, visibility, publication_status, is_indexable, created_at, updated_at, published_at, profiles!works_author_id_fkey(id, username, display_name)')
        .eq('visibility', 'public')
        .eq('publication_status', 'published')
        .eq('is_indexable', true)

      if (isUuid) {
        query = query.or(`id.eq.${clean},slug.eq.${clean}`)
      } else {
        query = query.eq('slug', clean)
      }

      const { data, error } = await query.maybeSingle()
      if (error) {
        console.warn(`[generateStoryRssXml] Database error for work "${clean}":`, error.message)
        return null
      }
      work = data
    } catch (err: any) {
      console.warn(`[generateStoryRssXml] Work lookup error for "${clean}":`, err?.message || err)
      return null
    }
  }

  if (!work || !isSitemapEligibleWork(work)) {
    return null
  }

  const canonicalSlug = work.slug || work.id
  const workUrl = `${CANONICAL_BASE_URL}/works/${canonicalSlug}`
  const rssSelfUrl = `${CANONICAL_BASE_URL}/rss/${canonicalSlug}.xml`
  const storyTitle = work.title || 'Untitled Manuscript'
  const storyDesc = (work.description || work.synopsis || `Latest published chapters from ${storyTitle} on HatchPen.`).slice(0, 500)
  const authorProfile = Array.isArray(work.profiles) ? work.profiles[0] : (work.profiles || work.author)
  const authorName = authorProfile?.display_name || authorProfile?.name || authorProfile?.username || 'HatchPen Author'
  const cover = work.cover_image_path || work.cover

  let chapters = options.chaptersData || work.chapters
  if (!chapters && work.id) {
    try {
      const { data: dbChapters, error: chError } = await client
        .from('chapters')
        .select('id, chapter_number, title, excerpt, word_count, status, is_indexable, published_at, created_at')
        .eq('work_id', work.id)
        .eq('status', 'published')
        .order('chapter_number', { ascending: true })

      if (chError) {
        console.warn(`[generateStoryRssXml] Chapter query error for work ${work.id}:`, chError.message)
      } else {
        chapters = dbChapters
      }
    } catch (chErr: any) {
      console.warn(`[generateStoryRssXml] Chapter fetch error for work ${work.id}:`, chErr?.message || chErr)
    }
  }

  const eligibleChapters = (Array.isArray(chapters) ? chapters : []).filter(
    (ch: any) =>
      (ch.status || 'published').toLowerCase() === 'published' &&
      ch.is_indexable !== false
  )

  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${cdata(`${storyTitle} — Chapter Feed | HatchPen`)}</title>`,
    `    <link>${workUrl}</link>`,
    `    <description>${cdata(storyDesc)}</description>`,
    `    <language>${escapeXml(work.language || 'en')}</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${rssSelfUrl}" rel="self" type="application/rss+xml" />`,
  ]

  if (cover && typeof cover === 'string' && cover.startsWith('http')) {
    xmlLines.push('    <image>')
    xmlLines.push(`      <url>${escapeXml(cover)}</url>`)
    xmlLines.push(`      <title>${escapeXml(storyTitle)}</title>`)
    xmlLines.push(`      <link>${workUrl}</link>`)
    xmlLines.push('    </image>')
  }

  for (const ch of eligibleChapters) {
    const chNum = ch.chapter_number
    const rawTitle = ch.title || (chNum ? `Chapter ${chNum}` : 'Untitled Chapter')
    const itemTitle = chNum && !rawTitle.toLowerCase().startsWith('chapter')
      ? `Chapter ${chNum}: ${rawTitle}`
      : rawTitle
    const chapterUrl = `${CANONICAL_BASE_URL}/read/${canonicalSlug}/${ch.id}`
    const pubDate = formatRfc822Date(ch.published_at || ch.created_at || work.updated_at)
    const chDesc = (ch.excerpt || `Read ${itemTitle} of ${storyTitle} by ${authorName} on HatchPen.`).slice(0, 300)

    xmlLines.push('    <item>')
    xmlLines.push(`      <title>${cdata(itemTitle)}</title>`)
    xmlLines.push(`      <link>${escapeXml(chapterUrl)}</link>`)
    xmlLines.push(`      <guid isPermaLink="true">${escapeXml(chapterUrl)}</guid>`)
    xmlLines.push(`      <pubDate>${pubDate}</pubDate>`)
    xmlLines.push(`      <author>${cdata(authorName)}</author>`)
    xmlLines.push(`      <description>${cdata(chDesc)}</description>`)
    if (cover && typeof cover === 'string' && cover.startsWith('http')) {
      xmlLines.push(
        `      <enclosure url="${escapeXml(cover)}" length="0" type="${cover.endsWith('.png') ? 'image/png' : 'image/jpeg'}" />`
      )
    }
    xmlLines.push('    </item>')
  }

  xmlLines.push('  </channel>')
  xmlLines.push('</rss>')

  return xmlLines.join('\n')
}
