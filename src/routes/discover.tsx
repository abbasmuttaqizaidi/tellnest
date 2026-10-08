import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Compass, TrendingUp, Sparkles, Clock, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Work } from '../data/mockData'
import { getWorkLatestActivityDate } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, Button, FilterDisclosure, AnimatedSearch } from '../design-system'
import { generateMeta } from '../lib/seo'

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
  const { allWorks, recentWorks, categories, genres } = useApp()

  // Discovery Filter State (Defaulting to 'new_chapters' per specification)
  const [activeTab, setActiveTab] = useState<'new_chapters' | 'new_this_week' | 'trending' | 'rising' | 'recent' | 'completed'>('new_chapters')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated' | 'rating'>('popularity')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filter and sort works
  const filteredWorks = useMemo(() => {
    const sourceList = activeTab === 'recent' ? recentWorks : allWorks

    return sourceList.filter((work) => {
      // Tab filter per live_instructions.md collections
      if (activeTab === 'new_chapters' && !work.new_chapters_this_week && !(work.collection || []).includes('new_chapters_this_week')) return false
      if (activeTab === 'new_this_week' && !work.new_this_week && !(work.collection || []).includes('new_this_week')) return false
      if (activeTab === 'trending' && !work.trending && !work.featured && !(work.collection || []).includes('trending_now')) return false
      if (activeTab === 'rising' && !work.rising && !(work.collection || []).includes('rising_stories')) return false
      if (activeTab === 'completed' && work.status !== 'Completed') return false

      // Category filter
      if (selectedCategory !== 'all' && work.categorySlug !== selectedCategory) return false

      // Genre filter
      if (selectedGenre !== 'all' && work.genreSlug !== selectedGenre) return false

      // Status filter
      if (selectedStatus !== 'all' && work.status !== selectedStatus) return false

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesTitle = work.title.toLowerCase().includes(query)
        const matchesAuthor = work.author.name.toLowerCase().includes(query)
        const matchesTags = work.tags.some(t => t.toLowerCase().includes(query))
        if (!matchesTitle && !matchesAuthor && !matchesTags) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'rating') return b.ratingScore - a.ratingScore
      if (sortBy === 'updated' || activeTab === 'recent') {
        const timeA = getWorkLatestActivityDate(a).getTime()
        const timeB = getWorkLatestActivityDate(b).getTime()
        return timeB - timeA
      }
      // default popularity by reads
      return parseInt(b.totalReads) - parseInt(a.totalReads)
    })
  }, [allWorks, recentWorks, activeTab, selectedCategory, selectedGenre, selectedStatus, sortBy, searchTerm])

  const clearFilters = () => {
    setActiveTab('new_chapters')
    setSelectedCategory('all')
    setSelectedGenre('all')
    setSelectedStatus('all')
    setSearchTerm('')
    setSortBy('popularity')
  }

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedGenre !== 'all' ||
    selectedStatus !== 'all' ||
    searchTerm.trim() !== '' ||
    activeTab !== 'new_chapters'

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-8 border-b border-[var(--border-subtle)] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            <Compass className="h-3.5 w-3.5" />
            <span>Digital Library Archive</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
            Discover Manuscripts
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
            Explore original fiction, serials, essays, poetry, and memoirs curated by readers and editors.
          </p>
        </div>

        {/* Animated Search with Curtain Reveal */}
        <div className="w-full md:w-80">
          <AnimatedSearch
            variant="curtain-reveal"
            size="sm"
            placeholder="Filter by title, author, tag..."
            value={searchTerm}
            onChange={setSearchTerm}
            shortcut="/"
            suggestions={[
              '✨ Trending',
              'Nordic Noir',
              'Elena Rostova',
              'Philosophy',
              'Kyoto',
            ]}
            onSelectSuggestion={(s) => {
              if (s.includes('Trending')) {
                setActiveTab('trending')
              } else {
                setSearchTerm(s)
              }
            }}
          />
        </div>
      </div>

      {/* Discovery Navigation & Filter Bar */}
      <div className="py-4 border-b border-[var(--border-subtle)] space-y-4">
        {/* Row 1: Primary Discovery Collection Tabs */}
        <div className="w-full overflow-x-auto scrollbar-none pb-1">
          <AnimatedTabs
            size="sm"
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as any)}
            tabs={[
              { id: 'new_chapters', label: 'New Chapters This Week', icon: <Clock className="h-3.5 w-3.5" /> },
              { id: 'new_this_week', label: 'New This Week', icon: <Sparkles className="h-3.5 w-3.5" /> },
              { id: 'trending', label: 'Trending', icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { id: 'rising', label: 'Rising Stories', icon: <Sparkles className="h-3.5 w-3.5" /> },
              { id: 'recent', label: 'Recently Updated', icon: <Clock className="h-3.5 w-3.5" /> },
              { id: 'completed', label: 'Completed Works', icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
            ]}
          />
        </div>

        {/* Row 2: Secondary Filter Controls Strip (Sort, Status, Genre) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]/60">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDisclosure
              label="Sort Manuscripts"
              activeId={sortBy}
              onChange={(id) => setSortBy(id as any)}
              items={[
                { id: 'popularity', label: 'Most Popular' },
                { id: 'updated', label: 'Recently Updated' },
                { id: 'rating', label: 'Highest Rated' },
              ]}
            />

            <FilterDisclosure
              label="Publication Status"
              activeId={selectedStatus}
              onChange={setSelectedStatus}
              items={[
                { id: 'all', label: 'All Statuses' },
                { id: 'Ongoing', label: 'Ongoing (Serialized)' },
                { id: 'Completed', label: 'Completed' },
                { id: 'On Hiatus', label: 'On Hiatus' },
              ]}
            />

            <FilterDisclosure
              label="Genre Filter"
              activeId={selectedGenre}
              onChange={setSelectedGenre}
              items={[
                { id: 'all', label: 'All Genres' },
                ...genres.map((g) => ({ id: g.slug, label: g.name }))
              ]}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline cursor-pointer"
            >
              Reset all active filters
            </button>
          )}
        </div>
      </div>


      {/* Category Pills Strip */}
      <div className="my-6 flex items-center gap-1.5 overflow-x-auto pb-2 max-w-full min-w-0 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
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
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
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
      <div className="flex items-center justify-between mb-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

    </div>
  )
}
