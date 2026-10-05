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
}: UnisexAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClass = typeof size === 'number' ? '' : SIZE_MAP[size] || SIZE_MAP.md
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  // If image src is Unsplash female fallback, treat as empty so unisex avatar icon shows
  const isDefaultUnsplash = src?.includes('photo-1534528741775-53994a69daeb')
  const validSrc = !imageError && src && !isDefaultUnsplash ? src : null

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
