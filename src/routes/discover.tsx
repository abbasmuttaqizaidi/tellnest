import { createFileRoute, Link, useRouterState } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/react'
import { Compass, TrendingUp, Sparkles, Clock, CheckCircle2, SlidersHorizontal, CheckCircle, BookOpen, Search, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Work } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, Button, FilterDisclosure, Drawer, Modal } from '../design-system'
import { generateMeta } from '../lib/seo'
import { filterAndSortWorks } from '../lib/discover/filters'
import { RouteHeader } from '../components/RouteHeader'
import { DiscoverGridSkeleton } from '../components/DiscoverSkeleton'
import { getPaginatedDiscoverWorksServerFn, type PaginatedDiscoverResponse } from '../server/works'
import { getTaxonomyServerFn, type TaxonomyResponse } from '../server/taxonomy'

export interface DiscoverRouteSearch {
  tab?: 'all' | 'new_chapters' | 'new_this_week' | 'trending' | 'rising'
  category?: string
  genre?: string
  status?: string
  q?: string
  page?: number
}

export interface DiscoverLoaderData {
  paginatedWorks: PaginatedDiscoverResponse
  taxonomy?: TaxonomyResponse | null
}

const PAGE_SIZE = 14

export const Route = createFileRoute('/discover')({
  // In-Memory SWR (Desktop & Mobile): Keeps data fresh in RAM for 30s; instant 0ms navigation
  staleTime: 30_000,
  gcTime: 1000 * 60 * 5,
  validateSearch: (search: Record<string, unknown>): DiscoverRouteSearch => {
    const rawTab = typeof search.tab === 'string' ? search.tab : ''
    const validTabs = ['all', 'new_chapters', 'new_this_week', 'trending', 'rising']
    const tab = validTabs.includes(rawTab) && rawTab !== 'all' ? (rawTab as DiscoverRouteSearch['tab']) : undefined

    const category =
      typeof search.category === 'string' && search.category.trim() && search.category.trim() !== 'all'
        ? search.category.trim()
        : undefined

    const genre =
      typeof search.genre === 'string' && search.genre.trim() && search.genre.trim() !== 'all'
        ? search.genre.trim()
        : undefined

    const status =
      typeof search.status === 'string' && search.status.trim() && search.status.trim() !== 'all'
        ? search.status.trim()
        : undefined

    const q =
      typeof search.q === 'string' && search.q.trim()
        ? search.q.trim()
        : undefined

    const rawPage = Number(search.page)
    const page = !isNaN(rawPage) && rawPage > 1 ? Math.floor(rawPage) : undefined

    return { tab, category, genre, status, q, page }
  },
  loaderDeps: ({ search: { tab, category, genre, status, q, page } }) => ({
    tab,
    category,
    genre,
    status,
    q,
    page,
  }),
  loader: async ({ deps }): Promise<DiscoverLoaderData> => {
    try {
      const [paginated, taxonomy] = await Promise.all([
        getPaginatedDiscoverWorksServerFn({
          data: {
            tab: deps.tab || 'all',
            category: deps.category || 'all',
            genre: deps.genre || 'all',
            status: deps.status || 'all',
            search: deps.q || '',
            page: deps.page || 1,
            limit: PAGE_SIZE,
          },
        }),
        getTaxonomyServerFn().catch(() => null),
      ])

      return {
        paginatedWorks: paginated,
        taxonomy,
      }
    } catch (err) {
      console.warn('[DiscoverRoute loader] Failed to load paginated discover works:', err)
      return {
        paginatedWorks: {
          works: [],
          totalCount: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        taxonomy: null,
      }
    }
  },
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
  const { allWorks, categories: appCategories, genres: appGenres, isWorksLoading } = useApp()
  const loaderData = Route.useLoaderData()
  const routeSearch = Route.useSearch()
  const navigate = Route.useNavigate()

  // Track reactive router loading state during HTTP server transitions
  const isTransitioning = useRouterState({ select: (s) => s.status === 'pending' })

  // Taxonomy resolution: Server loader taxonomy preferred, AppContext as secondary
  const categories = loaderData?.taxonomy?.categories?.length ? loaderData.taxonomy.categories : appCategories
  const genres = loaderData?.taxonomy?.genres?.length ? loaderData.taxonomy.genres : appGenres

  // Server paginated feed
  const paginatedData = loaderData?.paginatedWorks
  const displayWorks = paginatedData?.works || []
  const totalWorks = paginatedData?.totalCount ?? 0
  const totalPages = Math.max(1, paginatedData?.totalPages ?? 1)

  const activeTab = routeSearch.tab || 'all'
  const selectedCategory = routeSearch.category || 'all'
  const selectedGenre = routeSearch.genre || 'all'
  const selectedStatus = routeSearch.status || 'all'
  const currentPage = routeSearch.page || 1
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const activeSearchQuery = routeSearch.q || ''

  // Loading state: Skeleton triggers on HTTP router transition or clerk initial hydration
  const isLoading = isTransitioning || !isLoaded

  // Fast-keystroke local input state with zero typing latency
  const [searchInput, setSearchInput] = useState<string>(activeSearchQuery)
  const [filterOpen, setFilterOpen] = useState(false)

  // Draft Filter State (Staged inside Flipkart Modal/Drawer until "Apply Filters" is clicked)
  const [draftCategory, setDraftCategory] = useState<string>('all')
  const [draftGenre, setDraftGenre] = useState<string>('all')
  const [draftStatus, setDraftStatus] = useState<string>('all')

  type FilterSection = 'status' | 'category' | 'genre'
  const [activeSection, setActiveSection] = useState<FilterSection>('status')
  const [rightPaneSearch, setRightPaneSearch] = useState('')
  const [isDesktop, setIsDesktop] = useState(false)

  // Synchronize URL search params helper (cleans up defaults to keep URL tidy)
  const updateRouteSearch = useCallback(
    (newParams: Partial<DiscoverRouteSearch>, replace = false) => {
      navigate({
        search: (prev: DiscoverRouteSearch) => {
          const next: DiscoverRouteSearch = { ...prev, ...newParams }
          if (!next.tab || next.tab === 'all') delete next.tab
          if (!next.category || next.category === 'all') delete next.category
          if (!next.genre || next.genre === 'all') delete next.genre
          if (!next.status || next.status === 'all') delete next.status
          if (!next.q || !next.q.trim()) delete next.q
          if (!next.page || next.page <= 1) delete next.page
          return next
        },
        replace,
      })
    },
    [navigate]
  )

  // Sync searchInput when URL q changes externally (browser back/forward or external navigation)
  useEffect(() => {
    setSearchInput(activeSearchQuery)
  }, [activeSearchQuery])

  // Debounced search effect (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== activeSearchQuery) {
        updateRouteSearch({ q: trimmed || undefined, page: undefined }, true)
      }
    }, 250)

    return () => clearTimeout(handler)
  }, [searchInput, activeSearchQuery, updateRouteSearch])

  const handleClearSearch = () => {
    setSearchInput('')
    updateRouteSearch({ q: undefined, page: undefined }, true)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = searchInput.trim()
      updateRouteSearch({ q: trimmed || undefined, page: undefined }, true)
    }
  }

  const handlePageChange = (newPage: number) => {
    updateRouteSearch({ page: newPage > 1 ? newPage : undefined })
    document.getElementById('discover-works-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openFilterModal = () => {
    setDraftCategory(selectedCategory)
    setDraftGenre(selectedGenre)
    setDraftStatus(selectedStatus)
    setRightPaneSearch('')
    setActiveSection('status')
    setFilterOpen(true)
  }

  const applyFilters = () => {
    updateRouteSearch({
      category: draftCategory === 'all' ? undefined : draftCategory,
      genre: draftGenre === 'all' ? undefined : draftGenre,
      status: draftStatus === 'all' ? undefined : draftStatus,
      page: undefined,
    })
    setFilterOpen(false)
  }

  const clearDraftFilters = () => {
    setDraftCategory('all')
    setDraftGenre('all')
    setDraftStatus('all')
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
      updateRouteSearch({ tab: undefined }, true)
    }
  }, [isLoaded, isSignedIn, activeTab, updateRouteSearch])

  // Real-time calculation of works count matching the draft (staged) selections inside Flipkart modal
  const draftFilteredCount = useMemo(() => {
    if (allWorks.length > 0) {
      return filterAndSortWorks(allWorks, {
        activeTab,
        selectedCategory: draftCategory,
        selectedGenre: draftGenre,
        selectedStatus: draftStatus,
        searchTerm: activeSearchQuery,
        sortBy: 'popularity',
        isSignedIn: Boolean(isSignedIn),
      }).length
    }
    return totalWorks
  }, [allWorks, activeTab, draftCategory, draftGenre, draftStatus, activeSearchQuery, isSignedIn, totalWorks])

  const clearFilters = () => {
    setSearchInput('')
    navigate({
      search: {},
      replace: true,
    })
  }

  const hasActiveFilters =
    activeTab !== 'all' ||
    selectedCategory !== 'all' ||
    selectedGenre !== 'all' ||
    selectedStatus !== 'all' ||
    activeSearchQuery.trim() !== ''

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
      isFiltered: draftStatus !== 'all',
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
    if (selectedStatus !== 'all') count++
    return count
  }, [selectedCategory, selectedGenre, selectedStatus])

  return (
    <div className="min-h-screen pb-12">
      
      {/* ── UNIFIED ROUTE HEADER (2 Parts: Left Title+Subtitle, Right Center-Aligned + New Button) ── */}
      <RouteHeader
        title="Discover"
        subtitle="Explore curated stories and manuscripts"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4 space-y-3 sm:space-y-5">
        {/* ── MOBILE SEARCH & FILTER BAR ── */}
        <div className="block md:hidden space-y-2">
          {/* Mobile Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search manuscripts, authors, tags..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Flipkart Filter Trigger Button + Quick Collection Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
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
                onClick={() => {
                  updateRouteSearch({ tab: tab.id === 'all' ? undefined : (tab.id as any), page: undefined })
                }}
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
        </div>

      {/* ── MOBILE ACTIVE FILTERS DISMISS CHIPS ── */}
      {hasActiveFilters && (
        <div className="flex md:hidden items-center gap-1.5 flex-wrap text-[10px] pt-0.5">
          {activeSearchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Search: "{activeSearchQuery}"
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button
                type="button"
                onClick={() => {
                  updateRouteSearch({ category: undefined, page: undefined })
                }}
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
                onClick={() => {
                  updateRouteSearch({ genre: undefined, page: undefined })
                }}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Status: {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
              <button
                type="button"
                onClick={() => {
                  updateRouteSearch({ status: undefined, page: undefined })
                }}
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


      {/* ── DESKTOP NAVIGATION & FILTER BAR (Preserved for md+ screens) ── */}
      <div className="hidden md:block py-2.5 border-b border-[var(--border-subtle)] space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Primary Discovery Collection Tabs */}
          <div className="overflow-x-auto scrollbar-none pb-0.5 lg:pb-0">
            <AnimatedTabs
              size="sm"
              activeId={activeTab}
              onChange={(id) => {
                updateRouteSearch({ tab: id === 'all' ? undefined : (id as any), page: undefined })
              }}
              tabs={discoveryTabs}
            />
          </div>

          {/* Search + Flipkart Filter Trigger Button on Desktop */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-52 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search manuscripts, authors, tags..."
                className="w-full pl-8.5 pr-7 py-1 text-xs rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

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
          {activeSearchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Search: "{activeSearchQuery}"
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
              <button
                type="button"
                onClick={() => {
                  updateRouteSearch({ category: undefined, page: undefined })
                }}
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
                onClick={() => {
                  updateRouteSearch({ genre: undefined, page: undefined })
                }}
                className="hover:text-red-500 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
              Status: {selectedStatus === 'all' ? 'All Statuses' : selectedStatus}
              <button
                type="button"
                onClick={() => {
                  updateRouteSearch({ status: undefined, page: undefined })
                }}
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
                        { id: 'all', label: 'All Statuses (Default)' },
                        { id: 'Completed', label: 'Completed' },
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
                Apply Filters ({draftFilteredCount})
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

      {/* Results Header, Works Grid (max 14 per page), and Pagination */}
      {(() => {
        const startIndex = totalWorks > 0 ? (safeCurrentPage - 1) * PAGE_SIZE + 1 : 0
        const endIndex = Math.min(safeCurrentPage * PAGE_SIZE, totalWorks)

        return (
          <>
            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                {isLoading ? (
                  <span className="inline-block h-4 w-32 bg-[var(--bg-subtle)] rounded animate-pulse" />
                ) : (
                  <>
                    Showing <strong>{totalWorks > 0 ? `${startIndex}–${endIndex}` : '0'}</strong> of <strong>{totalWorks}</strong> works
                  </>
                )}
              </span>
              {!isLoading && totalPages > 1 && (
                <span className="font-mono text-xs text-[var(--ink-muted)]">
                  Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
                </span>
              )}
            </div>

            {/* Works Grid or Skeleton */}
            {isLoading ? (
              <DiscoverGridSkeleton count={PAGE_SIZE} />
            ) : totalWorks === 0 ? (
              <EmptyState
                type="no-search"
                customTitle="No works match these filters"
                customDescription="Try clearing your category, genre, or search filters to explore the rest of the library."
                actionLabel="Clear Filters"
                onAction={clearFilters}
              />
            ) : (
              <div
                id="discover-works-grid"
                data-testid="discover-works-grid"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5"
              >
                {displayWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-2 border-t border-[var(--border-subtle)]">
                <p className="text-xs font-mono text-[var(--ink-muted)]">
                  Showing page {safeCurrentPage} of {totalPages} ({PAGE_SIZE} per page)
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      if (totalPages > 7) {
                        if (pageNum !== 1 && pageNum !== totalPages && Math.abs(pageNum - safeCurrentPage) > 1) {
                          if (pageNum === 2 || pageNum === totalPages - 1) {
                            return (
                              <span key={pageNum} className="px-1 text-xs text-[var(--ink-muted)] select-none">
                                …
                              </span>
                            )
                          }
                          return null
                        }
                      }

                      const isActive = pageNum === safeCurrentPage
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => handlePageChange(pageNum)}
                          className={`min-w-[32px] h-8 px-2 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
                            isActive
                              ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold shadow-xs'
                              : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    aria-label="Next Page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )
      })()}

      </div>
    </div>
  )
}
