import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  Flame,
  Sparkles,
  BookOpen,
  ArrowRight,
  Trophy,
  Compass,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Clock,
  Heart,
  Eye,
  Star,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { FilterDisclosure, AnimatedSearch, Badge } from '../design-system'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { getHatchpenHitsServerFn, type HatchpenHitsResponse, type HatchpenHitWork } from '../server/hatchpenHits'

export const Route = createFileRoute('/hatchpen-hits')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  loader: async (): Promise<HatchpenHitsResponse> => {
    try {
      const data = await getHatchpenHitsServerFn()
      return data
    } catch (err) {
      console.warn('[Route /hatchpen-hits] Loader lookup error:', err)
      return {
        collection: {
          slug: 'hatchpen-hits',
          name: 'HatchPen Hits',
          headline: 'Most Celebrated & Viral Indie Web Novels',
          description:
            'Explore the most viral and celebrated serialized novels on HatchPen, handpicked by editors and readers including The Season We Fell, Pleasure After Dark, and Apartment 407. Read free chapter by chapter with zero paywalls.',
          keywords: [
            'hatchpen hits',
            'hatchpen top stories',
            'the season we fell',
            'pleasure after dark',
            'apartment 407',
            'viral web novels',
            'best serialized fiction',
            'HatchPen',
          ],
          accentLetter: 'H',
        },
        works: [],
        totalCount: 0,
        cachedAt: new Date().toISOString(),
      }
    }
  },
  head: ({ loaderData }) => {
    const canonicalUrl = 'https://hatchpen.com/hatchpen-hits'
    const pageTitle = 'HatchPen Hits — Most Popular & Viral Web Novels | HatchPen'
    const description =
      'Explore HatchPen Hits — our most celebrated indie stories, viral serialized novels, and readers\' top picks including The Season We Fell, Pleasure After Dark, and Apartment 407. 100% free with zero paywalls.'

    const works = loaderData?.works || []

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What are HatchPen Hits?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'HatchPen Hits are our most celebrated, highly-read, and viral serialized novels, curated by editors and powered by reader engagement. Iconic stories like The Season We Fell, Pleasure After Dark, and Apartment 407 are featured here.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I read HatchPen Hits for free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Every novel and chapter on HatchPen is 100% free to read online directly in your browser with zero paywalls, coins, or mandatory subscriptions.',
          },
        },
        {
          '@type': 'Question',
          name: 'How are stories selected for HatchPen Hits?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'HatchPen Hits are selected through a combination of verified reader love, chapter completion velocity, and editorial curation by the HatchPen team.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can independent authors get their stories on HatchPen Hits?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Any independent writer who publishes serialized fiction on HatchPen is automatically eligible for discovery, editorial spotlight, and entry into the monthly ₹2,000 cash prize contest.',
          },
        },
      ],
    }

    const collectionJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'HatchPen Hits — Most Popular & Viral Web Novels',
      description,
      url: canonicalUrl,
      publisher: {
        '@type': 'Organization',
        name: 'HatchPen',
        url: 'https://hatchpen.com',
      },
      mainEntity: {
        '@type': 'ItemList',
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        numberOfItems: works.length,
        itemListElement: works.slice(0, 24).map((w, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: w.title,
          url: `https://hatchpen.com/works/${w.slug || w.id}`,
          image: w.cover,
          description: w.synopsis,
          author: {
            '@type': 'Person',
            name: w.author.name,
          },
        })),
      },
    }

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://hatchpen.com/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'HatchPen Hits',
          item: canonicalUrl,
        },
      ],
    }

    return generateMeta({
      title: pageTitle,
      description,
      canonicalUrl,
      keywords: [
        'hatchpen hits',
        'hatchpen top stories',
        'the season we fell',
        'pleasure after dark',
        'apartment 407',
        'viral web novels',
        'best serialized fiction',
        'free online stories',
        'indie romance novels',
        'HatchPen',
      ],
      breadcrumbs: [
        { name: 'Home', url: 'https://hatchpen.com/' },
        { name: 'HatchPen Hits', url: canonicalUrl },
      ],
      customJsonLd: [collectionJsonLd, faqSchema, breadcrumbJsonLd],
    })
  },
  component: HatchpenHitsPage,
})

function HatchpenHitsPage() {
  const loaderData = Route.useLoaderData()
  const works = useMemo(() => loaderData.works || [], [loaderData.works])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  // Filter categories present in the hit works
  const availableCategories = useMemo(() => {
    const cats = new Map<string, { slug: string; name: string; count: number }>()
    works.forEach((w) => {
      const slug = w.categorySlug || 'novels'
      const name = w.category || 'Novels'
      if (!cats.has(slug)) {
        cats.set(slug, { slug, name, count: 1 })
      } else {
        cats.get(slug)!.count += 1
      }
    })
    return Array.from(cats.values())
  }, [works])

  // Filter works by search and category
  const filteredWorks = useMemo(() => {
    return works.filter((w) => {
      if (selectedCategory !== 'all' && w.categorySlug !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = (w.title || '').toLowerCase().includes(q)
        const matchSynopsis = (w.synopsis || '').toLowerCase().includes(q)
        const matchAuthor = (w.author?.name || '').toLowerCase().includes(q)
        const matchGenre = (w.genre || '').toLowerCase().includes(q)
        return matchTitle || matchSynopsis || matchAuthor || matchGenre
      }
      return true
    })
  }, [works, selectedCategory, searchQuery])

  const faqs = [
    {
      q: 'What are HatchPen Hits?',
      a: 'HatchPen Hits are our most celebrated, highly-read, and viral serialized novels, curated by editors and powered by reader engagement. Iconic stories like The Season We Fell, Pleasure After Dark, and Apartment 407 are showcased here.',
    },
    {
      q: 'Can I read HatchPen Hits for free?',
      a: 'Yes! Every novel and chapter on HatchPen is 100% free to read online directly in your browser with zero paywalls, coins, or mandatory subscriptions.',
    },
    {
      q: 'How are stories selected for HatchPen Hits?',
      a: 'HatchPen Hits are selected through a combination of verified reader love, chapter completion velocity, and editorial curation by the HatchPen team.',
    },
    {
      q: 'Can independent authors get their stories on HatchPen Hits?',
      a: 'Yes. Any independent writer who publishes serialized fiction on HatchPen is automatically eligible for discovery, editorial spotlight, and entry into the monthly ₹2,000 cash prize contest.',
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* 1. Breadcrumbs */}
      <nav
        aria-label="Breadcrumbs"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-xs flex items-center gap-1.5 text-[var(--ink-muted)]"
      >
        <Link to="/" className="hover:text-[var(--ink-primary)] transition-colors no-underline">
          Home
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">HatchPen Hits</span>
      </nav>

      {/* 2. Editorial Hero Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-b border-[var(--border-subtle)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Readers&apos; Choice &amp; Viral Serials</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[var(--ink-primary)]">
              HatchPen Hits
            </h1>

            <p className="font-serif text-base sm:text-lg text-[var(--ink-secondary)] leading-relaxed">
              Explore the most celebrated indie fiction, viral web novels, and readers&apos; top picks including{' '}
              <em className="text-[var(--ink-primary)] font-semibold not-italic">The Season We Fell</em>,{' '}
              <em className="text-[var(--ink-primary)] font-semibold not-italic">Pleasure After Dark</em>, and{' '}
              <em className="text-[var(--ink-primary)] font-semibold not-italic">Apartment 407</em>. Read free with zero coins or paywalls.
            </p>
          </div>
        </div>
      </header>

      {/* 3. Catalog Controls (Search & Category Filter) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 4. Stories Grid */}
        <div className="pt-6">
          {filteredWorks.length === 0 ? (
            <EmptyState
              type="no-search"
              customTitle="No HatchPen Hits match your search"
              customDescription="Try clearing your search query or switching categories."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredWorks.map((work, index) => (
                <div key={work.id} className="relative group">
                  {/* Rank Badge for Top 3 Hits */}
                  {index < 3 && !searchQuery.trim() && selectedCategory === 'all' && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-mono font-bold shadow-md border border-white/20">
                      <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>#{index + 1} Hit</span>
                    </div>
                  )}
                  <WorkCard work={work as any} layout="portrait" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Google FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border-subtle)]">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Reader &amp; Author FAQ</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
            Frequently Asked Questions About HatchPen Hits
          </h2>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {faqs.map((faq, i) => {
            const isOpen = openFaqIndex === i
            return (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left font-serif text-base font-semibold text-[var(--ink-primary)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[var(--ink-muted)] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[var(--ink-primary)]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-sm text-[var(--ink-secondary)] leading-relaxed font-sans animate-in fade-in duration-150">
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 6. Creator CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 mx-auto">
            <Flame className="w-6 h-6 fill-rose-500" />
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
            Have a story that deserves to be a HatchPen Hit?
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] max-w-xl mx-auto">
            Serializing your original fiction on HatchPen connects you directly with avid readers. Every manuscript is eligible for editorial spotlighting and our monthly cash prize contest.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/write"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
            >
              <span>Start Writing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/writing-contests"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[var(--border-strong)] bg-transparent text-[var(--ink-primary)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors no-underline"
            >
              <span>View Writing Contest</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
