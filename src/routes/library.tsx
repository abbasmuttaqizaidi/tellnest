import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Bookmark, Play, ArrowRight, BookOpen } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { getWorkSlug } from '../data/mockData'
import { OptimizedImage } from '../components/OptimizedImage'

export const Route = createFileRoute('/library')({
  head: () =>
    generateMeta({
      title: 'My Library — Continue Reading & Saved Books',
      description: 'Your saved books and continue reading progress.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="My Library"
      description="Sign in to view your saved books and continue reading."
      featureBadge="My Library"
    >
      <LibraryPage />
    </ProtectedRoute>
  ),
})

function LibraryPage() {
  const { allWorks, savedWorkIds, toggleSaveWork, readingProgress, writerWorks } = useApp()

  // In-progress reading items ("Currently Reading")
  const continueReadingItems = useMemo(() => {
    return Object.values(readingProgress)
      .map((prog) => {
        const work = allWorks.find((w) => w.id === prog.workId)
        return work ? { work, progress: prog } : null
      })
      .filter(Boolean) as { work: typeof allWorks[0]; progress: typeof readingProgress[string] }[]
  }, [allWorks, readingProgress])

  // Featured focal read (the most recent or primary in-progress work)
  const activeFocusItem = continueReadingItems[0]

  // Saved works ("On the Shelf")
  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  // Active writer draft for the quiet bottom footnote
  const activeDraft = writerWorks?.[0]

  return (
    <div className="w-full bg-[var(--bg-canvas)] min-h-[calc(100vh-80px)] text-[var(--ink-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 sm:py-10">
        
        {/* =========================================================================
            HEADER: Clear & Simple Library Header
            ========================================================================= */}
        <header className="flex items-end justify-between pb-6 mb-8 sm:mb-10 border-b border-[var(--border-subtle)]">
          <div>
            <p className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
              Personal Reading
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-[var(--ink-primary)] tracking-tight font-normal">
              My Library
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]" />
            <span className="font-mono text-xs text-[var(--ink-muted)] font-normal">
              {savedWorks.length} {savedWorks.length === 1 ? 'book' : 'books'} saved
            </span>
          </div>
        </header>

        {/* =========================================================================
            CURRENTLY READING: Focal Experience
            ========================================================================= */}
        <section className="mb-10 sm:mb-12">
          {activeFocusItem ? (
            (() => {
              const { work, progress } = activeFocusItem
              const workSlug = getWorkSlug(work)
              return (
                <div className="flex flex-col md:flex-row items-center md:items-center gap-8 md:gap-10 lg:gap-14">
                  {/* Book Jacket Presentation with Realistic Physical Binding Shadows */}
                  <Link
                    to="/read/$workId/$chapterId"
                    params={{ workId: workSlug, chapterId: progress.chapterId }}
                    aria-label={`Open ${work.title} reader`}
                    className="group relative flex-shrink-0 cursor-pointer block focus:outline-none no-underline"
                  >
                    <div className="relative w-48 sm:w-56 md:w-60 aspect-[3/4] rounded-sm overflow-hidden shadow-[0_16px_40px_-8px_rgba(15,23,42,0.16),0_6px_16px_-4px_rgba(15,23,42,0.08)] transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_50px_-8px_rgba(15,23,42,0.20)] border border-[var(--border-subtle)]">
                      {/* Spine fold & inner-joint illusion */}
                      <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10 pointer-events-none" />
                      <div className="absolute inset-y-0 left-3 w-px bg-white/20 z-10 pointer-events-none" />
                      {/* Cover highlight glare */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/15 pointer-events-none z-10" />

                      {/* Cover Art */}
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={240}
                        height={320}
                        sizes="(max-width: 640px) 192px, 240px"
                        containerClassName="h-full w-full"
                        className="w-full h-full object-cover select-none"
                      />
                    </div>
                    {/* Tactile base shadow */}
                    <div className="w-40 sm:w-48 h-2.5 mx-auto mt-2 rounded-full bg-black/5 dark:bg-white/5 blur-md" />
                  </Link>

                  {/* Reading Metadata & Progress Tracking */}
                  <div className="flex flex-col justify-center w-full max-w-xl text-center md:text-left">
                    <div className="mb-6">
                      <span className="font-mono text-[11px] sm:text-xs uppercase text-[var(--ink-muted)] tracking-widest block mb-2">
                        Currently Reading
                      </span>
                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        className="no-underline text-inherit hover:underline"
                      >
                        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl text-[var(--ink-primary)] tracking-tight leading-snug mb-2">
                          {work.title}
                        </h2>
                      </Link>
                      <p className="font-serif text-sm sm:text-base text-[var(--ink-muted)] italic">
                        {work.author.name}
                      </p>
                    </div>

                    {/* Delicate Minimalist Progress Meter */}
                    <div className="space-y-2.5 mb-7 sm:mb-8 w-full max-w-md mx-auto md:mx-0">
                      <div className="w-full h-[2px] bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-700"
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[var(--ink-muted)] font-mono text-[11px] sm:text-xs">
                        <span>{progress.progressPercent}% completed</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                        <span className="truncate max-w-[160px] sm:max-w-none">
                          {progress.chapterTitle || `Chapter ${progress.chapterNumber}`}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                        <span>Active</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: workSlug, chapterId: progress.chapterId }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-xs hover:opacity-90 transition-opacity shadow-sm no-underline"
                      >
                        <span>Resume Reading</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>

                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
                      >
                        View Index →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })()
          ) : (
            <div className="py-12 sm:py-14 text-center sm:text-left border border-dashed border-[var(--border-subtle)] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5">
                <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)]">
                  Continue Reading
                </span>
                <h3 className="font-serif text-xl sm:text-2xl text-[var(--ink-primary)]">
                  You're not reading any book right now
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] font-serif italic max-w-md">
                  Pick a book from your saved list below, or explore new stories to start reading.
                </p>
              </div>
              <Link
                to="/discover"
                className="px-5 py-2.5 rounded-lg border border-[var(--border-strong)] text-xs font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline shrink-0"
              >
                Discover Books →
              </Link>
            </div>
          )}

          {/* Additional in-progress reads if user has more than 1 active */}
          {continueReadingItems.length > 1 && (
            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] mb-3.5">
                Other Books In Progress ({continueReadingItems.length - 1})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {continueReadingItems.slice(1).map(({ work, progress }) => {
                  const workSlug = getWorkSlug(work)
                  return (
                    <div
                      key={work.id}
                      className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center gap-3.5 hover:border-[var(--border-strong)] transition-colors group"
                    >
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: workSlug, chapterId: progress.chapterId }}
                        className="shrink-0 w-11 aspect-[3/4] rounded overflow-hidden shadow-xs border border-[var(--border-subtle)] block"
                      >
                        <OptimizedImage
                          src={work.cover}
                          alt={work.title}
                          width={44}
                          height={59}
                          sizes="44px"
                          containerClassName="h-full w-full"
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/works/$workId"
                          params={{ workId: workSlug }}
                          className="block no-underline text-inherit"
                        >
                          <h4 className="font-serif text-sm font-bold text-[var(--ink-primary)] truncate group-hover:underline">
                            {work.title}
                          </h4>
                        </Link>
                        <p className="text-[11px] text-[var(--ink-muted)] truncate font-serif italic">
                          Ch. {progress.chapterNumber} • {progress.progressPercent}%
                        </p>
                      </div>
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: workSlug, chapterId: progress.chapterId }}
                        className="p-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                        title="Resume"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Ambient Subtle Division */}
        <div className="w-full h-px bg-[var(--border-subtle)] my-10 sm:my-12" />

        {/* =========================================================================
            SAVED SHELF SECTION: Simple & Direct
            ========================================================================= */}
        <section>
          <div className="flex items-baseline justify-between mb-6 sm:mb-8">
            <h3 className="font-serif text-2xl sm:text-3xl text-[var(--ink-primary)] tracking-tight font-normal">
              Saved Books
            </h3>
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-muted)] italic">
              Your reading list
            </p>
          </div>

          {savedWorks.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-[var(--border-subtle)] rounded-xl space-y-2.5 p-6">
              <Bookmark className="h-6 w-6 text-[var(--ink-faint)] mx-auto mb-1" />
              <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                No saved books yet
              </h4>
              <p className="text-xs text-[var(--ink-muted)] font-serif italic max-w-sm mx-auto">
                When you find a story you want to read later, click the bookmark icon to save it here.
              </p>
              <div className="pt-2">
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)] underline hover:opacity-80"
                >
                  <span>Explore Stories</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            /* Bookshelf Grid (Responsive multi-column) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 sm:gap-x-6 lg:gap-x-7 gap-y-8 sm:gap-y-10">
              {savedWorks.map((work) => {
                const workSlug = getWorkSlug(work)
                return (
                  <article key={work.id} className="flex flex-col group cursor-pointer">
                    <div className="relative aspect-[3/4] w-full rounded-sm overflow-hidden shadow-[0_10px_28px_-6px_rgba(15,23,42,0.12),0_4px_10px_-2px_rgba(15,23,42,0.06)] group-hover:-translate-y-1.5 transition-transform duration-300 ease-out mb-3 border border-[var(--border-subtle)]">
                      {/* Spine Fold shadow */}
                      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10 pointer-events-none" />

                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        className="block h-full w-full"
                      >
                        <OptimizedImage
                          src={work.cover}
                          alt={work.title}
                          width={200}
                          height={267}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          containerClassName="h-full w-full"
                          className="w-full h-full object-cover select-none"
                        />
                      </Link>

                      {/* Quick Bookmark Remove Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleSaveWork(work.id)
                        }}
                        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 cursor-pointer shadow-sm active:scale-90"
                        title="Remove from Shelf"
                      >
                        <Bookmark className="h-3 w-3 fill-white text-white" />
                      </button>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        className="block no-underline text-inherit"
                      >
                        <h4 className="font-serif text-[15px] sm:text-[16px] leading-snug text-[var(--ink-primary)] group-hover:underline transition-colors truncate">
                          {work.title}
                        </h4>
                      </Link>

                      <p className="text-xs text-[var(--ink-muted)] truncate font-serif italic">
                        {work.author.name}
                      </p>

                      <p className="text-[11px] font-mono text-[var(--ink-faint)] pt-0.5 truncate">
                        {work.publishedChaptersCount} chapters · {work.category}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* =========================================================================
            BOTTOM QUIET FOOTNOTE: Draft In Progress link
            ========================================================================= */}
        <div className="mt-12 sm:mt-16 pt-6 flex justify-center border-t border-[var(--border-subtle)]">
          <Link
            to="/write"
            className="inline-flex items-center gap-2 group text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors py-1.5 no-underline text-xs sm:text-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ink-muted)]/50 group-hover:bg-[var(--ink-primary)] transition-colors" />
            <span className="font-sans">
              {activeDraft ? (
                <>
                  Draft in progress: <em className="font-serif not-italic font-normal text-[var(--ink-primary)]">{activeDraft.title}</em>
                </>
              ) : (
                <>Creator Studio & Writing Desk</>
              )}
            </span>
            <span className="text-xs font-mono text-[var(--ink-muted)] group-hover:translate-x-0.5 transition-transform">
              ― Open Writer →
            </span>
          </Link>
        </div>

      </div>
    </div>
  )
}
