import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import {
  ArrowLeft,
  PenLine,
  Plus,
  Eye,
  BarChart3,
  Settings,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const Route = createFileRoute('/write/manage/$workId')({
  component: () => (
    <ProtectedRoute
      title="Manuscript Management & Folio Index"
      description="Sign in to organize chapters, update publishing status, and configure manuscript metadata."
      featureBadge="Work Management"
    >
      <WorkManagementPage />
    </ProtectedRoute>
  ),
})

function WorkManagementPage() {
  const { workId } = Route.useParams()
  const { getWorkById, allWorks, addNewChapter, showToast } = useApp()
  const navigate = useNavigate()

  const work = getWorkById(workId) || allWorks[0]
  const [chapters, setChapters] = useState(work.chapters)
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  const [chapterSort, setChapterSort] = useState<string>('number')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [newChapterModalOpen, setNewChapterModalOpen] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')

  const displayedChapters = useMemo(() => {
    let result = chapters
    if (chapterFilter !== 'all') {
      result = result.filter((c) => c.status === chapterFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.subtitle && c.subtitle.toLowerCase().includes(q))
      )
    }

    return [...result].sort((a, b) => {
      if (chapterSort === 'wordCount') return b.wordCount - a.wordCount
      if (chapterSort === 'title') return a.title.localeCompare(b.title)
      return a.number - b.number
    })
  }, [chapters, chapterFilter, chapterSort, searchQuery])

  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChapterTitle.trim()) return

    const created = addNewChapter(work.id, newChapterTitle.trim())
    setChapters((prev) => [...prev, created])
    setNewChapterTitle('')
    setNewChapterModalOpen(false)

    // Direct navigate to editor
    navigate({
      to: '/write/editor/$workId/$chapterId',
      params: { workId: work.id, chapterId: created.id }
    })
  }

  const handleToggleStatus = (chapterId: string) => {
    setChapters((prev) =>
      prev.map((c) => {
        if (c.id === chapterId) {
          const nextStatus = c.status === 'published' ? 'draft' : 'published'
          showToast(`Chapter status changed to ${nextStatus}`)
          return { ...c, status: nextStatus }
        }
        return c
      })
    )
  }

  const handleReorder = () => {
    showToast('Chapters ordered chronologically')
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Back button */}
      <Link
        to="/write"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] mb-6 no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Writer Dashboard</span>
      </Link>

      {/* Work Overview Card */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 mb-10 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <img
              src={work.cover}
              alt={work.title}
              className="h-20 w-14 rounded object-cover grayscale border border-[var(--border-strong)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  {work.status}
                </span>
                <span className="font-mono text-xs text-[var(--ink-muted)]">{work.category}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] mt-1">
                {work.title}
              </h1>
              <p className="font-mono text-xs text-[var(--ink-muted)] mt-0.5">
                {chapters.length} Chapters • {work.totalReads} Lifetime Reads
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/works/$workId"
              params={{ workId: work.id }}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] no-underline"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Public Preview</span>
            </Link>

            <Link
              to="/write/analytics/$workId"
              params={{ workId: work.id }}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] no-underline"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Analytics</span>
            </Link>

            <button
              onClick={() => setNewChapterModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Write Chapter</span>
            </button>
          </div>
        </div>

        {/* Quick Work Stats Summary */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs text-center">
          <div>
            <p className="font-semibold text-base text-[var(--ink-primary)]">{chapters.filter(c => c.status === 'published').length}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Published</p>
          </div>
          <div>
            <p className="font-semibold text-base text-[var(--ink-primary)]">{chapters.filter(c => c.status === 'draft').length}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Drafts</p>
          </div>
          <div>
            <p className="font-semibold text-base text-[var(--ink-primary)]">{work.totalSaves}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Library Saves</p>
          </div>
          <div>
            <p className="font-semibold text-base text-[var(--ink-primary)]">{work.ratingScore.toFixed(1)} / 5.0</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Editorial Score</p>
          </div>
        </div>
      </div>

      {/* Chapters Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
              Manuscript Chapters
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              Reorder chapters, manage publish status, or launch the writing canvas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <FilterDisclosure
              label="Status"
              activeId={chapterFilter}
              onChange={setChapterFilter}
              items={[
                { id: 'all', label: `All Chapters (${chapters.length})` },
                { id: 'published', label: 'Published' },
                { id: 'draft', label: 'Drafts' },
              ]}
            />

            <FilterDisclosure
              label="Sort"
              activeId={chapterSort}
              onChange={setChapterSort}
              items={[
                { id: 'number', label: 'Chapter Order' },
                { id: 'wordCount', label: 'Longest First' },
                { id: 'title', label: 'Title (A-Z)' },
              ]}
            />

            <AnimatedSearch
              variant="expandable"
              placeholder="Find chapter..."
              value={searchQuery}
              onChange={setSearchQuery}
              shortcut="/"
            />

            <button
              onClick={handleReorder}
              className="inline-flex items-center gap-1 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] px-2 py-1.5 rounded border border-[var(--border-subtle)]"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
          {displayedChapters.map((ch) => (
            <div
              key={ch.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--bg-canvas)] transition-colors"
            >
              <div className="flex items-start sm:items-center gap-4">
                <span className="font-mono text-sm font-bold text-[var(--ink-faint)] w-8">
                  {String(ch.number).padStart(2, '0')}
                </span>
                <div>
                  <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    {ch.title}
                  </h4>
                  {ch.subtitle && (
                    <p className="text-xs text-[var(--ink-muted)] font-serif italic">
                      {ch.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--ink-faint)] mt-1">
                    <span>{ch.wordCount.toLocaleString()} words</span>
                    <span>•</span>
                    <span>{ch.readTimeMinutes} min read</span>
                    {ch.publishedAt && <span>• Published {ch.publishedAt}</span>}
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-3 sm:justify-end">
                <button
                  onClick={() => handleToggleStatus(ch.id)}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    ch.status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  }`}
                  title="Click to toggle publish status"
                >
                  {ch.status}
                </button>

                <Link
                  to="/write/editor/$workId/$chapterId"
                  params={{ workId: work.id, chapterId: ch.id }}
                  className="rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 no-underline"
                >
                  Edit Chapter
                </Link>

                <Link
                  to="/read/$workId/$chapterId"
                  params={{ workId: work.id, chapterId: ch.id }}
                  className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  title="Preview Reading View"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Chapter Modal */}
      {newChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              Create New Chapter
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Enter a working chapter title. You can change this at any time in the editor.
            </p>

            <form onSubmit={handleCreateChapter} className="space-y-4">
              <input
                type="text"
                autoFocus
                required
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="e.g. The Station at Dawn"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewChapterModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[var(--ink-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90"
                >
                  Create & Launch Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
