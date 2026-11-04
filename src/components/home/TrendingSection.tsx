import React, { useState, useMemo, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUser } from '@clerk/react'
import { useApp } from '../../context/AppContext'
import { getWorkSlug, type Work } from '../../data/mockData'
import { formatViewCount } from '../../lib/utils'
import { OptimizedImage } from '../OptimizedImage'
import { SectionCarouselSkeleton } from './HomeSkeletons'

export interface TrendingSectionProps {
  works?: Work[]
  initialTrendingWorks?: Work[]
  id?: string
  className?: string
  title?: string
  subtitle?: string
  showControls?: boolean
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
  subtitle = 'Community ranked serials updated with weekly canonical rankings.',
  showControls = true,
}: TrendingSectionProps) {
  const { allWorks, isWorkSaved, toggleSaveWork, openAuthModal, isOwnWork, isWorksLoading } = useApp()
  const { isSignedIn } = useUser()
  const [activeGenre, setActiveGenre] = useState<string>('all')
  const carouselRef = useRef<HTMLDivElement>(null)

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

  const scrollCarousel = (direction: -1 | 1) => {
    if (!carouselRef.current) return
    const container = carouselRef.current
    const scrollAmount = Math.max(240, container.clientWidth * 0.6) * direction
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

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
    <section id={id} className={`w-full space-y-4 ${className}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '550px' }}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Genre Filters (Horizontal scrollable pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs py-0.5">
            {GENRE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveGenre(tab.id)}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs font-mono ${
                  activeGenre === tab.id
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                    : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop Left/Right Carousel Controls */}
          {showControls && trendingWorksList.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                title="Previous trending stories"
                aria-label="Previous trending stories"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                title="Next trending stories"
                aria-label="Next trending stories"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {trendingWorksList.length > 0 ? (
        <div
          ref={carouselRef}
          className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {trendingWorksList.map((work, idx) => {
            const wSlug = getWorkSlug(work)
            const saved = isWorkSaved(work.id)
            const rank = (work as any).trendingRank ?? (idx + 1)

            return (
              <div
                key={work.id}
                style={{ scrollSnapAlign: 'start' }}
                className="w-[145px] sm:w-[160px] md:w-[170px] shrink-0 flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group active:scale-[0.98]"
              >
                {/* Cover with badge */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                  <Link
                    to="/works/$workId"
                    params={{ workId: wSlug }}
                    preload="intent"
                    className="block w-full h-full no-underline"
                  >
                    <OptimizedImage
                      src={work.cover}
                      alt={`${work.title} by ${work.author?.name || 'Author'} — #${rank} Trending story cover`}
                      width={170}
                      height={255}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Rank Badge #1..#10 */}
                  <span
                    title={`${formatViewCount(work.totalReads, false)} Reads`}
                    className="absolute top-2 left-2 z-10 rounded bg-black/85 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono font-bold text-white border border-white/20 shadow-xs flex items-center gap-1 pointer-events-none"
                  >
                    <span className="text-amber-400 font-extrabold">#{rank}</span>
                    <span>{formatViewCount(work.totalReads, true)} Reads</span>
                  </span>

                  {/* Bookmark Toggle */}
                  <button
                    type="button"
                    onClick={(e) => handleBookmarkClick(e, work.id)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-xs transition cursor-pointer"
                    title={saved ? 'Remove from Saved' : 'Save to Shelf'}
                    aria-label={saved ? 'Remove from Saved' : 'Save to Shelf'}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current text-amber-400' : ''}`} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                  <div className="space-y-1">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      preload="intent"
                      className="font-serif text-xs sm:text-sm font-bold text-[var(--ink-primary)] line-clamp-1 group-hover:underline no-underline block"
                    >
                      {work.title}
                    </Link>
                    <p className="font-mono text-[10px] sm:text-[11px] text-[var(--ink-muted)] truncate">
                      {work.author?.name || 'Unknown Author'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)]">
                    <span className="truncate">{work.genre || 'Fiction'}</span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                      {work.status || (work as any).publicationStatus || 'Ongoing'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : isLoading ? (
        <SectionCarouselSkeleton count={5} />
      ) : (
        <div className="py-8 px-4 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <p className="font-serif text-sm text-[var(--ink-secondary)]">
            No stories trending in this genre right now.
          </p>
        </div>
      )}
    </section>
  )
}
