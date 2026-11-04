import React, { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, Eye } from 'lucide-react'
import { useUser } from '@clerk/react'
import { useApp } from '../../context/AppContext'
import { getWorkSlug, type Work } from '../../data/mockData'
import { formatViewCount } from '../../lib/utils'
import { UnisexAvatar } from '../UnisexAvatar'
import { SectionCarouselSkeleton } from './HomeSkeletons'

export interface TrendingSectionProps {
  works?: Work[]
  initialTrendingWorks?: Work[]
  id?: string
  className?: string
  title?: string
  subtitle?: string
}

const GENRE_TABS = [
  { id: 'all', label: 'All Genres' },
  { id: 'romance', label: 'Romance' },
  { id: 'speculative', label: 'Speculative' },
  { id: 'historical', label: 'Historical' },
]

export function TrendingSection({
  works = [],
  initialTrendingWorks,
  id = 'trending-serials',
  className = '',
  title = 'Trending Serials Today',
  subtitle,
}: TrendingSectionProps) {
  const { allWorks, isWorkSaved, toggleSaveWork, openAuthModal, isOwnWork, isWorksLoading } = useApp()
  const { isSignedIn } = useUser()
  const [activeGenre, setActiveGenre] = useState<string>('all')

  const candidatePool = works && works.length > 0 ? works : allWorks

  const trendingSerials = useMemo(() => {
    let list = candidatePool.filter((w) => Boolean(w.trending) && !isOwnWork(w.id))
    list.sort((a, b) => ((a as any).trendingRank ?? 999) - ((b as any).trendingRank ?? 999))
    if (activeGenre !== 'all') {
      list = list.filter((w) => {
        const primary = (w.genre || '').toLowerCase()
        const secondary = Array.isArray(w.genres) ? w.genres.map((g) => (g.name || g.slug || '').toLowerCase()) : []
        const target = activeGenre.toLowerCase()
        return primary.includes(target) || secondary.some((g) => g.includes(target))
      })
    }
    return list.slice(0, 10)
  }, [candidatePool, isOwnWork, activeGenre])

  const trendingWorksList = useMemo(() => {
    if (activeGenre === 'all' && initialTrendingWorks && Array.isArray(initialTrendingWorks) && initialTrendingWorks.length > 0) {
      return initialTrendingWorks.filter((w) => !isOwnWork(w.id)).slice(0, 10)
    }
    return trendingSerials.slice(0, 10)
  }, [initialTrendingWorks, trendingSerials, activeGenre, isOwnWork])

  const handleBookmarkClick = (e: React.MouseEvent, workId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isSignedIn) {
      openAuthModal({
        canClose: true,
        title: 'Save to Library',
        reason: 'Sign in to save stories and keep track of your reading list.',
      })
      return
    }
    toggleSaveWork(workId)
  }

  const isLoading = isWorksLoading && trendingWorksList.length === 0

  return (
    <section id={id} className={`w-full space-y-5 ${className}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '650px' }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Genre Filters (Swipeable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs py-1">
          {GENRE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveGenre(tab.id)}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs font-mono ${
                activeGenre === tab.id
                  ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                  : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Bento Grid: Up to 10 Rich Serials (1 col mobile, 2 col md, 3 col lg) */}
      {trendingWorksList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingWorksList.map((work, idx) => {
            const wSlug = getWorkSlug(work)
            const saved = isWorkSaved(work.id)
            const rank = (work as any).trendingRank ?? (idx + 1)
            const firstChapterId = work.chapters?.[0]?.id || 'ch-1'

            return (
              <div
                key={work.id}
                className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group active:scale-[0.98]"
              >
                {/* Visual Cover Header */}
                <div className="relative h-60 sm:h-64 overflow-hidden bg-[var(--bg-subtle)]">
                  <Link
                    to="/works/$workId"
                    params={{ workId: wSlug }}
                    preload="intent"
                    className="block w-full h-full no-underline"
                  >
                    <img
                      src={work.cover}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Rank & Genre Pill (Top-Left) */}
                  <div className="absolute top-3 left-3 bg-black/75 text-white backdrop-blur-md px-2.5 py-1 rounded font-mono text-[11px] uppercase tracking-wider flex items-center gap-1 border border-white/20 shadow-xs z-10 pointer-events-none">
                    <span className="font-bold text-amber-400">#{rank}</span>
                    <span>in {work.genre}</span>
                  </div>

                  {/* Bookmark Button (Top-Right) */}
                  <button
                    type="button"
                    onClick={(e) => handleBookmarkClick(e, work.id)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                    title={saved ? 'Remove Bookmark' : 'Save to Library'}
                    aria-label={saved ? 'Remove Bookmark' : 'Save to Library'}
                  >
                    <Bookmark className={`h-4 w-4 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  {/* Status Badge (Bottom-Right) */}
                  {(work.status || (work as any).publicationStatus) && (
                    <span className="absolute bottom-3 right-4 z-10 inline-flex items-center rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
                      <span>{work.status || (work as any).publicationStatus || 'Ongoing'}</span>
                    </span>
                  )}

                  {/* Title & Season Info */}
                  <div className="absolute bottom-3 left-4 right-28 text-white pointer-events-none">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-white/80">
                      Season 1 • {work.publishedChaptersCount ?? work.chaptersCount} Chapters
                    </span>
                    <h4 className="font-serif text-lg font-bold text-white leading-snug line-clamp-1 mt-0.5">
                      {work.title}
                    </h4>
                  </div>
                </div>

                {/* Card Content & Metrics */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                    {work.synopsis}
                  </p>

                  <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                    {/* Metrics Bar */}
                    <div className="flex items-center justify-between text-[var(--ink-muted)] font-mono text-[11px] bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-[var(--ink-faint)]" />
                        {formatViewCount(work.totalReads, true)} Reads
                      </span>
                      {work.totalSaves > 0 ? (
                        <span className="flex items-center gap-1" title={`${formatViewCount(work.totalSaves, false)} Saves`}>
                          <Bookmark className="h-3 w-3 text-red-500" />
                          {formatViewCount(work.totalSaves, true)} Saves
                        </span>
                      ) : null}
                    </div>

                    {/* Author & Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                          <UnisexAvatar
                            src={work.author.avatar}
                            name={work.author.name}
                            size="sm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-mono text-xs text-[var(--ink-primary)] font-medium">
                          {work.author.name}
                        </span>
                      </div>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: firstChapterId,
                        }}
                        preload="intent"
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read Part 1 →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : isLoading ? (
        <SectionCarouselSkeleton count={3} />
      ) : (
        <div className="py-12 px-4 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <p className="font-serif text-base text-[var(--ink-secondary)]">
            No stories trending this week yet. Fresh rankings update every Monday.
          </p>
        </div>
      )}
    </section>
  )
}
