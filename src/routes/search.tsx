import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { AUTHORS, CATEGORIES, GENRES } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, FilterDisclosure, AnimatedSearch } from '../design-system'
import { Search, X, History, Sparkles, BookOpen, User, Hash } from 'lucide-react'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

function SearchPage() {
  const { allWorks } = useApp()
  const [query, setQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('q') || ''
    }
    return ''
  })

  // Sync if URL search param changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q')
      if (q && q !== query) {
        setQuery(q)
      }
    }
  }, [typeof window !== 'undefined' ? window.location.search : ''])

  const [activeTab, setActiveTab] = useState<'all' | 'works' | 'authors' | 'tags'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const recentSearches = ['Cold War', 'Elena Rostova', 'Essays on Silence', 'Kyoto', 'Satire']
  const popularKeywords = ['Architecture', 'Serialized', 'Philosophy', 'Station Nine', 'Hebrides']

  // Search Results
  const matchingWorks = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return allWorks.filter((w) => {
      if (selectedCategory !== 'all' && w.categorySlug !== selectedCategory) return false
      return (
        w.title.toLowerCase().includes(q) ||
        w.synopsis.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [allWorks, query, selectedCategory])

  const matchingAuthors = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return AUTHORS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q)
    )
  }, [query])

  const matchingTags = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const allTags = Array.from(new Set(allWorks.flatMap((w) => w.tags)))
    return allTags.filter((t) => t.toLowerCase().includes(q))
  }, [allWorks, query])

  const totalResults = matchingWorks.length + matchingAuthors.length + matchingTags.length

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Search Input Bar */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
          Search the Library
        </h1>
        <p className="text-xs text-[var(--ink-muted)]">
          Inquire across titles, author names, literary categories, and narrative themes.
        </p>

        <div className="mt-6">
          <AnimatedSearch
            variant="spotlight"
            size="lg"
            placeholder="Type a title, author, or literary subject..."
            value={query}
            onChange={setQuery}
            resultsCount={query.trim() ? totalResults : undefined}
            badge="Library"
            autoFocus
            shortcut="/"
          />
        </div>

        {/* Suggestions & Recent Searches when query is empty */}
        {!query.trim() && (
          <div className="pt-6 text-left space-y-6 max-w-xl mx-auto">
            {/* Recent Searches */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] mb-2.5">
                <History className="h-3.5 w-3.5" />
                <span>Recent Inquiries</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-xs text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Curations */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] mb-2.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Popular Subjects</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    #{term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results View */}
      {query.trim() && (
        <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
          {/* Result Counts & Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
            <AnimatedTabs
              size="sm"
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              tabs={[
                { id: 'all', label: 'All Results', badge: totalResults },
                { id: 'works', label: 'Works', icon: <BookOpen className="h-3.5 w-3.5" />, badge: matchingWorks.length },
                { id: 'authors', label: 'Authors', icon: <User className="h-3.5 w-3.5" />, badge: matchingAuthors.length },
                { id: 'tags', label: 'Tags & Themes', icon: <Hash className="h-3.5 w-3.5" />, badge: matchingTags.length },
              ]}
            />

            {/* Category Filter for Search Results */}
            <div className="flex items-center gap-2">
              <FilterDisclosure
                label="Filter by Category"
                activeId={selectedCategory}
                onChange={setSelectedCategory}
                items={[
                  { id: 'all', label: 'All Categories' },
                  ...CATEGORIES.map((c) => ({ id: c.slug, label: c.name, badge: c.worksCount }))
                ]}
              />
            </div>
          </div>

          {totalResults === 0 ? (
            <EmptyState
              type="no-search"
              customTitle={`No records found for "${query}"`}
              customDescription="Try searching by a broader term like 'fiction', 'Kyoto', or 'Rostova'."
              actionLabel="Clear Search"
              onAction={() => setQuery('')}
            />
          ) : (
            <div className="space-y-12">
              {/* Works Results */}
              {(activeTab === 'all' || activeTab === 'works') && matchingWorks.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                    Manuscripts & Serials
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {matchingWorks.map((work) => (
                      <WorkCard key={work.id} work={work} layout="portrait" />
                    ))}
                  </div>
                </div>
              )}

              {/* Authors Results */}
              {(activeTab === 'all' || activeTab === 'authors') && matchingAuthors.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                    Writers
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchingAuthors.map((author) => (
                      <AuthorCard key={author.id} author={author} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Results */}
              {(activeTab === 'all' || activeTab === 'tags') && matchingTags.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                    Literary Themes & Subjects
                  </h3>
                  <div className="flex flex-wrap gap-2.5">
                    {matchingTags.map((tag) => (
                      <Link
                        key={tag}
                        to="/discover"
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-colors no-underline"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
