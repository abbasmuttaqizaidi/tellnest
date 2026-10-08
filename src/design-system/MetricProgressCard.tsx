import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Download,
  Check,
  ChevronDown,
  Sparkles,
  BookOpen,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface QuotaEntry {
  date: string
  workTitle: string
  chaptersRead: number
  readingMinutes: number
}

export interface MetricProgressCardProps {
  usedPercent?: number
  currentLabel?: string
  limitLabel?: string
  title?: string
  subtitle?: string
  history?: QuotaEntry[]
  className?: string
  onExport?: () => void
}

const DEFAULT_HISTORY: QuotaEntry[] = [
  { date: 'Today, 14:20', workTitle: 'The Silent Meridian', chaptersRead: 3, readingMinutes: 45 },
  { date: 'Yesterday', workTitle: 'An Inventory of Baltic Fog', chaptersRead: 2, readingMinutes: 30 },
  { date: 'Oct 02', workTitle: 'Station Nine', chaptersRead: 5, readingMinutes: 75 },
  { date: 'Oct 01', workTitle: 'A Winter in Kyoto', chaptersRead: 4, readingMinutes: 60 },
]

export const MetricProgressCard: React.FC<MetricProgressCardProps> = ({
  usedPercent = 68,
  currentLabel = '68 Chapters Read',
  limitLabel = '100 Goal Target',
  title = 'Monthly Reading Quota',
  subtitle = 'Tracked across serialized manuscripts',
  history = DEFAULT_HISTORY,
  className,
  onExport,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('Current Month')
  const [isExported, setIsExported] = useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const clampedPercent = Math.max(0, Math.min(100, usedPercent))
  const segments = 40
  const filledSegments = Math.round((clampedPercent / 100) * segments)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleExport = () => {
    setIsExported(true)
    onExport?.()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setIsExported(false), 2000)
  }

  return (
    <div className={cn('w-full max-w-md select-none font-sans', className)}>
      <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
          <div>
            <span className="font-mono text-[10px] uppercase font-semibold text-[var(--ink-muted)]">
              Reading Metrics
            </span>
            <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              {title}
            </h4>
            <p className="font-mono text-xs text-[var(--ink-muted)] mt-0.5">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleExport}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors"
              title="Export Reading Ledger"
            >
              {isExported ? <Check className="h-4 w-4 text-emerald-600" /> : <Download className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Segmented Arc / Capacity Visualizer */}
        <div className="p-6 text-center space-y-4 bg-[var(--bg-canvas)]/40">
          <div className="flex items-baseline justify-center gap-2">
            <span className="font-serif text-4xl font-bold text-[var(--ink-primary)]">
              {usedPercent}%
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              of target reached
            </span>
          </div>

          {/* Segmented Gauge Bar */}
          <div className="flex items-center justify-center gap-1 px-4">
            {Array.from({ length: segments }).map((_, idx) => {
              const isFilled = idx < filledSegments
              return (
                <div
                  key={idx}
                  className={cn(
                    'h-6 w-1 rounded-full transition-all duration-300',
                    isFilled
                      ? 'bg-[var(--ink-primary)]'
                      : 'bg-[var(--border-subtle)]'
                  )}
                />
              )
            })}
          </div>

          <div className="flex items-center justify-between px-2 font-mono text-xs text-[var(--ink-muted)]">
            <span>{currentLabel}</span>
            <span>{limitLabel}</span>
          </div>
        </div>

        {/* History Breakdown */}
        <div className="p-5 border-t border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold pb-1">
            <span>Recent Sessions</span>
            <span>Time</span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {history.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-serif font-semibold text-[var(--ink-primary)] truncate">
                    {item.workTitle}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--ink-faint)]">
                    {item.date} • {item.chaptersRead} chapters
                  </p>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-muted)] shrink-0">
                  {item.readingMinutes} min
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
