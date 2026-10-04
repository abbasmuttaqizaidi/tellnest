import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import ReaderSettingsModal from '../components/ReaderSettingsModal'
import ChapterDrawer from '../components/ChapterDrawer'
import CommentsSection from '../components/CommentsSection'
import EmptyState from '../components/EmptyState'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  ListFilter,
  Type,
  MessageSquare,
  Share2,
  CheckCircle2
} from 'lucide-react'

export const Route = createFileRoute('/read/$workId/$chapterId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { workId, chapterId } = Route.useParams()
  const {
    getWorkById,
    readerSettings,
    isWorkSaved,
    toggleSaveWork,
    updateReadingProgress,
    showToast
  } = useApp()

  const work = getWorkById(workId)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [commentsVisible, setCommentsVisible] = useState(false)

  // Find chapter
  const currentChapterIndex = useMemo(() => {
    if (!work) return -1
    return work.chapters.findIndex((c) => c.id === chapterId)
  }, [work, chapterId])

  const chapter = work?.chapters[currentChapterIndex]
  const prevChapter = currentChapterIndex > 0 ? work?.chapters[currentChapterIndex - 1] : null
  const nextChapter = work && currentChapterIndex < work.chapters.length - 1 ? work.chapters[currentChapterIndex + 1] : null

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
    sm: 'text-base sm:text-lg',
    base: 'text-lg sm:text-xl',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl'
  }[readerSettings.fontSize]

  const lineClasses = {
    tight: 'leading-normal',
    normal: 'leading-relaxed',
    relaxed: 'leading-loose',
    loose: 'leading-[2.2]'
  }[readerSettings.lineHeight]

  const fontClass = {
    serif: 'font-editorial',
    sans: 'font-sans',
    mono: 'font-mono'
  }[readerSettings.fontFamily]

  const paragraphs = chapter.content.split('\n\n').filter(Boolean)

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        readerSettings.theme === 'sepia' ? 'theme-sepia' : ''
      }`}
    >
      {/* Sticky Subtle Reading Header */}
      <header className="sticky top-0 z-30 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/90 backdrop-blur-md transition-colors">
        {/* Scroll Progress Bar at very top */}
        <div
          className="h-0.5 bg-[var(--ink-primary)] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          
          {/* Left: Back to Work */}
          <Link
            to="/works/$workId"
            params={{ workId: work.id }}
            className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline truncate max-w-[200px]">{work.title}</span>
            <span className="sm:hidden">Overview</span>
          </Link>

          {/* Center: Current Chapter Index indicator */}
          <div className="text-center font-mono text-[11px] text-[var(--ink-muted)]">
            <span>Chapter {chapter.number} of {work.chaptersCount}</span>
            <span className="hidden md:inline text-[var(--ink-faint)]"> • {Math.round(scrollProgress)}% read</span>
          </div>

          {/* Right: Minimal Reader Controls */}
          <div className="flex items-center gap-1">
            {/* Table of Chapters Drawer Trigger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Chapter Index"
            >
              <ListFilter className="h-4 w-4" />
            </button>

            {/* Reading Typography Settings Trigger */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Typography & Display Settings"
            >
              <Type className="h-4 w-4" />
            </button>

            {/* Save Work Bookmark Toggle */}
            <button
              onClick={() => toggleSaveWork(work.id)}
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                saved
                  ? 'text-[var(--ink-primary)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
              title={saved ? 'Remove from Library' : 'Save Work'}
            >
              <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* READING CANVAS — Distraction Free and Dominating the Screen */}
      <main className={`mx-auto px-4 sm:px-8 py-8 sm:py-20 ${widthClasses}`}>
        
        {/* Work & Chapter Title Header */}
        <div className="text-center pb-12 mb-12 border-b border-[var(--border-subtle)]">
          <Link
            to="/works/$workId"
            params={{ workId: work.id }}
            className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline block mb-2"
          >
            {work.title}
          </Link>

          <Link
            to="/author/$authorId"
            params={{ authorId: work.author.id }}
            className="text-xs font-mono text-[var(--ink-faint)] hover:text-[var(--ink-primary)] transition-colors no-underline block mb-6"
          >
            By {work.author.name}
          </Link>

          <div className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-2">
            Chapter {String(chapter.number).padStart(2, '0')}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--ink-primary)] leading-tight tracking-tight">
            {chapter.title}
          </h1>

          {chapter.subtitle && (
            <p className="mt-3 font-serif text-base sm:text-lg text-[var(--ink-muted)] italic">
              {chapter.subtitle}
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-3 font-mono text-[11px] text-[var(--ink-faint)]">
            <span>{chapter.readTimeMinutes} min read</span>
            <span>•</span>
            <span>{chapter.wordCount.toLocaleString()} words</span>
          </div>
        </div>

        {/* Narrative Prose */}
        <article className={`${fontClass} ${sizeClasses} ${lineClasses} text-[var(--ink-secondary)] space-y-6 sm:space-y-8 select-text`}>
          {paragraphs.map((p, idx) => (
            <p
              key={idx}
              className={`${
                idx === 0 && readerSettings.fontFamily === 'serif'
                  ? 'first-letter:font-serif first-letter:text-5xl first-letter:float-left first-letter:pr-3 first-letter:leading-none first-letter:text-[var(--ink-primary)] first-letter:font-bold'
                  : ''
              }`}
            >
              {p}
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
              params={{ workId: work.id, chapterId: prevChapter.id }}
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
              params={{ workId: work.id, chapterId: nextChapter.id }}
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
    </div>
  )
}
