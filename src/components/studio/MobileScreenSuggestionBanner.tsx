import React, { useState, useEffect } from 'react'
import { Monitor, X } from 'lucide-react'

export interface MobileScreenSuggestionBannerProps {
  storageKey?: string
  className?: string
  title?: string
  message?: string
}

export function MobileScreenSuggestionBanner({
  storageKey = 'hatchpen_dismiss_desktop_suggestion',
  className = '',
  title = 'Best Experienced on Desktop',
  message = 'Manuscript drafting, cover binding, and literary typesetting are optimized for larger displays. For the best studio workflow, we recommend opening HatchPen on a desktop or laptop.',
}: MobileScreenSuggestionBannerProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(storageKey) === 'true'
      setDismissed(isDismissed)
    } catch {
      setDismissed(false)
    }
  }, [storageKey])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(storageKey, 'true')
    } catch {}
  }

  if (dismissed) return null

  return (
    <div
      className={`lg:hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:p-4 shadow-2xs transition-all ${className}`}
      role="region"
      aria-label="Screen size recommendation"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--ink-secondary)] shrink-0 mt-0.5">
          <Monitor className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 pr-1">
          <p className="font-serif font-semibold text-xs text-[var(--ink-primary)]">
            {title}
          </p>
          <p className="font-serif text-[11px] sm:text-xs text-[var(--ink-muted)] leading-relaxed mt-0.5">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-[var(--ink-faint)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          aria-label="Dismiss recommendation"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
