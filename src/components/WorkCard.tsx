import React from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, BookOpen, Clock, Star } from 'lucide-react'
import type { Work } from '../data/mockData'
import { formatWorkActivitySummary, getWorkSlug } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { OptimizedImage } from './OptimizedImage'
import { formatViewCount } from '../lib/utils'

interface WorkCardProps {
  work: Work
  layout?: 'portrait' | 'horizontal' | 'compact'
}

export default function WorkCard({ work, layout = 'portrait' }: WorkCardProps) {
  const { isWorkSaved, toggleSaveWork, readingProgress, isOwnWork, isSignedIn, openAuthModal } = useApp()
  const saved = isWorkSaved(work.id)
  const progress = !isOwnWork(work.id) ? readingProgress[work.id] : undefined
  const activity = formatWorkActivitySummary(work)
  const workSlug = getWorkSlug(work)
  const authorSlug = work.author.handle || work.author.id

  const showAuthorAvatar = work.author.showAvatar !== false
  const showAuthorName = work.author.showName !== false
  const showAuthorUsername = work.author.showUsername !== false
  const authorDisplayName = showAuthorName
    ? work.author.name
    : showAuthorUsername
      ? `@${work.author.handle}`
      : 'Anonymous Author'
  const authorAvatarUrl = showAuthorAvatar ? work.author.avatar : '/unisex-avatar.svg'

  if (layout === 'horizontal') {
    return (
      <div
        data-testid="work-card"
        data-work-id={work.id}
        className="group relative flex flex-row gap-3.5 sm:gap-6 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 sm:p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all"
      >
        {/* Cover */}
        <Link
          to="/works/$workId"
          params={{ workId: workSlug }}
          preload="intent"
          className="relative aspect-[2/3] w-20 sm:w-36 flex-shrink-0 overflow-hidden rounded bg-[var(--bg-subtle)]"
        >
          <OptimizedImage
            src={work.cover}
            alt={`${work.title} by ${authorDisplayName} — ${work.genre || 'Original'} story cover`}
            width={200}
            height={300}
            sizes="(max-width: 640px) 80px, 144px"
            containerClassName="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* ── TOP-LEFT: Genre Badge ── */}
          {work.genre && (
            <span className="absolute top-1.5 left-1.5 z-10 rounded bg-black/80 px-1.5 py-0.5 text-[8.5px] font-mono font-medium text-white border border-white/10 backdrop-blur-sm">
              {work.genre}
            </span>
          )}

          {/* ── BOTTOM-RIGHT: Status Badge ── */}
          {work.status && (
            <span className="absolute bottom-1.5 right-1.5 z-10 inline-flex items-center rounded bg-black/80 px-1.5 py-0.5 text-[8px] font-mono font-semibold text-white uppercase tracking-wider border border-white/10 backdrop-blur-sm">
              <span>{work.status}</span>
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
              params={{ workId: workSlug }}
              preload="intent"
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
              params={{ authorId: authorSlug }}
              preload="intent"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-inherit no-underline hover:text-[var(--ink-primary)]"
            >
              <OptimizedImage
                src={authorAvatarUrl}
                alt={`${authorDisplayName} profile avatar`}
                width={24}
                height={24}
                className="h-5 w-5 rounded-full object-cover grayscale"
              />
              <span className="font-medium text-[var(--ink-secondary)]">{authorDisplayName}</span>
            </Link>

            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {work.publishedChaptersCount} Chs
              </span>
              <span title={`${formatViewCount(work.totalReads, false)} Reads`}>
                {formatViewCount(work.totalReads, true)} Reads
              </span>
              {progress && (
                <span className="text-[var(--ink-primary)] font-semibold">
                  Progress: {Math.min(100, Math.max(0, Math.round(Number(progress.progressPercent || 0))))}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="work-card"
      data-work-id={work.id}
      className="group relative flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all"
    >
      <div>
        {/* Cover Presentation */}
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded bg-[var(--bg-subtle)]">
          <Link to="/works/$workId" params={{ workId: workSlug }} preload="intent">
            <OptimizedImage
              src={work.cover}
              alt={`${work.title} by ${authorDisplayName} — ${work.genre || 'Original'} story cover`}
              width={320}
              height={426}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* ── TOP-LEFT: Genre Badge ── */}
          {work.genre && (
            <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 dark:bg-black/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-white tracking-wide border border-white/15 shadow-xs">
              {work.genre}
            </span>
          )}

          {/* ── TOP-RIGHT: Quick Bookmark Button ── */}
          <button
            onClick={(e) => {
              e.preventDefault()
              toggleSaveWork(work.id)
            }}
            className={`absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black shadow-sm transition-transform active:scale-95 ${
              saved ? 'text-black' : 'text-slate-500 hover:text-black'
            }`}
            title={saved ? 'Remove from Library' : 'Save to Library'}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-black' : ''}`} />
          </button>

          {/* ── BOTTOM-RIGHT: Status Badge ── */}
          {work.status && (
            <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-md bg-black/80 dark:bg-black/90 backdrop-blur-md px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
              <span>{work.status}</span>
            </span>
          )}

          {/* ── BOTTOM-LEFT: Activity / Feature Highlights ── */}
          <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1 z-10">
            {work.new_chapters_this_week ? (
              <span className="rounded bg-indigo-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm">
                ✦ New Chapters
              </span>
            ) : work.new_this_week ? (
              <span className="rounded bg-amber-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm">
                ✦ New
              </span>
            ) : activity.detail && activity.isRecent ? (
              <span className="rounded bg-emerald-600/90 text-white px-2 py-0.5 text-[9px] font-mono font-medium tracking-wide backdrop-blur-sm truncate max-w-[120px]">
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
          params={{ workId: workSlug }}
          preload="intent"
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
      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-1.5 text-[11px]">
        <Link
          to="/author/$authorId"
          params={{ authorId: authorSlug }}
          preload="intent"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 sm:gap-1.5 text-inherit no-underline hover:text-[var(--ink-primary)] min-w-0 flex-1"
        >
          <OptimizedImage
            src={authorAvatarUrl}
            alt={authorDisplayName}
            width={20}
            height={20}
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full object-cover grayscale shrink-0"
          />
          <span className="truncate text-[var(--ink-secondary)] font-medium text-[10px] sm:text-[11px]">{authorDisplayName}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5 font-mono text-[9px] sm:text-[10px] text-[var(--ink-faint)] shrink-0 whitespace-nowrap">
          <span title={`${formatViewCount(work.totalReads, false)} Reads`}>
            {formatViewCount(work.totalReads, true)}
          </span>
          <span>•</span>
          <span>{work.publishedChaptersCount} chs</span>
        </div>
      </div>
    </div>
  )
}
