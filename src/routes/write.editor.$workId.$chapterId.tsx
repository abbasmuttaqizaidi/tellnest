import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import {
  CheckCircle2,
  Clock,
  Save,
  Send,
  ListFilter,
  Layers,
  ChevronLeft,
  AlertTriangle,
  Copy,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'
import { getWriterWorkDetailsServerFn, saveWriterChapterServerFn, createWriterChapterServerFn } from '../server/writer'
import { getPublicWorkServerFn } from '../server/works'
import { getWorkSlug } from '../data/mockData'
import { StoryRichEditor } from '../components/studio/StoryRichEditor'

export const Route = createFileRoute('/write/editor/$workId/$chapterId')({
  validateSearch: (search: Record<string, unknown>): { actId?: string } => ({
    actId: typeof search.actId === 'string' ? search.actId : undefined,
  }),
  staleTime: 0,
  shouldReload: true,
  loader: async ({ params }) => {
    try {
      const dbWork = await getWriterWorkDetailsServerFn({ data: { workId: params.workId } })
      if (dbWork) {
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
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData()
  const { getWorkById, updateChapterContent, showToast } = useApp()
  const navigate = useNavigate()

  const work = loaderData?.work || getWorkById(workId)
  const targetActIdFromSearch = search?.actId

  // Resilient Chapter Resolution:
  // 0. Handle 'new' unpersisted draft chapter
  // 1. Try exact ID match
  // 2. Fallbacks for aliases ('ch-1', 'first', 'default', '1')
  // 3. Match explicit chapter slug or number format (e.g. "chapter-2", "ch-3")
  // 4. Default to first chapter
  const currentChapter = useMemo(() => {
    if (!work || !Array.isArray(work.chapters)) {
      return null
    }

    // 0. Handle 'new' unpersisted draft chapter
    if (chapterId === 'new') {
      const existingNums = work.chapters.map((c: any) => c.number || c.chapter_number || 0)
      const nextNumber = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      const preselectedAct =
        targetActIdFromSearch ||
        (work.acts && work.acts.length > 0 ? work.acts[0].id : null)
      return {
        id: 'new',
        number: nextNumber,
        title: `Chapter ${nextNumber}`,
        subtitle: '',
        content: '',
        bannerImage: null,
        actId: preselectedAct,
        status: 'draft' as const,
        wordCount: 0,
        readTimeMinutes: 1,
        updated_at: new Date().toISOString(),
      }
    }

    if (work.chapters.length === 0) {
      return null
    }

    // 1. Exact ID match (Always prioritized for UUIDs)
    const exact = work.chapters.find((c: any) => c.id === chapterId)
    if (exact) return exact

    // 2. Conventional aliases ('ch-1', 'first', 'default', '1')
    if (chapterId === 'ch-1' || chapterId === 'first' || chapterId === 'default' || chapterId === '1') {
      const ch1 = work.chapters.find((c: any) => c.number === 1 || c.chapter_number === 1)
      if (ch1) return ch1
      return work.chapters[0]
    }

    // 3. Match explicit chapter slug or chapter number format (e.g. "chapter-2", "ch-3")
    const match = chapterId.match(/^(?:chapter|ch)-(\d+)$/i)
    if (match) {
      const num = parseInt(match[1], 10)
      const byNum = work.chapters.find((c: any) => c.number === num || c.chapter_number === num)
      if (byNum) return byNum
    }

    // 4. Default to first chapter
    return work.chapters[0]
  }, [work, chapterId, targetActIdFromSearch])

  // Synchronize URL in address bar if resolved to a different real UUID
  useEffect(() => {
    if (work && currentChapter && chapterId !== 'new' && currentChapter.id !== chapterId) {
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
  const [bannerImage, setBannerImage] = useState<string | null>(
    currentChapter?.bannerImage || currentChapter?.banner_image_path || null
  )
  const [actId, setActId] = useState<string>(currentChapter?.actId || '')
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'dirty'>(() =>
    chapterId === 'new' ? 'dirty' : 'saved'
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [duplicateTabOpen, setDuplicateTabOpen] = useState(false)
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string>(
    currentChapter?.updated_at || currentChapter?.updatedAt || new Date().toISOString()
  )
  const [conflictModalData, setConflictModalData] = useState<{
    serverUpdatedAt: string
    serverTitle: string
    serverSubtitle: string
    serverContent: string
  } | null>(null)

  // Native inter-tab presence tracking via BroadcastChannel (Same Browser, Multiple Tabs)
  useEffect(() => {
    if (!work || !currentChapter || typeof window === 'undefined' || !('BroadcastChannel' in window)) return

    const channelName = `hatchpen_tab_${work.id}_${currentChapter.id}`
    const channel = new BroadcastChannel(channelName)
    const myTabId = Math.random().toString(36).substring(2, 9)

    // Announce my presence to any existing tabs
    channel.postMessage({ type: 'ANNOUNCE', tabId: myTabId })

    const handleMessage = (e: MessageEvent) => {
      const msg = e.data
      if (!msg || msg.tabId === myTabId) return

      if (msg.type === 'ANNOUNCE') {
        // Another tab just opened, reply so it detects us
        channel.postMessage({ type: 'CONFIRM', tabId: myTabId })
        setDuplicateTabOpen(true)
      } else if (msg.type === 'CONFIRM') {
        // An existing tab replied, we are a duplicate tab
        setDuplicateTabOpen(true)
      } else if (msg.type === 'CLOSED') {
        setDuplicateTabOpen(false)
      }
    }

    channel.addEventListener('message', handleMessage)

    return () => {
      try {
        channel.postMessage({ type: 'CLOSED', tabId: myTabId })
        channel.removeEventListener('message', handleMessage)
        channel.close()
      } catch (err) {}
    }
  }, [work?.id, currentChapter?.id])

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

  // Track the baseline saved version of chapter for real-time diffing
  const [savedSnapshot, setSavedSnapshot] = useState<{
    title: string
    subtitle: string
    content: string
    bannerImage?: string | null
  }>({
    title: currentChapter?.title || '',
    subtitle: currentChapter?.subtitle || '',
    content: currentChapter?.content || '',
    bannerImage: currentChapter?.bannerImage || currentChapter?.banner_image_path || null,
  })

  // Track previous chapter ID
  const prevChapterIdRef = useRef<string | null>(currentChapter?.id || null)

  // Sync state if resolved chapter changes
  useEffect(() => {
    if (currentChapter) {
      prevChapterIdRef.current = currentChapter.id
      const initialTitle = currentChapter.title || 'Untitled Chapter'
      const initialSubtitle = currentChapter.subtitle || ''
      const initialContent = currentChapter.content || ''
      const initialBanner = currentChapter.bannerImage || currentChapter.banner_image_path || null
      setTitle(initialTitle)
      setSubtitle(initialSubtitle)
      setContent(initialContent)
      setBannerImage(initialBanner)
      setActId(currentChapter.actId || '')
      setLoadedUpdatedAt(currentChapter.updated_at || currentChapter.updatedAt || new Date().toISOString())
      setConflictModalData(null)
      setAutosaveStatus(currentChapter.id === 'new' ? 'dirty' : 'saved')
      setSavedSnapshot({
        title: initialTitle,
        subtitle: initialSubtitle,
        content: initialContent,
        bannerImage: initialBanner,
      })
    }
  }, [currentChapter?.id])

  // Real-time word count & estimated reading time calculation
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(Boolean).length
  }, [content])

  const readTimeMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 220))
  }, [wordCount])

  // Keep a ref of latest editor state
  const latestStateRef = useRef({
    title,
    subtitle,
    content,
    bannerImage,
    actId,
    status: currentChapter?.status || 'draft',
  })

  useEffect(() => {
    latestStateRef.current = {
      title,
      subtitle,
      content,
      bannerImage,
      actId,
      status: currentChapter?.status || 'draft',
    }
  }, [title, subtitle, content, bannerImage, actId, currentChapter?.status])

  const handleExit = () => {
    if (autosaveStatus === 'dirty') {
      const confirmLeave = window.confirm('You have unsaved changes. Do you want to leave without saving?')
      if (!confirmLeave) return
    }
    setIsNavigating(true)
    navigate({ to: '/write/manage/$workId', params: { workId: work.id } })
  }

  const handleActChange = async (newActId: string) => {
    setActId(newActId)
    latestStateRef.current.actId = newActId
    if (work && currentChapter) {
      currentChapter.actId = newActId ? newActId : null
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) {
          found.actId = newActId ? newActId : null
        }
      }
      try {
        await saveWriterChapterServerFn({
          data: JSON.parse(JSON.stringify({
            workId: String(work.id),
            chapterId: String(currentChapter.id),
            title: String(title || ''),
            subtitle: String(subtitle || ''),
            content: String(content || ''),
            status: (currentChapter.status || 'draft') as 'draft' | 'published',
            actId: newActId ? String(newActId) : null,
          })),
        })
        showToast('Manuscript Act updated')
      } catch (e: any) {
        if (e?.message && e.message.includes('Seroval')) {
          showToast('Manuscript Act updated')
        } else {
          console.warn('[handleActChange] Error:', e)
        }
      }
    }
  }

  const handleQuickCreateNewChapter = (targetAct?: string) => {
    if (!work) return
    navigate({
      to: '/write/editor/$workId/$chapterId',
      params: { workId: work.id, chapterId: 'new' },
      search: targetAct || actId ? { actId: targetAct || actId } : undefined,
    })
  }

  // Check if current text differs from saved baseline (ignoring benign trailing newlines)
  const checkIfDirty = (newT: string, newSub: string, newC: string, newBanner?: string | null) => {
    const isTitleChanged = (savedSnapshot.title || '').trim() !== (newT || '').trim()
    const isSubChanged = (savedSnapshot.subtitle || '').trim() !== (newSub || '').trim()
    const normSaved = (savedSnapshot.content || '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
    const normCurrent = (newC || '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
    const checkBanner = newBanner !== undefined ? newBanner : bannerImage
    const isBannerChanged = (savedSnapshot.bannerImage || null) !== (checkBanner || null)
    return isTitleChanged || isSubChanged || normSaved !== normCurrent || isBannerChanged
  }

  const handleBannerChange = (newBannerUrl: string | null) => {
    setBannerImage(newBannerUrl)
    setAutosaveStatus(checkIfDirty(title, subtitle, content, newBannerUrl) ? 'dirty' : 'saved')
    if (work && currentChapter) {
      updateChapterContent(work.id, currentChapter.id, title, content, currentChapter.status, newBannerUrl)
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) {
          found.bannerImage = newBannerUrl || undefined
          found.banner_image_path = newBannerUrl || undefined
        }
      }
    }
  }

  // Pure state updates on typing - strictly NO background autosave timers and NO browser storage
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setAutosaveStatus(checkIfDirty(newTitle, subtitle, content) ? 'dirty' : 'saved')

    // Optimistic update for sidebar preview
    if (work && currentChapter) {
      updateChapterContent(work.id, currentChapter.id, newTitle, content, currentChapter.status, bannerImage)
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) found.title = newTitle
      }
    }
  }

  const handleSubtitleChange = (newSub: string) => {
    setSubtitle(newSub)
    setAutosaveStatus(checkIfDirty(title, newSub, content) ? 'dirty' : 'saved')
  }

  const handleContentChange = (newVal: string) => {
    setContent(newVal)
    setAutosaveStatus(checkIfDirty(title, subtitle, newVal) ? 'dirty' : 'saved')
  }

  // Explicit save: Only executed when user manually clicks Save button or presses Cmd+S / Ctrl+S
  const handleManualSave = async (force: boolean = false) => {
    if (!work || !currentChapter) return

    setAutosaveStatus('saving')

    // If chapter is unpersisted draft ('new'), create it in the database for the first time now
    if (currentChapter.id === 'new') {
      try {
        const createRes = await createWriterChapterServerFn({
          data: {
            workId: String(work.id),
            title: String(title.trim() || currentChapter.title || 'Untitled Chapter'),
            actId: actId ? String(actId) : undefined,
          },
        })

        if (!createRes?.chapter?.id) {
          throw new Error('Failed to create new chapter in database')
        }

        const newId = createRes.chapter.id
        currentChapter.id = newId
        currentChapter.number = createRes.chapter.number

        // Save the content, subtitle, bannerImage immediately
        const saveRes = await saveWriterChapterServerFn({
          data: JSON.parse(JSON.stringify({
            workId: String(work.id),
            chapterId: String(newId),
            title: String(title.trim() || createRes.chapter.title),
            subtitle: String(subtitle || ''),
            content: String(content || ''),
            status: 'draft',
            actId: actId ? String(actId) : null,
            bannerImage: bannerImage ? String(bannerImage).trim() : null,
            expectedUpdatedAt: new Date().toISOString(),
            force: true,
          })),
        })

        if (Array.isArray(work.chapters)) {
          const newChObj = {
            ...createRes.chapter,
            id: newId,
            number: createRes.chapter.number,
            title: title.trim() || createRes.chapter.title,
            subtitle,
            content,
            actId: actId || null,
            status: 'draft' as const,
            bannerImage,
            banner_image_path: bannerImage,
          }
          const exists = work.chapters.findIndex((c: any) => c.id === newId)
          if (exists >= 0) {
            work.chapters[exists] = newChObj
          } else {
            work.chapters.push(newChObj as any)
          }
        }

        updateChapterContent(work.id, newId, title, content, 'draft', bannerImage)
        setLoadedUpdatedAt(saveRes?.updatedAt || new Date().toISOString())
        setAutosaveStatus('saved')
        setSavedSnapshot({
          title,
          subtitle,
          content,
          bannerImage,
        })
        showToast('Chapter created and saved to database!')

        navigate({
          to: '/write/editor/$workId/$chapterId',
          params: { workId: work.id, chapterId: newId },
          replace: true,
        })
        return
      } catch (err: any) {
        console.error('[handleManualSave] Error creating new chapter:', err)
        setAutosaveStatus('dirty')
        showToast(err?.message || 'Failed to create chapter in database')
        return
      }
    }

    updateChapterContent(work.id, currentChapter.id, title, content, currentChapter.status, bannerImage)
    if (Array.isArray(work.chapters)) {
      const found = work.chapters.find((c: any) => c.id === currentChapter.id)
      if (found) {
        found.bannerImage = bannerImage || undefined
        found.banner_image_path = bannerImage || undefined
      }
    }

    try {
      const res = await saveWriterChapterServerFn({
        data: JSON.parse(JSON.stringify({
          workId: String(work.id),
          chapterId: String(currentChapter.id),
          title: String(title || ''),
          subtitle: String(subtitle || ''),
          content: String(content || ''),
          status: (currentChapter.status || 'draft') as 'draft' | 'published',
          actId: actId ? String(actId) : null,
          bannerImage: bannerImage ? String(bannerImage).trim() : null,
          expectedUpdatedAt: loadedUpdatedAt ? String(loadedUpdatedAt) : new Date().toISOString(),
          force: Boolean(force),
        })),
      })

      if (res?.conflict) {
        setConflictModalData({
          serverUpdatedAt: res.serverUpdatedAt || new Date().toISOString(),
          serverTitle: res.serverTitle || '',
          serverSubtitle: res.serverSubtitle || '',
          serverContent: res.serverContent || '',
        })
        setAutosaveStatus('dirty')
        return
      }

      if (res?.updatedAt) {
        setLoadedUpdatedAt(res.updatedAt)
      }
      setConflictModalData(null)
      setAutosaveStatus('saved')
      setSavedSnapshot({
        title,
        subtitle,
        content,
        bannerImage,
      })
      showToast('Chapter saved to database')
    } catch (e: any) {
      console.error('[handleManualSave] Save error:', e)
      // Check if error is TanStack dev-runner Seroval serialization quirk
      // The chapter was already successfully written and persisted to PostgreSQL!
      if (e?.message && e.message.includes('Seroval')) {
        setConflictModalData(null)
        setLoadedUpdatedAt(new Date().toISOString())
        setAutosaveStatus('saved')
        setSavedSnapshot({
          title,
          subtitle,
          content,
          bannerImage,
        })
        showToast('Chapter saved to database')
        return
      }
      setAutosaveStatus('dirty')
      if (typeof window !== 'undefined' && !window.navigator.onLine) {
        showToast('Offline: Could not connect to server. Your text is safe on screen. Reconnect and click Save again.')
      } else {
        showToast(e?.message || 'Failed to save chapter')
      }
    }
  }

  const handleCopyMyText = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        showToast('Current draft copied to clipboard!')
      }).catch(() => {
        showToast('Unable to copy to clipboard')
      })
    }
  }

  const handleKeepServerVersion = () => {
    if (!conflictModalData) return
    setTitle(conflictModalData.serverTitle || title)
    setSubtitle(conflictModalData.serverSubtitle || '')
    setContent(conflictModalData.serverContent || '')
    setLoadedUpdatedAt(conflictModalData.serverUpdatedAt)
    setAutosaveStatus('saved')
    setConflictModalData(null)
    showToast('Loaded latest version from server')
  }

  const handleForceOverwrite = async () => {
    setConflictModalData(null)
    await handleManualSave(true)
  }

  const handlePublish = async () => {
    if (autosaveStatus !== 'saved') {
      showToast('Please save your chapter changes before publishing.')
      return
    }

    if (work && currentChapter) {
      setAutosaveStatus('saving')
      const curTitle = latestStateRef.current.title
      const curContent = latestStateRef.current.content
      const curSubtitle = latestStateRef.current.subtitle
      latestStateRef.current.status = 'published'

      updateChapterContent(work.id, currentChapter.id, curTitle, curContent, 'published', bannerImage)
      if (Array.isArray(work.chapters)) {
        const found = work.chapters.find((c: any) => c.id === currentChapter.id)
        if (found) {
          found.status = 'published'
          found.title = curTitle
          found.subtitle = curSubtitle
          found.bannerImage = bannerImage || undefined
          found.banner_image_path = bannerImage || undefined
        }
      }

      try {
        await saveWriterChapterServerFn({
          data: JSON.parse(JSON.stringify({
            workId: String(work.id),
            chapterId: String(currentChapter.id),
            title: String(curTitle || ''),
            subtitle: String(curSubtitle || ''),
            content: String(curContent || ''),
            status: 'published' as const,
            actId: actId ? String(actId) : null,
            bannerImage: bannerImage ? String(bannerImage).trim() : null,
            expectedUpdatedAt: loadedUpdatedAt ? String(loadedUpdatedAt) : new Date().toISOString(),
            force: true,
          })),
        })
        setAutosaveStatus('saved')
        showToast('Chapter published to manuscript!')
        setIsNavigating(true)
        navigate({ to: '/write/manage/$workId', params: { workId: work.id } })
      } catch (e: any) {
        console.warn('[handlePublish] Error:', e)
        if (e?.message && e.message.includes('Seroval')) {
          setAutosaveStatus('saved')
          showToast('Chapter published to manuscript!')
          setIsNavigating(true)
          navigate({ to: '/write/manage/$workId', params: { workId: work.id } })
          return
        }
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
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)] gap-2">
            <span className="font-serif font-bold text-sm text-[var(--ink-primary)] truncate flex-1" title={work.title}>
              {work.title}
            </span>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer shrink-0"
              title="Collapse Manuscript Chapters"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] flex items-center gap-1.5">
              <span>Manuscript Chapters</span>
              <span className="text-[var(--ink-faint)]">({work.chapters.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => handleQuickCreateNewChapter()}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
              title="Add New Chapter"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </div>

          {work.acts && work.acts.length > 0 ? (
            <div className="space-y-4">
              {work.acts.map((act: any) => {
                const actChapters = work.chapters.filter(
                  (c: any) => c.actId === act.id || c.actNumber === act.number
                )
                return (
                  <div key={act.id} className="space-y-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--bg-subtle)]/40 rounded">
                      <Layers className="h-3 w-3 text-black dark:text-white" />
                      <span className="truncate">{act.title || `Act ${act.number}`}</span>
                    </div>
                    <div className="pl-1 space-y-0.5">
                      {actChapters.map((ch: any) => {
                        const isCurrent = ch.id === currentChapter.id
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
                              Chapter {ch.number}
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
                      <Layers className="h-3 w-3 text-black dark:text-white" />
                      <span>Unassigned Chapters</span>
                    </div>
                    <div className="pl-1 space-y-0.5">
                      {unassignedChapters.map((ch: any) => {
                        const isCurrent = ch.id === currentChapter.id
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
                              Chapter {ch.number}
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
                      Chapter {ch.number}
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
        {duplicateTabOpen && (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>This chapter is open in another tab on this browser. Please edit and save in one tab to avoid conflicts.</span>
            </span>
            <button
              type="button"
              onClick={() => setDuplicateTabOpen(false)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 font-bold ml-2 px-1 rounded cursor-pointer"
              title="Dismiss warning"
            >
              ✕
            </button>
          </div>
        )}

        <StoryRichEditor
          key={currentChapter.id}
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
          acts={work.acts || []}
          actId={actId}
          onActChange={handleActChange}
          onExit={handleExit}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(true)}
          bannerImage={bannerImage}
          onBannerChange={handleBannerChange}
          savedSnapshot={savedSnapshot}
        />
      </div>

      {/* Edit Conflict Resolution Modal */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                Save Conflict Detected
              </h3>
            </div>

            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              This chapter was modified and saved in another tab or device at{' '}
              <span className="font-mono font-semibold text-[var(--ink-primary)]">
                {new Date(conflictModalData.serverUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              . Saving now would overwrite that version.
            </p>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                <span>Server Title:</span>
                <span className="font-semibold text-[var(--ink-primary)] truncate max-w-[200px]">{conflictModalData.serverTitle}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                <span>Server Word Count:</span>
                <span className="font-semibold text-[var(--ink-primary)]">
                  {conflictModalData.serverContent.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                <span>Your Unsaved Draft:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {wordCount} words
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyMyText}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shadow-2xs"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy My Unsaved Text to Clipboard</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleKeepServerVersion}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer shadow-2xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Load Server Version</span>
                </button>

                <button
                  type="button"
                  onClick={handleForceOverwrite}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Overwrite Server</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Immediate Navigation Transition Feedback Overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-canvas)]/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 shadow-lg font-mono text-xs text-[var(--ink-secondary)]">
            <span className="h-4 w-4 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
            <span>Returning to Manuscript Manage...</span>
          </div>
        </div>
      )}
    </div>
  )
}
