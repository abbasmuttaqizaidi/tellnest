import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  // Touch swipe support for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  const activeWork = works[activeIndex] || works[0]

  const goToPrev = useCallback(() => {
    if (works.length === 0) return
    setActiveIndex((prev) => (prev === 0 ? works.length - 1 : prev - 1))
  }, [works.length])

  const goToNext = useCallback(() => {
    if (works.length === 0) return
    setActiveIndex((prev) => (prev === works.length - 1 ? 0 : prev + 1))
  }, [works.length])

  // Keyboard navigation (ArrowLeft & ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null)
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return
    const distance = touchStartX - touchEndX
    if (distance > 50) {
      goToNext()
    } else if (distance < -50) {
      goToPrev()
    }
  }

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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 text-xs flex items-center justify-between text-[var(--ink-muted)] border-b border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-1.5">
          <Link to="/" className="hover:text-[var(--ink-primary)] transition-colors no-underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-[var(--ink-primary)] font-medium">HatchPen Hits</span>
        </div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] hidden sm:block">
          Curated Editorial Folio
        </div>
      </nav>

      {/* 2. Empty State Fallback (If no works are curated) */}
      {works.length === 0 ? (
        <section className="max-w-3xl mx-auto px-4 py-24 text-center">
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
      ) : (
        /* 3. Bespoke Full-Page Editorial Slider Stage */
        <section
          className="relative overflow-hidden border-b border-[var(--border-subtle)]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Main Stage Viewport */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] flex items-center relative">
            {/* Giant Background Watermark Numeral */}
            <div
              aria-hidden="true"
              className="absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 font-serif text-[180px] sm:text-[260px] lg:text-[340px] font-normal leading-none text-[var(--ink-muted)]/[0.04] select-none pointer-events-none transition-all duration-700"
            >
              {String(activeIndex + 1).padStart(2, '0')}
            </div>

            {/* Slide Stage Grid */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
              {/* Left Column: Book Artistry & Dimensional Presentation */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="relative group w-full max-w-[280px] sm:max-w-[340px] lg:max-w-[380px]">
                  {/* Subtle Book Spine / Depth Backdrop */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 translate-x-3 translate-y-3 rounded-lg bg-[var(--border-strong)]/40 -z-10"
                  />

                  {/* Main Book Cover with Fine Hairline Border & Depth */}
                  <Link
                    to="/works/$workId"
                    params={{ workId: activeWork.slug || activeWork.id }}
                    preload="intent"
                    className="block aspect-[2/3] w-full rounded-lg overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xl hover:shadow-2xl transition-all duration-300 relative"
                  >
                    <OptimizedImage
                      key={activeWork.id}
                      src={activeWork.cover}
                      alt={`${activeWork.title} by ${activeWork.author.name}`}
                      width={520}
                      height={780}
                      priority
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Discreet Monospaced Folio Badge */}
                    <div className="absolute top-3 left-3 bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase rounded shadow-xs">
                      Folio Nº {String(activeIndex + 1).padStart(2, '0')}
                    </div>
                  </Link>
                </div>
              </div>

              {/* Right Column: Editorial Dossier & Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Header Tagline & Curated Marker */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--ink-muted)]">
                    Folio Nº {String(activeIndex + 1).padStart(2, '0')} of {String(works.length).padStart(2, '0')}
                  </span>
                  <span className="text-[var(--ink-muted)] text-xs">•</span>
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-secondary)]">
                    {activeWork.genre || activeWork.category || 'Fiction'}
                  </span>
                  {activeWork.status && (
                    <>
                      <span className="text-[var(--ink-muted)] text-xs">•</span>
                      <span className="text-xs font-mono text-[var(--ink-muted)]">
                        {activeWork.status}
                      </span>
                    </>
                  )}
                </div>

                {/* Stately Title */}
                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[var(--ink-primary)] leading-[1.1]">
                  <Link
                    to="/works/$workId"
                    params={{ workId: activeWork.slug || activeWork.id }}
                    preload="intent"
                    className="hover:underline decoration-1 underline-offset-4 text-[var(--ink-primary)] no-underline"
                  >
                    {activeWork.title}
                  </Link>
                </h1>

                {/* Author Byline */}
                <p className="text-sm sm:text-base font-serif text-[var(--ink-muted)]">
                  Written by{' '}
                  <Link
                    to="/authors/$authorId"
                    params={{ authorId: activeWork.author.handle || activeWork.author.id }}
                    className="text-[var(--ink-primary)] font-medium hover:underline decoration-1"
                  >
                    {activeWork.author.name}
                  </Link>
                </p>

                {/* Rich Synopsis Excerpt */}
                {activeWork.synopsis && (
                  <p className="font-serif text-base sm:text-lg text-[var(--ink-secondary)] leading-relaxed line-clamp-4 sm:line-clamp-5 max-w-2xl">
                    {activeWork.synopsis}
                  </p>
                )}

                {/* Curated Reading Metadata */}
                <div className="pt-3 flex flex-wrap items-center gap-6 text-xs font-mono text-[var(--ink-muted)] border-t border-[var(--border-subtle)]">
                  {activeWork.readingTimeMinutes > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{activeWork.readingTimeMinutes} min read</span>
                    </div>
                  )}
                  {activeWork.wordCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{activeWork.wordCount.toLocaleString()} words</span>
                    </div>
                  )}
                  {Number(activeWork.viewCount) > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatViewCount(activeWork.viewCount)} readers</span>
                    </div>
                  )}
                </div>

                {/* Action CTA & Navigation Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      to="/works/$workId"
                      params={{ workId: activeWork.slug || activeWork.id }}
                      preload="intent"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-sm font-medium hover:opacity-90 transition-opacity no-underline shadow-xs"
                    >
                      <span>Begin Reading</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Bespoke Pagination Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={goToPrev}
                      aria-label="Previous Folio"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-xs text-[var(--ink-muted)] px-2">
                      {String(activeIndex + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={goToNext}
                      aria-label="Next Folio"
                      className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Interactive Literary Filmstrip Tabs */}
          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {works.map((work, idx) => {
                  const isActive = idx === activeIndex
                  const folioNumber = String(idx + 1).padStart(2, '0')
                  return (
                    <button
                      key={work.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-canvas)] shadow-2xs'
                          : 'border-transparent bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className={isActive ? 'text-[var(--ink-primary)] font-bold' : 'text-[var(--ink-muted)]'}>
                          Nº {folioNumber}
                        </span>
                        <span className="truncate ml-1 text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                          {work.genre || 'Story'}
                        </span>
                      </div>
                      <p
                        className={`text-xs font-serif truncate ${
                          isActive
                            ? 'text-[var(--ink-primary)] font-medium'
                            : 'text-[var(--ink-secondary)]'
                        }`}
                      >
                        {work.title}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Complete Folio Archive (All 5 Works for Crawlers & Extended Reading) */}
      {works.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-8">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                The Curated Folio Index
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] mt-1">
                Anthology Overview
              </h2>
            </div>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              {works.length} Curated Stories
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {works.map((work, idx) => {
              const folioNumber = String(idx + 1).padStart(2, '0')
              return (
                <div
                  key={work.id}
                  className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <span className="font-mono text-xs text-[var(--ink-muted)] pt-0.5 sm:pt-0 shrink-0">
                      Nº {folioNumber}
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)] group-hover:underline decoration-1">
                        <Link
                          to="/works/$workId"
                          params={{ workId: work.slug || work.id }}
                          preload="intent"
                          className="no-underline text-[var(--ink-primary)]"
                        >
                          {work.title}
                        </Link>
                      </h3>
                      <p className="text-xs text-[var(--ink-muted)] font-serif mt-0.5">
                        by {work.author.name} • {work.genre || 'Fiction'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 sm:self-center">
                    {Number(work.viewCount) > 0 && (
                      <span className="text-xs font-mono text-[var(--ink-muted)] hidden md:inline">
                        {formatViewCount(work.viewCount)} readers
                      </span>
                    )}
                    <Link
                      to="/works/$workId"
                      params={{ workId: work.slug || work.id }}
                      preload="intent"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-mono text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
                    >
                      <span>Read Folio</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 5. Editorial FAQ Section */}
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

      {/* 6. Submissions & Creator Consideration */}
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
