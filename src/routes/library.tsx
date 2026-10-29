import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  Bookmark,
  Play,
  ArrowRight,
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  X,
  Compass,
  Eye,
  Loader2,
  Tag,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { getWorkSlug } from '../data/mockData'
import { OptimizedImage } from '../components/OptimizedImage'
import { RouteHeader } from '../components/RouteHeader'
import { Drawer } from '../design-system/Drawer'
import { FormattedSynopsis } from '../components/FormattedSynopsis'
import {
  getCompactLibraryWorksServerFn,
  getLibraryWorkDetailServerFn,
  type CompactLibraryWork,
  type LibraryWorkDetail,
  projectToCompactLibraryWork,
} from '../server/library'

export interface LibrarySearch {
  preview?: string
  tab?: 'all' | 'reading' | 'saved' | 'completed'
}

export const Route = createFileRoute('/library')({
  // In-Memory SWR (Desktop & Mobile): Keeps shelf data fresh in RAM for 30s; instant 0ms navigation
  staleTime: 30_000,
  gcTime: 1000 * 60 * 5,
  validateSearch: (search: Record<string, unknown>): LibrarySearch => {
    const rawTab = typeof search.tab === 'string' ? search.tab.toLowerCase() : ''
    const validTabs: LibrarySearch['tab'][] = ['all', 'reading', 'saved', 'completed']
    const tab = validTabs.includes(rawTab as any) ? (rawTab as LibrarySearch['tab']) : undefined
    return {
      preview: search.preview ? String(search.preview).replace(/['"]/g, '') : undefined,
      tab,
    }
  },
  head: () =>
    generateMeta({
      title: 'My Library — Continue Reading & Saved Books',
      description: 'Your saved books and continue reading progress.',
      noindex: true,
    }),
  component: LibraryPageRoute,
})

function LibraryPageRoute() {
  const { isSignedIn } = useUser()
  const { preview, tab } = Route.useSearch()
  const cleanPreview = preview ? String(preview).replace(/['"]/g, '') : ''
  const isExplicitPreview =
    cleanPreview === 'true' ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('preview')?.replace(/['"]/g, '') === 'true')

  // If a user is signed in, ALWAYS show their authentic real user library!
  // Mock preview mode is strictly reserved for logged-out design inspection.
  if (isExplicitPreview && !isSignedIn) {
    return <LibraryPage isPreview={true} initialTab={tab} />
  }

  return (
    <ProtectedRoute
      title="My Library"
      description="Sign in to view your saved books and continue reading."
      featureBadge="My Library"
    >
      <LibraryPage isPreview={false} initialTab={tab} />
    </ProtectedRoute>
  )
}

type ShelfTab = 'all' | 'reading' | 'saved' | 'completed'

function LibraryPage({ isPreview = false, initialTab }: { isPreview?: boolean; initialTab?: ShelfTab }) {
  const { allWorks, savedWorkIds: rawSavedWorkIds, toggleSaveWork, readingProgress: rawReadingProgress, writerWorks, isOwnWork } = useApp()
  const [activeTab, setActiveTab] = useState<ShelfTab>(() => {
    if (initialTab && ['all', 'reading', 'saved', 'completed'].includes(initialTab)) {
      return initialTab
    }
    return 'all'
  })

  // Sync tab if URL search parameter changes
  useEffect(() => {
    if (initialTab && ['all', 'reading', 'saved', 'completed'].includes(initialTab)) {
      setActiveTab(initialTab)
    }
  }, [initialTab])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFocalWorkId, setSelectedFocalWorkId] = useState<string | null>(null)

  // Remote compact library works fetched directly from API
  // (per request: only book name, cover, no of chapters, author name, and genre)
  const [apiWorks, setApiWorks] = useState<CompactLibraryWork[]>([])
  const [isLoadingApiWorks, setIsLoadingApiWorks] = useState(true)

  // Drawer state for mobile detail view
  const [selectedWorkForDrawer, setSelectedWorkForDrawer] = useState<CompactLibraryWork | null>(null)
  const [drawerDetail, setDrawerDetail] = useState<LibraryWorkDetail | null>(null)
  const [isLoadingDrawer, setIsLoadingDrawer] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const drawerCacheRef = useRef<Map<string, LibraryWorkDetail>>(new Map())

  // In preview mode with an empty shelf, populate realistic sample reading data
  const [localSavedOverrides, setLocalSavedOverrides] = useState<string[] | null>(null)

  const savedWorkIds = useMemo(() => {
    if (localSavedOverrides !== null) return localSavedOverrides
    if (isPreview && rawSavedWorkIds.length === 0 && allWorks.length > 0) {
      return allWorks.slice(0, 2).map((w) => w.id)
    }
    return rawSavedWorkIds
  }, [localSavedOverrides, isPreview, rawSavedWorkIds, allWorks])

  const handleToggleBookmark = (workId: string) => {
    if (isPreview) {
      setLocalSavedOverrides((prev) => {
        const current = prev !== null ? prev : savedWorkIds
        if (current.includes(workId)) {
          return current.filter((id) => id !== workId)
        } else {
          return [...current, workId]
        }
      })
    } else {
      toggleSaveWork(workId)
    }
  }

  const readingProgress = useMemo(() => {
    if (isPreview && Object.keys(rawReadingProgress).length === 0 && allWorks.length >= 3) {
      const result: Record<string, any> = {
        [allWorks[0].id]: {
          workId: allWorks[0].id,
          chapterId: allWorks[0].chapters?.[0]?.id || 'ch-1',
          chapterNumber: 3,
          chapterTitle: 'The Whispering Gallery',
          progressPercent: 42,
          lastReadAt: new Date().toISOString(),
        },
        [allWorks[1].id]: {
          workId: allWorks[1].id,
          chapterId: allWorks[1].chapters?.[0]?.id || 'ch-1',
          chapterNumber: 7,
          chapterTitle: 'Beneath Cold Snow',
          progressPercent: 68,
          lastReadAt: new Date(Date.now() - 3600000).toISOString(),
        },
        [allWorks[2].id]: {
          workId: allWorks[2].id,
          chapterId: allWorks[2].chapters?.[0]?.id || 'ch-1',
          chapterNumber: 12,
          chapterTitle: 'Epilogue: Across the Fog',
          progressPercent: 100,
          lastReadAt: new Date(Date.now() - 86400000).toISOString(),
        },
      }
      if (allWorks[3]) {
        result[allWorks[3].id] = {
          workId: allWorks[3].id,
          chapterId: allWorks[3].chapters?.[0]?.id || 'ch-1',
          chapterNumber: 2,
          chapterTitle: 'The Frozen Lantern',
          progressPercent: 25,
          lastReadAt: new Date(Date.now() - 172800000).toISOString(),
        }
      }
      return result
    }
    return rawReadingProgress
  }, [isPreview, rawReadingProgress, allWorks])

  // Unique work IDs needed on this user's library shelf (Least Data Principle)
  const relevantWorkIds = useMemo(() => {
    const set = new Set<string>()
    for (const id of savedWorkIds) set.add(id)
    for (const id of Object.keys(readingProgress)) set.add(id)
    return Array.from(set)
  }, [savedWorkIds, readingProgress])

  const relevantWorkIdsKey = useMemo(() => relevantWorkIds.slice().sort().join(','), [relevantWorkIds])

  // Fetch compact library works strictly for target shelf items (Least Data Principle)
  useEffect(() => {
    let isMounted = true

    // If shelf is empty and not in preview mode, do not query DB at all
    if (!isPreview && relevantWorkIds.length === 0) {
      setApiWorks([])
      setIsLoadingApiWorks(false)
      return
    }

    setIsLoadingApiWorks(true)
    getCompactLibraryWorksServerFn({
      data: { workIds: relevantWorkIds.length > 0 ? relevantWorkIds : undefined },
    })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setApiWorks(data)
        }
      })
      .catch((err) => {
        console.warn('[Library] Failed to fetch compact library works:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingApiWorks(false)
      })

    return () => {
      isMounted = false
    }
  }, [relevantWorkIdsKey, isPreview])

  // Source catalog of works: prefers API compact works, seamlessly augmented with AppContext works
  const baseCatalog = useMemo<CompactLibraryWork[]>(() => {
    if (apiWorks.length > 0) {
      // Merge in any app context works not yet in apiWorks
      const map = new Map<string, CompactLibraryWork>()
      for (const w of apiWorks) map.set(w.id, w)
      for (const w of allWorks) {
        if (!map.has(w.id) && !isOwnWork(w.id)) {
          map.set(w.id, projectToCompactLibraryWork(w))
        }
      }
      return Array.from(map.values())
    }
    return allWorks.filter((w) => !isOwnWork(w.id)).map(projectToCompactLibraryWork)
  }, [apiWorks, allWorks, isOwnWork])

  // In-progress reading items ("Currently Reading", sorted by most recent activity)
  const continueReadingItems = useMemo(() => {
    return Object.values(readingProgress)
      .sort((a, b) => {
        const timeA = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0
        const timeB = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0
        return timeB - timeA
      })
      .map((prog) => {
        const work = baseCatalog.find((w) => w.id === prog.workId)
        return work ? { work, progress: prog } : null
      })
      .filter(Boolean) as { work: CompactLibraryWork; progress: typeof readingProgress[string] }[]
  }, [baseCatalog, readingProgress])

  // Completed items (progress >= 100%)
  const completedItems = useMemo(() => {
    return continueReadingItems.filter((item) => Number(item.progress.progressPercent || 0) >= 100)
  }, [continueReadingItems])

  // Actively in-progress items (progress between 1% and 99%)
  const inProgressItems = useMemo(() => {
    return continueReadingItems.filter((item) => Number(item.progress.progressPercent || 0) < 100)
  }, [continueReadingItems])

  // Featured focal read (user-selected or most recent in-progress book)
  const activeFocusItem = useMemo(() => {
    if (selectedFocalWorkId) {
      const match = inProgressItems.find((i) => i.work.id === selectedFocalWorkId)
      if (match) return match
    }
    return inProgressItems[0] || null
  }, [selectedFocalWorkId, inProgressItems])

  // Saved works ("On the Shelf")
  const savedWorks = useMemo(() => {
    return baseCatalog.filter((w) => savedWorkIds.includes(w.id))
  }, [baseCatalog, savedWorkIds])

  // Unified Library Collection (All works either saved or in progress, deduplicated)
  const allLibraryItems = useMemo(() => {
    const map = new Map<string, { work: CompactLibraryWork; progress: typeof readingProgress[string] | null; isSaved: boolean }>()

    for (const w of savedWorks) {
      map.set(w.id, {
        work: w,
        progress: readingProgress[w.id] || null,
        isSaved: true,
      })
    }

    for (const item of continueReadingItems) {
      const existing = map.get(item.work.id)
      if (existing) {
        existing.progress = item.progress
      } else {
        map.set(item.work.id, {
          work: item.work,
          progress: item.progress,
          isSaved: savedWorkIds.includes(item.work.id),
        })
      }
    }

    return Array.from(map.values())
  }, [savedWorks, continueReadingItems, readingProgress, savedWorkIds])

  // Filtered and searched library items for the Bookcase grid and list
  const displayedItems = useMemo(() => {
    let list = allLibraryItems

    if (activeTab === 'reading') {
      list = list.filter((i) => i.progress && Number(i.progress.progressPercent || 0) < 100)
    } else if (activeTab === 'saved') {
      list = list.filter((i) => i.isSaved)
    } else if (activeTab === 'completed') {
      list = list.filter((i) => i.progress && Number(i.progress.progressPercent || 0) >= 100)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter((i) => {
        const titleMatch = i.work.title.toLowerCase().includes(q)
        const authorMatch = i.work.authorName?.toLowerCase().includes(q)
        const genreMatch = i.work.genre?.toLowerCase().includes(q)
        return titleMatch || authorMatch || genreMatch
      })
    }

    return list
  }, [allLibraryItems, activeTab, searchQuery])

  // Handler for mobile "View" button: fetches book details via API and opens bottom drawer (with in-memory client cache)
  const handleOpenWorkDetail = async (work: CompactLibraryWork) => {
    setSelectedWorkForDrawer(work)
    setDrawerError(null)

    // Check client-side cache first (least data / zero network requests on revisit)
    const cached =
      drawerCacheRef.current.get(work.id) ||
      (work.slug ? drawerCacheRef.current.get(work.slug) : undefined)
    if (cached) {
      setDrawerDetail(cached)
      setIsLoadingDrawer(false)
      return
    }

    setDrawerDetail(null)
    setIsLoadingDrawer(true)
    try {
      const detail = await getLibraryWorkDetailServerFn({ data: work.slug || work.id })
      if (detail) {
        drawerCacheRef.current.set(work.id, detail)
        if (detail.slug) drawerCacheRef.current.set(detail.slug, detail)
      }
      setDrawerDetail(detail)
    } catch (err: any) {
      console.error('[Library] Failed to fetch work detail:', err)
      setDrawerError(err?.message || 'Failed to load details.')
    } finally {
      setIsLoadingDrawer(false)
    }
  }

  const handleCloseDrawer = () => {
    setSelectedWorkForDrawer(null)
    setDrawerDetail(null)
    setDrawerError(null)
  }

  return (
    <div className="min-h-screen pb-16 text-[var(--ink-primary)] bg-[var(--bg-canvas)]">
      
      {/* =========================================================================
          HEADER: RouteHeader with sticky handoff & bookshelf summary
          ========================================================================= */}
      <RouteHeader
        title="My Library"
        subtitle="Your personal reading sanctuary"
        rightExtra={
          <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-[var(--ink-muted)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {allLibraryItems.length} {allLibraryItems.length === 1 ? 'manuscript' : 'manuscripts'}
            </span>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 space-y-8 sm:space-y-12">

        {/* =========================================================================
            FOCAL HERO: Currently Reading (Compact Minimalist Focal Read)
            ========================================================================= */}
        {activeFocusItem && (
          <section className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-subtle)]/40 p-3 sm:p-4 md:p-5 shadow-xs">
            {(() => {
              const { work, progress } = activeFocusItem
              const workSlug = work.slug || getWorkSlug(work as any)
              const safePercent = Math.min(100, Math.max(0, Math.round(Number(progress.progressPercent || 0))))
              const isSaved = savedWorkIds.includes(work.id)

              return (
                <div className="flex flex-row items-stretch gap-3.5 sm:gap-5 md:gap-6">
                  {/* Full-Height Proportional Book Cover Presentation */}
                  <div className="relative group shrink-0 self-stretch aspect-[2/3] sm:aspect-[3/4]">
                    <Link
                      to="/read/$workId/$chapterId"
                      params={{ workId: workSlug, chapterId: progress.chapterId }}
                      preload="intent"
                      aria-label={`Open ${work.title} reader`}
                      className="block h-full w-full focus:outline-none no-underline"
                    >
                      <div className="relative h-full w-full rounded-sm sm:rounded-md overflow-hidden shadow-sm transition-transform duration-300 group-hover:scale-[1.02] border border-[var(--border-subtle)]">
                        {/* Physical spine fold & inner-joint illusion */}
                        <div className="absolute inset-y-0 left-0 w-2 sm:w-2.5 bg-gradient-to-r from-black/35 via-black/15 to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-y-0 left-2 sm:left-2.5 w-px bg-white/20 z-10 pointer-events-none" />
                        
                        {/* Paper glare highlight */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-white/20 pointer-events-none z-10" />

                        {/* Cover Art */}
                        <OptimizedImage
                          src={work.cover}
                          alt={work.title}
                          width={140}
                          height={186}
                          sizes="(max-width: 640px) 100px, 140px"
                          containerClassName="h-full w-full"
                          className="w-full h-full object-cover select-none"
                        />
                      </div>
                    </Link>
                  </div>

                  {/* Reading Metadata & Progress Tracking */}
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="mb-1.5 sm:mb-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] mb-1">
                        <Clock className="w-2.5 h-2.5 text-[var(--ink-muted)]" />
                        <span className="font-mono text-[9px] uppercase text-[var(--ink-muted)] tracking-wider">
                          Currently Reading
                        </span>
                      </div>

                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        preload="intent"
                        className="no-underline text-inherit hover:underline block"
                      >
                        <h2 className="font-serif text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[var(--ink-primary)] tracking-tight truncate leading-snug">
                          {work.title}
                        </h2>
                      </Link>

                      <p className="font-serif text-xs text-[var(--ink-muted)] italic truncate">
                        By {work.authorName}
                      </p>
                    </div>

                    {/* Progress Bar & Chapter Tracking */}
                    <div className="space-y-1 mb-2.5 sm:mb-3 max-w-md">
                      <div className="w-full h-1 sm:h-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${safePercent}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-[var(--ink-muted)] font-mono text-[9px] sm:text-[10px]">
                        <span className="font-medium text-[var(--ink-primary)]">{safePercent}% of story</span>
                        <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                        <span className="truncate max-w-[140px] sm:max-w-[220px]" title={`Ch. ${progress.chapterNumber || 1} of ${work.chaptersCount || 1}${progress.chapterTitle ? `: ${progress.chapterTitle}` : ''}`}>
                          Ch. {progress.chapterNumber || 1} of {work.chaptersCount || 1} {progress.chapterTitle ? `(${progress.chapterTitle})` : ''}
                        </span>
                        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                        <span className="hidden sm:inline">Active</span>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: workSlug, chapterId: progress.chapterId }}
                        preload="intent"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-xs hover:opacity-90 active:scale-95 transition-all shadow-2xs no-underline"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Resume</span>
                      </Link>

                      <Link
                        to="/works/$workId"
                        params={{ workId: workSlug }}
                        preload="intent"
                        className="px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--bg-surface)] text-xs font-medium text-[var(--ink-primary)] transition-colors no-underline"
                      >
                        Chapters →
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleToggleBookmark(work.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSaved
                            ? 'bg-white text-black border-zinc-200 shadow-2xs hover:bg-zinc-100'
                            : 'bg-zinc-900/80 dark:bg-zinc-800/90 text-white border-zinc-700 dark:border-zinc-600 hover:bg-zinc-800'
                        }`}
                        title={isSaved ? 'Remove from Saved' : 'Save to Shelf'}
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-black text-black' : 'text-white'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Additional In-Progress Shelf (if reader has more than 1 active book) */}
            {inProgressItems.length > 1 && (
              <div className="mt-3.5 pt-2.5 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
                    <Layers className="h-2.5 w-2.5" />
                    <span>Your Reading Stack ({inProgressItems.length} in progress)</span>
                  </p>
                  <span className="hidden sm:inline font-mono text-[9px] text-[var(--ink-faint)]">
                    Click to switch
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {inProgressItems
                      .filter((item) => item.work.id !== activeFocusItem.work.id)
                      .map(({ work, progress }) => {
                        const workSlug = work.slug || getWorkSlug(work as any)
                        const percent = Math.min(100, Math.max(0, Math.round(Number(progress.progressPercent || 0))))
                        return (
                          <motion.div
                            key={work.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                            onClick={() => setSelectedFocalWorkId(work.id)}
                            className="p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] flex items-center gap-2.5 transition-all cursor-pointer group hover:shadow-2xs"
                            title="Click to spotlight this book"
                          >
                            <div className="shrink-0 w-8 aspect-[3/4] rounded-xs overflow-hidden shadow-2xs border border-[var(--border-subtle)] relative">
                              <OptimizedImage
                                src={work.cover}
                                alt={work.title}
                                width={32}
                                height={42}
                                sizes="32px"
                                containerClassName="h-full w-full"
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <h4 className="font-serif text-xs font-bold text-[var(--ink-primary)] truncate group-hover:underline">
                                {work.title}
                              </h4>
                              <p className="text-[10px] text-[var(--ink-muted)] truncate font-mono">
                                Ch. {progress.chapterNumber || 1} of {work.chaptersCount || 1} · {percent}% of story
                              </p>
                            </div>

                            <Link
                              to="/read/$workId/$chapterId"
                              params={{ workId: workSlug, chapterId: progress.chapterId }}
                              preload="intent"
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 w-6 rounded-full border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] flex items-center justify-center text-[var(--ink-muted)] transition-all shrink-0"
                              title="Jump straight to reading"
                            >
                              <Play className="h-2.5 w-2.5 fill-current" />
                            </Link>
                          </motion.div>
                        )
                      })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =========================================================================
            THE BOOKCASE: Controls (Simple Shelf Toggles + Search)
            ========================================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
            
            {/* Minimalist Segmented Shelf Toggles */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <span>All Books</span>
                <span className="font-mono text-[10px] opacity-70">({allLibraryItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reading')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'reading'
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <span>Reading</span>
                <span className="font-mono text-[10px] opacity-70">({inProgressItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'saved'
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <span>Saved Shelf</span>
                <span className="font-mono text-[10px] opacity-70">({savedWorks.length})</span>
              </button>

              {completedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'completed'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-2xs font-semibold'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  <span>Completed</span>
                  <span className="font-mono text-[10px] opacity-70">({completedItems.length})</span>
                </button>
              )}
            </div>

            {/* Quiet Bookshelf Filter Search */}
            <div className="relative w-full sm:w-60 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Find in your bookcase..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Empty State */}
          {displayedItems.length === 0 ? (
            <div className="py-16 sm:py-20 text-center border border-dashed border-[var(--border-subtle)] rounded-2xl p-6 sm:p-10 space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--ink-muted)]">
                <BookOpen className="h-5 w-5" />
              </div>
              
              <h4 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
                {searchQuery
                  ? 'No matching books found'
                  : activeTab === 'reading'
                  ? 'No books currently in progress'
                  : activeTab === 'completed'
                  ? 'No completed books yet'
                  : 'Your bookcase is open and waiting'}
              </h4>

              <p className="text-xs sm:text-sm text-[var(--ink-muted)] font-serif italic max-w-md mx-auto">
                {searchQuery
                  ? `No manuscripts in your library match "${searchQuery}". Clear your search to see all books.`
                  : activeTab === 'reading'
                  ? 'Pick a book from your saved shelf or discover new releases to begin reading.'
                  : activeTab === 'completed'
                  ? 'As you reach the final chapter of stories, your finished manuscripts will rest here.'
                  : 'Save stories from the archives or start reading any chapter to build your personal shelf.'}
              </p>

              <div className="pt-3">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl border border-[var(--border-strong)] text-xs font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                ) : (
                  <Link
                    to="/discover"
                    preload="intent"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>Explore Story Catalog</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* =========================================================================
                  MOBILE LIST VIEW (md:hidden)
                  Per user request: clean vertical list with dedicated "View" action button
                  ========================================================================= */}
              <div data-testid="library-mobile-list-view" className="md:hidden space-y-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {displayedItems.map(({ work, progress, isSaved }) => {
                    const workSlug = work.slug || getWorkSlug(work as any)
                    const percent = progress ? Math.min(100, Math.max(0, Math.round(Number(progress.progressPercent || 0)))) : 0
                    const isCompleted = percent >= 100

                    return (
                      <motion.div
                        key={work.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{
                          opacity: 0,
                          scale: 0.9,
                          y: -8,
                          transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
                        }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        data-testid="library-mobile-list-item"
                        className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] flex items-center gap-3.5 transition-colors shadow-2xs"
                      >
                        {/* Left: Book Cover with realistic spine shadow */}
                      <Link
                        to={progress ? '/read/$workId/$chapterId' : '/works/$workId'}
                        params={
                          progress
                            ? { workId: workSlug, chapterId: progress.chapterId }
                            : ({ workId: workSlug } as any)
                        }
                        preload="intent"
                        className="shrink-0 w-14 sm:w-16 aspect-[3/4] rounded-sm overflow-hidden shadow-xs border border-[var(--border-subtle)] relative block"
                      >
                        <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 via-black/15 to-transparent z-10 pointer-events-none" />
                        <OptimizedImage
                          src={work.cover}
                          alt={work.title}
                          width={64}
                          height={85}
                          sizes="64px"
                          containerClassName="h-full w-full"
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      {/* Center: Story Metadata & Reading Progress */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          to="/works/$workId"
                          params={{ workId: workSlug }}
                          preload="intent"
                          className="block no-underline text-inherit"
                        >
                          <h4 className="font-serif text-sm font-bold leading-tight text-[var(--ink-primary)] line-clamp-1 hover:underline">
                            {work.title}
                          </h4>
                        </Link>

                        <p className="text-xs text-[var(--ink-muted)] truncate font-serif italic">
                          {work.authorName}
                        </p>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider">
                          <span>{work.genre}</span>
                          <span>•</span>
                          <span>{work.chaptersCount} Ch</span>
                        </div>

                        {/* In-progress bar or Completed status */}
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Finished</span>
                          </div>
                        ) : progress && percent > 0 ? (
                          <div className="space-y-1 pt-0.5 max-w-[170px]">
                            <div className="flex items-center justify-between text-[9px] font-mono text-[var(--ink-muted)]">
                              <span>Ch. {progress.chapterNumber || 1} of {work.chaptersCount || 1}</span>
                              <span>{percent}% of story</span>
                            </div>
                            <div className="w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                              <div
                                className="h-full bg-[var(--ink-primary)] rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Right: Actions (Saved Bookmark UPAR, View button NEECHE) */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5">
                        {/* Simple Naked Bookmark Icon (Saved is Black, Unsaved is White Filled, NO WRAPPER) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleBookmark(work.id)
                          }}
                          className="p-1 -mr-1 -mt-1 bg-transparent border-0 cursor-pointer transition-transform active:scale-90 hover:opacity-80 flex items-center justify-center focus:outline-none"
                          title={isSaved ? 'Remove from Saved' : 'Save to Shelf'}
                          aria-label={isSaved ? 'Remove from Saved' : 'Save to Shelf'}
                        >
                          <Bookmark
                            className={`h-4.5 w-4.5 transition-colors ${
                              isSaved ? 'fill-black text-black stroke-black' : 'fill-white text-black stroke-black'
                            }`}
                          />
                        </button>

                        {/* "View" Action Button: triggers API fetch & opens Bottom Drawer (NEECHE) */}
                        <button
                          type="button"
                          data-testid="library-mobile-view-btn"
                          onClick={() => handleOpenWorkDetail(work)}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--ink-primary)] active:scale-95 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="View story details"
                        >
                          <Eye className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                          <span>View</span>
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

              {/* =========================================================================
                  DESKTOP BOOKCASE GRID (hidden md:grid)
                  ========================================================================= */}
              <div data-testid="library-shelf-bookcase" className="hidden md:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 sm:gap-x-6 gap-y-8 sm:gap-y-9">
                <AnimatePresence mode="popLayout" initial={false}>
                  {displayedItems.map(({ work, progress, isSaved }) => {
                    const workSlug = work.slug || getWorkSlug(work as any)
                    const percent = progress ? Math.min(100, Math.max(0, Math.round(Number(progress.progressPercent || 0)))) : 0
                    const isCompleted = percent >= 100

                    return (
                      <motion.article
                        key={work.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 0.88,
                          transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
                        }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col group cursor-pointer"
                      >
                      
                      {/* Tactile Book Jacket with Spine Depth & Glare */}
                      <div className="relative aspect-[3/4] w-full rounded-sm overflow-hidden bg-[var(--bg-subtle)] shadow-[0_10px_28px_-6px_rgba(0,0,0,0.16),0_4px_10px_-2px_rgba(0,0,0,0.08)] group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.24)] transition-all duration-300 ease-out mb-3 border border-[var(--border-subtle)]">
                        
                        {/* Realistic Spine Fold & Inner-joint Illusion */}
                        <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/15 to-transparent z-10 pointer-events-none" />
                        <div className="absolute inset-y-0 left-3 w-px bg-white/20 z-10 pointer-events-none" />
                        
                        {/* Delicate paper sheen */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/15 pointer-events-none z-10" />

                        {/* Cover Image Link */}
                        <Link
                          to={progress ? '/read/$workId/$chapterId' : '/works/$workId'}
                          params={
                            progress
                              ? { workId: workSlug, chapterId: progress.chapterId }
                              : ({ workId: workSlug } as any)
                          }
                          preload="intent"
                          className="block h-full w-full no-underline"
                        >
                          <OptimizedImage
                            src={work.cover}
                            alt={work.title}
                            width={200}
                            height={267}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            containerClassName="h-full w-full"
                            className="w-full h-full object-cover select-none group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        </Link>

                        {/* Top Right: Bookmark Button with instant toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleToggleBookmark(work.id)
                          }}
                          className={`absolute top-2 right-2 h-7 w-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-20 cursor-pointer shadow-sm active:scale-90 ${
                            isSaved
                              ? 'bg-white text-black hover:bg-zinc-100 opacity-95'
                              : 'bg-black/60 text-white hover:bg-black/85 opacity-0 group-hover:opacity-100'
                          }`}
                          title={isSaved ? 'Remove from Saved' : 'Save to Shelf'}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-black text-black' : 'text-white'}`} />
                        </button>

                        {/* Bottom Overlay: Progress Bar or Completed Badge */}
                        {isCompleted ? (
                          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/85 text-emerald-200 border border-emerald-500/30 font-mono text-[9px] backdrop-blur-md">
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                            <span>Finished</span>
                          </div>
                        ) : progress && percent > 0 ? (
                          <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-2 pt-4 pointer-events-none">
                            <div className="flex items-center justify-between text-[9px] font-mono text-white/90 mb-1">
                              <span>Ch. {progress.chapterNumber || 1}</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Book Metadata */}
                      <div className="space-y-1 min-w-0">
                        <Link
                          to="/works/$workId"
                          params={{ workId: workSlug }}
                          preload="intent"
                          className="block no-underline text-inherit group-hover:underline"
                        >
                          <h4 className="font-serif text-sm sm:text-[15px] font-bold leading-tight text-[var(--ink-primary)] line-clamp-2">
                            {work.title}
                          </h4>
                        </Link>

                        <p className="text-xs text-[var(--ink-muted)] truncate font-serif italic">
                          {work.authorName}
                        </p>

                        <p className="text-[10px] font-mono text-[var(--ink-faint)] uppercase tracking-wider truncate pt-0.5">
                          {work.chaptersCount} Ch · {work.genre}
                        </p>
                      </div>
                    </motion.article>
                  )
                })}
              </AnimatePresence>
            </div>
            </>
          )}
        </section>

        {/* =========================================================================
            BOTTOM DRAWER: Book Detail Bottom Sheet
            Slides up from the bottom when mobile "View" is tapped
            ========================================================================= */}
        <Drawer
          isOpen={Boolean(selectedWorkForDrawer)}
          onClose={handleCloseDrawer}
          side="bottom"
          title={selectedWorkForDrawer?.title || 'Story Details'}
          className="max-w-2xl mx-auto"
        >
          {selectedWorkForDrawer && (
            <div data-testid="library-bottom-drawer" className="space-y-5 pb-4">
              
              {/* Drag Handle Indicator */}
              <div className="w-10 h-1 bg-[var(--border-strong)] rounded-full mx-auto -mt-1 opacity-60" />

              {/* Loading State while fetching full detail from API */}
              {isLoadingDrawer ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--ink-muted)]" />
                  <p className="font-mono text-xs text-[var(--ink-muted)]">Fetching manuscript details...</p>
                </div>
              ) : drawerError ? (
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 text-center space-y-2">
                  <p className="text-xs text-red-600 dark:text-red-300 font-sans">{drawerError}</p>
                  <button
                    type="button"
                    onClick={() => handleOpenWorkDetail(selectedWorkForDrawer)}
                    className="text-xs underline font-semibold text-red-700 dark:text-red-200"
                  >
                    Retry Fetch
                  </button>
                </div>
              ) : drawerDetail ? (
                <>
                  {/* Book Presentation: Cover + Title + Author Info */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-sm overflow-hidden shadow-md border border-[var(--border-subtle)] relative">
                      <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/35 via-black/15 to-transparent z-10 pointer-events-none" />
                      <OptimizedImage
                        src={drawerDetail.cover || selectedWorkForDrawer.cover}
                        alt={drawerDetail.title}
                        width={112}
                        height={150}
                        sizes="112px"
                        containerClassName="h-full w-full"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)] leading-tight">
                        {drawerDetail.title}
                      </h3>

                      <p className="font-serif italic text-sm text-[var(--ink-muted)]">
                        By {drawerDetail.author.name}
                      </p>

                      {/* Genre & Category Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px] font-mono uppercase text-[var(--ink-secondary)]">
                          {drawerDetail.genre}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--ink-muted)]">
                          {drawerDetail.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--ink-faint)]">
                          {drawerDetail.status}
                        </span>
                      </div>

                      {/* Quick Metrics */}
                      <p className="font-mono text-[11px] text-[var(--ink-faint)] pt-1">
                        {drawerDetail.chaptersCount} Published Chapters · {drawerDetail.readingTimeMinutes || 15} min read
                      </p>
                    </div>
                  </div>

                  {/* Reading Progress Notice (if in-progress) */}
                  {(() => {
                    const prog = readingProgress[drawerDetail.id]
                    if (!prog) return null
                    const pct = Math.min(100, Math.max(0, Math.round(Number(prog.progressPercent || 0))))
                    return (
                      <div className="p-3 rounded-xl bg-[var(--bg-subtle)]/70 border border-[var(--border-subtle)] space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-semibold text-[var(--ink-primary)]">
                            {prog.chapterTitle || `Chapter ${prog.chapterNumber}`}
                          </span>
                          <span className="text-[var(--ink-muted)]">{pct}% completed</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-canvas)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                          <div
                            className="h-full bg-[var(--ink-primary)] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Story Synopsis */}
                  <div className="space-y-1.5 pt-1">
                    <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                      Synopsis
                    </h4>
                    <div className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed bg-[var(--bg-subtle)]/40 p-3 sm:p-3.5 rounded-xl border border-[var(--border-subtle)] line-clamp-4">
                      <FormattedSynopsis text={drawerDetail.description} paragraphClassName="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed" />
                    </div>
                  </div>

                  {/* Drawer Action Buttons */}
                  <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
                    {/* Resume / Start Reading CTA */}
                    {(() => {
                      const prog = readingProgress[drawerDetail.id]
                      const targetChapterId = prog?.chapterId || drawerDetail.firstChapterId || 'ch-1'
                      const targetSlug = drawerDetail.slug || selectedWorkForDrawer.slug
                      return (
                        <Link
                          to="/read/$workId/$chapterId"
                          params={{ workId: targetSlug, chapterId: targetChapterId }}
                          preload="intent"
                          onClick={handleCloseDrawer}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm no-underline active:scale-98 transition-all hover:opacity-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{prog ? 'Resume Reading' : 'Start Reading'}</span>
                        </Link>
                      )
                    })()}

                    {/* Table of Contents Link */}
                    <Link
                      to="/works/$workId"
                      params={{ workId: drawerDetail.slug || selectedWorkForDrawer.slug }}
                      preload="intent"
                      onClick={handleCloseDrawer}
                      className="py-2.5 px-3.5 rounded-xl border border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] text-xs sm:text-sm font-medium text-[var(--ink-primary)] no-underline active:scale-98 transition-all"
                    >
                      Chapters →
                    </Link>

                    {/* Bookmark Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(drawerDetail.id)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        savedWorkIds.includes(drawerDetail.id)
                          ? 'bg-white text-black border-zinc-200 shadow-2xs hover:bg-zinc-100'
                          : 'bg-zinc-900/80 dark:bg-zinc-800/90 text-white border-zinc-700 dark:border-zinc-600 hover:bg-zinc-800'
                      }`}
                      title={savedWorkIds.includes(drawerDetail.id) ? 'Saved' : 'Save to Shelf'}
                    >
                      <Bookmark className={`w-4 h-4 ${savedWorkIds.includes(drawerDetail.id) ? 'fill-black text-black' : 'text-white'}`} />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </Drawer>

      </div>
    </div>
  )
}
