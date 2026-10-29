import { Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { getWorkSlug } from '../../data/mockData'
import { OptimizedImage } from '../OptimizedImage'
import { HomeStoryCard } from './HomeStoryCard'

export { HomeStoryCard }
import {
  Button,
  Badge,
} from '../../design-system'
import { UnisexAvatar } from '../UnisexAvatar'
import { RouteHeader } from '../RouteHeader'
import { useUser } from '@clerk/react'
import {
  BookOpen,
  Bookmark,
  Play,
  Clock,
  Compass,
  PenLine,
  Feather,
  Flame,
  Users,
  ChevronRight,
  Search,
  Star,
  Eye,
  Zap,
  Heart,
} from 'lucide-react'
import { formatViewCount, parseTotalReads } from '../../lib/utils'
import {
  getUserRecommendationSignalsServerFn,
  type UserRecommendationSignals,
} from '../../server/recommendations'
import type { UserSessionBootstrap } from '../../server/authors'
import { calculateForYouRecommendations } from '../../lib/recommendations/engine'
import { filterAndOrderNewVoicesStories } from '../../lib/recommendations/newVoices'
import { calculateBingeableReads, getWorkPublishedChapterCount } from '../../lib/recommendations/bingeable'
import { TopShelfSection } from './TopShelfSection'
import { NewVoicesOpportunityModal } from '../NewVoicesOpportunityModal'

import {
  CurrentlyReadingSkeleton,
  LoggedInHomeSkeleton,
} from './HomeSkeletons'

export { CurrentlyReadingSkeleton, LoggedInHomeSkeleton }

export interface HomeLoaderData {
  authUser: {
    userId: string | null
    isAuthenticated: boolean
  }
  initialBootstrap: UserSessionBootstrap | null
  initialRecSignals: UserRecommendationSignals | null
  initialWorks?: any[] | null
  initialTopShelf?: any[] | null
  catalogError?: boolean
}

export interface LoggedInHomeProps {
  forcedView?: string
  loaderData?: HomeLoaderData
}

function CurrentlyReadingCard({
  item,
  isWorkSaved,
  toggleSaveWork,
}: {
  item: {
    work: any
    progress: any
    currentChapter: any
  }
  isWorkSaved: (id: string) => boolean
  toggleSaveWork: (id: string) => void
}) {
  const { work, progress, currentChapter } = item
  const workSlug = getWorkSlug(work)
  const progressPercent = Math.min(100, Math.max(0, Math.round(Number(progress?.progressPercent || 0))))
  const chapterNumber = currentChapter?.number || progress?.chapterNumber || 1
  const totalChapters = work.publishedChaptersCount ?? work.chaptersCount ?? (Array.isArray(work.chapters) ? work.chapters.length : 1)
  const chapterTitle = currentChapter?.title || progress?.chapterTitle || `Chapter ${chapterNumber}`
  const chapterId = currentChapter?.id || progress?.chapterId || 'ch-1'
  const saved = isWorkSaved(work.id)

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-2xs hover:border-[var(--border-strong)] transition-all">
      <div className="flex items-stretch gap-3 sm:gap-3.5 h-full">
        {/* ── PART 1 (LEFT): Image Cover ── */}
        <Link
          to="/read/$workId/$chapterId"
          params={{ workId: workSlug, chapterId }}
          preload="intent"
          className="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shadow-xs group no-underline border border-[var(--border-subtle)] bg-[var(--bg-subtle)] shrink-0 self-start"
        >
          <img
            src={work.cover}
            alt={work.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* ── TOP-LEFT: Genre Badge ── */}
          {work.genre && (
            <span className="absolute top-1 left-1 z-10 rounded bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[8px] font-mono font-medium text-white border border-white/10 shadow-xs truncate max-w-[85%]">
              {work.genre}
            </span>
          )}

          {/* ── BOTTOM-RIGHT: Status Badge ── */}
          {(work.status || work.publicationStatus) && (
            <span className="absolute bottom-1 right-1 z-10 inline-flex items-center rounded bg-black/85 backdrop-blur-xs px-1.5 py-0.5 text-[7.5px] font-mono font-semibold text-white uppercase tracking-wider border border-white/10 shadow-xs">
              <span>{work.status || work.publicationStatus || 'Ongoing'}</span>
            </span>
          )}
        </Link>

        {/* ── PART 2 (RIGHT): All Details Vertically Aligned in One Flow ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-2">
          {/* Top Info */}
          <div className="space-y-1">
            {/* Category Badge + Author */}
            <div className="flex items-center gap-1.5 text-[10.5px]">
              {work.category && (
                <Badge variant="subtle" size="sm" className="text-[10px] px-1.5 py-0">
                  {work.category}
                </Badge>
              )}
              <span className="text-[var(--ink-muted)] font-serif text-[11px] truncate">
                by <strong className="text-[var(--ink-primary)] font-medium">{work.author?.name}</strong>
              </span>
            </div>

            {/* Story Title */}
            <Link
              to="/works/$workId"
              params={{ workId: workSlug }}
              className="block no-underline text-inherit group"
            >
              <h4 className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)] tracking-tight truncate group-hover:underline">
                {work.title}
              </h4>
            </Link>

            {/* Chapter Location & Whole-Story Progress */}
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
                <span
                  className="font-medium text-[var(--ink-secondary)] truncate max-w-[130px] sm:max-w-[160px]"
                  title={`Chapter ${chapterNumber} of ${totalChapters}: ${chapterTitle}`}
                >
                  Ch. {chapterNumber} of {totalChapters} <span className="opacity-75 font-normal">({chapterTitle})</span>
                </span>
                <span className="shrink-0 font-semibold text-[var(--ink-primary)]">
                  {progressPercent}% of story
                </span>
              </div>

              <div className="w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Row inside Details Column */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: workSlug, chapterId }}
              preload="intent"
              className="no-underline flex-1 min-w-0"
            >
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 h-7.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer truncate"
              >
                <Play className="h-2.5 w-2.5 fill-current shrink-0" />
                <span className="truncate">Resume Ch. {chapterNumber}</span>
              </button>
            </Link>

            <button
              type="button"
              onClick={() => toggleSaveWork(work.id)}
              className={`h-7.5 w-7.5 inline-flex items-center justify-center rounded-lg border text-xs transition-colors cursor-pointer shrink-0 ${
                saved
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
              title={saved ? 'Saved in library' : 'Save to library'}
              aria-label="Bookmark story"
            >
              <Bookmark className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   LOGGED IN HOME PAGE — Personalized Reader Dashboard & Shelf Experience
   ========================================================================== */
export default function LoggedInHome({ forcedView, loaderData }: LoggedInHomeProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const effectiveUserId = user?.id || loaderData?.authUser?.userId || null
  const {
    allWorks,
    isWorksLoading,
    worksError,
    reloadWorksFromDb,
    readingProgress: contextReadingProgress,
    isReadingProgressLoading,
    savedWorkIds,
    toggleSaveWork,
    isWorkSaved,
    writerWorks,
    isOwnWork,
  } = useApp()

  // Merge initialWorks from loaderData if available to ensure instant DB stories hydration
  const works = useMemo(() => {
    if (loaderData?.initialWorks && Array.isArray(loaderData.initialWorks) && loaderData.initialWorks.length > 0) {
      const mergedMap = new Map<string, any>()
      for (const w of loaderData.initialWorks) mergedMap.set(w.id, w)
      for (const w of allWorks) {
        if (!mergedMap.has(w.id)) mergedMap.set(w.id, w)
      }
      return Array.from(mergedMap.values())
    }
    return allWorks
  }, [allWorks, loaderData?.initialWorks])

  const hasRetriedCatalogRef = useRef(false)
  const isCatalogError =
    works.length === 0 &&
    !isWorksLoading &&
    (worksError || (Boolean((loaderData as any)?.catalogError) && !hasRetriedCatalogRef.current))

  const handleRetryCatalog = useCallback(async () => {
    hasRetriedCatalogRef.current = true
    await reloadWorksFromDb()
  }, [reloadWorksFromDb])

  // Optimization 2: Pre-hydrate reading progress from server loaderData if context is still bootstrapping
  const readingProgress = useMemo(() => {
    if (Object.keys(contextReadingProgress).length > 0) {
      return contextReadingProgress
    }
    const preloaded = loaderData?.initialBootstrap?.readingProgress
    if (Array.isArray(preloaded) && preloaded.length > 0) {
      const normalized: Record<string, any> = {}
      for (const item of preloaded) {
        if (!item.work_id || isOwnWork(item.work_id)) continue
        const matchedWork = works.find((w) => w.id === item.work_id)
        const matchedChapter = matchedWork?.chapters?.find((c) => c.id === item.chapter_id)
        const chNum = (item as any).chapter_number || matchedChapter?.number || 1
        const chTitle = (item as any).chapter_title || matchedChapter?.title || `Chapter ${chNum}`
        normalized[item.work_id] = {
          workId: item.work_id,
          chapterId: item.chapter_id || matchedWork?.chapters?.[0]?.id || 'ch-1',
          chapterNumber: chNum,
          chapterTitle: chTitle,
          progressPercent: Math.min(100, Math.max(0, Math.round(Number(item.progress_percent || 0)))),
          lastReadAt: item.last_read_at || new Date().toISOString(),
        }
      }
      return normalized
    }
    return contextReadingProgress
  }, [contextReadingProgress, loaderData?.initialBootstrap?.readingProgress, works, isOwnWork])

  // 15-minute TTL for cached recommendation signals to prevent multi-tab/stale profile recommendations
  const REC_SIGNALS_TTL_MS = 15 * 60 * 1000

  // Optimization 2: Initialize recommendation signals with user-scoped isolation & TTL validation
  const [recommendationSignals, setRecommendationSignals] = useState<UserRecommendationSignals | null>(() => {
    if (loaderData?.initialRecSignals) {
      if (!effectiveUserId || loaderData.initialRecSignals.clerkUserId === effectiveUserId) {
        return loaderData.initialRecSignals
      }
    }
    if (typeof window !== 'undefined' && effectiveUserId) {
      try {
        const cachedRaw =
          sessionStorage.getItem(`hatchpen_cached_rec_signals_${effectiveUserId}`) ||
          sessionStorage.getItem('hatchpen_cached_rec_signals')
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw)
          const cachedAt = Number(cached?._cachedAt || 0)
          const isExpired = cachedAt > 0 && Date.now() - cachedAt > REC_SIGNALS_TTL_MS
          // Strictly accept cached signals only when valid, unexpired, and cached.clerkUserId === effectiveUserId
          if (!isExpired && cached && cached.clerkUserId === effectiveUserId) {
            return cached
          }
        }
      } catch {
        return null
      }
    }
    return null
  })

  const [isLoadingSignals, setIsLoadingSignals] = useState<boolean>(() => {
    if (
      loaderData?.initialRecSignals &&
      (!effectiveUserId || loaderData.initialRecSignals.clerkUserId === effectiveUserId)
    ) {
      return false
    }
    if (typeof window !== 'undefined' && effectiveUserId) {
      try {
        const cachedRaw =
          sessionStorage.getItem(`hatchpen_cached_rec_signals_${effectiveUserId}`) ||
          sessionStorage.getItem('hatchpen_cached_rec_signals')
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw)
          const cachedAt = Number(cached?._cachedAt || 0)
          const isExpired = cachedAt > 0 && Date.now() - cachedAt > REC_SIGNALS_TTL_MS
          if (!isExpired && cached && cached.clerkUserId === effectiveUserId) {
            return false
          }
        }
      } catch {
        return true
      }
    }
    return !isUserLoaded || Boolean(effectiveUserId)
  })

  const [signalsError, setSignalsError] = useState<boolean>(false)

  const forYouCarouselRef = useRef<HTMLDivElement>(null)
  const bingeableCarouselRef = useRef<HTMLDivElement>(null)
  const recRequestIdRef = useRef<number>(0)

  useEffect(() => {
    const currentUserId = effectiveUserId
    const requestId = ++recRequestIdRef.current
    setSignalsError(false)

    // While Clerk client auth is still hydrating and we have no server ID, keep loading
    if (!isUserLoaded && !currentUserId) {
      setIsLoadingSignals(true)
      return
    }

    // If loaderData already supplied recommendation signals for this exact user, adopt without redundant fetch
    if (
      loaderData?.initialRecSignals &&
      (!currentUserId || loaderData.initialRecSignals.clerkUserId === currentUserId)
    ) {
      setRecommendationSignals(loaderData.initialRecSignals)
      setIsLoadingSignals(false)
      return
    }

    if (!currentUserId) {
      setRecommendationSignals(null)
      setIsLoadingSignals(false)
      return
    }

    // On account switch or initial mount without loader data, check user-scoped cache immediately
    let initialSignalsForUser: UserRecommendationSignals | null = null
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw =
          sessionStorage.getItem(`hatchpen_cached_rec_signals_${currentUserId}`) ||
          sessionStorage.getItem('hatchpen_cached_rec_signals')
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw)
          if (cached && cached.clerkUserId === currentUserId) {
            initialSignalsForUser = cached
          }
        }
      } catch {}
    }

    setRecommendationSignals(initialSignalsForUser)
    setIsLoadingSignals(!initialSignalsForUser)

    let isMounted = true

    getUserRecommendationSignalsServerFn()
      .then((signals) => {
        // Discard stale responses if a newer request sequence started, component unmounted, or user switched
        if (!isMounted || requestId !== recRequestIdRef.current) return
        setRecommendationSignals(signals)
        setIsLoadingSignals(false)
        setSignalsError(false)
        if (signals && typeof window !== 'undefined') {
          try {
            // Confirm signals match currentUserId before writing to storage
            if (signals.clerkUserId && signals.clerkUserId !== currentUserId) {
              return
            }
            const payload = JSON.stringify({ ...signals, _cachedAt: Date.now() })
            sessionStorage.setItem('hatchpen_cached_rec_signals', payload)
            sessionStorage.setItem(`hatchpen_cached_rec_signals_${currentUserId}`, payload)
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[ForYou] Failed to load recommendation signals:', err?.message || err)
        if (isMounted && requestId === recRequestIdRef.current) {
          setIsLoadingSignals(false)
          setSignalsError(true)
        }
      })

    return () => {
      isMounted = false
    }
  }, [effectiveUserId, isUserLoaded, loaderData?.initialRecSignals])

  // Retry fetching recommendation signals after failure
  const handleRetrySignals = useCallback(() => {
    const currentUserId = effectiveUserId
    if (!currentUserId) return
    const requestId = ++recRequestIdRef.current
    setIsLoadingSignals(true)
    setSignalsError(false)

    getUserRecommendationSignalsServerFn()
      .then((signals) => {
        if (requestId !== recRequestIdRef.current) return
        setRecommendationSignals(signals)
        setIsLoadingSignals(false)
        setSignalsError(false)
        if (signals && typeof window !== 'undefined') {
          try {
            if (signals.clerkUserId && signals.clerkUserId !== currentUserId) return
            const payload = JSON.stringify({ ...signals, _cachedAt: Date.now() })
            sessionStorage.setItem('hatchpen_cached_rec_signals', payload)
            sessionStorage.setItem(`hatchpen_cached_rec_signals_${currentUserId}`, payload)
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[ForYou] Failed to retry recommendation signals:', err?.message || err)
        if (requestId === recRequestIdRef.current) {
          setIsLoadingSignals(false)
          setSignalsError(true)
        }
      })
  }, [effectiveUserId])

  // Listen to onboarding completion to immediately refresh recommendation signals with newly selected preferences
  useEffect(() => {
    let isMounted = true
    const handleOnboardingComplete = () => {
      const currentUserId = effectiveUserId
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('hatchpen_cached_rec_signals')
          if (currentUserId) {
            sessionStorage.removeItem(`hatchpen_cached_rec_signals_${currentUserId}`)
          }
        } catch {}
      }
      const requestId = ++recRequestIdRef.current
      setIsLoadingSignals(true)

      getUserRecommendationSignalsServerFn()
        .then((signals) => {
          if (!isMounted || requestId !== recRequestIdRef.current) return
          setRecommendationSignals(signals)
          setIsLoadingSignals(false)
          if (signals && typeof window !== 'undefined') {
            try {
              if (signals.clerkUserId && currentUserId && signals.clerkUserId !== currentUserId) {
                return
              }
              const payload = JSON.stringify({ ...signals, _cachedAt: Date.now() })
              sessionStorage.setItem('hatchpen_cached_rec_signals', payload)
              if (currentUserId) {
                sessionStorage.setItem(`hatchpen_cached_rec_signals_${currentUserId}`, payload)
              }
            } catch {}
          }
        })
        .catch((err) => {
          console.warn('[ForYou] Failed to refresh recommendation signals after onboarding:', err?.message || err)
          if (isMounted && requestId === recRequestIdRef.current) {
            setIsLoadingSignals(false)
          }
        })
    }

    window.addEventListener('hatchpen:onboarding-completed', handleOnboardingComplete)
    return () => {
      isMounted = false
      window.removeEventListener('hatchpen:onboarding-completed', handleOnboardingComplete)
    }
  }, [effectiveUserId])

  // Listen for cross-tab reading progress updates to invalidate stale cached signals and re-fetch recommendations
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'hatchpen_last_read_sync' && effectiveUserId) {
        try {
          sessionStorage.removeItem('hatchpen_cached_rec_signals')
          sessionStorage.removeItem(`hatchpen_cached_rec_signals_${effectiveUserId}`)
        } catch {}
        handleRetrySignals()
      }
    }

    window.addEventListener('storage', handleStorageEvent)
    return () => {
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [effectiveUserId, handleRetrySignals])

  const mergedBookmarkedWorkIds = useMemo(() => {
    const set = new Set<string>()
    for (const id of savedWorkIds) set.add(id)
    for (const id of (recommendationSignals?.bookmarkedWorkIds || [])) set.add(id)
    return Array.from(set)
  }, [savedWorkIds, recommendationSignals?.bookmarkedWorkIds])

  const forYouRecommendations = useMemo(() => {
    const candidateWorks = works.filter((w) => !isOwnWork(w.id))
    if (candidateWorks.length === 0) return []

    // For authenticated users (or while auth is hydrating): strictly enforce personalized recommendations
    if (effectiveUserId || !isUserLoaded) {
      // While signals or user auth are loading, failed, or not yet available, return empty array to prevent unrelated fallback
      if (!isUserLoaded || isLoadingSignals || signalsError || !recommendationSignals) {
        return []
      }

      return calculateForYouRecommendations({
        candidateWorks,
        readingHistory: recommendationSignals.readingHistory || [],
        userPreferences: recommendationSignals.preferences || null,
        bookmarkedWorkIds: mergedBookmarkedWorkIds,
        excludeBookmarked: false,
        currentUserId: effectiveUserId,
        currentUserProfileId: recommendationSignals.profileId,
      })
    }

    // For unauthenticated visitors or guest mode without user profile, provide general non-personalized discovery
    return calculateForYouRecommendations({
      candidateWorks,
      readingHistory: [],
      userPreferences: null,
      bookmarkedWorkIds: mergedBookmarkedWorkIds,
      excludeBookmarked: false,
    })
  }, [
    works,
    recommendationSignals,
    mergedBookmarkedWorkIds,
    effectiveUserId,
    isUserLoaded,
    isOwnWork,
    isLoadingSignals,
    signalsError,
  ])

  // Dedicated New Voices: original qualifying stories from writers in first 5 calendar months
  // Strictly excludes <= 2 chapters bingeable reads per platform rule
  const newVoicesWorks = useMemo(() => {
    return filterAndOrderNewVoicesStories(works, effectiveUserId, new Date(), { excludeBingeable: true })
  }, [works, effectiveUserId])

  // Dedicated Bingeable Reads: Single-sitting complete reads (<= 2 published chapters)
  const bingeableWorks = useMemo(() => {
    const candidateWorks = works.filter((w) => !isOwnWork(w.id))
    return calculateBingeableReads({
      candidateWorks,
      readingHistory: recommendationSignals?.readingHistory || [],
      userPreferences: recommendationSignals?.preferences || null,
      currentUserId: effectiveUserId,
      currentUserProfileId: recommendationSignals?.profileId,
    })
  }, [works, recommendationSignals, effectiveUserId, isOwnWork])

  // Books currently in-progress (sorted by most recently read)
  const inProgressList = useMemo(() => {
    return Object.values(readingProgress)
      .sort((a, b) => {
        const timeA = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0
        const timeB = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0
        return timeB - timeA
      })
      .map((prog) => {
        const work = works.find((w) => w.id === prog.workId)
        if (!work || isOwnWork(work.id)) return null
        const currentChapter =
          work.chapters?.find((c) => c.id === prog.chapterId) ||
          work.chapters?.find((c) => c.number === prog.chapterNumber) ||
          (prog.chapterId
            ? ({
                id: prog.chapterId,
                number: prog.chapterNumber || 1,
                title: prog.chapterTitle || `Chapter ${prog.chapterNumber || 1}`,
              } as any)
            : work.chapters?.[0])
        return { work, progress: prog, currentChapter }
      })
      .filter(Boolean) as {
        work: (typeof works)[0]
        progress: (typeof readingProgress)[string]
        currentChapter: (typeof works)[0]['chapters'][0] | undefined
      }
  }, [works, readingProgress, isOwnWork])

  const hasReadingHistory = inProgressList.length > 0
  const desktopReadingList = useMemo(() => inProgressList.slice(0, 3), [inProgressList])

  // If server preloaded bootstrap is available, user session is already resolved
  const hasPreloadedBootstrap = Boolean(loaderData?.initialBootstrap)
  const isResolvingReadingSession =
    !isUserLoaded ||
    (isReadingProgressLoading && !hasPreloadedBootstrap) ||
    (Object.keys(readingProgress).length > 0 && inProgressList.length === 0)

  // Saved manuscripts from shelf
  const savedWorks = useMemo(() => {
    return works.filter((w) => savedWorkIds.includes(w.id))
  }, [works, savedWorkIds])

  const [activeLeaderboardGenre, setActiveLeaderboardGenre] = useState<string>('all')

  // Trending & community ranked serials (Trending V1: canonical weekly snapshot, up to 10 stories)
  const trendingSerials = useMemo(() => {
    let list = works.filter((w) => Boolean(w.trending))
    // Deterministic ordering by canonical weekly snapshot rank
    list.sort((a, b) => ((a as any).trendingRank ?? 999) - ((b as any).trendingRank ?? 999))
    if (activeLeaderboardGenre !== 'all') {
      list = list.filter((w) => {
        const primary = (w.genre || '').toLowerCase()
        const secondary = Array.isArray(w.genres) ? w.genres.map((g) => (g.name || g.slug || '').toLowerCase()) : []
        const target = activeLeaderboardGenre.toLowerCase()
        return primary.includes(target) || secondary.some((g) => g.includes(target))
      })
    }
    return list.slice(0, 10)
  }, [works, activeLeaderboardGenre])

  // Writer atelier adaptive states
  const isAuthor = writerWorks && writerWorks.length > 0
  const activeDraft = isAuthor ? writerWorks[0] : null

  // Only show localized dashboard skeleton if user is still loading AND works data is completely empty
  if (!isUserLoaded && !forcedView && (!allWorks || allWorks.length === 0)) {
    return <LoggedInHomeSkeleton />
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Consistent Route Header with + New button */}
      <RouteHeader
        title="Home"
        subtitle="Stories curated for your day"
      />

      <div className="logged-in-home-container px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-3 sm:pt-6 space-y-3 sm:space-y-5">
        {/* 5-Month In-App Opportunity Modal */}
        <NewVoicesOpportunityModal />

      {/* =========================================================================
          SECTION 2: CURRENTLY READING (MOBILE SLIDES & DESKTOP MAX-3 GRID)
          ========================================================================= */}
      {hasReadingHistory ? (
        <section id="active-novel" className="w-full space-y-2.5">
          {/* Section Header: Title + View all redirecting to Library > Reading tab */}
          <div className="flex items-center justify-between pb-0.5">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)] tracking-tight">
                Currently Reading
              </span>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                ({inProgressList.length})
              </span>
            </div>

            <Link
              to="/library"
              search={{ tab: 'reading' }}
              className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
            >
              <span>View all</span>
              <span className="hidden sm:inline">({inProgressList.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ── MOBILE SCREENS: Horizontal Slides (No Dropdown Switcher) ── */}
          <div className="block md:hidden">
            {inProgressList.length === 1 ? (
              <CurrentlyReadingCard
                item={inProgressList[0]}
                isWorkSaved={isWorkSaved}
                toggleSaveWork={toggleSaveWork}
              />
            ) : (
              <div className="space-y-1.5">
                <div
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-3 px-3"
                  style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
                >
                  {inProgressList.map((item) => (
                    <div
                      key={item.work.id}
                      className="snap-start shrink-0 w-[84vw] max-w-[340px]"
                    >
                      <CurrentlyReadingCard
                        item={item}
                        isWorkSaved={isWorkSaved}
                        toggleSaveWork={toggleSaveWork}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── DESKTOP SCREENS: Max 3 Cards Grid ── */}
          <div className="hidden md:block">
            <div
              className={`grid gap-3.5 ${
                desktopReadingList.length === 1
                  ? 'grid-cols-1 max-w-xl'
                  : desktopReadingList.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
              }`}
            >
              {desktopReadingList.map((item) => (
                <CurrentlyReadingCard
                  key={item.work.id}
                  item={item}
                  isWorkSaved={isWorkSaved}
                  toggleSaveWork={toggleSaveWork}
                />
              ))}
            </div>
          </div>
        </section>
      ) : isResolvingReadingSession ? (
        <CurrentlyReadingSkeleton />
      ) : (
        /* Compact First-Time Reader Onboarding Banner */
        <section id="active-novel" className="w-full">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 text-[var(--ink-primary)]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] tracking-tight">
                      Read Your First Story
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider hidden sm:inline-block">
                      • Empty Shelf
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[var(--ink-secondary)]">
                    Explore original serials below. When you open any chapter, your progress and reading session will appear here.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Link
                  to="/discover"
                  className="no-underline"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Compass className="h-3.5 w-3.5 shrink-0" />}
                  >
                    Browse Stories
                  </Button>
                </Link>

                <a
                  href="#trending-serials"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-mono text-[11px] font-medium cursor-pointer shadow-2xs transition-colors no-underline"
                >
                  <Flame className="h-3 w-3 text-amber-500" />
                  <span>Trending ↓</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION: FOR YOU RECOMMENDATIONS (PERSONALIZED ADAPTIVE DISCOVERY)
          ========================================================================= */}
      <section id="for-you" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              Recommended For You
            </h3>
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              Personalized based on your reading sessions and literary interests.
            </p>
          </div>
        </div>

        {forYouRecommendations.length > 0 ? (
          <div
            ref={forYouCarouselRef}
            className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {forYouRecommendations.map(({ work }) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              return (
                <div
                  key={work.id}
                  style={{ scrollSnapAlign: 'start' }}
                  className="w-[145px] sm:w-[160px] md:w-[170px] shrink-0 flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group"
                >
                  {/* Cover with badge */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      preload="intent"
                      className="block w-full h-full no-underline"
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={200}
                        height={300}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* ── TOP-LEFT: Genre Badge ── */}
                    {work.genre && (
                      <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 dark:bg-black/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-white tracking-wide border border-white/15 shadow-xs">
                        {work.genre}
                      </span>
                    )}

                    {/* ── TOP-RIGHT: Bookmark Pill Button ── */}
                    <button
                      type="button"
                      onClick={() => toggleSaveWork(work.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                      title={saved ? 'Remove Bookmark' : 'Save to Shelf'}
                    >
                      <Bookmark className={`h-3 w-3 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* ── BOTTOM-LEFT: Chapter count ── */}
                    <div className="absolute bottom-2 left-2 z-10 bg-black/75 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded backdrop-blur-2xs border border-white/10">
                      {work.publishedChaptersCount ?? work.chaptersCount ?? 0} Ch
                    </div>

                    {/* ── BOTTOM-RIGHT: Status Badge (Ongoing, Completed, etc.) ── */}
                    {(work.status || work.publicationStatus) && (
                      <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-md bg-black/80 dark:bg-black/90 backdrop-blur-md px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
                        <span>{work.status || work.publicationStatus || 'Ongoing'}</span>
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <Link
                        to="/works/$workId"
                        params={{ workId: wSlug }}
                        preload="intent"
                        className="block no-underline text-inherit group-hover:underline"
                      >
                        <h4 className="font-serif text-xs sm:text-[13px] font-bold text-[var(--ink-primary)] leading-tight line-clamp-1">
                          {work.title}
                        </h4>
                      </Link>

                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
                        <span className="truncate">{work.author.name}</span>
                        <span className="shrink-0 text-[9px] text-[var(--ink-faint)]">
                          {work.category}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[9px] text-[var(--ink-faint)]">
                        {formatViewCount(work.totalReads, true)} reads
                      </span>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        preload="intent"
                        className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : !isUserLoaded || isLoadingSignals || (isWorksLoading && works.length === 0) ? (
          <div className="flex items-stretch gap-3 sm:gap-3.5 overflow-hidden py-1">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`foryou-skeleton-${idx}`}
                className="w-[145px] sm:w-[160px] md:w-[170px] aspect-[2/3] shrink-0 rounded-xl bg-[var(--bg-subtle)] animate-pulse border border-[var(--border-subtle)]"
              />
            ))}
          </div>
        ) : signalsError ? (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6 sm:p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--ink-muted)]">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                Unable to load recommendations
              </h4>
              <p className="font-serif text-xs text-[var(--ink-secondary)] leading-relaxed">
                We encountered an issue retrieving your personalized taste profile. Please try refreshing.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetrySignals}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 font-mono text-xs font-medium transition-opacity cursor-pointer border-none"
              >
                <span>Retry</span>
              </button>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] font-mono text-xs font-medium text-[var(--ink-primary)] transition-colors no-underline"
              >
                <span>Browse Full Catalog →</span>
              </Link>
            </div>
          </div>
        ) : isCatalogError ? (
          <div className="rounded-xl border border-dashed border-red-500/30 bg-[var(--bg-surface)]/60 p-6 sm:p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                Unable to load story catalog
              </h4>
              <p className="font-serif text-xs text-[var(--ink-secondary)] leading-relaxed">
                We encountered an issue connecting to the story library. Please check your connection and try refreshing.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetryCatalog}
                disabled={isWorksLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 font-mono text-xs font-medium transition-opacity cursor-pointer border-none disabled:opacity-50"
              >
                <span>{isWorksLoading ? 'Retrying...' : 'Retry'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6 sm:p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--ink-muted)]">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                {works.length === 0
                  ? 'No stories in the library yet'
                  : recommendationSignals?.preferences?.genres?.length || recommendationSignals?.preferences?.categories?.length
                    ? 'No stories match your taste yet'
                    : 'No recommendations available at the moment'}
              </h4>
              <p className="font-serif text-xs text-[var(--ink-secondary)] leading-relaxed">
                {works.length === 0
                  ? 'The story catalog is currently empty. Check back soon for newly published stories.'
                  : recommendationSignals?.preferences?.genres?.length || recommendationSignals?.preferences?.categories?.length
                    ? "We couldn't find published stories matching your selected genres or categories. Explore the full catalogue or update your preferences to discover more."
                    : 'All eligible candidates have either been saved or completed.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] font-mono text-xs font-medium text-[var(--ink-primary)] transition-colors no-underline"
              >
                <span>Edit Taste Profile</span>
              </Link>
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 font-mono text-xs font-medium transition-opacity no-underline"
              >
                <span>Browse Full Catalog →</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION: NEW VOICES (AUTHENTICATED FIVE-MONTH DISCOVERY SHOWCASE)
          ========================================================================= */}
      <section id="new-voices" className="w-full space-y-5" style={{ contentVisibility: 'auto', containIntrinsicSize: '650px' }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              New Voices Showcase
            </h3>
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              Fresh original stories published by writers in their first five calendar months on Hatchpen.
            </p>
          </div>

          <Link
            to="/write"
            preload="intent"
            className="font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1 no-underline"
          >
            <span>Start Your Story</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {newVoicesWorks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {newVoicesWorks.map((work) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              const pubDate = work.publishedAt
              return (
                <div
                  key={work.id}
                  className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Cover with badge */}
                  <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-subtle)]">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      preload="intent"
                      className="block w-full h-full no-underline"
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={260}
                        height={390}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* ── TOP-LEFT: Genre Badge ── */}
                    {work.genre && (
                      <span className="absolute top-2.5 left-2.5 z-10 rounded-md bg-black/75 dark:bg-black/85 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-medium text-white tracking-wide border border-white/15 shadow-xs">
                        {work.genre}
                      </span>
                    )}

                    {/* ── TOP-RIGHT: Bookmark Pill Button ── */}
                    <button
                      type="button"
                      onClick={() => toggleSaveWork(work.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                      title={saved ? 'Remove Bookmark' : 'Save to Shelf'}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* ── BOTTOM-LEFT: Chapter count ── */}
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-2xs border border-white/10">
                      {work.publishedChaptersCount ?? work.chaptersCount} Ch
                    </div>

                    {/* ── BOTTOM-RIGHT: Status Badge (Ongoing, Completed, etc.) ── */}
                    {(work.status || work.publicationStatus) && (
                      <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded-md bg-black/80 dark:bg-black/90 backdrop-blur-md px-1.5 sm:px-2 py-0.5 text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
                        <span>{work.status || work.publicationStatus || 'Ongoing'}</span>
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <Link
                        to="/works/$workId"
                        params={{ workId: wSlug }}
                        preload="intent"
                        className="block no-underline text-inherit group-hover:underline"
                      >
                        <h4 className="font-serif text-sm font-bold text-[var(--ink-primary)] leading-snug line-clamp-1">
                          {work.title}
                        </h4>
                      </Link>

                      <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
                        <span className="truncate">{work.author.name}</span>
                        <span className="shrink-0 text-[10px] text-[var(--ink-faint)]">
                          {work.category}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[var(--ink-faint)] truncate">
                        {pubDate ? new Date(pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Debut'}
                      </span>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        preload="intent"
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read Ch 1 →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-8 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-black dark:text-white flex items-center justify-center">
              <Feather className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                No Debuts Currently Active
              </h4>
              <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] max-w-lg mx-auto">
                Writers in their first five calendar months on Hatchpen can publish original manuscripts to be showcased here. Ready to release your first chapter?
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/write"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-mono text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
              >
                <PenLine className="h-3.5 w-3.5" />
                <span>Draft a Story in Studio</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: TRENDING & COMMUNITY RANKINGS (LEADERBOARDS BENTO GRID)
          ========================================================================= */}
      <section id="trending-serials" className="w-full space-y-5" style={{ contentVisibility: 'auto', containIntrinsicSize: '650px' }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              Trending Serials Today
            </h3>
          </div>

          {/* Genre Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs">
            {[
              { id: 'all', label: 'All Genres' },
              { id: 'romance', label: 'Romance' },
              { id: 'speculative', label: 'Speculative' },
              { id: 'historical', label: 'Historical' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLeaderboardGenre(tab.id)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs font-mono ${
                  activeLeaderboardGenre === tab.id
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                    : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Bento Grid: Up to 10 Rich Serials */}
        {trendingSerials.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <p className="font-serif text-base text-[var(--ink-secondary)]">
              No stories trending this week yet. Fresh rankings update every Monday.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingSerials.map((work, idx) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              return (
                <div
                  key={work.id}
                  className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Visual Cover Header */}
                  <div className="relative h-60 sm:h-64 overflow-hidden bg-[var(--bg-subtle)]">
                    <img
                      src={work.cover}
                      alt={work.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                    {/* Rank & Genre Pill (Top-Left) */}
                    <div className="absolute top-3 left-3 bg-black/75 text-white backdrop-blur-md px-2.5 py-1 rounded font-mono text-[11px] uppercase tracking-wider flex items-center gap-1 border border-white/20 shadow-xs z-10">
                      <span className="font-bold text-amber-400">#{(work as any).trendingRank ?? (idx + 1)}</span>
                      <span>in {work.genre}</span>
                    </div>

                    {/* Bookmark Button (Top-Right) */}
                    <button
                      type="button"
                      onClick={() => toggleSaveWork(work.id)}
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                      title={saved ? 'Remove Bookmark' : 'Save to Library'}
                    >
                      <Bookmark className={`h-4 w-4 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Status Badge (Bottom-Right) */}
                    {(work.status || (work as any).publicationStatus) && (
                      <span className="absolute bottom-3 right-4 z-10 inline-flex items-center rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
                        <span>{work.status || (work as any).publicationStatus || 'Ongoing'}</span>
                      </span>
                    )}

                    {/* Title & Season Info */}
                    <div className="absolute bottom-3 left-4 right-28 text-white">
                      <span className="font-mono text-[10px] tracking-wider uppercase text-white/80">
                        Season 1 • {work.publishedChaptersCount ?? work.chaptersCount} Chapters
                      </span>
                      <h4 className="font-serif text-lg font-bold text-white leading-snug line-clamp-1 mt-0.5">
                        {work.title}
                      </h4>
                    </div>
                  </div>

                  {/* Card Content & Metrics */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                      {work.synopsis}
                    </p>

                    <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                      {/* Metrics Bar */}
                      <div className="flex items-center justify-between text-[var(--ink-muted)] font-mono text-[11px] bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-[var(--ink-faint)]" />
                          {formatViewCount(work.totalReads, true)} Reads
                        </span>
                        {work.totalSaves > 0 ? (
                          <span className="flex items-center gap-1" title={`${formatViewCount(work.totalSaves, false)} Saves`}>
                            <Bookmark className="h-3 w-3 text-red-500" />
                            {formatViewCount(work.totalSaves, true)} Saves
                          </span>
                        ) : null}
                      </div>

                      {/* Author & Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                          <UnisexAvatar
                            src={work.author.avatar}
                            name={work.author.name}
                            size="sm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-mono text-xs text-[var(--ink-primary)] font-medium">
                          {work.author.name}
                        </span>
                      </div>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        preload="intent"
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read Part 1 →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </section>

      {/* =========================================================================
          SECTION: BINGEABLE READS FOR YOU (SINGLE-SITTING COMPLETE & 2-CHAPTER ARCS)
          ========================================================================= */}
      {bingeableWorks.length > 0 && (
        <section id="bingeable-reads" className="w-full space-y-4" style={{ contentVisibility: 'auto', containIntrinsicSize: '550px' }}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div className="space-y-1">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
                Bingeable Reads for You
              </h3>
              <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
                Quick, complete stories and two-chapter arcs you can finish in one sitting.
              </p>
            </div>
          </div>

          <div
            ref={bingeableCarouselRef}
            className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {bingeableWorks.map((work) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              const chCount = getWorkPublishedChapterCount(work)

              return (
                <div
                  key={work.id}
                  style={{ scrollSnapAlign: 'start' }}
                  className="w-[145px] sm:w-[160px] md:w-[170px] shrink-0 flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group"
                >
                  {/* Cover with badge */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      preload="intent"
                      className="block w-full h-full no-underline"
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={170}
                        height={255}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* Quick read chapter badge */}
                    <span className="absolute top-2 left-2 z-10 rounded bg-black/80 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-mono font-semibold text-amber-400 border border-amber-400/20 shadow-xs flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5 fill-current" />
                      <span>{chCount === 1 ? '1 Chapter' : '2 Chapters'}</span>
                    </span>

                    {/* Bookmark Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleSaveWork(work.id)
                      }}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white/90 hover:text-white backdrop-blur-xs transition cursor-pointer"
                      title={saved ? 'Remove from Saved' : 'Save to Shelf'}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current text-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                    <div className="space-y-1">
                      <Link
                        to="/works/$workId"
                        params={{ workId: wSlug }}
                        preload="intent"
                        className="font-serif text-xs sm:text-sm font-bold text-[var(--ink-primary)] line-clamp-1 group-hover:underline no-underline block"
                      >
                        {work.title}
                      </Link>
                      <p className="font-mono text-[10px] sm:text-[11px] text-[var(--ink-muted)] truncate">
                        {work.author?.name || 'Unknown Author'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono text-[var(--ink-muted)]">
                      <span className="truncate">{work.genre || 'Fiction'}</span>
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                        {work.status === 'Completed' ? 'Complete' : 'Quick Arc'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION: TOP SHELF (COMMUNITY'S TOP 10 MOST-SAVED MASTERPIECES)
          ========================================================================= */}
      <TopShelfSection
        works={works}
        initialTopShelfWorks={loaderData?.initialTopShelf || undefined}
        currentUserId={effectiveUserId}
        currentUserProfileId={recommendationSignals?.profileId}
      />

      {/* =========================================================================
          SECTION 4: READING SHELF
          ========================================================================= */}
      <section id="saved-shelf" className="w-full space-y-5" style={{ contentVisibility: 'auto', containIntrinsicSize: '450px' }}>
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Your Reading Shelf
            </h3>
          </div>

          <Link
            to="/library"
            preload="intent"
            className="font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1 no-underline"
          >
            <span>Open Full Atelier Library</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Dynamic & Aesthetic Reading Shelf Grid */}
        {savedWorks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {savedWorks.map((work) => {
              const wSlug = getWorkSlug(work)
              return (
                <Link
                  key={work.id}
                  to="/works/$workId"
                  params={{ workId: wSlug }}
                  preload="intent"
                  className="group block cursor-pointer no-underline text-inherit"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xs group-hover:shadow-md transition-all duration-300 mb-2 border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <OptimizedImage
                      src={work.cover}
                      alt={work.title}
                      width={200}
                      height={300}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* ── TOP-LEFT: Genre Badge ── */}
                    {work.genre && (
                      <span className="absolute top-2 left-2 z-10 rounded bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[8.5px] font-mono font-medium text-white border border-white/15 shadow-xs">
                        {work.genre}
                      </span>
                    )}

                    {/* ── BOTTOM-LEFT: Chapter count ── */}
                    <div className="absolute bottom-2 left-2 z-10 bg-black/75 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded backdrop-blur-2xs border border-white/10">
                      {work.publishedChaptersCount ?? work.chaptersCount ?? 0} Ch
                    </div>

                    {/* ── BOTTOM-RIGHT: Status Badge ── */}
                    {(work.status || (work as any).publicationStatus) && (
                      <span className="absolute bottom-2 right-2 z-10 inline-flex items-center rounded bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[8.5px] font-mono font-semibold text-white uppercase tracking-wider border border-white/15 shadow-xs">
                        <span>{work.status || (work as any).publicationStatus || 'Ongoing'}</span>
                      </span>
                    )}
                  </div>
                  <h5 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] leading-snug line-clamp-1 group-hover:underline">
                    {work.title}
                  </h5>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] block mt-0.5 truncate">
                    {work.author.name}
                  </span>
                </Link>
              )
            })}

            {/* Aesthetic Empty Shelf Slots */}
            {savedWorks.length < 6 &&
              Array.from({ length: Math.max(0, 6 - savedWorks.length) }).map((_, idx) => (
                <Link
                  key={`empty-slot-${idx}`}
                  to="/discover"
                  className="hidden xl:flex aspect-[2/3] rounded-xl border border-dashed border-[var(--border-subtle)]/70 bg-[var(--bg-surface)]/30 hover:bg-[var(--bg-surface)]/70 hover:border-[var(--border-subtle)] transition-all flex-col items-center justify-center text-center p-3 cursor-pointer group no-underline text-inherit"
                >
                  <div className="w-8 h-8 rounded-full border border-dashed border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] mb-1.5 transition-colors">
                    <span className="text-base font-light">+</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] transition-colors">
                    Add Book
                  </span>
                </Link>
              ))}

            {/* Action Card to Discover More */}
            <Link
              to="/discover"
              className="aspect-[2/3] rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center text-center p-3 transition-colors cursor-pointer group no-underline text-inherit"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-primary)] mb-2 shadow-2xs group-hover:scale-110 transition-transform">
                <Search className="h-4 w-4" />
              </div>
              <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
                Browse More
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)] mt-0.5">
                Explore Catalog
              </span>
            </Link>
          </div>
        ) : (
          /* Honest, Authentic Empty State connected to Database */
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6 sm:p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-black dark:text-white">
              <Bookmark className="h-4 w-4" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                No stories saved to your shelf yet
              </h4>
              <p className="font-serif text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                Bookmark any story while browsing or reading. Your saved stories are stored directly in your account database and will appear right here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-mono text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Explore Stories to Save</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 5: WRITER'S ATELIER / PUBLISH YOUR NOVEL SPOTLIGHT (ADAPTIVE BANNER)
          ========================================================================= */}
      <section id="author-atelier" className="w-full pb-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '350px' }}>
        <div className="bg-[var(--ink-primary)] text-[var(--bg-canvas)] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg relative overflow-hidden">
          {/* Ambient Decorative Watermark */}
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-10 translate-y-10">
            <Feather className="w-96 h-96 text-current" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full font-mono text-[10px] uppercase tracking-wider text-amber-200">
                <PenLine className="h-3 w-3" />
                <span>
                  {isAuthor ? "Author Atelier • Your Writing Desk" : "Writer's Atelier • Serial Publishing Studio"}
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                {isAuthor && activeDraft
                  ? `Ready to continue writing “${activeDraft.title}”?`
                  : 'Have a world to craft? Over 3.2M readers are looking for fresh chapters.'}
              </h3>

              <p className="font-serif text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                {isAuthor
                  ? 'Access your serial editor, publish scheduled drops, review comments, and analyze reader retention metrics.'
                  : 'Publish serialized chapters on your schedule, build loyal subscriber circles, and access granular reader retention graphs chapter by chapter.'}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 font-mono text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-300" />
                  <span>
                    {isAuthor && activeDraft ? (
                      <>Active Manuscript: <strong className="text-white font-semibold">{activeDraft.title}</strong> ({activeDraft.chaptersCount} Ch.)</>
                    ) : (
                      <>Draft in Progress: <strong className="text-white font-semibold">“The Pale Cartography”</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-300" />
                  <span>
                    {isAuthor ? (
                      <>Active Readers: <strong className="text-white font-semibold">{formatViewCount(activeDraft?.totalReads || 0, true)} Reads</strong></>
                    ) : (
                      <>Active Atelier Audience: <strong className="text-white font-semibold">14,240 Followers</strong></>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-3">
              <Link to={isAuthor && activeDraft ? `/write/manage/${activeDraft.id}` : "/write/new"} className="no-underline">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 border-white font-mono text-xs font-semibold"
                  leftIcon={<PenLine className="h-4 w-4 shrink-0" />}
                >
                  {isAuthor ? 'Open Studio Workspace' : 'Open Writing Studio'}
                </Button>
              </Link>

              <Link
                to="/write"
                className="inline-flex items-center justify-center gap-1.5 text-white/80 hover:text-white font-mono text-xs py-1 transition-colors no-underline text-center"
              >
                <span>View Author Studio &amp; Analytics</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      </div>
    </div>
  )
}
