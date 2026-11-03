import React from 'react'

/**
 * Pixel-accurate skeleton for HatchPen Chapter Reader (/read/$workId/$chapterId).
 * Rendered immediately by TanStack Router (0ms pendingComponent) so entering the reader
 * feels instant and responsive.
 */
export function ReaderSkeleton() {
  return (
    <div
      data-testid="reader-skeleton"
      className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] animate-pulse"
      role="status"
      aria-label="Opening chapter..."
    >
      {/* Top Header Placeholder */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-md px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded bg-[var(--bg-subtle)]" />
          <div className="h-3.5 w-36 rounded bg-[var(--bg-subtle)]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)]" />
          <div className="h-8 w-8 rounded-full bg-[var(--bg-subtle)]" />
        </div>
      </header>

      {/* Reader Prose Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        {/* Chapter Title Skeleton */}
        <div className="space-y-3 text-center sm:text-left pb-6 border-b border-[var(--border-subtle)]">
          <div className="h-3 w-24 mx-auto sm:mx-0 rounded bg-[var(--bg-subtle)]" />
          <div className="h-8 sm:h-10 w-3/4 mx-auto sm:mx-0 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-3.5 w-1/3 mx-auto sm:mx-0 rounded bg-[var(--bg-subtle)]" />
        </div>

        {/* Prose Paragraphs */}
        <div className="space-y-6 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-full rounded bg-[var(--bg-subtle)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-subtle)]" />
              <div className="h-4 w-[92%] rounded bg-[var(--bg-subtle)]" />
              <div className="h-4 w-[85%] rounded bg-[var(--bg-subtle)]" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default ReaderSkeleton
