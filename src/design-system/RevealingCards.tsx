import React, { useState } from 'react'
import { motion, useMotionValue, type PanInfo } from 'motion/react'
import { Bookmark, Sparkles, BookOpen, Clock, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface StackCardData {
  id: string | number
  title: string
  author: string
  genre: string
  metric: string
  metricLabel: string
  date: string
}

export interface RevealingCardsProps {
  cards?: StackCardData[]
  className?: string
  onCardClick?: (card: StackCardData) => void
}

const DEFAULT_STACK_CARDS: StackCardData[] = [
  {
    id: 1,
    title: 'The Silent Meridian',
    author: 'Elena Rostova',
    genre: 'Nordic Noir',
    metric: '94% Match',
    metricLabel: 'Reader Compatibility',
    date: 'Updated Today',
  },
  {
    id: 2,
    title: 'An Inventory of Baltic Fog',
    author: 'Elena Rostova',
    genre: 'Literary Fiction',
    metric: '12 Chapters',
    metricLabel: 'Full Release',
    date: 'Yesterday',
  },
  {
    id: 3,
    title: 'Station Nine: Cold War Monograph',
    author: 'Julian Thorne',
    genre: 'Historical Thriller',
    metric: '48k Words',
    metricLabel: 'Draft Volume',
    date: '3 days ago',
  },
  {
    id: 4,
    title: 'A Winter in Kyoto',
    author: 'Marcus Vance',
    genre: 'Memoir / Travel',
    metric: 'Completed',
    metricLabel: 'Monograph Status',
    date: '1 week ago',
  },
]

const MAX_DRAG = 120

interface DraggableCardWrapperProps {
  children: React.ReactNode
  onDismiss: () => void
}

function DraggableCardWrapper({ children, onDismiss }: DraggableCardWrapperProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > MAX_DRAG || Math.abs(info.offset.y) > MAX_DRAG) {
      onDismiss()
    } else {
      x.set(0)
      y.set(0)
    }
  }

  return (
    <motion.div
      style={{ x, y }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab touch-none"
    >
      {children}
    </motion.div>
  )
}

export const RevealingCards: React.FC<RevealingCardsProps> = ({
  cards = DEFAULT_STACK_CARDS,
  className,
  onCardClick,
}) => {
  const cardList = cards && cards.length > 0 ? cards : DEFAULT_STACK_CARDS
  const [deck, setDeck] = useState<StackCardData[]>(cardList)

  React.useEffect(() => {
    if (cards && cards.length > 0) {
      setDeck(cards)
    }
  }, [cards])

  const cycleCard = (id: string | number) => {
    setDeck((prev) => {
      const copy = [...prev]
      const index = copy.findIndex((c) => c.id === id)
      if (index === -1) return prev
      const [item] = copy.splice(index, 1)
      copy.unshift(item)
      return copy
    })
  }

  return (
    <div className={cn('relative flex items-center justify-center p-6 select-none font-sans', className)}>
      <div className="relative h-[320px] w-full max-w-[340px]">
        {deck.map((card, index) => {
          const isTop = index === deck.length - 1
          const depth = deck.length - index - 1

          return (
            <DraggableCardWrapper
              key={card.id}
              onDismiss={() => cycleCard(card.id)}
            >
              <motion.div
                style={{
                  borderRadius: '24px',
                  transformOrigin: '5% 95%',
                }}
                animate={{
                  rotateZ: -depth * 4.5,
                  scale: 1 - depth * 0.04,
                  y: depth * 6,
                }}
                initial={false}
                transition={SPRINGS.smooth}
                className={cn(
                  'h-full w-full overflow-hidden border p-6 flex flex-col justify-between transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]',
                  isTop
                    ? 'border-[var(--border-strong)] bg-[var(--bg-surface)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)]/90'
                )}
                onClick={() => isTop && onCardClick?.(card)}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] uppercase font-semibold text-[var(--ink-muted)]">
                      {card.genre}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {card.date}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1">
                    <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)] line-clamp-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)]">
                      By {card.author}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <p className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                      {card.metric}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {card.metricLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)]">
                    <span>Flick to cycle</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </motion.div>
            </DraggableCardWrapper>
          )
        })}
      </div>
    </div>
  )
}
