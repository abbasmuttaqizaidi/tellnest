import React from 'react'

export interface HatchpenLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Presentation variant:
   * - 'full': The official mark with book+quill, HATCH pen wordmark, and "WRITINGS. BEYOND THE HYPE."
   * - 'compact': The book+quill mark with HATCH pen wordmark (no tagline, ideal for navigation bars)
   * - 'inverted': White ink version of the full logo
   * - 'icon': The official Book + Quill emblem
   * - 'lockup': Combined Book + Quill emblem + styled HTML typography
   */
  variant?: 'full' | 'compact' | 'inverted' | 'icon' | 'lockup'
  /** Force inverted colors */
  invert?: boolean
  /** Whether to render the tagline/subtitle */
  showTagline?: boolean
  /** Optional custom subtitle (used in 'lockup' variant) */
  subtitle?: string
  /** Custom class for the wrapper */
  className?: string
  /** Force specific color theme regardless of dark mode */
  forceTheme?: 'light' | 'dark'
}

const sizeConfig = {
  xs: {
    icon: 'h-6 w-6',
    fullHeight: 'h-6 sm:h-7',
    title: 'text-xs',
    sub: 'text-[8px]',
  },
  sm: {
    icon: 'h-8 w-8',
    fullHeight: 'h-8 sm:h-9',
    title: 'text-sm',
    sub: 'text-[9px]',
  },
  md: {
    icon: 'h-10 w-10',
    fullHeight: 'h-10 sm:h-11',
    title: 'text-base',
    sub: 'text-[10px]',
  },
  lg: {
    icon: 'h-12 w-12',
    fullHeight: 'h-12 sm:h-14',
    title: 'text-lg',
    sub: 'text-[11px]',
  },
  xl: {
    icon: 'h-16 w-16',
    fullHeight: 'h-16 sm:h-20',
    title: 'text-2xl',
    sub: 'text-xs',
  },
}

/**
 * Official Hatchpen Insignia Emblem
 * Features the official Hatchpen Pen Nib Insignia from the logo kit.
 */
export function HatchpenEmblem({
  className = 'h-8 w-8',
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
        src="/favicon.svg"
        alt="Hatchpen Insignia"
        className="h-full w-full object-contain hatchpen-brand-logo transition-all"
        loading="eager"
        decoding="async"
      />
    </div>
  )
}

/**
 * Hatchpen Official Wordmark & Logo Component
 * Directly renders the official brand identity from the logo assets with theme responsiveness.
 */
export function HatchpenLogo({
  size = 'md',
  variant = 'full',
  invert = false,
  showTagline = true,
  subtitle,
  className = '',
  forceTheme,
}: HatchpenLogoProps) {
  const conf = sizeConfig[size]

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${conf.icon} ${className}`}>
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-icon.svg"
          alt="Hatchpen"
          className="h-full w-full object-contain dark:hidden transition-all"
          loading="eager"
          decoding="async"
        />
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-icon-reversed.svg"
          alt="Hatchpen"
          className="h-full w-full object-contain hidden dark:inline transition-all"
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  if (variant === 'inverted' || invert || forceTheme === 'dark') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-white.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo hatchpen-brand-logo--inverted ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  if (forceTheme === 'light') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-black.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        {/* Responsive theme switcher using dark: hidden and dark: inline */}
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-black.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo dark:hidden ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-white.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo hatchpen-brand-logo--inverted hidden dark:inline ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  if (variant === 'full') {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-black.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo dark:hidden ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
        <img
          src="/hatchpen-logo-kit/svg/hatchpen-logo-white.svg"
          alt="Hatchpen"
          className={`hatchpen-brand-logo hatchpen-brand-logo--inverted hidden dark:inline ${conf.fullHeight} w-auto object-contain transition-all`}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

  // Lockup variant: Official Emblem + Styled Typography Lockup
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <HatchpenEmblem className={conf.icon} />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1">
          <span className="font-sans font-light tracking-widest text-[var(--ink-primary)] uppercase text-sm sm:text-base">
            HATCH
          </span>
          <span className="font-sans font-medium tracking-tight text-[var(--ink-primary)] lowercase text-base sm:text-lg">
            pen
          </span>
        </div>
        {subtitle !== undefined ? (
          <span className="font-mono text-[9px] text-[var(--ink-muted)] tracking-wider uppercase mt-0.5">
            {subtitle}
          </span>
        ) : showTagline ? (
          <span className="font-sans text-[8px] text-[var(--ink-muted)] tracking-widest uppercase mt-0.5 font-semibold">
            Writings. Beyond the Hype.
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default HatchpenLogo

