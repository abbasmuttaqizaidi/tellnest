import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ArrowLeft, BookOpen, SlidersHorizontal, Sparkles } from 'lucide-react'

export const Route = createFileRoute('/category/$slug')({
  component: CategoryTemplatePage,
})

function CategoryTemplatePage() {
  const { slug } = Route.useParams()
  const { allWorks } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Find category meta or create fallback dynamic category for any future category
  const categoryInfo = useMemo(() => {
    const found = CATEGORIES.find((c) => c.slug === slug)
    if (found) return found
    const humanName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
    return {
      name: humanName,
      slug,
      description: `Curated literary works, manuscripts, and narratives in the ${humanName} category.`,
      worksCount: 0,
      accentLetter: humanName.charAt(0)
    }
  }, [slug])

  // Filter works matching this category
  const categoryWorks = useMemo(() => {
    return allWorks.filter((w) => {
      const matchCat = w.categorySlug === slug || w.category.toLowerCase().replace(/\s+/g, '-') === slug
      if (!matchCat) return false
      if (selectedStatus !== 'all' && w.status !== selectedStatus) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = w.title.toLowerCase().includes(q)
        const matchesAuthor = w.author.name.toLowerCase().includes(q)
        const matchesSynopsis = w.synopsis.toLowerCase().includes(q)
        if (!matchesTitle && !matchesAuthor && !matchesSynopsis) return false
      }
      return true
    }).sort((a, b) => {
      if (sortBy === 'updated') return a.updatedAt.localeCompare(b.updatedAt)
      return parseInt(b.totalReads) - parseInt(a.totalReads)
    })
  }, [allWorks, slug, selectedStatus, sortBy, searchQuery])

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mb-8">
        <Link to="/discover" className="hover:text-[var(--ink-primary)] inline-flex items-center gap-1 text-inherit no-underline">
          <ArrowLeft className="h-3 w-3" />
          <span>All Categories</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">{categoryInfo.name}</span>
      </div>

      {/* Category Header Hero */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-xs font-bold">
                {categoryInfo.accentLetter}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                Category Archive
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
              {categoryInfo.name}
            </h1>
            <p className="text-sm leading-relaxed text-[var(--ink-muted)] font-sans">
              {categoryInfo.description}
            </p>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-4 sm:pt-0 sm:pl-8 flex flex-col justify-center">
            <span className="font-mono text-2xl font-semibold text-[var(--ink-primary)]">
              {categoryWorks.length}
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider">
              Works Cataloged
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-8 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDisclosure
            label="Publication Status"
            activeId={selectedStatus}
            onChange={setSelectedStatus}
            items={[
              { id: 'all', label: 'All Statuses' },
              { id: 'Ongoing', label: 'Ongoing (Serialized)' },
              { id: 'Completed', label: 'Completed' },
            ]}
          />

          <FilterDisclosure
            label="Sort Order"
            activeId={sortBy}
            onChange={(id) => setSortBy(id as any)}
            items={[
              { id: 'popularity', label: 'Most Popular' },
              { id: 'updated', label: 'Recently Updated' },
            ]}
          />
        </div>

        <AnimatedSearch
          variant="expandable"
          placeholder={`Search ${categoryInfo.name.toLowerCase()}...`}
          value={searchQuery}
          onChange={setSearchQuery}
          shortcut="/"
        />
      </div>

      {/* Works Grid or Reusable Empty State */}
      {categoryWorks.length === 0 ? (
        <EmptyState
          type="no-works"
          customTitle={`No manuscripts yet in ${categoryInfo.name}`}
          customDescription={`Be the first author to publish a work under the ${categoryInfo.name} category.`}
          actionLabel="Publish a Work in this Category"
          actionHref="/write/new"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

    </div>
  )
}
