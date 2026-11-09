import React from 'react'

/**
 * Pixel-accurate skeleton for HatchPen Story Details (/works/$workId).
 * Rendered immediately by TanStack Router (0ms pendingComponent) so story clicks
 * feel instant and never appear frozen or unresponsive.
 */
export function WorkDetailsSkeleton() {
  return (
    <div
      data-testid="work-details-skeleton"
      className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse"
      role="status"
      aria-label="Loading story details..."
    >
      {/* Main Work Header Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[var(--border-subtle)]">
        {/* Cover Column Skeleton */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center sm:items-start">
          <div className="aspect-[512/763] w-full max-w-[280px] sm:max-w-[320px] rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] shadow-md" />
          {/* Primary Action Button Skeleton */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] h-12 mt-4 rounded-xl bg-[var(--bg-subtle)]" />
          {/* Secondary Buttons Skeleton */}
          <div className="w-full max-w-[280px] sm:max-w-[320px] grid grid-cols-2 gap-2 mt-2">
            <div className="h-10 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-10 rounded-lg bg-[var(--bg-subtle)]" />
          </div>
        </div>

        {/* Info Column Skeleton */}
        <div className="md:col-span-8 lg:col-span-8 space-y-6">
          {/* Breadcrumbs / Genre pills */}
          <div className="flex items-center gap-2">
            <div className="h-5 w-20 rounded-md bg-[var(--bg-subtle)]" />
            <div className="h-5 w-24 rounded-md bg-[var(--bg-subtle)]" />
            <div className="h-5 w-16 rounded-md bg-[var(--bg-subtle)]" />
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <div className="h-9 sm:h-11 w-4/5 rounded-lg bg-[var(--bg-subtle)]" />
            <div className="h-4 w-2/5 rounded bg-[var(--bg-subtle)]" />
          </div>

          {/* Author Byline */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-10 w-10 rounded-full bg-[var(--bg-subtle)] shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-[var(--bg-subtle)]" />
              <div className="h-2.5 w-20 rounded bg-[var(--bg-subtle)]" />
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-[var(--border-subtle)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--bg-subtle)]/60 space-y-2">
                <div className="h-2.5 w-12 rounded bg-[var(--bg-subtle)]" />
                <div className="h-5 w-16 rounded bg-[var(--bg-subtle)]" />
              </div>
            ))}
          </div>

          {/* Synopsis Paragraphs */}
          <div className="space-y-2.5 pt-2">
            <div className="h-3 w-full rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-full rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-4/5 rounded bg-[var(--bg-subtle)]" />
            <div className="h-3 w-3/5 rounded bg-[var(--bg-subtle)]" />
          </div>
        </div>
      </div>

      {/* Chapters / Table of Contents Section Skeleton */}
      <div className="py-12 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div className="h-6 w-44 rounded bg-[var(--bg-subtle)]" />
          <div className="h-8 w-32 rounded-lg bg-[var(--bg-subtle)]" />
        </div>

        <div className="space-y-2.5 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 flex items-center justify-between"
            >
              <div className="space-y-1.5 w-1/2">
                <div className="h-3.5 w-3/4 rounded bg-[var(--bg-subtle)]" />
                <div className="h-2.5 w-1/3 rounded bg-[var(--bg-subtle)]" />
              </div>
              <div className="h-3 w-16 rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WorkDetailsSkeleton
