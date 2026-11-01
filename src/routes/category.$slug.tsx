import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES, slugify } from '../lib/taxonomy'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ArrowLeft, HelpCircle, Compass, Layers, BookOpen, Sparkles } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { parseTotalReads } from '../lib/utils'
import { getCategoryPageDataServerFn, type CategoryPageData } from '../server/works'

export const Route = createFileRoute('/category/$slug')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  loader: async ({ params }): Promise<CategoryPageData> => {
    try {
      const data = await getCategoryPageDataServerFn({ data: params.slug })
      if (data) return data
    } catch (err) {
      console.warn('[Route /category/$slug] Loader lookup error:', err)
    }

    // Client/Offline fallback against canonical taxonomy
    const normalized = (params.slug || '').trim().toLowerCase()
    const found = GLOBAL_CATEGORIES.find((c) => c.slug.toLowerCase() === normalized)
    if (found) {
      return { category: found, works: [], isNotFound: false }
    }
    throw notFound()
  },
  notFoundComponent: () => (
    <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
        Category Not Found
      </h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        The requested literary category does not exist or is not available.
      </p>
      <Link
        to="/discover"
        className="inline-block rounded-md border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline"
      >
        Explore Catalog
      </Link>
    </div>
  ),
  head: ({ params, loaderData }) => {
    if (loaderData?.isNotFound || !loaderData?.category) {
      return generateMeta({
        title: 'Category Not Found',
        description: 'The requested literary category could not be found on HatchPen.',
        noindex: true,
      })
    }

    const category = loaderData.category
    const categoryName = category.name
    const canonicalUrl = `https://hatchpen.com/category/${category.slug}`
    const description = `Read original ${categoryName} stories, serialized manuscripts, and indie fiction on HatchPen. Enjoy chapter-by-chapter reading with zero paywalls or subscriptions.`
    const works = loaderData.works || []

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is ${categoryName} on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${categoryName} on HatchPen encompasses original literary works and manuscripts characterized by ${category.description.toLowerCase().replace(/\.$/, '')}. Stories are created by independent authors and published chapter by chapter.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can I read ${categoryName} stories on HatchPen for free?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. All ${categoryName} stories, chapters, and serialized manuscripts on HatchPen are 100% free to read online directly in your browser with zero paywalls, coins, or mandatory subscriptions.`,
          },
        },
        {
          '@type': 'Question',
          name: `How does serialization work for ${categoryName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Authors release serialized installments according to regular release schedules. You can add any manuscript to your personal Library to receive instant notifications when fresh chapters publish.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can independent writers publish ${categoryName} on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. Writers can use HatchPen Creator Studio to compose, organize acts, and serialize their own ${categoryName} manuscripts directly to an engaged reading community.`,
          },
        },
      ],
    }

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://hatchpen.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Discover',
            item: 'https://hatchpen.com/discover',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: categoryName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Read Best ${categoryName} Stories & Web Novels Online`,
        description,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: works.length,
          itemListElement: works.slice(0, 20).map((w: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://hatchpen.com/works/${w.slug || w.id}`,
            name: w.title,
          })),
        },
      },
      faqJsonLd,
    ]

    return generateMeta({
      title: `Read Best ${categoryName} Stories & Web Novels Online`,
      description,
      canonicalUrl,
      keywords: [
        categoryName,
        `read ${categoryName.toLowerCase()} online`,
        `free ${categoryName.toLowerCase()} stories`,
        `serialized ${categoryName.toLowerCase()}`,
        'indie web novels',
        'free serialized fiction',
        'HatchPen',
      ],
      ogType: 'website',
      jsonLd,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        { name: categoryName, url: canonicalUrl },
      ],
    })
  },
  component: CategoryTemplatePage,
})

function CategoryTemplatePage() {
  const { slug } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const { allWorks } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

  if (loaderData?.isNotFound || !loaderData?.category) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Category Not Found
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          The literary category &ldquo;{slug}&rdquo; does not exist or is not available.
        </p>
        <div className="pt-4">
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity no-underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Catalog</span>
          </Link>
        </div>
      </div>
    )
  }

  const categoryInfo = loaderData.category

  // Use client allWorks when available; otherwise use SSR preloaded loaderData.works
  const baselineWorks = allWorks && allWorks.length > 0 ? allWorks : loaderData.works || []

  // Filter works matching this category
  const categoryWorks = useMemo(() => {
    return baselineWorks
      .filter((w: any) => {
        const matchCat =
          w.categorySlug === slug ||
          slugify(w.category || '') === slug ||
          w.category?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug ||
          w.category === categoryInfo.name
        if (!matchCat) return false
        if (selectedStatus !== 'all' && w.status !== selectedStatus) return false
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchesTitle = (w.title || '').toLowerCase().includes(q)
          const matchesAuthor = (w.author?.name || '').toLowerCase().includes(q)
          const matchesSynopsis = (w.synopsis || w.description || '').toLowerCase().includes(q)
          if (!matchesTitle && !matchesAuthor && !matchesSynopsis) return false
        }
        return true
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'updated') return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
        return parseTotalReads(b.totalReads) - parseTotalReads(a.totalReads)
      })
  }, [baselineWorks, slug, categoryInfo.name, selectedStatus, sortBy, searchQuery])

  // Discoverable popular literary genres (Internal PageRank flow)
  const popularGenres = useMemo(() => {
    return GLOBAL_GENRES.slice(0, 10)
  }, [])

  // Sibling category navigation
  const siblingCategories = useMemo(() => {
    return GLOBAL_CATEGORIES.filter((c) => c.slug !== categoryInfo.slug).slice(0, 8)
  }, [categoryInfo.slug])

  return (
    <div className="min-h-screen py-3 sm:py-7 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mb-4">
        <Link
          to="/discover"
          className="hover:text-[var(--ink-primary)] inline-flex items-center gap-1 text-inherit no-underline"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Discover</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-muted)]">Categories</span>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">{categoryInfo.name}</span>
      </div>

      {/* Category Header Hero */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-xs font-bold">
                {categoryInfo.accentLetter || categoryInfo.name.charAt(0)}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                Literary Format Archive
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
              {categoryInfo.name}
            </h1>
            <p className="text-sm leading-relaxed text-[var(--ink-muted)] font-sans">
              {categoryInfo.description}
            </p>
            {/* Zero-Paywall Reading Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] font-mono text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <BookOpen className="h-3 w-3 text-[var(--accent)]" />
                <span>100% Free Online</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Layers className="h-3 w-3 text-[var(--accent)]" />
                <span>Serialized Releases</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Compass className="h-3 w-3 text-[var(--accent)]" />
                <span>Original Indie Authors</span>
              </span>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-4 sm:pt-0 sm:pl-8 flex flex-col justify-center shrink-0">
            <span className="font-mono text-3xl font-bold text-[var(--ink-primary)]">
              {categoryWorks.length}
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
              Cataloged Works
            </span>
          </div>
        </div>
      </div>

      {/* Explore Popular Literary Genres Topic Cluster (Internal PageRank Flow) */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Explore Genres in this Category</span>
          </span>
          <Link
            to="/discover"
            className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline inline-flex items-center gap-1"
          >
            All 34 Genres <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {popularGenres.map((g) => (
            <Link
              key={g.slug}
              to="/genre/$slug"
              params={{ slug: g.slug }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-primary)] transition-all no-underline font-medium"
            >
              <span>{g.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sibling Literary Formats Cluster */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-1.5 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Explore Other Literary Formats</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {siblingCategories.map((c) => (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-primary)] transition-all no-underline font-medium"
            >
              <span className="opacity-70 font-mono text-[10px]">{c.accentLetter}</span>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Category Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-6 text-xs">
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

      {/* Category FAQ Section (Matches Schema.org FAQPage for Google Rich Snippets) */}
      <section className="mt-12 sm:mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-2.5 text-[var(--ink-primary)] font-serif text-xl sm:text-2xl font-bold">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2>Frequently Asked Questions About {categoryInfo.name} Literature</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              What is {categoryInfo.name} on HatchPen?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              {categoryInfo.name} on HatchPen encompasses original literary works and manuscripts characterized by {categoryInfo.description.toLowerCase().replace(/\.$/, '')}. Stories are created by independent authors and published chapter by chapter.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can I read {categoryInfo.name} stories on HatchPen for free?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. All {categoryInfo.name} stories, chapters, and serialized manuscripts on HatchPen are 100% free to read online directly in your browser with zero paywalls, coins, or mandatory subscriptions.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              How does serialization work for {categoryInfo.name}?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Authors release serialized installments according to regular release schedules. You can add any manuscript to your personal Library to receive instant notifications when fresh chapters publish.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can independent writers publish {categoryInfo.name} on HatchPen?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. Writers can use HatchPen Creator Studio to compose, organize acts, and serialize their own {categoryInfo.name} manuscripts directly to an engaged reading community.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
