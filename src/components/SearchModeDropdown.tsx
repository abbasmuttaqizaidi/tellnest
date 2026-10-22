import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BookOpen, User, Tag, ChevronDown, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

export type SearchMode = 'stories' | 'author' | 'genre'

export interface GenreOption {
  id?: string
  slug: string
  name: string
}

interface SearchModeDropdownProps {
  mode: SearchMode
  selectedGenreSlugs: string[]
  genres: GenreOption[]
  isGenresLoading?: boolean
  onModeChange: (mode: SearchMode) => void
  onGenresChange: (slugs: string[]) => void
  onSearchSubmit?: (slugs: string[]) => void
}

const MODE_META: Record<SearchMode, { icon: React.ReactNode; label: string }> = {
  stories: { icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Stories' },
  author: { icon: <User className="w-3.5 h-3.5" />, label: 'Author' },
  genre: { icon: <Tag className="w-3.5 h-3.5" />, label: 'Genre' },
}

export function SearchModeDropdown({
  mode,
  selectedGenreSlugs,
  genres,
  isGenresLoading = false,
  onModeChange,
  onGenresChange,
  onSearchSubmit,
}: SearchModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [panel, setPanel] = useState<'main' | 'genre'>('main')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setPanel('main')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const currentMeta = MODE_META[mode]

  const pillLabel =
    mode === 'genre' && selectedGenreSlugs.length > 0
      ? `Genre (${selectedGenreSlugs.length})`
      : currentMeta.label

  const handleToggleGenreSlug = (slug: string) => {
    let nextSlugs: string[]
    if (selectedGenreSlugs.includes(slug)) {
      nextSlugs = selectedGenreSlugs.filter((s) => s !== slug)
    } else {
      if (selectedGenreSlugs.length >= 3) {
        // Max 3 genres — do nothing
        return
      }
      nextSlugs = [...selectedGenreSlugs, slug]
    }
    onGenresChange(nextSlugs)
    if (mode !== 'genre') {
      onModeChange('genre')
    }
  }

  const handleSelectMode = (m: SearchMode) => {
    if (m === 'genre') {
      onModeChange('genre')
      setPanel('genre')
      return
    }
    onModeChange(m)
    setIsOpen(false)
    setPanel('main')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && panel === 'genre') {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
      setPanel('main')
      if (selectedGenreSlugs.length > 0) {
        onSearchSubmit?.(selectedGenreSlugs)
      }
    }
  }

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className="relative flex-shrink-0">
      {/* Pill trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => {
            const next = !v
            if (next) {
              setPanel(mode === 'genre' ? 'genre' : 'main')
            } else {
              setPanel('main')
            }
            return next
          })
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-1',
          'font-mono text-xs text-[var(--ink-secondary)]',
          'hover:bg-[var(--bg-subtle)] transition-colors',
          'select-none whitespace-nowrap'
        )}
        aria-label="Search mode"
        aria-expanded={isOpen}
      >
        {currentMeta.icon}
        <span>{pillLabel}</span>
        <ChevronDown
          className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className={cn(
              'absolute top-full left-0 mt-2 z-50',
              panel === 'genre' ? 'w-68 sm:w-72' : 'w-48 sm:w-52',
              'rounded-xl border border-[var(--border-subtle)]',
              'bg-[var(--bg-surface)]',
              'p-2 shadow-2xl ring-1 ring-black/5'
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {panel === 'main' ? (
                <motion.div
                  key="main-panel"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.12 }}
                  className="space-y-0.5"
                >
                  {(['stories', 'author', 'genre'] as SearchMode[]).map((m) => {
                    const meta = MODE_META[m]
                    const isActive = mode === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMode(m)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left',
                          'font-mono text-xs transition-colors',
                          isActive
                            ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                            : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {meta.icon}
                          <span>{meta.label}</span>
                          {m === 'genre' && selectedGenreSlugs.length > 0 && (
                            <span className="ml-1 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-1.5 py-0.5 text-[10px] leading-none">
                              {selectedGenreSlugs.length}
                            </span>
                          )}
                        </span>
                        {m === 'genre' && (
                          <ChevronDown className="w-3 h-3 -rotate-90 text-[var(--ink-muted)]" />
                        )}
                        {isActive && m !== 'genre' && (
                          <Check className="w-3 h-3 text-[var(--ink-primary)]" />
                        )}
                      </button>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="genre-panel"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.12 }}
                >
                  {/* Top Header Row with Back, Clear, and Done */}
                  <div className="flex items-center justify-between px-1 pb-2 mb-1.5 border-b border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setPanel('main')}
                      className={cn(
                        'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                        'font-mono text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer'
                      )}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Mode</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {selectedGenreSlugs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onGenresChange([])}
                          className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] px-2 py-1 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false)
                          setPanel('main')
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-md font-mono text-xs font-medium transition-all cursor-pointer',
                          'bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 active:scale-95'
                        )}
                      >
                        Done{selectedGenreSlugs.length > 0 ? ` (${selectedGenreSlugs.length})` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Genre list */}
                  {isGenresLoading ? (
                    <div className="flex items-center justify-center py-6 text-[var(--ink-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto overscroll-contain space-y-0.5 pr-0.5">
                      {genres.map((genre) => {
                        const isSelected = selectedGenreSlugs.includes(genre.slug)
                        const isDisabled = !isSelected && selectedGenreSlugs.length >= 3
                        return (
                          <button
                            key={genre.slug}
                            type="button"
                            onClick={() => !isDisabled && handleToggleGenreSlug(genre.slug)}
                            title={isDisabled ? 'Max 3 genres selected' : undefined}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
                              'font-mono text-xs transition-colors',
                              isSelected
                                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                                : isDisabled
                                ? 'opacity-50 cursor-not-allowed text-[var(--ink-secondary)]'
                                : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                            )}
                          >
                            <span
                              className={cn(
                                'w-3.5 h-3.5 flex items-center justify-center rounded-sm border shrink-0 transition-colors',
                                isSelected
                                  ? 'border-[var(--accent-contrast)] bg-transparent'
                                  : 'border-[var(--border-strong)]'
                              )}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span className="truncate">{genre.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
