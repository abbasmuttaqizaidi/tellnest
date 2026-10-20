import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { Compass, TrendingUp, Sparkles, Clock, CheckCircle2, SlidersHorizontal, CheckCircle, BookOpen, Search, X, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Work } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, Button, FilterDisclosure, Drawer, Modal } from '../design-system'
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

  // Committed Discovery Filter State (Active on page)
  const [activeTab, setActiveTab] = useState<'all' | 'new_chapters' | 'new_this_week' | 'trending' | 'rising'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('Completed')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterOpen, setFilterOpen] = useState(false)

  // Draft Filter State (Staged inside Flipkart Modal/Drawer until "Apply Filters" is clicked)
  const [draftCategory, setDraftCategory] = useState<string>('all')
  const [draftGenre, setDraftGenre] = useState<string>('all')
  const [draftStatus, setDraftStatus] = useState<string>('Completed')

  type FilterSection = 'status' | 'category' | 'genre'
  const [activeSection, setActiveSection] = useState<FilterSection>('status')
  const [rightPaneSearch, setRightPaneSearch] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)

  const openFilterModal = () => {
    setDraftCategory(selectedCategory)
    setDraftGenre(selectedGenre)
    setDraftStatus(selectedStatus)
    setRightPaneSearch('')
    setActiveSection('status')
    setFilterOpen(true)
  }

  const applyFilters = () => {
    setSelectedCategory(draftCategory)
    setSelectedGenre(draftGenre)
    setSelectedStatus(draftStatus)
    setFilterOpen(false)
  }

  const clearDraftFilters = () => {
    setDraftCategory('all')
    setDraftGenre('all')
    setDraftStatus('Completed')
  }

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    setIsDesktop(media.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

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
      sortBy: 'popularity',
      isSignedIn: Boolean(isSignedIn),
    })
  }, [allWorks, activeTab, selectedCategory, selectedGenre, selectedStatus, searchTerm, isSignedIn])

  // Real-time calculation of works count matching the draft (staged) selections inside Flipkart modal
  const draftFilteredWorks = useMemo(() => {
    return filterAndSortWorks(allWorks, {
      activeTab,
      selectedCategory: draftCategory,
      selectedGenre: draftGenre,
      selectedStatus: draftStatus,
      searchTerm,
      sortBy: 'popularity',
      isSignedIn: Boolean(isSignedIn),
    })
  }, [allWorks, activeTab, draftCategory, draftGenre, draftStatus, searchTerm, isSignedIn])

  const clearFilters = () => {
    setActiveTab('all')
    setSelectedCategory('all')
    setSelectedGenre('all')
    setSelectedStatus('Completed')
    setSearchTerm('')
  }

  const hasActiveFilters =
    activeTab !== 'all' ||
    selectedCategory !== 'all' ||
    selectedGenre !== 'all' ||
    selectedStatus !== 'Completed' ||
    searchTerm.trim() !== ''

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
    return tabs
  }, [isSignedIn])

  // Staged Filter Sections displayed inside the Flipkart Modal/Drawer
  const draftFilterSections: Array<{
    id: FilterSection
    label: string
    activeValue: string
    isFiltered: boolean
  }> = [
    {
      id: 'status',
      label: 'Status',
      activeValue: draftStatus === 'all' ? 'All Statuses' : draftStatus,
      isFiltered: draftStatus !== 'Completed',
    },
    {
      id: 'category',
      label: 'Category',
      activeValue:
        draftCategory !== 'all'
          ? categories.find((c) => c.slug === draftCategory)?.name || draftCategory
          : 'All Categories',
      isFiltered: draftCategory !== 'all',
    },
    {
      id: 'genre',
      label: 'Genre',
      activeValue:
        draftGenre !== 'all'
          ? genres.find((g) => g.slug === draftGenre)?.name || draftGenre
          : 'All Genres',
      isFiltered: draftGenre !== 'all',
    },
  ]

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedCategory !== 'all') count++
    if (selectedGenre !== 'all') count++
    if (selectedStatus !== 'Completed') count++
    return count
  }, [selectedCategory, selectedGenre, selectedStatus])

  return (
    <div className="min-h-screen py-3 sm:py-7 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3 sm:space-y-5">
      
      {/* ── MOBILE HEADER (Compact: Title + Count + Search in one row) ── */}
      <div className="flex md:hidden items-center justify-between gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="font-serif text-lg font-bold text-[var(--ink-primary)] leading-tight">
            Discover
          </h1>
          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
            {filteredWorks.length} manuscripts
          </span>
        </div>

        <div className="relative flex-1 max-w-[210px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search manuscripts..."
            className="w-full pl-7.5 pr-6 py-1 text-xs rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── MOBILE FILTER BAR: Flipkart Filter Trigger Button + Quick Collection Pills ── */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {/* Flipkart Filter Trigger Button with Count Badge */}
        <button
          type="button"
          onClick={openFilterModal}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            activeFiltersCount > 0
              ? 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
              : 'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="ml-0.5 h-4 w-4 rounded-full bg-[var(--accent-contrast)] text-[var(--ink-primary)] text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Quick Collection Pills */}
        {discoveryTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border border-[var(--ink-primary)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                : 'border border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── MOBILE ACTIVE FILTERS DISMISS CHIPS ── */}
      {hasActiveFilters && (
        <div className="flex md:hidden items-center gap-1.5 flex-wrap text-[10px] pt-0.5">
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedGenre !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Genre: {genres.find((g) => g.slug === selectedGenre)?.name || selectedGenre}
              <button
                type="button"
                onClick={() => setSelectedGenre('all')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedStatus !== 'Completed' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Status: {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
              <button
                type="button"
                onClick={() => setSelectedStatus('Completed')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── DESKTOP HEADER WITH SEARCH (Preserved for md+ screens) ── */}
      <div className="hidden md:flex pb-4 border-b border-[var(--border-subtle)] flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      {/* ── DESKTOP NAVIGATION & FILTER BAR (Preserved for md+ screens) ── */}
      <div className="hidden md:block py-2.5 border-b border-[var(--border-subtle)] space-y-2">
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

          {/* Flipkart Filter Trigger Button on Desktop */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openFilterModal}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeFiltersCount > 0
                  ? 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-[var(--accent-contrast)] text-[var(--ink-primary)] text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

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

      {/* ── DESKTOP ACTIVE FILTERS CHIPS ── */}
      {hasActiveFilters && (
        <div className="hidden md:flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedGenre !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Genre: {genres.find((g) => g.slug === selectedGenre)?.name || selectedGenre}
              <button
                type="button"
                onClick={() => setSelectedGenre('all')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedStatus !== 'Completed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Status: {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
              <button
                type="button"
                onClick={() => setSelectedStatus('Completed')}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}


      {/* ── SHARED FLIPKART-STYLE 2-PANE FILTER CONTENT ── */}
      {(() => {
        const filterContent = (
          <div className="flex flex-col flex-1 h-full overflow-hidden font-sans">
            {/* 2-Column Split Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Filter Sections Menu */}
              <div className="w-[125px] sm:w-[150px] bg-[var(--bg-subtle)] border-r border-[var(--border-subtle)] overflow-y-auto shrink-0 divide-y divide-[var(--border-subtle)]">
                {draftFilterSections.map((sec) => {
                  const isCurrent = activeSection === sec.id
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(sec.id)
                        setRightPaneSearch('')
                      }}
                      className={`w-full text-left py-3.5 px-3 sm:px-4 relative transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold'
                          : 'bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      {/* Left edge active indicator */}
                      {isCurrent && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--ink-primary)]" />
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{sec.label}</span>
                        {sec.isFiltered && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-primary)]" />
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--ink-muted)] truncate font-normal mt-0.5">
                        {sec.activeValue}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Right Column: Values for Selected Section */}
              <div className="flex-1 bg-[var(--bg-surface)] overflow-y-auto flex flex-col">
                {/* Search if in Genre or Category with many items */}
                {(activeSection === 'genre' || activeSection === 'category') && (
                  <div className="p-2 sm:p-2.5 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-surface)] z-10">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-[var(--ink-muted)] pointer-events-none" />
                      <input
                        type="text"
                        value={rightPaneSearch}
                        onChange={(e) => setRightPaneSearch(e.target.value)}
                        placeholder={`Search ${activeSection}...`}
                        className="w-full pl-7.5 sm:pl-8 pr-6 py-1 sm:py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                      />
                      {rightPaneSearch && (
                        <button
                          type="button"
                          onClick={() => setRightPaneSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Pane List */}
                <div className="divide-y divide-[var(--border-subtle)] flex-1 overflow-y-auto">
                  {/* SECTION: PUBLICATION STATUS */}
                  {activeSection === 'status' && (
                    <>
                      {[
                        { id: 'Completed', label: 'Completed (Default)' },
                        { id: 'all', label: 'All Statuses' },
                        { id: 'Ongoing', label: 'Ongoing (Serialized)' },
                        { id: 'On Hiatus', label: 'On Hiatus' },
                      ].map((opt) => {
                        const isSelected = draftStatus === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDraftStatus(opt.id)}
                            className="w-full flex items-center justify-between py-3 px-3.5 sm:px-4 text-left transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)]'
                                    : 'border-[var(--border-strong)] bg-transparent'
                                }`}
                              >
                                {isSelected && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-contrast)]" />
                                )}
                              </div>
                              <span
                                className={`text-xs ${
                                  isSelected
                                    ? 'font-semibold text-[var(--ink-primary)]'
                                    : 'text-[var(--ink-secondary)]'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-[var(--ink-primary)]" />
                            )}
                          </button>
                        )
                      })}
                    </>
                  )}

                  {/* SECTION: CATEGORY */}
                  {activeSection === 'category' && (
                    <>
                      {[
                        { slug: 'all', name: 'All Categories' },
                        ...categories,
                      ]
                        .filter((c) =>
                          rightPaneSearch
                            ? c.name.toLowerCase().includes(rightPaneSearch.toLowerCase())
                            : true
                        )
                        .map((opt) => {
                          const isSelected = draftCategory === opt.slug
                          return (
                            <button
                              key={opt.slug}
                              type="button"
                              onClick={() => setDraftCategory(opt.slug)}
                              className="w-full flex items-center justify-between py-3 px-3.5 sm:px-4 text-left transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)]'
                                      : 'border-[var(--border-strong)] bg-transparent'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-contrast)]" />
                                  )}
                                </div>
                                <span
                                  className={`text-xs ${
                                    isSelected
                                      ? 'font-semibold text-[var(--ink-primary)]'
                                      : 'text-[var(--ink-secondary)]'
                                  }`}
                                >
                                  {opt.name}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-[var(--ink-primary)]" />
                              )}
                            </button>
                          )
                        })}
                    </>
                  )}

                  {/* SECTION: GENRE */}
                  {activeSection === 'genre' && (
                    <>
                      {[
                        { slug: 'all', name: 'All Genres' },
                        ...genres,
                      ]
                        .filter((g) =>
                          rightPaneSearch
                            ? g.name.toLowerCase().includes(rightPaneSearch.toLowerCase())
                            : true
                        )
                        .map((opt) => {
                          const isSelected = draftGenre === opt.slug
                          return (
                            <button
                              key={opt.slug}
                              type="button"
                              onClick={() => setDraftGenre(opt.slug)}
                              className="w-full flex items-center justify-between py-3 px-3.5 sm:px-4 text-left transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)]'
                                      : 'border-[var(--border-strong)] bg-transparent'
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-contrast)]" />
                                  )}
                                </div>
                                <span
                                  className={`text-xs ${
                                    isSelected
                                      ? 'font-semibold text-[var(--ink-primary)]'
                                      : 'text-[var(--ink-secondary)]'
                                  }`}
                                >
                                  {opt.name}
                                </span>
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-[var(--ink-primary)]" />
                              )}
                            </button>
                          )
                        })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--bg-surface)] shrink-0">
              <button
                type="button"
                onClick={clearDraftFilters}
                className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] font-medium underline px-2 py-1.5 cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 sm:flex-none sm:px-6 py-2.5 px-4 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold text-xs text-center cursor-pointer hover:opacity-90 transition-opacity"
              >
                Apply Filters ({draftFilteredWorks.length})
              </button>
            </div>
          </div>
        )

        return (
          <>
            {/* Mobile Bottom Sheet Drawer (< 768px ONLY) */}
            {!isDesktop && (
              <Drawer
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                side="bottom"
                title="Filters"
                className="h-[80vh] max-h-[85vh]"
                bodyClassName="p-0 flex flex-col flex-1 overflow-hidden"
              >
                {filterContent}
              </Drawer>
            )}

            {/* Desktop Center Modal (>= 768px ONLY) */}
            {isDesktop && (
              <Modal
                isOpen={filterOpen}
                onClose={() => setFilterOpen(false)}
                title="Filters"
                size="lg"
                className="max-w-2xl"
                bodyClassName="p-0 flex flex-col h-[480px] overflow-hidden"
              >
                {filterContent}
              </Modal>
            )}
          </>
        )
      })()}

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
