import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import {
  getEligibleUserWorksForContestServerFn,
  submitContestEntryServerFn,
  validateUpiId,
  type ContestInfo,
} from '../server/contests'
import { Link } from '@tanstack/react-router'
import { useApp } from '../context/AppContext'

interface ContestEntryModalProps {
  isOpen: boolean
  onClose: () => void
  contest: ContestInfo
  onSuccess?: () => void
}

export function ContestEntryModal({ isOpen, onClose, contest, onSuccess }: ContestEntryModalProps) {
  const { isSignedIn, isUserLoaded, openAuthModal } = useApp()
  const [loadingWorks, setLoadingWorks] = useState(true)
  const [works, setWorks] = useState<any[]>([])
  const [alreadyEnteredWorkId, setAlreadyEnteredWorkId] = useState<string | null>(null)
  const [selectedWorkId, setSelectedWorkId] = useState<string>('')
  const [upiId, setUpiId] = useState<string>('')
  const [upiTouched, setUpiTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedWorkId('')
      setUpiId('')
      setUpiTouched(false)
      setErrorMessage(null)
      setSuccessMessage(null)
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
  }, [isOpen, contest.id, isUserLoaded, isSignedIn])

  if (!isOpen) return null

  const isUpiValid = validateUpiId(upiId)
  const eligibleWorks = works.filter((w) => w.isEligible)
  const hasEligibleWorks = eligibleWorks.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedWorkId) {
      setErrorMessage('Please select an eligible manuscript to submit.')
      return
    }

    if (!isUpiValid) {
      setUpiTouched(true)
      setErrorMessage('Please provide a valid UPI ID (e.g. name@okhdfcbank or 9876543210@upi).')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await submitContestEntryServerFn({
        data: {
          contestId: contest.id,
          workId: selectedWorkId,
          upiId: upiId.trim(),
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
          className="relative w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-4 sm:p-7 shadow-2xl text-[var(--ink-primary)] z-10 my-4 sm:my-8 max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-mono font-medium">
                <Trophy className="w-3.5 h-3.5" />
                <span>Monthly Contest Entry</span>
              </div>
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
                  View Live Leaderboard
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
            <div className="py-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  You Have Already Entered This Month
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto leading-relaxed">
                  You have already registered an active manuscript for this month’s contest. Only 1 entry per author is permitted per month to keep competition balanced.
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Close & View Leaderboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              {/* Manuscript Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[var(--ink-primary)]">
                  Select Your Manuscript (Must be published this month)
                </label>

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
                    <select
                      value={selectedWorkId}
                      onChange={(e) => setSelectedWorkId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-xs font-medium text-[var(--ink-primary)] focus:outline-hidden focus:border-[var(--ink-primary)]"
                    >
                      {eligibleWorks.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.title} ({w.category || 'General'})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Eligible: Published on {new Date(eligibleWorks[0]?.published_at || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* UPI ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[var(--ink-primary)]">
                    Your UPI ID (For ₹2,000 Prize Payout)
                  </label>
                  <span className="text-[10px] font-mono text-[var(--ink-tertiary)]">
                    e.g. name@okhdfcbank
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="yourname@bank or mobile@upi"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value)
                    setUpiTouched(true)
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs text-[var(--ink-primary)] bg-[var(--bg-subtle)] focus:outline-hidden ${
                    upiTouched && !isUpiValid
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border-strong)] focus:border-[var(--ink-primary)]'
                  }`}
                />
                {upiTouched && !isUpiValid && (
                  <p className="text-[11px] text-red-500 font-medium">
                    Please enter a valid UPI address (e.g. user@oksbi, mobile@paytm).
                  </p>
                )}
              </div>

              {/* Security & Anti-Fraud Disclaimer Box */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Important Security Notice</span>
                </div>
                <ul className="space-y-1 text-[11px] text-[var(--ink-muted)] list-disc pl-4 font-sans leading-relaxed">
                  <li>
                    <strong>We will NEVER call you or message you</strong> asking for any OTP, PIN, password, or bank card details.
                  </li>
                  <li>
                    We <strong>ONLY require your public UPI ID</strong> to transfer the ₹2,000 cash prize directly if your story receives the maximum reader likes.
                  </li>
                  <li>Your UPI ID is strictly encrypted and never shown publicly on your profile or story.</li>
                </ul>
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
                  disabled={!hasEligibleWorks || !isUpiValid || isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Entering Contest...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Confirm & Enter Contest</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
