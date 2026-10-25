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
  ListFilter,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'
import { getWriterWorkDetailsServerFn, saveWriterChapterServerFn, createWriterChapterServerFn } from '../server/writer'
import { getPublicWorkServerFn } from '../server/works'
import { getWorkSlug } from '../data/mockData'
import { StoryRichEditor } from '../components/studio/StoryRichEditor'

export const Route = createFileRoute('/write/editor/$workId/$chapterId')({
  loader: async ({ params }) => {
    try {
      const dbWork = await getWriterWorkDetailsServerFn({ data: { workId: params.workId } })
      if (dbWork) {
        // Self-healing: If manuscript has zero chapters, auto-provision initial Chapter One
        if (!dbWork.chapters || dbWork.chapters.length === 0) {
          try {
            const newChRes = await createWriterChapterServerFn({
              data: {
                workId: dbWork.id,
                title: 'Chapter One',
              },
            })
            if (newChRes?.chapter) {
              dbWork.chapters = [newChRes.chapter as any]
            }
          } catch (autoErr) {
            console.warn('[Route /write/editor] Auto-provision chapter error:', autoErr)
          }
        }
        return { work: dbWork }
      }
    } catch (e) {
      console.warn('[Route /write/editor] Loader DB writer lookup error:', e)
    }

    try {
      const publicDbWork = await getPublicWorkServerFn({ data: params.workId })
      if (publicDbWork) return { work: publicDbWork }
    } catch (e) {}

    return { work: null }
  },
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
  const loaderData = Route.useLoaderData()
  const { getWorkById, updateChapterContent, showToast } = useApp()
  const navigate = useNavigate()

  const work = loaderData?.work || getWorkById(workId)

  // Resilient Chapter Resolution:
  // 1. Try exact ID match
  // 2. Fallbacks for aliases ('ch-1', 'first', 'default', '1')
  // 3. Match by chapter number (e.g. from 'chapter-1' or 'ch-2')
  // 4. Default to first draft or first chapter
  const currentChapter = useMemo(() => {
    if (!work || !Array.isArray(work.chapters) || work.chapters.length === 0) {
      return null
    }

    // 1. Exact ID match
    const exact = work.chapters.find((c: any) => c.id === chapterId)
    if (exact) return exact

    // 2. Conventional aliases ('ch-1', 'first', 'default', '1')
    if (chapterId === 'ch-1' || chapterId === 'first' || chapterId === 'default' || chapterId === '1') {
      const ch1 = work.chapters.find((c: any) => c.number === 1 || c.chapter_number === 1)
      if (ch1) return ch1
      return work.chapters[0]
    }

    // 3. Chapter number fallback
    const match = chapterId.match(/\d+/)
    if (match) {
      const num = parseInt(match[0], 10)
      const byNum = work.chapters.find((c: any) => c.number === num || c.chapter_number === num)
      if (byNum) return byNum
    }

    // 4. Default to first draft or first chapter
    return work.chapters.find((c: any) => c.status === 'draft') || work.chapters[0]
  }, [work, chapterId])

  // Synchronize URL in address bar if resolved to a different real UUID
  useEffect(() => {
    if (work && currentChapter && currentChapter.id !== chapterId) {
      navigate({
        to: '/write/editor/$workId/$chapterId',
        params: { workId: work.id, chapterId: currentChapter.id },
        replace: true,
      })
    }
  }, [work?.id, currentChapter?.id, chapterId, navigate])

  const [title, setTitle] = useState(currentChapter?.title || 'Untitled Chapter')
  const [subtitle, setSubtitle] = useState(currentChapter?.subtitle || '')
  const [content, setContent] = useState(currentChapter?.content || '')
  const [actId, setActId] = useState<string>(currentChapter?.actId || '')
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [recoveredDraft, setRecoveredDraft] = useState<{
    title?: string
    subtitle?: string
    content?: string
    timestamp?: number
  } | null>(null)

  const draftStorageKey = work && currentChapter ? `hatchpen_draft_${work.id}_${currentChapter.id}` : null

  const saveLocalDraft = (dTitle: string, dSub: string, dContent: string) => {
    if (!draftStorageKey || typeof window === 'undefined') return
    try {
      localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          title: dTitle,
          subtitle: dSub,
          content: dContent,
          timestamp: Date.now(),
        })
      )
    } catch (err) {
      console.warn('[saveLocalDraft] Error saving local draft:', err)
    }
  }

  const clearLocalDraft = () => {
    if (!draftStorageKey || typeof window === 'undefined') return
    try {
      localStorage.removeItem(draftStorageKey)
    } catch (err) {
      console.warn('[clearLocalDraft] Error removing local draft:', err)
    }
  }

  // Prevent accidental navigation/tab closing when editor changes are dirty or saving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosaveStatus === 'dirty' || autosaveStatus === 'saving') {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [autosaveStatus])

  // Check for recovered draft from interrupted session on chapter load
  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined' || !currentChapter) {
      setRecoveredDraft(null)
      return
    }
    try {
      const raw = localStorage.getItem(draftStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const isDiff =
          (parsed.content && parsed.content.trim() !== (currentChapter.content || '').trim()) ||
          (parsed.title && parsed.title.trim() !== (currentChapter.title || '').trim()) ||
          (parsed.subtitle !== undefined && parsed.subtitle.trim() !== (currentChapter.subtitle || '').trim())

        if (isDiff) {
          setRecoveredDraft(parsed)
        } else {
          localStorage.removeItem(draftStorageKey)
          setRecoveredDraft(null)
        }
      } else {
        setRecoveredDraft(null)
      }
    } catch (e) {
      console.warn('[draftRecovery] Error checking local draft:', e)
      setRecoveredDraft(null)
    }
  }, [draftStorageKey, currentChapter?.id])

  // Track previous chapter ID to safely flush changes before switching
  const prevChapterIdRef = useRef<string | null>(currentChapter?.id || null)

  // Sync state if resolved chapter changes, flushing any pending changes from previous chapter
  useEffect(() => {
    if (prevChapterIdRef.current && prevChapterIdRef.current !== currentChapter?.id && work) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      const prevId = prevChapterIdRef.current
      const { title: curTitle, subtitle: curSubtitle, content: curContent, actId: curActId, status: curStatus } =
        latestStateRef.current
      saveWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId: prevId,
          title: curTitle,
          subtitle: curSubtitle,
          content: curContent,
          status: curStatus,
          actId: curActId || undefined,
        },
      }).catch((e) => console.warn('[chapterSwitch] Flush error:', e))
    }

    if (currentChapter) {
      prevChapterIdRef.current = currentChapter.id
      setTitle(currentChapter.title || 'Untitled Chapter')
      setSubtitle(currentChapter.subtitle || '')
      setContent(currentChapter.content || '')
      setActId(currentChapter.actId || '')
      setAutosaveStatus('saved')
    }
  }, [currentChapter?.id])

  // Real-time word count & estimated reading time calculation
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length
  }, [content])

  const readTimeMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 220))
  }, [wordCount])

  // Autosave timer connecting directly to DB
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Keep a ref of latest editor state for instant flushing when exiting or unmounting
  const latestStateRef = useRef({
    title,
    subtitle,
    content,
    actId,
    status: currentChapter?.status || 'draft',
  })

  useEffect(() => {
    latestStateRef.current = {
      title,
      subtitle,
      content,
      actId,
      status: currentChapter?.status || 'draft',
    }
  }, [title, subtitle, content, actId, currentChapter?.status])

  const flushSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (!work || !currentChapter) return

    const { title: curTitle, subtitle: curSubtitle, content: curContent, actId: curActId, status: curStatus } =
      latestStateRef.current

    setAutosaveStatus('saving')
    updateChapterContent(work.id, currentChapter.id, curTitle, curContent, curStatus)
    if (Array.isArray(work.chapters)) {
      const found = work.chapters.find((c: any) => c.id === currentChapter.id)
      if (found) {
        found.title = curTitle
        found.subtitle = curSubtitle
        found.status = curStatus
        found.wordCount = curContent.trim().split(/\s+/).filter(Boolean).length
      }
    }

    try {
      await saveWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId: currentChapter.id,
          title: curTitle,
          subtitle: curSubtitle,
          content: curContent,
          status: curStatus,
          actId: curActId || undefined,
        },
      })
      clearLocalDraft()
      setAutosaveStatus('saved')
    } catch (e) {
      console.warn('[flushSave] Error saving chapter:', e)
      setAutosaveStatus('saved')
    }
  }

  // Flush any pending changes when exiting or unmounting
  useEffect(() => {
    return () => {
      flushSave()
    }
  }, [])

  const handleExit = async () => {
    await flushSave()
    navigate({ to: '/write/manage/$workId', params: { workId: work.id } })
  }

  const handleRestoreDraft = () => {
    if (!recoveredDraft) return
    const restoredTitle = recoveredDraft.title ?? title
    const restoredSubtitle = recoveredDraft.subtitle ?? subtitle
    const restoredContent = recoveredDraft.content ?? content
    setTitle(restoredTitle)
    setSubtitle(restoredSubtitle)
    setContent(restoredContent)
    setAutosaveStatus('dirty')
    setRecoveredDraft(null)
    showToast('Unsaved draft restored')

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await flushSave()
    }, 400)
  }

  const handleDiscardDraft = () => {
    clearLocalDraft()
    setRecoveredDraft(null)
    showToast('Interrupted draft discarded')
  }

  const handleActChange = async (newActId: string) => {
    setActId(newActId)
    if (work && currentChapter) {
      try {
        await saveWriterChapterServerFn({
          data: {
            workId: work.id,
            chapterId: currentChapter.id,
            title,
            subtitle,
            content,
            status: currentChapter.status,
            actId: newActId || null,
          },
        })
        showToast('Manuscript Act updated')
      } catch (e) {
        console.warn('[handleActChange] Error:', e)
      }
    }
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setAutosaveStatus('dirty')
    saveLocalDraft(newTitle, subtitle, content)

    // Instant optimistic update for sidebar & context so it previews live on every keystroke
    if (work && currentChapter) {
      updateChapterContent(work.id, currentChapter.id, newTitle, content, currentChapter.status)
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) found.title = newTitle
      }
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const targetChapterId = currentChapter.id
    saveTimeoutRef.current = setTimeout(async () => {
      if (prevChapterIdRef.current !== targetChapterId) return
      setAutosaveStatus('saving')
      try {
        if (work && currentChapter) {
          await saveWriterChapterServerFn({
            data: {
              workId: work.id,
              chapterId: targetChapterId,
              title: newTitle,
              subtitle,
              content,
              status: currentChapter.status,
              actId: actId || undefined,
            },
          })
          clearLocalDraft()
          setAutosaveStatus('saved')
        }
      } catch (e) {
        console.warn('[handleTitleChange] DB autosave error:', e)
        setAutosaveStatus('saved')
      }
    }, 1500)
  }

  const handleSubtitleChange = (newSub: string) => {
    setSubtitle(newSub)
    setAutosaveStatus('dirty')
    saveLocalDraft(title, newSub, content)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const targetChapterId = currentChapter.id
    saveTimeoutRef.current = setTimeout(async () => {
      if (prevChapterIdRef.current !== targetChapterId) return
      setAutosaveStatus('saving')
      try {
        if (work && currentChapter) {
          await saveWriterChapterServerFn({
            data: {
              workId: work.id,
              chapterId: targetChapterId,
              title,
              subtitle: newSub,
              content,
              status: currentChapter.status,
              actId: actId || undefined,
            },
          })
          clearLocalDraft()
          setAutosaveStatus('saved')
        }
      } catch (e) {
        console.warn('[handleSubtitleChange] DB autosave error:', e)
        setAutosaveStatus('saved')
      }
    }, 1500)
  }

  const handleContentChange = (newVal: string) => {
    setContent(newVal)
    setAutosaveStatus('dirty')
    saveLocalDraft(title, subtitle, newVal)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const targetChapterId = currentChapter.id
    saveTimeoutRef.current = setTimeout(async () => {
      if (prevChapterIdRef.current !== targetChapterId) return
      setAutosaveStatus('saving')
      try {
        if (work && currentChapter) {
          updateChapterContent(work.id, targetChapterId, title, newVal, currentChapter.status)
          await saveWriterChapterServerFn({
            data: {
              workId: work.id,
              chapterId: targetChapterId,
              title,
              subtitle,
              content: newVal,
              status: currentChapter.status,
              actId: actId || undefined,
            },
          })
          clearLocalDraft()
          setAutosaveStatus('saved')
        }
      } catch (e) {
        console.warn('[handleContentChange] DB autosave error:', e)
        setAutosaveStatus('saved')
      }
    }, 1500)
  }

  const handleManualSave = async () => {
    if (work && currentChapter) {
      setAutosaveStatus('saving')
      updateChapterContent(work.id, currentChapter.id, title, content, currentChapter.status)
      try {
        await saveWriterChapterServerFn({
          data: {
            workId: work.id,
            chapterId: currentChapter.id,
            title,
            subtitle,
            content,
            status: currentChapter.status,
            actId: actId || undefined,
          },
        })
        clearLocalDraft()
      } catch (e) {}
      setAutosaveStatus('saved')
      showToast('Chapter saved to database')
    }
  }

  const handlePublish = async () => {
    if (work && currentChapter) {
      setAutosaveStatus('saving')
      const curTitle = latestStateRef.current.title
      const curContent = latestStateRef.current.content
      const curSubtitle = latestStateRef.current.subtitle
      latestStateRef.current.status = 'published'

      updateChapterContent(work.id, currentChapter.id, curTitle, curContent, 'published')
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) {
          found.status = 'published'
          found.title = curTitle
          found.subtitle = curSubtitle
        }
      }

      try {
        await saveWriterChapterServerFn({
          data: {
            workId: work.id,
            chapterId: currentChapter.id,
            title: curTitle,
            subtitle: curSubtitle,
            content: curContent,
            status: 'published',
            actId: actId || undefined,
          },
        })
        setAutosaveStatus('saved')
        showToast('Chapter published to manuscript!')
      } catch (e) {
        console.warn('[handlePublish] Error:', e)
        setAutosaveStatus('saved')
        showToast('Failed to publish chapter')
      }
    }
  }

  const currentAct = useMemo(() => {
    if (!work?.acts || work.acts.length === 0) return null
    return work.acts.find((a: any) => a.id === actId || a.number === currentChapter?.actNumber)
  }, [work?.acts, actId, currentChapter?.actNumber])

  const actName = currentAct ? (currentAct.title || `Act ${currentAct.number}`) : undefined

  if (!work || !currentChapter) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto">
        <EmptyState
          type="no-drafts"
          customTitle={work ? 'No Chapters Found' : 'Manuscript Not Found'}
          customDescription={
            work
              ? 'This manuscript does not have any chapters yet. Open manuscript management to add your first chapter.'
              : 'The manuscript requested does not exist.'
          }
          actionLabel={work ? 'Manage Folio' : 'Return to Studio'}
          actionHref={work ? `/write/manage/${work.id}` : '/write'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex font-sans transition-colors">
      {/* Optional Left Sidebar for Manuscript Navigation */}
      {sidebarOpen && (
        <aside className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hidden md:flex flex-col shrink-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
            <Link
              to="/write/manage/$workId"
              params={{ workId: work.id }}
              onClick={async (e) => {
                e.preventDefault()
                await handleExit()
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="truncate">{work.title}</span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>

          <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] mb-3 flex items-center justify-between">
            <span>Manuscript Chapters</span>
            <span>{work.chapters.length}</span>
          </h3>

          {work.acts && work.acts.length > 0 ? (
            <div className="space-y-4">
              {work.acts.map((act: any) => {
                const actChapters = work.chapters.filter(
                  (c: any) => c.actId === act.id || c.actNumber === act.number
                )
                return (
                  <div key={act.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--bg-subtle)]/40 rounded">
                      <Layers className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="truncate">{act.title || `Act ${act.number}`}</span>
                    </div>
                    <div className="pl-1 space-y-0.5">
                      {actChapters.map((ch: any) => {
                        const isCurrent = ch.id === currentChapter.id
                        const displayedTitle = isCurrent
                          ? (title.trim() || 'Untitled Chapter')
                          : (ch.title || 'Untitled Chapter')
                        return (
                          <Link
                            key={ch.id}
                            to="/write/editor/$workId/$chapterId"
                            params={{ workId: work.id, chapterId: ch.id }}
                            className={`flex items-center justify-between gap-2 rounded p-2 text-xs no-underline transition-all ${
                              isCurrent
                                ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold shadow-2xs border-l-2 border-[var(--ink-primary)] pl-2.5'
                                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)]'
                            }`}
                          >
                            <span className="truncate flex-1">
                              {String(ch.number).padStart(2, '0')}. {displayedTitle}
                            </span>
                            {isCurrent && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
                                title="Live editing preview"
                              />
                            )}
                            <span className="font-mono text-[9px] uppercase text-[var(--ink-faint)]">
                              {ch.status}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {(() => {
                const unassignedChapters = work.chapters.filter(
                  (c: any) => !c.actId || !work.acts.some((a: any) => a.id === c.actId)
                )
                if (unassignedChapters.length === 0) return null
                return (
                  <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]/70">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--bg-subtle)]/40 rounded">
                      <Layers className="h-3 w-3 text-[var(--ink-muted)]" />
                      <span>Unassigned Chapters</span>
                    </div>
                    <div className="pl-1 space-y-0.5">
                      {unassignedChapters.map((ch: any) => {
                        const isCurrent = ch.id === currentChapter.id
                        const displayedTitle = isCurrent
                          ? (title.trim() || 'Untitled Chapter')
                          : (ch.title || 'Untitled Chapter')
                        return (
                          <Link
                            key={ch.id}
                            to="/write/editor/$workId/$chapterId"
                            params={{ workId: work.id, chapterId: ch.id }}
                            className={`flex items-center justify-between gap-2 rounded p-2 text-xs no-underline transition-all ${
                              isCurrent
                                ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold shadow-2xs border-l-2 border-[var(--ink-primary)] pl-2.5'
                                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)]'
                            }`}
                          >
                            <span className="truncate flex-1">
                              {String(ch.number).padStart(2, '0')}. {displayedTitle}
                            </span>
                            {isCurrent && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
                                title="Live editing preview"
                              />
                            )}
                            <span className="font-mono text-[9px] uppercase text-[var(--ink-faint)]">
                              {ch.status}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="space-y-1">
              {work.chapters.map((ch: any) => {
                const isCurrent = ch.id === currentChapter.id
                const displayedTitle = isCurrent
                  ? (title.trim() || 'Untitled Chapter')
                  : (ch.title || 'Untitled Chapter')
                return (
                  <Link
                    key={ch.id}
                    to="/write/editor/$workId/$chapterId"
                    params={{ workId: work.id, chapterId: ch.id }}
                    className={`flex items-center justify-between gap-2 rounded p-2 text-xs no-underline transition-all ${
                      isCurrent
                        ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold shadow-2xs border-l-2 border-[var(--ink-primary)] pl-2.5'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)]'
                    }`}
                  >
                    <span className="truncate flex-1">
                      {String(ch.number).padStart(2, '0')}. {displayedTitle}
                    </span>
                    {isCurrent && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"
                        title="Live editing preview"
                      />
                    )}
                    <span className="font-mono text-[9px] uppercase text-[var(--ink-faint)]">
                      {ch.status}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </aside>
      )}

      {/* Main Studio Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-2 bottom-3 z-30 hidden md:flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] shadow-xs"
            title="Expand Chapters Sidebar"
          >
            <ChevronRight className="h-3 w-3" />
            <span>Folio Chapters</span>
          </button>
        )}

        <StoryRichEditor
          title={title}
          setTitle={handleTitleChange}
          subtitle={subtitle}
          setSubtitle={handleSubtitleChange}
          content={content}
          onChange={handleContentChange}
          autosaveStatus={autosaveStatus}
          onManualSave={handleManualSave}
          onPublish={handlePublish}
          workTitle={work.title}
          workId={work.id}
          chapterNumber={currentChapter.number}
          actName={actName}
          onExit={handleExit}
          recoveredDraft={recoveredDraft}
          onRestoreDraft={handleRestoreDraft}
          onDiscardDraft={handleDiscardDraft}
        />
      </div>
    </div>
  )
}
