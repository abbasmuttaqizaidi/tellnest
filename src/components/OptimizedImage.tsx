import React, { useState } from 'react'
import { getOptimizedImageUrl, generateImageSrcSet } from '../lib/image'

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  aspectRatio?: '2/3' | '3/4' | '1/1' | '16/9' | string
  priority?: boolean
  sizes?: string
  fallbackSrc?: string
  showPlaceholder?: boolean
  containerClassName?: string
}

/**
 * OptimizedImage Component
 * Features:
 * - Dynamic CDN optimization (WebP/AVIF auto-negotiation, size clamping, quality compression)
 * - Viewport-aware responsive `srcset`
 * - Skeleton / subtle pulse placeholder while loading to eliminate Layout Shift (CLS)
 * - Graceful fallback on broken or inaccessible URLs
 * - Modern native `fetchPriority` and `decoding="async"`
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  priority = false,
  sizes,
  fallbackSrc,
  showPlaceholder = true,
  className = '',
  containerClassName = '',
  style,
  onLoad,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const activeSrc = hasError && fallbackSrc ? fallbackSrc : src

  // Optimized base URL
  const optimizedSrc = getOptimizedImageUrl(activeSrc, {
    width,
    height,
    quality,
  })

  // Responsive srcset
  const srcSet = sizes && !hasError ? generateImageSrcSet(activeSrc, [320, 480, 640, 800, 1080], { quality }) : undefined

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <img
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={(e) => {
          setIsLoaded(true)
          onLoad?.(e)
        }}
        onError={(e) => {
          setHasError(true)
          onError?.(e)
        }}
        className={className}
        style={style}
        {...rest}
      />
    </div>
  )
}
