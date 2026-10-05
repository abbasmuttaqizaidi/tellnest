import React, { useState } from 'react'

export interface UnisexAvatarProps {
  src?: string | null
  alt?: string
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | number
  className?: string
  shape?: 'circle' | 'rounded'
  showStatus?: boolean
  statusColor?: string
  hasImage?: boolean
  forceUnisex?: boolean
}

/**
 * Checks if a given image URL is an auto-generated initial placeholder or default stock photo
 */
export function isDefaultOrInitialAvatar(url?: string | null): boolean {
  if (!url) return true

  // 1. Unsplash female stock photo previously used as hardcoded fallback
  if (url.includes('photo-1534528741775-53994a69daeb')) return true

  // 2. Custom uploaded image in Supabase Storage is always valid!
  if (url.includes('author-avatars') || url.includes('/storage/v1/object/public/')) return false

  // 2. Clerk auto-generated default initials avatar (img.clerk.com base64 payload)
  if (url.includes('img.clerk.com')) {
    if (url.includes('eyJ0eXBlIjoiZGVmYXVsdC')) return true
    const token = url.split('img.clerk.com/')[1]?.split('?')[0]
    if (!token) return true
    try {
      const decoded = typeof atob === 'function' ? atob(token) : ''
      if (decoded.includes('"type":"default"') || decoded.includes('"initials"')) {
        return true
      }
    } catch {
      return true
    }
  }

  // 3. Google OAuth default initials avatars
  if (url.includes('default-user') || url.includes('/a/default')) {
    return true
  }

  return false
}

const SIZE_MAP: Record<string, string> = {
  xs: 'h-5 w-5',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-20 w-20',
  '3xl': 'h-28 w-28',
}

/**
 * UnisexAvatarIcon
 * Clean, modern, editorial unisex silhouette SVG icon.
 * Seamlessly adapts to light, dark, and sepia themes using CSS currentColor.
 */
export function UnisexAvatarIcon({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="64" fill="var(--bg-subtle, #F1F5F9)" />
      {/* Neutral head silhouette */}
      <circle cx="64" cy="48" r="21" fill="var(--ink-muted, #64748B)" />
      {/* Neutral shoulders / torso arc */}
      <path
        d="M26 108 C26 86 43 78 64 78 C85 78 102 86 102 108 C102 112 99 114 94 114 L34 114 C29 114 26 112 26 108 Z"
        fill="var(--ink-muted, #64748B)"
      />
    </svg>
  )
}

/**
 * UnisexAvatar Component
 * Renders user avatar image if available, with graceful fallback to the
 * Tellnest unisex avatar icon when missing, loading, or on load failure.
 */
export function UnisexAvatar({
  src,
  alt = 'User avatar',
  name,
  size = 'md',
  className = '',
  shape = 'circle',
  showStatus = false,
  statusColor = 'bg-emerald-500',
  hasImage,
  forceUnisex = false,
}: UnisexAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClass = typeof size === 'number' ? '' : SIZE_MAP[size] || SIZE_MAP.md
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  // If user explicitly has no custom image (e.g. Clerk hasImage === false),
  // or image src is an auto-generated initial placeholder, treat as empty so unisex avatar icon shows
  const isInitialOrPlaceholder = isDefaultOrInitialAvatar(src)
  const isExplicitlyNoImage = hasImage === false || forceUnisex
  const validSrc = !imageError && src && !isInitialOrPlaceholder && !isExplicitlyNoImage ? src : null

  return (
    <div
      style={sizeStyle}
      className={`relative inline-flex items-center justify-center shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-subtle)] overflow-hidden transition-colors ${roundedClass} ${sizeClass} ${className}`}
    >
      {validSrc ? (
        <img
          src={validSrc}
          alt={alt || name || 'Avatar'}
          onError={() => setImageError(true)}
          className={`h-full w-full object-cover ${roundedClass}`}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <UnisexAvatarIcon className="h-full w-full" />
      )}

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-surface)] ${statusColor}`}
        />
      )}
    </div>
  )
}

export default UnisexAvatar
