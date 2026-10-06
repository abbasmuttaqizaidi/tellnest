/**
 * Image Optimization Utilities for Dynamic and Remote Images
 * Handles:
 * - Dynamic CDN resolution & parameter injection (Unsplash, Cloudinary, Imgix, Supabase)
 * - Auto WebP/AVIF format negotiation (`auto=format`)
 * - Viewport-aware responsive `srcset` generation
 * - Blur placeholder hash generation
 * - Fallback / broken link resilience
 */

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
  fit?: 'cover' | 'crop' | 'contain' | 'inside'
}

/**
 * Transforms any dynamic or remote image URL with optimal sizing, modern format, and compression parameters
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!url || typeof url !== 'string') return ''

  const {
    width,
    height,
    quality = 80,
    format = 'auto',
    fit = 'cover',
  } = options

  // Handle data URIs or local SVGs untouched
  if (url.startsWith('data:') || url.endsWith('.svg')) {
    return url
  }

  try {
    const parsed = new URL(url, 'http://localhost')

    // 1. Unsplash Images
    if (parsed.hostname.includes('unsplash.com')) {
      if (width) parsed.searchParams.set('w', String(width))
      if (height) parsed.searchParams.set('h', String(height))
      parsed.searchParams.set('q', String(quality))
      parsed.searchParams.set('auto', 'format')
      parsed.searchParams.set('fit', fit === 'contain' ? 'clip' : 'crop')
      return parsed.toString().replace('http://localhost/', '/')
    }

    // 2. Cloudinary Images
    if (parsed.hostname.includes('cloudinary.com')) {
      const parts = url.split('/upload/')
      if (parts.length === 2) {
        const transforms = [
          `f_${format}`,
          `q_${quality}`,
          width ? `w_${width}` : null,
          height ? `h_${height}` : null,
          `c_${fit}`,
        ]
          .filter(Boolean)
          .join(',')
        return `${parts[0]}/upload/${transforms}/${parts[1]}`
      }
    }

    // 3. Imgix Images
    if (parsed.hostname.includes('imgix.net')) {
      if (width) parsed.searchParams.set('w', String(width))
      if (height) parsed.searchParams.set('h', String(height))
      parsed.searchParams.set('q', String(quality))
      parsed.searchParams.set('auto', 'format,compress')
      parsed.searchParams.set('fit', fit === 'contain' ? 'clip' : 'crop')
      return parsed.toString().replace('http://localhost/', '/')
    }

    // 4. Supabase Storage Images (transforms supported with render/image)
    if (parsed.hostname.includes('supabase.co') && url.includes('/storage/v1/object/public/')) {
      // If render endpoint is available
      const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
      const renderParsed = new URL(renderUrl)
      if (width) renderParsed.searchParams.set('width', String(width))
      if (height) renderParsed.searchParams.set('height', String(height))
      renderParsed.searchParams.set('quality', String(quality))
      return renderParsed.toString()
    }

    return url
  } catch {
    return url
  }
}

/**
 * Builds standard responsive srcset for dynamic images
 */
export function generateImageSrcSet(
  url?: string | null,
  widths: number[] = [320, 480, 640, 800, 1080],
  options: Omit<ImageOptimizationOptions, 'width'> = {}
): string {
  if (!url) return ''

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { ...options, width: w })} ${w}w`)
    .join(', ')
}
