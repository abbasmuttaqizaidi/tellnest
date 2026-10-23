import React from 'react'
import { Link } from '@tanstack/react-router'
import { Badge, Button } from '../../design-system'
import type { WriterWorkSummary } from '../../data/mockData'
import { formatViewCount } from '../../lib/utils'

interface BookVolumeCardProps {
  work: WriterWorkSummary
  firstChapterId?: string
  onOpenFolio: (workId: string) => void
}

export const BookVolumeCard: React.FC<BookVolumeCardProps> = ({
  work,
  firstChapterId,
  onOpenFolio,
}) => {
  const resolvedFirstChapterId =
    firstChapterId && firstChapterId !== 'ch-1'
      ? firstChapterId
      : work.firstChapterId || work.chapters?.[0]?.id || 'first'

  const isDraft = work.status === 'Draft'
  const isArchived = work.status === 'Archived'

  const ribbonColor = isDraft
    ? 'bg-amber-500'
    : isArchived
    ? 'bg-stone-500'
    : 'bg-emerald-600'

  const statusVariant = work.status === 'Published'
    ? 'completed'
    : isDraft
    ? 'draft'
    : 'subtle'

  return (
    <div className="group relative flex flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-xs transition-all duration-200 overflow-hidden">
      {/* Top Hanging Ribbon Bookmark */}
      <div
        className={`absolute top-0 right-4 w-3.5 h-6 rounded-b-xs shadow-2xs z-10 ${ribbonColor}`}
        title={`Status: ${work.status}`}
      />

      {/* Book Cover Stage with 3D Spine */}
      <div
        className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-canvas)] cursor-pointer"
        onClick={() => onOpenFolio(work.id)}
      >
        <img
          src={work.cover}
          alt={work.title}
          className="w-full h-full object-cover grayscale-[25%] group-hover:grayscale-0 group-hover:scale-102 transition-all duration-300"
          loading="lazy"
        />

        {/* 3D Spine Shadow & Highlight */}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 left-[2px] w-[1px] bg-white/20 pointer-events-none" />

        {/* Bottom subtle shadow overlay */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--bg-surface)] to-transparent pointer-events-none" />

        {/* Quick Hover Overlay: Design System Buttons */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2 p-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onOpenFolio(work.id)
            }}
          >
            Open Folio
          </Button>

          <Link
            to="/write/editor/$workId/$chapterId"
            params={{ workId: work.id, chapterId: resolvedFirstChapterId }}
            onClick={(e) => e.stopPropagation()}
            className="no-underline"
          >
            <Button
              type="button"
              variant="primary"
              size="sm"
            >
              Write
            </Button>
          </Link>
        </div>
      </div>

      {/* Book Metadata & Title */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Badge variant={statusVariant} size="sm">
              {work.status}
            </Badge>
            <Badge variant="outline" size="sm">
              {work.category}
            </Badge>
          </div>

          <h3
            className="font-serif text-sm font-semibold text-[var(--ink-primary)] line-clamp-1 cursor-pointer"
            onClick={() => onOpenFolio(work.id)}
            title={work.title}
          >
            {work.title}
          </h3>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--ink-muted)] mt-1">
            <span>{work.chaptersCount} Ch</span>
            <span>•</span>
            <span title={`${formatViewCount(work.totalReads, false)} Reads`}>
              {formatViewCount(work.totalReads, true)} Reads
            </span>
            <span>•</span>
            <span title={`${formatViewCount(work.totalSaves, false)} Saves`}>
              {formatViewCount(work.totalSaves, true)} Saves
            </span>
          </div>
        </div>

        {/* Footer Actions Row - Text-only clean links without icons */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono">
          <span className="text-[10px] text-[var(--ink-faint)] truncate max-w-[100px]">
            {work.lastUpdated}
          </span>

          <div className="flex items-center gap-2">
            <Link
              to="/write/analytics/$workId"
              params={{ workId: work.id }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
              title="Story Analytics"
            >
              Stats
            </Link>
            <span className="text-[var(--border-strong)]">•</span>
            <Link
              to="/write/manage/$workId"
              params={{ workId: work.id }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
              title="Manage Acts & Outline"
            >
              Manage
            </Link>
            <span className="text-[var(--border-strong)]">•</span>
            <Link
              to="/works/$workId"
              params={{ workId: work.id }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
              title="View Public Story Page"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
