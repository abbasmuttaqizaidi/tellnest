import React, { useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionTemplate,
  type PanInfo,
} from 'motion/react'
import {
  TrendingUp,
  BookOpen,
  Users,
  Eye,
  Sparkles,
  ArrowUpRight,
  BookmarkCheck,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface WiggleCardData {
  id: string | number
  title: string
  metric: string
  change: string
  sublabel: string
  icon?: React.ReactNode
}

export interface WigglingCardsProps {
  cards?: WiggleCardData[]
  className?: string
  onSelect?: (card: WiggleCardData) => void
}

const DEFAULT_METRIC_CARDS: WiggleCardData[] = [
  {
    id: 1,
    title: 'Total Chapter Reads',
    metric: '184.2k',
    change: '+18.4%',
    sublabel: 'Across all folios this month',
    icon: <Eye className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 2,
    title: 'Reader Bookmarks',
    metric: '14,892',
    change: '+9.2%',
    sublabel: 'Added to private libraries',
    icon: <BookmarkCheck className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 3,
    title: 'Active Writers in Folio',
    metric: '1,420',
    change: '+32.1%',
    sublabel: 'Publishing weekly serials',
    icon: <Users className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 4,
    title: 'Completed Manuscripts',
    metric: '384',
    change: '+14.6%',
    sublabel: 'Read end-to-end',
    icon: <BookOpen className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
]

const CARD_WIDTH = 280
const GAP = 16
const DRAG_BUFFER = 50

interface WigglingCardItemProps {
  card: WiggleCardData
  index: number
  x: ReturnType<typeof useMotionValue<number>>
  onSelect?: () => void
}

const WigglingCardItem: React.FC<WigglingCardItemProps> = ({
  card,
  index,
  x,
  onSelect,
}) => {
  const center = -(index * (CARD_WIDTH + GAP))
  const distance = useTransform(x, (v: number) => v - center)

  const rotate = useTransform(
    distance,
    [-CARD_WIDTH, -CARD_WIDTH * 0.1, 0, CARD_WIDTH * 0.1, CARD_WIDTH],
    [8, 8, 0, -8, -8]
  )

  const blur = useTransform(
    distance,
    [-CARD_WIDTH, -CARD_WIDTH * 0.2, 0, CARD_WIDTH * 0.2, CARD_WIDTH],
    [3, 1, 0, 1, 3]
  )

  const opacity = useTransform(
    distance,
    [-CARD_WIDTH, -CARD_WIDTH * 0.2, 0, CARD_WIDTH * 0.2, CARD_WIDTH],
    [0.4, 0.9, 1, 0.9, 0.4]
  )

  const filter = useMotionTemplate`blur(${blur}px)`

  return (
    <motion.div
      style={{
        opacity,
        rotate,
        filter,
        width: CARD_WIDTH,
        flexShrink: 0,
      }}
      onClick={onSelect}
      className="relative flex h-72 flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs hover:border-[var(--border-strong)] transition-colors cursor-grab active:cursor-grabbing select-none"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            {card.icon}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            {card.change}
          </span>
        </div>

        <p className="mt-4 font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider">
          {card.title}
        </p>
        <h4 className="mt-1 font-serif text-3xl font-bold text-[var(--ink-primary)]">
          {card.metric}
        </h4>
      </div>

      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
        <span className="truncate">{card.sublabel}</span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
      </div>
    </motion.div>
  )
}

export const WigglingCards: React.FC<WigglingCardsProps> = ({
  cards = DEFAULT_METRIC_CARDS,
  className,
  onSelect,
}) => {
  const cardList = cards && cards.length > 0 ? cards : DEFAULT_METRIC_CARDS
  const [currentIndex, setCurrentIndex] = useState(0)
  const x = useMotionValue(0)

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset < -DRAG_BUFFER || velocity < -400) {
      setCurrentIndex((prev) => Math.min(prev + 1, cardList.length - 1))
    } else if (offset > DRAG_BUFFER || velocity > 400) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  return (
    <div className={cn('relative w-full overflow-hidden py-4 select-none', className)}>
      <motion.div
        drag="x"
        dragConstraints={{
          left: -(cardList.length - 1) * (CARD_WIDTH + GAP),
          right: 0,
        }}
        dragElastic={0.2}
        style={{ x }}
        animate={{ x: -currentIndex * (CARD_WIDTH + GAP) }}
        transition={SPRINGS.bouncy}
        onDragEnd={handleDragEnd}
        className="flex gap-4 cursor-grab active:cursor-grabbing px-2"
      >
        {cardList.map((card, idx) => (
          <WigglingCardItem
            key={card.id}
            card={card}
            index={idx}
            x={x}
            onSelect={() => onSelect?.(card)}
          />
        ))}
      </motion.div>

      {/* Pagination bullets */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {cardList.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              currentIndex === idx
                ? 'w-6 bg-[var(--ink-primary)]'
                : 'w-1.5 bg-[var(--border-strong)] hover:bg-[var(--ink-muted)]'
            )}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
