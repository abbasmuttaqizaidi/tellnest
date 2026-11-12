import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  BookOpen,
  ArrowRight,
  ChevronDown,
  HelpCircle,
  Clock,
  Eye,
  Feather,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { OptimizedImage } from '../components/OptimizedImage'
import { formatViewCount } from '../lib/utils'
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
  const works: HatchpenHitWork[] = useMemo(() => loaderData.works || [], [loaderData.works])
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const leadWork = works[0]
  const rosterWorks = useMemo(() => works.slice(1), [works])

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
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2 text-xs flex items-center gap-1.5 text-[var(--ink-muted)]"
      >
        <Link to="/" className="hover:text-[var(--ink-primary)] transition-colors no-underline">
          Home
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-medium">HatchPen Hits</span>
      </nav>

      {/* 2. Editorial Folio Monograph Header */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 sm:pt-10 sm:pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] text-[11px] font-mono uppercase tracking-[0.22em] mb-5 shadow-2xs">
          <span>Editorial Curations</span>
          <span className="text-[var(--ink-muted)]">•</span>
          <span>Exclusive Folio</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-[var(--ink-primary)] leading-[1.08]">
          HatchPen Hits
        </h1>

        <p className="mt-5 font-serif text-lg sm:text-2xl text-[var(--ink-secondary)] max-w-2xl mx-auto leading-relaxed">
          Our definitive canon of standout serialized fiction — hand-selected for craft, emotional resonance, and reader devotion.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-4 text-xs font-mono text-[var(--ink-muted)]">
          <span>Curated Edition</span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <span>{works.length} {works.length === 1 ? 'Work' : 'Works'} Spotlighted</span>
          <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
          <span>Zero Paywalls</span>
        </div>
      </header>

      {/* 3. Empty State Fallback (If no works are curated yet) */}
      {works.length === 0 && (
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="p-8 sm:p-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <BookOpen className="w-8 h-8 text-[var(--ink-muted)] mx-auto stroke-[1.5]" />
            <h2 className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
              Curating the Next Folio
            </h2>
            <p className="text-sm text-[var(--ink-secondary)] font-serif max-w-md mx-auto">
              Our editors are currently selecting exceptional serials for this showcase. Check back shortly or explore our wider catalog.
            </p>
            <div className="pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-strong)] text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
              >
                <span>Browse Discover Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 4. Flagship Lead Title (Folio Nº 01) */}
      {leadWork && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
          <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 lg:p-12 shadow-xs transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Cover Art Presentation */}
              <div className="md:col-span-5 flex justify-center">
                <Link
                  to="/works/$workId"
                  params={{ workId: leadWork.slug || leadWork.id }}
                  preload="intent"
                  className="group relative block w-full max-w-[280px] sm:max-w-[320px] aspect-[2/3] rounded-lg overflow-hidden border border-[var(--border-strong)] shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <OptimizedImage
                    src={leadWork.cover}
                    alt={`${leadWork.title} by ${leadWork.author.name}`}
                    width={480}
                    height={720}
                    priority
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Discreet editorial rank marker */}
                  <div className="absolute top-3 left-3 bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase rounded">
                    Folio Nº 01
                  </div>
                </Link>
              </div>

              {/* Editorial Dossier */}
              <div className="md:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                    Flagship Spotlight
                  </span>
                  <span className="text-[var(--ink-muted)] text-xs">•</span>
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-secondary)]">
                    {leadWork.genre || leadWork.category || 'Fiction'}
                  </span>
                  {leadWork.status && (
                    <>
                      <span className="text-[var(--ink-muted)] text-xs">•</span>
                      <span className="text-xs font-mono text-[var(--ink-muted)]">
                        {leadWork.status}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--ink-primary)] leading-[1.14]">
                  <Link
                    to="/works/$workId"
                    params={{ workId: leadWork.slug || leadWork.id }}
                    preload="intent"
                    className="hover:underline decoration-1 underline-offset-4 text-[var(--ink-primary)] no-underline"
                  >
                    {leadWork.title}
                  </Link>
                </h2>

                <p className="text-sm sm:text-base font-serif text-[var(--ink-muted)]">
                  by{' '}
                  <Link
                    to="/authors/$authorId"
                    params={{ authorId: leadWork.author.handle || leadWork.author.id }}
                    className="text-[var(--ink-primary)] font-medium hover:underline decoration-1"
                  >
                    {leadWork.author.name}
                  </Link>
                </p>

                {leadWork.synopsis && (
                  <p className="font-serif text-base sm:text-lg text-[var(--ink-secondary)] leading-relaxed line-clamp-4">
                    {leadWork.synopsis}
                  </p>
                )}

                {/* Subdued Reading Metadata */}
                <div className="pt-3 flex flex-wrap items-center gap-6 text-xs font-mono text-[var(--ink-muted)] border-t border-[var(--border-subtle)]">
                  {leadWork.readingTimeMinutes > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{leadWork.readingTimeMinutes} min read</span>
                    </div>
                  )}
                  {leadWork.wordCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{leadWork.wordCount.toLocaleString()} words</span>
                    </div>
                  )}
                  {Number(leadWork.viewCount) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatViewCount(leadWork.viewCount)} readers</span>
                    </div>
                  )}
                </div>

                {/* Editorial CTAs */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    to="/works/$workId"
                    params={{ workId: leadWork.slug || leadWork.id }}
                    preload="intent"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity no-underline shadow-xs"
                  >
                    <span>Begin Reading</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. Curated Folio Roster (Folio Nº 02 to Nº 06) */}
      {rosterWorks.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-8">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                The Roster
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] mt-1">
                Curated Folio Selections
              </h2>
            </div>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              Folios Nº 02 – Nº {String(works.length).padStart(2, '0')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {rosterWorks.map((work, index) => {
              const folioNumber = String(index + 2).padStart(2, '0')
              return (
                <article
                  key={work.id}
                  className="group relative flex flex-col sm:flex-row gap-5 p-5 sm:p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all duration-200"
                >
                  {/* Book Cover */}
                  <Link
                    to="/works/$workId"
                    params={{ workId: work.slug || work.id }}
                    preload="intent"
                    className="relative aspect-[2/3] w-28 sm:w-32 shrink-0 rounded-md overflow-hidden border border-[var(--border-subtle)] shadow-xs mx-auto sm:mx-0 group-hover:shadow-md transition-shadow"
                  >
                    <OptimizedImage
                      src={work.cover}
                      alt={`${work.title} by ${work.author.name}`}
                      width={240}
                      height={360}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-1.5 py-0.5 text-[9px] font-mono tracking-wider rounded">
                      Nº {folioNumber}
                    </div>
                  </Link>

                  {/* Dossier */}
                  <div className="flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                          {work.genre || work.category || 'Fiction'}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                          {work.status || 'Serialized'}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink-primary)] leading-snug">
                        <Link
                          to="/works/$workId"
                          params={{ workId: work.slug || work.id }}
                          preload="intent"
                          className="hover:underline decoration-1 underline-offset-2 text-[var(--ink-primary)] no-underline"
                        >
                          {work.title}
                        </Link>
                      </h3>

                      <p className="text-xs sm:text-sm font-serif text-[var(--ink-muted)]">
                        by{' '}
                        <Link
                          to="/authors/$authorId"
                          params={{ authorId: work.author.handle || work.author.id }}
                          className="text-[var(--ink-primary)] font-medium hover:underline decoration-1"
                        >
                          {work.author.name}
                        </Link>
                      </p>

                      {work.synopsis && (
                        <p className="text-xs sm:text-sm font-serif text-[var(--ink-secondary)] leading-relaxed line-clamp-3">
                          {work.synopsis}
                        </p>
                      )}
                    </div>

                    {/* Card Footer: Metadata & Action */}
                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--ink-muted)]">
                        {work.readingTimeMinutes > 0 && (
                          <span>{work.readingTimeMinutes}m read</span>
                        )}
                        {Number(work.viewCount) > 0 && (
                          <span>{formatViewCount(work.viewCount)} readers</span>
                        )}
                      </div>

                      <Link
                        to="/works/$workId"
                        params={{ workId: work.slug || work.id }}
                        preload="intent"
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--ink-primary)] group-hover:translate-x-0.5 transition-transform no-underline"
                      >
                        <span>Read</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* 6. Editorial FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[var(--border-subtle)]">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Editorial Notes &amp; FAQ</span>
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
                  className="w-full flex items-center justify-between gap-4 text-left font-serif text-base font-semibold text-[var(--ink-primary)] hover:opacity-80 transition-opacity cursor-pointer"
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

      {/* 7. Submissions & Creator Consideration */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 text-center space-y-4 shadow-xs">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)] mx-auto">
            <Feather className="w-5 h-5" />
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
            Have a story that belongs in HatchPen Hits?
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] font-serif max-w-xl mx-auto leading-relaxed">
            Serializing original fiction on HatchPen connects your voice directly with readers. Every manuscript is eligible for editorial spotlighting and our monthly literary prize contest.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/write"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
            >
              <span>Begin Serializing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/writing-contests"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-strong)] bg-transparent text-[var(--ink-primary)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors no-underline"
            >
              <span>View Literary Contest</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
