import React, { useState, useRef, useEffect, useId, type FC } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { Check, Filter, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface FilterOption {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface FilterDisclosureProps {
  items: FilterOption[]
  activeId?: string
  defaultActiveId?: string
  onChange?: (id: string) => void
  label?: string
  className?: string
  align?: 'left' | 'right'
  disabled?: boolean
}

export const FilterDisclosure: FC<FilterDisclosureProps> = ({
  items,
  activeId: controlledActiveId,
  defaultActiveId,
  onChange,
  label = 'Filter Catalog',
  className,
  align = 'right',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const uniqueId = useId()
  const layoutId = `filter-disclosure-${uniqueId}`

  const containerRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const [internalActive, setInternalActive] = useState<string>(
    defaultActiveId || items[0]?.id || ''
  )

  const isControlled = controlledActiveId !== undefined
  const active = isControlled ? controlledActiveId : internalActive

  const activeItem = items.find((i) => i.id === active) || items[0]

  // Cleanup pending close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  // Outside click & Escape key listener
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (id: string) => {
    if (!isControlled) {
      setInternalActive(id)
    }
    onChange?.(id)

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
    }, 180)
  }

  // Keyboard navigation within listbox
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return

    const currentIndex = items.findIndex((i) => i.id === active)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % items.length
      handleSelect(items[nextIndex].id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + items.length) % items.length
      handleSelect(items[prevIndex].id)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center font-sans select-none', className)}
    >
      <MotionConfig transition={SPRINGS.smooth}>
        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            <motion.div
              key="open"
              layoutId={layoutId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
              role="listbox"
              aria-label={label}
              onKeyDown={handleListKeyDown}
              tabIndex={-1}
              className={cn(
                'absolute top-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-2xl',
                align === 'left' ? 'left-0' : 'right-0'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="font-mono text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-0.5 inline-flex items-center gap-1 cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="h-3 w-3" />
                  <span>Esc</span>
                </button>
              </div>

              {/* Items List */}
              <div ref={listRef} className="space-y-0.5 max-h-72 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-4 text-center text-xs font-mono text-[var(--ink-muted)]">
                    No options available
                  </div>
                ) : (
                  items.map((item, index) => {
                    const selected = active === item.id

                    return (
                      <motion.button
                        key={item.id}
                        role="option"
                        aria-selected={selected}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSelect(item.id)}
                        whileTap={{ scale: 0.98 }}
                        transition={{ ...SPRINGS.snappy, delay: index * 0.025 }}
                        className={cn(
                          'flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition-colors text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-primary)]',
                          selected
                            ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                            : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.icon && (
                            <span
                              className={cn(
                                'flex-shrink-0',
                                selected ? 'text-[var(--accent-contrast)]' : 'text-[var(--ink-muted)]'
                              )}
                            >
                              {item.icon}
                            </span>
                          )}
                          <span className="font-medium truncate">{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.badge !== undefined && (
                            <span
                              className={cn(
                                'font-mono text-[10px] px-1.5 py-0.2 rounded-full',
                                selected
                                  ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                                  : 'bg-[var(--bg-subtle)] text-[var(--ink-faint)]'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}

                          <div
                            className={cn(
                              'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all',
                              selected
                                ? 'border-transparent bg-[var(--accent-contrast)] text-[var(--ink-primary)]'
                                : 'border-[var(--border-strong)]'
                            )}
                          >
                            {selected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      </motion.button>
                    )
                  })
                )}
              </div>
            </motion.div>
          ) : (
            <div key="close" className="flex items-center">
              <motion.button
                layoutId={layoutId}
                type="button"
                disabled={disabled || items.length === 0}
                onClick={() => setOpen(true)}
                whileHover={disabled ? undefined : { scale: 1.02 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                aria-haspopup="listbox"
                aria-expanded={false}
                aria-label={label}
                className={cn(
                  'z-20 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 shadow-xs text-xs font-medium text-[var(--ink-secondary)] transition-colors',
                  disabled || items.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] cursor-pointer'
                )}
              >
                <Filter className="h-3.5 w-3.5 text-[var(--ink-muted)] flex-shrink-0" />
                <span className="font-sans font-medium truncate max-w-[12rem]">
                  {activeItem?.label || (items.length === 0 ? 'No Options' : 'Filter')}
                </span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  )
}
