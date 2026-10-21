import React from 'react'

export interface HatchpenLoaderProps {
  /**
   * Layout presentation:
   * - 'fullscreen': Covers viewport with subtle backdrop (ideal for auth transitions)
   * - 'page': Centered within page flow (min-h-[50vh])
   * - 'inline': Compact inline element for cards / buttons
   */
  variant?: 'fullscreen' | 'page' | 'inline'
  /**
   * Optional contextual message
   */
  message?: string
  /**
   * Optional secondary micro-copy
   */
  submessage?: string
  className?: string
}

export type TellnestLoaderProps = HatchpenLoaderProps

export function HatchpenLoader({
  variant = 'page',
  message,
  submessage,
  className = '',
}: HatchpenLoaderProps) {
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-sans ${className}`}>
        <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 animate-spin" />
        {message && <span>{message}</span>}
      </div>
    )
  }

  const containerClasses =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-[2147483647] flex flex-col items-center justify-center bg-white/90 dark:bg-[#0B0C0E]/90 backdrop-blur-xs transition-colors'
      : 'min-h-[50vh] flex flex-col items-center justify-center p-6 transition-colors'

  return (
    <div className={`${containerClasses} ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center gap-2.5">
        {/* Sleek, minimal spinner */}
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-neutral-200 dark:border-neutral-800 border-t-neutral-900 dark:border-t-neutral-100 animate-spin" />
        </div>

        {/* Clean, quiet status message */}
        {message && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-sans tracking-wide">
            {message}
          </p>
        )}

        {submessage && (
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 font-sans">
            {submessage}
          </p>
        )}
      </div>
    </div>
  )
}

export const TellnestLoader = HatchpenLoader
export default HatchpenLoader
