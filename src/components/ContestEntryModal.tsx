import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Trophy,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  Lock,
  Loader2,
  Heart,
  AlertTriangle,
} from 'lucide-react'
import {
  getEligibleUserWorksForContestServerFn,
  submitContestEntryServerFn,
  type ContestInfo,
} from '../server/contests'
import { Link } from '@tanstack/react-router'
import { useApp } from '../context/AppContext'
import { DropdownSelect, type SelectOption } from '../design-system'
import { useScrollLock } from '../lib/scrollLock'

interface ContestEntryModalProps {
  isOpen: boolean
  onClose: () => void
  contest: ContestInfo
  onSuccess?: () => void
  initialEnteredWork?: any | null
}

export function ContestEntryModal({
  isOpen,
  onClose,
  contest,
  onSuccess,
  initialEnteredWork,
}: ContestEntryModalProps) {
  const { isSignedIn, isUserLoaded, openAuthModal } = useApp()
  const [mounted, setMounted] = useState(false)
  const [loadingWorks, setLoadingWorks] = useState(!initialEnteredWork)
  const [works, setWorks] = useState<any[]>([])
  const [alreadyEnteredWorkId, setAlreadyEnteredWorkId] = useState<string | null>(
    initialEnteredWork?.workId || initialEnteredWork?.id || null
  )
  const [alreadyEnteredWork, setAlreadyEnteredWork] = useState<{ id: string; title: string; slug?: string; like_count: number } | null>(
    initialEnteredWork || null
  )
  const [selectedWorkId, setSelectedWorkId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background scroll with scrollbar compensation to eliminate layout shift
  useScrollLock(isOpen)

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

  useEffect(() => {
    if (!isOpen) {
      setSelectedWorkId('')
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsConfirmOpen(false)
      return
    }

    // If author's entry is already known from parent page, display it immediately without network request
    if (initialEnteredWork) {
      setAlreadyEnteredWorkId(initialEnteredWork.workId || initialEnteredWork.id || null)
      setAlreadyEnteredWork(initialEnteredWork)
      setLoadingWorks(false)
      return
    }

    if (!isUserLoaded || !isSignedIn) {
      setLoadingWorks(false)
      return
    }

    async function loadEligibleWorks() {
      setLoadingWorks(true)
      try {
        const res = await getEligibleUserWorksForContestServerFn({ data: contest.id })
        setWorks(res.works || [])
        setAlreadyEnteredWorkId(res.alreadyEnteredWorkId)
        setAlreadyEnteredWork((res as any).alreadyEnteredWork || null)

        // Pre-select first eligible work if available
        const firstEligible = (res.works || []).find((w: any) => w.isEligible)
        if (firstEligible) {
          setSelectedWorkId(firstEligible.id)
        }
      } catch (err) {
        console.warn('Failed to load eligible works:', err)
      } finally {
        setLoadingWorks(false)
      }
    }

    loadEligibleWorks()
  }, [isOpen, contest.id, isUserLoaded, isSignedIn, initialEnteredWork])

  if (!mounted || typeof document === 'undefined') return null

  const eligibleWorks = works.filter((w) => w.isEligible)
  const hasEligibleWorks = eligibleWorks.length > 0
  const selectedWork = eligibleWorks.find((w) => w.id === selectedWorkId) || eligibleWorks[0]

  const workOptions: SelectOption[] = eligibleWorks.map((w) => ({
    id: w.id,
    label: w.title,
    description: `Published ${new Date(w.published_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  }))

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedWorkId) {
      setErrorMessage('Please select an eligible manuscript to submit.')
      return
    }

    setIsConfirmOpen(true)
  }

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setIsConfirmOpen(false)
    try {
      const res = await submitContestEntryServerFn({
        data: {
          contestId: contest.id,
          workId: selectedWorkId,
        },
      })

      if (res.success) {
        setSuccessMessage(res.message)
        if (onSuccess) onSuccess()
      } else {
        setErrorMessage(res.message)
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Submission failed. Please check your network connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs touch-none"
          />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-4 sm:p-7 shadow-2xl text-[var(--ink-primary)] z-10 my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
                Enter The Monthly Indie Contest
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                ₹{contest.prize_inr.toLocaleString()} Cash Prize • Winner decided strictly by reader likes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success State */}
          {successMessage ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Submission Confirmed!
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto leading-relaxed">
                  {successMessage}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : !isUserLoaded ? (
            /* User Auth Loading State */
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--ink-primary)]" />
              <span>Verifying account status...</span>
            </div>
          ) : !isSignedIn ? (
            /* Unauthenticated Visitor Gate */
            <div className="py-6 sm:py-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-strong)] text-[var(--ink-primary)] mx-auto flex items-center justify-center shadow-xs">
                <Lock className="w-6 h-6 stroke-[1.75]" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)]">
                  Sign In to Enter Contest
                </h4>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Sign in or create a free HatchPen account to submit your published manuscript, track verified reader likes, and be eligible for the ₹{contest.prize_inr.toLocaleString()} cash prize.
                </p>
              </div>

              {/* Contest Guarantees */}
              <div className="grid grid-cols-3 gap-2 text-left p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-mono">
                <div className="space-y-0.5">
                  <span className="font-semibold text-[var(--ink-primary)] block">100% Free</span>
                  <span className="text-[10px] text-[var(--ink-muted)] block">Zero entry fees</span>
                </div>
                <div className="space-y-0.5 border-x border-[var(--border-subtle)] px-2">
                  <span className="font-semibold text-[var(--ink-primary)] block">UPI Transfer</span>
                  <span className="text-[10px] text-[var(--ink-muted)] block">Direct cash prize</span>
                </div>
                <div className="space-y-0.5 pl-1">
                  <span className="font-semibold text-[var(--ink-primary)] block">Full Rights</span>
                  <span className="text-[10px] text-[var(--ink-muted)] block">You own your story</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openAuthModal(typeof window !== 'undefined' ? window.location.pathname : '/writing-contests')
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In / Join Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : alreadyEnteredWorkId ? (
            <div className="py-6 sm:py-8 text-center space-y-4">
              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  You Have Already Entered This Month
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto leading-relaxed">
                  You have already registered an active manuscript for this month’s contest. Only 1 entry per author is permitted per month to keep competition balanced.
                </p>
              </div>

              {/* Display Entered Work Details */}
              {alreadyEnteredWork && (
                <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-1.5 text-left max-w-sm mx-auto">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-tertiary)] block">
                    Participating Manuscript
                  </span>
                  <p className="font-serif font-bold text-sm text-[var(--ink-primary)] truncate">
                    {alreadyEnteredWork.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] font-mono">
                    <Heart className="w-3.5 h-3.5 fill-[var(--ink-primary)] text-[var(--ink-primary)]" />
                    <span>{alreadyEnteredWork.like_count.toLocaleString()} reader likes collected</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleOpenConfirm} className="space-y-5 pt-4">
              {/* Manuscript Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--ink-primary)]">
                    Select Your Manuscript (Must be published this month)
                  </label>
                  {eligibleWorks.length > 1 && (
                    <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                      {eligibleWorks.length} eligible stories
                    </span>
                  )}
                </div>

                {loadingWorks ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-xs text-[var(--ink-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span>Checking your published manuscripts...</span>
                  </div>
                ) : !hasEligibleWorks ? (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-2">
                    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">No Eligible Stories Found For This Month</p>
                        <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                          To participate, your story must be published during the active contest month ({new Date(contest.start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}). Drafts or older stories published in previous months are not eligible.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Link
                        to="/write/new"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-[11px] font-medium no-underline hover:opacity-90 transition-opacity"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Publish New Story Now</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <DropdownSelect
                      options={workOptions}
                      value={selectedWorkId}
                      onChange={(val) => setSelectedWorkId(val)}
                      size="sm"
                      placeholder="Select an eligible manuscript..."
                      className="w-full text-xs [&_button]:py-2.5 [&_button]:rounded-xl"
                    />

                    {selectedWork && (
                      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs">
                        <div className="space-y-0.5 truncate pr-2">
                          <span className="font-semibold text-[var(--ink-primary)] truncate block">
                            {selectedWork.title}
                          </span>
                          <span className="text-[11px] text-[var(--ink-muted)] font-mono block">
                            Published {new Date(selectedWork.published_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-medium">
                          Eligible
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Frictionless 1-Click Entry & Payout Note */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--ink-primary)]">
                  <Trophy className="w-4 h-4 shrink-0 text-[var(--ink-primary)]" />
                  <span>1-Click Submission &amp; Winner Payout</span>
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed font-sans">
                  No payment details or bank accounts required to enter. If your story receives the highest reader likes by month-end, we will reach out directly on your account to transfer the ₹{contest.prize_inr.toLocaleString()} cash prize via UPI.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit Action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasEligibleWorks || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Entering Contest...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Contest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Irreversible Submission Confirmation Popup */}
          <AnimatePresence>
            {isConfirmOpen && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsConfirmOpen(false)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-5 sm:p-6 shadow-2xl text-[var(--ink-primary)] z-10 space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                        Confirm Contest Entry
                      </h4>
                      <p className="text-xs text-[var(--ink-muted)]">
                        Please confirm your manuscript selection before submitting.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-1 text-xs">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-tertiary)] block">
                      Selected Manuscript
                    </span>
                    <p className="font-serif font-bold text-sm text-[var(--ink-primary)] truncate">
                      {selectedWork?.title}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)] font-mono">
                      Published {new Date(selectedWork?.published_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Important Finality Warning */}
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-semibold text-xs flex items-center gap-1.5">
                      <span>⚠️ Submissions are Final &amp; Irreversible</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      Once submitted, your entry is final and cannot be changed, swapped, or withdrawn for another manuscript this month. Only 1 story is allowed per author.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      Go Back / Change
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Entering...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm &amp; Enter Contest</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )}
  </AnimatePresence>,
  document.body
)
}
