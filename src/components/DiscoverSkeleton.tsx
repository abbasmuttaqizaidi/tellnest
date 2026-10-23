import React from 'react'

/**
 * HatchPen — Discover Grid Skeleton
 * Matches WorkCard portrait 3/4 layout pixel-for-pixel to ensure 0ms CLS during discovery catalog loading.
 */
export function DiscoverGridSkeleton({ count = 14 }: { count?: number }) {
  return (
    <div
      data-testid="discover-skeleton-grid"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 animate-pulse"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
        >
          <div>
            {/* Cover image placeholder matching aspect-[3/4] */}
            <div className="aspect-[3/4] w-full rounded-lg bg-[var(--bg-subtle)]" />

            {/* Meta Header placeholder (Category + Rating) */}
            <div className="mt-3 flex items-center justify-between">
              <div className="h-2.5 w-16 bg-[var(--bg-subtle)] rounded" />
              <div className="h-2.5 w-8 bg-[var(--bg-subtle)] rounded" />
            </div>

            {/* Title placeholder */}
            <div className="mt-2 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-[var(--bg-subtle)] rounded" />
              <div className="h-3 w-1/2 bg-[var(--bg-subtle)]/70 rounded" />
            </div>

            {/* Author placeholder */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-[var(--bg-subtle)] shrink-0" />
              <div className="h-2.5 w-20 bg-[var(--bg-subtle)] rounded" />
            </div>
          </div>

          {/* Footer stats placeholder (Chapters + Reads) */}
          <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="h-2.5 w-14 bg-[var(--bg-subtle)] rounded" />
            <div className="h-2.5 w-12 bg-[var(--bg-subtle)] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
