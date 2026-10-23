import React from 'react'

interface AudienceFootprintsProps {
  totalReads: number
  totalSaves: number
  publishedWorksCount: number
  activeDraftsCount: number
}

export const AudienceFootprints: React.FC<AudienceFootprintsProps> = ({
  totalReads,
  totalSaves,
  publishedWorksCount,
  activeDraftsCount,
}) => {
  const formattedReads =
    totalReads >= 1000000
      ? `${(totalReads / 1000000).toFixed(1)}M`
      : totalReads >= 1000
      ? `${(totalReads / 1000).toFixed(1)}K`
      : String(totalReads)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* Metric 1: Pages Turned (Reads) */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          Pages Turned
        </span>
        <p className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)] mt-0.5">
          {formattedReads}
        </p>
        <span className="block font-mono text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
          Audience read-throughs
        </span>
      </div>

      {/* Metric 2: Shelves Inhabited (Saves) */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          Shelves Inhabited
        </span>
        <p className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)] mt-0.5">
          {totalSaves.toLocaleString()}
        </p>
        <span className="block font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
          Saved to libraries
        </span>
      </div>

      {/* Metric 3: Circulating Volumes */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          Live Serials
        </span>
        <p className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)] mt-0.5">
          {publishedWorksCount}
        </p>
        <span className="block font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
          Published folios
        </span>
      </div>

      {/* Metric 4: Works in Ink */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2.5 shadow-2xs hover:border-[var(--border-strong)] transition-colors">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          Works in Ink
        </span>
        <p className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)] mt-0.5">
          {activeDraftsCount}
        </p>
        <span className="block font-mono text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
          Private drafts
        </span>
      </div>
    </div>
  )
}
