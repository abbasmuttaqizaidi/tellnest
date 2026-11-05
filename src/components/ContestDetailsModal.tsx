import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Users, Heart, ArrowRight, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { getActiveContestServerFn, type ContestPublicPageData } from '../server/contests'

export interface ContestDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: ContestPublicPageData | null
}

// Apple Fluid easeOutQuint curve for organic physical deceleration
const FLUID_TRANSITION = {
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1] as const,
}

export function ContestDetailsModal({ isOpen, onClose, initialData }: ContestDetailsModalProps) {
  const [data, setData] = useState<ContestPublicPageData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Fetch active contest details when modal opens if not already loaded
  useEffect(() => {
    if (!isOpen) return

    if (!data) {
      let isMounted = true
      setIsLoading(true)
      getActiveContestServerFn({ data: 'monthly-indie-contest' })
        .then((res) => {
          if (isMounted && res) {
            setData(res)
          }
        })
        .catch((err) => {
          console.warn('[ContestDetailsModal] Error fetching contest:', err)
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })

      return () => {
        isMounted = false
      }
    }
  }, [isOpen, data])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const contest = data?.contest
  const totalContestants = data?.totalContestants ?? (
    (data?.leaderboard?.length || 0) + (contest?.participant_boost_count || 0)
  )

  const contestDate = useMemo(() => {
    return contest?.start_date ? new Date(contest.start_date) : new Date()
  }, [contest?.start_date])

  const formattedMonth = useMemo(() => {
    return contestDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [contestDate])

  const prizeAmount = contest?.prize_inr ? `₹${contest.prize_inr.toLocaleString()}` : '₹2,000'

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window: Smooth Layout Resizing & Zero Scrollbars */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{
            opacity: { duration: 0.2 },
            scale: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
            y: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
            layout: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
          }}
          className="relative w-full max-w-md sm:max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-4 sm:p-6 shadow-2xl text-[var(--ink-primary)] z-10 my-auto overflow-hidden"
        >
          {/* Header */}
          <motion.div layout="position" className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <AnimatePresence initial={false}>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setShowDetails(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer transition-colors pb-0.5"
                    >
                      <ArrowLeft className="w-3 h-3 shrink-0" />
                      <span>Back to Overview</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)] tracking-tight leading-snug">
                {contest?.title || `The HatchPen Indie Writer Contest — ${prizeAmount} Cash Prize`}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0 ml-1"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </motion.div>

          {isLoading && !data ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)] font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--ink-primary)]" />
              <span>Loading live contest details...</span>
            </div>
          ) : (
            <motion.div layout="position" className="pt-3.5 space-y-3">
              {/* Dynamic Content Switching with PopLayout Crossfade */}
              <AnimatePresence mode="popLayout" initial={false}>
                {!showDetails ? (
                  /* VIEW 1: QUICK OVERVIEW */
                  <motion.div
                    key="view-overview"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={FLUID_TRANSITION}
                    className="space-y-3"
                  >
                    {/* Big Active Contestants Count Card */}
                    <div className="py-3 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--ink-muted)]">
                        <Users className="w-3 h-3 text-[var(--ink-primary)]" />
                        <span>Current Participation</span>
                      </div>
                      <div className="font-serif sm:font-mono text-4xl sm:text-5xl font-extrabold text-[var(--ink-primary)] tracking-tight leading-none py-1">
                        {totalContestants.toLocaleString()}
                      </div>
                      <p className="text-[11px] font-serif text-[var(--ink-secondary)]">
                        Active writers registered in {formattedMonth}
                      </p>
                    </div>

                    {/* Key Highlights: Cash Prize & Winning Rule */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        <span className="text-[9.5px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block">
                          Cash Prize
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--ink-primary)] mt-0.5 block">
                          {prizeAmount}
                        </span>
                        <span className="text-[10px] text-[var(--ink-muted)] block">
                          Direct UPI Transfer
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl border border-[var(--ink-primary)] bg-[var(--bg-surface)] shadow-2xs">
                        <span className="text-[9.5px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block">
                          Winning Rule
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--ink-primary)] mt-0.5 flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3 fill-[var(--ink-primary)] text-[var(--ink-primary)]" />
                          <span>Max Likes</span>
                        </span>
                        <span className="text-[10px] text-[var(--ink-muted)] block">
                          Verified Reader Hearts
                        </span>
                      </div>
                    </div>

                    {/* Single-line How to Win */}
                    <div className="text-[11px] text-[var(--ink-secondary)] bg-[var(--bg-subtle)] px-3 py-2 rounded-lg border border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <p className="truncate">
                        <strong className="text-[var(--ink-primary)]">How to Win:</strong> Publish in {formattedMonth}. Highest reader likes wins.
                      </p>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                        100% Free
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  /* VIEW 2: SCALED-DOWN MINI-CARDS & ADMIN DETAILS */
                  <motion.div
                    key="view-details"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={FLUID_TRANSITION}
                    className="space-y-2.5"
                  >
                    {/* The 3 Cards Scaled Down in a Single 3-Column Row */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                        <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block truncate">
                          Contestants
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--ink-primary)] block">
                          {totalContestants.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-[var(--ink-muted)] block truncate">
                          Active Writers
                        </span>
                      </div>

                      <div className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                        <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block truncate">
                          Cash Prize
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--ink-primary)] block">
                          {prizeAmount}
                        </span>
                        <span className="text-[9px] text-[var(--ink-muted)] block truncate">
                          UPI Transfer
                        </span>
                      </div>

                      <div className="p-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--bg-surface)] shadow-2xs">
                        <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block truncate">
                          Winning Rule
                        </span>
                        <span className="text-sm sm:text-base font-bold font-mono text-[var(--ink-primary)] flex items-center justify-center gap-0.5">
                          <Heart className="w-2.5 h-2.5 fill-[var(--ink-primary)] text-[var(--ink-primary)]" />
                          <span>Likes</span>
                        </span>
                        <span className="text-[9px] text-[var(--ink-muted)] block truncate">
                          Max Hearts
                        </span>
                      </div>
                    </div>

                    {/* Single-line How to Win */}
                    <p className="text-[11px] text-[var(--ink-secondary)] truncate font-sans px-0.5">
                      <strong className="text-[var(--ink-primary)]">How to Win:</strong> Publish in {formattedMonth} with free entry • Max verified likes wins.
                    </p>

                    {/* Admin Decided Details Card with Genre Highlight */}
                    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 space-y-2">
                      {/* 1. GENRE - Important & Highlighted */}
                      <div className="p-2.5 rounded-lg border-2 border-[var(--ink-primary)] bg-[var(--bg-subtle)] flex items-center justify-between gap-2 shadow-2xs">
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[var(--ink-muted)] block">
                            Target Genre (Key Highlight)
                          </span>
                          <p className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)] truncate mt-0.5">
                            {contest?.genre && contest.genre.trim() ? contest.genre : 'All Genres'}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-[9.5px] font-mono font-bold uppercase tracking-wider">
                          Primary Focus
                        </span>
                      </div>

                      {/* 2. Admin Specifications Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Theme (Optional) */}
                        <div className="p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block">
                            Theme (Optional)
                          </span>
                          <span className="font-medium text-[var(--ink-primary)] text-xs block mt-0.5 truncate">
                            {contest?.theme && contest.theme.trim() ? contest.theme : 'Open Theme'}
                          </span>
                        </div>

                        {/* Category (Optional or All categories as placeholder) */}
                        <div className="p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block">
                            Category
                          </span>
                          <span className="font-medium text-[var(--ink-primary)] text-xs block mt-0.5 truncate">
                            {contest?.category_restriction && contest.category_restriction.toLowerCase() !== 'all'
                              ? contest.category_restriction
                              : 'All Categories'}
                          </span>
                        </div>

                        {/* Cash Prize */}
                        <div className="p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block">
                            Cash Prize
                          </span>
                          <span className="font-bold font-mono text-[var(--ink-primary)] text-xs block mt-0.5 truncate">
                            {prizeAmount} via UPI
                          </span>
                        </div>

                        {/* Contest Status */}
                        <div className="p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                          <span className="text-[9px] uppercase font-mono text-[var(--ink-muted)] block">
                            Contest Status
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-medium capitalize text-[var(--ink-primary)] text-xs">
                              {contest?.status || 'Active'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Text Link: Details / Back Toggle with Crossfade */}
              <motion.div layout="position" className="pt-0.5 text-center">
                <AnimatePresence mode="wait" initial={false}>
                  {!showDetails ? (
                    <motion.button
                      key="btn-view-details"
                      type="button"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.16 }}
                      onClick={() => setShowDetails(true)}
                      className="inline-flex items-center justify-center gap-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] underline decoration-[var(--border-strong)] hover:decoration-[var(--ink-primary)] underline-offset-4 py-1 transition-colors cursor-pointer select-none"
                    >
                      <span>View Contest Details &amp; Rules →</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      key="btn-back-overview"
                      type="button"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.16 }}
                      onClick={() => setShowDetails(false)}
                      className="inline-flex items-center justify-center gap-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] underline decoration-[var(--border-strong)] hover:decoration-[var(--ink-primary)] underline-offset-4 py-1 transition-colors cursor-pointer select-none"
                    >
                      <span>← Back to Overview</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Action Button: Navigate to Contest Page */}
              <motion.div layout="position">
                <Link
                  to="/writing-contests"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 font-semibold text-xs sm:text-sm transition-all shadow-xs inline-flex items-center justify-center gap-2 no-underline cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Open Writing Contest Page</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                </Link>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
