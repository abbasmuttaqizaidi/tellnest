import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useMemo, useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { GLOBAL_GENRES } from '../lib/taxonomy'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ArrowLeft, HelpCircle, Sparkles, BookOpen, Compass, Tag } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { parseTotalReads } from '../lib/utils'
import { getGenrePageDataServerFn, type GenrePageData } from '../server/works'

export interface GenreRouteSearch {
  trope?: string
}

export const Route = createFileRoute('/genre/$slug')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  validateSearch: (search: Record<string, unknown>): GenreRouteSearch => {
    const rawTrope = typeof search.trope === 'string' ? search.trope.trim() : ''
    return {
      trope: rawTrope || undefined,
    }
  },
  loader: async ({ params }): Promise<GenrePageData> => {
    try {
      const data = await getGenrePageDataServerFn({ data: params.slug })
      if (data) return data
    } catch (err) {
      console.warn('[Route /genre/$slug] Loader lookup error:', err)
    }

    // Client/Offline fallback against canonical taxonomy
    const normalized = (params.slug || '').trim().toLowerCase()
    const found = GLOBAL_GENRES.find((g) => g.slug.toLowerCase() === normalized)
    if (found) {
      return { genre: found, works: [], isNotFound: false }
    }
    throw notFound()
  },
  notFoundComponent: () => (
    <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
        Genre Not Found
      </h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        The requested literary genre does not exist or is not available.
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
    if (loaderData?.isNotFound || !loaderData?.genre) {
      return generateMeta({
        title: 'Genre Not Found',
        description: 'The requested literary genre could not be found on HatchPen.',
        noindex: true,
      })
    }

    const genre = loaderData.genre
    const genreName = genre.name
    const canonicalUrl = `https://hatchpen.com/genre/${genre.slug}`
    const description = `Read original ${genreName} stories, serialized novels, and indie manuscripts on HatchPen. Enjoy chapter-by-chapter reading with zero paywalls or subscriptions.`
    const works = loaderData.works || []

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is ${genreName} fiction on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${genreName} on HatchPen features original serialized novels and independent manuscripts characterized by ${genre.description.toLowerCase().replace(/\.$/, '')}. Stories are written by indie authors and published chapter by chapter.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can I read ${genreName} stories on HatchPen for free?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. All ${genreName} stories on HatchPen are 100% free to read online directly in your browser with zero paywalls, coins, or download requirements.`,
          },
        },
        {
          '@type': 'Question',
          name: `How often are new ${genreName} chapters released?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `HatchPen authors release new chapters on ongoing serialized schedules. You can add any story to your personal Library to receive updates when new chapters publish.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can independent authors publish ${genreName} stories on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. Writers can use HatchPen Creator Studio to draft, format, and serialize their own ${genreName} fiction directly to readers worldwide.`,
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
            name: genreName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Read ${genreName} Stories & Serialized Literature`,
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
      title: `Read ${genreName} Stories & Serialized Novels Online`,
      description,
      canonicalUrl,
      keywords: [
        genreName,
        `read ${genreName.toLowerCase()} online`,
        `${genreName.toLowerCase()} stories`,
        `${genreName.toLowerCase()} tropes`,
        `${genreName.toLowerCase()} serialized fiction`,
        `${genreName.toLowerCase()} novels`,
        'free web novels',
        'indie serialized literature',
        'HatchPen',
      ],
      ogType: 'website',
      jsonLd,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        { name: genreName, url: canonicalUrl },
      ],
    })
  },
  component: GenreTemplatePage,
})

function GenreTemplatePage() {
  const { slug } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const routeSearch = Route.useSearch()
  const navigate = Route.useNavigate()
  const { allWorks } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedTrope, setSelectedTrope] = useState<string>(routeSearch?.trope || 'all')

  useEffect(() => {
    setSelectedTrope(routeSearch?.trope || 'all')
  }, [routeSearch?.trope])

  const handleSelectTrope = (trope: string) => {
    const nextTrope = selectedTrope.toLowerCase() === trope.toLowerCase() ? 'all' : trope
    setSelectedTrope(nextTrope)
    navigate({
      search: (old: any) => ({
        ...old,
        trope: nextTrope === 'all' ? undefined : nextTrope,
      }),
      replace: true,
    })
  }

  if (loaderData?.isNotFound || !loaderData?.genre) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Genre Not Found
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          The literary genre &ldquo;{slug}&rdquo; does not exist or is not available.
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

  const genreInfo = loaderData.genre

  const relatedGenres = useMemo(() => {
    if (!genreInfo) return []
    const sameGroup = GLOBAL_GENRES.filter(
      (g) => g.group === genreInfo.group && g.slug !== genreInfo.slug
    )
    if (sameGroup.length >= 4) return sameGroup.slice(0, 6)

    const others = GLOBAL_GENRES.filter(
      (g) => g.group !== genreInfo.group && g.slug !== genreInfo.slug
    )
    return [...sameGroup, ...others].slice(0, 6)
  }, [genreInfo])

  // Use client allWorks when available; otherwise use SSR preloaded loaderData.works
  const baselineWorks = allWorks && allWorks.length > 0 ? allWorks : loaderData.works || []

  // Extract unique tropes from works in this genre, complemented by curated group tropes
  const availableTropes = useMemo(() => {
    const counts = new Map<string, number>()
    baselineWorks.forEach((w: any) => {
      const matchGenre =
        w.genreSlug === slug ||
        w.genre?.toLowerCase().replace(/\s+/g, '-') === slug ||
        (Array.isArray(w.genres) && w.genres.some((g: any) => g.slug === slug))
      if (!matchGenre) return
      if (Array.isArray(w.tags)) {
        w.tags.forEach((tag: string) => {
          const clean = (tag || '').trim()
          if (clean) counts.set(clean, (counts.get(clean) || 0) + 1)
        })
      }
    })

    const workTropes = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)

    const group = genreInfo?.group || ''
    let groupSuggested: string[] = []
    if (group === 'Romance') {
      groupSuggested = ['Slow-Burn', 'Forbidden Love', 'Obsession', 'Anti-Hero', 'Small Town', 'Trauma', 'Healing']
    } else if (group === 'Mystery & Thriller') {
      groupSuggested = ['Twist Ending', 'Unreliable Narrator', 'Betrayal', 'Revenge', 'Paranoid Atmosphere', 'Detective / Investigator']
    } else if (group === 'SciFi') {
      groupSuggested = ['Futuristic City', 'Space / Space Station', 'Virtual World / Metaverse', 'Survival', 'Anti-Hero', 'Mystery Box']
    } else if (group === 'Speculative & Horror') {
      groupSuggested = ['Dark', 'Survival', 'Horror-Tinged', 'Isolation', 'Family Secrets', 'Multiple Timelines']
    } else if (group === 'Historical & Literary') {
      groupSuggested = ['Historical Setting', 'Coming-of-Age', 'Family Secrets', 'Social Justice', 'Memory', 'Class Divide']
    } else {
      groupSuggested = ['Identity', 'Ambition', 'Redemption', 'Friendship', 'Standalone', 'Fast-Paced']
    }

    const combined = [...workTropes]
    for (const s of groupSuggested) {
      if (!combined.some((t) => t.toLowerCase() === s.toLowerCase())) {
        combined.push(s)
      }
    }

    return combined.slice(0, 8)
  }, [baselineWorks, slug, genreInfo])

  const genreWorks = useMemo(() => {
    return baselineWorks
      .filter((w: any) => {
        const matchGenre =
          w.genreSlug === slug ||
          w.genre?.toLowerCase().replace(/\s+/g, '-') === slug ||
          (Array.isArray(w.genres) && w.genres.some((g: any) => g.slug === slug))
        if (!matchGenre) return false
        if (selectedStatus !== 'all' && w.status !== selectedStatus) return false

        // Trope / Tag filter
        if (selectedTrope && selectedTrope !== 'all') {
          const normTrope = selectedTrope.toLowerCase().trim()
          const tags = Array.isArray(w.tags) ? w.tags : []
          const matchesTag = tags.some((t: string) => (t || '').toLowerCase().trim() === normTrope)
          const matchesTitleOrSynopsis =
            (w.title || '').toLowerCase().includes(normTrope) ||
            (w.synopsis || w.description || '').toLowerCase().includes(normTrope)
          if (!matchesTag && !matchesTitleOrSynopsis) return false
        }

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
  }, [baselineWorks, slug, selectedStatus, selectedTrope, sortBy, searchQuery])

  return (
    <div className="min-h-screen py-3 sm:py-7 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3 sm:space-y-5">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mb-8">
        <Link
          to="/discover"
          className="hover:text-[var(--ink-primary)] inline-flex items-center gap-1 text-inherit no-underline"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>All Genres</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">{genreInfo.name}</span>
      </div>

      {/* Genre Header Hero */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                {genreInfo.group || 'Literary Genre'}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                • Serialized Literature
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--ink-primary)] tracking-tight">
              {genreInfo.name}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-secondary)] font-sans">
              {genreInfo.description}
            </p>

            {/* Reading Experience Highlights */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <BookOpen className="h-3 w-3 text-[var(--accent)]" />
                <span>Chapter-by-Chapter</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                <span>100% Free Online</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Compass className="h-3 w-3 text-[var(--accent)]" />
                <span>Original Indie Authors</span>
              </span>
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-4 sm:pt-0 sm:pl-8 flex flex-col sm:items-end justify-center shrink-0">
            <span className="font-mono text-3xl font-bold text-[var(--ink-primary)]">
              {genreWorks.length}
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
              Published Works
            </span>
          </div>
        </div>
      </div>

      {/* Related Genres Topic Cluster (Internal Link Equity) */}
      {relatedGenres.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold">
              Explore Related Genres &amp; Tropes
            </span>
            <Link
              to="/discover"
              className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline inline-flex items-center gap-1"
            >
              All 34 Genres <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedGenres.map((rel) => (
              <Link
                key={rel.slug}
                to="/genre/$slug"
                params={{ slug: rel.slug }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-primary)] transition-all no-underline font-medium"
              >
                <span>{rel.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Popular Tropes & Themes Discovery Bar */}
      {availableTropes.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Filter by Popular Tropes &amp; Themes</span>
            </span>
            {selectedTrope !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelectTrope('all')}
                className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline transition-colors cursor-pointer"
              >
                Clear Trope Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
            <button
              type="button"
              onClick={() => handleSelectTrope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedTrope === 'all'
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium shadow-sm'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
            >
              All Tropes
            </button>
            {availableTropes.map((trope) => {
              const isSelected = selectedTrope.toLowerCase() === trope.toLowerCase()
              return (
                <button
                  key={trope}
                  type="button"
                  onClick={() => handleSelectTrope(trope)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all inline-flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium shadow-sm ring-1 ring-[var(--ink-primary)]'
                      : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <Tag className="w-3 h-3 opacity-60" />
                  <span>#{trope}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Genre Filter Controls */}
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
          placeholder={`Search ${genreInfo.name.toLowerCase()}...`}
          value={searchQuery}
          onChange={setSearchQuery}
          shortcut="/"
        />
      </div>

      {/* Grid or Empty */}
      {genreWorks.length === 0 ? (
        <EmptyState
          type="no-works"
          customTitle={
            selectedTrope !== 'all'
              ? `No ${genreInfo.name} stories found tagged #${selectedTrope}`
              : `No manuscripts yet in ${genreInfo.name}`
          }
          customDescription={
            selectedTrope !== 'all'
              ? `Try selecting a different trope or view all stories in ${genreInfo.name}.`
              : `Publish a new manuscript in the ${genreInfo.name} genre.`
          }
          actionLabel={selectedTrope !== 'all' ? `Show All ${genreInfo.name} Stories` : 'Publish a Work in this Genre'}
          actionHref={selectedTrope !== 'all' ? undefined : '/write/new'}
          onAction={selectedTrope !== 'all' ? () => handleSelectTrope('all') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {genreWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

      {/* Genre FAQ Section (Matches Schema.org FAQPage for Google Rich Snippets) */}
      <section className="mt-12 sm:mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-2.5 text-[var(--ink-primary)] font-serif text-xl sm:text-2xl font-bold">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2>Frequently Asked Questions About {genreInfo.name} Stories</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              What is {genreInfo.name} fiction on HatchPen?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              {genreInfo.name} on HatchPen features original serialized novels, novellas, and standalone literary manuscripts characterized by {genreInfo.description.toLowerCase().replace(/\.$/, '')}. Stories are written by independent authors and published chapter by chapter.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can I read {genreInfo.name} stories on HatchPen for free?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. All {genreInfo.name} stories on HatchPen are 100% free for readers. There are no paywalls, coin systems, or subscriptions required. You can read comfortably in any web browser without downloading an app.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              How often are new {genreInfo.name} chapters published?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              HatchPen authors release new chapters on ongoing serialized schedules. You can save any story to your personal Library to receive instant notifications whenever a new chapter is released.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can independent authors publish {genreInfo.name} stories?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. Writers can use HatchPen's distraction-free Creator Studio to draft, organize acts, and publish serialized {genreInfo.name} fiction directly to readers worldwide.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
