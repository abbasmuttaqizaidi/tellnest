import React, { useState } from 'react'
import { motion, MotionConfig } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import useMeasure from 'react-use-measure'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface AccordionItemData {
  id: string | number
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: string
  content: React.ReactNode
}

export interface CardAccordionProps {
  items: AccordionItemData[]
  defaultOpenId?: string | number | null
  className?: string
}

export const CardAccordion: React.FC<CardAccordionProps> = ({
  items,
  defaultOpenId = null,
  className,
}) => {
  const [openId, setOpenId] = useState<string | number | null>(defaultOpenId)

  const openIndex = items.findIndex((item) => item.id === openId)

  return (
    <div className={cn('w-full space-y-2 select-none font-sans', className)}>
      <MotionConfig transition={SPRINGS.bouncy}>
        {items.map((item, index) => {
          const isOpen = item.id === openId
          const isFirst = index === 0
          const isLast = index === items.length - 1
          const isBeforeOpen = index === openIndex - 1
          const isAfterOpen = index === openIndex + 1
          const isAlone = (isAfterOpen && isLast) || (isBeforeOpen && isFirst)

          let borderTopLeftRadius = 8
          let borderTopRightRadius = 8
          let borderBottomLeftRadius = 8
          let borderBottomRightRadius = 8

          if (isOpen || isAlone) {
            borderTopLeftRadius = 14
            borderTopRightRadius = 14
            borderBottomLeftRadius = 14
            borderBottomRightRadius = 14
          } else if (isBeforeOpen) {
            borderBottomLeftRadius = 14
            borderBottomRightRadius = 14
          } else if (isAfterOpen) {
            borderTopLeftRadius = 14
            borderTopRightRadius = 14
          } else if (isFirst) {
            borderTopLeftRadius = 14
            borderTopRightRadius = 14
          } else if (isLast) {
            borderBottomLeftRadius = 14
            borderBottomRightRadius = 14
          }

          return (
            <AccordionRow
              key={item.id}
              item={item}
              isOpen={isOpen}
              onToggle={() => setOpenId(isOpen ? null : item.id)}
              borderRadii={{
                borderTopLeftRadius,
                borderTopRightRadius,
                borderBottomLeftRadius,
                borderBottomRightRadius,
              }}
            />
          )
        })}
      </MotionConfig>
    </div>
  )
}

interface AccordionRowProps {
  item: AccordionItemData
  isOpen: boolean
  onToggle: () => void
  borderRadii: {
    borderTopLeftRadius: number
    borderTopRightRadius: number
    borderBottomLeftRadius: number
    borderBottomRightRadius: number
  }
}

function AccordionRow({ item, isOpen, onToggle, borderRadii }: AccordionRowProps) {
  const [measureRef, bounds] = useMeasure()

  return (
    <motion.div
      layout
      animate={borderRadii}
      className={cn(
        'overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors',
        isOpen ? 'border-[var(--border-strong)] bg-[var(--bg-subtle)]/40 shadow-xs' : 'hover:border-[var(--border-strong)]'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left focus-visible:outline-none"
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          {item.icon && (
            <span className="flex-shrink-0 text-[var(--ink-muted)]">
              {item.icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] truncate">
                {item.title}
              </span>
              {item.badge && (
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-muted)]">
                  {item.badge}
                </span>
              )}
            </div>
            {item.subtitle && (
              <p className="text-xs text-[var(--ink-muted)] truncate font-sans mt-0.5">
                {item.subtitle}
              </p>
            )}
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-[var(--ink-muted)]"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isOpen ? bounds.height : 0,
          opacity: isOpen ? 1 : 0,
        }}
        className="overflow-hidden will-change-transform"
      >
        <div ref={measureRef} className="px-4 pb-4 pt-1 text-xs text-[var(--ink-secondary)] leading-relaxed border-t border-[var(--border-subtle)]/60">
          {item.content}
        </div>
      </motion.div>
    </motion.div>
  )
}
