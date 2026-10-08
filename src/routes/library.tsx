import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, FilterDisclosure, AnimatedSearch, ActivitiesCard } from '../design-system'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Bookmark, Clock, CheckCircle2, BookOpen, ArrowRight, Play, Sparkles } from 'lucide-react'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/library')({
  head: () =>
    generateMeta({
      title: 'Your Reading Library',
      description: 'Your private synchronized reading history, bookmarks, and saved manuscripts on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Personal Reading Library"
      description="Sign in to synchronize your reading progress, active chapters, and bookmarked folios across all your devices."
      featureBadge="Private Library"
    >
      <LibraryPage />
    </ProtectedRoute>
  ),
})

function LibraryPage() {
  const { allWorks, savedWorkIds, readingProgress } = useApp()
  const [activeTab, setActiveTab] = useState<'continue' | 'saved' | 'completed' | 'history'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'saved' || tabParam === 'completed' || tabParam === 'history' || tabParam === 'continue') {
        return tabParam
      }
    }
    return 'continue'
  })

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabId)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const [savedCategoryFilter, setSavedCategoryFilter] = useState<string>('all')
  const [savedSortBy, setSavedSortBy] = useState<'recent' | 'reads' | 'title'>('recent')
  const [savedSearchQuery, setSavedSearchQuery] = useState<string>('')
  const [savedSearchScope, setSavedSearchScope] = useState<string>('all')

  // Continue reading works (works where reader has an active progress entry)
  const continueReadingItems = useMemo(() => {
    return Object.values(readingProgress)
      .map((prog) => {
        const work = allWorks.find((w) => w.id === prog.workId)
        return work ? { work, progress: prog } : null
      })
      .filter(Boolean) as { work: typeof allWorks[0]; progress: typeof readingProgress[string] }[]
  }, [allWorks, readingProgress])

  // Saved works
  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  // Filtered and sorted saved works
  const displayedSavedWorks = useMemo(() => {
    let works = savedWorks
    if (savedCategoryFilter !== 'all') {
      works = works.filter((w) => w.category === savedCategoryFilter)
    }
    if (savedSearchQuery.trim()) {
      const q = savedSearchQuery.toLowerCase()
      works = works.filter((w) => {
        if (savedSearchScope === 'titles') return w.title.toLowerCase().includes(q)
        if (savedSearchScope === 'authors') return w.author.name.toLowerCase().includes(q)
        if (savedSearchScope === 'tags') return w.tags.some((t) => t.toLowerCase().includes(q))
        return (
          w.title.toLowerCase().includes(q) ||
          w.author.name.toLowerCase().includes(q) ||
          w.synopsis.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    }
    return [...works].sort((a, b) => {
      if (savedSortBy === 'reads') return parseInt(b.totalReads) - parseInt(a.totalReads)
      if (savedSortBy === 'title') return a.title.localeCompare(b.title)
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [savedWorks, savedCategoryFilter, savedSortBy, savedSearchQuery, savedSearchScope])

  // Completed works
  const completedWorks = useMemo(() => {
    return allWorks.filter((w) => {
      const prog = readingProgress[w.id]
      return w.status === 'Completed' || (prog && prog.progressPercent >= 100)
    })
  }, [allWorks, readingProgress])

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="pb-8 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
          <Bookmark className="h-3.5 w-3.5" />
          <span>Reader Repository</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Personal Reading Library
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
          Resume unfinished chapters, review bookmarked works, and track your literary reading history.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="py-4 border-b border-[var(--border-subtle)] mb-8 flex items-center justify-between overflow-x-auto">
        <AnimatedTabs
          size="sm"
          activeId={activeTab}
          onChange={handleTabChange}
          tabs={[
            {
              id: 'continue',
              label: 'Continue Reading',
              icon: <Play className="h-3.5 w-3.5" />,
              badge: continueReadingItems.length,
            },
            {
              id: 'saved',
              label: 'Saved Works',
              icon: <Bookmark className="h-3.5 w-3.5" />,
              badge: savedWorks.length,
            },
            {
              id: 'completed',
              label: 'Completed',
              icon: <CheckCircle2 className="h-3.5 w-3.5" />,
              badge: completedWorks.length,
            },
            {
              id: 'history',
              label: 'Reading History',
              icon: <Clock className="h-3.5 w-3.5" />,
              badge: continueReadingItems.length,
            },
          ]}
        />
      </div>

      {/* Tab 1: Continue Reading (Highly Visible) */}
      {activeTab === 'continue' && (
        <div className="space-y-6">
          {continueReadingItems.length === 0 ? (
            <EmptyState
              type="no-history"
              customTitle="No active manuscripts"
              customDescription="Pick a manuscript from the discovery catalog to start reading."
              actionLabel="Discover Stories"
              actionHref="/discover"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {continueReadingItems.map(({ work, progress }) => (
                <div
                  key={work.id}
                  className="flex flex-col sm:flex-row gap-5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 hover:border-[var(--ink-primary)] transition-all shadow-xs"
                >
                  <img
                    src={work.cover}
                    alt={work.title}
                    className="aspect-[3/4] w-24 sm:w-28 rounded object-cover flex-shrink-0 grayscale"
                  />

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                        {work.category} • Chapter {progress.chapterNumber}
                      </span>

                      <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mt-1 leading-snug">
                        {work.title}
                      </h3>

                      <p className="text-xs text-[var(--ink-muted)] font-serif italic mt-0.5">
                        {progress.chapterTitle}
                      </p>

                      <p className="text-[11px] text-[var(--ink-faint)] font-mono mt-2">
                        By {work.author.name} • Last read {progress.lastReadAt}
                      </p>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] font-mono text-[var(--ink-muted)] mb-1">
                          <span>Chapter Progress</span>
                          <span className="font-semibold text-[var(--ink-primary)]">
                            {progress.progressPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--ink-primary)] rounded-full transition-all"
                            style={{ width: `${progress.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between">
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: work.id, chapterId: progress.chapterId }}
                        className="inline-flex items-center gap-1.5 rounded bg-[var(--ink-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline"
                      >
                        <Play className="h-3 w-3" />
                        <span>Resume Reading</span>
                      </Link>

                      <Link
                        to="/works/$workId"
                        params={{ workId: work.id }}
                        className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline"
                      >
                        All Chapters
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Works */}
      {activeTab === 'saved' && (
        <div>
          {savedWorks.length === 0 ? (
            <EmptyState
              type="no-saved"
              actionLabel="Discover Stories to Bookmark"
              actionHref="/discover"
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-8 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDisclosure
                    label="Category"
                    activeId={savedCategoryFilter}
                    onChange={setSavedCategoryFilter}
                    items={[
                      { id: 'all', label: `All Categories (${savedWorks.length})` },
                      { id: 'Novels', label: 'Novels' },
                      { id: 'Essays', label: 'Essays' },
                      { id: 'Poetry', label: 'Poetry' },
                      { id: 'Short Stories', label: 'Short Stories' },
                    ]}
                  />

                  <FilterDisclosure
                    label="Sort Order"
                    activeId={savedSortBy}
                    onChange={(id) => setSavedSortBy(id as any)}
                    items={[
                      { id: 'recent', label: 'Recently Updated' },
                      { id: 'reads', label: 'Most Popular' },
                      { id: 'title', label: 'Title (A-Z)' },
                    ]}
                  />
                </div>

                <AnimatedSearch
                  variant="split-pill"
                  size="sm"
                  placeholder="Search saved works..."
                  value={savedSearchQuery}
                  onChange={setSavedSearchQuery}
                  onClear={() => setSavedSearchQuery('')}
                  scopes={[
                    { id: 'all', label: 'All' },
                    { id: 'titles', label: 'Titles' },
                    { id: 'authors', label: 'Authors' },
                    { id: 'tags', label: 'Tags' },
                  ]}
                  activeScope={savedSearchScope}
                  onScopeChange={setSavedSearchScope}
                  shortcut="/"
                />
              </div>

              {displayedSavedWorks.length === 0 ? (
                <EmptyState
                  type="no-works"
                  customTitle="No saved works in this category"
                  customDescription="None of your saved manuscripts match the selected category filter."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {displayedSavedWorks.map((work) => (
                    <WorkCard key={work.id} work={work} layout="portrait" />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Completed */}
      {activeTab === 'completed' && (
        <div>
          {completedWorks.length === 0 ? (
            <EmptyState
              type="no-works"
              customTitle="No completed manuscripts yet"
              customDescription="As you finish reading complete works or novels, they will be archived here."
              actionLabel="Explore Completed Works"
              actionHref="/discover"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedWorks.map((work) => (
                <WorkCard key={work.id} work={work} layout="horizontal" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Reading History */}
      {activeTab === 'history' && (
        <div className="space-y-8">
          {/* Reader Milestone Ledger */}
          <ActivitiesCard
            displayMode="popover"
            defaultOpen={false}
            size="sm"
            className="w-full max-w-sm"
            headerIcon={<BookOpen className="h-4 w-4 text-[var(--ink-primary)]" />}
            title="Reading Activity & Milestone Ledger"
            subtitle="Chronological log of your manuscript journeys"
            activities={[
              {
                id: 1,
                icon: <BookOpen className="h-4 w-4 text-[var(--ink-primary)]" />,
                title: 'Chapter Completed',
                desc: 'Finished Chapter 18: "The Final Exchange" of The Silent Meridian',
                time: '25m ago',
                badge: 'Read',
              },
              {
                id: 2,
                icon: <Bookmark className="h-4 w-4 text-[var(--ink-primary)]" />,
                title: 'Folio Bookmarked',
                desc: 'Added Station Nine: Cold War Monograph to Private Library',
                time: '3h ago',
                badge: 'Library',
              },
              {
                id: 3,
                icon: <Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />,
                title: 'Reading Cadence Milestone',
                desc: 'Maintained 5-day continuous reading streak across Nordic Noir',
                time: 'Yesterday',
                badge: 'Streak',
              },
              {
                id: 4,
                icon: <Clock className="h-4 w-4 text-[var(--ink-primary)]" />,
                title: 'Reading Session',
                desc: '45 minutes logged reading An Inventory of Baltic Fog',
                time: '2d ago',
                badge: 'Session',
              },
            ]}
          />

          {continueReadingItems.length === 0 ? (
            <EmptyState
              type="no-history"
              customTitle="No reading history recorded"
              customDescription="Chapters and manuscripts you open will be automatically logged in your chronological reading journal."
              actionLabel="Discover Stories"
              actionHref="/discover"
            />
          ) : (
            <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] divide-y border-[var(--border-subtle)] overflow-hidden shadow-xs">
              <div className="p-4 bg-[var(--bg-subtle)]/50 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Detailed Chapter Log
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                  {continueReadingItems.length} Entries Recorded
                </span>
              </div>
              {continueReadingItems.map(({ work, progress }) => (
                <div key={work.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--bg-subtle)]/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <img
                      src={work.cover}
                      alt={work.title}
                      className="h-12 w-9 rounded object-cover grayscale border border-[var(--border-subtle)]"
                    />
                    <div>
                      <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        {work.title}
                      </h4>
                      <p className="text-xs text-[var(--ink-muted)]">
                        Chapter {progress.chapterNumber}: {progress.chapterTitle}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--ink-faint)]">
                        Read {progress.lastReadAt} • {progress.progressPercent}% completed
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/read/$workId/$chapterId"
                    params={{ workId: work.id, chapterId: progress.chapterId }}
                    className="rounded border border-[var(--border-strong)] px-3 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
                  >
                    Re-read Chapter
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
