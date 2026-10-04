import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch, ActivitiesCard } from '../design-system'
import {
  PenLine,
  Plus,
  BookOpen,
  Eye,
  BarChart3,
  Bookmark,
  Clock,
  MoreVertical,
  ExternalLink,
  Settings
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const Route = createFileRoute('/write/')({
  component: () => (
    <ProtectedRoute
      title="Writer Studio & Manuscript Vault"
      description="Sign in to draft, edit, publish, and manage your serialized novels, essays, and literary folios."
      featureBadge="Writer Studio"
    >
      <WriterDashboardPage />
    </ProtectedRoute>
  ),
})

function WriterDashboardPage() {
  const navigate = useNavigate()
  const { writerWorks, allWorks } = useApp()
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'drafts' | 'archived'>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'reads' | 'saves' | 'chapters'>('updated')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const filteredWorks = useMemo(() => {
    let works = writerWorks
    if (activeTab === 'published') works = works.filter((w) => w.status === 'Published')
    if (activeTab === 'drafts') works = works.filter((w) => w.status === 'Draft')
    if (activeTab === 'archived') works = works.filter((w) => w.status === 'Archived')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      works = works.filter(
        (w) => w.title.toLowerCase().includes(q) || w.category.toLowerCase().includes(q)
      )
    }

    return [...works].sort((a, b) => {
      if (sortBy === 'reads') return parseInt(b.totalReads.replace(/[^0-9]/g, '')) - parseInt(a.totalReads.replace(/[^0-9]/g, ''))
      if (sortBy === 'saves') return b.totalSaves - a.totalSaves
      if (sortBy === 'chapters') return b.chaptersCount - a.chaptersCount
      return b.lastUpdated.localeCompare(a.lastUpdated)
    })
  }, [writerWorks, activeTab, sortBy, searchQuery])

  // Total writer stats
  const totalReads = '162.7K'
  const totalSaves = 6110
  const activeDraftsCount = writerWorks.filter((w) => w.status === 'Draft').length

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[var(--border-subtle)] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            <PenLine className="h-3.5 w-3.5" />
            <span>Creator Studio</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
            Writer Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
            Manage your serialized manuscripts, review readership analytics, and craft new chapters.
          </p>
        </div>

        {/* Header Action Cluster */}
        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <ActivitiesCard
            size="sm"
            align="right"
            displayMode="popover"
            title="Studio Activity"
            subtitle="Recent milestones & alerts"
            className="w-56 sm:w-64"
            onAction={() => navigate({ to: '/notifications' })}
          />
          <Link
            to="/write/new"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 sm:px-5 sm:py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Work</span>
          </Link>
        </div>
      </div>

      {/* Writer Studio Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Published Works
          </span>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)] mt-1">
            {writerWorks.filter((w) => w.status === 'Published').length}
          </p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)] mt-0.5">Across 3 categories</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Total Readership
          </span>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)] mt-1">
            {totalReads}
          </p>
          <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">+14% this month</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Library Saves
          </span>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)] mt-1">
            {totalSaves.toLocaleString()}
          </p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)] mt-0.5">Active bookmarked readers</p>
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
            Active Drafts
          </span>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)] mt-1">
            {activeDraftsCount}
          </p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)] mt-0.5">Unpublished chapters</p>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-8 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDisclosure
            label="Manuscript Status"
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            items={[
              { id: 'all', label: `All Manuscripts (${writerWorks.length})` },
              { id: 'published', label: 'Published' },
              { id: 'drafts', label: `Drafts (${activeDraftsCount})` },
              { id: 'archived', label: 'Archived' },
            ]}
          />

          <FilterDisclosure
            label="Sort Order"
            activeId={sortBy}
            onChange={(id) => setSortBy(id as any)}
            items={[
              { id: 'updated', label: 'Recently Updated' },
              { id: 'reads', label: 'Most Readership' },
              { id: 'saves', label: 'Most Saves' },
              { id: 'chapters', label: 'Chapter Count' },
            ]}
          />
        </div>

        <AnimatedSearch
          variant="expandable"
          placeholder="Filter manuscripts..."
          value={searchQuery}
          onChange={setSearchQuery}
          shortcut="/"
        />
      </div>

      {/* Works List / Table */}
      {filteredWorks.length === 0 ? (
        <EmptyState
          type="no-drafts"
          customTitle="No works in this tab"
          customDescription="You have no manuscripts matching this category. Start drafting your next piece."
          actionLabel="Create Work"
          actionHref="/write/new"
        />
      ) : (
        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
          {filteredWorks.map((work) => {
            const fullWork = allWorks.find((w) => w.id === work.id || w.title === work.title) || allWorks[0]
            const firstChapter = fullWork.chapters[0]

            return (
              <div
                key={work.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-[var(--bg-canvas)] transition-colors"
              >
                {/* Work Details */}
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <img
                    src={work.cover}
                    alt={work.title}
                    className="h-16 w-12 rounded object-cover grayscale flex-shrink-0 border border-[var(--border-subtle)]"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase tracking-wider ${
                          work.status === 'Published'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : work.status === 'Draft'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-stone-500/15 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {work.status}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                        {work.category}
                      </span>
                    </div>

                    <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)] truncate mt-1">
                      {work.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)] mt-1">
                      <span>{work.chaptersCount} Chapters</span>
                      <span>•</span>
                      <span>{work.totalReads} Reads</span>
                      <span>•</span>
                      <span>{work.totalSaves} Saves</span>
                      <span>•</span>
                      <span className="text-[var(--ink-faint)]">Updated {work.lastUpdated}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
                  <Link
                    to="/write/editor/$workId/$chapterId"
                    params={{
                      workId: work.id,
                      chapterId: firstChapter ? firstChapter.id : 'ch-1'
                    }}
                    className="inline-flex items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline"
                  >
                    <PenLine className="h-3 w-3" />
                    <span>Write Chapter</span>
                  </Link>

                  <Link
                    to="/write/manage/$workId"
                    params={{ workId: work.id }}
                    className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors no-underline"
                  >
                    <span>Manage Chapters</span>
                  </Link>

                  <Link
                    to="/write/analytics/$workId"
                    params={{ workId: work.id }}
                    className="p-1.5 rounded border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] transition-colors"
                    title="View Work Analytics"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/works/$workId"
                    params={{ workId: work.id }}
                    className="p-1.5 rounded border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] transition-colors"
                    title="Public Overview"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
