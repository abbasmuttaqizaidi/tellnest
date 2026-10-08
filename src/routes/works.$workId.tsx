import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { CardAccordion, Button, Badge, AnimatedSearch } from '../design-system'
import {
  BookOpen,
  Bookmark,
  Share2,
  Clock,
  Star,
  Users,
  Eye,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { WORKS } from '../data/mockData'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/works/$workId')({
  head: ({ params }) => {
    let work = WORKS.find((w) => w.id === params.workId)
    if (!work && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
          const list = JSON.parse(stored)
          const matched = list.find((w: any) => w.id === params.workId)
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

    return generateMeta({
      title: `${work.title} by ${work.author.name}`,
      description: work.synopsis || work.fullDescription.slice(0, 160),
      canonicalUrl: `https://hatchpen.com/works/${work.id}`,
      ogType: 'book',
      ogImage: work.cover,
      ogImageAlt: `${work.title} cover art`,
      author: work.author.name,
      keywords: [
        work.genre,
        work.category,
        ...(work.tags || []),
        'read online',
        'serialized manuscript',
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Book',
        name: work.title,
        author: {
          '@type': 'Person',
          name: work.author.name,
          url: `https://hatchpen.com/author/${work.author.id}`,
        },
        genre: work.genre,
        description: work.synopsis,
        image: work.cover,
        inLanguage: work.language || 'English',
        numberOfPages: work.publishedChaptersCount || work.chaptersCount,
        url: `https://hatchpen.com/works/${work.id}`,
      },
    })
  },
  component: WorkDetailPage,
})

function WorkDetailPage() {
  const { workId } = Route.useParams()
  const {
    getWorkById,
    isWorkSaved,
    toggleSaveWork,
    isAuthorFollowed,
    toggleFollowAuthor,
    readingProgress,
    showToast
  } = useApp()

  const work = getWorkById(workId)

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

  const saved = isWorkSaved(work.id)
  const followed = isAuthorFollowed(work.author.id)
  const progress = readingProgress[work.id]

  const firstChapterId = work.chapters[0]?.id || ''
  const resumeChapterId = progress ? progress.chapterId : firstChapterId

  const [chapterSearch, setChapterSearch] = useState('')

  const filteredChapters = useMemo(() => {
    if (!chapterSearch.trim()) return work.chapters
    const q = chapterSearch.toLowerCase()
    return work.chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q)) ||
        String(c.number).includes(q)
    )
  }, [work.chapters, chapterSearch])

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      showToast('Link copied to clipboard')
    }
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Editorial Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mb-8">
        <Link to="/discover" className="hover:text-[var(--ink-primary)] text-inherit no-underline">
          Library
        </Link>
        <span>/</span>
        <Link
          to="/category/$slug"
          params={{ slug: work.categorySlug }}
          className="hover:text-[var(--ink-primary)] text-inherit no-underline"
        >
          {work.category}
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold truncate max-w-xs">{work.title}</span>
      </div>

      {/* Main Work Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[var(--border-subtle)]">
        
        {/* Cover Column */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center sm:items-start">
          <div className="relative aspect-[3/4] w-full max-w-[240px] sm:max-w-[320px] overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] shadow-md">
            <img
              src={work.cover}
              alt={work.title}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              <span className="rounded bg-black/85 px-2 py-0.5 text-[10px] font-mono font-medium text-white uppercase tracking-wider backdrop-blur-sm">
                {work.status}
              </span>
            </div>
          </div>

          {/* Quick Actions Under Cover */}
          <div className="mt-4 flex w-full max-w-[320px] gap-2">
            <button
              onClick={() => toggleSaveWork(work.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded border py-2 text-xs font-medium transition-all ${
                saved
                  ? 'border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
              <span>{saved ? 'In Library' : 'Save Work'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] transition-all"
              title="Share Work"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Narrative & Metadata Column */}
        <div className="md:col-span-8 lg:col-span-8 space-y-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
              <Link
                to="/category/$slug"
                params={{ slug: work.categorySlug }}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 uppercase tracking-wider text-inherit no-underline hover:border-[var(--ink-primary)]"
              >
                {work.category}
              </Link>
              <span>•</span>
              <Link
                to="/genre/$slug"
                params={{ slug: work.genreSlug }}
                className="text-inherit no-underline hover:underline"
              >
                {work.genre}
              </Link>
              <span>•</span>
              <span>{work.language}</span>
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

          {/* Author Capsule */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-[var(--border-subtle)]">
            <Link
              to="/author/$authorId"
              params={{ authorId: work.author.id }}
              className="flex items-center gap-3 text-inherit no-underline group"
            >
              <img
                src={work.author.avatar}
                alt={work.author.name}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-full object-cover grayscale border border-[var(--border-strong)]"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--ink-primary)] group-hover:underline">
                  {work.author.name}
                </p>
                <p className="text-xs font-mono text-[var(--ink-muted)]">
                  @{work.author.handle}
                </p>
              </div>
            </Link>

            <button
              onClick={() => toggleFollowAuthor(work.author.id)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all ${
                followed
                  ? 'border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                  : 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
              }`}
            >
              {followed ? (
                <>
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Following Author</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Follow Author</span>
                </>
              )}
            </button>
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
            {work.tags.map((tag) => (
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
            <div>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{work.totalReads}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Total Reads</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{work.totalSaves.toLocaleString()}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Library Saves</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--ink-primary)]">{work.chaptersCount}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Chapters</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--ink-primary)] flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)]" />
                {work.ratingScore.toFixed(1)}
              </p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">{work.ratingCount} Reviews</p>
            </div>
          </div>

          {/* PRIMARY CALL TO ACTION BUTTON */}
          <div className="pt-2">
            <Link
              to="/read/$workId/$chapterId"
              params={{ workId: work.id, chapterId: resumeChapterId }}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-3 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-8 py-3.5 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              <span>
                {progress
                  ? `CONTINUE READING (Chapter ${progress.chapterNumber} • ${progress.progressPercent}%)`
                  : 'START READING CHAPTER 01'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

        </div>
      </div>

      {/* CHAPTER INDEX LIST */}
      <section className="py-12">
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
            const badgeLabel = chapter.isNew
              ? 'New'
              : chapter.isUpdated
              ? 'Updated'
              : isCurrent
              ? 'Resume Here'
              : isRead
              ? 'Read'
              : undefined

            return {
              id: chapter.id,
              title: `${String(chapter.number).padStart(2, '0')}. ${chapter.title}`,
              subtitle: chapter.subtitle || `${chapter.readTimeMinutes} min read • ${chapter.wordCount.toLocaleString()} words`,
              badge: badgeLabel,
              content: (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                    {chapter.content.slice(0, 220)}...
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]/50">
                    <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {chapter.readTimeMinutes} min read
                      </span>
                      <span>•</span>
                      <span>{chapter.wordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span>Published {chapter.publishedAt}</span>
                    </div>

                    <Link
                      to="/read/$workId/$chapterId"
                      params={{ workId: work.id, chapterId: chapter.id }}
                      className="no-underline"
                    >
                      <Button size="sm" variant="primary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
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

    </div>
  )
}
