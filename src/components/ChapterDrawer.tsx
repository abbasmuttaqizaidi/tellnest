import React, { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { Chapter, Work } from '../data/mockData'
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="h-full w-full max-w-md border-l border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 sm:p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] shadow-2xl flex flex-col justify-between overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                Index of Chapters
              </span>
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                {work.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Chapter Search using pill variant */}
          <div className="pt-4 pb-2">
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

          <div className="mt-4 space-y-2">
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
                  params={{ workId: work.id, chapterId: ch.id }}
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
                      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-[var(--ink-faint)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ch.readTimeMinutes} min
                        </span>
                        <span>{ch.wordCount.toLocaleString()} words</span>
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
            }))}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--border-subtle)] mt-8">
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
