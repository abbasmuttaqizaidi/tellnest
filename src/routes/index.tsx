import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES, GENRES, AUTHORS } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import { AnimatedSearch } from '../design-system'
import { useUser } from '@clerk/react'
import {
  BookOpen,
  ArrowRight,
  Bookmark,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  PenLine
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isSignedIn } = useUser()
  const { allWorks, isWorkSaved, toggleSaveWork, readingProgress } = useApp()
  const navigate = useNavigate()
  const [homeQuery, setHomeQuery] = useState('')

  const featuredWork = allWorks[0] // The Cold Perimeter
  const trendingWorks = allWorks.filter(w => w.trending || w.featured).slice(0, 4)
  const risingWorks = allWorks.filter(w => w.rising || w.category === 'Poetry').slice(0, 4)
  const completedWorks = allWorks.filter(w => w.status === 'Completed').slice(0, 3)
  const recentWorks = allWorks.slice(1, 5)

  const isSaved = isWorkSaved(featuredWork.id)
  const progress = readingProgress[featuredWork.id]

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">

      {/* HERO SECTION — Featured Manuscript Showcase Card */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 lg:p-12 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <span className="rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-contrast)] uppercase tracking-wider">
                  Featured Manuscript
                </span>
                <span className="text-xs text-[var(--ink-muted)] font-mono">
                  {featuredWork.category} • {featuredWork.genre}
                </span>
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

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-4">
                <Link
                  to="/read/$workId/$chapterId"
                  params={{
                    workId: featuredWork.id,
                    chapterId: progress ? progress.chapterId : featuredWork.chapters[0].id
                  }}
                  className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline shadow-xs"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>{progress ? `Continue Chapter ${progress.chapterNumber}` : 'Start Reading Chapter 1'}</span>
                </Link>

                <button
                  onClick={() => toggleSaveWork(featuredWork.id)}
                  className={`inline-flex items-center gap-2 rounded border px-4 py-2.5 text-xs font-medium transition-all ${
                    isSaved
                      ? 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? 'Saved in Library' : 'Save to Library'}</span>
                </button>

                <Link
                  to="/works/$workId"
                  params={{ workId: featuredWork.id }}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
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
                {/* Visual architectural badge */}
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
              <Link to="/discover" className="text-xs font-mono text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1">
                View All (11) <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Curated serialized novels, investigative essays, and historical fiction.
            </p>
          </div>

          {/* Typewriter Literary Ghost Search Bar */}
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

      {/* SECTION 1: TRENDING WORKS */}
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
          <Link to="/discover" className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1">
            Explore Trending <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      </section>

      {/* SECTION 2: NEW & RISING & RECENT CHAPTERS */}
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

      {/* SECTION 3: POPULAR AUTHORS */}
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
          <Link to="/discover" className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1">
            Explore All Authors <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* SECTION 4: CALL TO ACTION FOR WRITERS */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 text-center space-y-6 shadow-xs">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
          <PenLine className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
            An elegant digital library where anyone can become a writer.
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-muted)] max-w-xl mx-auto">
            Whether you are drafting a multi-chapter serialized thriller, an introspective personal essay, or spare poetry, Relay Stories provides a calm, distraction-free environment to publish and build an audience.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2">
          {isSignedIn && (
            <Link
              to="/write/new"
              className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline shadow-xs"
            >
              <PenLine className="h-4 w-4" />
              <span>Create New Work</span>
            </Link>
          )}

          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
          >
            <span>Explore the Library</span>
          </Link>
        </div>
      </section>

    </div>
  )
}
