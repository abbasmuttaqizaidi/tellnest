import React, { useState, useRef, useEffect, type FC, type ReactNode } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ChevronDown, BookOpen, MessageSquare, Sparkles, Bell, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'
import { Drawer } from './Drawer'

export interface ActivityEntry {
  id: string | number
  icon?: ReactNode
  title: string
  desc: string
  time: string
  badge?: string
}

export interface ActivitiesCardProps {
  headerIcon?: ReactNode
  title?: string
  subtitle?: string
  activities?: ActivityEntry[]
  className?: string
  defaultOpen?: boolean
  displayMode?: 'popover' | 'inline' | 'drawer'
  size?: 'sm' | 'md'
  align?: 'left' | 'right'
  onAction?: () => void
}

const DEFAULT_ACTIVITIES: ActivityEntry[] = [
  {
    id: 1,
    icon: <BookOpen className="h-3.5 w-3.5" />,
    title: 'Chapter 14 Published',
    desc: 'The Silent Meridian released new serialized chapter',
    time: '12m ago',
    badge: 'Manuscript',
  },
  {
    id: 2,
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    title: 'Editorial Reflection',
    desc: 'Julian Thorne replied to commentary on Baltic Fog',
    time: '1h ago',
    badge: 'Discussion',
  },
  {
    id: 3,
    icon: <Sparkles className="h-3.5 w-3.5" />,
    title: 'Milestone Achieved',
    desc: 'A Winter in Kyoto reached 10,000 continuous readers',
    time: '4h ago',
    badge: 'Folio Record',
  },
  {
    id: 4,
    icon: <Bell className="h-3.5 w-3.5" />,
    title: 'New Follower',
    desc: 'Dr. Alistair Vance followed your author archives',
    time: '1d ago',
    badge: 'Community',
  },
]

export const ActivitiesCard: FC<ActivitiesCardProps> = ({
  headerIcon = <Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />,
  title = 'Publishing Activity',
  subtitle = 'Real-time manuscript events',
  activities = DEFAULT_ACTIVITIES,
  className,
  defaultOpen = false,
  displayMode = 'popover',
  size = 'sm',
  align = 'left',
  onAction,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside and ESC dismiss for popover mode (prevents layout shift)
  useEffect(() => {
    if (!isOpen || displayMode !== 'popover') return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, displayMode])

  const isSmall = size === 'sm'

  const renderActivityList = () => (
    <div className="divide-y divide-[var(--border-subtle)] max-h-[320px] overflow-y-auto">
      {activities.map((act) => (
        <div
          key={act.id}
          className={cn(
            'flex items-start justify-between gap-2.5 transition-colors hover:bg-[var(--bg-subtle)]/40',
            isSmall ? 'p-2.5 sm:px-3 text-xs' : 'p-3 sm:px-4 text-xs'
          )}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className={cn(
                'flex shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]',
                isSmall
                  ? 'h-6 w-6 [&_svg]:h-3 [&_svg]:w-3'
                  : 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5'
              )}
            >
              {act.icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-[var(--ink-primary)]">
                  {act.title}
                </p>
                {act.badge && (
                  <span className="font-mono text-[8.5px] uppercase px-1 py-0.2 rounded bg-[var(--bg-subtle)] text-[var(--ink-faint)]">
                    {act.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] truncate mt-0.5">
                {act.desc}
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] text-[var(--ink-faint)] shrink-0 pt-0.5">
            {act.time}
          </span>
        </div>
      ))}

      {onAction && (
        <div className="p-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex justify-end">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onAction()
            }}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-primary)] hover:underline"
          >
            <span>View full history</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )

  const headerButton = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        'flex w-full items-center justify-between text-left transition-colors hover:bg-[var(--bg-subtle)]/40',
        isSmall ? 'gap-2 px-3 py-2' : 'gap-3 p-3.5 sm:p-4'
      )}
    >
      <div className={cn('flex min-w-0 flex-1 items-center', isSmall ? 'gap-2' : 'gap-3')}>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]',
            isSmall
              ? 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5'
              : 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4'
          )}
        >
          {headerIcon}
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              'truncate font-serif font-semibold text-[var(--ink-primary)]',
              isSmall ? 'text-xs' : 'text-sm'
            )}
          >
            {title}
          </h4>
          {subtitle && (
            <p
              className={cn(
                'truncate font-mono text-[var(--ink-muted)]',
                isSmall ? 'text-[10px]' : 'text-xs'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        <span
          className={cn(
            'rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-[var(--ink-muted)] font-medium',
            isSmall ? 'px-1.5 py-0.2 text-[9px]' : 'px-2 py-0.5 text-[10px]'
          )}
        >
          {activities.length}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={SPRINGS.snappy}
          className="text-[var(--ink-muted)]"
        >
          <ChevronDown className={cn(isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </motion.div>
      </div>
    </button>
  )

  // 1. POPOVER MODE (Default): Floats above content with absolute positioning, preventing any layout shift of lower cards
  if (displayMode === 'popover') {
    return (
      <div
        ref={containerRef}
        className={cn('relative select-none font-sans', className)}
      >
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs transition-colors',
            isOpen ? 'border-[var(--border-strong)]' : 'hover:border-[var(--border-strong)]'
          )}
        >
          {headerButton}
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={SPRINGS.smooth}
              className={cn(
                'absolute top-full z-50 mt-1.5 w-72 sm:w-84 max-w-[92vw] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl',
                align === 'right' ? 'right-0' : 'left-0'
              )}
            >
              {renderActivityList()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // 2. DRAWER MODE: Opens slide-over sheet from the right (zero layout shift)
  if (displayMode === 'drawer') {
    return (
      <>
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs transition-colors select-none font-sans',
            className
          )}
        >
          {headerButton}
        </div>
        <Drawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title={title}
          side="right"
        >
          <div className="p-2 space-y-4">
            <p className="text-xs text-[var(--ink-muted)] font-mono">{subtitle}</p>
            {renderActivityList()}
          </div>
        </Drawer>
      </>
    )
  }

  // 3. INLINE MODE: Classic accordion expansion inside the container
  return (
    <MotionConfig transition={SPRINGS.smooth}>
      <motion.div
        layout
        className={cn(
          'overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs transition-colors select-none font-sans',
          isOpen ? 'border-[var(--border-strong)]' : 'hover:border-[var(--border-strong)]',
          className
        )}
      >
        {headerButton}

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
            >
              {renderActivityList()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}
