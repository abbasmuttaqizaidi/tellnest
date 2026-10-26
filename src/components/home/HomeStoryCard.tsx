import React from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, ArrowRight } from 'lucide-react'
import type { Work } from '../../data/mockData'
import { getWorkSlug } from '../../data/mockData'
import { useApp } from '../../context/AppContext'
import { OptimizedImage } from '../OptimizedImage'
import { formatViewCount } from '../../lib/utils'

export interface HomeStoryCardProps {
  work: Work
  className?: string
  aspectRatio?: string
  widthClass?: string
  style?: React.CSSProperties
}

/**
 * Universal Home Story Card Component
 * Enforces the HatchPen Home Invariants:
 * - Top-Left of image: Genre badge
 * - Bottom-Right of image: Publication/Story status (e.g. Ongoing, Completed)
 * - Top-Right of image: Bookmark action
 * - Bottom-Left of image: Chapter count badge
 */
export function HomeStoryCard({
  work,
  className = '',
  aspectRatio = 'aspect-[2/3]',
  widthClass = '',
  style,
}: HomeStoryCardProps) {
  const { isWorkSaved, toggleSaveWork } = useApp()
  const saved = isWorkSaved(work.id)
  const wSlug = getWorkSlug(work)
  const genre = work.genre || (work.genres && work.genres[0]?.name) || 'Fiction'
  const status = work.status || (work as any).publicationStatus || 'Ongoing'
  const isCompleted = (status || '').toLowerCase() === 'completed'

  return (
    <div
      style={style}
      className={`rounded-xl sm:rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group ${widthClass} ${className}`}
    >
      {/* Cover presentation with strict 4-corner badge placement */}
      <div className={`relative ${aspectRatio} w-full overflow-hidden bg-[var(--bg-subtle)]`}>
        <Link
          to="/works/$workId"
          params={{ workId: wSlug }}
          preload="intent"
          className="block w-full h-full no-underline"
        >
          <OptimizedImage
            src={work.cover}
            alt={work.title}
            width={260}
            height={390}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* ── 1. TOP-LEFT: Genre Badge ── */}
        {genre && (
          <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 dark:bg-black/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-white tracking-wide border border-white/15 shadow-xs">
            {genre}
          </span>
        )}

        {/* ── 2. TOP-RIGHT: Bookmark Pill Action ── */}
        <button
          type="button"
          onClick={() => toggleSaveWork(work.id)}
          className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10 border border-white/10"
          title={saved ? 'Remove Bookmark' : 'Save to Shelf'}
        >
          <Bookmark className={`h-3 sm:h-3.5 w-3 sm:w-3.5 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>

        {/* ── 3. BOTTOM-LEFT: Chapter Count ── */}
        <div className="absolute bottom-2 left-2 z-10 bg-black/75 text-white font-mono text-[8.5px] sm:text-[9px] px-1.5 py-0.5 rounded backdrop-blur-2xs border border-white/10">
          {work.publishedChaptersCount ?? work.chaptersCount} Ch
        </div>

        {/* ── 4. BOTTOM-RIGHT: Status Badge (Ongoing, Completed, etc.) ── */}
        {status && (
          <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-md bg-black/80 dark:bg-black/90 backdrop-blur-md px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
            <span>{status}</span>
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <Link
            to="/works/$workId"
            params={{ workId: wSlug }}
            preload="intent"
            className="block no-underline text-inherit group-hover:underline"
          >
            <h4 className="font-serif text-xs sm:text-[13px] font-bold text-[var(--ink-primary)] leading-tight line-clamp-1">
              {work.title}
            </h4>
          </Link>

          <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
            <span className="truncate">{work.author?.name}</span>
            {work.category && (
              <span className="shrink-0 text-[9px] text-[var(--ink-faint)]">
                {work.category}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1.5 sm:pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono">
          <span className="text-[9px] text-[var(--ink-faint)]">
            {formatViewCount(work.totalReads, true)} reads
          </span>

          <Link
            to="/read/$workId/$chapterId"
            params={{
              workId: wSlug,
              chapterId: work.chapters?.[0]?.id || 'ch-1',
            }}
            preload="intent"
            className="inline-flex items-center gap-1 text-[var(--ink-primary)] font-semibold hover:underline"
          >
            <span>Read</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default HomeStoryCard
