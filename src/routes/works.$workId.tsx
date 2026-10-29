import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUser, useClerk } from '@clerk/react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { TellnestLoader } from '../components/TellnestLoader'
import { CardAccordion, Button, Badge, AnimatedSearch } from '../design-system'
import {
  BookOpen,
  Bookmark,
  Share2,
  Clock,
  Star,
  Heart,
  Users,
  Eye,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  UserCheck,
  MessageCircle,
} from 'lucide-react'
import { getWorkSlug } from '../data/mockData'
import { generateMeta } from '../lib/seo'
import { getStorySocialCardUrl } from '../lib/og'
import { getPublicWorkServerFn, trackWorkImpressionServerFn } from '../server/works'
import { getWorkHeartStatusServerFn, toggleWorkHeartServerFn } from '../server/hearts'
import { HeartsBreakdownModal } from '../components/HeartsBreakdownModal'
import { SavesAdjustmentModal } from '../components/SavesAdjustmentModal'
import { AuthorProfileModal } from '../components/AuthorProfileModal'
import { ShareStoryModal } from '../components/ShareStoryModal'
import { formatViewCount, formatHeartCount } from '../lib/utils'
import CommentsSection from '../components/CommentsSection'
import defaultBookCover from '../assets/default-book-cover.webp'

export const Route = createFileRoute('/works/$workId')({
  // In-Memory SWR (Desktop & Mobile): Keeps story details fresh in RAM for 60s; instant 0ms navigation
  staleTime: 60_000,
  gcTime: 1000 * 60 * 5,
  loader: async ({ params }) => {
    const rawParam = (params.workId || '').trim().toLowerCase()

    // 1. Fetch full work from Supabase
    try {
      const dbWork = await getPublicWorkServerFn({ data: params.workId })
      if (dbWork) return { work: dbWork }
    } catch (e) {
      console.warn('[Route /works/$workId] Loader DB lookup error:', e)
    }

    return { work: null }
  },
  head: ({ params, loaderData }) => {
    const rawParam = (params.workId || '').trim().toLowerCase()
    let work = loaderData?.work

    if (!work && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
          const list = JSON.parse(stored)
          const matched = list.find(
            (w: any) =>
              w.id === params.workId ||
              (w.slug && w.slug.toLowerCase() === rawParam) ||
              getWorkSlug(w) === rawParam
          )
          if (matched) work = matched
        }
      } catch (e) {}
    }

    if (!work) {
      return generateMeta({
        title: 'Manuscript Not Found',
        noindex: true,
      })
    }

    const canonicalSlug = getWorkSlug(work)
    const authorName = work.author?.name || 'Hatchpen Author'
    const authorSlug = work.author?.handle || work.author?.id || 'author-unknown'
    const isPublic = (work.visibility || '').toLowerCase() === 'public'
    const isPublished = (work.publication_status || (work as any).publicationStatus || 'published').toLowerCase() === 'published'
    const rawIndexable = work.is_indexable !== undefined ? work.is_indexable : (work as any).isIndexable
    const isIndexable = isPublic && isPublished && rawIndexable === true

    const totalWords =
      Number(work.word_count || (work as any).wordCount || 0) ||
      (work.chapters || []).reduce((acc: number, c: any) => acc + Number(c.wordCount || c.word_count || 0), 0) ||
      1200
    const totalReadingTime =
      Number(work.reading_time_minutes || (work as any).readingTimeMinutes || 0) ||
      Math.max(1, Math.ceil(totalWords / 220))
    const totalReads = Number(work.total_reads || (work as any).reads || 0)
    const totalSaves = Number(work.total_saves || (work as any).saves || 0)
    const datePublished = work.created_at || (work as any).createdAt || undefined
    const dateModified = work.updated_at || (work as any).updatedAt || datePublished

    const ogImage = getStorySocialCardUrl(work)

    return generateMeta({
      title: `${work.title} by ${authorName}`,
      description: work.synopsis || (work.fullDescription ? work.fullDescription.slice(0, 160) : ''),
      canonicalUrl: `https://hatchpen.com/works/${canonicalSlug}`,
      ogType: 'book',
      ogImage,
      ogImageAlt: `${work.title} by ${authorName} — Read on HatchPen`,
      author: authorName,
      noindex: !isIndexable,
      keywords: [
        work.title,
        work.genre || 'Literature',
        work.category || 'Novels',
        ...(work.tags || []),
        'read online',
        'serialized manuscript',
        'serialized fiction',
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: work.title,
        author: {
          '@type': 'Person',
          name: authorName,
          url: `https://hatchpen.com/author/${authorSlug}`,
        },
        genre: work.genre || 'Fiction',
        description: work.synopsis || '',
        image: work.cover || 'https://hatchpen.com/default-book-cover.webp',
        inLanguage: work.language || 'English',
        numberOfPages: work.publishedChaptersCount || work.chaptersCount || 1,
        wordCount: totalWords,
        timeRequired: `PT${totalReadingTime}M`,
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        url: `https://hatchpen.com/works/${canonicalSlug}`,
        ...(totalReads > 0 || totalSaves > 0
          ? {
              interactionStatistic: [
                ...(totalReads > 0
                  ? [
                      {
                        '@type': 'InteractionCounter',
                        interactionType: 'https://schema.org/ReadAction',
                        userInteractionCount: totalReads,
                      },
                    ]
                  : []),
                ...(totalSaves > 0
                  ? [
                      {
                        '@type': 'InteractionCounter',
                        interactionType: 'https://schema.org/BookmarkAction',
                        userInteractionCount: totalSaves,
                      },
                    ]
                  : []),
              ],
            }
          : {}),
      },
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        ...(work.genre
          ? [
              {
                name: work.genre,
                url: `/genre/${work.genreSlug || work.genre.toLowerCase().replace(/\s+/g, '-')}`,
              },
            ]
          : []),
        { name: work.title, url: `/works/${canonicalSlug}` },
      ],
    })
  },
  component: WorkDetailPage,
})

function WorkDetailPage() {
  const { workId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const {
    getWorkById,
    allWorks,
    isWorksLoading,
    isWorkSaved,
    toggleSaveWork,
    isAuthorFollowed,
    toggleFollowAuthor,
    readingProgress,
    isOwnWork,
    showToast,
    openAuthModal,
  } = useApp()

  const work = useMemo(() => {
    // 0. Route loader result (fastest, SSR-synchronized)
    if (loaderData?.work) return loaderData.work

    // 1. Context lookup (checks allWorks from DB, localStorage)
    const matched = getWorkById(workId)
    if (matched) return matched

    // 2. Direct browser localStorage fallback
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
          const rawParam = workId.trim().toLowerCase()
          const list = JSON.parse(stored)
          const localMatch = list.find(
            (w: any) =>
              w.id === workId ||
              (w.slug && w.slug.toLowerCase() === rawParam) ||
              getWorkSlug(w) === rawParam
          )
          if (localMatch) return localMatch
        }
      } catch (e) {}
    }

    return undefined
  }, [workId, loaderData?.work, getWorkById, allWorks])

  const canonicalSlug = work ? getWorkSlug(work) : ''
  const saved = work ? isWorkSaved(work.id) : false
  const { user, isLoaded: isUserLoaded } = useUser()

  // Track unique story impression strictly in live DB on landing (independent of chapter reads)
  useEffect(() => {
    if (!work) return
    if (!isUserLoaded) return // Wait for Clerk auth state to resolve for cross-device identity
    if (typeof window === 'undefined') return

    let viewerKey: string
    if (user?.id) {
      // Deterministic cross-device identity for authenticated members (prevents duplicate impressions on mobile vs laptop)
      viewerKey = `u-${user.id}`
    } else {
      let stored = localStorage.getItem('hatchpen_viewer_uuid') || localStorage.getItem('tellnest_viewer_uuid')
      if (!stored) {
        stored = 'v-' + Math.random().toString(36).substring(2) + Date.now().toString(36)
        localStorage.setItem('hatchpen_viewer_uuid', stored)
        localStorage.setItem('tellnest_viewer_uuid', stored)
      }
      viewerKey = stored
    }

    trackWorkImpressionServerFn({
      data: {
        viewerKey,
        workId: work.id,
      },
    }).catch(() => {})
  }, [work?.id, isUserLoaded, user?.id])
  const authorId = work?.author?.id || 'author-unknown'
  const authorName = work?.author?.name || 'Hatchpen Author'
  const authorHandle = work?.author?.handle || 'author'
  const authorSlug = work?.author?.handle || work?.author?.id || 'author-unknown'
  const authorAvatar = work?.author?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
  const followed = work ? (isAuthorFollowed(authorId) || isAuthorFollowed(authorHandle)) : false
  const isSelf = Boolean(
    user && work?.author && (
      work.author.id === user.id ||
      (user.username && work.author.handle && work.author.handle.toLowerCase() === user.username.toLowerCase())
    )
  )

  const showAuthorAvatar = isSelf || work?.author?.showAvatar !== false
  const showAuthorName = isSelf || work?.author?.showName !== false
  const showAuthorUsername = isSelf || work?.author?.showUsername !== false

  const authorDisplayName = isSelf
    ? authorName
    : showAuthorName
      ? authorName
      : showAuthorUsername
        ? `@${authorHandle}`
        : 'Anonymous Author'
  const authorDisplayAvatar = showAuthorAvatar ? authorAvatar : '/unisex-avatar.svg'
  const progress = work && !isOwnWork(work.id) ? readingProgress[work.id] : undefined

  const isAuthor = isOwnWork(work?.id || '')
  const rawChaptersList = work?.chapters || []
  const chaptersList = useMemo(() => {
    return isAuthor
      ? rawChaptersList
      : rawChaptersList.filter((c) => c.status === 'published')
  }, [rawChaptersList, isAuthor])
  const firstChapterId = chaptersList[0]?.id || ''
  const resumeChapterId = progress ? progress.chapterId : firstChapterId

  const categorySlug = work?.categorySlug || (work?.category ? work.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'novels')
  const genreSlug = work?.genreSlug || (work?.genre ? work.genre.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'literary-fiction')
  const workTags = Array.isArray(work?.tags) ? work.tags : []

  const [chapterSearch, setChapterSearch] = useState('')

  const { openSignIn } = useClerk()
  const [adminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return (
        sessionStorage.getItem('hatchpen_admin_session_token') ||
        localStorage.getItem('hatchpen_admin_session_token') ||
        sessionStorage.getItem('tellnest_admin_session_token') ||
        localStorage.getItem('tellnest_admin_session_token')
      )
    }
    return null
  })
  const [showAdminHeartsModal, setShowAdminHeartsModal] = useState<boolean>(false)
  const [showAdminSavesModal, setShowAdminSavesModal] = useState<boolean>(false)
  const [workHearted, setWorkHearted] = useState<boolean>(false)
  const [workHeartCount, setWorkHeartCount] = useState<number>(() => {
    return Number(work?.likeCount ?? (work as any)?.like_count ?? 0)
  })
  const [workSaveCount, setWorkSaveCount] = useState<number>(() => {
    return Number(work?.totalSaves ?? (work as any)?.save_count ?? 0)
  })
  const [isHeartSubmitting, setIsHeartSubmitting] = useState<boolean>(false)
  const [isHeartBouncing, setIsHeartBouncing] = useState<boolean>(false)
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false)
  const [authorModalOpen, setAuthorModalOpen] = useState<boolean>(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false)

  // Sync heart and save counts if work changes
  useEffect(() => {
    if (work) {
      setWorkHeartCount(Number(work.likeCount ?? (work as any).like_count ?? 0))
      setWorkSaveCount(Number(work.totalSaves ?? (work as any).save_count ?? 0))
    }
  }, [work?.id, work?.likeCount, (work as any)?.like_count, work?.totalSaves, (work as any)?.save_count])

  // Fetch live work heart status
  useEffect(() => {
    if (!work?.id) return
    getWorkHeartStatusServerFn({
      data: {
        workId: work.id,
        clerkUserId: user?.id || null,
      },
    })
      .then((res) => {
        if (res.success) {
          setWorkHearted(res.userHearted)
          setWorkHeartCount(res.heartCount)
        }
      })
      .catch(() => {})
  }, [work?.id, user?.id])

  // Toggle Save Work
  const handleToggleSave = () => {
    if (!work?.id) return
    const currentlySaved = isSavedWork(work.id)
    toggleSaveWork(work.id)
    setWorkSaveCount((prev) => Math.max(0, currentlySaved ? prev - 1 : prev + 1))
  }

  // Smooth scroll to comments section (Instagram comment shortcut)
  const scrollToComments = () => {
    const el = document.getElementById('comments-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Toggle Story Heart (Instagram-style micro-interaction & feedback)
  const handleToggleWorkHeart = async () => {
    if (!user) {
      showToast('Sign in to heart this story')
      if (openSignIn) openSignIn()
      else openAuthModal()
      return
    }

    if (!work?.id || isHeartSubmitting) return

    // Optimistic UI update
    const prevHearted = workHearted
    const prevCount = workHeartCount
    const nextHearted = !prevHearted
    const nextCount = nextHearted ? prevCount + 1 : Math.max(0, prevCount - 1)

    setWorkHearted(nextHearted)
    setWorkHeartCount(nextCount)
    setIsHeartSubmitting(true)

    if (nextHearted) {
      setIsHeartBouncing(true)
      setShowHeartBurst(true)
      showToast('You hearted this story')
      setTimeout(() => setIsHeartBouncing(false), 500)
      setTimeout(() => setShowHeartBurst(false), 900)
    }

    try {
      const res = await toggleWorkHeartServerFn({
        data: {
          clerkUserId: user.id,
          workId: work.id,
        },
      })
      if (res.success) {
        setWorkHearted(res.hearted)
        setWorkHeartCount(res.heartCount)
      }
    } catch (err: any) {
      setWorkHearted(prevHearted)
      setWorkHeartCount(prevCount)
      showToast(err?.message || 'Failed to update heart')
    } finally {
      setIsHeartSubmitting(false)
    }
  }

  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return chaptersList
    const q = chapterSearch.toLowerCase()
    return chaptersList.filter(
      (c) =>
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        String(c.number).includes(q)
    )
  }, [chaptersList, chapterSearch])

  const navigate = useNavigate()

  // SEO Canonical URL Enforcement:
  // If user navigates with raw UUID (or non-canonical identifier), automatically replace URL with canonical slug
  useEffect(() => {
    if (work && canonicalSlug && workId !== canonicalSlug) {
      navigate({
        to: '/works/$workId',
        params: { workId: canonicalSlug },
        replace: true,
      })
    }
  }, [work, canonicalSlug, workId, navigate])

  const handleShare = () => {
    setIsShareModalOpen(true)
  }

  if (!work && isWorksLoading) {
    return (
      <div className="py-24 px-4 max-w-2xl mx-auto flex flex-col items-center justify-center">
        <TellnestLoader message="Loading story..." />
      </div>
    )
  }

  if (!work) {
    return (
      <div className="py-20 px-4 max-w-2xl mx-auto">
        <EmptyState
          type="no-works"
          customTitle="Manuscript Not Found"
          customDescription="The requested literary work could not be located in the HatchPen catalog."
          actionLabel="Return to Catalog"
          actionHref="/discover"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Main Work Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[var(--border-subtle)]">
        
        {/* Cover Column */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center sm:items-start">
          {/* Book Cover Image */}
          <div className="relative aspect-[3/4] w-full max-w-[260px] sm:max-w-[320px] overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] shadow-md">
            <img
              src={work.cover || defaultBookCover}
              alt={work.title}
              fetchPriority="high"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget
                if (!target.src.includes('default-book-cover')) {
                  target.src = defaultBookCover
                }
              }}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="rounded bg-black/85 px-2.5 py-0.5 text-[10px] font-mono font-medium text-white uppercase tracking-wider backdrop-blur-xs border border-white/10">
                {work.status}
              </span>
            </div>
          </div>

          {/* Primary Action Button Directly Under Cover Image (Responsive & Single Line) */}
          <div className="mt-4 w-full max-w-[260px] sm:max-w-[320px]">
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: canonicalSlug, chapterId: resumeChapterId }}
              preload="intent"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--ink-primary)] bg-[var(--ink-primary)] py-3 px-3.5 text-xs sm:text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-all no-underline shadow-sm cursor-pointer whitespace-nowrap select-none"
            >
              <BookOpen className="h-4 w-4 shrink-0" />
              <span suppressHydrationWarning className="truncate tracking-wide text-[11px] sm:text-xs font-mono uppercase">
                {progress ? (
                  <>
                    <span className="sm:hidden">RESUME CH. {progress.chapterNumber || 1}</span>
                    <span className="hidden sm:inline">CONTINUE READING (CH. {progress.chapterNumber || 1})</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">START READING</span>
                    <span className="hidden sm:inline">START READING CHAPTER 01</span>
                  </>
                )}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>

            {/* Mobile-Only Actions Row (Like, Save, Share) Directly Under Continue/Resume */}
            <div className="flex sm:hidden items-center gap-2 mt-2 w-full">
              {/* Heart Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleWorkHeart}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-mono font-medium transition-all cursor-pointer border select-none ${
                  workHearted
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
                title={workHearted ? 'Remove heart from story' : 'Heart this story'}
              >
                <motion.div
                  animate={isHeartBouncing ? { scale: [1, 1.35, 0.9, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Heart className={`h-3.5 w-3.5 ${workHearted ? 'fill-current' : ''}`} />
                </motion.div>
                <span>{formatHeartCount(workHeartCount, true)}</span>
              </motion.button>

              {/* Save Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleSave}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-mono font-medium transition-all cursor-pointer border select-none ${
                  saved
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
                title={saved ? 'In Library' : 'Save to Library'}
              >
                <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </motion.button>

              {/* Share Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-1 rounded-lg py-2 px-3 text-xs font-mono font-medium border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-all cursor-pointer select-none shrink-0"
                title="Share Story"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Narrative & Metadata Column */}
        <div className="md:col-span-8 lg:col-span-8 space-y-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
              <Link
                to="/category/$slug"
                params={{ slug: categorySlug }}
                preload="intent"
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 uppercase tracking-wider text-inherit no-underline hover:border-[var(--ink-primary)]"
              >
                {work.category || 'Novels'}
              </Link>
              <span>•</span>
              <Link
                to="/genre/$slug"
                params={{ slug: genreSlug }}
                preload="intent"
                className="text-inherit no-underline hover:underline"
              >
                {work.genre || 'Literary Fiction'}
              </Link>
              <span>•</span>
              <span>{work.language || 'English'}</span>
              {work.isMature && (
                <span className="rounded bg-stone-200 dark:bg-stone-800 px-1.5 py-0.5 text-[9px] uppercase font-bold text-stone-700 dark:text-stone-300">
                  Mature 18+
                </span>
              )}
              {work.new_chapters_this_week && (
                <span className="rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide">
                  ✦ New Chapters This Week
                </span>
              )}
              {work.new_this_week && (
                <span className="rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-[10px] font-mono font-medium tracking-wide">
                  ✦ New This Week
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--ink-primary)] leading-tight">
              {work.title}
            </h1>
            {work.subtitle && (
              <p className="font-serif text-lg text-[var(--ink-muted)] italic">
                {work.subtitle}
              </p>
            )}
          </div>

          {/* Author Capsule & Social Engagement Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-[var(--border-subtle)]">
            {/* Left: Author Avatar, Name, Follow Button & Handle */}
            <div className="flex items-center gap-3">
              <Link
                to="/author/$authorId"
                params={{ authorId: authorSlug }}
                className="shrink-0 group cursor-pointer focus:outline-none"
                title="View Author Profile"
                aria-label="View Author Profile"
              >
                <img
                  src={authorDisplayAvatar}
                  alt={authorDisplayName}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 rounded-full object-cover grayscale border border-[var(--border-strong)] group-hover:border-[var(--ink-primary)] transition-all"
                />
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/author/$authorId"
                    params={{ authorId: authorSlug }}
                    className="text-inherit no-underline group text-left cursor-pointer focus:outline-none"
                    title="View Author Profile"
                    aria-label="View Author Profile"
                  >
                    <p className="text-sm font-semibold text-[var(--ink-primary)] group-hover:underline">
                      {authorDisplayName}
                    </p>
                  </Link>

                  {/* Follow Button: Compact & Right Next to Author Name */}
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => toggleFollowAuthor(authorId)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium font-mono transition-all cursor-pointer ${
                        followed
                          ? 'border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                          : 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
                      }`}
                      title={followed ? 'Following Author' : 'Follow Author'}
                    >
                      {followed ? (
                        <>
                          <UserCheck className="h-3 w-3" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3 w-3" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {(isSelf || showAuthorUsername) && (
                  <Link
                    to="/author/$authorId"
                    params={{ authorId: authorSlug }}
                    className="text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer text-left block"
                    title="View Author Profile"
                  >
                    @{authorHandle}
                  </Link>
                )}
              </div>
            </div>

            {/* Right: Hearts, Save, and Share Action Buttons (Desktop only - mobile shown below CTA) */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Heart Story Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleWorkHeart}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border select-none ${
                  workHearted
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
                title={workHearted ? 'Remove heart from story' : 'Heart this story'}
              >
                <motion.div
                  animate={isHeartBouncing ? { scale: [1, 1.35, 0.9, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Heart className={`h-3.5 w-3.5 ${workHearted ? 'fill-current' : ''}`} />
                </motion.div>
                <span>{formatHeartCount(workHeartCount, true)}</span>
              </motion.button>

              {/* Save Work Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleSave}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer border select-none ${
                  saved
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)]'
                }`}
                title={saved ? 'In Library' : 'Save to Library'}
              >
                <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </motion.button>

              {/* Share Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-all cursor-pointer select-none"
                title="Share Story"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </motion.button>
            </div>
          </div>

          {/* Full Synopsis */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
              Synopsis
            </h3>
            <p className="text-sm leading-relaxed text-[var(--ink-secondary)] font-sans">
              {work.fullDescription}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {workTags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-muted)]"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Reading Statistics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-t border-[var(--border-subtle)] font-mono text-center">
            <div title={`${formatViewCount(work.totalReads, false)} Total Reads`}>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{formatViewCount(work.totalReads, true)}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Total Reads</p>
            </div>
            <div title={`${(Number(workSaveCount) || 0).toLocaleString()} Saves`}>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{formatViewCount(workSaveCount, true)}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider flex items-center justify-center gap-1">
                <span>Library Saves</span>
                {adminToken && (
                  <button
                    type="button"
                    onClick={() => setShowAdminSavesModal(true)}
                    className="text-[9px] font-mono text-[var(--ink-primary)] font-bold underline hover:opacity-75 cursor-pointer ml-0.5"
                    title="Admin: Adjust Library Saves"
                  >
                    (Adjust)
                  </button>
                )}
              </p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{chaptersList.length || work.publishedChaptersCount || work.chaptersCount || 0}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Chapters</p>
            </div>
            <div title={`${formatHeartCount(workHeartCount, false)} Total Hearts`}>
              <p className="text-lg font-semibold text-[var(--ink-primary)] flex items-center justify-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)]" />
                {formatHeartCount(workHeartCount, true)}
              </p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider flex items-center justify-center gap-1">
                <span>Total Hearts</span>
                {adminToken && (
                  <button
                    type="button"
                    onClick={() => setShowAdminHeartsModal(true)}
                    className="text-[9px] font-mono text-[var(--ink-primary)] font-bold underline hover:opacity-75 cursor-pointer ml-0.5"
                    title="Admin: Adjust Hearts"
                  >
                    (Adjust)
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Private Creator Metrics Indicator (Strictly visible to the author & admin) */}
          {(isAuthor || isSelf || adminToken) && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--ink-muted)]">
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                <span className="font-semibold text-[var(--ink-primary)]">
                  {(Number(work.impressionCount) || 0).toLocaleString()}
                </span>
                <span>unique folio impressions</span>
              </span>
              <span className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wider">
                Private to Author & Admin
              </span>
            </div>
          )}

        </div>
      </div>

      {/* CHAPTER INDEX LIST */}
      <section className="py-12" style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Table of Contents
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              {filteredChapters.length} of {work.publishedChaptersCount} published chapters in this edition
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-56 sm:w-64">
              <AnimatedSearch
                variant="minimal"
                placeholder="Find chapter..."
                value={chapterSearch}
                onChange={setChapterSearch}
                onClear={() => setChapterSearch('')}
                size="sm"
              />
            </div>
            <span className="font-mono text-xs text-[var(--ink-faint)] hidden sm:inline whitespace-nowrap">
              Updated {work.updatedAt}
            </span>
          </div>
        </div>

        {filteredChapters.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[var(--border-subtle)] rounded-lg">
            <p className="text-xs font-mono text-[var(--ink-muted)]">No chapters found matching "{chapterSearch}"</p>
            <button
              type="button"
              onClick={() => setChapterSearch('')}
              className="mt-2 text-xs font-mono text-[var(--ink-primary)] underline hover:opacity-80 cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <CardAccordion
            defaultOpenId={resumeChapterId}
            items={filteredChapters.map((chapter) => {
            const isRead = progress && progress.chapterNumber > chapter.number
            const isCurrent = progress && progress.chapterId === chapter.id
            const isDraft = chapter.status === 'draft'
            const badgeLabel = isDraft
              ? 'Draft (Unpublished)'
              : chapter.isNew
              ? 'New'
              : chapter.isUpdated
              ? 'Updated'
              : isCurrent
              ? (
                <>
                  <span className="sm:hidden">Resume</span>
                  <span className="hidden sm:inline">Resume Here</span>
                </>
              )
              : isRead
              ? 'Read'
              : undefined

            return {
              id: chapter.id,
              title: `${String(chapter.number).padStart(2, '0')}. ${chapter.title || 'Chapter ' + chapter.number}`,
              subtitle: chapter.subtitle 
                ? `${chapter.subtitle} • ${chapter.readTimeMinutes || 1} min read • ${(chapter.wordCount || 0).toLocaleString()} words`
                : `${chapter.readTimeMinutes || 1} min read • ${(chapter.wordCount || 0).toLocaleString()} words`,
              badge: badgeLabel,
              content: (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    {(chapter.content || '').slice(0, 220)}...
                  </p>
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]/50">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)] whitespace-nowrap">
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3 shrink-0" />
                        {chapter.readTimeMinutes || 1} min read
                      </span>
                      <span className="shrink-0">•</span>
                      <span className="shrink-0">{(chapter.wordCount || 0).toLocaleString()} words</span>
                      {chapter.publishedAt && (
                        <>
                          <span className="hidden sm:inline shrink-0">•</span>
                          <span className="hidden sm:inline shrink-0">Published {chapter.publishedAt}</span>
                        </>
                      )}
                    </div>

                    <Link
                      to="/read/$workId/$chapterId"
                      params={{ workId: canonicalSlug, chapterId: chapter.id }}
                      preload="intent"
                      className="no-underline w-full sm:w-auto"
                    >
                      <Button size="sm" variant="primary" className="w-full sm:w-auto justify-center" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                        {isCurrent ? 'Continue Reading' : 'Read Chapter'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ),
            }
          })}
        />
        )}
      </section>

      {/* READER REFLECTIONS ON MANUSCRIPT */}
      <section id="comments-section" className="py-8 scroll-mt-20">
        <CommentsSection
          workId={work.id}
          workAuthorId={work.author?.id}
          workAuthorHandle={work.author?.handle}
          title="Manuscript Reflections"
          subtitle="Community reviews, critique, and literary discourse on this complete work"
        />
      </section>

      {/* ADMIN HEARTS ADJUSTMENT MODAL */}
      {showAdminHeartsModal && work && (
        <HeartsBreakdownModal
          isOpen={showAdminHeartsModal}
          onClose={() => setShowAdminHeartsModal(false)}
          work={work}
          adminToken={adminToken}
          allowAdminAdjust={true}
          onHeartsUpdated={(newTotal) => {
            setWorkHeartCount(newTotal)
            showToast(`Story hearts updated to ${newTotal.toLocaleString()}!`)
          }}
        />
      )}

      {/* ADMIN SAVES ADJUSTMENT MODAL */}
      {showAdminSavesModal && work && (
        <SavesAdjustmentModal
          isOpen={showAdminSavesModal}
          onClose={() => setShowAdminSavesModal(false)}
          work={work}
          adminToken={adminToken}
          onSavesUpdated={(newTotal) => {
            setWorkSaveCount(newTotal)
            showToast(`Story library saves updated to ${newTotal.toLocaleString()}!`)
          }}
        />
      )}

      {/* AUTHOR PROFILE POPUP / MOBILE BOTTOM SHEET DRAWER */}
      {work?.author && (
        <AuthorProfileModal
          isOpen={authorModalOpen}
          onClose={() => setAuthorModalOpen(false)}
          author={work.author}
        />
      )}

      {/* SHARE STORY MODAL */}
      {work && (
        <ShareStoryModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={work.title}
          authorName={authorDisplayName}
          url={typeof window !== 'undefined' ? window.location.href : `https://hatchpen.com/works/${canonicalSlug}`}
          cover={work.cover}
        />
      )}

    </div>
  )
}
