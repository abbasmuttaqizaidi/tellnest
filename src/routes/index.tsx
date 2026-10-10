import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES, GENRES, AUTHORS, getWorkSlug } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import { OptimizedImage } from '../components/OptimizedImage'
import {
  AnimatedSearch,
  Button,
  Badge,
  AnimatedTabs,
  DiscreteTabs,
  MetricProgressCard,
  FilterDisclosure,
  BottomSheet,
  SpotlightCard,
} from '../design-system'
import { UnisexAvatar } from '../components/UnisexAvatar'
import { TellnestLoader } from '../components/TellnestLoader'
import { useUser } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Play,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  PenLine,
  Feather,
  Flame,
  Users,
  Compass as CompassIcon,
  ChevronRight,
  ChevronLeft,
  Library as LibraryIcon,
  Search,
  Layers,
  BookText,
  Filter,
  SlidersHorizontal,
  X,
  Eye,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { formatViewCount } from '../lib/utils'
import { getAuthUserServerFn } from '../server/auth'

export const Route = createFileRoute('/')({
  loader: async () => {
    return await getAuthUserServerFn()
  },
  head: () =>
    generateMeta({
      title: 'Writings. Beyond the Hype.',
      description:
        'Discover curated serialized fiction, long-form literature, indie novelists, and immersive storytelling on Hatchpen.',
      canonicalUrl: 'https://hatchpen.com/',
      keywords: [
        'serialized fiction',
        'read novels online',
        'indie literature',
        'web novels',
        'stories by chapter',
        'free reading',
        'fiction community',
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Hatchpen — Writings. Beyond the Hype.',
        url: 'https://hatchpen.com/',
        description:
          'Discover curated serialized fiction, long-form literature, indie novelists, and immersive storytelling on Hatchpen.',
      },
    }),
  component: HomePage,
})

function HomePage() {
  const loaderData = Route.useLoaderData()
  const { isSignedIn, isLoaded } = useUser()
  const [explicitlyLoggedOut, setExplicitlyLoggedOut] = useState(false)
  const hadSignedInRef = useRef(false)

  useEffect(() => {
    if (isSignedIn) {
      hadSignedInRef.current = true
    } else if (hadSignedInRef.current && isLoaded && !isSignedIn) {
      // User was signed in during this client session, but just signed out
      setExplicitlyLoggedOut(true)
    }
  }, [isSignedIn, isLoaded])

  // 1. If user explicitly signed out in this session, render PublicHome
  if (explicitlyLoggedOut) {
    return <PublicHome />
  }

  // 2. If server determined authenticated session, render LoggedInHome immediately.
  // Never downgrade to PublicHome during the initial client-side Clerk handshake!
  if (loaderData?.isAuthenticated) {
    return <LoggedInHome />
  }

  // 3. If server was unauthenticated, but user signed in dynamically on client (e.g. via modal)
  if (isLoaded && isSignedIn) {
    return <LoggedInHome />
  }

  // 4. Default for unauthenticated visitors
  return <PublicHome />
}

/* ==========================================================================
   PUBLIC HOME PAGE — Curated Atmospheric Literary Salon & Bookstore
   ========================================================================== */
function PublicHome() {
  const { allWorks, recentWorks, openAuthModal, isWorkSaved, toggleSaveWork, genres } = useApp()
  const { isSignedIn } = useUser()
  const navigate = useNavigate()
  const [homeQuery, setHomeQuery] = useState('')

  // Multi-story Hero Carousel state (5 manuscripts)
  const heroWorks = useMemo(() => {
    return allWorks.slice(0, 5)
  }, [allWorks])

  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const activeHeroWork = heroWorks[activeHeroIndex] || allWorks[0]

  const [heroViewMode, setHeroViewMode] = useState<'overview' | 'taste'>('overview')
  const [mobileSheetTasteOpen, setMobileSheetTasteOpen] = useState(false)
  const [mobileSheetHeight, setMobileSheetHeight] = useState<'default' | 'expanded'>('default')

  const handleOpenSample = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSheetHeight('default')
      setMobileSheetTasteOpen(true)
    } else {
      setHeroViewMode('taste')
    }
  }

  const activeHeroChapter = activeHeroWork?.chapters?.[0]
  const activeTasteParagraphs = useMemo(() => {
    if (!activeHeroChapter?.content) return []
    return activeHeroChapter.content
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 3)
  }, [activeHeroChapter])

  // Catalog stacks display sorted by real-time recent activity
  const catalogDisplayWorks = useMemo(() => {
    return recentWorks.slice(0, 6)
  }, [recentWorks])

  const trendingWorks = allWorks.filter((w) => w.trending || w.featured).slice(0, 4)
  const completedWorks = allWorks.filter((w) => w.status === 'Completed').slice(0, 3)

  return (
    <div className="public-home-container min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 sm:space-y-14">
      


      {/* =========================================================================
          HERO SECTION — EXACT DESIGN SPECIFICATION (Live_instructions.md)
          ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#fbfaf7] dark:bg-[var(--bg-surface)] text-[var(--color-on-surface)] rounded-2xl border border-[var(--border-subtle)]/40 shadow-[0_12px_44px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_56px_rgba(0,0,0,0.08)] transition-all">
        {/* Ambient subtle background depth elements */}
        <div className="pointer-events-none absolute -top-40 right-[-10%] w-[55vw] h-[55vw] rounded-full bg-[var(--color-surface-container-low)]/60 blur-3xl opacity-70"></div>
        <div className="pointer-events-none absolute bottom-0 left-[-5%] w-[40vw] h-[40vw] rounded-full bg-[var(--color-surface-container)]/50 blur-3xl opacity-60"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10 lg:py-12 flex flex-col justify-center">
          {/* Two-Column Editorial Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 xl:gap-16 items-center">
            
            {/* Left Column: Typographic Sanctuary */}
            <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-4">
              {/* Primary Display Headline */}
              <h1 className="text-[42px] sm:text-[50px] lg:text-[58px] xl:text-[64px] leading-[1.06] tracking-tight font-normal text-[var(--color-on-surface)] font-serif mb-5 sm:mb-6">
                Writings. <br className="hidden sm:inline" />
                <span className="italic font-light text-[var(--color-on-surface)]/90">Beyond the hype</span>
              </h1>

              {/* Subtitle Paragraph (SEO Optimized & Italicized) */}
              <p className="text-[16px] sm:text-[17px] leading-[1.7] text-[var(--color-on-surface-variant)] max-w-2xl mb-6 sm:mb-8 italic font-normal">
                Discover independent serialized novels, long-form fiction, and reflective essays. A digital literary publication where readers follow chapter-by-chapter releases and authors publish original manuscripts with dedicated readership.
              </p>

              {/* Call to Action Cluster */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8 sm:mb-10">
                <Link
                  to="/read//"
                  params={{
                    workId: activeHeroWork?.id || 'work-2',
                    chapterId: activeHeroWork?.chapters?.[0]?.id || 'ch-201',
                  }}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-[14px] hover:opacity-90 shadow-md hover:shadow-lg transition-all duration-200 group no-underline"
                  data-path="discover"
                >
                  <span>Begin Reading Unhurried</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </Link>

                <a
                  href="#catalog-stacks"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[var(--color-surface-container-lowest)]/90 hover:bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] font-medium text-[14px] shadow-sm hover:shadow transition-all duration-200 border border-[var(--color-surface-container-high)]/60 no-underline cursor-pointer"
                  data-path="serialization"
                >
                  <span className="material-symbols-outlined text-[18px] text-[var(--color-secondary)]">auto_stories</span>
                  <span>Explore The Library</span>
                </a>
              </div>

              {/* Trust Points / Manifesto Signals */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-[var(--color-secondary)] text-[13px] tracking-wide mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-outline-variant)]"></span>
                <span>Zero algorithmic rush</span>
                <span className="text-[var(--color-outline-variant)]">•</span>
                <span>90% direct author patronage</span>
                <span className="text-[var(--color-outline-variant)]">•</span>
                <span>Pure longform</span>
              </div>

              {/* Polished Installment Spotlight Card using Design System */}
              <Link
                to="/works/$workId"
                params={{ workId: activeHeroWork?.id || 'work-2' }}
                className="w-full max-w-xl no-underline text-inherit block"
              >
                <SpotlightCard
                  eyebrow="Featured this week"
                  title={activeHeroWork?.title || 'The Glass Archipelago'}
                  subtitle={`— ${activeHeroWork?.author?.name || 'Alistair Vance'}`}
                  badgeLabel={`Installment ${activeHeroWork?.chaptersCount || 28}`}
                  icon="local_library"
                  className="!border-[var(--border-subtle)]/40 hover:!border-[var(--border-strong)]/60 !shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:!shadow-[0_12px_36px_rgba(0,0,0,0.09)]"
                />
              </Link>
            </div>

            {/* Right Column: Visual Anchor & Folio Showcase */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full max-w-lg lg:max-w-none flex flex-col py-1 gap-2.5">
                {/* Subtle ambient glow background element */}
                <div className="pointer-events-none absolute -top-12 -right-8 w-64 h-64 rounded-full bg-[var(--color-surface-container-high)]/30 blur-3xl -z-10"></div>
                
                {/* Curated Compact Header Ribbon */}
                <div className="flex items-center justify-between pb-0 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)]"></span>
                    <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-secondary)] font-mono">
                      Marginalia & Dispatches
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--color-secondary)] bg-[var(--color-surface-container)] px-2 py-0.5 rounded-full border border-[var(--color-surface-container-high)]/60">
                    <span className="material-symbols-outlined text-[12px] text-[var(--ink-primary)]">verified</span>
                    <span>Human-curated</span>
                  </div>
                </div>

                {/* Card 1: Reader Discovery Dispatch (Compact) */}
                <div className="relative bg-[var(--color-surface-container-lowest)] rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 border border-[var(--border-subtle)]/40 hover:border-[var(--border-strong)]/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.09)] transition-all duration-200 group">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-on-surface)] font-semibold text-[10px] border border-[var(--color-surface-container-high)]/60 shrink-0">
                        ER
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[12.5px] font-medium text-[var(--color-on-surface)] leading-tight truncate">
                          Elena Rostova
                        </h4>
                        <p className="text-[10.5px] text-[var(--color-secondary)] truncate">
                          Literary Essayist & Reader
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-medium tracking-wider uppercase text-[var(--color-secondary)] px-2 py-0.5 rounded bg-[var(--color-surface-container-low)] border border-[var(--color-surface-container-high)]/40 whitespace-nowrap">
                      Dispatch 14
                    </span>
                  </div>
                  
                  <p className="text-[12.5px] leading-snug text-[var(--color-on-surface)] font-normal mb-2 text-[var(--color-on-surface)]/90">
                    “I stopped chasing algorithmic bestsellers. On HatchPen,{' '}
                    <mark className="bg-amber-200/80 dark:bg-amber-500/30 px-1 py-0.5 rounded text-inherit">
                      I found stories no one’s talking about
                    </mark>
                    —but they’re as good as the classics. Great writing, zero noise.”
                  </p>
                  
                  <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]/40 text-[10.5px]">
                    <div className="flex items-center gap-1.5 text-[var(--color-secondary)] truncate">
                      <span className="material-symbols-outlined text-[13px] text-[var(--ink-primary)] shrink-0">auto_stories</span>
                      <span className="text-[var(--color-on-surface-variant)] truncate">
                        Reading: <em className="font-medium text-[var(--color-on-surface)] not-italic">The Unmaking of Winter</em>
                      </span>
                    </div>
                    <span className="text-[var(--color-outline-variant)] whitespace-nowrap shrink-0 text-[10px]">
                      2d ago
                    </span>
                  </div>
                </div>

                {/* Card 2: Debut Writer Journey Dispatch (Compact) */}
                <div className="relative sm:ml-4 bg-[#fcfbf9] dark:bg-[var(--color-surface-container-lowest)] rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 border border-[var(--border-subtle)]/40 hover:border-[var(--border-strong)]/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.09)] transition-all duration-200">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] flex items-center justify-center font-semibold text-[10px] shrink-0">
                        MC
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[12.5px] font-medium text-[var(--color-on-surface)] leading-tight truncate">
                            Marcus Chen
                          </h4>
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[var(--color-surface-container)] text-[var(--color-secondary)] uppercase tracking-wider">
                            Author
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--color-secondary)] truncate">
                          Serial: <em className="text-[var(--color-on-surface)] not-italic">The Salt Garden</em>
                        </p>
                      </div>
                    </div>
                    <span className="text-[9.5px] font-medium tracking-wider uppercase text-[var(--color-secondary)] px-2 py-0.5 rounded bg-[var(--color-surface-container-low)] border border-[var(--color-surface-container-high)]/40 whitespace-nowrap">
                      Author Dispatch
                    </span>
                  </div>

                  <p className="text-[12.5px] leading-snug text-[var(--color-on-surface)] font-normal mb-2 text-[var(--color-on-surface)]/90">
                    “
                    <mark className="bg-amber-200/80 dark:bg-amber-500/30 px-1 py-0.5 rounded text-inherit">
                      I’m a new writer
                    </mark>
                    . On HatchPen, my work didn’t disappear into the feed—it was pushed to readers who actually stayed. For the first time,{' '}
                    <mark className="bg-amber-200/80 dark:bg-amber-500/30 px-1 py-0.5 rounded text-inherit">
                      my writing found an audience
                    </mark>
                    .”
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)]/40 text-[10.5px]">
                    <div className="flex items-center gap-1.5 text-[var(--color-secondary)] truncate">
                      <span className="material-symbols-outlined text-[13px] text-[var(--ink-primary)] shrink-0">favorite</span>
                      <span className="text-[var(--color-on-surface-variant)] font-medium truncate">
                        1,400 readers • 0 algorithmic push
                      </span>
                    </div>
                    <span className="text-[var(--color-outline-variant)] whitespace-nowrap shrink-0 text-[10px]">
                      Verified
                    </span>
                  </div>
                </div>

                {/* Tactile Footnote / Seal Pill (Compact) */}
                <div className="relative bg-[var(--color-surface-container-lowest)]/80 backdrop-blur-sm rounded-xl py-1.5 px-3 border border-[var(--border-subtle)]/40 hover:border-[var(--border-strong)]/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.09)] flex items-center justify-between gap-2.5 transition-all">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[13px] text-[var(--ink-primary)] shrink-0">local_library</span>
                    <span className="text-[10.5px] text-[var(--color-secondary)] truncate">
                      Where quiet stories find their true, deliberate readers.
                    </span>
                  </div>
                  <span className="text-[9.5px] font-medium text-[var(--color-secondary)] whitespace-nowrap shrink-0 font-mono">
                    • Member Archive
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>

        {/* Quiet Bottom Architectural Accent Rule */}
        <div className="w-full h-[1px] bg-[var(--color-surface-container-high)]/60"></div>
      </section>

      {/* =========================================================================
          MOBILE-ONLY SAMPLE TASTE BOTTOM SHEET (Using Design System BottomSheet)
          ========================================================================= */}
      <div className="lg:hidden">
        <BottomSheet
          isOpen={mobileSheetTasteOpen}
          onClose={() => setMobileSheetTasteOpen(false)}
          defaultHeightPercent={80}
          expandedHeightPercent={96}
          icon={<Feather className="h-3.5 w-3.5 text-[var(--ink-primary)]" />}
          title={activeHeroWork.title}
          subtitle={`Sample • ${activeHeroChapter?.title || 'Chapter 1'} (${activeHeroChapter?.readTimeMinutes || 12}m read)`}
          footer={
            <div className="flex items-center gap-2.5">
              <Link
                to="/read/$workId/$chapterId"
                params={{
                  workId: activeHeroWork.id,
                  chapterId: activeHeroWork.chapters[0]?.id || 'ch-1',
                }}
                onClick={() => setMobileSheetTasteOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-3 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 active:scale-[0.99] transition no-underline shadow-xs"
              >
                <BookOpen className="h-4 w-4" />
                <span>Continue Full Chapter 1</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (!isSignedIn) {
                    setMobileSheetTasteOpen(false)
                    openAuthModal()
                  } else if (activeHeroWork?.id) {
                    toggleSaveWork(activeHeroWork.id)
                  }
                }}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border text-xs transition cursor-pointer ${
                  activeHeroWork && isWorkSaved(activeHeroWork.id)
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
                    : 'border-[var(--border-strong)] text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Bookmark
                  className={`h-4 w-4 ${
                    activeHeroWork && isWorkSaved(activeHeroWork.id) ? 'fill-current' : ''
                  }`}
                />
                <span>{activeHeroWork && isWorkSaved(activeHeroWork.id) ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          }
        >
          {/* Metadata banner */}
          <div className="pb-2 border-b border-dashed border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5 text-[var(--ink-primary)] font-medium">
              <span>By {activeHeroWork.author.name}</span>
            </span>
            <span>{activeHeroWork.publishedChaptersCount} Chapters Available</span>
          </div>

          {/* Typeset Prose with Literary Drop Cap */}
          {activeTasteParagraphs.map((paragraph, index) => {
            if (index === 0) {
              const firstChar = paragraph.charAt(0)
              const restOfParagraph = paragraph.slice(1)
              return (
                <p key={index} className="text-base leading-relaxed text-[var(--ink-primary)]">
                  <span className="float-left text-4xl font-serif font-bold text-[var(--ink-primary)] leading-none mr-2.5 mt-1 border-b-2 border-[var(--ink-primary)] pb-0.5">
                    {firstChar}
                  </span>
                  {restOfParagraph}
                </p>
              )
            }
            return (
              <p key={index} className="text-base leading-relaxed text-[var(--ink-secondary)]">
                {paragraph}
              </p>
            )
          })}

          <div className="pt-6 pb-2 text-center border-t border-[var(--border-subtle)]">
            <p className="font-mono text-xs text-[var(--ink-muted)] italic">
              — End of sample folio preview —
            </p>
          </div>
        </BottomSheet>
      </div>


      {/* =========================================================================
          4. REIMAGINED: THE BOOKSTORE LIBRARY CATALOG & ARCHIVE SHELVES
          ========================================================================= */}
      <section className="space-y-6 pt-2">
        {/* Catalog Header with Search and Stats */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
                <BookText className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] font-medium">
                The Hatchpen Stacks • {allWorks.length} Cataloged Manuscripts
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
              Browse The Catalog
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1 font-serif">
              Explore serialized novels, meditative essays, and speculative archives arranged by shelf.
            </p>
          </div>

          {/* Interactive Search Bar & All Works Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-80">
              <AnimatedSearch
                variant="typewriter"
                size="sm"
                value={homeQuery}
                onChange={setHomeQuery}
                onSubmit={(val) => {
                  if (val.trim()) {
                    navigate({ to: '/search' })
                  }
                }}
                shortcut="/"
                placeholders={[
                  "Search 'The Silent Meridian'...",
                  "Search 'An Inventory of Baltic Fog'...",
                  "Search 'Elena Rostova'...",
                  "Search 'Station Nine cold war'...",
                  "Search 'A Winter in Kyoto'...",
                ]}
              />
            </div>

            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-mono font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline whitespace-nowrap"
            >
              <span>Full Archive</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Clean Bookstore Stacks Display */}

        {/* Live Filtered Shelf Grid (Clean bookstore spine cards with cover, author & chapter counts) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-1">
          {catalogDisplayWorks.map((work) => (
            <Link
              key={work.id}
              to="/works/$workId"
              params={{ workId: work.id }}
              className="group flex flex-col rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all no-underline text-inherit"
            >
              {/* Book Jacket Aspect with subtle spine */}
              <div className="aspect-[2/3] w-full rounded overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-subtle)] relative mb-2.5">
                <OptimizedImage
                  src={work.cover}
                  alt={work.title}
                  width={240}
                  height={360}
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
                  containerClassName="h-full w-full"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-104 grayscale-25 group-hover:grayscale-0"
                />
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white backdrop-blur-2xs">
                  {work.chaptersCount} ch
                </div>
              </div>

              {/* Typography Details */}
              <div className="flex flex-col flex-1 justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase block truncate">
                    {work.category} • {work.genre}
                  </span>
                  <h4 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] leading-snug line-clamp-2 mt-0.5 group-hover:underline">
                    {work.title}
                  </h4>
                </div>

                <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--ink-muted)] gap-1">
                  <span className="truncate">By {work.author.name}</span>
                  <div
                    className="flex items-center gap-1 font-mono text-[10px] text-[var(--ink-muted)] shrink-0 bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded"
                    title={`${formatViewCount(work.totalReads, false)} Reads`}
                  >
                    <Eye className="h-3 w-3 text-[var(--ink-faint)]" />
                    <span>{formatViewCount(work.totalReads, true)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. TRENDING ACROSS READERS
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-[var(--ink-primary)]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
                Trending on the Salon Floor
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Manuscripts commanding sustained reader engagement and discourse
              </p>
            </div>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
          >
            Explore Trending <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. SPLIT CURATION: COMPLETED MASTERPIECES & GENRE ALCOVES
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: Completed Works (Ready to Binge End-to-End) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--ink-primary)]" />
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                  Completed Serials
                </h3>
              </div>
              <span className="font-mono text-xs text-[var(--ink-muted)]">Read End-to-End</span>
            </div>

            <div className="space-y-3">
              {completedWorks.map((work) => (
                <Link
                  key={work.id}
                  to="/works/$workId"
                  params={{ workId: work.id }}
                  className="group flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all no-underline text-inherit"
                >
                  <img
                    src={work.cover}
                    alt={work.title}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-12 rounded object-cover grayscale flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-faint)]">
                      <span>{work.category}</span>
                      <span>•</span>
                      <span>{work.chaptersCount} Chapters</span>
                    </div>
                    <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate group-hover:underline">
                      {work.title}
                    </h4>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {work.author.name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--ink-faint)] group-hover:text-[var(--ink-primary)] transition-colors mr-2" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Literary Genres Alcoves */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                Literary Genres
              </h3>
              <span className="font-mono text-xs text-[var(--ink-faint)]">{genres.length} Shelves</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {genres.map((genre) => (
                <Link
                  key={genre.slug}
                  to="/genre/$slug"
                  params={{ slug: genre.slug }}
                  className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] hover:bg-[var(--bg-subtle)] transition-all no-underline text-inherit"
                >
                  <p className="font-serif text-xs font-semibold text-[var(--ink-primary)]">
                    {genre.name}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                    {genre.worksCount || 0} cataloged
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. WRITERS IN RESIDENCE WITH FEATURED QUOTES
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Writers in Residence
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Authors publishing ongoing serials, essays, and meditations on Hatchpen
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
          >
            Explore All Authors <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          8. PUBLIC INVITATION / MEMBERSHIP CALL TO ACTION
          ========================================================================= */}
      <section className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 sm:p-14 text-center space-y-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] shadow-2xs">
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
            A quiet typographic sanctuary for modern letters.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--ink-muted)]">
            Discover original serialized fiction, essays, and meditations. Create an account to customize your typography, bookmark manuscripts, and follow authors.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {!isSignedIn ? (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span>Join The Hatchpen Reading Room</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <Link
              to="/library"
              className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs no-underline"
            >
              <span>Open Your Library</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}

          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-2.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
          >
            <span>Explore Library Catalog</span>
          </Link>
        </div>
      </section>

    </div>
  )
}

/* ==========================================================================
   SIGNED-IN HOME PAGE — Editorial Reading Desk & Member Dashboard
   ========================================================================== */
function SignedInHome() {
  const { user } = useUser()
  const {
    allWorks,
    savedWorkIds,
    readingProgress,
    followedAuthorIds,
    customAvatarUrl,
  } = useApp()
  const [activeTab, setActiveTab] = useState('for-you')

  // Identify active reading progress item
  const progressEntries = Object.entries(readingProgress)
  const latestReadEntry = progressEntries.length > 0 ? progressEntries[0] : null
  const latestReadWork = latestReadEntry
    ? allWorks.find((w) => w.id === latestReadEntry[0])
    : null
  const latestProgressData = latestReadEntry ? latestReadEntry[1] : null

  // Recommended fallback manuscript when queue is empty
  const recommendedWork = allWorks.find((w) => w.featured || w.editorPick) || allWorks[0]

  // Tabbed collections
  const forYouWorks = useMemo(() => {
    return allWorks.filter((w) => w.trending || w.rising).slice(0, 6)
  }, [allWorks])

  const followedWorks = useMemo(() => {
    return allWorks.filter((w) => followedAuthorIds.includes(w.author.id))
  }, [allWorks, followedAuthorIds])

  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  const trendingWorks = useMemo(() => {
    return allWorks.filter((w) => w.trending).slice(0, 6)
  }, [allWorks])

  const cachedName = typeof window !== 'undefined' ? localStorage.getItem('hatchpen_user_name') : null
  const displayName =
    user?.firstName || user?.username || cachedName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Reader'

  // Time-of-day dynamic greeting
  const hour = typeof window !== 'undefined' ? new Date().getHours() : 12
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayDate = typeof window !== 'undefined'
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'Desk Edition'

  const dashboardTabs = [
    { id: 'for-you', label: 'For You', icon: <Sparkles className="h-3.5 w-3.5" /> },
    {
      id: 'following',
      label: `From Followed${followedWorks.length > 0 ? ` (${followedWorks.length})` : ''}`,
      icon: <Users className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
    {
      id: 'saved',
      label: `Your Library${savedWorks.length > 0 ? ` (${savedWorks.length})` : ''}`,
      icon: <Bookmark className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: <Flame className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
  ]

  const activeAvatar = customAvatarUrl || user?.imageUrl

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      
      {/* 1. EDITORIAL SALUTATION HEADER */}
      <section className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full border border-[var(--border-subtle)] shadow-xs overflow-hidden bg-[var(--ink-primary)] flex items-center justify-center">
              <UnisexAvatar
                src={activeAvatar}
                hasImage={user?.hasImage}
                name={displayName}
                size="lg"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
                <span>{todayDate}</span>
                <span>•</span>
                <span className="text-[var(--ink-primary)] font-medium">Editorial Desk</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
                {greeting}, {displayName}.
              </h1>
              <p className="text-xs text-[var(--ink-secondary)]">
                Pick up where you left off or explore newly serialized folios.
              </p>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PenLine className="h-3.5 w-3.5 shrink-0" />}
              >
                + New Story
              </Button>
            </Link>

            <Link to="/library" className="no-underline">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Bookmark className="h-3.5 w-3.5 shrink-0" />}
              >
                My Library ({savedWorkIds.length})
              </Button>
            </Link>

            <Link to="/discover" className="no-underline">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<CompassIcon className="h-3.5 w-3.5 shrink-0" />}
              >
                Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. DUAL PRIORITY GRID: CONTINUE READING SHELF & READING PULSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left: Active Reading Card / Next Pick (7 cols) */}
        <div className="lg:col-span-7">
          {latestReadWork && latestProgressData ? (
            <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                  <h2 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                    Continue Reading
                  </h2>
                </div>
                <Link
                  to="/library"
                  className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
                >
                  View Queue ({progressEntries.length}) <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
                <div className="relative aspect-[16/10] sm:aspect-[3/4] w-full sm:w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <img
                    src={latestReadWork.cover}
                    alt={latestReadWork.title}
                    className="h-full w-full object-cover transition hover:scale-105 duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex-1 space-y-2.5 min-w-0 w-full">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{latestReadWork.category}</span>
                      <span>•</span>
                      <span>{latestReadWork.genre}</span>
                      <span>•</span>
                      <span>Part {latestProgressData.chapterNumber}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] truncate mt-0.5">
                      {latestReadWork.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {latestReadWork.author.name}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                      <span>Chapter Completion</span>
                      <span className="font-semibold text-[var(--ink-primary)]">
                        {latestProgressData.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--ink-primary)] transition-all duration-300"
                        style={{ width: `${latestProgressData.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      to="/read/$workId/$chapterId"
                      params={{
                        workId: latestReadWork.id,
                        chapterId: latestProgressData.chapterId,
                      }}
                      className="no-underline inline-block"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<BookOpen className="h-3.5 w-3.5 shrink-0" />}
                      >
                        Resume Chapter {latestProgressData.chapterNumber}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                  <h2 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                    Editor's Desk Selection
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  Start Your Queue
                </span>
              </div>

              {recommendedWork && (
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
                  <div className="relative aspect-[16/10] sm:aspect-[3/4] w-full sm:w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <img
                      src={recommendedWork.cover}
                      alt={recommendedWork.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{recommendedWork.category}</span>
                      <span>•</span>
                      <span>{recommendedWork.genre}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] truncate">
                      {recommendedWork.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                      {recommendedWork.synopsis}
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/works/$workId"
                        params={{ workId: recommendedWork.id }}
                        className="no-underline inline-block"
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<BookOpen className="h-3.5 w-3.5 shrink-0" />}
                        >
                          Begin Chapter 1
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Daily Reading Pulse & Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Daily Reading Pulse
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                Active Streak
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {progressEntries.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">In Progress</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {savedWorkIds.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">Saved</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {followedAuthorIds.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">Following</p>
              </div>
            </div>

            <MetricProgressCard
              usedPercent={savedWorkIds.length > 0 ? Math.min(100, savedWorkIds.length * 20) : 40}
              currentLabel={`${savedWorkIds.length} Manuscripts`}
              limitLabel="10 Goal"
              title="Reading Cadence"
              subtitle="Paced weekly serialization goal"
              className="w-full border-0 p-0 shadow-none bg-transparent"
            />
          </div>
        </div>

      </div>

      {/* 3. MEMBER FEED STREAMS (DiscreteTabs Navigation) */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-primary)]">
              Your Reading Stream
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Personalized recommendations, updates from followed authors, and saved library queue.
            </p>
          </div>

          <DiscreteTabs
            defaultTab={activeTab}
            size="sm"
            onTabChange={(tabId) => setActiveTab(tabId)}
            tabs={dashboardTabs}
          />
        </div>

        {/* Tab 1: Curated For You */}
        {activeTab === 'for-you' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {forYouWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}

        {/* Tab 2: From Followed Authors */}
        {activeTab === 'following' && (
          <div>
            {followedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {followedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-10 text-center space-y-3 bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
                <Users className="h-6 w-6 mx-auto text-[var(--ink-faint)]" />
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  No Followed Authors Yet
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Follow authors to receive notifications when they publish new serialized chapters.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-1">
                  <Button variant="outline" size="sm">
                    Discover Authors
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Library */}
        {activeTab === 'saved' && (
          <div>
            {savedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-10 text-center space-y-3 bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
                <Bookmark className="h-6 w-6 mx-auto text-[var(--ink-faint)]" />
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Your Library is Empty
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Bookmark stories while browsing to build your offline queue and saved folios.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-1">
                  <Button variant="outline" size="sm">
                    Browse Manuscripts
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Trending */}
        {activeTab === 'trending' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trendingWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}
      </section>

      {/* 4. AUTHORS IN RESIDENCE (RECOMMENDATIONS) */}
      <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-[var(--ink-primary)]">
              Writers & Voices to Follow
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Acclaimed serialized novelists, essayists, and poets on Hatchpen
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
          >
            All Writers <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* 5. WRITER STUDIO QUICK LAUNCH */}
      <section className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
                <Feather className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                Writer Studio
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
              Have a serial manuscript or story to release? Draft chapters in a clean, distraction-free environment and distribute to readers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/write" className="no-underline">
              <Button variant="outline" size="sm">
                Open Studio
              </Button>
            </Link>
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PenLine className="h-3.5 w-3.5 shrink-0" />}
              >
                + New Manuscript
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}

/* ==========================================================================
   LOGGED IN HOME SKELETON — Localized Authenticated Layout Skeleton
   ========================================================================== */
function LoggedInHomeSkeleton() {
  return (
    <div className="logged-in-home-container min-h-screen py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-pulse">
      {/* 1. WELCOME BANNER SKELETON */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="h-7 sm:h-9 w-64 bg-[var(--bg-subtle)] rounded-md" />
          <div className="h-3.5 w-40 bg-[var(--bg-subtle)]/70 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-[var(--bg-subtle)] rounded-md" />
      </header>

      {/* 2. READING DESK SKELETON */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row gap-3.5 lg:gap-5 items-stretch">
          <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 space-y-3 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-2.5 md:pb-0 md:pr-3.5 lg:pr-4">
            <div className="h-3 w-28 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3">
              <div className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-[var(--bg-subtle)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--bg-subtle)] rounded" />
                <div className="h-2 w-full bg-[var(--bg-subtle)] rounded" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FRESH DROPS SKELETON */}
      <section className="space-y-3 pt-1">
        <div className="h-6 w-48 bg-[var(--bg-subtle)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-[var(--bg-subtle)] rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   LOGGED IN HOME PAGE — Personalized Reader Dashboard & Shelf Experience
   ========================================================================== */
function LoggedInHome() {
  const { user, isLoaded: isUserLoaded } = useUser()
  const {
    allWorks,
    recentWorks,
    readingProgress,
    savedWorkIds,
    toggleSaveWork,
    isWorkSaved,
    genres,
    writerWorks,
  } = useApp()

  // Books currently in-progress
  const inProgressList = useMemo(() => {
    return Object.values(readingProgress)
      .map((prog) => {
        const work = allWorks.find((w) => w.id === prog.workId)
        if (!work) return null
        const currentChapter = work.chapters?.find((c) => c.id === prog.chapterId) || work.chapters?.[0]
        return { work, progress: prog, currentChapter }
      })
      .filter(Boolean) as {
        work: (typeof allWorks)[0]
        progress: (typeof readingProgress)[string]
        currentChapter: (typeof allWorks)[0]['chapters'][0] | undefined
      }
  }, [allWorks, readingProgress])

  // Focal book (most recently read)
  const primaryInProgress = inProgressList[0]

  // Other in-progress books (if any)
  const additionalInProgress = inProgressList.slice(1)

  // Saved manuscripts from shelf
  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  // New releases this week for personalized discovery
  const newReleases = useMemo(() => {
    return recentWorks.slice(0, 4)
  }, [recentWorks])

  // Trending manuscripts
  const trendingWorks = useMemo(() => {
    return allWorks.filter((w) => w.trending || w.featured).slice(0, 4)
  }, [allWorks])

  // Show localized dashboard skeleton while Clerk loads user profile
  if (!isUserLoaded) {
    return <LoggedInHomeSkeleton />
  }

  const userName = user?.firstName || user?.fullName || 'Reader'

  return (
    <div className="logged-in-home-container min-h-screen py-4 sm:py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      
      {/* =========================================================================
          1. WELCOME BANNER & READING QUICK STATS
          ========================================================================= */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[var(--ink-primary)] tracking-tight font-normal">
            Welcome back, <span className="italic font-light">{userName}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/library" className="no-underline">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Bookmark className="h-3.5 w-3.5 shrink-0" />}
            >
              My Library ({savedWorks.length})
            </Button>
          </Link>
        </div>
      </header>

      {/* =========================================================================
          2. UNIFIED COMPACT READING DESK (STRICT SINGLE ROW: CURRENT READ + SAVED SLIDER)
          ========================================================================= */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row gap-3.5 lg:gap-5 items-stretch">
          
          {/* Left Side: Currently Reading (Clean minimalist dot + label, vertically centered) */}
          <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-2.5 md:pb-0 md:pr-3.5 lg:pr-4">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-primary)]" />
                <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                  Currently Reading
                </span>
              </div>
              {primaryInProgress && (
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {primaryInProgress.progress.progressPercent}%
                </span>
              )}
            </div>

            {primaryInProgress ? (
              <div className="flex items-center gap-3 my-auto">
                <Link
                  to="/read/$workId/$chapterId"
                  params={{
                    workId: getWorkSlug(primaryInProgress.work),
                    chapterId: primaryInProgress.progress.chapterId,
                  }}
                  className="group relative shrink-0 block no-underline focus:outline-none"
                  aria-label={`Resume reading ${primaryInProgress.work.title}`}
                >
                  <div className="relative w-13 sm:w-15 aspect-[3/4] rounded overflow-hidden shadow-xs border border-[var(--border-subtle)] group-hover:-translate-y-0.5 transition-transform duration-200">
                    <OptimizedImage
                      src={primaryInProgress.work.cover}
                      alt={primaryInProgress.work.title}
                      width={65}
                      height={88}
                      containerClassName="h-full w-full"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to="/works/$workId"
                    params={{ workId: getWorkSlug(primaryInProgress.work) }}
                    className="no-underline text-inherit hover:underline"
                  >
                    <h3 className="font-serif text-xs sm:text-sm font-medium text-[var(--ink-primary)] tracking-tight leading-snug truncate">
                      {primaryInProgress.work.title}
                    </h3>
                  </Link>

                  <p className="font-serif text-[10px] text-[var(--ink-muted)] italic truncate mb-0.5">
                    by {primaryInProgress.work.author?.name}
                  </p>

                  {primaryInProgress.currentChapter && (
                    <p className="text-[10px] text-[var(--ink-secondary)] truncate mb-1">
                      <span className="font-mono text-[9px] text-[var(--ink-muted)] mr-1">Ch:</span>
                      <span className="font-medium text-[var(--ink-primary)]">
                        {primaryInProgress.currentChapter.title}
                      </span>
                    </p>
                  )}

                  {/* Micro Progress Bar */}
                  <div className="w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)] mb-1.5">
                    <div
                      className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, primaryInProgress.progress.progressPercent || 0)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/read/$workId/$chapterId"
                      params={{
                        workId: getWorkSlug(primaryInProgress.work),
                        chapterId: primaryInProgress.progress.chapterId,
                      }}
                      className="no-underline"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="!py-0.5 !px-2.5 !text-[11px] !h-7"
                        leftIcon={<Play className="h-2.5 w-2.5 fill-current shrink-0" />}
                      >
                        Resume
                      </Button>
                    </Link>

                    <Link
                      to="/works/$workId"
                      params={{ workId: getWorkSlug(primaryInProgress.work) }}
                      className="no-underline"
                    >
                      <Button variant="outline" size="sm" className="!py-0.5 !px-2.5 !text-[11px] !h-7">
                        Contents
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2.5 text-center space-y-1 my-auto">
                <BookOpen className="h-4 w-4 text-[var(--ink-muted)]" />
                <p className="text-[11px] text-[var(--ink-muted)]">No active book in reading</p>
                <Link to="/discover" className="no-underline">
                  <Button variant="secondary" size="sm" className="!py-0.5 !px-2 !text-[11px] !h-6">Explore Books</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right Side: Saved Books Slider (Same Row on md+) */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                <h4 className="font-serif text-xs sm:text-sm font-medium text-[var(--ink-primary)]">
                  Saved Shelf
                </h4>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                  ({savedWorks.length})
                </span>
              </div>

              <Link
                to="/library"
                className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center gap-0.5 no-underline"
              >
                <span>Full Library</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>

            {savedWorks.length > 0 ? (
              <div className="flex items-stretch gap-2 overflow-x-auto pb-0.5 scrollbar-thin scrollbar-thumb-[var(--border-strong)] -mx-1 px-1">
                {savedWorks.map((work) => (
                  <div
                    key={work.id}
                    className="shrink-0 w-16 sm:w-18 group"
                  >
                    <Link
                      to="/works/$workId"
                      params={{ workId: getWorkSlug(work) }}
                      className="block no-underline text-inherit"
                    >
                      <div className="relative aspect-[3/4] rounded overflow-hidden border border-[var(--border-subtle)] group-hover:border-[var(--border-strong)] shadow-xs transition-transform duration-200 group-hover:-translate-y-0.5">
                        <OptimizedImage
                          src={work.cover}
                          alt={work.title}
                          width={72}
                          height={96}
                          containerClassName="h-full w-full"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-1">
                        <p className="font-serif text-[9.5px] font-medium text-[var(--ink-primary)] leading-tight truncate group-hover:underline">
                          {work.title}
                        </p>
                        <p className="text-[8.5px] text-[var(--ink-muted)] truncate">
                          {work.author?.name}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[75px] flex items-center justify-center py-2 px-3 rounded-lg border border-dashed border-[var(--border-subtle)] text-center bg-[var(--bg-subtle)]/20">
                <p className="text-[11px] text-[var(--ink-muted)]">
                  No saved books yet. Bookmark any story to see it here.
                </p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* =========================================================================
          5. FRESH RELEASES & EDITORIAL CATALOG
          ========================================================================= */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-serif text-lg sm:text-xl text-[var(--ink-primary)] font-medium">
              Fresh Chapter Drops This Week
            </h3>
            <p className="text-[11px] sm:text-xs text-[var(--ink-muted)]">
              Latest serialized installments updated across the platform
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center gap-1 no-underline"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {newReleases.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. WRITER STUDIO QUICK LAUNCH (FOR LOGGED IN CREATORS)
          ========================================================================= */}
      <section className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
                <Feather className="h-3 w-3" />
              </span>
              <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                Writer Studio
              </h2>
            </div>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Draft chapters in a clean, distraction-free environment and distribute installments directly to your dedicated subscribers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/write" className="no-underline">
              <Button variant="outline" size="sm" className="!py-1 !text-xs">
                Open Studio Dashboard
              </Button>
            </Link>
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                className="!py-1 !text-xs"
                leftIcon={<PenLine className="h-3 w-3 shrink-0" />}
              >
                + New Manuscript
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}

