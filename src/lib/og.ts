/**
 * HatchPen Dynamic Social OpenGraph Card Utility
 * Generates high-fidelity 1200x630 (1.91:1) OpenGraph cards for WhatsApp,
 * Twitter/X (summary_large_image), Facebook, LinkedIn, Discord, and iMessage.
 */

import { DEFAULT_SITE_URL } from './seo.ts'

export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630
export const DEFAULT_OG_IMAGE_URL = `${DEFAULT_SITE_URL}/og-image.png`
const CLOUD_NAME = 'pxluxw9a'

export interface SocialCardOptions {
  title?: string
  author?: string
  genre?: string
  category?: string
  coverUrl?: string
  type?: 'story' | 'chapter' | 'general'
}

/**
 * Escapes special characters for XML/SVG rendering
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Transforms an image URL to a 1200x630 social card.
 * Uses Cloudinary c_pad with brand background #0B0C0E so portrait book covers
 * are never cropped or stretched, centered against the dark background.
 */
export function getSocialCardUrl(options: SocialCardOptions = {}): string {
  const { coverUrl } = options

  if (!coverUrl || !coverUrl.trim()) {
    return DEFAULT_OG_IMAGE_URL
  }

  const trimmed = coverUrl.trim()

  // If it's already an optimized 1200x630 Cloudinary transformation, keep it
  if (trimmed.includes('w_1200') && trimmed.includes('h_630')) {
    return trimmed
  }

  // 1. Cloudinary upload URL
  if (trimmed.includes('cloudinary.com') && trimmed.includes('/upload/')) {
    // Insert the 1200x630 pad transformation after /upload/
    const transformation = 'w_1200,h_630,c_pad,b_rgb:0B0C0E,f_auto,q_auto'
    return trimmed.replace('/upload/', `/upload/${transformation}/`)
  }

  // 2. External public HTTP/HTTPS URL (Unsplash, Supabase storage, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const encodedTarget = encodeURI(trimmed)
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/w_1200,h_630,c_pad,b_rgb:0B0C0E,f_auto,q_auto/${encodedTarget}`
  }

  // 3. Relative local path fallback
  if (trimmed.startsWith('/')) {
    return `${DEFAULT_SITE_URL}${trimmed}`
  }

  return DEFAULT_OG_IMAGE_URL
}

/**
 * Generates a 1200x630 social card URL for a story/work.
 */
export function getStorySocialCardUrl(work?: {
  title?: string
  author?: { name?: string } | string | null
  genre?: string | null
  category?: string | null
  cover?: string | null
  cover_image_path?: string | null
} | null): string {
  if (!work) return DEFAULT_OG_IMAGE_URL

  const authorName =
    typeof work.author === 'string'
      ? work.author
      : work.author?.name || 'HatchPen Author'

  const coverUrl = work.cover || work.cover_image_path || undefined

  return getSocialCardUrl({
    title: work.title,
    author: authorName,
    genre: work.genre || undefined,
    category: work.category || undefined,
    coverUrl,
    type: 'story',
  })
}

/**
 * Generates a 1200x630 social card URL for a chapter reader page.
 */
export function getChapterSocialCardUrl(
  chapter?: { title?: string } | null,
  work?: {
    title?: string
    author?: { name?: string } | string | null
    cover?: string | null
    cover_image_path?: string | null
  } | null
): string {
  if (!work) return DEFAULT_OG_IMAGE_URL

  const authorName =
    typeof work.author === 'string'
      ? work.author
      : work.author?.name || 'HatchPen Author'

  const coverUrl = work.cover || work.cover_image_path || undefined

  return getSocialCardUrl({
    title: chapter?.title ? `${chapter.title} — ${work.title || ''}` : work.title,
    author: authorName,
    coverUrl,
    type: 'chapter',
  })
}

/**
 * Generates a 1200x630 social card URL for an author profile.
 */
export function getAuthorSocialCardUrl(author?: {
  name?: string | null
  handle?: string | null
  avatar?: string | null
  bio?: string | null
} | null): string {
  if (!author) return DEFAULT_OG_IMAGE_URL

  const authorName = author.name || author.handle || 'HatchPen Author'

  return getSocialCardUrl({
    title: `${authorName} — Author on HatchPen`,
    author: authorName,
    coverUrl: author.avatar || undefined,
    type: 'general',
  })
}

/**
 * Generates a stand-alone 1200x630 SVG Open Graph Card markup with HatchPen editorial branding.
 */
export function generateOgSvgCard(options: {
  title?: string
  author?: string
  genre?: string
  category?: string
  cover?: string
}): string {
  const title = options.title?.trim() || 'HatchPen Story'
  const author = options.author?.trim() || 'HatchPen Author'
  const badge = [options.category, options.genre].filter(Boolean).join(' • ') || 'ORIGINAL FICTION'

  // Truncate title gracefully for card typography
  const safeTitle = escapeXml(title.length > 55 ? title.slice(0, 52) + '...' : title)
  const safeAuthor = escapeXml(author)
  const safeBadge = escapeXml(badge.toUpperCase())

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#0B0C0E" />

  <!-- Ambient Glow Effects -->
  <circle cx="1100" cy="100" r="320" fill="#F59E0B" fill-opacity="0.08" filter="blur(140px)" />
  <circle cx="100" cy="550" r="280" fill="#3B82F6" fill-opacity="0.06" filter="blur(140px)" />

  <!-- Subtle Border Card Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="20" stroke="#1F242F" stroke-width="2" />

  <!-- Top Brand Navigation / Watermark -->
  <g transform="translate(70, 70)">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800" letter-spacing="0.05em" fill="#F3F4F6">
      HATCHPEN
    </text>
    <text x="160" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400" letter-spacing="0.02em" fill="#9CA3AF">
      •  Writings. Beyond the hype.
    </text>
  </g>

  <!-- Left Content Column -->
  <g transform="translate(70, 180)">
    <!-- Badge Pill -->
    <rect width="${Math.min(320, safeBadge.length * 10 + 28)}" height="34" rx="17" fill="#181B22" stroke="#2D333F" stroke-width="1.5" />
    <text x="14" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.1em" fill="#F59E0B">
      ${safeBadge}
    </text>

    <!-- Title -->
    <text y="90" font-family="'Georgia', 'Playfair Display', serif" font-size="52" font-weight="700" fill="#FFFFFF" letter-spacing="-0.02em">
      ${safeTitle}
    </text>

    <!-- Author Byline -->
    <text y="150" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500" fill="#D1D5DB">
      by <tspan font-weight="700" fill="#FFFFFF">${safeAuthor}</tspan>
    </text>
  </g>

  <!-- Bottom CTA Footer -->
  <g transform="translate(70, 520)">
    <rect width="240" height="42" rx="21" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-width="1.5" />
    <text x="24" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" letter-spacing="0.02em" fill="#FBBF24">
      Read on hatchpen.com →
    </text>
    <text x="270" y="26" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="400" fill="#6B7280">
      Original serialized manuscripts &amp; essays
    </text>
  </g>

  <!-- Right Decorative Cover Frame -->
  <g transform="translate(840, 120)">
    <!-- Shadow -->
    <rect x="15" y="15" width="260" height="390" rx="12" fill="#000000" fill-opacity="0.5" />
    <!-- Book Cover Silhouette -->
    <rect width="260" height="390" rx="12" fill="#181B22" stroke="#2D333F" stroke-width="2" />
    <!-- Spine Accent -->
    <rect width="18" height="390" rx="4" fill="#242B38" />
    <line x1="18" y1="0" x2="18" y2="390" stroke="#374151" stroke-width="1.5" />
    <text x="139" y="195" font-family="'Georgia', serif" font-size="20" font-weight="700" fill="#9CA3AF" text-anchor="middle">
      HatchPen
    </text>
  </g>
</svg>`
}
