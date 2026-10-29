import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import ReaderSettingsModal from '../components/ReaderSettingsModal'
import { AuthorProfileModal } from '../components/AuthorProfileModal'
import ChapterDrawer from '../components/ChapterDrawer'
import CommentsSection from '../components/CommentsSection'
import { ChapterHeartButton } from '../components/ChapterHeartButton'
import EmptyState from '../components/EmptyState'
import { TellnestLoader } from '../components/TellnestLoader'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Settings,
  MessageSquare,
  Share2,
  Eye,
  Lock,
  Headphones,
} from 'lucide-react'
import { ChapterAudioPlayer } from '../components/ChapterAudioPlayer'
import { useChapterAudio } from '../lib/tts/useChapterAudio'
import { getWorkSlug } from '../data/mockData'
import { generateMeta } from '../lib/seo'
import { getChapterSocialCardUrl } from '../lib/og'
import { getPublicWorkServerFn, trackStrictViewServerFn } from '../server/works'
import { saveReadingProgressServerFn } from '../server/reader'
import { useReadingProgressStore } from '../lib/readingProgress/readingProgressStore'
import {
  buildStoryParagraphMap,
  parseChapterParagraphs,
  extractParagraphTexts,
} from '../lib/readingProgress/paragraphUtils'
import {
  clearAcknowledgedBatchFromStorage,
  getPendingBatchFromStorage,
} from '../lib/readingProgress/indexedDbRecovery'
import { useParagraphVisibility } from '../lib/readingProgress/useParagraphVisibility'
import type { ReadingPosition } from '../lib/readingProgress/types'
import { getOptimizedImageUrl } from '../lib/cloudinary'
import { ViewsBreakdownModal } from '../components/ViewsBreakdownModal'
import { formatViewCount } from '../lib/utils'
import { ReaderQuoteShareTooltip } from '../components/reader/ReaderQuoteShareTooltip'
import { ShareStoryModal } from '../components/ShareStoryModal'

export const Route = createFileRoute('/read/$workId/$chapterId')({
  loader: async ({ params }) => {
    const rawParam = (params.workId || '').trim().toLowerCase()

    // 1. Fetch full work from Supabase
    try {
      const dbWork = await getPublicWorkServerFn({ data: params.workId })
      if (dbWork && dbWork.chapters?.length) return { work: dbWork }
    } catch (e) {
      console.warn('[Route /read/$workId/$chapterId] Loader DB lookup error:', e)
    }

    return { work: null }
  },
  head: ({ params, loaderData }) => {
    const rawParam = params.workId.trim().toLowerCase()
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

    const chapter =
      work?.chapters.find((c: any) => c.id === params.chapterId || c.number.toString() === params.chapterId) ||
      (params.chapterId === 'first' || params.chapterId === 'default' ? work?.chapters[0] : undefined)

    if (!work || !chapter) {
      return generateMeta({
        title: 'Chapter Not Found',
        noindex: true,
      })
    }

    const canonicalSlug = getWorkSlug(work)
    const canonicalUrl = `https://hatchpen.com/read/${canonicalSlug}/${chapter.id}`
    const title = `${chapter.title} — ${work.title} by ${work.author.name}`
    const excerpt =
      (chapter.content || chapter.subtitle || work.synopsis).slice(0, 150).replace(/\n/g, ' ').trim() + '...'
    const isPublicWork = (work.visibility || '').toLowerCase() === 'public'
    const isWorkPub = (work.publication_status || (work as any).publicationStatus || 'published').toLowerCase() === 'published'
    const isWorkIdx = (work.is_indexable !== undefined ? work.is_indexable : (work as any).isIndexable) === true
    const isChapterPub = (chapter.status || '').toLowerCase() === 'published'
    const isChapterIdx = (chapter.is_indexable !== undefined ? chapter.is_indexable : (chapter as any).isIndexable) === true
    const isChapterEligible = isPublicWork && isWorkPub && isWorkIdx && isChapterPub && isChapterIdx

    const ogImage = getChapterSocialCardUrl(chapter, work)

    return generateMeta({
      title,
      description: excerpt,
      canonicalUrl,
      ogType: 'article',
      ogImage,
      ogImageAlt: `${chapter.title} — ${work.title} by ${work.author.name}`,
      author: work.author.name,
      noindex: !isChapterEligible,
      keywords: [work.title, chapter.title, work.author.name, 'read chapter online', 'serialized fiction'],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${chapter.title} (${work.title})`,
        author: {
          '@type': 'Person',
          name: work.author.name,
          url: `https://hatchpen.com/author/${work.author.handle || work.author.id}`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'HatchPen',
          url: 'https://hatchpen.com',
        },
        image: work.cover,
        description: excerpt,
        mainEntityOfPage: canonicalUrl,
      },
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Discover', url: '/discover' },
        { name: work.title, url: `/works/${canonicalSlug}` },
        { name: chapter.title, url: canonicalUrl },
      ],
    })
  },
  component: ReaderPage,
})

function formatInlineMarkdown(text: string): React.ReactNode {
  // Strip any trailing backslashes before newlines or end of line (markdown hard-break artifacts)
  const cleanText = text.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')

  // Regex matches:
  // 1. Bold (**text** or __text__)
  // 2. Italic (*text* or _text_)
  // 3. Strikethrough (~~text~~)
  // 4. Inline code (`code`)
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|~~[^~]+~~|`[^`]+`)/g
  const parts = cleanText.split(regex)
  if (parts.length === 1) return cleanText

  return parts.map((part, index) => {
    // Bold: **text** or __text__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      return (
        <strong key={index} className="font-bold text-[var(--ink-primary)]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    // Italic: *text* or _text_
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 2)) {
      return (
        <em key={index} className="italic text-[var(--ink-primary)]">
          {part.slice(1, -1)}
        </em>
      )
    }
    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-[var(--ink-faint)]">
          {part.slice(2, -2)}
        </del>
      )
    }
    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={index} className="font-mono text-[0.88em] bg-[var(--bg-subtle)] text-[var(--ink-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function renderChapterParagraph(text: string): React.ReactNode {
  const cleanText = text.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
  const trimmed = cleanText.trim()

  // Horizontal Rule / Scene Break (--- or ***)
  if (/^(\*{3,}|-{3,})$/.test(trimmed)) {
    return (
      <div className="py-6 flex items-center justify-center gap-3 text-[var(--ink-faint)] select-none">
        <span className="w-8 border-t border-[var(--border-subtle)]" />
        <span className="text-xs tracking-widest font-mono">✦ ✦ ✦</span>
        <span className="w-8 border-t border-[var(--border-subtle)]" />
      </div>
    )
  }

  // Heading 1 / 2 / 3
  if (/^#{1,3}\s+/.test(trimmed)) {
    const level = trimmed.match(/^#{1,3}/)?.[0].length || 1
    const headingText = trimmed.replace(/^#{1,3}\s+/, '')
    if (level === 1) {
      return (
        <h2 className="font-serif text-2xl font-bold text-[var(--ink-primary)] mt-8 mb-4 tracking-tight">
          {formatInlineMarkdown(headingText)}
        </h2>
      )
    }
    if (level === 2) {
      return (
        <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)] mt-6 mb-3 tracking-tight">
          {formatInlineMarkdown(headingText)}
        </h3>
      )
    }
    return (
      <h4 className="font-serif text-lg font-medium text-[var(--ink-primary)] mt-5 mb-2">
        {formatInlineMarkdown(headingText)}
      </h4>
    )
  }

  // Blockquote (> text)
  if (trimmed.startsWith('>')) {
    const rawQuote = trimmed.replace(/^>\s*/, '')
    return (
      <blockquote className="border-l-2 border-[var(--ink-primary)] pl-4 py-1.5 italic text-[var(--ink-muted)] my-3 bg-[var(--bg-subtle)]/40 rounded-r-sm">
        {formatInlineMarkdown(rawQuote)}
      </blockquote>
    )
  }

  return formatInlineMarkdown(cleanText)
}

function ReaderPage() {
  const { workId, chapterId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const navigate = useNavigate()
  const {
    user,
    getWorkById,
    allWorks,
    isWorksLoading,
    readerSettings,
    siteTheme,
    readingProgress,
    updateReadingProgress,
    isOwnWork,
    showToast,
    isSignedIn,
    isUserLoaded,
    openAuthModal,
    isAuthModalOpen,
  } = useApp()

  const work = useMemo(() => {
    // 0. Route loader fast path (SSR synced)
    if (loaderData?.work) return loaderData.work

    // 1. Context lookup
    const fromCtx = getWorkById(workId)
    if (fromCtx) return fromCtx

    // 2. LocalStorage admin fallback
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

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [bannerImageFailed, setBannerImageFailed] = useState(false)
  const [viewsModalOpen, setViewsModalOpen] = useState(false)
  const [authorModalOpen, setAuthorModalOpen] = useState(false)
  const [isAudioOpen, setIsAudioOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
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

  // Find chapter with flexible ID or number matching, defaulting to first chapter only if requested explicitly
  const currentChapterIndex = useMemo(() => {
    if (!work || !work.chapters.length) return -1
    const idx = work.chapters.findIndex((c) => c.id === chapterId || c.number.toString() === chapterId)
    if (idx !== -1) return idx
    if (chapterId === 'first' || chapterId === 'default') return 0
    return -1
  }, [work, chapterId])

  const chapter = work?.chapters[currentChapterIndex]
  const prevChapter = currentChapterIndex > 0 ? work?.chapters[currentChapterIndex - 1] : null
  const nextChapter = work && currentChapterIndex < work.chapters.length - 1 ? work.chapters[currentChapterIndex + 1] : null

  // Public reader gatekeeper & registration wall logic
  const totalChapters = work?.chapters?.length || 0
  const isFirstChapter = currentChapterIndex === 0
  const isSingleChapterStory = totalChapters === 1
  const isCompulsoryAuth = Boolean(isUserLoaded && !isSignedIn && (isSingleChapterStory || !isFirstChapter))
  const hasPromptedChapter1Ref = useRef(false)

  // Reset chapter 1 prompt lock if navigating to a different story
  useEffect(() => {
    hasPromptedChapter1Ref.current = false
  }, [work?.id])

  useEffect(() => {
    // Only apply to confirmed public (unauthenticated) readers once auth state, work, and chapter are loaded
    if (!isUserLoaded || isSignedIn || !work || !chapter) return

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : undefined

    if (isSingleChapterStory) {
      // Single chapter story: Compulsory on page load, cannot be closed
      openAuthModal(currentPath, {
        canClose: false,
        title: 'Sign In to Read Story',
        reason: 'Create a free account or sign in to read this story on Hatchpen.',
      })
    } else if (isFirstChapter) {
      // Chapter 1 of multi-chapter story: Show once on page load; user can dismiss to read Chapter 1 for free
      if (!hasPromptedChapter1Ref.current) {
        hasPromptedChapter1Ref.current = true
        openAuthModal(currentPath, {
          canClose: true,
          title: 'Sign In to Hatchpen',
          reason: 'Enjoy reading Chapter 1 for free. Sign in to save bookmarks and sync your reading progress.',
        })
      }
    } else {
      // Chapter 2+: Compulsory upon moving to chapter 2, cannot be closed
      openAuthModal(currentPath, {
        canClose: false,
        title: 'Create Account to Continue',
        reason: `You have completed your free preview of Chapter 1. Create a free account or sign in to read ${chapter.title} and beyond.`,
      })
    }
  }, [isUserLoaded, isSignedIn, work?.id, chapter?.id, isFirstChapter, isSingleChapterStory, openAuthModal])

  // Reset banner state and scroll to top when navigating to another chapter
  useEffect(() => {
    setBannerImageFailed(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [chapter?.id])

  // Reading continuity: Resume from previous high-water mark prompt
  const existingProg = readingProgress[work?.id || '']
  const existingChapterPercent =
    existingProg && chapter && existingProg.chapterId === chapter.id
      ? existingProg.progressPercent || 0
      : 0
  const [resumePromptVisible, setResumePromptVisible] = useState(false)

  // Show resume prompt on chapter load if user previously reached between 10% and 95%
  useEffect(() => {
    if (existingChapterPercent >= 10 && existingChapterPercent < 95) {
      setResumePromptVisible(true)
    } else {
      setResumePromptVisible(false)
    }
  }, [chapter?.id])

  // =========================================================================
  // PARAGRAPH-BASED READING PROGRESS SYSTEM (3-Second Visibility & Recovery)
  // =========================================================================
  const articleRef = useRef<HTMLElement | null>(null)

  // 1. Deterministic Whole-Story Paragraph Map
  const storyMap = useMemo(() => {
    if (!work?.chapters || work.chapters.length === 0) return null
    return buildStoryParagraphMap(work.chapters, work.id)
  }, [work?.id, work?.chapters])

  // 2. Ordered Paragraphs for Current Chapter with global story order indices
  const currentChapterParagraphs = useMemo(() => {
    if (!chapter?.content || !chapter?.id) return []
    const startOrder = storyMap?.chapterOffsets[chapter.id]?.startOrderIndex ?? 1
    return parseChapterParagraphs(chapter.content, chapter.id, startOrder)
  }, [chapter?.id, chapter?.content, storyMap])

  // Raw paragraph prose strings for inline Markdown rendering
  const rawParagraphTexts = useMemo(() => {
    return extractParagraphTexts(chapter?.content || '')
  }, [chapter?.content])

  // Text-to-Speech (TTS) Engine hook
  const audio = useChapterAudio({
    paragraphs: rawParagraphTexts,
    autoScroll: true,
  })

  // 3. Zustand In-Memory State
  const progressPercent = useReadingProgressStore((s) => s.progressPercent)
  const lastPosition = useReadingProgressStore((s) => s.lastPosition)

  // 4. Three-Second Visibility Eligibility Observer
  useParagraphVisibility(currentChapterParagraphs, articleRef)

  // 5. Atomic Save Dispatcher: Flushes pending eligible batch to server
  const flushPendingSave = async () => {
    if (!work || !chapter || !isSignedIn || isCompulsoryAuth || isOwnWork(work.id)) return
    const state = useReadingProgressStore.getState()
    const batch = state.pendingBatch

    // If there are no pending changes, do NOT make an unnecessary save request
    if (!batch || state.isSyncing) return

    state.setSyncing(true)
    try {
      const res = await saveReadingProgressServerFn({
        data: {
          workId: batch.workId,
          chapterId: batch.chapterId,
          batchId: batch.batchId,
          paragraphId: batch.lastPosition.paragraphId,
          orderIndex: batch.highestOrderIndex,
          totalParagraphs: batch.totalParagraphs,
          lastPosition: JSON.stringify(batch.lastPosition),
          clientTimestamp: batch.lastPosition.timestamp || batch.createdAt,
        },
      })

      if (res?.success) {
        // Acknowledge ONLY the confirmed batch; newer pending changes remain untouched
        const wasExactCleared = useReadingProgressStore.getState().acknowledgeBatch(batch.batchId)
        await clearAcknowledgedBatchFromStorage(batch.workId, batch.batchId)

        updateReadingProgress(work.id, {
          chapterId: batch.chapterId,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          progressPercent: res.progressPercent,
          position: JSON.stringify(batch.lastPosition),
        })

        // If newer changes arrived while this batch was in-flight, flush them immediately
        if (!wasExactCleared && useReadingProgressStore.getState().pendingBatch) {
          flushPendingSave()
        }
      } else {
        useReadingProgressStore.getState().setSyncing(false)
        // Data remains in IndexedDB for retry
      }
    } catch {
      useReadingProgressStore.getState().setSyncing(false)
      // Data remains in IndexedDB for retry
    }
  }

  // 6. Initialization & Recovery Flow: Reconciles server progress with local IndexedDB
  useEffect(() => {
    if (!work || !chapter || !storyMap) return
    let isMounted = true

    const initAndRecover = async () => {
      // Check local recovery layer for pending data from previous crash/exit
      const recoveredBatch = await getPendingBatchFromStorage(work.id)

      const existingProg = readingProgress[work.id]
      let initialHighest = 0
      let initialLastPos: ReadingPosition | null = null
      let initialPercent = 0

      if (existingProg) {
        initialPercent = existingProg.progressPercent || 0
        if (existingProg.position) {
          try {
            const parsed = JSON.parse(existingProg.position)
            if (parsed && typeof parsed.orderIndex === 'number') {
              initialLastPos = parsed
              initialHighest = parsed.orderIndex
            }
          } catch {}
        }
      }

      // Reconcile: If local unpersisted batch has higher/newer progress, adopt it
      if (recoveredBatch) {
        if (recoveredBatch.highestOrderIndex > initialHighest) {
          initialHighest = recoveredBatch.highestOrderIndex
        }
        if (recoveredBatch.progressPercent > initialPercent) {
          initialPercent = recoveredBatch.progressPercent
        }
        if (recoveredBatch.lastPosition) {
          initialLastPos = recoveredBatch.lastPosition
        }
      }

      if (isMounted) {
        useReadingProgressStore.getState().initStory({
          workId: work.id,
          chapterId: chapter.id,
          totalParagraphs: storyMap.totalParagraphs,
          initialHighestOrderIndex: initialHighest,
          initialLastPosition: initialLastPos,
          initialProgressPercent: initialPercent,
        })

        // If an unacknowledged recovered batch exists, enqueue it and attempt save
        if (recoveredBatch) {
          useReadingProgressStore.getState().setPendingBatch(recoveredBatch)
          flushPendingSave()
        }
      }
    }

    initAndRecover()

    return () => {
      isMounted = false
      // Route change / chapter navigation trigger: flush pending eligible changes
      flushPendingSave()
    }
  }, [work?.id, chapter?.id, storyMap])

  // 7. Save Triggers: Tab visibility, window blur, pagehide, and beforeunload
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave()
      }
    }

    const handleBlur = () => {
      flushPendingSave()
    }

    const handlePageExit = () => {
      flushPendingSave()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pagehide', handlePageExit)
    window.addEventListener('beforeunload', handlePageExit)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pagehide', handlePageExit)
      window.removeEventListener('beforeunload', handlePageExit)
    }
  }, [work?.id, chapter?.id])

  // 8. Strict Zero-Duplicate View Tracking (Book, Chapter, and implicit Act)
  useEffect(() => {
    if (!work || !chapter) return
    if (!isUserLoaded) return // MUST wait for auth state to resolve so logged-in users aren't falsely counted as anonymous first!
    if (isCompulsoryAuth) return // Do not track views on locked paywall chapters until authenticated
    if (typeof window === 'undefined') return

    let viewerKey: string
    if (user?.id) {
      // Deterministic cross-device identity for authenticated members (prevents duplicate reads on mobile vs laptop)
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

    trackStrictViewServerFn({
      data: {
        viewerKey,
        workId: work.id,
        chapterId: chapter.id,
      },
    }).catch(() => {})
  }, [work?.id, chapter?.id, isCompulsoryAuth, isUserLoaded, user?.id])
  // If user accesses reading route with raw UUID, auto-update URL bar to canonical slug
  useEffect(() => {
    if (work && chapter) {
      const canonicalSlug = getWorkSlug(work)
      if (workId !== canonicalSlug) {
        navigate({
          to: '/read/$workId/$chapterId',
          params: { workId: canonicalSlug, chapterId: chapter.id },
          replace: true,
        })
      }
    }
  }, [work, chapter, workId, navigate])

  if (!work && isWorksLoading) {
    return (
      <div className="py-24 px-4 max-w-xl mx-auto flex flex-col items-center justify-center">
        <TellnestLoader message="Loading chapter..." />
      </div>
    )
  }

  if (!work || !chapter) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto">
        <EmptyState
          type="no-works"
          customTitle="Chapter Not Found"
          customDescription="This chapter has either not been published yet or the link is invalid."
          actionLabel="Return to Work Overview"
          actionHref={work ? `/works/${canonicalSlug || work.id}` : "/discover"}
        />
      </div>
    )
  }

  const isAuthor = isOwnWork(work.id)
  const isDraftChapter = chapter.status === 'draft'

  if (isDraftChapter && !isAuthor) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto">
        <EmptyState
          type="no-works"
          customTitle="Unpublished Draft"
          customDescription="This chapter is currently in draft and has not been published yet by the author."
          actionLabel="Return to Table of Contents"
          actionHref={`/works/${getWorkSlug(work) || work.id}`}
        />
      </div>
    )
  }

  // Floating TOC, Inline Marginalia and Continuous Progression settings
  const [floatingTocEnabled, setFloatingTocEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('relay_reader_floating_toc')
      if (stored !== null) return stored === 'true'
    }
    return true
  })

  const [inlineMarginaliaEnabled, setInlineMarginaliaEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('relay_reader_inline_marginalia')
      if (stored !== null) return stored === 'true'
    }
    return true
  })

  const [continuousScrollEnabled, setContinuousScrollEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('relay_reader_continuous_scroll')
      if (stored !== null) return stored === 'true'
    }
    return true
  })

  // Synchronize with external changes or Profile Settings updates in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const tocVal = localStorage.getItem('relay_reader_floating_toc')
        if (tocVal !== null) setFloatingTocEnabled(tocVal === 'true')
        const marVal = localStorage.getItem('relay_reader_inline_marginalia')
        if (marVal !== null) setInlineMarginaliaEnabled(marVal === 'true')
        const scrollVal = localStorage.getItem('relay_reader_continuous_scroll')
        if (scrollVal !== null) setContinuousScrollEnabled(scrollVal === 'true')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Keyboard shortcut: Press 'T' to toggle Chapter Table of Contents drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if auth modal is open or if user is typing in an input
      if (
        isAuthModalOpen ||
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        setDrawerOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAuthModalOpen])

  // 1. Atmosphere Theme Resolution
  // Prioritize active reader theme or siteTheme: linen -> theme-sepia theme-linen, sage -> theme-sage, paper -> theme-paper, obsidian/dark -> dark
  const activeReaderTheme = useMemo(() => {
    if (readerSettings.theme === 'dark' || siteTheme === 'dark') return 'dark'
    if (siteTheme === 'sage') return 'theme-sage'
    if (siteTheme === 'paper') return 'theme-paper'
    if (siteTheme === 'linen' || siteTheme === 'sepia' || readerSettings.theme === 'sepia') return 'theme-sepia theme-linen'
    return ''
  }, [readerSettings.theme, siteTheme])

  // Typography styling mappings based on Reader Settings
  const widthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-3xl'
  }[readerSettings.readingWidth] || 'max-w-2xl'

  // 2. Reader Font Scaling Resolution (exact pixel calibration: 15px, 17px, 20px, 24px or arbitrary numbers)
  const sizeClasses = useMemo(() => {
    const s = String(readerSettings.fontSize || 'base')
    if (s === '15' || s === 'sm') return 'text-[15px] sm:text-[15px]'
    if (s === '17' || s === 'base') return 'text-[17px] sm:text-[17px]'
    if (s === '20' || s === 'lg') return 'text-[20px] sm:text-[20px]'
    if (s === '24' || s === 'xl') return 'text-[24px] sm:text-[24px]'
    // Boundary fallback if numeric value like 16, 18, 22 is passed
    const parsedNum = Number(s)
    if (!isNaN(parsedNum) && parsedNum >= 12 && parsedNum <= 36) {
      return `text-[${parsedNum}px] sm:text-[${parsedNum}px]`
    }
    return 'text-[17px] sm:text-[17px]'
  }, [readerSettings.fontSize])

  const activeLineHeight = useMemo(() => {
    if (typeof readerSettings.customLineHeight === 'number' && readerSettings.customLineHeight > 0) {
      return readerSettings.customLineHeight
    }
    const lh = readerSettings.lineHeight
    if (typeof lh === 'number' && lh > 0) return lh
    if (lh === 'tight') return 1.4
    if (lh === 'normal') return 1.7
    if (lh === 'relaxed') return 1.85
    if (lh === 'loose') return 2.0
    return 1.7
  }, [readerSettings.customLineHeight, readerSettings.lineHeight])

  const activeParagraphGap =
    readerSettings.paragraphSpacing !== undefined
      ? `${readerSettings.paragraphSpacing}px`
      : '18px'

  // 3. Typeface Resolution (Outfit Display / Editorial serif, Inter sans, JetBrains mono)
  const fontClass = useMemo(() => {
    const f = readerSettings.fontFamily as string
    if (f === 'sans' || f === 'Inter') return 'font-sans'
    if (f === 'mono' || f === 'JetBrains Mono') return 'font-mono'
    return 'font-editorial font-serif'
  }, [readerSettings.fontFamily])

  const paragraphs = rawParagraphTexts
  const canonicalSlug = getWorkSlug(work)

  return (
    <div
      className={`min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition-colors duration-200 ${activeReaderTheme}`}
    >
      {/* Sticky Subtle Reading Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-md transition-colors">
        {/* Whole-Story Progress Bar at very top */}
        <div
          className="h-0.5 bg-[var(--ink-primary)] transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="mx-auto flex h-10 max-w-4xl items-center justify-between px-3 sm:px-4">
          {/* Left: Back to Work */}
          <Link
            to="/works/$workId"
            params={{ workId: canonicalSlug }}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline truncate max-w-[180px]">{work.title}</span>
            <span className="sm:hidden text-[11px]">Back</span>
          </Link>

          {/* Center: Current Chapter Index indicator */}
          <div className="text-center font-mono text-[11px] text-[var(--ink-muted)] truncate max-w-[200px] sm:max-w-none">
            <span className="font-semibold text-[var(--ink-primary)]">Ch. {chapter.number}</span>
            <span className="hidden md:inline text-[var(--ink-faint)]"> / {work.publishedChaptersCount ?? work.chaptersCount} • {Math.round(progressPercent)}% read</span>
          </div>

          {/* Right: Reading Display & Audio Reader Triggers */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Audio Reader (TTS) Trigger */}
            {audio.isSupported && (
              <button
                type="button"
                onClick={() => {
                  if (!isAudioOpen) {
                    setIsAudioOpen(true)
                    audio.play()
                  } else {
                    audio.togglePlay()
                  }
                }}
                className={`flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
                  isAudioOpen && audio.isPlaying && !audio.isPaused
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : isAudioOpen
                    ? 'text-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
                title={
                  isAudioOpen && audio.isPlaying && !audio.isPaused
                    ? 'Pause Audio Reader'
                    : 'Listen to Chapter (Audio Reader)'
                }
                aria-label="Listen to chapter audio"
              >
                <Headphones className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            )}

            <button
              onClick={() => setShareModalOpen(true)}
              className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              title="Share Chapter"
              aria-label="Share this chapter"
            >
              <Share2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 sm:h-7 sm:w-7 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
              title="Typography & Display Settings"
              aria-label="Open typography and display settings"
            >
              <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Private Draft Preview Banner for Authors */}
      {isDraftChapter && isAuthor && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-mono font-medium text-amber-800 dark:text-amber-300">
          Private Author Preview • This chapter is currently an unpublished draft. Readers cannot see this.
        </div>
      )}

      {/* READING CANVAS — Distraction Free and Dominating the Screen */}
      <main className={`mx-auto px-4 sm:px-8 pt-2 sm:pt-3 pb-8 sm:pb-12 ${widthClasses}`}>
        
        {/* Chapter Banner Image with Overlapping Floating Book Title Badge */}
        {chapter.bannerImage && !bannerImageFailed ? (
          <div className="relative mb-5 pt-3">
            {/* Overlapping Badge protruding outside top-left of the image */}
            <div className="absolute top-0 left-3 sm:left-4 z-10">
              <Link
                to="/works/$workId"
                params={{ workId: work.id }}
                className="inline-flex items-center px-3 py-1 rounded-md bg-[var(--bg-canvas)]/95 hover:bg-[var(--bg-surface)] text-[var(--ink-primary)] font-mono text-[11px] font-semibold tracking-wider uppercase border border-[var(--border-strong)] shadow-md backdrop-blur-md transition-all hover:scale-[1.02] no-underline"
              >
                <span className="truncate max-w-[260px] sm:max-w-[400px]">{work.title}</span>
              </Link>
            </div>

            {/* Banner Image Container */}
            <div className="w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-xs">
              <img
                src={getOptimizedImageUrl(chapter.bannerImage, { width: 1200, quality: 'auto' })}
                alt={chapter.title}
                onError={() => setBannerImageFailed(true)}
                className="w-full h-36 sm:h-48 md:h-56 object-cover object-center"
                loading="lazy"
              />
            </div>
          </div>
        ) : null}

        {/* Work & Chapter Title Header - Ultra-Compact Layout */}
        <div className="pb-2.5 mb-4 sm:pb-3 sm:mb-5 border-b border-[var(--border-subtle)] space-y-1">
          {/* Top Breadcrumb & Desktop Metadata Line */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] font-mono text-[var(--ink-muted)]">
            <div className="flex items-center gap-1.5 truncate">
              {(!chapter.bannerImage || bannerImageFailed) && (
                <>
                  <Link
                    to="/works/$workId"
                    params={{ workId: work.id }}
                    className="uppercase tracking-wider font-semibold text-[var(--ink-primary)] hover:underline no-underline truncate max-w-[200px]"
                  >
                    {work.title}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="font-semibold text-[var(--ink-primary)]">Ch. {chapter.number}</span>
            </div>

            {/* Desktop-Only Metadata (on Mobile, displayed directly below Heading & Actions) */}
            <div className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--ink-faint)]">
              <Link
                to="/author/$authorId"
                params={{ authorId: work.author.handle || work.author.id }}
                className="hover:text-[var(--ink-primary)] transition-colors cursor-pointer text-left no-underline text-inherit"
                title="View Author Profile"
              >
                by {work.author.showName !== false ? work.author.name : (work.author.showUsername !== false ? `@${work.author.handle}` : 'Author')}
              </Link>
              <span>•</span>
              <span>{chapter.readTimeMinutes} min read</span>
              <span>•</span>
              <span>{chapter.wordCount.toLocaleString()} words</span>
            </div>
          </div>

          {/* Chapter Title Row */}
          <div className="flex items-start justify-between gap-4 pt-0.5">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)] leading-tight tracking-tight flex-1 break-words">
              {chapter.title}
            </h1>

            {/* Desktop-Only Actions: Views Count Badge & Chapter Heart Button */}
            <div className="hidden sm:flex items-center shrink-0 pt-0.5 gap-2">
              <button
                type="button"
                onClick={() => setViewsModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-[11px] font-mono border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group"
                title={`${formatViewCount(work.totalReads, false)} views • Click to view breakdown`}
                aria-label="View readership breakdown"
              >
                <Eye className="h-3.5 w-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-colors" />
                <span className="font-semibold">{formatViewCount(work.totalReads, true)}</span>
              </button>

              <ChapterHeartButton
                workId={work.id}
                chapterId={chapter.id}
                chapterTitle={chapter.title}
                variant="badge"
              />
            </div>
          </div>

          {/* Mobile-Only Actions Row (Views Count & Like/Heart Directly Under Heading) */}
          <div className="flex sm:hidden items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={() => setViewsModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-[11px] font-mono border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group"
              title={`${formatViewCount(work.totalReads, false)} views • Click to view breakdown`}
              aria-label="View readership breakdown"
            >
              <Eye className="h-3.5 w-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-colors" />
              <span className="font-semibold">{formatViewCount(work.totalReads, true)}</span>
            </button>

            <ChapterHeartButton
              workId={work.id}
              chapterId={chapter.id}
              chapterTitle={chapter.title}
              variant="badge"
            />
          </div>

          {/* Mobile-Only Metadata (Writer Name, Min Reads & Words Directly After Heading & Actions) */}
          <div className="flex sm:hidden items-center flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--ink-faint)] pt-1">
            <Link
              to="/author/$authorId"
              params={{ authorId: work.author.handle || work.author.id }}
              className="hover:text-[var(--ink-primary)] transition-colors cursor-pointer text-left font-medium text-[var(--ink-muted)] no-underline text-inherit"
              title="View Author Profile"
            >
              by {work.author.showName !== false ? work.author.name : (work.author.showUsername !== false ? `@${work.author.handle}` : 'Author')}
            </Link>
            <span>•</span>
            <span>{chapter.readTimeMinutes} min read</span>
            <span>•</span>
            <span>{chapter.wordCount.toLocaleString()} words</span>
          </div>

          {chapter.subtitle && (
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-muted)] italic pt-0.5">
              {chapter.subtitle}
            </p>
          )}
        </div>

        {/* Optional "Resume Reading" Prompt for Readers Returning Mid-Chapter */}
        {resumePromptVisible && existingChapterPercent > 0 && !isCompulsoryAuth && (
          <div className="mb-6 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/80 backdrop-blur-xs flex items-center justify-between gap-3 text-xs font-mono text-[var(--ink-secondary)] animate-in fade-in">
            <div className="flex items-center gap-2 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-primary)] shrink-0" />
              <span className="truncate">
                You previously read to {existingChapterPercent}%.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setResumePromptVisible(false)
                  // 1. First attempt: paragraph-level position restoration
                  let restoredToParagraph = false
                  if (lastPosition?.paragraphId) {
                    const targetEl = document.getElementById(lastPosition.paragraphId)
                    if (targetEl) {
                      const elTop = targetEl.getBoundingClientRect().top + window.scrollY
                      window.scrollTo({ top: Math.max(0, elTop - 80), behavior: 'smooth' })
                      restoredToParagraph = true
                    }
                  } else if (existingProg?.position && articleRef.current) {
                    try {
                      const posMeta = JSON.parse(existingProg.position)
                      if (posMeta.paragraphId) {
                        const targetEl = document.getElementById(posMeta.paragraphId)
                        if (targetEl) {
                          const elTop = targetEl.getBoundingClientRect().top + window.scrollY
                          window.scrollTo({ top: Math.max(0, elTop - 80), behavior: 'smooth' })
                          restoredToParagraph = true
                        }
                      } else if (typeof posMeta.p === 'number') {
                        const targetEl = articleRef.current.querySelector(`[data-paragraph-index="${posMeta.p}"]`)
                        if (targetEl) {
                          const elTop = targetEl.getBoundingClientRect().top + window.scrollY
                          window.scrollTo({ top: Math.max(0, elTop - 80), behavior: 'smooth' })
                          restoredToParagraph = true
                        }
                      }
                    } catch {}
                  }

                  // 2. Fallback: percentage-based scroll restoration
                  if (!restoredToParagraph && articleRef.current) {
                    const rect = articleRef.current.getBoundingClientRect()
                    const articleTop = window.scrollY + rect.top
                    const articleHeight = rect.height || articleRef.current.offsetHeight
                    const maxScroll = articleTop + articleHeight - window.innerHeight
                    if (maxScroll > 0) {
                      const targetY = (existingChapterPercent / 100) * maxScroll
                      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
                    }
                  }
                }}
                className="font-semibold text-[var(--ink-primary)] hover:underline cursor-pointer"
              >
                Resume →
              </button>
              <button
                type="button"
                onClick={() => setResumePromptVisible(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer px-1"
                title="Dismiss"
                aria-label="Dismiss resume prompt"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Narrative Prose */}
        <article
          ref={articleRef}
          style={{ lineHeight: activeLineHeight }}
          className={`${fontClass} ${sizeClasses} text-[var(--ink-secondary)] select-text break-words`}
        >
          {isCompulsoryAuth ? (
            <div className="space-y-6">
              {/* Preview of first paragraph fading into blur */}
              {rawParagraphTexts.length > 0 && (
                <div className="relative overflow-hidden max-h-36 select-none">
                  <p
                    style={{
                      marginBottom: activeParagraphGap,
                      lineHeight: activeLineHeight,
                    }}
                    className={`whitespace-pre-line break-words ${
                      readerSettings.fontFamily === 'serif'
                        ? 'first-letter:font-serif first-letter:text-4xl first-letter:float-left first-letter:pr-2.5 first-letter:leading-none first-letter:text-[var(--ink-primary)] first-letter:font-bold'
                        : ''
                    }`}
                  >
                    {renderChapterParagraph(rawParagraphTexts[0] || '')}
                  </p>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-canvas)]/80 to-[var(--bg-canvas)] pointer-events-none" />
                </div>
              )}

              {/* Locked Story Gate Card */}
              <div className="my-6 p-6 sm:p-8 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-center space-y-4 shadow-lg animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-[var(--ink-primary)] text-[var(--bg-canvas)] flex items-center justify-center mx-auto shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)] tracking-tight">
                    {isSingleChapterStory ? 'Sign In to Read Full Story' : `Create Free Account to Read Chapter ${chapter?.number || 2}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
                    {isSingleChapterStory
                      ? 'Sign in or create a free Hatchpen account to access this complete work and support the author.'
                      : 'You have reached the end of your free preview chapter. Join Hatchpen for free to continue reading and unlock the rest of the manuscript.'}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      openAuthModal(typeof window !== 'undefined' ? window.location.pathname : undefined, {
                        canClose: false,
                        title: isSingleChapterStory ? 'Sign In to Read Story' : 'Create Account to Continue',
                        reason: isSingleChapterStory
                          ? 'Create a free account or sign in to read this serialized release.'
                          : `You have completed your free preview of Chapter 1. Create a free account or sign in to read ${chapter.title} and beyond.`,
                      })
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Sign In / Sign Up to Continue
                  </button>
                </div>
              </div>
            </div>
          ) : currentChapterParagraphs.length === 0 ? (
            <div className="py-12 text-center text-[var(--ink-muted)] italic font-serif">
              This chapter has no narrative prose content yet.
            </div>
          ) : (
            currentChapterParagraphs.map((pInfo, idx) => {
              const isSpeaking = isAudioOpen && audio.isPlaying && audio.currentParagraphIndex === idx
              return (
                <p
                  key={pInfo.id}
                  id={pInfo.id}
                  data-paragraph-id={pInfo.id}
                  data-paragraph-order={pInfo.orderIndex}
                  data-paragraph-index={idx}
                  onClick={() => {
                    if (isAudioOpen) {
                      audio.jumpToParagraph(idx)
                    }
                  }}
                  style={{
                    marginBottom: activeParagraphGap,
                    lineHeight: activeLineHeight,
                  }}
                  className={`whitespace-pre-line break-words transition-all duration-300 ${
                    isAudioOpen ? 'cursor-pointer' : ''
                  } ${
                    isSpeaking
                      ? 'bg-[var(--bg-subtle)]/80 text-[var(--ink-primary)] rounded-xl px-3 py-2 -mx-3 border-l-4 border-l-[var(--ink-primary)] shadow-2xs'
                      : ''
                  } ${
                    idx === 0 && readerSettings.fontFamily === 'serif' && !isSpeaking
                      ? 'first-letter:font-serif first-letter:text-4xl first-letter:float-left first-letter:pr-2.5 first-letter:leading-none first-letter:text-[var(--ink-primary)] first-letter:font-bold'
                      : ''
                  }`}
                  title={isAudioOpen ? 'Click to listen from this paragraph' : undefined}
                >
                  {renderChapterParagraph(paragraphs[idx] || '')}
                </p>
              )
            })
          )}
        </article>

        {/* End of Chapter Ornament */}
        <div className="py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-3 text-[var(--border-strong)]">
            <span className="h-px w-12 bg-current" />
            <span className="font-serif text-sm italic text-[var(--ink-muted)]">§</span>
            <span className="h-px w-12 bg-current" />
          </div>
          {progressPercent >= 100 && (
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--ink-muted)] animate-in fade-in duration-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Story Completed (100%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Chapter Navigation Controls (Next Chapter prioritized on mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-8 border-y border-[var(--border-subtle)] font-sans">
          {/* Next Chapter Card (order-1 on mobile, right on desktop) */}
          {nextChapter ? (
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: canonicalSlug, chapterId: nextChapter.id }}
              className="order-1 sm:order-2 group flex flex-col items-start sm:items-end sm:text-right p-4 rounded-lg border border-[var(--ink-primary)] sm:border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 sm:bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] transition-all no-underline text-inherit shadow-2xs hover:shadow-xs"
              aria-label={`Advance to Next Chapter: ${nextChapter.number}. ${nextChapter.title}`}
            >
              <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                Next Chapter {!isSignedIn && <Lock className="h-3 w-3 text-amber-500 inline ml-0.5" />}
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="mt-1 font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] group-hover:underline truncate w-full">
                {nextChapter.number}. {nextChapter.title}
              </span>
            </Link>
          ) : (
            <div className="order-1 sm:order-2 p-4 rounded-lg border border-dashed border-[var(--border-subtle)] text-left sm:text-right">
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">You have caught up to latest release</span>
            </div>
          )}

          {/* Previous Chapter Card (order-2 on mobile, left on desktop) */}
          {prevChapter ? (
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: canonicalSlug, chapterId: prevChapter.id }}
              className="order-2 sm:order-1 group flex flex-col p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] transition-all no-underline text-inherit"
              aria-label={`Go to Previous Chapter: ${prevChapter.number}. ${prevChapter.title}`}
            >
              <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                <ChevronLeft className="h-3 w-3" />
                Previous Chapter
              </span>
              <span className="mt-1 font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] group-hover:underline truncate">
                {prevChapter.number}. {prevChapter.title}
              </span>
            </Link>
          ) : (
            <div className="order-2 sm:order-1 p-4 rounded-lg border border-dashed border-[var(--border-subtle)] opacity-40">
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">Beginning of Manuscript</span>
            </div>
          )}
        </div>

        {/* Reader Comments / Marginalia Section Toggle */}
        {inlineMarginaliaEnabled && !isCompulsoryAuth ? (
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={() => setCommentsVisible(!commentsVisible)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-all cursor-pointer shadow-2xs hover:shadow-xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{commentsVisible ? 'Hide Reader Reflections & Marginalia' : 'View Reader Reflections & Marginalia'}</span>
            </button>
            {commentsVisible && (
              <div className="w-full">
                <CommentsSection
                  workId={work.id}
                  chapterId={chapter.id}
                  workAuthorId={work.author?.id}
                  workAuthorHandle={work.author?.handle}
                />
              </div>
            )}
          </div>
        ) : null}

      </main>

      {/* Reader Settings Modal */}
      <ReaderSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Chapter Drawer */}
      <ChapterDrawer
        work={work}
        currentChapterId={chapter.id}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* 3-Layer Views Breakdown Modal (Read-only on public reader page) */}
      <ViewsBreakdownModal
        isOpen={viewsModalOpen}
        onClose={() => setViewsModalOpen(false)}
        work={work}
        allowAdminAdjust={false}
      />

      {/* Author Profile Popup / Mobile Bottom Sheet Drawer */}
      {work?.author && (
        <AuthorProfileModal
          isOpen={authorModalOpen}
          onClose={() => setAuthorModalOpen(false)}
          author={work.author}
        />
      )}

      {/* Share Chapter Modal */}
      {work && chapter && (
        <ShareStoryModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          title={`${work.title} — ${chapter.title}`}
          authorName={work.author?.name || 'HatchPen Author'}
          url={typeof window !== 'undefined' ? window.location.href : `https://hatchpen.com/read/${work.id}/${chapter.id}`}
          cover={work.cover}
        />
      )}

      {/* Floating Table of Contents (Quick Drawer) FAB Button */}
      {floatingTocEnabled && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)] shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer group active:scale-95 min-h-[44px] min-w-[44px]"
            title="Chapter Index (Shortcut: 'T')"
            aria-label="Open Chapter Index Drawer"
          >
            <ListFilter className="h-4 w-4 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-colors" />
            <span className="font-mono text-xs font-semibold hidden sm:inline">Index</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-[var(--ink-faint)] bg-[var(--bg-subtle)] rounded border border-[var(--border-subtle)]">
              T
            </kbd>
          </button>
        </div>
      )}
      {/* Reader Quote Highlighter Tooltip */}
      {work && chapter && (
        <ReaderQuoteShareTooltip
          containerRef={articleRef}
          storyTitle={work.title}
          authorName={work.author?.name || 'HatchPen Author'}
          chapterTitle={chapter.title}
          workId={work.id}
          chapterId={chapter.id}
          canonicalUrl={`https://hatchpen.com/read/${canonicalSlug}/${chapter.id}`}
        />
      )}

      {/* Floating Audio Reader Dock */}
      {isAudioOpen && audio.isSupported && (
        <ChapterAudioPlayer
          isPlaying={audio.isPlaying}
          isPaused={audio.isPaused}
          currentParagraphIndex={audio.currentParagraphIndex}
          totalParagraphs={audio.totalParagraphs}
          voiceGender={audio.voiceGender}
          playbackRate={audio.playbackRate}
          activeVoiceName={audio.activeVoiceName}
          speechError={audio.speechError}
          onTogglePlay={audio.togglePlay}
          onNextParagraph={audio.nextParagraph}
          onPrevParagraph={audio.prevParagraph}
          onSetVoiceGender={audio.setVoiceGender}
          onSetPlaybackRate={audio.setPlaybackRate}
          onClose={() => {
            audio.stop()
            setIsAudioOpen(false)
          }}
        />
      )}
    </div>
  )
}
