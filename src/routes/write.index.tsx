import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'
import {
  PenLine,
  Plus,
  Search,
  X,
  BookOpen,
  Trash2,
  AlertTriangle,
  Trophy,
  Heart,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { deleteWriterWorkServerFn } from '../server/writer'
import { getWriterContestStatusServerFn } from '../server/contests'
import { ContestEntryModal } from '../components/ContestEntryModal'

export const Route = createFileRoute('/write/')({
  head: () =>
    generateMeta({
      title: 'Writer Studio & Stories',
      description: 'Craft, serialize, edit, and bind your serialized manuscripts on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Writer's Studio"
      description="Your private creative space to craft, edit, and publish stories."
      featureBadge="Writer Studio"
    >
      <WriterStudioPage />
    </ProtectedRoute>
  ),
})

function WriterStudioPage() {
  const { writerWorks, isWriterWorksLoading, allWorks, showToast, reloadWriterWorksFromDb } = useApp()
  const { user, isLoaded, isSignedIn } = useUser()

  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'draft'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteWorkTarget, setDeleteWorkTarget] = useState<any | null>(null)
  const [isDeletingWork, setIsDeletingWork] = useState(false)
  const [contestStatus, setContestStatus] = useState<any | null>(null)
  const [isContestModalOpen, setIsContestModalOpen] = useState(false)

  const loadContestStatus = async () => {
    if (!isLoaded || !isSignedIn || !user?.id) return
    try {
      const status = await getWriterContestStatusServerFn()
      setContestStatus(status)
    } catch (err) {
      console.warn('[WriterStudio] Failed to load contest status:', err)
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      loadContestStatus()
    }
  }, [isLoaded, isSignedIn, user?.id])

  const handleConfirmDeleteWork = async () => {
    if (!user?.id || !deleteWorkTarget?.id) return
    try {
      setIsDeletingWork(true)
      await deleteWriterWorkServerFn({
        data: {
          workId: deleteWorkTarget.id,
          clerkUserId: user.id,
        },
      })
      await reloadWriterWorksFromDb()
      showToast(`Manuscript "${deleteWorkTarget.title}" permanently deleted.`)
      setDeleteWorkTarget(null)
    } catch (err: any) {
      console.error('[handleConfirmDeleteWork] Error:', err)
      showToast(err?.message || 'Failed to delete manuscript')
    } finally {
      setIsDeletingWork(false)
    }
  }

  const publishedWorksCount = useMemo(
    () => writerWorks.filter((w) => w.status === 'Published').length,
    [writerWorks]
  )

  const draftsCount = useMemo(
    () => writerWorks.filter((w) => w.status === 'Draft').length,
    [writerWorks]
  )

  const filteredWorks = useMemo(() => {
    let list = writerWorks

    if (filterTab === 'published') {
      list = list.filter((w) => w.status === 'Published')
    } else if (filterTab === 'draft') {
      list = list.filter((w) => w.status === 'Draft')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          (w.category && w.category.toLowerCase().includes(q)) ||
          (w.genre && w.genre.toLowerCase().includes(q))
      )
    }

    return list
  }, [writerWorks, filterTab, searchQuery])

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] pb-16 selection:bg-[var(--ink-primary)] selection:text-[var(--accent-contrast)]">
      {/* Studio Header: Clean, Writer-First */}
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-black text-white dark:bg-white dark:text-black shadow-xs">
              <PenLine className="h-4 w-4" />
            </span>
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
                Stories
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/write/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-black hover:bg-stone-800 text-white px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold shadow-xs transition-colors no-underline cursor-pointer"
            >
              <Plus className="h-4 w-4 text-white" strokeWidth={2.2} />
              <span>New Story</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dedicated Monthly Contest Section (Active Entry) */}
        {contestStatus?.entry && contestStatus.contest && (
          <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--border-subtle)]">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Trophy className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-base font-bold text-[var(--ink-primary)]">
                      Monthly Contest Submission
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold">
                      Active in Competition
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {contestStatus.contest.title} • ₹{contestStatus.contest.prize_inr.toLocaleString()} Cash Prize
                  </p>
                </div>
              </div>

              <Link
                to="/writing-contests"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity no-underline shrink-0 shadow-xs"
              >
                <span>Live Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-tertiary)] block">
                  Participating Manuscript
                </span>
                <Link
                  to={`/write/manage/${contestStatus.entry.workId}`}
                  className="font-serif font-bold text-sm text-[var(--ink-primary)] hover:underline truncate block no-underline"
                >
                  {contestStatus.entry.title}
                </Link>
                <span className="text-[11px] text-[var(--ink-muted)] font-mono block">
                  Submitted {new Date(contestStatus.entry.submitted_at).toLocaleDateString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-tertiary)] block">
                  Reader Likes Collected
                </span>
                <div className="flex items-center gap-1.5 font-bold text-base text-[var(--ink-primary)]">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  <span>{contestStatus.entry.like_count.toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-[var(--ink-muted)] block">
                  Maximum reader likes wins ₹{contestStatus.contest.prize_inr.toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-tertiary)] block">
                  Contest Status &amp; Timeline
                </span>
                <p className="font-semibold text-xs text-[var(--ink-primary)]">
                  {new Date(contestStatus.contest.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(contestStatus.contest.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                  Submission locked (1 entry per author)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Contest Eligible Opportunity Banner (If writer has eligible stories but hasn't entered yet) */}
        {!contestStatus?.entry && contestStatus?.hasEligibleUnsubmittedWorks && contestStatus.contest && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-sm font-bold text-[var(--ink-primary)]">
                    You have an eligible manuscript for this month’s contest!
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-semibold">
                    {contestStatus.eligibleWorksCount} Eligible
                  </span>
                </div>
                <p className="text-xs text-[var(--ink-muted)]">
                  ₹{contestStatus.contest.prize_inr.toLocaleString()} Cash Prize • 100% Free Entry • Reader likes decide the winner
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsContestModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 cursor-pointer shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Enter Monthly Contest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Full-Width Tabs with Right-Aligned Search (Matching /write/manage pattern) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          {/* Tabs */}
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto -mb-px">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'all'
                  ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>All Stories</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'all'
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {writerWorks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('published')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'published'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Published</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'published'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {publishedWorksCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('draft')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                filterTab === 'draft'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Drafts</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                filterTab === 'draft'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {draftsCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center pb-2.5 sm:pb-2 sm:w-64 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans bg-[var(--bg-canvas)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--ink-primary)] focus:ring-1 focus:ring-[var(--ink-primary)] rounded-full pl-8.5 pr-8 py-1.5 shadow-2xs focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stories Grid (Option A: Visual Cover Cards) */}
        {filteredWorks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-12 text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--ink-muted)]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                {searchQuery ? 'No stories match your search' : 'No manuscripts here yet'}
              </h3>
              <p className="font-serif text-xs text-[var(--ink-muted)] mt-1">
                {searchQuery
                  ? 'Try searching with a different title or keyword.'
                  : 'Start penning your next serialized story.'}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs font-mono underline text-[var(--ink-primary)] hover:opacity-80 cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <Link
                to="/write/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-black text-white px-4 py-2 text-xs font-semibold shadow-xs hover:bg-stone-800 transition-colors no-underline"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span>Create New Story</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* Create New Story Dashed Card */}
            <Link
              to="/write/new"
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--ink-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/40 p-6 min-h-[300px] text-center transition-all duration-200 no-underline shadow-2xs cursor-pointer"
            >
              <div className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                <Plus className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                New Story
              </h4>
              <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-1 max-w-[160px]">
                Start a new serialized manuscript
              </p>
            </Link>

            {/* Story Cover Cards */}
            {filteredWorks.map((work) => {
              const fullWork = allWorks.find((w) => w.id === work.id || w.title === work.title)
              const firstChapterId =
                work.firstChapterId && work.firstChapterId !== 'ch-1'
                  ? work.firstChapterId
                  : work.chapters?.[0]?.id || fullWork?.chapters?.[0]?.id || 'first'
              const isDraft = work.status === 'Draft'
              const isPublished = work.status === 'Published'

              return (
                <div
                  key={work.id}
                  className="group relative flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Book Cover */}
                  <Link
                    to="/write/manage/$workId"
                    params={{ workId: work.id }}
                    className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-canvas)] block no-underline cursor-pointer"
                  >
                    <img
                      src={work.cover}
                      alt={work.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Status Pill on Cover */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold backdrop-blur-md shadow-xs ${
                          isPublished
                            ? 'bg-emerald-600 text-white'
                            : isDraft
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-700 text-white'
                        }`}
                      >
                        {work.status}
                      </span>
                      {work.isContestLocked && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/90 text-amber-950 backdrop-blur-md shadow-xs"
                          title={`Contest Locked: Entered in ${work.contestTitle || 'Writing Contest'}`}
                        >
                          <Lock className="h-2.5 w-2.5" />
                          <span>Contest Locked</span>
                        </span>
                      )}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center p-2">
                      <span className="px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] text-[var(--ink-primary)] text-xs font-semibold shadow-md">
                        Open Outline
                      </span>
                    </div>
                  </Link>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <Link
                        to="/write/manage/$workId"
                        params={{ workId: work.id }}
                        className="font-serif text-base font-semibold text-[var(--ink-primary)] hover:underline line-clamp-1 block no-underline"
                        title={work.title}
                      >
                        {work.title}
                      </Link>

                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)] mt-1">
                        <span>{work.chaptersCount} {work.chaptersCount === 1 ? 'ch' : 'chs'}</span>
                        <span>•</span>
                        <span>{work.category}</span>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                      <Link
                        to="/write/manage/$workId"
                        params={{ workId: work.id }}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--ink-primary)] text-xs font-medium transition-colors no-underline cursor-pointer"
                      >
                        Manage
                      </Link>

                      <Link
                        to="/write/editor/$workId/$chapterId"
                        params={{ workId: work.id, chapterId: firstChapterId }}
                        className="flex-1 text-center py-1.5 px-2 rounded-lg bg-black hover:bg-stone-800 text-white text-xs font-semibold transition-colors no-underline shadow-2xs cursor-pointer"
                      >
                        Write
                      </Link>

                      {work.isContestLocked ? (
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              `Cannot delete: "${work.title}" has been entered into ${work.contestTitle || 'the contest'}. Contest manuscripts cannot be deleted.`,
                              'error'
                            )
                          }
                          className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                          title={`Contest Locked: Cannot delete "${work.title}"`}
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteWorkTarget(work)}
                          className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                          title="Delete Story"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Delete Story Confirmation Modal */}
      {deleteWorkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Delete Manuscript?
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  Are you sure you want to permanently delete <span className="font-semibold text-[var(--ink-primary)] font-serif">"{deleteWorkTarget.title}"</span>?
                </p>
              </div>
            </div>

            {/* Warning Banner */}
            {deleteWorkTarget.isContestLocked ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-300">
                    Contest Participant Locked
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                    This story has been entered into {deleteWorkTarget.contestTitle || 'the contest'}. Contest manuscripts are locked from deletion to maintain leaderboard and reader voting integrity.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 dark:bg-red-950/20 p-3.5 flex items-start gap-3 text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    This action cannot be undone
                  </p>
                  <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                    This will permanently delete this manuscript, all its chapters, acts, reader comments, bookmarks, and statistics.
                  </p>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                disabled={isDeletingWork}
                onClick={() => setDeleteWorkTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                {deleteWorkTarget.isContestLocked ? 'Close' : 'Cancel'}
              </button>
              {!deleteWorkTarget.isContestLocked && (
                <button
                  type="button"
                  disabled={isDeletingWork}
                  onClick={handleConfirmDeleteWork}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeletingWork && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />}
                  <span>{isDeletingWork ? 'Deleting...' : 'Permanently Delete'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Contest Entry Modal */}
      {contestStatus?.contest && (
        <ContestEntryModal
          isOpen={isContestModalOpen}
          onClose={() => setIsContestModalOpen(false)}
          contest={contestStatus.contest}
          initialEnteredWork={contestStatus?.entry}
          onSuccess={async () => {
            await loadContestStatus()
          }}
        />
      )}
    </div>
  )
}
