import React, { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { WriterWorkSummary, Work } from '../../data/mockData'
import { BookVolumeCard } from './BookVolumeCard'
import { AnimatedTabs, AnimatedSearch, DropdownSelect, Button, type TabOption, type SelectOption } from '../../design-system'

interface WriterShelfProps {
  works: WriterWorkSummary[]
  allWorks: Work[]
  onOpenFolio: (workId: string) => void
}

const SORT_OPTIONS: SelectOption[] = [
  { id: 'updated', label: 'Recently Penned' },
  { id: 'reads', label: 'Most Reads' },
  { id: 'saves', label: 'Most Saves' },
  { id: 'chapters', label: 'Chapters' },
]

export const WriterShelf: React.FC<WriterShelfProps> = ({
  works,
  allWorks,
  onOpenFolio,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'drafts' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'reads' | 'saves' | 'chapters'>('updated')

  // Counts
  const publishedCount = useMemo(() => works.filter((w) => w.status === 'Published').length, [works])
  const draftsCount = useMemo(() => works.filter((w) => w.status === 'Draft').length, [works])
  const archivedCount = useMemo(() => works.filter((w) => w.status === 'Archived').length, [works])

  // Design System Animated Tabs Definition
  const tabs: TabOption[] = useMemo(() => {
    const list: TabOption[] = [
      { id: 'all', label: 'All Volumes', badge: works.length },
      { id: 'published', label: 'Serializing', badge: publishedCount },
      { id: 'drafts', label: 'Drafts', badge: draftsCount },
    ]
    if (archivedCount > 0) {
      list.push({ id: 'archived', label: 'Archived', badge: archivedCount })
    }
    return list
  }, [works.length, publishedCount, draftsCount, archivedCount])

  const filteredWorks = useMemo(() => {
    let list = works
    if (filterTab === 'published') list = list.filter((w) => w.status === 'Published')
    if (filterTab === 'drafts') list = list.filter((w) => w.status === 'Draft')
    if (filterTab === 'archived') list = list.filter((w) => w.status === 'Archived')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.category.toLowerCase().includes(q) ||
          (w.genre && w.genre.toLowerCase().includes(q))
      )
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'reads') {
        const aVal = parseInt(a.totalReads.replace(/[^0-9]/g, '')) || 0
        const bVal = parseInt(b.totalReads.replace(/[^0-9]/g, '')) || 0
        return bVal - aVal
      }
      if (sortBy === 'saves') return b.totalSaves - a.totalSaves
      if (sortBy === 'chapters') return b.chaptersCount - a.chaptersCount
      return b.lastUpdated.localeCompare(a.lastUpdated)
    })
  }, [works, filterTab, searchQuery, sortBy])

  return (
    <section className="space-y-4">
      {/* Shelf Header & Filter Controls via Design System */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
        {/* Animated Tabs */}
        <div className="flex items-center overflow-x-auto">
          <AnimatedTabs
            tabs={tabs}
            activeId={filterTab}
            onChange={(id) => setFilterTab(id as any)}
            variant="pill"
            size="sm"
          />
        </div>

        {/* Search & DropdownSelect Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex-1 sm:w-52">
            <AnimatedSearch
              variant="compact"
              placeholder="Filter shelf..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="w-40">
            <DropdownSelect
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Grid of Volumes */}
      {filteredWorks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 p-8 text-center space-y-3">
          <p className="font-serif text-sm text-[var(--ink-muted)]">
            No manuscripts found under this section.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterTab('all')
              setSearchQuery('')
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* New Manuscript Tactile Card */}
          <Link
            to="/write/new"
            className="group relative flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] hover:border-[var(--ink-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/60 p-4 min-h-[160px] text-center transition-all duration-200 no-underline shadow-2xs"
          >
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]">
              + New Work
            </span>
            <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] mt-1.5">
              Bind a Manuscript
            </h4>
            <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-1 max-w-[160px]">
              Set title and start your serialized story
            </p>
          </Link>

          {/* Render Each Book Volume */}
          {filteredWorks.map((work) => {
            const fullWork = allWorks.find((w) => w.id === work.id || w.title === work.title)
            const firstChapterId = work.firstChapterId || work.chapters?.[0]?.id || fullWork?.chapters?.[0]?.id || 'first'

            return (
              <BookVolumeCard
                key={work.id}
                work={work}
                firstChapterId={firstChapterId}
                onOpenFolio={onOpenFolio}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}
