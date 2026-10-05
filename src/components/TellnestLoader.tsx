import React from 'react'
import { HatchpenEmblem } from './HatchpenLogo'

interface TellnestLoaderProps {
  /**
   * Layout presentation:
   * - 'fullscreen': Covers viewport with backdrop-blur (ideal for Clerk auth transitions)
   * - 'page': Centered within page flow (min-h-[60vh])
   * - 'inline': Compact inline element for cards / buttons
   */
  variant?: 'fullscreen' | 'page' | 'inline'
  /**
   * Optional contextual message displayed under the monogram
   */
  message?: string
  /**
   * Optional secondary micro-copy
   */
  submessage?: string
  className?: string
}

export function TellnestLoader({
  variant = 'page',
  message = 'Synchronizing literary folio...',
  submessage = 'Hatchpen Publishing Network',
  className = '',
}: TellnestLoaderProps) {
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2.5 text-xs text-[var(--ink-muted)] font-mono ${className}`}>
        <div className="relative h-4 w-4">
          <div className="absolute inset-0 rounded-full border border-[var(--border-strong)]" />
          <div className="absolute inset-0 rounded-full border-t-2 border-[var(--ink-primary)] animate-spin" />
        </div>
        <span>{message}</span>
      </div>
    )
  }

  const containerClasses =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-[var(--bg-canvas)] transition-colors'
      : 'min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-6 transition-colors'

  return (
    <div className={`${containerClasses} ${className}`} role="status" aria-live="polite">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center space-y-6">
        
        {/* Emblem Lockup with Dual Spinning Rings & Breathing Core */}
        <div className="relative flex items-center justify-center">
          {/* Outer gentle rotating dashed accent */}
          <div
            className="absolute h-20 w-20 rounded-full border border-dashed border-[var(--border-strong)] animate-[spin_12s_linear_infinite]"
            aria-hidden="true"
          />

          {/* Active rotating orbital line */}
          <div
            className="absolute h-16 w-16 rounded-full border border-transparent border-t-[var(--ink-primary)] animate-[spin_1.5s_cubic-bezier(0.4,0,0.2,1)_infinite]"
            aria-hidden="true"
          />

          {/* Center Monogram Tile */}
          <div className="relative h-12 w-12 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs flex items-center justify-center text-[var(--ink-primary)] overflow-hidden">
            <HatchpenEmblem className="h-8 w-8" />
          </div>
        </div>

        {/* Brand & Editorial Status Messaging */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--ink-muted)] font-semibold">
              HATCHPEN
            </span>
            <span className="text-[var(--ink-faint)] font-mono text-[10px]">•</span>
            <span className="font-serif italic text-xs text-[var(--ink-muted)]">
              Folio
            </span>
          </div>

          <h3 className="font-serif text-base sm:text-lg font-medium tracking-tight text-[var(--ink-primary)]">
            {message}
          </h3>

          {submessage && (
            <p className="font-mono text-[11px] text-[var(--ink-faint)]">
              {submessage}
            </p>
          )}
        </div>

        {/* Sleek Literary Indeterminate Progress Indicator */}
        <div className="w-44 h-[2px] rounded-full bg-[var(--bg-subtle)] overflow-hidden relative border border-[var(--border-subtle)]">
          <div className="tellnest-shimmer-bar absolute inset-0 bg-[var(--ink-primary)]" />
        </div>

      </div>
    </div>
  )
}

export default TellnestLoader
