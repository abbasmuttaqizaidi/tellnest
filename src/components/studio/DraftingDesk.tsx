import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Badge, Button } from '../../design-system'
import type { WriterWorkSummary, Work, Chapter } from '../../data/mockData'

interface DraftingDeskProps {
  activeWork: WriterWorkSummary | null
  fullWork: Work | null
  activeChapter: Chapter | null
  onOpenFolio: (workId: string) => void
}

export const DraftingDesk: React.FC<DraftingDeskProps> = ({
  activeWork,
  fullWork,
  activeChapter,
  onOpenFolio,
}) => {
  const navigate = useNavigate()

  if (!activeWork) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-8 text-center shadow-2xs">
        <div className="max-w-md mx-auto space-y-3">
          <Badge variant="subtle" size="sm">
            Fresh Canvas
          </Badge>
          <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink-primary)]">
            A Clean Parchment Awaits
          </h2>
          <p className="font-serif text-xs text-[var(--ink-muted)] leading-relaxed">
            Your studio desk is set. No unfinished chapters or active drafts are calling.
          </p>
          <div className="pt-1">
            <Link to="/write/new" className="no-underline">
              <Button variant="primary" size="sm">
                Begin a New Manuscript
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const chapterId =
    activeChapter?.id ||
    activeWork.firstChapterId ||
    activeWork.chapters?.[0]?.id ||
    'first'
  const chapterTitle =
    activeChapter?.title ||
    activeWork.chapters?.[0]?.title ||
    'Chapter 1'
  const chapterWordCount =
    activeChapter?.wordCount ||
    (activeChapter?.content ? activeChapter.content.split(/\s+/).filter(Boolean).length : 0) ||
    activeWork.chapters?.[0]?.wordCount ||
    0
  const isDraftChapter = activeChapter?.status === 'draft' || activeWork.status === 'Draft'

  const snippet = activeChapter?.content
    ? activeChapter.content.replace(/<[^>]*>?/gm, '').trim().slice(0, 160) + '...'
    : activeWork.chapters?.[0]?.content
    ? activeWork.chapters[0].content.replace(/<[^>]*>?/gm, '').trim().slice(0, 160) + '...'
    : 'Silence hangs upon the unfinished lines. Return to the page and let the scene unfold...'

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xs">
      {/* Desk Header Banner */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]/40 text-[11px] font-mono text-[var(--ink-muted)]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="uppercase tracking-wider font-semibold text-[var(--ink-secondary)]">
            Active Desk
          </span>
          <span className="text-[var(--border-strong)]">•</span>
          <span>Last modified {activeWork.lastUpdated}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenFolio(activeWork.id)}
          className="hidden sm:inline-block hover:text-[var(--ink-primary)] transition-colors cursor-pointer select-none"
        >
          Inspect Folio Chapters
        </button>
      </div>

      {/* Main Desk Stage */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
        {/* Tactile Book Thumbnail with Spine & Hanging Bookmark */}
        <div
          className="relative shrink-0 group cursor-pointer"
          onClick={() => onOpenFolio(activeWork.id)}
        >
          {/* Bookmark Ribbon */}
          <div
            className={`absolute -top-1 left-3 w-3 h-5 rounded-b-xs shadow-2xs z-10 ${
              isDraftChapter ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
          />

          {/* Book Spine Highlight Overlay */}
          <div className="relative w-24 sm:w-28 aspect-[2/3] rounded-md overflow-hidden shadow-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <img
              src={activeWork.cover}
              alt={activeWork.title}
              className="w-full h-full object-cover grayscale-[25%] group-hover:grayscale-0 group-hover:scale-103 transition-all duration-300"
            />
            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 left-[2px] w-[1px] bg-white/20 pointer-events-none" />
          </div>
        </div>

        {/* Story & Chapter Details */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isDraftChapter ? 'draft' : 'completed'} size="sm">
              {isDraftChapter ? 'Draft in Progress' : 'Serializing'}
            </Badge>
            <Badge variant="outline" size="sm">
              {activeWork.category} {activeWork.genre ? `• ${activeWork.genre}` : ''}
            </Badge>
          </div>

          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)] leading-tight">
              {activeWork.title}
            </h2>
            <p className="font-serif text-xs font-medium text-[var(--ink-secondary)] mt-0.5">
              {chapterTitle}
            </p>
          </div>

          {/* Parchment Snippet */}
          <blockquote className="rounded-md border-l-2 border-[var(--border-strong)] bg-[var(--bg-subtle)]/50 px-3 py-1.5 font-serif italic text-xs text-[var(--ink-muted)] leading-relaxed">
            "{snippet}"
          </blockquote>

          {/* Chapter Metadata & Action Buttons */}
          <div className="pt-1.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)]">
              <span>{chapterWordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{activeWork.chaptersCount} total chapters</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenFolio(activeWork.id)}
              >
                Manage Folio
              </Button>

              <Link
                to="/works/$workId"
                params={{ workId: activeWork.id }}
                className="no-underline"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >
                  Preview
                </Button>
              </Link>

              <Link
                to="/write/editor/$workId/$chapterId"
                params={{ workId: activeWork.id, chapterId }}
                className="no-underline"
              >
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                >
                  Dip the Pen / Continue
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
