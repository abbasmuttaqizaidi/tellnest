import React from 'react'
import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  Bookmark,
  Clock,
  Users,
  PenLine,
  Search,
  Bell,
  FileText
} from 'lucide-react'

export type EmptyStateType =
  | 'no-works'
  | 'no-saved'
  | 'no-history'
  | 'no-following'
  | 'no-drafts'
  | 'no-published'
  | 'no-search'
  | 'no-notifications'

interface EmptyStateProps {
  type: EmptyStateType
  customTitle?: string
  customDescription?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: React.ElementType
    title: string
    description: string
    defaultActionLabel: string
    defaultActionHref: string
  }
> = {
  'no-works': {
    icon: BookOpen,
    title: 'No works in catalog',
    description: 'This section does not have any published works yet. Check back soon or explore other categories.',
    defaultActionLabel: 'Explore Discover',
    defaultActionHref: '/discover'
  },
  'no-saved': {
    icon: Bookmark,
    title: 'Your library is empty',
    description: 'Bookmark manuscripts, essays, and serialized novels to build your personal reading repository.',
    defaultActionLabel: 'Browse Featured Works',
    defaultActionHref: '/discover'
  },
  'no-history': {
    icon: Clock,
    title: 'No reading history yet',
    description: 'When you begin reading chapters, your reading progress and history will be cataloged here automatically.',
    defaultActionLabel: 'Start Reading a Story',
    defaultActionHref: '/discover'
  },
  'no-following': {
    icon: Users,
    title: 'Not following any authors yet',
    description: 'Follow writers whose prose speaks to you to receive chapter dispatches and new releases directly.',
    defaultActionLabel: 'Discover Writers',
    defaultActionHref: '/discover'
  },
  'no-drafts': {
    icon: PenLine,
    title: 'No active drafts',
    description: 'Every great manuscript begins with a solitary sentence. Open the editor and begin a new chapter.',
    defaultActionLabel: 'Create New Draft',
    defaultActionHref: '/write/new'
  },
  'no-published': {
    icon: FileText,
    title: 'No published works yet',
    description: 'You have not released any completed or ongoing manuscripts to the Relay Stories library.',
    defaultActionLabel: 'Publish Your First Work',
    defaultActionHref: '/write/new'
  },
  'no-search': {
    icon: Search,
    title: 'No matching records found',
    description: 'We could not find any works, authors, or genres matching your inquiry. Try adjusting keywords.',
    defaultActionLabel: 'Reset Search Filters',
    defaultActionHref: '/search'
  },
  'no-notifications': {
    icon: Bell,
    title: 'All caught up',
    description: 'You have no pending notifications, chapter updates, or replies.',
    defaultActionLabel: 'Return Home',
    defaultActionHref: '/'
  }
}

export default function EmptyState({
  type,
  customTitle,
  customDescription,
  actionLabel,
  actionHref,
  onAction
}: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon

  const finalTitle = customTitle || config.title
  const finalDesc = customDescription || config.description
  const finalActionLabel = actionLabel || config.defaultActionLabel
  const finalActionHref = actionHref || config.defaultActionHref

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 font-serif text-lg font-semibold text-[var(--ink-primary)]">
        {finalTitle}
      </h3>

      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--ink-muted)]">
        {finalDesc}
      </p>

      {onAction ? (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity"
        >
          {finalActionLabel}
        </button>
      ) : (
        <Link
          to={finalActionHref as any}
          className="mt-5 inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline"
        >
          {finalActionLabel}
        </Link>
      )}
    </div>
  )
}
