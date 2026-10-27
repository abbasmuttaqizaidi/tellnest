import React, { useState, useMemo, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import type { Chapter, Work } from '../data/mockData'
import { getWorkSlug } from '../data/mockData'
import { X, CheckCircle2, Clock } from 'lucide-react'
import { AnimatedSearch } from '../design-system'

interface ChapterDrawerProps {
  work: Work
  currentChapterId: string
  isOpen: boolean
  onClose: () => void
}

export default function ChapterDrawer({
  work,
  currentChapterId,
  isOpen,
  onClose
}: ChapterDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return work.chapters
    const q = searchQuery.toLowerCase()
    return work.chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(q) ||
        (ch.subtitle && ch.subtitle.toLowerCase().includes(q)) ||
        String(ch.number).includes(q)
    )
  }, [work.chapters, searchQuery])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:flex-row sm:justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        className="w-full h-[90vh] max-h-[90vh] rounded-t-2xl border-t border-x border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-6 shadow-2xl flex flex-col justify-between overflow-hidden cursor-default sm:h-full sm:max-h-full sm:w-full sm:max-w-md sm:rounded-none sm:border-t-0 sm:border-x-0 sm:border-l animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Mobile Bottom Sheet Pull Pill Indicator */}
          <div className="w-12 h-1 rounded-full bg-[var(--border-strong)] mx-auto mb-2 shrink-0 sm:hidden" />

          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Index of Chapters
              </span>
              <h3 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)] leading-tight">
                {work.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Close Index"
              aria-label="Close Index"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Chapter Search using pill variant */}
          <div className="pt-3 pb-2 shrink-0">
            <AnimatedSearch
              variant="pill"
              size="sm"
              placeholder="Find chapter..."
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              resultsCount={searchQuery.trim() ? filteredChapters.length : undefined}
            />
          </div>

          {/* Scrollable Chapters List */}
          <div className="mt-2 flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 custom-scrollbar">
            {filteredChapters.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--ink-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
                No chapters matching "{searchQuery}"
              </div>
            ) : (
              filteredChapters.map((ch) => {
                const isCurrent = ch.id === currentChapterId
                return (
                  <Link
                    key={ch.id}
                    to="/read/$workId/$chapterId"
                    params={{ workId: getWorkSlug(work), chapterId: ch.id }}
                    onClick={onClose}
                    className={`group flex items-start justify-between rounded-lg p-3 text-left transition-all no-underline ${
                      isCurrent
                        ? 'border border-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                        : 'border border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs font-semibold text-[var(--ink-faint)] pt-0.5">
                        {String(ch.number).padStart(2, '0')}
                      </span>
                      <div>
                        <p
                          className={`font-serif text-sm leading-snug group-hover:underline ${
                            isCurrent
                              ? 'font-semibold text-[var(--ink-primary)]'
                              : 'text-[var(--ink-secondary)]'
                          }`}
                        >
                          {ch.title}
                        </p>
                        {ch.subtitle && (
                          <p className="mt-0.5 text-xs text-[var(--ink-muted)] font-serif italic">
                            {ch.subtitle}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-[var(--ink-faint)] whitespace-nowrap">
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            {ch.readTimeMinutes} min read
                          </span>
                          <span className="shrink-0">•</span>
                          <span className="shrink-0">{ch.wordCount.toLocaleString()} words</span>
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="rounded bg-[var(--ink-primary)] px-2 py-0.5 font-mono text-[9px] font-medium text-[var(--accent-contrast)] uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Fixed Drawer Footer */}
        <div className="pt-3 border-t border-[var(--border-subtle)] mt-3 shrink-0">
          <Link
            to="/works/$workId"
            params={{ workId: work.id }}
            onClick={onClose}
            className="block text-center rounded border border-[var(--border-strong)] py-2 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
          >
            View Work Overview Page
          </Link>
        </div>
      </div>
    </div>
  )
}
