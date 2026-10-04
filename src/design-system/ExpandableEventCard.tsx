import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Calendar, Clock, MapPin, ArrowRight, BookOpen } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface ExpandableEventProps {
  id: string
  title: string
  subtitle?: string
  description: string
  imageSrc: string
  date?: string
  time?: string
  location?: string
  badge?: string
  expandedContent?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const ExpandableEventCard: React.FC<ExpandableEventProps> = ({
  id,
  title,
  subtitle,
  description,
  imageSrc,
  date = 'Friday, Oct 24',
  time = '19:00 GMT',
  location = 'Virtual Reading Salon',
  badge = 'Editorial Event',
  expandedContent,
  actionLabel = 'Reserve Reading Seat',
  onAction,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const layoutId = `expandable-event-card-${id}`

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      <motion.div
        layoutId={layoutId}
        onClick={() => setIsOpen(true)}
        className={cn(
          'group cursor-pointer overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-colors shadow-xs select-none font-sans',
          className
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--bg-subtle)]">
          <motion.img
            layoutId={`image-${layoutId}`}
            src={imageSrc}
            alt={title}
            className="h-full w-full object-cover grayscale transition-transform duration-500 group-hover:scale-103"
          />
          {badge && (
            <span className="absolute top-3 left-3 rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-xs">
              {badge}
            </span>
          )}
        </div>

        <div className="p-5 space-y-2">
          {subtitle && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              {subtitle}
            </p>
          )}
          <motion.h4
            layoutId={`title-${layoutId}`}
            className="font-serif text-lg font-semibold text-[var(--ink-primary)] leading-tight"
          >
            {title}
          </motion.h4>
          <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed">
            {description}
          </p>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-faint)]">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {date}
            </span>
            <span className="flex items-center gap-1 text-[var(--ink-primary)] font-medium">
              View Salon <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Expanded Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              layoutId={layoutId}
              transition={SPRINGS.smooth}
              className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-3.5 right-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)]/90 border border-[var(--border-subtle)] text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors backdrop-blur-xs"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--bg-subtle)] shrink-0">
                <motion.img
                  layoutId={`image-${layoutId}`}
                  src={imageSrc}
                  alt={title}
                  className="h-full w-full object-cover grayscale"
                />
                {badge && (
                  <span className="absolute bottom-3 left-3 rounded bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-xs">
                    {badge}
                  </span>
                )}
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div>
                  <motion.h3
                    layoutId={`title-${layoutId}`}
                    className="font-serif text-2xl font-semibold text-[var(--ink-primary)]"
                  >
                    {title}
                  </motion.h3>
                  {subtitle && (
                    <p className="mt-1 font-serif text-sm italic text-[var(--ink-muted)]">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 py-2 border-y border-[var(--border-subtle)] font-mono text-xs text-[var(--ink-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                    {date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                    {time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                    {location}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
                  {description}
                </p>

                {expandedContent}

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAction?.()
                      setIsOpen(false)
                    }}
                    className="rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
