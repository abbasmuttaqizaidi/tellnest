import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { GLOBAL_GENRES } from '../lib/taxonomy'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ArrowLeft, HelpCircle, Compass, Layers, BookOpen, Sparkles, Flame, ChevronDown } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { parseTotalReads } from '../lib/utils'
import {
  getBrowseCollectionServerFn,
  BROWSE_COLLECTIONS,
  type BrowseCollectionPageData,
} from '../server/works'

export const Route = createFileRoute('/browse/$collection')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  loader: async ({ params }): Promise<BrowseCollectionPageData> => {
    try {
      const data = await getBrowseCollectionServerFn({ data: params.collection })
      if (data && !data.isNotFound) return data
    } catch (err) {
      console.warn('[Route /browse/$collection] Loader lookup error:', err)
    }

    // Client/Offline fallback against canonical collections
    const normalized = (params.collection || '').trim().toLowerCase()
    const found = BROWSE_COLLECTIONS[normalized]
    if (found) {
      return { collection: found, works: [], isNotFound: false }
    }
    throw notFound()
  },
  notFoundComponent: () => (
    <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
        Collection Not Found
      </h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        The requested editorial collection does not exist or is not available.
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
    if (loaderData?.isNotFound || !loaderData?.collection) {
      return generateMeta({
        title: 'Collection Not Found',
        description: 'The requested curated reading collection could not be found on HatchPen.',
        noindex: true,
      })
    }

    const collection = loaderData.collection
    const collectionName = collection.name
    const canonicalUrl = `https://hatchpen.com/browse/${collection.slug}`
    const description = `${collection.description} Read top indie novels and serialized stories chapter by chapter with zero coins or paywalls on HatchPen.`
    const works = loaderData.works || []

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is the ${collectionName} collection on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${collectionName} on HatchPen features ${collection.description.toLowerCase().replace(/\.$/, '')}. All stories are written by independent authors and published serialized chapter by chapter.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can I read ${collectionName} on HatchPen for free?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. All stories in the ${collectionName} collection are 100% free to read online directly in your browser with zero paywalls, coins, or mandatory subscriptions.`,
          },
        },
        {
          '@type': 'Question',
          name: `How often is this collection updated?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `The ${collectionName} collection updates dynamically as independent authors publish new chapters and manuscripts across HatchPen.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can independent writers be featured in ${collectionName}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. Any writer serializing original fiction on HatchPen who meets the editorial criteria is automatically eligible for discovery in this collection.`,
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
            name: collectionName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${collectionName} — ${collection.headline}`,
        description,
        url: canonicalUrl,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: works.length,
          itemListElement: works.slice(0, 25).map((w: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `https://hatchpen.com/works/${w.slug || w.id}`,
            name: w.title,
          })),
        },
      },
      faqJsonLd,
    ]

    const pageTitle = `${collection.headline} [Read Free Online] | HatchPen`

    return generateMeta({
      title: pageTitle,
      description,
      canonicalUrl,
      keywords: [
        ...collection.keywords,
        'serialized literature',
        'free web novels',
        'read online',
        'HatchPen',
      ],
      ogType: 'website',
      jsonLd,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        { name: collectionName, url: canonicalUrl },
      ],
    })
  },
  component: BrowseCollectionTemplatePage,
})

function BrowseCollectionTemplatePage() {
  const { collection: collectionSlug } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const { allWorks } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

  if (loaderData?.isNotFound || !loaderData?.collection) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Collection Not Found
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          The editorial collection &ldquo;{collectionSlug}&rdquo; does not exist or is not available.
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

  const collectionInfo = loaderData.collection
  const baselineWorks = loaderData.works || []

  // Filter works matching user in-page search and status toggle
  const displayedWorks = useMemo(() => {
    return baselineWorks
      .filter((w: any) => {
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
  }, [baselineWorks, selectedStatus, sortBy, searchQuery])

  // Sibling Curated Collections
  const siblingCollections = useMemo(() => {
    return Object.values(BROWSE_COLLECTIONS).filter((c) => c.slug !== collectionInfo.slug)
  }, [collectionInfo.slug])

  // Popular Genres for cross-linking
  const popularGenres = useMemo(() => {
    return GLOBAL_GENRES.slice(0, 10)
  }, [])

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
        <span className="text-[var(--ink-muted)]">Collections</span>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">{collectionInfo.name}</span>
      </div>

      {/* Collection Header Hero */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-xs font-bold">
                {collectionInfo.accentLetter}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
                Curated Editorial Hub
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
              {collectionInfo.name}
            </h1>
            <p className="text-sm font-medium text-[var(--accent)]">
              {collectionInfo.headline}
            </p>
            <p className="text-sm leading-relaxed text-[var(--ink-muted)] font-sans">
              {collectionInfo.description}
            </p>
            {/* Zero-Paywall Reading Badges */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11px] font-mono text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <BookOpen className="h-3 w-3 text-[var(--accent)]" />
                <span>100% Free to Read</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Layers className="h-3 w-3 text-[var(--accent)]" />
                <span>Zero Paywalls or Subscriptions</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Flame className="h-3 w-3 text-[var(--accent)]" />
                <span>Curated Weekly</span>
              </span>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-4 sm:pt-0 sm:pl-8 flex flex-col justify-center shrink-0">
            <span className="font-mono text-3xl font-bold text-[var(--ink-primary)]">
              {displayedWorks.length}
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
              Curated Works
            </span>
          </div>
        </div>
      </div>

      {/* Sibling Editorial Collections (Internal Link Equity) */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-1.5 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Explore Other Curated Shelves</span>
          </span>
          <Link
            to="/discover"
            className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline inline-flex items-center gap-1"
          >
            All Stories <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {siblingCollections.map((c) => (
            <Link
              key={c.slug}
              to="/browse/$collection"
              params={{ collection: c.slug }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-primary)] transition-all no-underline font-medium"
            >
              <span className="opacity-70 font-mono text-[10px]">{c.accentLetter}</span>
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Genres Topic Cluster */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-1.5 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Browse by Literary Genre</span>
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

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)] mb-6 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <FilterDisclosure
            label="Publication Status"
            activeId={selectedStatus}
            onChange={setSelectedStatus}
            items={[
              { id: 'all', label: 'All Statuses' },
              { id: 'Ongoing', label: 'Ongoing' },
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
          placeholder={`Search ${collectionInfo.name.toLowerCase()}...`}
          value={searchQuery}
          onChange={setSearchQuery}
          shortcut="/"
        />
      </div>

      {/* Works Grid or Reusable Empty State */}
      {displayedWorks.length === 0 ? (
        <EmptyState
          type="no-works"
          customTitle={`No manuscripts yet in ${collectionInfo.name}`}
          customDescription={`Check back soon or explore other curated reading collections.`}
          actionLabel="Explore All Stories"
          actionHref="/discover"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayedWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

      {/* Collection FAQ Section (Matches Schema.org FAQPage for Google Rich Snippets) */}
      <section className="mt-12 sm:mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-2.5 text-[var(--ink-primary)] font-serif text-xl sm:text-2xl font-bold">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2>Frequently Asked Questions About {collectionInfo.name}</h2>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-1">
          <details className="group py-3.5 [&_summary::-webkit-details-marker]:hidden" open>
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>What is the {collectionInfo.name} collection on HatchPen?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-4">
              {collectionInfo.name} on HatchPen features {collectionInfo.description.toLowerCase().replace(/\.$/, '')}. Stories are written by independent authors and published serialized chapter by chapter.
            </p>
          </details>

          <details className="group py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>Can I read {collectionInfo.name} stories on HatchPen for free?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-4">
              Yes. All stories in the {collectionInfo.name} collection are 100% free for readers. There are no paywalls, coin systems, or subscriptions required. You can read comfortably in any web browser without downloading an app.
            </p>
          </details>

          <details className="group py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>How often is this collection updated?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-4">
              The {collectionInfo.name} collection updates continuously as authors release new chapters and new manuscripts publish across HatchPen. You can save any story to your personal Library to get updates when new chapters release.
            </p>
          </details>

          <details className="group py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>Can independent writers be featured in {collectionInfo.name}?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-4">
              Yes. Writers can use HatchPen Creator Studio to draft, format, and serialize their own stories. Qualifying stories are automatically surfaced across HatchPen's curated discovery hubs.
            </p>
          </details>
        </div>
      </section>
    </div>
  )
}
