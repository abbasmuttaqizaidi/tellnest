import { useRef, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Bookmark, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { getWorkSlug, type Work } from '../../data/mockData'
import { getTopShelfWorks } from '../../lib/recommendations/topShelf'
import { OptimizedImage } from '../OptimizedImage'

export interface TopShelfSectionProps {
  works?: Work[]
  currentUserId?: string | null
  currentUserProfileId?: string | null
  limit?: number
  className?: string
  id?: string
  showControls?: boolean
}

export function TopShelfSection({
  works: propWorks,
  currentUserId = null,
  currentUserProfileId = null,
  limit = 10,
  className = '',
  id = 'top-shelf',
  showControls = true,
}: TopShelfSectionProps) {
  const { allWorks, isWorkSaved, toggleSaveWork, isOwnWork } = useApp()
  const carouselRef = useRef<HTMLDivElement>(null)

  const candidatePool = propWorks && propWorks.length > 0 ? propWorks : allWorks

  const topShelfWorks = useMemo(() => {
    const candidateWorks = candidatePool.filter((w) => !isOwnWork(w.id))
    return getTopShelfWorks(candidateWorks, {
      currentUserId,
      currentUserProfileId,
      limit,
    })
  }, [candidatePool, isOwnWork, currentUserId, currentUserProfileId, limit])

  const scrollCarousel = (direction: -1 | 1) => {
    if (!carouselRef.current) return
    const container = carouselRef.current
    const scrollAmount = Math.max(280, container.clientWidth * 0.6) * direction
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }

  if (topShelfWorks.length === 0) return null

  return (
    <section
      id={id}
      className={`w-full space-y-4 ${className}`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '550px' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Bookmark className="h-3.5 w-3.5 fill-current" />
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              Top Shelf
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-muted)]">
              Top 10 Community Picks
            </span>
          </div>
          <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
            The most saved and cherished manuscripts across the HatchPen reading community.
          </p>
        </div>

        {showControls && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Previous manuscripts"
              aria-label="Previous manuscripts"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              className="p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Next manuscripts"
              aria-label="Next manuscripts"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={carouselRef}
        className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {topShelfWorks.map((work, idx) => {
          const wSlug = getWorkSlug(work)
          const saved = isWorkSaved(work.id)
          const savesCount = Number(work.totalSaves || (work as any).save_count || 0)

          return (
            <div
              key={work.id}
              style={{ scrollSnapAlign: 'start' }}
              className="w-[145px] sm:w-[160px] md:w-[170px] shrink-0 flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group"
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

                {/* Rank Badge #1..#10 */}
                <span className="absolute top-2 left-2 z-10 rounded bg-black/85 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono font-bold text-white border border-white/20 shadow-xs flex items-center gap-1">
                  <span className="text-purple-400 font-extrabold">#{idx + 1}</span>
                  <span>{savesCount.toLocaleString()} Saves</span>
                </span>

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleSaveWork(work.id)
                  }}
                  className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-xs transition cursor-pointer"
                  title={saved ? 'Remove from Saved' : 'Save to Shelf'}
                  aria-label={saved ? 'Remove from Saved' : 'Save to Shelf'}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current text-purple-400' : ''}`} />
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
                  <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                    <Heart className="h-2.5 w-2.5 fill-current" />
                    <span>{Number(work.likeCount ?? (work as any).like_count ?? (work as any).likesCount ?? work.ratingCount ?? 0).toLocaleString()}</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default TopShelfSection
