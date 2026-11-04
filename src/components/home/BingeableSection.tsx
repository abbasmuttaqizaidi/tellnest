import React, { useRef, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import { useUser } from '@clerk/react'
import { useApp } from '../../context/AppContext'
import { getWorkSlug, type Work } from '../../data/mockData'
import { getWorkPublishedChapterCount, calculateBingeableReads } from '../../lib/recommendations/bingeable'
import { OptimizedImage } from '../OptimizedImage'
import { SectionCarouselSkeleton } from './HomeSkeletons'

export interface BingeableSectionProps {
  works?: Work[]
  initialBingeableWorks?: Work[]
  id?: string
  className?: string
  title?: string
  subtitle?: string
  showControls?: boolean
}

export function BingeableSection({
  works = [],
  initialBingeableWorks,
  id = 'bingeable-reads',
  className = '',
  title = 'Bingeable Reads for You',
  subtitle = 'Quick, complete stories and two-chapter arcs you can finish in one sitting.',
  showControls = true,
}: BingeableSectionProps) {
  const { allWorks, isWorkSaved, toggleSaveWork, openAuthModal, isOwnWork, isWorksLoading } = useApp()
  const { isSignedIn } = useUser()
  const carouselRef = useRef<HTMLDivElement>(null)

  const candidatePool = works && works.length > 0 ? works : allWorks

  const bingeableWorksList = useMemo(() => {
    if (initialBingeableWorks && Array.isArray(initialBingeableWorks) && initialBingeableWorks.length > 0) {
      return initialBingeableWorks.filter((w) => !isOwnWork(w.id)).slice(0, 10)
    }
    const candidates = candidatePool.filter((w) => !isOwnWork(w.id))
    return calculateBingeableReads({
      candidateWorks: candidates,
      readingHistory: [],
      userPreferences: null,
    }).slice(0, 10)
  }, [initialBingeableWorks, candidatePool, isOwnWork])

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

  const isLoading = isWorksLoading && bingeableWorksList.length === 0

  return (
    <section id={id} className={`w-full space-y-4 ${className}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '550px' }}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              {title}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-amber-600 dark:text-amber-400">
              ⚡ Single-Sitting
            </span>
          </div>
          {subtitle && (
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        {showControls && bingeableWorksList.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Previous bingeable reads"
              aria-label="Previous bingeable reads"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Next bingeable reads"
              aria-label="Next bingeable reads"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {bingeableWorksList.length > 0 ? (
        <div
          ref={carouselRef}
          className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {bingeableWorksList.map((work) => {
            const wSlug = getWorkSlug(work)
            const saved = isWorkSaved(work.id)
            const chCount = getWorkPublishedChapterCount(work)

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
                      alt={work.title}
                      width={170}
                      height={255}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Quick read chapter badge */}
                  <span className="absolute top-2 left-2 z-10 rounded bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono font-semibold text-amber-400 border border-amber-400/20 shadow-xs flex items-center gap-1 pointer-events-none">
                    <Zap className="h-2.5 w-2.5 fill-current" />
                    <span>{chCount === 1 ? '1 Chapter' : '2 Chapters'}</span>
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
                      {work.status === 'Completed' ? 'Complete' : 'Quick Arc'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : isLoading ? (
        <SectionCarouselSkeleton count={5} />
      ) : null}
    </section>
  )
}
