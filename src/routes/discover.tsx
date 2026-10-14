import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { Compass, TrendingUp, Sparkles, Clock, CheckCircle2, SlidersHorizontal, CheckCircle, BookOpen, Search, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Work } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, Button, FilterDisclosure, DiscreteDisclosureTabs } from '../design-system'
import { generateMeta } from '../lib/seo'
import { filterAndSortWorks } from '../lib/discover/filters'

export const Route = createFileRoute('/discover')({
  head: () =>
    generateMeta({
      title: 'Discover Serialized Fiction & Literature',
      description:
        'Explore trending serialized novels, rising indie authors, editorial recommendations, and diverse genre catalogs on Hatchpen.',
      canonicalUrl: 'https://hatchpen.com/discover',
      keywords: [
        'discover stories',
        'serialized novels',
        'fantasy fiction',
        'sci-fi novels',
        'literary essays',
        'reading catalog',
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Discover Serialized Fiction & Literature — Hatchpen',
        url: 'https://hatchpen.com/discover',
        description:
          'Explore trending serialized novels, rising indie authors, editorial recommendations, and diverse genre catalogs on Hatchpen.',
      },
    }),
  component: DiscoverPage,
})

function DiscoverPage() {
  const { isSignedIn, isLoaded } = useUser()
  const { allWorks, categories, genres } = useApp()

  // Discovery Filter State (Defaulting to 'all')
  const [activeTab, setActiveTab] = useState<'all' | 'new_chapters' | 'new_this_week' | 'trending' | 'rising' | 'recent' | 'completed'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated' | 'rating'>('popularity')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Fallback to public default if unauthenticated user arrives with rising tab selected
  useEffect(() => {
    if (isLoaded && !isSignedIn && activeTab === 'rising') {
      setActiveTab('all')
    }
  }, [isLoaded, isSignedIn, activeTab])

  // Filter and sort works using unified discovery engine
  const filteredWorks = useMemo(() => {
    return filterAndSortWorks(allWorks, {
      activeTab,
      selectedCategory,
      selectedGenre,
      selectedStatus,
      searchTerm,
      sortBy,
      isSignedIn: Boolean(isSignedIn),
    })
  }, [allWorks, activeTab, selectedCategory, selectedGenre, selectedStatus, sortBy, searchTerm, isSignedIn])

  const clearFilters = () => {
    setActiveTab('all')
    setSelectedCategory('all')
    setSelectedGenre('all')
    setSelectedStatus('all')
    setSearchTerm('')
    setSortBy('popularity')
  }

  const hasActiveFilters =
    activeTab !== 'all' ||
    selectedCategory !== 'all' ||
    selectedGenre !== 'all' ||
    selectedStatus !== 'all' ||
    searchTerm.trim() !== '' ||
    sortBy !== 'popularity'

  const discoveryTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string }> = [
      { id: 'all', label: 'All Stories' },
      { id: 'new_this_week', label: 'New This Week' },
      { id: 'new_chapters', label: 'New Chapters This Week' },
      { id: 'trending', label: 'Trending' },
    ]
    if (isSignedIn) {
      tabs.push({ id: 'rising', label: 'Rising Stories' })
    }
    tabs.push(
      { id: 'recent', label: 'Recently Updated' },
      { id: 'completed', label: 'Completed Works' }
    )
    return tabs
  }, [isSignedIn])

  return (
    <div className="min-h-screen py-5 sm:py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      
      {/* Header with Search */}
      <div className="pb-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
            Discover Manuscripts
          </h1>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Explore original fiction, serials, essays, poetry, and memoirs curated by readers and editors.
          </p>
        </div>

        {/* Search Input connected to searchTerm */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search titles, authors, synopsis, tags..."
            className="w-full pl-8.5 pr-7 py-1.5 text-xs rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Discovery Navigation & Filter Bar */}
      <div className="py-2.5 border-b border-[var(--border-subtle)] space-y-2">
        {/* Upper Row: Collection Tabs (Left) + Discrete Filter Disclosure Tabs (Right) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Primary Discovery Collection Tabs */}
          <div className="overflow-x-auto scrollbar-none pb-0.5 lg:pb-0">
            <AnimatedTabs
              size="sm"
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              tabs={discoveryTabs}
            />
          </div>

          {/* Secondary Discrete Disclosure Tabs (Sort, Status, Genre) + Reset Button */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <DiscreteDisclosureTabs
              size="sm"
              tabs={[
                {
                  id: 'sort',
                  label: 'Sort',
                  icon: <SlidersHorizontal className="h-3 w-3" />,
                  activeItemId: sortBy,
                  onItemChange: (id) => setSortBy(id as any),
                  menuTitle: 'Sort Manuscripts',
                  items: [
                    { id: 'popularity', label: 'Most Popular' },
                    { id: 'updated', label: 'Recently Updated' },
                    { id: 'rating', label: 'Highest Rated' },
                  ],
                },
                {
                  id: 'status',
                  label: 'Status',
                  icon: <CheckCircle className="h-3 w-3" />,
                  activeItemId: selectedStatus,
                  onItemChange: setSelectedStatus,
                  menuTitle: 'Publication Status',
                  items: [
                    { id: 'all', label: 'All Statuses' },
                    { id: 'Ongoing', label: 'Ongoing (Serialized)' },
                    { id: 'Completed', label: 'Completed' },
                    { id: 'On Hiatus', label: 'On Hiatus' },
                  ],
                },
                {
                  id: 'genre',
                  label: 'Genre',
                  icon: <BookOpen className="h-3 w-3" />,
                  activeItemId: selectedGenre,
                  onItemChange: setSelectedGenre,
                  menuTitle: 'Genre Filter',
                  items: [
                    { id: 'all', label: 'All Genres' },
                    ...genres.map((g) => ({ id: g.slug, label: g.name })),
                  ],
                },
              ]}
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline cursor-pointer ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full min-w-0 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono whitespace-nowrap shrink-0 transition-colors ${
            selectedCategory === 'all'
              ? 'border border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold'
              : 'border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === cat.slug
                ? 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
                : 'border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1">
        <span className="font-mono text-xs text-[var(--ink-muted)]">
          Showing <strong>{filteredWorks.length}</strong> works
        </span>
      </div>

      {/* Works Grid */}
      {filteredWorks.length === 0 ? (
        <EmptyState
          type="no-search"
          customTitle="No works match these filters"
          customDescription="Try clearing your category, genre, or search filters to explore the rest of the library."
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      ) : (
        <div
          data-testid="discover-works-grid"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {filteredWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

    </div>
  )
}
