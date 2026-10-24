import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'
import {
  PenLine,
  Plus,
  Search,
  X,
  BookOpen,
} from 'lucide-react'

export const Route = createFileRoute('/write/')({
  head: () =>
    generateMeta({
      title: 'Writer Studio & Stories',
      description: 'Craft, serialize, edit, and bind your serialized manuscripts on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Writer's Studio"
      description="Your private creative space to craft, edit, and publish stories."
      featureBadge="Writer Studio"
    >
      <WriterStudioPage />
    </ProtectedRoute>
  ),
})

function WriterStudioPage() {
  const { writerWorks, isWriterWorksLoading, allWorks } = useApp()

  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const publishedWorksCount = useMemo(
    () => writerWorks.filter((w) => w.status === 'Published').length,
    [writerWorks]
  )

  const draftsCount = useMemo(
    () => writerWorks.filter((w) => w.status === 'Draft').length,
    [writerWorks]
  )

  const filteredWorks = useMemo(() => {
    let list = writerWorks

    if (filterTab === 'published') {
      list = list.filter((w) => w.status === 'Published')
    } else if (filterTab === 'draft') {
      list = list.filter((w) => w.status === 'Draft')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.category && w.category.toLowerCase().includes(q)) ||
          (w.genre && w.genre.toLowerCase().includes(q))
      )
    }

    return list
  }, [writerWorks, filterTab, searchQuery])

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] pb-16 selection:bg-[var(--ink-primary)] selection:text-[var(--accent-contrast)]">
      {/* Studio Header: Clean, Writer-First */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-xs">
              <PenLine className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
                Stories
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/write/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black hover:bg-stone-800 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold shadow-xs transition-colors no-underline cursor-pointer"
            >
              <Plus className="h-4 w-4 text-white" strokeWidth={2.2} />
              <span>New Story</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Full-Width Tabs with Right-Aligned Search (Matching /write/manage pattern) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          {/* Tabs */}
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto -mb-px">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>All Stories</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'all'
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {writerWorks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('published')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'published'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Published</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'published'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {publishedWorksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('draft')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'draft'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Drafts</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'draft'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {draftsCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center pb-2.5 sm:pb-2 sm:w-64 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans bg-[var(--bg-canvas)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--ink-primary)] focus:ring-1 focus:ring-[var(--ink-primary)] rounded-full pl-8.5 pr-8 py-1.5 shadow-2xs focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stories Grid (Option A: Visual Cover Cards) */}
        {filteredWorks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--ink-muted)]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                {searchQuery ? 'No stories match your search' : 'No manuscripts here yet'}
              </h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] mt-1">
                {searchQuery
                  ? 'Try searching with a different title or keyword.'
                  : 'Start penning your next serialized story.'}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-mono underline text-[var(--ink-primary)] hover:opacity-80 cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <Link
                to="/write/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-black text-white px-4 py-2 text-xs font-semibold shadow-xs hover:bg-stone-800 transition-colors no-underline"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span>Create New Story</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* Create New Story Dashed Card */}
            <Link
              to="/write/new"
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--ink-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/40 p-6 min-h-[300px] text-center transition-all duration-200 no-underline shadow-2xs cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                New Story
              </h4>
              <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-1 max-w-[160px]">
                Start a new serialized manuscript
              </p>
            </Link>

            {/* Story Cover Cards */}
            {filteredWorks.map((work) => {
              const fullWork = allWorks.find((w) => w.id === work.id || w.title === work.title)
              const firstChapterId =
                work.firstChapterId && work.firstChapterId !== 'ch-1'
                  ? work.firstChapterId
                  : work.chapters?.[0]?.id || fullWork?.chapters?.[0]?.id || 'first'
              const isDraft = work.status === 'Draft'
              const isPublished = work.status === 'Published'

              return (
                <div
                  key={work.id}
                  className="group relative flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Book Cover */}
                  <Link
                    to="/write/manage/$workId"
                    params={{ workId: work.id }}
                    className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-canvas)] block no-underline cursor-pointer"
                  >
                    <img
                      src={work.cover}
                      alt={work.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Status Pill on Cover */}
                    <div className="absolute top-2.5 left-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold backdrop-blur-md shadow-xs ${
                          isPublished
                            ? 'bg-emerald-600 text-white'
                            : isDraft
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-700 text-white'
                        }`}
                      >
                        {work.status}
                      </span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center p-2">
                      <span className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--ink-primary)] text-xs font-semibold shadow-md">
                        Open Outline
                      </span>
                    </div>
                  </Link>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <Link
                        to="/write/manage/$workId"
                        params={{ workId: work.id }}
                        className="font-serif text-base font-semibold text-[var(--ink-primary)] hover:underline line-clamp-1 block no-underline"
                        title={work.title}
                      >
                        {work.title}
                      </Link>

                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)] mt-1">
                        <span>{work.chaptersCount} {work.chaptersCount === 1 ? 'ch' : 'chs'}</span>
                        <span>•</span>
                        <span>{work.category}</span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <Link
                        to="/write/manage/$workId"
                        params={{ workId: work.id }}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--ink-primary)] text-xs font-medium transition-colors no-underline cursor-pointer"
                      >
                        Manage
                      </Link>

                      <Link
                        to="/write/editor/$workId/$chapterId"
                        params={{ workId: work.id, chapterId: firstChapterId }}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-black hover:bg-stone-800 text-white text-xs font-semibold transition-colors no-underline shadow-2xs cursor-pointer"
                      >
                        Write
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
