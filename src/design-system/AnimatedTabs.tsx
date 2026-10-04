import React, { useId } from 'react'
import { motion, LayoutGroup } from 'motion/react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface TabOption {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface AnimatedTabsProps {
  id?: string
  tabs: TabOption[]
  activeId: string
  onChange: (id: string) => void
  className?: string
  size?: 'sm' | 'md'
  variant?: 'pill' | 'underline'
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  id: customId,
  tabs,
  activeId,
  onChange,
  className,
  size = 'md',
  variant = 'pill',
}) => {
  const generatedId = useId()
  const groupId = customId || `tabs-${generatedId.replace(/:/g, '')}`

  const sizeClasses = {
    sm: variant === 'pill' ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-xs',
    md: variant === 'pill' ? 'px-4 py-2 text-xs sm:text-sm' : 'px-4 py-2.5 text-sm',
  }[size]

  return (
    <LayoutGroup id={groupId}>
      <nav
        aria-label="Tabs"
        className={cn(
          'relative inline-flex items-center max-w-full overflow-x-auto select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          variant === 'pill'
            ? 'p-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs gap-1'
            : 'border-b border-[var(--border-subtle)] gap-2 sm:gap-4',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'group relative inline-flex items-center gap-2 whitespace-nowrap outline-none cursor-pointer transition-colors duration-150',
                variant === 'pill' ? 'rounded-full' : 'pb-2.5 pt-1.5',
                variant === 'pill' && 'focus-visible:ring-1 focus-visible:ring-[var(--ink-primary)]',
                sizeClasses
              )}
            >
              {/* Active Spring Indicator */}
              {isActive && (
                <motion.div
                  layoutId={`active-tab-${groupId}`}
                  transition={SPRINGS.snappy}
                  className={cn(
                    'absolute',
                    variant === 'pill'
                      ? 'inset-0 rounded-full bg-[var(--ink-primary)] shadow-xs'
                      : 'bottom-0 left-0 right-0 h-0.5 bg-[var(--ink-primary)]'
                  )}
                />
              )}

              {/* Icon */}
              {tab.icon && (
                <span
                  className={cn(
                    'relative z-10 flex items-center justify-center transition-colors duration-150',
                    isActive
                      ? variant === 'pill'
                        ? 'text-[var(--accent-contrast)]'
                        : 'text-[var(--ink-primary)]'
                      : 'text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]'
                  )}
                >
                  {tab.icon}
                </span>
              )}

              {/* Label */}
              <span
                className={cn(
                  'relative z-10 font-sans transition-colors duration-150',
                  isActive
                    ? variant === 'pill'
                      ? 'text-[var(--accent-contrast)] font-semibold'
                      : 'text-[var(--ink-primary)] font-semibold'
                    : 'text-[var(--ink-muted)] font-medium group-hover:text-[var(--ink-primary)]'
                )}
              >
                {tab.label}
              </span>

              {/* Optional Count Badge */}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'relative z-10 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none transition-colors duration-150',
                    isActive
                      ? variant === 'pill'
                        ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                        : 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)]'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}
