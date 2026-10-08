import React from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, BookOpen, Clock, Star } from 'lucide-react'
import type { Work } from '../data/mockData'
import { formatWorkActivitySummary } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { OptimizedImage } from './OptimizedImage'

interface WorkCardProps {
  work: Work
  layout?: 'portrait' | 'horizontal' | 'compact'
}

export default function WorkCard({ work, layout = 'portrait' }: WorkCardProps) {
  const { isWorkSaved, toggleSaveWork, readingProgress } = useApp()
  const saved = isWorkSaved(work.id)
  const progress = readingProgress[work.id]
  const activity = formatWorkActivitySummary(work)

  if (layout === 'horizontal') {
    return (
      <div className="group relative flex flex-row gap-3.5 sm:gap-6 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        {/* Cover */}
        <Link
          to="/works/$workId"
          params={{ workId: work.id }}
          className="relative aspect-[2/3] w-20 sm:w-36 flex-shrink-0 overflow-hidden rounded bg-[var(--bg-subtle)]"
        >
          <OptimizedImage
            src={work.cover}
            alt={work.title}
            width={200}
            height={300}
            sizes="(max-width: 640px) 80px, 144px"
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {work.status === 'Completed' && (
            <span className="absolute top-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-white uppercase tracking-wider backdrop-blur-sm z-10">
              Complete
            </span>
          )}
        </Link>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  {work.category}
                </span>
                <span className="text-[11px] text-[var(--ink-faint)]">•</span>
                <span className="text-xs text-[var(--ink-muted)]">{work.genre}</span>
                {activity.detail && activity.isRecent && (
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide">
                    ✦ {activity.detail}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  toggleSaveWork(work.id)
                }}
                className={`p-1.5 rounded transition-colors ${
                  saved
                    ? 'text-[var(--ink-primary)]'
                    : 'text-[var(--ink-faint)] hover:text-[var(--ink-primary)]'
                }`}
                title={saved ? 'Remove from Library' : 'Save to Library'}
              >
                <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
              </button>
            </div>

            <Link
              to="/works/$workId"
              params={{ workId: work.id }}
              className="mt-2 block no-underline text-inherit"
            >
              <h3 className="font-serif text-lg sm:text-xl font-semibold leading-snug text-[var(--ink-primary)] group-hover:underline">
                {work.title}
              </h3>
            </Link>

            {work.subtitle && (
              <p className="mt-0.5 text-xs text-[var(--ink-muted)] font-serif italic">
                {work.subtitle}
              </p>
            )}

            <p className="mt-2 text-xs leading-relaxed text-[var(--ink-muted)] line-clamp-2">
              {work.synopsis}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--ink-muted)]">
            <Link
              to="/author/$authorId"
              params={{ authorId: work.author.id }}
              className="flex items-center gap-2 text-inherit no-underline hover:text-[var(--ink-primary)]"
            >
              <OptimizedImage
                src={work.author.avatar}
                alt={work.author.name}
                width={24}
                height={24}
                className="h-5 w-5 rounded-full object-cover grayscale"
              />
              <span className="font-medium text-[var(--ink-secondary)]">{work.author.name}</span>
            </Link>

            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {work.publishedChaptersCount} Chs
              </span>
              <span>{work.totalReads} Reads</span>
              {progress && (
                <span className="text-[var(--ink-primary)] font-semibold">
                  Progress: {progress.progressPercent}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Portrait Layout (Default)
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
      <div>
        {/* Cover Presentation */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-[var(--bg-subtle)]">
          <Link to="/works/$workId" params={{ workId: work.id }}>
            <OptimizedImage
              src={work.cover}
              alt={work.title}
              width={320}
              height={426}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Quick Bookmark Button */}
          <button
            onClick={(e) => {
              e.preventDefault()
              toggleSaveWork(work.id)
            }}
            className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black shadow-sm transition-transform active:scale-95 ${
              saved ? 'text-black' : 'text-slate-500 hover:text-black'
            }`}
            title={saved ? 'Remove from Library' : 'Save to Library'}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-black' : ''}`} />
          </button>

          {/* Status & Collections / Recent Activity Badge */}
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1">
            <span className="rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-medium text-white uppercase tracking-wider backdrop-blur-sm">
              {work.status}
            </span>
            {work.new_chapters_this_week ? (
              <span className="rounded bg-indigo-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm">
                ✦ New Chapters This Week
              </span>
            ) : work.new_this_week ? (
              <span className="rounded bg-amber-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm">
                ✦ New This Week
              </span>
            ) : activity.detail && activity.isRecent ? (
              <span className="rounded bg-emerald-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm truncate max-w-[150px]">
                ✦ {activity.detail}
              </span>
            ) : work.trending ? (
              <span className="rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-medium text-white uppercase tracking-wider backdrop-blur-sm">
                Trending
              </span>
            ) : null}
          </div>
        </div>

        {/* Meta Header */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {work.category}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Star className="h-3 w-3 fill-current text-[var(--ink-primary)]" />
            {work.ratingScore.toFixed(1)}
          </span>
        </div>

        {/* Title */}
        <Link
          to="/works/$workId"
          params={{ workId: work.id }}
          className="mt-1 block no-underline text-inherit"
        >
          <h3 className="font-serif text-base font-semibold leading-tight text-[var(--ink-primary)] group-hover:underline line-clamp-1">
            {work.title}
          </h3>
        </Link>

        {/* Synopsis */}
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)] line-clamp-2">
          {work.synopsis}
        </p>
      </div>

      {/* Author & Footer */}
      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
        <Link
          to="/author/$authorId"
          params={{ authorId: work.author.id }}
          className="flex items-center gap-1.5 text-inherit no-underline hover:text-[var(--ink-primary)] truncate max-w-[140px]"
        >
          <OptimizedImage
            src={work.author.avatar}
            alt={work.author.name}
            width={20}
            height={20}
            className="h-4 w-4 rounded-full object-cover grayscale"
          />
          <span className="truncate text-[var(--ink-secondary)] font-medium">{work.author.name}</span>
        </Link>

        <span className="font-mono text-[10px] text-[var(--ink-faint)]">
          {work.publishedChaptersCount} chs
        </span>
      </div>
    </div>
  )
}
