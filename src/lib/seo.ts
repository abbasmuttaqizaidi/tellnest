/**
 * Hatchpen SEO Utility
 * Generates unified metadata, OpenGraph tags, Twitter cards, and JSON-LD structured data
 * for TanStack Router routes.
 */

export const SITE_NAME = 'Hatchpen'
export const DEFAULT_SITE_URL = 'https://hatchpen.com'
export const DEFAULT_TITLE = 'Hatchpen — Writings. Beyond the Hype.'
export const DEFAULT_DESCRIPTION =
  'Hatchpen is a digital literary publishing and reader platform for serialized fiction, long-form literature, essays, and poetry.'
export const DEFAULT_OG_IMAGE = '/og-image.png'

/**
 * Resolves a URL or relative path to a fully qualified absolute URL with the canonical site origin.
 */
export function resolveAbsoluteUrl(urlOrPath?: string | null): string {
  if (!urlOrPath || !urlOrPath.trim()) return `${DEFAULT_SITE_URL}/og-image.png`
  const trimmed = urlOrPath.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  return `${DEFAULT_SITE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

export interface SeoOptions {
  title?: string
  description?: string
  canonicalUrl?: string
  keywords?: string[]
  ogType?: 'website' | 'article' | 'book' | 'profile'
  ogImage?: string
  ogImageAlt?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  noindex?: boolean
  jsonLd?: Record<string, any> | Record<string, any>[]
}

export function generateMeta(options: SeoOptions = {}) {
  const title = options.title ? `${options.title} — ${SITE_NAME}` : DEFAULT_TITLE
  const description = options.description || DEFAULT_DESCRIPTION
  const rawOgImage = options.ogImage || DEFAULT_OG_IMAGE
  const ogImage = resolveAbsoluteUrl(rawOgImage)
  const ogType = options.ogType || 'website'
  const canonicalUrl = options.canonicalUrl ? resolveAbsoluteUrl(options.canonicalUrl) : undefined

  const meta: Array<{
    title?: string
    name?: string
    property?: string
    content?: string
    charSet?: string
  }> = [
    { title },
    { name: 'description', content: description },
    {
      name: 'robots',
      content: options.noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
    // Open Graph
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: ogType },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:alt', content: options.ogImageAlt || title },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: ogImage },
  ]

  if (canonicalUrl) {
    meta.push({ property: 'og:url', content: canonicalUrl })
  }

  if (options.keywords && options.keywords.length > 0) {
    meta.push({ name: 'keywords', content: options.keywords.join(', ') })
  }

  if (options.author) {
    meta.push({ name: 'author', content: options.author })
    if (ogType === 'article' || ogType === 'book') {
      meta.push({ property: 'book:author', content: options.author })
    }
  }

  if (options.publishedTime) {
    meta.push({ property: 'article:published_time', content: options.publishedTime })
  }

  if (options.modifiedTime) {
    meta.push({ property: 'article:modified_time', content: options.modifiedTime })
  }

  const links: Array<{ rel: string; href: string }> = []
  if (canonicalUrl) {
    links.push({ rel: 'canonical', href: canonicalUrl })
  }

  const scripts: Array<{ type: string; children: string }> = []
  if (options.jsonLd) {
    scripts.push({
      type: 'application/ld+json',
      children: JSON.stringify(options.jsonLd),
    })
  }

  return { meta, links, scripts }
}
