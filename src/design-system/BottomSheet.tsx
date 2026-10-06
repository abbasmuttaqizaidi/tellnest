import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  footer?: React.ReactNode
  /** Default percentage or vh height when opened (default: 80) */
  defaultHeightPercent?: number
  /** Stretch expanded height percentage when pulled up (default: 96) */
  expandedHeightPercent?: number
  /** Custom container class */
  className?: string
  /** Header class */
  headerClassName?: string
}

/**
 * BottomSheet Component
 * A silky-smooth, gesture-controlled mobile sheet:
 * - Opens at 80% default height by default
 * - Upward drag / swipe on handle stretches smoothly to expanded height (96%)
 * - Downward drag on handle collapses or dismisses smoothly
 * - Dedicated drag handle prevents scroll conflicts with inner text/content
 * - Body content has independent smooth scrolling
 * - Escape key & backdrop click support
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  icon,
  footer,
  defaultHeightPercent = 80,
  expandedHeightPercent = 96,
  className,
  headerClassName,
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const dragControls = useDragControls()

  // Reset to default height whenever reopened
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false)
    }
  }, [isOpen])

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock body scroll while sheet is open on mobile
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Animated Sheet Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRINGS.smooth}
            drag="y"
            dragControls={dragControls}
            dragListener={false} // Only handle bar initiates drag to eliminate scroll conflict
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.08, bottom: 0.5 }}
            onDragEnd={(_e, info) => {
              // Drag down by 100px or quick fling down -> close or collapse
              if (info.offset.y > 100 || info.velocity.y > 450) {
                if (isExpanded && info.offset.y < 240) {
                  setIsExpanded(false)
                } else {
                  onClose()
                }
              }
              // Drag up by 40px or quick fling up -> stretch to expanded view
              else if (info.offset.y < -40 || info.velocity.y < -300) {
                setIsExpanded(true)
              }
            }}
            style={{
              height: `${isExpanded ? expandedHeightPercent : defaultHeightPercent}vh`,
            }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl transition-[height] duration-300 ease-out overflow-hidden',
              className
            )}
          >
            {/* Gesture-Controlled Handle Bar */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0 select-none touch-none group/handle"
              aria-label="Drag to resize sheet"
            >
              <div className="h-1.5 w-12 rounded-full bg-[var(--ink-faint)]/60 group-hover/handle:bg-[var(--ink-primary)] transition-colors" />
              <span className="font-mono text-[9px] text-[var(--ink-muted)] mt-1.5 uppercase tracking-wider">
                {isExpanded ? 'Swipe down to minimize' : 'Swipe up to expand'}
              </span>
            </div>

            {/* Header */}
            {(title || subtitle || icon) && (
              <div
                className={cn(
                  'flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--bg-surface)]',
                  headerClassName
                )}
              >
                <div className="flex items-center gap-2 min-w-0 pr-3">
                  {icon && (
                    <div className="h-7 w-7 rounded-full border border-[var(--border-strong)] flex items-center justify-center bg-[var(--bg-subtle)] shrink-0">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="font-mono text-[10px] text-[var(--ink-muted)] truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Scrollable Content (Isolated scroll container) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 font-serif text-sm leading-relaxed text-[var(--ink-secondary)] overscroll-contain">
              {children}
            </div>

            {/* Sticky Footer */}
            {footer && (
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default BottomSheet
