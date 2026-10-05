import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES, GENRES, AUTHORS } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import { TellnestLoader } from '../components/TellnestLoader'
import { startAuthTransition } from '../components/ClerkAuthOverlay'
import {
  AnimatedSearch,
  Button,
  Badge,
  AnimatedTabs,
  MetricProgressCard,
} from '../design-system'
import { useUser, SignInButton } from '@clerk/react'
import {
  BookOpen,
  ArrowRight,
  Bookmark,
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
  Library as LibraryIcon,
} from 'lucide-react'

const CLERK_MODAL_APPEARANCE = {
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
  },
  elements: {
    modalBackdrop: '!flex !items-center !justify-center !p-4',
    modalContent: '!m-auto !my-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    rootBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    cardBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    card: '!max-w-[380px] !w-full !m-auto',
    footer: 'hidden',
    footerAction: 'hidden',
    badge: 'hidden',
  },
}

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isSignedIn, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <TellnestLoader
        variant="page"
        message="Curating your reading catalog..."
        submessage="Tellnest Literary Network"
      />
    )
  }

  if (isSignedIn) {
    return <SignedInHome />
  }

  return <PublicHome />
}

/* ==========================================================================
   PUBLIC HOME PAGE — Curated Literary Discovery (No Write Button)
   ========================================================================== */
function PublicHome() {
  const { allWorks } = useApp()
  const navigate = useNavigate()
  const [homeQuery, setHomeQuery] = useState('')

  const featuredWork = allWorks[0] // The Cold Perimeter
  const trendingWorks = allWorks.filter((w) => w.trending || w.featured).slice(0, 4)
  const risingWorks = allWorks.filter((w) => w.rising || w.category === 'Poetry').slice(0, 4)
  const completedWorks = allWorks.filter((w) => w.status === 'Completed').slice(0, 3)

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* HERO SECTION — Featured Manuscript Showcase Card */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 lg:p-12 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Narrative Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2.5">
              <Badge variant="default" size="sm">
                Featured Manuscript
              </Badge>
              <Badge variant="outline" size="sm">
                {featuredWork.category} • {featuredWork.genre}
              </Badge>
              <span className="text-xs text-[var(--ink-faint)] font-mono">
                {featuredWork.status}
              </span>
            </div>

            <div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--ink-primary)] leading-[1.15]">
                {featuredWork.title}
              </h1>
              {featuredWork.subtitle && (
                <p className="mt-2 font-serif text-lg text-[var(--ink-muted)] italic">
                  {featuredWork.subtitle}
                </p>
              )}
            </div>

            <p className="text-sm sm:text-base leading-relaxed text-[var(--ink-secondary)] max-w-2xl">
              {featuredWork.synopsis}
            </p>

            {/* Author Attribution */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/author/$authorId"
                params={{ authorId: featuredWork.author.id }}
                className="flex items-center gap-2.5 text-inherit no-underline group"
              >
                <img
                  src={featuredWork.author.avatar}
                  alt={featuredWork.author.name}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 rounded-full object-cover grayscale border border-[var(--border-strong)]"
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--ink-primary)] group-hover:underline">
                    {featuredWork.author.name}
                  </p>
                  <p className="text-[11px] font-mono text-[var(--ink-muted)]">
                    @{featuredWork.author.handle} • {featuredWork.author.location}
                  </p>
                </div>
              </Link>
            </div>

            {/* CTAs strictly without Write button */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <Link
                to="/read/$workId/$chapterId"
                params={{
                  workId: featuredWork.id,
                  chapterId: featuredWork.chapters[0].id,
                }}
                className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline shadow-xs"
              >
                <BookOpen className="h-4 w-4" />
                <span>Start Reading Chapter 1</span>
              </Link>

              <SignInButton mode="modal" appearance={CLERK_MODAL_APPEARANCE}>
                <button
                  type="button"
                  onClick={startAuthTransition}
                  className="inline-flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] transition-all cursor-pointer"
                >
                  <Bookmark className="h-4 w-4" />
                  <span>Sign In to Save</span>
                </button>
              </SignInButton>

              <Link
                to="/works/$workId"
                params={{ workId: featuredWork.id }}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
              >
                <span>Work Overview</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Large Cover Artwork Column */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative group w-full max-w-sm">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-[var(--border-strong)] shadow-md bg-[var(--bg-subtle)]">
                <img
                  src={featuredWork.cover}
                  alt={featuredWork.title}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-sm">
                <span className="font-mono text-[10px] text-[var(--ink-secondary)]">
                  {featuredWork.publishedChaptersCount} Chapters Published
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* QUICK BROWSE CATEGORIES STRIP */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Browse Catalog
              </h3>
              <span className="text-[var(--ink-faint)] font-mono text-xs">•</span>
              <Link
                to="/discover"
                className="text-xs font-mono text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
              >
                View All ({allWorks.length}) <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Curated serialized novels, investigative essays, and historical fiction.
            </p>
          </div>

          {/* Typewriter Search Bar */}
          <div className="w-full md:w-96">
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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.slug}
              to="/category/$slug"
              params={{ slug: cat.slug }}
              className="group flex flex-col justify-between rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 hover:border-[var(--ink-primary)] transition-all no-underline text-inherit shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--ink-faint)] group-hover:text-[var(--ink-primary)]">
                  {cat.accentLetter}
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                  {cat.worksCount}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] leading-tight">
                  {cat.name}
                </h4>
                <p className="mt-1 text-[11px] text-[var(--ink-muted)] line-clamp-1">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* TRENDING WORKS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-[var(--ink-primary)]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
                Trending Across Readers
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Works commanding sustained literary attention this week
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

      {/* NEW & RISING & RECENT CHAPTERS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: New & Rising Serials */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                  New & Rising Serials
                </h3>
              </div>
              <span className="font-mono text-xs text-[var(--ink-muted)]">Dispatched Weekly</span>
            </div>

            <div className="space-y-4">
              {risingWorks.map((work) => (
                <WorkCard key={work.id} work={work} layout="horizontal" />
              ))}
            </div>
          </div>

          {/* Right: Curated Genres & Completed Works */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Completed Masterpieces */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[var(--ink-primary)]" />
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                    Completed Works
                  </h3>
                </div>
                <span className="font-mono text-xs text-[var(--ink-faint)]">Read end-to-end</span>
              </div>

              <div className="space-y-3">
                {completedWorks.map((work) => (
                  <Link
                    key={work.id}
                    to="/works/$workId"
                    params={{ workId: work.id }}
                    className="group flex items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 hover:border-[var(--border-strong)] transition-all no-underline text-inherit shadow-2xs"
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
                  </Link>
                ))}
              </div>
            </div>

            {/* Browse By Literary Genre */}
            <div>
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] pb-3 border-b border-[var(--border-subtle)] mb-4">
                Literary Genres
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map((genre) => (
                  <Link
                    key={genre.slug}
                    to="/genre/$slug"
                    params={{ slug: genre.slug }}
                    className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-all no-underline text-inherit shadow-2xs"
                  >
                    <p className="font-serif text-xs font-semibold text-[var(--ink-primary)]">
                      {genre.name}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                      {genre.worksCount} works cataloged
                    </p>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* POPULAR AUTHORS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Writers in Residence
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Authors publishing serialized fiction, essays, and meditations on Relay
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

      {/* PUBLIC CALL TO ACTION: Join The Relay */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 text-center space-y-6 shadow-xs">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
          <BookOpen className="h-6 w-6" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
            A quiet typographic sanctuary for modern letters.
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-muted)] max-w-xl mx-auto">
            Discover original serialized fiction, essays, and meditations. Create an account to customize your reader typography, bookmark manuscripts, and support independent authors.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <SignInButton mode="modal" appearance={CLERK_MODAL_APPEARANCE}>
            <button
              type="button"
              onClick={startAuthTransition}
              className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span>Join The Relay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </SignInButton>

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
   SIGNED-IN HOME PAGE — Personalized Reader Dashboard & Studio Hub
   ========================================================================== */
function SignedInHome() {
  const { user } = useUser()
  const {
    allWorks,
    savedWorkIds,
    readingProgress,
    followedAuthorIds,
  } = useApp()
  const [activeTab, setActiveTab] = useState('for-you')

  // Identify active reading progress item
  const progressEntries = Object.entries(readingProgress)
  const latestReadEntry = progressEntries.length > 0 ? progressEntries[0] : null
  const latestReadWork = latestReadEntry
    ? allWorks.find((w) => w.id === latestReadEntry[0])
    : null
  const latestProgressData = latestReadEntry ? latestReadEntry[1] : null

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

  const displayName =
    user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Member'

  const dashboardTabs = [
    { id: 'for-you', label: 'Curated For You', icon: <Sparkles className="h-3.5 w-3.5" /> },
    {
      id: 'following',
      label: 'From Followed',
      icon: <Users className="h-3.5 w-3.5" />,
      badge: followedWorks.length > 0 ? followedWorks.length : undefined,
    },
    {
      id: 'saved',
      label: 'Your Library',
      icon: <Bookmark className="h-3.5 w-3.5" />,
      badge: savedWorks.length > 0 ? savedWorks.length : undefined,
    },
    { id: 'trending', label: 'Trending', icon: <Flame className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* PERSONALIZED SALUTATION & QUICK COMMAND BAR */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
              <span>Relay Member Folio</span>
              <span>•</span>
              <span className="text-[var(--ink-primary)] font-semibold">Active Session</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[var(--ink-primary)]">
              Welcome back, {displayName}.
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
              Pick up your reading queue or draft a new serialized manuscript.
            </p>
          </div>

          {/* Quick Action Shortcuts (Including Writer Studio access) */}
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/write/new" className="no-underline">
              <Button variant="primary" size="sm" className="gap-2">
                <PenLine className="h-3.5 w-3.5" />
                <span>Write Story</span>
              </Button>
            </Link>

            <Link to="/library" className="no-underline">
              <Button variant="outline" size="sm" className="gap-2">
                <Bookmark className="h-3.5 w-3.5" />
                <span>My Library ({savedWorkIds.length})</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* DUAL WIDGET: CONTINUE READING & READING QUOTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Active Reading Card (7 cols) */}
        <div className="lg:col-span-7">
          {latestReadWork && latestProgressData ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--ink-primary)]" />
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                    Continue Reading
                  </h3>
                </div>
                <Link
                  to="/library"
                  className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
                >
                  View All in Queue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="relative aspect-[3/4] w-24 sm:w-28 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <img
                    src={latestReadWork.cover}
                    alt={latestReadWork.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{latestReadWork.category}</span>
                      <span>•</span>
                      <span>Chapter {latestProgressData.chapterNumber}</span>
                    </div>
                    <h4 className="font-serif text-xl font-semibold text-[var(--ink-primary)] truncate mt-0.5">
                      {latestReadWork.title}
                    </h4>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {latestReadWork.author.name}
                    </p>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                      <span>Reading Progress</span>
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
                      className="no-underline"
                    >
                      <Button variant="primary" size="sm" className="gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Resume Chapter {latestProgressData.chapterNumber}</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                  Begin Your Personal Reading Queue
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                  You do not have any active manuscripts in progress yet. Browse the curated feed below or explore genres to bookmark your first folio.
                </p>
              </div>
              <Link to="/discover" className="inline-block no-underline pt-2">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <CompassIcon className="h-3.5 w-3.5" />
                  <span>Discover Manuscripts</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Metric Progress Card (5 cols) */}
        <div className="lg:col-span-5">
          <MetricProgressCard
            usedPercent={savedWorkIds.length > 0 ? Math.min(100, savedWorkIds.length * 20) : 45}
            currentLabel={`${savedWorkIds.length} Saved in Library`}
            limitLabel="10 Recommended Goal"
            title="Literary Reading Activity"
            subtitle="Paced reading across serialized chapters"
            className="w-full"
          />
        </div>

      </div>

      {/* INTERACTIVE MEMBER FEED TABS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Your Reading Stream
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Personalized works, followed authors, and active bookmarks
            </p>
          </div>

          <AnimatedTabs
            tabs={dashboardTabs}
            activeId={activeTab}
            onChange={setActiveTab}
            size="sm"
            variant="pill"
          />
        </div>

        {/* Tab Content 1: Curated For You */}
        {activeTab === 'for-you' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {forYouWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}

        {/* Tab Content 2: From Followed Authors */}
        {activeTab === 'following' && (
          <div>
            {followedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {followedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-12 text-center space-y-3">
                <Users className="h-8 w-8 mx-auto text-[var(--ink-faint)]" />
                <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  No Followed Authors Yet
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Follow authors below or in the Writers directory to receive their newly published chapters in this feed.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-2">
                  <Button variant="outline" size="sm">
                    Discover Authors
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Saved Library Queue */}
        {activeTab === 'saved' && (
          <div>
            {savedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-12 text-center space-y-3">
                <Bookmark className="h-8 w-8 mx-auto text-[var(--ink-faint)]" />
                <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Your Library is Empty
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Click the bookmark icon on any manuscript to add it to your private reading queue.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-2">
                  <Button variant="outline" size="sm">
                    Browse Manuscripts
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 4: Trending */}
        {activeTab === 'trending' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}
      </section>

      {/* AUTHORS RESIDENCE RECOMMENDATIONS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Authors You Might Enjoy
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Acclaimed serialized writers and essayists on The Relay
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

      {/* WRITER STUDIO JUMP CARD */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-10 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]">
                <Feather className="h-4 w-4" />
              </span>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                Writer Studio
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              Have a story or serialized manuscript to release? Draft chapters in a distraction-free environment, organize table of contents, and track reader metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/write" className="no-underline">
              <Button variant="outline" size="sm">
                Open Studio
              </Button>
            </Link>
            <Link to="/write/new" className="no-underline">
              <Button variant="primary" size="sm" className="gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                <span>New Manuscript</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
