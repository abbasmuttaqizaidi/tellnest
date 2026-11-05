import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Users, Heart, ArrowRight, ShieldCheck, Sparkles, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { getActiveContestServerFn, type ContestPublicPageData } from '../server/contests'

export interface ContestDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: ContestPublicPageData | null
}

export function ContestDetailsModal({ isOpen, onClose, initialData }: ContestDetailsModalProps) {
  const [data, setData] = useState<ContestPublicPageData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(false)

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-5 sm:p-7 shadow-2xl text-[var(--ink-primary)] z-10 my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] text-[11px] font-mono">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Monthly Writing Contest • {formattedMonth}</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)] tracking-tight">
                {contest?.title || `The HatchPen Indie Writer Contest — ${prizeAmount} Cash Prize`}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0 ml-2"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading && !data ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)] font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--ink-primary)]" />
              <span>Loading live contest details...</span>
            </div>
          ) : (
            <div className="py-5 space-y-5">
              {/* Big Active Contestants Count Card */}
              <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)]">
                  <Users className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
                  <span>Current Participation</span>
                </div>
                <div className="font-serif sm:font-mono text-5xl sm:text-6xl font-extrabold text-[var(--ink-primary)] tracking-tight">
                  {totalContestants.toLocaleString()}
                </div>
                <p className="text-xs sm:text-sm font-serif text-[var(--ink-secondary)]">
                  Active writers registered in {formattedMonth}
                </p>
              </div>

              {/* Key Contest Highlights */}
              <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block">
                    Cash Prize
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--ink-primary)] mt-0.5 block">
                    {prizeAmount}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                    Direct UPI Transfer
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-[var(--ink-primary)] bg-[var(--bg-surface)] shadow-xs">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block">
                    Winning Rule
                  </span>
                  <span className="text-base font-bold font-mono text-[var(--ink-primary)] mt-0.5 flex items-center justify-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-[var(--ink-primary)] text-[var(--ink-primary)]" />
                    <span>Max Likes</span>
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                    Verified Reader Hearts
                  </span>
                </div>
              </div>

              {/* Summary Description */}
              <div className="text-xs text-[var(--ink-secondary)] leading-relaxed space-y-2 font-sans bg-[var(--bg-subtle)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
                <p>
                  <strong>How to Win:</strong> Publish your original manuscript on HatchPen during {formattedMonth} and enter the contest for free. The story with the highest verified reader likes wins the {prizeAmount} cash prize.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>100% Free Entry • No calls, passwords, or OTP required</span>
                </div>
              </div>

              {/* Action Button: Navigate to Contest Page */}
              <div className="pt-2">
                <Link
                  to="/writing-contests"
                  onClick={onClose}
                  className="w-full py-3 px-5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 font-semibold text-xs sm:text-sm transition-all shadow-xs inline-flex items-center justify-center gap-2 no-underline cursor-pointer"
                >
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span>Open Writing Contest Page</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
