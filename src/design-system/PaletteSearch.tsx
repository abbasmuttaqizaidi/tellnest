import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, BookOpen, User, Compass, PenLine, X, ArrowRight, CornerDownLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface PaletteItem {
  id: string
  title: string
  category: 'Works' | 'Authors' | 'Navigation'
  subtitle?: string
  icon?: React.ReactNode
  href?: string
  action?: () => void
}

export interface PaletteSearchProps {
  isOpen: boolean
  onClose: () => void
  items?: PaletteItem[]
}

const DEFAULT_ITEMS: PaletteItem[] = [
  {
    id: 'w1',
    title: 'A Winter in Kyoto',
    category: 'Works',
    subtitle: 'By Kenji Takahashi • Literary / Essays',
    href: '/works/work-2',
  },
  {
    id: 'w2',
    title: 'Echoes in the Static',
    category: 'Works',
    subtitle: 'By Marcus Thorne • Sci-Fi / Cyberpunk',
    href: '/works/w2',
  },
  {
    id: 'a1',
    title: 'Elena Vance',
    category: 'Authors',
    subtitle: 'Author of 4 manuscripts • 142k reads',
    href: '/author/a1',
  },
  {
    id: 'nav-discover',
    title: 'Discover All Manuscripts',
    category: 'Navigation',
    subtitle: 'Browse library catalog with multi-filters',
    href: '/discover',
  },
  {
    id: 'nav-write',
    title: 'Writer Studio',
    category: 'Navigation',
    subtitle: 'Draft chapters and manage published works',
    href: '/write',
  },
]

export const PaletteSearch: React.FC<PaletteSearchProps> = ({
  isOpen,
  onClose,
  items = DEFAULT_ITEMS,
}) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Filter items
  const filtered = items.filter((item) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    )
  })

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = filtered[selectedIndex]
      if (selected) {
        handleSelect(selected)
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleSelect = (item: PaletteItem) => {
    onClose()
    if (item.action) {
      item.action()
    } else if (item.href) {
      navigate({ to: item.href as any })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={SPRINGS.smooth}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
          >
            {/* Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-[var(--border-subtle)] gap-3">
              <Search className="h-4 w-4 text-[var(--ink-muted)] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedIndex(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search manuscripts, authors, tags, or navigation..."
                className="w-full bg-transparent text-sm text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none font-sans"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="text-[var(--ink-faint)] hover:text-[var(--ink-primary)] p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--ink-muted)] font-mono">
                  No matches found for "{query}"
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === selectedIndex

                  let CategoryIcon = BookOpen
                  if (item.category === 'Authors') CategoryIcon = User
                  if (item.category === 'Navigation') CategoryIcon = Compass

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                        isSelected
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            'p-1.5 rounded',
                            isSelected
                              ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                              : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
                          )}
                        >
                          {item.icon || <CategoryIcon className="h-3.5 w-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              isSelected ? 'text-[var(--accent-contrast)]' : 'text-[var(--ink-primary)]'
                            )}
                          >
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p
                              className={cn(
                                'text-[11px] truncate',
                                isSelected ? 'text-[var(--accent-contrast)]/75' : 'text-[var(--ink-muted)]'
                              )}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                        <span
                          className={cn(
                            'font-mono text-[9px] uppercase px-1.5 py-0.5 rounded',
                            isSelected
                              ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                              : 'bg-[var(--bg-subtle)] text-[var(--ink-faint)]'
                          )}
                        >
                          {item.category}
                        </span>
                        {isSelected && <CornerDownLeft className="h-3 w-3 text-current opacity-70" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Keyboard Footer */}
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--ink-muted)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1 py-0.2">↑</kbd>
                  <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1 py-0.2">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-1 py-0.2">↵</kbd>
                  Select
                </span>
              </div>
              <span>Stories by Relay</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
