import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, ArrowRight } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useScrollLock } from '../lib/scrollLock'

export const MOBILE_CONTEST_DISMISSAL_KEY = 'hatchpen_mobile_contest_modal_dismissed_at'
export const MOBILE_CONTEST_COOLDOWN_MS = 48 * 60 * 60 * 1000 // 48 Hours

export function MobileContestAnnouncementModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const routerState = useRouterState()
  const currentPath = routerState?.location?.pathname || ''

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock background scroll strictly when open
  useScrollLock(isOpen)

  // Handle dismissal: save timestamp for 48 hours and close
  const handleDismiss = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(MOBILE_CONTEST_DISMISSAL_KEY, String(Date.now()))
      }
    } catch {
      // Ignore private browsing or storage quota errors
    }
    setIsOpen(false)
  }, [])

  // Check 48h dismissal status & device criteria on mount
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return

    // Mobile screens only (< 768px)
    if (window.innerWidth >= 768) return

    // Do not show on distraction-free reader or chapter editor
    if (currentPath.startsWith('/read/') || currentPath.startsWith('/write/editor')) {
      return
    }

    try {
      const dismissedAtRaw = localStorage.getItem(MOBILE_CONTEST_DISMISSAL_KEY)
      if (dismissedAtRaw) {
        const dismissedAt = Number(dismissedAtRaw)
        if (!isNaN(dismissedAt) && Date.now() - dismissedAt < MOBILE_CONTEST_COOLDOWN_MS) {
          // Modal dismissed within the last 48 hours -> keep hidden
          return
        }
      }
    } catch {
      // Storage access issue -> fallback to not showing or showing safely
    }

    // Delay presentation slightly (~1.2s) so the mobile initial paint and hydration complete smoothly
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 1200)

    return () => clearTimeout(timer)
  }, [mounted, currentPath])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleDismiss])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-contest-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Subtle backdrop overlay with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs touch-none"
          />

          {/* Minimalist, elegant contest card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[340px] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-5 shadow-2xl text-[var(--ink-primary)] z-10 overflow-hidden transform-gpu will-change-[transform,opacity]"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close contest announcement"
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge & Trophy Icon (Sleek Black Themed) */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] flex items-center justify-center shrink-0 shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--ink-primary)] font-mono">
                Writing Contest
              </span>
            </div>

            {/* Title & Description */}
            <h3
              id="mobile-contest-modal-title"
              className="font-serif text-lg font-bold text-[var(--ink-primary)] tracking-tight leading-snug mb-1.5"
            >
              Win ₹2,000 Cash Prize
            </h3>
            <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
              Publish your original story on HatchPen. Free entry for all writers • Winner decided by verified reader likes.
            </p>

            {/* CTA Buttons */}
            <div className="space-y-2">
              <Link
                to="/writing-contests"
                onClick={handleDismiss}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#18181B] hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-[#18181B] py-2 px-4 text-xs font-medium transition-all shadow-xs cursor-pointer active:scale-[0.98]"
              >
                <span>View Contest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-1.5 text-center text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default MobileContestAnnouncementModal
