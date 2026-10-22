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
}: SearchModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [panel, setPanel] = useState<'main' | 'genre'>('main')
  // Local draft slugs while genre panel is open (before Apply)
  const [draftSlugs, setDraftSlugs] = useState<string[]>(selectedGenreSlugs)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync draft when panel opens
  useEffect(() => {
    if (panel === 'genre') {
      setDraftSlugs(selectedGenreSlugs)
    }
  }, [panel, selectedGenreSlugs])

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
    setDraftSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug)
      }
      if (prev.length >= 3) {
        // Max 3 genres — do nothing
        return prev
      }
      return [...prev, slug]
    })
  }

  const handleApply = () => {
    onGenresChange(draftSlugs)
    onModeChange('genre')
    setIsOpen(false)
    setPanel('main')
  }

  const handleSelectMode = (m: SearchMode) => {
    if (m === 'genre') {
      setPanel('genre')
      return
    }
    onModeChange(m)
    setIsOpen(false)
    setPanel('main')
  }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Pill trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((v) => !v)
          setPanel('main')
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
              'min-w-52 max-w-72 rounded-xl',
              'border border-[var(--border-subtle)]',
              'bg-[var(--bg-surface)]',
              'p-1.5 shadow-2xl ring-1 ring-black/5'
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
                  {/* Back row */}
                  <button
                    type="button"
                    onClick={() => setPanel('main')}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1',
                      'font-mono text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors'
                    )}
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Search Mode</span>
                  </button>

                  {/* Genre list */}
                  {isGenresLoading ? (
                    <div className="flex items-center justify-center py-6 text-[var(--ink-muted)]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto overscroll-contain space-y-0.5 pr-0.5">
                      {genres.map((genre) => {
                        const isSelected = draftSlugs.includes(genre.slug)
                        const isDisabled = !isSelected && draftSlugs.length >= 3
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

                  {/* Apply button */}
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={draftSlugs.length === 0}
                    className={cn(
                      'w-full mt-2 py-1.5 rounded-lg',
                      'font-mono text-xs font-medium transition-opacity',
                      'bg-[var(--ink-primary)] text-[var(--accent-contrast)]',
                      draftSlugs.length === 0 && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {draftSlugs.length === 0
                      ? 'Select genres'
                      : `Apply ${draftSlugs.length} genre${draftSlugs.length > 1 ? 's' : ''}`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
