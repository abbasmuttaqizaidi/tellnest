import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Calendar,
  Clock,
  Users,
  ChevronDown,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface Participant {
  name: string
  avatar: string
}

export interface MeetingCardProps {
  title?: string
  subtitle?: string
  date?: string
  time?: string
  description?: string
  participants?: Participant[]
  className?: string
  onJoin?: () => void
}

const DEFAULT_PARTICIPANTS: Participant[] = [
  { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { name: 'Julian Thorne', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
]

export const MeetingCard: React.FC<MeetingCardProps> = ({
  title = 'Literary Salon & Roundtable',
  subtitle = 'Baltic Noir & The Art of Fiction',
  date = 'Tomorrow',
  time = '18:00 - 19:30 UTC',
  description = 'Live salon analyzing serialized pacing, cold-war tension, and chapter architecture with authors in residence.',
  participants = DEFAULT_PARTICIPANTS,
  className,
  onJoin,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn('w-full max-w-sm select-none font-sans', className)}>
      <motion.div
        layout
        transition={SPRINGS.smooth}
        className={cn(
          'overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all',
          isOpen ? 'border-[var(--border-strong)]' : 'hover:border-[var(--border-strong)]'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-[10px] uppercase font-semibold text-[var(--ink-muted)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 bg-[var(--bg-subtle)]">
              {date}
            </span>
            <h4 className="mt-2 font-serif text-lg font-semibold text-[var(--ink-primary)] leading-snug">
              {title}
            </h4>
            <p className="font-serif text-xs text-[var(--ink-muted)] italic">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]"
          >
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={SPRINGS.snappy}>
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between py-2 border-t border-[var(--border-subtle)] font-mono text-xs text-[var(--ink-muted)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
            {time}
          </span>

          {/* Participant Avatars Stack */}
          <div className="flex -space-x-2">
            {participants.map((p, idx) => (
              <img
                key={idx}
                src={p.avatar}
                alt={p.name}
                title={p.name}
                className="h-6 w-6 rounded-full object-cover grayscale border-2 border-[var(--bg-surface)]"
              />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRINGS.smooth}
              className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-4"
            >
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                {description}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {participants.length} Readers Registered
                </span>
                <button
                  type="button"
                  onClick={onJoin}
                  className="rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
                >
                  RSVP to Salon
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
