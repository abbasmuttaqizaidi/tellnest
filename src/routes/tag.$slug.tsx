import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ALL_SUGGESTED_TAGS, slugify } from '../lib/taxonomy'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ArrowLeft, HelpCircle, Sparkles, BookOpen, Compass, Tag as TagIcon } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { parseTotalReads } from '../lib/utils'
import { getTagPageDataServerFn, type TagPageData } from '../server/works'
import { buildKnowledgeEntity } from '../lib/knowledgeGraph'

export const Route = createFileRoute('/tag/$slug')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  loader: async ({ params }): Promise<TagPageData> => {
    try {
      const data = await getTagPageDataServerFn({ data: params.slug })
      if (data && !data.isNotFound) return data
    } catch (err) {
      console.warn('[Route /tag/$slug] Loader lookup error:', err)
    }

    // Client/Offline fallback against canonical suggested tags
    const normalized = slugify(params.slug || '')
    const found = ALL_SUGGESTED_TAGS.find((t) => slugify(t) === normalized)
    if (found) {
      return {
        tag: {
          name: found,
          slug: normalized,
          description: `Original stories and serialized fiction featuring the ${found} trope on HatchPen.`,
        },
        works: [],
        relatedTags: [],
        isNotFound: false,
      }
    }

    throw notFound()
  },
  notFoundComponent: () => (
    <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
        Trope Not Found
      </h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        The requested narrative trope or tag does not exist or has no active manuscripts.
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
    if (loaderData?.isNotFound || !loaderData?.tag) {
      return generateMeta({
        title: 'Trope Not Found',
        description: 'The requested narrative trope or tag could not be found on HatchPen.',
        noindex: true,
      })
    }

    const tag = loaderData.tag
    const tagName = tag.name
    const canonicalUrl = `https://hatchpen.com/tag/${tag.slug}`
    const description = `Read original ${tagName} stories, serialized novels, and indie manuscripts on HatchPen. Enjoy chapter-by-chapter reading with zero paywalls or subscriptions.`
    const works = loaderData.works || []

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What are ${tagName} stories on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${tagName} stories on HatchPen feature original serialized fiction, web novels, and indie manuscripts focused on the ${tagName} trope and narrative themes. Stories are written by independent authors and published chapter by chapter.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can I read ${tagName} stories on HatchPen for free?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. All ${tagName} stories on HatchPen are 100% free to read online directly in your browser with zero paywalls, coins, or download requirements.`,
          },
        },
        {
          '@type': 'Question',
          name: `How often are new ${tagName} chapters released?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `HatchPen authors release new chapters on ongoing serialized schedules. You can add any story to your personal Library to receive updates when new chapters publish.`,
          },
        },
        {
          '@type': 'Question',
          name: `Can independent authors publish ${tagName} stories on HatchPen?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. Writers can use HatchPen Creator Studio to draft, format, and serialize their own ${tagName} fiction directly to readers worldwide.`,
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
            name: tagName,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Read Best ${tagName} Stories & Novels Online`,
        description,
        url: canonicalUrl,
        about: buildKnowledgeEntity(tagName, canonicalUrl),
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
      title: `Read Best ${tagName} Stories & Novels Online`,
      description,
      canonicalUrl,
      noindex: works.length === 0,
      keywords: [
        tagName,
        `${tagName.toLowerCase()} trope`,
        `read ${tagName.toLowerCase()} online`,
        `${tagName.toLowerCase()} stories`,
        `${tagName.toLowerCase()} serialized fiction`,
        `${tagName.toLowerCase()} novels`,
        'free web novels',
        'indie serialized literature',
        'HatchPen',
      ],
      ogType: 'website',
      jsonLd,
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        { name: tagName, url: canonicalUrl },
      ],
    })
  },
  component: TagTemplatePage,
})

function TagTemplatePage() {
  const { slug } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const { allWorks } = useApp()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

  if (loaderData?.isNotFound || !loaderData?.tag) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-3xl mx-auto text-center space-y-4">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Trope Not Found
        </h1>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          The requested literary trope or tag does not exist or has no active manuscripts.
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

  const tagInfo = loaderData.tag
  const relatedTags = loaderData.relatedTags || []

  // Use client allWorks when available; otherwise use SSR preloaded loaderData.works
  const baselineWorks = allWorks && allWorks.length > 0 ? allWorks : loaderData.works || []

  const matchingWorks = useMemo(() => {
    const normSlug = slugify(slug || '')
    return baselineWorks
      .filter((w: any) => {
        const tags = Array.isArray(w.tags) ? w.tags : []
        const hasTag = tags.some((t: string) => slugify(t || '') === normSlug)
        if (!hasTag) return false

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
  }, [baselineWorks, slug, selectedStatus, sortBy, searchQuery])

  return (
    <div className="min-h-screen py-3 sm:py-7 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3 sm:space-y-5">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mb-8">
        <Link
          to="/discover"
          className="hover:text-[var(--ink-primary)] inline-flex items-center gap-1 text-inherit no-underline"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Discover</span>
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-muted)]">Tropes &amp; Tags</span>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">#{tagInfo.name}</span>
      </div>

      {/* Trope Header Hero */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] inline-flex items-center gap-1">
                <TagIcon className="w-3 h-3 text-[var(--accent)]" />
                <span>{tagInfo.group || 'Literary Trope'}</span>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                • Narrative Theme
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--ink-primary)] tracking-tight">
              #{tagInfo.name}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-secondary)] font-sans">
              {tagInfo.description || `Original stories and serialized fiction featuring the ${tagInfo.name} trope on HatchPen.`}
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
              {matchingWorks.length}
            </span>
            <span className="font-mono text-xs text-[var(--ink-muted)] uppercase tracking-wider mt-0.5">
              Published Works
            </span>
          </div>
        </div>
      </div>

      {/* Related Tropes & Tags Cluster (Internal Link Equity) */}
      {relatedTags.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Explore Related Tropes &amp; Themes</span>
            </span>
            <Link
              to="/discover"
              className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline inline-flex items-center gap-1"
            >
              All Discovery Tags <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedTags.map((rel) => (
              <Link
                key={rel.slug}
                to="/tag/$slug"
                params={{ slug: rel.slug }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-primary)] transition-all no-underline font-medium"
              >
                <TagIcon className="w-3 h-3 opacity-60" />
                <span>#{rel.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Trope Filter Controls */}
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
          placeholder={`Search ${tagInfo.name.toLowerCase()} stories...`}
          value={searchQuery}
          onChange={setSearchQuery}
          shortcut="/"
        />
      </div>

      {/* Grid or Empty */}
      {matchingWorks.length === 0 ? (
        <EmptyState
          type="no-works"
          customTitle={`No manuscripts yet tagged #${tagInfo.name}`}
          customDescription={`Be the first to publish a new manuscript featuring the ${tagInfo.name} trope.`}
          actionLabel="Publish a Work with this Trope"
          actionHref="/write/new"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {matchingWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

      {/* Trope FAQ Section (Matches Schema.org FAQPage for Google Rich Snippets) */}
      <section className="mt-12 sm:mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-2.5 text-[var(--ink-primary)] font-serif text-xl sm:text-2xl font-bold">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2>Frequently Asked Questions About #{tagInfo.name} Stories</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              What are #{tagInfo.name} stories on HatchPen?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              #{tagInfo.name} fiction on HatchPen includes original serialized novels and standalone manuscripts centered around {tagInfo.name.toLowerCase()} themes. Stories are written by independent authors and published chapter by chapter.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can I read #{tagInfo.name} stories on HatchPen for free?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. All #{tagInfo.name} stories on HatchPen are 100% free for readers. There are no paywalls, coin systems, or subscriptions required. You can read comfortably in any web browser without downloading an app.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              How often are new #{tagInfo.name} chapters published?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              HatchPen authors release new chapters on ongoing serialized schedules. You can save any story to your personal Library to receive instant notifications whenever a new chapter is released.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Can independent authors publish #{tagInfo.name} stories?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans">
              Yes. Writers can use HatchPen's distraction-free Creator Studio to draft, organize acts, and publish serialized #{tagInfo.name} fiction directly to readers worldwide.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
