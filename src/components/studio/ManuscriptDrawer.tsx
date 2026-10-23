import React from 'react'
import { Link } from '@tanstack/react-router'
import { Drawer, Badge, Button } from '../../design-system'
import type { WriterWorkSummary, Work, Chapter } from '../../data/mockData'
import { formatViewCount } from '../../lib/utils'

interface ManuscriptDrawerProps {
  isOpen: boolean
  onClose: () => void
  work: WriterWorkSummary | null
  fullWork: Work | null
}

export const ManuscriptDrawer: React.FC<ManuscriptDrawerProps> = ({
  isOpen,
  onClose,
  work,
  fullWork,
}) => {
  if (!work) return null

  const chapters: Chapter[] = (work as any)?.chapters?.length
    ? (work as any).chapters
    : fullWork?.chapters || []
  const publishedChapters = chapters.filter((c) => c.status !== 'draft')
  const draftChapters = chapters.filter((c) => c.status === 'draft')
  const firstChapterId = chapters[0]?.id || (work as any)?.firstChapterId || 'first'

  const workStatusVariant = work.status === 'Published'
    ? 'completed'
    : work.status === 'Draft'
    ? 'draft'
    : 'subtle'

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      className="w-full sm:max-w-xl md:max-w-2xl bg-[var(--bg-canvas)]"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Folio Header Stage */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-start gap-4">
            {/* Book Cover with 3D spine */}
            <div className="relative w-20 aspect-[2/3] shrink-0 rounded-md overflow-hidden shadow-xs border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
              <img
                src={work.cover}
                alt={work.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
            </div>

            {/* Work Info */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={workStatusVariant} size="sm">
                  {work.status}
                </Badge>
                <Badge variant="outline" size="sm">
                  {work.category} {work.genre ? `• ${work.genre}` : ''}
                </Badge>
              </div>

              <h2 className="font-serif text-lg sm:text-xl font-semibold text-[var(--ink-primary)] leading-snug">
                {work.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)] pt-0.5">
                <span>{chapters.length} Chapters</span>
                <span>•</span>
                <span>{formatViewCount(work.totalReads, true)} Reads</span>
                <span>•</span>
                <span>{formatViewCount(work.totalSaves, true)} Saves</span>
              </div>
            </div>
          </div>

          {/* Quick Folio Actions Bar */}
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                to="/write/manage/$workId"
                params={{ workId: work.id }}
                className="no-underline"
              >
                <Button variant="outline" size="sm">
                  Outline & Acts
                </Button>
              </Link>

              <Link
                to="/write/analytics/$workId"
                params={{ workId: work.id }}
                className="no-underline"
              >
                <Button variant="outline" size="sm">
                  Analytics
                </Button>
              </Link>

              <Link
                to="/works/$workId"
                params={{ workId: work.id }}
                className="no-underline"
              >
                <Button variant="outline" size="sm">
                  Reader View
                </Button>
              </Link>
            </div>

            <Link
              to="/write/editor/$workId/$chapterId"
              params={{
                workId: work.id,
                chapterId: firstChapterId,
              }}
              className="no-underline"
            >
              <Button variant="primary" size="sm">
                Write in Editor
              </Button>
            </Link>
          </div>
        </div>

        {/* Chapters Table of Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-semibold tracking-tight text-[var(--ink-primary)]">
              Table of Contents ({chapters.length})
            </h3>

            <div className="font-mono text-[10px] text-[var(--ink-muted)] flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {publishedChapters.length} Published
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {draftChapters.length} Drafts
              </span>
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
              <p className="font-serif text-xs text-[var(--ink-muted)]">
                No chapters added to this manuscript yet.
              </p>
              <Link
                to="/write/editor/$workId/$chapterId"
                params={{ workId: work.id, chapterId: firstChapterId }}
                className="no-underline"
              >
                <Button variant="primary" size="sm">
                  Pen First Chapter
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
              {chapters.map((chapter, index) => {
                const isDraft = chapter.status === 'draft'
                const wordCount =
                  chapter.wordCount ||
                  (chapter.content ? chapter.content.split(/\s+/).filter(Boolean).length : 0)

                return (
                  <div
                    key={chapter.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-canvas)] transition-colors group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="font-mono text-xs text-[var(--ink-faint)] w-5 text-right shrink-0">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-medium text-[var(--ink-primary)] truncate">
                            {chapter.title}
                          </h4>
                          <Badge
                            variant={isDraft ? 'draft' : 'completed'}
                            size="sm"
                          >
                            {isDraft ? 'Draft' : 'Published'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--ink-muted)] mt-0.5">
                          <span>{wordCount.toLocaleString()} words</span>
                          {chapter.readTimeMinutes && (
                            <>
                              <span>•</span>
                              <span>{chapter.readTimeMinutes} min read</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/write/editor/$workId/$chapterId"
                      params={{
                        workId: work.id,
                        chapterId: chapter.id,
                      }}
                      className="no-underline shrink-0"
                    >
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  )
}
