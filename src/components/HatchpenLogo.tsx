import React from 'react'

interface HatchpenLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Whether to render the wordmark alongside the emblem */
  showWordmark?: boolean
  /** Optional secondary subtitle text under the wordmark */
  subtitle?: string
  /** Custom class for the wrapper */
  className?: string
  /** Whether to use the generated raster asset or dynamic currentColor vector */
  variant?: 'vector' | 'image'
}

const sizeMap = {
  xs: { icon: 'h-4 w-4', title: 'text-xs', sub: 'text-[8px]' },
  sm: { icon: 'h-6 w-6', title: 'text-sm', sub: 'text-[9px]' },
  md: { icon: 'h-8 w-8', title: 'text-base', sub: 'text-[10px]' },
  lg: { icon: 'h-10 w-10', title: 'text-lg', sub: 'text-[11px]' },
  xl: { icon: 'h-14 w-14', title: 'text-2xl', sub: 'text-xs' },
}

/**
 * Hatchpen Brand Mark & Vector Emblem
 * Combines the classic fountain pen nib with a hatching fledgling emerging from an egg.
 * Adapts to theme colors via `currentColor`.
 */
export function HatchpenEmblem({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Pen Nib Apex & Blades */}
      <path d="M50 8 L33 32 L38 44 H62 L67 32 Z" />
      
      {/* Center Slit & Breather Hole */}
      <line x1="50" y1="8" x2="50" y2="25" />
      <circle cx="50" cy="27.5" r="2.5" fill="currentColor" />
      
      {/* Pen Nib Chamfers */}
      <line x1="42" y1="44" x2="47.5" y2="29" />
      <line x1="58" y1="44" x2="52.5" y2="29" />
      <line x1="33" y1="32" x2="38" y2="44" />
      <line x1="67" y1="32" x2="62" y2="44" />

      {/* Nib Collar Band */}
      <path d="M35 48 H65" />
      <line x1="38" y1="44" x2="35" y2="48" />
      <line x1="62" y1="44" x2="65" y2="48" />
      <line x1="50" y1="44" x2="50" y2="48" />

      {/* Hatching Egg Outer Contour */}
      <path d="M35 48 C24 55 23 75 36 86 C42 91 58 91 64 86 C77 75 76 55 65 48" />

      {/* Emerging Fledgling / Story Bird */}
      <path d="M34 56.5 L28 58 L34 60.5" />
      <path d="M34 56.5 C36 53 43 51.5 48 55 C52 58 52 64 49 67" />
      <circle cx="41.5" cy="56" r="1.5" fill="currentColor" stroke="none" />
      <path d="M34 60.5 C32 66 33 76 43 83 C51 88 59 86 64 80 C68 74 67 65 63 60" />
      <path d="M48 68 C45 74 48 78 54 78 C60 78 64 74 65 68" />

      {/* Interior Architecture Lines */}
      <line x1="44" y1="48" x2="41" y2="54" />
      <line x1="56" y1="48" x2="60" y2="62" />
    </svg>
  )
}

export function HatchpenLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  className = '',
  variant = 'vector',
}: HatchpenLogoProps) {
  const conf = sizeMap[size]

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Logo Mark Container */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        {variant === 'image' ? (
          <img
            src="/hatchpen-logo.png"
            alt="Hatchpen Logo"
            className={`${conf.icon} object-contain rounded-md`}
          />
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 text-[var(--ink-primary)] shadow-xs transition-transform group-hover:scale-105">
            <HatchpenEmblem className={conf.icon} />
          </div>
        )}
      </div>

      {/* Wordmark Lockup */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className={`font-sans font-extrabold tracking-widest text-[var(--ink-primary)] uppercase ${conf.title}`}>
              HATCHPEN
            </span>
          </div>
          {subtitle !== undefined ? (
            <span className={`font-mono tracking-wider text-[var(--ink-muted)] uppercase mt-0.5 ${conf.sub}`}>
              {subtitle}
            </span>
          ) : (
            <span className={`font-serif italic tracking-tight text-[var(--ink-secondary)] mt-0.5 ${conf.sub}`}>
              Stories & Publishing
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default HatchpenLogo
