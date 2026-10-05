import React from 'react'

export interface HatchpenLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Presentation variant:
   * - 'full': The official horizontal wordmark with rules and boxed PEN ("HATCHPEN STORIES. BEYOND THE HYPE.")
   * - 'icon': The official HP monogram insignia with embedded fountain pen nib
   * - 'lockup': Combined HP emblem + clean typography
   */
  variant?: 'full' | 'icon' | 'lockup'
  /** Whether to render the tagline/subtitle */
  showTagline?: boolean
  /** Optional custom subtitle (used in 'lockup' variant) */
  subtitle?: string
  /** Custom class for the wrapper */
  className?: string
}

const sizeConfig = {
  xs: {
    icon: 'h-5 w-5',
    fullHeight: 'h-5',
    title: 'text-xs',
    sub: 'text-[8px]',
  },
  sm: {
    icon: 'h-7 w-7',
    fullHeight: 'h-6 sm:h-7',
    title: 'text-sm',
    sub: 'text-[9px]',
  },
  md: {
    icon: 'h-8 w-8',
    fullHeight: 'h-8',
    title: 'text-base',
    sub: 'text-[10px]',
  },
  lg: {
    icon: 'h-10 w-10',
    fullHeight: 'h-10',
    title: 'text-lg',
    sub: 'text-[11px]',
  },
  xl: {
    icon: 'h-14 w-14',
    fullHeight: 'h-14',
    title: 'text-2xl',
    sub: 'text-xs',
  },
}

/**
 * Official HP Monogram Insignia
 * Features the interlocking H and P with horizontal fountain pen nib.
 */
export function HatchpenEmblem({
  className = 'h-7 w-7',
  rounded = true,
}: {
  className?: string
  rounded?: boolean
}) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none ${
        rounded ? 'rounded-lg' : ''
      } ${className}`}
    >
      <img
        src="/hatchpen-app-icon.png"
        alt="Hatchpen Insignia"
        className="h-full w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}

/**
 * Hatchpen Official Wordmark & Logo Component
 * Directly renders the official brand identity from the logo assets.
 */
export function HatchpenLogo({
  size = 'md',
  variant = 'full',
  showTagline = true,
  subtitle,
  className = '',
}: HatchpenLogoProps) {
  const conf = sizeConfig[size]

  if (variant === 'icon') {
    return <HatchpenEmblem className={`${conf.icon} ${className}`} />
  }

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/hatchpen-logo-transparent.png"
          alt="Hatchpen — Stories. Beyond the Hype."
          className={`${conf.fullHeight} w-auto object-contain dark:invert transition-all`}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  // Lockup variant: Emblem + Typography Lockup
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <HatchpenEmblem className={conf.icon} />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1">
          <span className="font-sans font-extrabold tracking-widest text-[var(--ink-primary)] uppercase text-sm sm:text-base">
            HATCH
          </span>
          <span className="bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-1.5 py-0.5 rounded text-xs sm:text-sm font-bold tracking-wider">
            PEN
          </span>
        </div>
        {subtitle !== undefined ? (
          <span className="font-mono text-[9px] text-[var(--ink-muted)] tracking-wider uppercase mt-0.5">
            {subtitle}
          </span>
        ) : showTagline ? (
          <span className="font-sans text-[8px] text-[var(--ink-muted)] tracking-widest uppercase mt-0.5 font-semibold">
            Stories. Beyond the Hype.
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default HatchpenLogo
