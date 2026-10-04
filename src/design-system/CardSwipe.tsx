import React, { useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  type Transition,
} from 'motion/react'
import { BookOpen, Sparkles, Compass, Feather, Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface SwipeCardItem {
  id: string | number
  title: string
  subtitle?: string
  description: string
  badge?: string
  icon?: React.ReactNode
  accentLetter?: string
}

export interface CardSwipeProps {
  items?: SwipeCardItem[]
  className?: string
  onSelectCard?: (item: SwipeCardItem) => void
}

const DEFAULT_CARDS: SwipeCardItem[] = [
  {
    id: 1,
    title: 'Serialized Novels',
    subtitle: 'Weekly Manuscripts',
    description: 'Immerse in deep multi-chapter narratives penned chapter-by-chapter by verified authors.',
    badge: 'Fiction',
    accentLetter: 'N',
    icon: <BookOpen className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 2,
    title: 'Literary Essays',
    subtitle: 'Critical Discourse',
    description: 'Long-form investigations, cultural meditations, and philosophical inquiries.',
    badge: 'Non-Fiction',
    accentLetter: 'E',
    icon: <Feather className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 3,
    title: 'Atmospheric Noir',
    subtitle: 'Cold War & Meridian',
    description: 'Espionage, coastal silence, and psychological depth set across European borders.',
    badge: 'Featured',
    accentLetter: 'A',
    icon: <Compass className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 4,
    title: 'Rising Authors',
    subtitle: 'New Voices',
    description: 'Writers in residence publishing debut monographs and independent serialized stories.',
    badge: 'Community',
    accentLetter: 'R',
    icon: <Sparkles className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
  {
    id: 5,
    title: 'Trending Readings',
    subtitle: 'Reader Repositories',
    description: 'The literary works commanding continuous attention across the reader community.',
    badge: 'Popular',
    accentLetter: 'T',
    icon: <Flame className="h-6 w-6 text-[var(--ink-primary)]" />,
  },
]

const ITEM_WIDTH = 300
const GAP = 16
const CONTAINER_WIDTH = ITEM_WIDTH + GAP
const DRAG_BUFFER = 40
const VELOCITY_THRESHOLD = 400

const SPRING_OPTIONS: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 28,
}

interface CarouselCardItemProps {
  item: SwipeCardItem
  index: number
  x: ReturnType<typeof useMotionValue<number>>
  itemCount: number
  onSelect?: () => void
}

const CarouselCardItem: React.FC<CarouselCardItemProps> = ({
  item,
  index,
  x,
  itemCount,
  onSelect,
}) => {
  const nextIndex = Math.min(index + 1, itemCount - 1)
  const prevIndex = Math.max(index - 1, 0)

  const range = [
    (-100 * (index + 1) * CONTAINER_WIDTH) / 100,
    (-100 * index * CONTAINER_WIDTH) / 100,
    (-100 * (index - 1) * CONTAINER_WIDTH) / 100,
  ]
  const outputRange = [nextIndex ? 35 : 35, 0, prevIndex ? -35 : -35]
  const rotateY = useTransform(x, range, outputRange, { clamp: false })

  return (
    <motion.div
      style={{
        width: ITEM_WIDTH,
        height: 380,
        rotateY,
        flexShrink: 0,
      }}
      transition={SPRING_OPTIONS}
      onClick={onSelect}
      className="flex cursor-grab flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 transition-colors active:cursor-grabbing hover:border-[var(--border-strong)] shadow-xs select-none"
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]">
            {item.icon}
          </div>
          {item.badge && (
            <span className="font-mono text-[10px] uppercase font-semibold text-[var(--ink-muted)] border border-[var(--border-subtle)] rounded px-2 py-0.5 bg-[var(--bg-canvas)]">
              {item.badge}
            </span>
          )}
        </div>

        <div className="space-y-1">
          {item.subtitle && (
            <p className="font-mono text-[11px] text-[var(--ink-muted)] tracking-wider uppercase">
              {item.subtitle}
            </p>
          )}
          <h3 className="font-serif text-2xl font-semibold text-[var(--ink-primary)] leading-snug">
            {item.title}
          </h3>
        </div>

        <p className="mt-4 text-xs text-[var(--ink-secondary)] leading-relaxed line-clamp-3">
          {item.description}
        </p>
      </div>

      <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <span className="font-mono text-[10px] text-[var(--ink-faint)]">Swipe or drag</span>
        <button
          type="button"
          className="rounded-md border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
        >
          Explore
        </button>
      </div>
    </motion.div>
  )
}

export const CardSwipe: React.FC<CardSwipeProps> = ({
  items = DEFAULT_CARDS,
  className,
  onSelectCard,
}) => {
  const cardList = items && items.length > 0 ? items : DEFAULT_CARDS
  const [currentIndex, setCurrentIndex] = useState(0)
  const x = useMotionValue(0)

  const handleDragEnd = (_: any, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset < -DRAG_BUFFER || velocity < -VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.min(prev + 1, cardList.length - 1))
    } else if (offset > DRAG_BUFFER || velocity > VELOCITY_THRESHOLD) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0))
    }
  }

  return (
    <div className={cn('relative w-full overflow-hidden py-4 select-none', className)}>
      <motion.div
        drag="x"
        dragConstraints={{
          left: -(cardList.length - 1) * CONTAINER_WIDTH,
          right: 0,
        }}
        dragElastic={0.2}
        style={{ x }}
        animate={{ x: -currentIndex * CONTAINER_WIDTH }}
        transition={SPRING_OPTIONS}
        onDragEnd={handleDragEnd}
        className="flex gap-4 cursor-grab active:cursor-grabbing px-2"
      >
        {cardList.map((item, idx) => (
          <CarouselCardItem
            key={item.id}
            item={item}
            index={idx}
            x={x}
            itemCount={cardList.length}
            onSelect={() => onSelectCard?.(item)}
          />
        ))}
      </motion.div>

      {/* Navigation Controls */}
      <div className="mt-6 flex items-center justify-between px-2">
        <div className="flex gap-1.5">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                currentIndex === idx
                  ? 'w-6 bg-[var(--ink-primary)]'
                  : 'w-1.5 bg-[var(--border-strong)] hover:bg-[var(--ink-muted)]'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
            disabled={currentIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1))}
            disabled={currentIndex === items.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
