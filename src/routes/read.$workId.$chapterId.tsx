import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import ReaderSettingsModal from '../components/ReaderSettingsModal'
import ChapterDrawer from '../components/ChapterDrawer'
import CommentsSection from '../components/CommentsSection'
import EmptyState from '../components/EmptyState'
import { TellnestLoader } from '../components/TellnestLoader'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  ListFilter,
  Type,
  MessageSquare,
  Share2,
  Eye,
} from 'lucide-react'
import { WORKS, getWorkSlug } from '../data/mockData'
import { generateMeta } from '../lib/seo'
import { getPublicWorkServerFn, trackStrictViewServerFn } from '../server/works'
import { getOptimizedImageUrl } from '../lib/cloudinary'
import { ViewsBreakdownModal } from '../components/ViewsBreakdownModal'
import { formatViewCount } from '../lib/utils'

export const Route = createFileRoute('/read/$workId/$chapterId')({
  loader: async ({ params }) => {
    const rawParam = (params.workId || '').trim().toLowerCase()
    // 1. Static mock fast path
    const staticWork = WORKS.find(
      (w) =>
        w.id === params.workId ||
        (w.slug && w.slug.toLowerCase() === rawParam) ||
        getWorkSlug(w) === rawParam
    )
    if (staticWork) return { work: staticWork }

    // 2. Fetch full work from Supabase
    try {
      const dbWork = await getPublicWorkServerFn({ data: params.workId })
      if (dbWork) return { work: dbWork }
    } catch (e) {
      console.warn('[Route /read/$workId/$chapterId] Loader DB lookup error:', e)
    }

    return { work: null }
  },
  head: ({ params, loaderData }) => {
    const rawParam = params.workId.trim().toLowerCase()
    let work = loaderData?.work

    if (!work) {
      work = WORKS.find(
        (w) =>
          w.id === params.workId ||
          (w.slug && w.slug.toLowerCase() === rawParam) ||
          getWorkSlug(w) === rawParam
      )
    }

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
      work?.chapters[0]

    if (!work || !chapter) {
      return generateMeta({
        title: 'Chapter Not Found',
        noindex: true,
      })
    }

    const canonicalSlug = getWorkSlug(work)
    const title = `${chapter.title} — ${work.title} by ${work.author.name}`
    const excerpt =
      (chapter.content || chapter.subtitle || work.synopsis).slice(0, 150).replace(/\n/g, ' ').trim() + '...'

    return generateMeta({
      title,
      description: excerpt,
      canonicalUrl: `https://hatchpen.com/read/${canonicalSlug}/${chapter.id}`,
      ogType: 'article',
      ogImage: work.cover,
      author: work.author.name,
      keywords: [work.title, chapter.title, work.author.name, 'read chapter online', 'serialized fiction'],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `${chapter.title} (${work.title})`,
        author: {
          '@type': 'Person',
          name: work.author.name,
          url: `https://hatchpen.com/author/${work.author.id}`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Hatchpen',
          url: 'https://hatchpen.com',
        },
        image: work.cover,
        description: excerpt,
        mainEntityOfPage: `https://hatchpen.com/read/${work.id}/${chapter.id}`,
      },
    })
  },
  component: ReaderPage,
})

function formatInlineMarkdown(text: string): React.ReactNode {
  // Regex matches:
  // 1. Bold (**text** or __text__)
  // 2. Italic (*text* or _text_)
  // 3. Strikethrough (~~text~~)
  // 4. Inline code (`code`)
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|~~[^~]+~~|`[^`]+`)/g
  const parts = text.split(regex)
  if (parts.length === 1) return text

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
  const trimmed = text.trim()

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

  return formatInlineMarkdown(text)
}

function ReaderPage() {
  const { workId, chapterId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const navigate = useNavigate()
  const {
    getWorkById,
    allWorks,
    isWorksLoading,
    readerSettings,
    isWorkSaved,
    toggleSaveWork,
    updateReadingProgress,
    showToast
  } = useApp()

  const work = useMemo(() => {
    // 0. Route loader fast path (SSR synced)
    if (loaderData?.work) return loaderData.work

    // 1. Context lookup
    const fromCtx = getWorkById(workId)
    if (fromCtx) return fromCtx

    // 2. Static mock fallback
    const rawParam = workId.trim().toLowerCase()
    const staticMatch = WORKS.find(
      (w) =>
        w.id === workId ||
        (w.slug && w.slug.toLowerCase() === rawParam) ||
        getWorkSlug(w) === rawParam
    )
    if (staticMatch) return staticMatch

    // 3. LocalStorage admin fallback
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
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
  const [scrollProgress, setScrollProgress] = useState(0)
  const [commentsVisible, setCommentsVisible] = useState(false)
  const [bannerImageFailed, setBannerImageFailed] = useState(false)
  const [viewsModalOpen, setViewsModalOpen] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('tellnest_admin_session_token') || localStorage.getItem('tellnest_admin_session_token')
    }
    return null
  })

  // Find chapter with flexible ID or number matching, defaulting to first chapter if available
  const currentChapterIndex = useMemo(() => {
    if (!work || !work.chapters.length) return -1
    const idx = work.chapters.findIndex((c) => c.id === chapterId || c.number.toString() === chapterId)
    return idx !== -1 ? idx : 0
  }, [work, chapterId])

  const chapter = work?.chapters[currentChapterIndex]
  const prevChapter = currentChapterIndex > 0 ? work?.chapters[currentChapterIndex - 1] : null
  const nextChapter = work && currentChapterIndex < work.chapters.length - 1 ? work.chapters[currentChapterIndex + 1] : null

  // Reset banner state when navigating to another chapter
  useEffect(() => {
    setBannerImageFailed(false)
  }, [chapter?.id])

  // Track scroll progress for reading bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight
      if (totalHeight > 0) {
        const current = (window.scrollY / totalHeight) * 100
        setScrollProgress(Math.min(100, Math.max(0, current)))
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Strict Zero-Duplicate View Tracking (Book, Chapter, and implicit Act)
  useEffect(() => {
    if (!work || !chapter) return
    if (typeof window === 'undefined') return

    // Get or initialize persistent unique visitor key
    let viewerKey = localStorage.getItem('tellnest_viewer_uuid')
    if (!viewerKey) {
      viewerKey = 'v-' + Math.random().toString(36).substring(2) + Date.now().toString(36)
      localStorage.setItem('tellnest_viewer_uuid', viewerKey)
    }

    // Call server function to record deduplicated view
    trackStrictViewServerFn({
      data: {
        viewerKey,
        workId: work.id,
        chapterId: chapter.id,
      },
    }).catch(() => {})
  }, [work?.id, chapter?.id])

  // Update progress in context
  useEffect(() => {
    if (work && chapter) {
      updateReadingProgress(work.id, {
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        progressPercent: Math.round(scrollProgress)
      })
    }
  }, [work, chapter, Math.floor(scrollProgress / 10)])

  // SEO Canonical URL Enforcement:
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
        <TellnestLoader message="Retrieving manuscript folio & chapter..." />
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
          actionHref="/discover"
        />
      </div>
    )
  }

  const saved = isWorkSaved(work.id)

  // Typography styling mappings based on Reader Settings
  const widthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-3xl'
  }[readerSettings.readingWidth]

  const sizeClasses = {
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl',
  }[readerSettings.fontSize]

  const activeLineHeight =
    readerSettings.customLineHeight ||
    (readerSettings.lineHeight === 'tight'
      ? 1.35
      : readerSettings.lineHeight === 'normal'
      ? 1.5
      : readerSettings.lineHeight === 'relaxed'
      ? 1.75
      : 2.0)

  const activeParagraphGap =
    readerSettings.paragraphSpacing !== undefined
      ? `${readerSettings.paragraphSpacing}px`
      : '16px'

  const fontClass = {
    serif: 'font-editorial',
    sans: 'font-sans',
    mono: 'font-mono',
  }[readerSettings.fontFamily]

  const paragraphs = chapter.content
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const canonicalSlug = getWorkSlug(work)

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        readerSettings.theme === 'sepia' ? 'theme-sepia' : ''
      }`}
    >
      {/* Sticky Subtle Reading Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-md transition-colors">
        {/* Scroll Progress Bar at very top */}
        <div
          className="h-0.5 bg-[var(--ink-primary)] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
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
            <span className="hidden md:inline text-[var(--ink-faint)]"> / {work.chaptersCount} • {Math.round(scrollProgress)}% read</span>
          </div>

          {/* Right: Minimal Reader Controls */}
          <div className="flex items-center gap-0.5">
            {/* Table of Chapters Drawer Trigger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              title="Chapter Index"
            >
              <ListFilter className="h-3.5 w-3.5" />
            </button>

            {/* Reading Typography Settings Trigger */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              title="Typography & Display Settings"
            >
              <Type className="h-3.5 w-3.5" />
            </button>

            {/* Save Work Bookmark Toggle */}
            <button
              onClick={() => toggleSaveWork(work.id)}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors cursor-pointer ${
                saved
                  ? 'text-[var(--ink-primary)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
              title={saved ? 'Remove from Library' : 'Save Work'}
            >
              <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </header>

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
          {/* Top Breadcrumb & Metadata Line */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
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

            <div className="flex items-center gap-2 text-[10px] text-[var(--ink-faint)] shrink-0">
              <Link
                to="/author/$authorId"
                params={{ authorId: work.author.id }}
                className="hover:text-[var(--ink-primary)] transition-colors no-underline"
              >
                by {work.author.name}
              </Link>
              <span>•</span>
              <span>{chapter.readTimeMinutes} min read</span>
              <span>•</span>
              <span>{chapter.wordCount.toLocaleString()} words</span>
            </div>
          </div>

          {/* Chapter Title Row with Views and Bookmark Action on the Right */}
          <div className="flex items-start justify-between gap-4 pt-0.5">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)] leading-tight tracking-tight flex-1">
              {chapter.title}
            </h1>

            {/* Right side: Views Count & Save Bookmark */}
            <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
              {/* Views Count Badge - Clickable to open Breakdown Modal */}
              <button
                type="button"
                onClick={() => setViewsModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-[11px] font-mono border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all cursor-pointer shadow-2xs group"
                title={`${formatViewCount(work.totalReads, false)} views • Click to view breakdown`}
              >
                <Eye className="h-3.5 w-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-colors" />
                <span className="font-semibold">{formatViewCount(work.totalReads, true)}</span>
              </button>

              {/* Bookmark / Saved Icon Button */}
              <button
                onClick={() => toggleSaveWork(work.id)}
                className={`flex h-7.5 items-center gap-1.5 px-2.5 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                  saved
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)] shadow-xs font-medium'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-muted)]'
                }`}
                title={saved ? 'Saved in your library (click to remove)' : 'Save to your library'}
              >
                <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          {chapter.subtitle && (
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-muted)] italic">
              {chapter.subtitle}
            </p>
          )}
        </div>

        {/* Narrative Prose */}
        <article
          style={{ lineHeight: activeLineHeight }}
          className={`${fontClass} ${sizeClasses} text-[var(--ink-secondary)] select-text`}
        >
          {paragraphs.map((p, idx) => (
            <p
              key={idx}
              style={{
                marginBottom: activeParagraphGap,
                lineHeight: activeLineHeight,
              }}
              className={`whitespace-pre-line ${
                idx === 0 && readerSettings.fontFamily === 'serif'
                  ? 'first-letter:font-serif first-letter:text-4xl first-letter:float-left first-letter:pr-2.5 first-letter:leading-none first-letter:text-[var(--ink-primary)] first-letter:font-bold'
                  : ''
              }`}
            >
              {renderChapterParagraph(p)}
            </p>
          ))}
        </article>

        {/* End of Chapter Ornament */}
        <div className="py-16 text-center">
          <div className="inline-flex items-center gap-3 text-[var(--border-strong)]">
            <span className="h-px w-12 bg-current" />
            <span className="font-serif text-sm italic text-[var(--ink-muted)]">§</span>
            <span className="h-px w-12 bg-current" />
          </div>
        </div>

        {/* Chapter Navigation Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-8 border-y border-[var(--border-subtle)] font-sans">
          {prevChapter ? (
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: canonicalSlug, chapterId: prevChapter.id }}
              className="group flex flex-col p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] transition-all no-underline text-inherit"
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
            <div className="p-4 rounded-lg border border-dashed border-[var(--border-subtle)] opacity-40">
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">Beginning of Manuscript</span>
            </div>
          )}

          {nextChapter ? (
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: canonicalSlug, chapterId: nextChapter.id }}
              className="group flex flex-col items-end text-right p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] transition-all no-underline text-inherit"
            >
              <span className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                Next Chapter
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="mt-1 font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] group-hover:underline truncate">
                {nextChapter.number}. {nextChapter.title}
              </span>
            </Link>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-[var(--border-subtle)] text-right">
              <span className="text-[11px] font-mono text-[var(--ink-muted)]">You have caught up to latest release</span>
            </div>
          )}
        </div>

        {/* Reader Comments Section Toggle / View */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setCommentsVisible(!commentsVisible)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{commentsVisible ? 'Hide Reader Reflections' : 'View Reader Reflections & Discussion'}</span>
          </button>
        </div>

        {commentsVisible && (
          <CommentsSection workId={work.id} chapterId={chapter.id} />
        )}

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
    </div>
  )
}
