import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Save,
  Send,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Type
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/write/editor/$workId/$chapterId')({
  head: () =>
    generateMeta({
      title: 'Chapter Editor',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Writer Chapter Editor"
      description="Sign in to draft and edit your chapter content, word counts, and publication status in the distraction-free workspace."
      featureBadge="Chapter Editor"
    >
      <ChapterEditorPage />
    </ProtectedRoute>
  ),
})

function ChapterEditorPage() {
  const { workId, chapterId } = Route.useParams()
  const { getWorkById, updateChapterContent, showToast } = useApp()
  const navigate = useNavigate()

  const work = getWorkById(workId)
  const currentChapter = work?.chapters.find((c) => c.id === chapterId)

  const [title, setTitle] = useState(currentChapter?.title || 'Untitled Chapter')
  const [subtitle, setSubtitle] = useState(currentChapter?.subtitle || '')
  const [content, setContent] = useState(currentChapter?.content || '')
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)

  // Real-time word count & estimated reading time calculation
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length
  }, [content])

  const readTimeMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 220))
  }, [wordCount])

  // Autosave simulation timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleContentChange = (newVal: string) => {
    setContent(newVal)
    setAutosaveStatus('dirty')

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      setAutosaveStatus('saving')
      setTimeout(() => {
        if (work && currentChapter) {
          updateChapterContent(work.id, currentChapter.id, title, newVal)
          setAutosaveStatus('saved')
        }
      }, 500)
    }, 1200)
  }

  const handleManualSave = () => {
    if (work && currentChapter) {
      setAutosaveStatus('saving')
      updateChapterContent(work.id, currentChapter.id, title, content, currentChapter.status)
      setAutosaveStatus('saved')
      showToast('Chapter saved')
    }
  }

  const handlePublish = () => {
    if (work && currentChapter) {
      setAutosaveStatus('saving')
      updateChapterContent(work.id, currentChapter.id, title, content, 'published')
      setAutosaveStatus('saved')
      showToast('Chapter successfully published to subscribers!')
    }
  }

  if (!work || !currentChapter) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto">
        <EmptyState
          type="no-drafts"
          customTitle="Chapter Not Found"
          customDescription="The chapter requested does not exist in this manuscript."
          actionLabel="Return to Studio"
          actionHref="/write"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col font-sans transition-colors">
      
      {/* Top Editor Bar */}
      <header className="sticky top-0 z-30 flex h-12 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
        
        {/* Left: Back & Work Title */}
        <div className="flex items-center gap-3">
          <Link
            to="/write/manage/$workId"
            params={{ workId: work.id }}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{work.title}</span>
            <span className="sm:hidden">Exit</span>
          </Link>

          <span className="text-[var(--border-strong)] hidden sm:inline">|</span>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`hidden md:flex items-center gap-1 text-xs font-mono px-2 py-1 rounded transition-colors ${
              sidebarOpen ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Chapters ({work.chapters.length})</span>
          </button>
        </div>

        {/* Center: Autosave Indicator & Word Count */}
        <div className="flex items-center gap-3 font-mono text-xs text-[var(--ink-muted)]">
          <span className="hidden sm:inline">
            {wordCount.toLocaleString()} words • ~{readTimeMinutes} min
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            {autosaveStatus === 'saving' && <span className="animate-pulse text-amber-600">Autosaving...</span>}
            {autosaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Saved
              </span>
            )}
            {autosaveStatus === 'dirty' && <span className="text-[var(--ink-faint)]">Unsaved changes</span>}
          </span>
        </div>

        {/* Right Actions: Focus Mode, Preview, Save, Publish */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors hidden sm:block ${
              focusMode
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
            title="Toggle Distraction-Free Focus Mode"
          >
            Focus
          </button>

          <Link
            to="/read/$workId/$chapterId"
            params={{ workId: work.id, chapterId: currentChapter.id }}
            className="flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs text-[var(--ink-secondary)] hover:border-[var(--border-strong)] no-underline"
            title="Preview reading view"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </Link>

          <button
            onClick={handleManualSave}
            className="rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <Save className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            onClick={handlePublish}
            className="rounded bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
          >
            Publish
          </button>
        </div>
      </header>

      {/* Main Studio Body: Optional Sidebar + Dominated Writing Canvas */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Chapter Navigation Drawer */}
        {sidebarOpen && !focusMode && (
          <aside className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hidden md:block overflow-y-auto">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-3">
              Manuscript Chapters
            </h3>
            <div className="space-y-1">
              {work.chapters.map((ch) => (
                <Link
                  key={ch.id}
                  to="/write/editor/$workId/$chapterId"
                  params={{ workId: work.id, chapterId: ch.id }}
                  className={`flex items-center justify-between rounded p-2 text-xs no-underline transition-colors ${
                    ch.id === currentChapter.id
                      ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)]'
                  }`}
                >
                  <span className="truncate">
                    {String(ch.number).padStart(2, '0')}. {ch.title}
                  </span>
                  <span className="font-mono text-[9px] uppercase text-[var(--ink-faint)]">
                    {ch.status}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        )}

        {/* Center: The Writing Canvas (Dominates the screen) */}
        <div className="flex-1 overflow-y-auto py-12 px-6 sm:px-12 flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            
            {/* Chapter Header Inputs */}
            <div className="space-y-3 pb-6 border-b border-[var(--border-subtle)]">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)]">
                Chapter {String(currentChapter.number).padStart(2, '0')}
              </span>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chapter Title..."
                className="w-full font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--ink-primary)] bg-transparent border-none focus:outline-none placeholder-[var(--ink-faint)]"
              />

              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional chapter subtitle or descriptive line..."
                className="w-full font-serif text-base italic text-[var(--ink-muted)] bg-transparent border-none focus:outline-none placeholder-[var(--ink-faint)]"
              />
            </div>

            {/* Writing Textarea */}
            <div className="min-h-[600px]">
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Begin crafting your narrative here. Words flow naturally without distraction..."
                rows={24}
                className="w-full resize-none font-serif text-lg leading-loose text-[var(--ink-secondary)] bg-transparent border-none focus:outline-none placeholder-[var(--ink-faint)] select-text"
              />
            </div>

            <div className="pt-8 text-center text-xs font-mono text-[var(--ink-faint)] border-t border-[var(--border-subtle)]">
              End of Chapter Draft • All modifications stored automatically
            </div>

          </div>
        </div>

      </div>

    </div>
  )
}
