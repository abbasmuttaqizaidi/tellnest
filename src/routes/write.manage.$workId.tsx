import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
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
  ExternalLink,
  Layers,
  Edit3,
  FolderPlus,
  Trash2,
  Info,
  Globe,
  Lock,
  ShieldAlert,
  Archive,
  FileText,
  Camera
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { generateMeta } from '../lib/seo'
import { getWorkSlug } from '../data/mockData'
import { CloudinaryImageUpload } from '../components/CloudinaryImageUpload'
import {
  getWriterWorkDetailsServerFn,
  saveWriterChapterServerFn,
  createWriterChapterServerFn,
  createWriterActServerFn,
  updateWriterActServerFn,
  deleteWriterActServerFn,
  deleteWriterChapterServerFn,
  updateWriterWorkPublicationServerFn,
  updateWriterWorkCoverServerFn,
} from '../server/writer'
import { getPublicWorkServerFn } from '../server/works'
import { formatViewCount } from '../lib/utils'

export const Route = createFileRoute('/write/manage/$workId')({
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  loader: async ({ params }) => {
    try {
      const dbWork = await getWriterWorkDetailsServerFn({ data: { workId: params.workId } })
      if (dbWork) return { work: dbWork }
    } catch (e) {
      console.warn('[Route /write/manage/$workId] Loader DB writer lookup error:', e)
    }

    try {
      const publicDbWork = await getPublicWorkServerFn({ data: params.workId })
      if (publicDbWork) return { work: publicDbWork }
    } catch (e) {}

    return { work: null }
  },
  head: () =>
    generateMeta({
      title: 'Manage Manuscript',
      noindex: true,
    }),
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

function normalizeChapter(ch: any) {
  if (!ch) return ch
  return {
    ...ch,
    id: ch.id,
    number: Number(ch.number ?? ch.chapter_number ?? 1),
    title: ch.title || 'Untitled Chapter',
    subtitle: ch.subtitle || '',
    status: (ch.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
    wordCount: Number(ch.wordCount ?? ch.word_count ?? 0),
    readTimeMinutes: Number(ch.readTimeMinutes ?? ch.reading_time_minutes ?? 1),
    content: ch.content || '',
    publishedAt: ch.publishedAt || (ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined),
    actId: ch.actId || ch.act_id || undefined,
    actNumber: ch.actNumber || (ch.act_number ? Number(ch.act_number) : undefined),
    updatedAt: ch.updatedAt || ch.updated_at || undefined,
  }
}

function normalizeAct(act: any) {
  if (!act) return act
  return {
    ...act,
    id: act.id,
    workId: act.workId || act.work_id,
    number: Number(act.number ?? act.act_number ?? 1),
    title: act.title || `Act ${act.act_number || 1}`,
    slug: act.slug || '',
    description: act.description || '',
    status: act.status || 'published',
    viewCount: Number(act.viewCount ?? act.view_count ?? 0),
  }
}

function WorkManagementPage() {
  const { workId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const { getWorkById, allWorks, addNewChapter, showToast, reloadWriterWorksFromDb, reloadWorksFromDb } = useApp()
  const navigate = useNavigate()

  const contextWork = getWorkById(workId)
  const work = contextWork || loaderData?.work || allWorks[0]
  const [chapters, setChapters] = useState<any[]>(() => (work?.chapters || []).map(normalizeChapter))
  const [acts, setActs] = useState<any[]>(() => (work?.acts || []).map(normalizeAct))
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  const [chapterSort, setChapterSort] = useState<string>('number')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')

  // Publication & Visibility State
  const [publicationStatus, setPublicationStatus] = useState<'Published' | 'Draft' | 'Archived'>(
    work?.publicationStatus || (work?.visibility === 'Public' ? 'Published' : 'Draft')
  )
  const [visibility, setVisibility] = useState<'Public' | 'Unlisted' | 'Draft'>(
    work?.visibility || 'Draft'
  )
  const [workStatus, setWorkStatus] = useState<'Ongoing' | 'Completed'>(
    work?.status === 'Completed' ? 'Completed' : 'Ongoing'
  )

  // Publication Modal State
  const [pubModalOpen, setPubModalOpen] = useState(false)
  const [modalPubStatus, setModalPubStatus] = useState<'Published' | 'Draft' | 'Archived'>(publicationStatus)
  const [modalVisibility, setModalVisibility] = useState<'Public' | 'Unlisted' | 'Draft'>(visibility)
  const [modalStatus, setModalStatus] = useState<'Ongoing' | 'Completed'>(workStatus)
  const [isUpdatingPub, setIsUpdatingPub] = useState(false)

  // Chapter Creation Modal State
  const [newChapterModalOpen, setNewChapterModalOpen] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [targetActId, setTargetActId] = useState<string>('')

  // Act Modal State
  const [actModalOpen, setActModalOpen] = useState(false)
  const [editingAct, setEditingAct] = useState<any | null>(null)
  const [actTitle, setActTitle] = useState('')
  const [actDescription, setActDescription] = useState('')
  const [assignMode, setAssignMode] = useState<'all' | 'unassigned' | 'none'>('all')

  // Cover Image State & Modal
  const [coverUrl, setCoverUrl] = useState<string>(work?.cover || '')
  const [coverModalOpen, setCoverModalOpen] = useState(false)
  const [isSavingCover, setIsSavingCover] = useState(false)

  // Always refresh latest manuscript state directly from DB on mount/return
  useEffect(() => {
    let isMounted = true
    getWriterWorkDetailsServerFn({ data: { workId } })
      .then((freshWork) => {
        if (isMounted && freshWork) {
          if (Array.isArray(freshWork.chapters)) setChapters(freshWork.chapters.map(normalizeChapter))
          if (Array.isArray(freshWork.acts)) setActs(freshWork.acts.map(normalizeAct))
          if (freshWork.publicationStatus) setPublicationStatus(freshWork.publicationStatus)
          if (freshWork.visibility) setVisibility(freshWork.visibility)
          if (freshWork.status) setWorkStatus(freshWork.status)
          if (freshWork.cover) setCoverUrl(freshWork.cover)
        }
      })
      .catch((err) => {
        console.warn('[WorkManagementPage] Fresh work lookup error:', err)
      })
    return () => {
      isMounted = false
    }
  }, [workId])

  const handleSaveNewCover = async (newUrl: string) => {
    try {
      setIsSavingCover(true)
      setCoverUrl(newUrl)
      if (work) work.cover = newUrl
      await updateWriterWorkCoverServerFn({
        data: {
          workId: work.id,
          coverImageUrl: newUrl,
        },
      })
      await Promise.all([
        reloadWriterWorksFromDb?.(),
        reloadWorksFromDb?.(),
      ])
      showToast('Manuscript cover image updated!')
      setCoverModalOpen(false)
    } catch (err: any) {
      console.error('[handleSaveNewCover] Error:', err)
      showToast(err?.message || 'Failed to update cover image')
    } finally {
      setIsSavingCover(false)
    }
  }

  // Sync chapters whenever the in-memory contextWork changes (e.g. from editor)
  useEffect(() => {
    if (contextWork?.chapters) {
      setChapters(contextWork.chapters.map(normalizeChapter))
    }
    if (contextWork?.acts) {
      setActs(contextWork.acts.map(normalizeAct))
    }
  }, [contextWork?.chapters, contextWork?.acts])

  // Sync chapters whenever the resolved work changes
  useEffect(() => {
    if (work?.chapters) {
      setChapters(work.chapters.map(normalizeChapter))
    }
    if (work?.acts) {
      setActs(work.acts.map(normalizeAct))
    }
  }, [work])

  const openPubModal = () => {
    setModalPubStatus(publicationStatus)
    setModalVisibility(visibility)
    setModalStatus(workStatus)
    setPubModalOpen(true)
  }

  const handleSavePublication = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      setIsUpdatingPub(true)
      const res = await updateWriterWorkPublicationServerFn({
        data: {
          workId: work.id,
          publicationStatus: modalPubStatus.toLowerCase() as any,
          visibility: modalVisibility.toLowerCase() as any,
          status: modalStatus.toLowerCase() as any,
        },
      })

      if (res.success) {
        const newPubStatus = (res.publicationStatus === 'published' ? 'Published' : res.publicationStatus === 'archived' ? 'Archived' : 'Draft')
        const newVis = (res.visibility === 'public' ? 'Public' : res.visibility === 'draft' ? 'Draft' : 'Unlisted')
        const newStat = res.status === 'completed' ? 'Completed' : 'Ongoing'

        setPublicationStatus(newPubStatus)
        setVisibility(newVis)
        setWorkStatus(newStat)

        if (work) {
          work.publicationStatus = newPubStatus
          work.visibility = newVis
          work.status = newStat
        }

        await Promise.all([
          reloadWriterWorksFromDb?.(),
          reloadWorksFromDb?.(),
        ])

        showToast(`Manuscript is now ${newPubStatus} (${newVis})!`)
        setPubModalOpen(false)
      }
    } catch (err: any) {
      console.error('[handleSavePublication] Error:', err)
      showToast(err?.message || 'Failed to update publication settings')
    } finally {
      setIsUpdatingPub(false)
    }
  }

  const handleQuickPublish = async () => {
    try {
      setIsUpdatingPub(true)
      const res = await updateWriterWorkPublicationServerFn({
        data: {
          workId: work.id,
          publicationStatus: 'published',
          visibility: 'public',
          status: workStatus.toLowerCase() as any,
        },
      })
      if (res.success) {
        setPublicationStatus('Published')
        setVisibility('Public')
        if (work) {
          work.publicationStatus = 'Published'
          work.visibility = 'Public'
        }
        await Promise.all([
          reloadWriterWorksFromDb?.(),
          reloadWorksFromDb?.(),
        ])
        showToast('Manuscript published! It is now live to readers.')
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish manuscript')
    } finally {
      setIsUpdatingPub(false)
    }
  }

  const openCreateChapterModal = (preselectedActId?: string) => {
    const actToUse = preselectedActId || (acts.length > 0 ? (acts[acts.length - 1]?.id || acts[0]?.id || '') : '')
    setTargetActId(actToUse)
    setNewChapterTitle('')
    setNewChapterModalOpen(true)
  }

  const openCreateActModal = () => {
    setEditingAct(null)
    const nextActNum = acts.length + 1
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][nextActNum - 1] || String(nextActNum)
    setActTitle(`Act ${roman}: `)
    setActDescription('')
    setAssignMode(acts.length === 0 ? 'all' : 'unassigned')
    setActModalOpen(true)
  }

  const openEditActModal = (act: any) => {
    setEditingAct(act)
    setActTitle(act.title)
    setActDescription(act.description || '')
    setActModalOpen(true)
  }

  const handleDeleteAct = async (actId: string, actTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to remove "${actTitle}"? Chapters inside this Act will NOT be deleted; they will safely remain in your manuscript as unassigned chapters.`
      )
    ) {
      return
    }

    try {
      await deleteWriterActServerFn({
        data: {
          workId: work.id,
          actId,
        },
      })
      setActs((prev) => prev.filter((a) => a.id !== actId))
      setChapters((prev) =>
        prev.map((c) =>
          c.actId === actId
            ? { ...c, actId: undefined, actNumber: undefined, actTitle: undefined }
            : c
        )
      )
      showToast(`Act "${actTitle}" removed`)
    } catch (err: any) {
      console.error('[handleDeleteAct] Error:', err)
      showToast(err?.message || 'Failed to remove act')
    }
  }

  const handleSaveAct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actTitle.trim()) return

    const enteredTitle = actTitle.trim()
    const enteredDesc = actDescription.trim()

    try {
      if (editingAct) {
        await updateWriterActServerFn({
          data: {
            workId: work.id,
            actId: editingAct.id,
            title: enteredTitle,
            description: enteredDesc,
          },
        })
        setActs((prev) =>
          prev.map((a) =>
            a.id === editingAct.id
              ? { ...a, title: enteredTitle, description: enteredDesc }
              : a
          )
        )
        showToast(`Act updated: "${enteredTitle}"`)
      } else {
        const nextNum = acts.length + 1
        let assignedIds: string[] = []
        if (chapters.length > 0) {
          if (assignMode === 'all') {
            assignedIds = chapters.map((c) => c.id)
          } else if (assignMode === 'unassigned') {
            const unassigned = chapters.filter((c) => !c.actId)
            assignedIds = unassigned.map((c) => c.id)
          }
        }

        const res = await createWriterActServerFn({
          data: {
            workId: work.id,
            title: enteredTitle,
            description: enteredDesc,
            actNumber: nextNum,
            assignedChapterIds: assignedIds,
          },
        })
        if (res?.act) {
          setActs((prev) => [...prev, res.act])
          if (assignedIds.length > 0) {
            setChapters((prev) =>
              prev.map((c) =>
                assignedIds.includes(c.id)
                  ? { ...c, actId: res.act.id, actNumber: res.act.number, actTitle: res.act.title }
                  : c
              )
            )
          }
          setViewMode('grouped')
          showToast(`Act created: "${enteredTitle}"`)
        }
      }
      setActModalOpen(false)
      setEditingAct(null)
      setActTitle('')
      setActDescription('')
    } catch (err: any) {
      console.error('[handleSaveAct] Error:', err)
      showToast(err?.message || 'Failed to save act')
    }
  }

  const handleAssignChapterAct = async (chapterId: string, newActId: string | null) => {
    const target = chapters.find((c) => c.id === chapterId)
    if (!target) return
    const targetAct = acts.find((a) => a.id === newActId)

    // Optimistic update
    setChapters((prev) =>
      prev.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              actId: newActId || undefined,
              actNumber: targetAct?.number,
              actTitle: targetAct?.title,
            }
          : c
      )
    )

    try {
      await saveWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId,
          title: target.title,
          actId: newActId,
        },
      })
      showToast(newActId ? `Chapter moved to ${targetAct?.title || 'Act'}` : 'Chapter unassigned from Act')
    } catch (e) {
      console.warn('[handleAssignChapterAct] DB error:', e)
    }
  }

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
      if (chapterSort === 'wordCount') return (b.wordCount || 0) - (a.wordCount || 0)
      if (chapterSort === 'title') return (a.title || '').localeCompare(b.title || '')
      return (a.number || 0) - (b.number || 0)
    })
  }, [chapters, chapterFilter, chapterSort, searchQuery])

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChapterTitle.trim()) return

    const enteredTitle = newChapterTitle.trim()
    const chosenActId = targetActId ? targetActId : undefined
    setNewChapterTitle('')
    setNewChapterModalOpen(false)

    try {
      const res = await createWriterChapterServerFn({
        data: {
          workId: work.id,
          title: enteredTitle,
          actId: chosenActId,
        },
      })
      if (res?.chapter) {
        setChapters((prev) => [...prev, res.chapter as any])
        showToast(`Chapter "${enteredTitle}" created in database`)
        navigate({
          to: '/write/editor/$workId/$chapterId',
          params: { workId: work.id, chapterId: res.chapter.id },
        })
      }
    } catch (err: any) {
      console.warn('[handleCreateChapter] DB creation failed, falling back to local:', err)
      const created = addNewChapter(work.id, enteredTitle)
      setChapters((prev) => [...prev, created as any])
      navigate({
        to: '/write/editor/$workId/$chapterId',
        params: { workId: work.id, chapterId: (created as any).id },
      })
    }
  }

  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${chapterTitle}"? This cannot be undone.`
      )
    ) {
      return
    }

    const prevChapters = [...chapters]
    setChapters((prev) => prev.filter((c) => c.id !== chapterId))

    try {
      await deleteWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId,
        },
      })
      showToast(`Chapter "${chapterTitle}" deleted`)
    } catch (err: any) {
      console.error('[handleDeleteChapter] Error:', err)
      setChapters(prevChapters)
      showToast(err?.message || 'Failed to delete chapter')
    }
  }

  const handleToggleStatus = async (chapterId: string) => {
    const targetChapter = chapters.find((c) => c.id === chapterId)
    if (!targetChapter) return

    const nextStatus = targetChapter.status === 'published' ? 'draft' : 'published'

    // Optimistic update
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, status: nextStatus } : c))
    )
    showToast(`Chapter status changed to ${nextStatus}`)

    // Persist to DB
    try {
      await saveWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId,
          title: targetChapter.title,
          status: nextStatus,
        },
      })
    } catch (err: any) {
      console.error('[handleToggleStatus] Error updating status in DB:', err)
      // Rollback
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, status: targetChapter.status } : c))
      )
      showToast('Failed to update status in database')
    }
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
            <div className="relative group shrink-0">
              <img
                src={coverUrl || work.cover}
                alt={work.title}
                className="h-20 w-14 sm:h-24 sm:w-16 rounded object-cover border border-[var(--border-strong)] shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono cursor-pointer"
                title="Change Manuscript Cover"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Change</span>
              </button>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Publication Status Badge */}
                {publicationStatus === 'Published' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    <Globe className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    Published
                  </span>
                ) : publicationStatus === 'Archived' ? (
                  <span className="inline-flex items-center gap-1 rounded bg-stone-500/15 border border-stone-500/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    <Archive className="h-3 w-3" />
                    Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[9px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                    <FileText className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    Draft
                  </span>
                )}

                {/* Visibility Badge */}
                <span className="inline-flex items-center gap-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[9px] text-[var(--ink-muted)] uppercase tracking-wider">
                  {visibility === 'Public' ? (
                    <>
                      <Eye className="h-3 w-3" />
                      Public Discovery
                    </>
                  ) : visibility === 'Unlisted' ? (
                    <>
                      <Lock className="h-3 w-3" />
                      Unlisted (Direct Link)
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      Private
                    </>
                  )}
                </span>

                {/* Work Lifecycle Badge (Ongoing / Completed) */}
                <span className="rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[9px] font-medium text-[var(--ink-secondary)] uppercase tracking-wider">
                  {workStatus}
                </span>

                <span className="font-mono text-xs text-[var(--ink-muted)]">{work.category}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] mt-1">
                {work.title}
              </h1>
              <p className="font-mono text-xs text-[var(--ink-muted)] mt-0.5">
                {chapters.length} Chapters • <span title={`${formatViewCount(work.totalReads, false)} Lifetime Reads`}>{formatViewCount(work.totalReads, true)} Lifetime Reads</span>
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Publish CTA if in Draft */}
            {publicationStatus === 'Draft' && (
              <button
                type="button"
                onClick={handleQuickPublish}
                disabled={isUpdatingPub}
                className="inline-flex items-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                title="Publish entire manuscript to readers"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{isUpdatingPub ? 'Publishing...' : 'Publish Manuscript'}</span>
              </button>
            )}

            {/* Publication & Visibility Settings Button */}
            <button
              type="button"
              onClick={openPubModal}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)] transition-colors shadow-2xs"
              title="Change visibility, publication status, or serialization"
            >
              <Globe className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
              <span>Publication & Visibility</span>
            </button>

            <Link
              to="/write/analytics/$workId"
              params={{ workId: work.id }}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] no-underline"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Analytics</span>
            </Link>

            <button
              onClick={openCreateActModal}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] hover:text-[var(--ink-primary)] transition-colors shadow-2xs"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{acts.length > 0 ? '+ Add Act' : '+ Add Act Divider'}</span>
            </button>

            <button
              onClick={() => openCreateChapterModal()}
              className="inline-flex items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Write Chapter</span>
            </button>
          </div>
        </div>

        {/* Quick Work Stats Summary */}
        <div className={`pt-6 grid grid-cols-2 ${acts.length > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-4 font-mono text-xs text-center`}>
          {acts.length > 0 && (
            <div>
              <p className="font-semibold text-base text-[var(--ink-primary)]">{acts.length}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase">Acts / Movements</p>
            </div>
          )}
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
            <p className="font-semibold text-base text-[var(--ink-primary)]">{work.ratingScore ? work.ratingScore.toFixed(1) : '5.0'} / 5.0</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Editorial Score</p>
          </div>
        </div>
      </div>

      {/* Chapters Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
              {acts.length > 0 ? 'Manuscript Folio & Chapters' : 'Manuscript Chapters'}
            </h2>
            <p className="text-xs text-[var(--ink-muted)]">
              {acts.length > 0
                ? 'Organize your chapters into Acts, manage publication status, or launch the writing canvas.'
                : 'Reorder chapters, manage publish status, or launch the writing canvas.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* View Mode Toggle: Only shown when story has Acts */}
            {acts.length > 0 && (
              <div className="flex items-center gap-0.5 bg-[var(--bg-canvas)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  By Acts
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('flat')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    viewMode === 'flat'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  All Chapters
                </button>
              </div>
            )}

            <FilterDisclosure
              label="Status"
              activeId={chapterFilter}
              onChange={setChapterFilter}
              items={[
                { id: 'all', label: `All (${chapters.length})` },
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

        {acts.length > 0 && viewMode === 'grouped' ? (
          /* Grouped by Acts View */
          <div className="space-y-6">
            {acts.map((act) => {
              const actChapters = displayedChapters.filter(
                (ch) => ch.actId === act.id || ch.actNumber === act.number
              )
              const actWordCount = actChapters.reduce((acc, c) => acc + (c.wordCount ?? (c as any).word_count ?? 0), 0)

              return (
                <div
                  key={act.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-2xs"
                >
                  {/* Act Header */}
                  <div className="p-4 sm:px-5 sm:py-3.5 bg-[var(--bg-canvas)]/70 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                        {act.title || `Act ${act.number}`}
                      </h3>
                      {act.description && (
                        <p className="text-xs text-[var(--ink-muted)] font-serif italic">
                          {act.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 font-mono text-[11px] text-[var(--ink-muted)]">
                      <span>{actChapters.length} {actChapters.length === 1 ? 'chapter' : 'chapters'}</span>
                      <span>•</span>
                      <span>{Number(actWordCount || 0).toLocaleString()} words</span>

                      <div className="flex items-center gap-1.5 ml-2 border-l border-[var(--border-subtle)] pl-3">
                        <button
                          type="button"
                          onClick={() => openEditActModal(act)}
                          className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]"
                          title="Edit Act Details"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAct(act.id, act.title)}
                          className="p-1 rounded text-[var(--ink-muted)] hover:text-red-600 hover:bg-[var(--bg-subtle)]"
                          title="Remove Act (chapters will remain safely in manuscript)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openCreateChapterModal(act.id)}
                          className="inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Chapter</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Act Chapters */}
                  {actChapters.length === 0 ? (
                    <div className="p-6 text-center text-xs font-serif text-[var(--ink-muted)] space-y-2">
                      <p>No chapters filed under this Act yet.</p>
                      <button
                        type="button"
                        onClick={() => openCreateChapterModal(act.id)}
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--ink-primary)] underline hover:opacity-80"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Pen first chapter for {act.title}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {actChapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--bg-canvas)]/50 transition-colors"
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
                                <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                                <span>•</span>
                                <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min read</span>
                                {ch.publishedAt && <span>• Published {ch.publishedAt}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:justify-end">
                            {/* Quick Act Mover (shown if multiple acts exist) */}
                            {acts.length > 1 && (
                              <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                                <span className="text-[10px] uppercase text-[var(--ink-faint)] hidden sm:inline">Move:</span>
                                <select
                                  value={ch.actId || ''}
                                  onChange={(e) => handleAssignChapterAct(ch.id, e.target.value || null)}
                                  className="text-[11px] font-mono bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded px-2 py-0.5 cursor-pointer focus:outline-none"
                                  title="Move Chapter to another Act"
                                >
                                  {acts.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      Act {a.number}: {a.title}
                                    </option>
                                  ))}
                                  <option value="">(Remove from Act)</option>
                                </select>
                              </div>
                            )}

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
                              className="rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 no-underline shadow-2xs"
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

                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(ch.id, ch.title)}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                              title="Delete Chapter"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pen chapter in this Act footer */}
                  <div className="p-2.5 bg-[var(--bg-canvas)]/40 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] text-[var(--ink-faint)]">
                      Act {act.number} • {actChapters.length} {actChapters.length === 1 ? 'Chapter' : 'Chapters'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateChapterModal(act.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] px-2.5 py-1 rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] transition-colors shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Chapter to Act {act.number}</span>
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Unassigned Chapters Section (if any chapters are not assigned to an Act) */}
            {(() => {
              const unassigned = displayedChapters.filter(
                (ch) => !ch.actId || !acts.some((a) => a.id === ch.actId || a.number === ch.actNumber)
              )
              if (unassigned.length === 0) return null

              return (
                <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
                  <div className="p-4 bg-[var(--bg-canvas)]/40 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        Unassigned Chapters ({unassigned.length})
                      </h4>
                      <p className="text-xs text-[var(--ink-muted)]">
                        These chapters are not assigned to any narrative movement yet.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {unassigned.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--bg-canvas)]/50 transition-colors"
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
                              <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                              <span>•</span>
                              <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min read</span>
                              {ch.publishedAt && <span>• Published {ch.publishedAt}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:justify-end">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                            <span className="text-[10px] uppercase text-[var(--ink-faint)] hidden sm:inline">Assign:</span>
                            <select
                              value=""
                              onChange={(e) => handleAssignChapterAct(ch.id, e.target.value)}
                              className="text-[11px] font-mono bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded px-2 py-0.5 cursor-pointer focus:outline-none"
                            >
                              <option value="" disabled>Choose Act...</option>
                              {acts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  Act {a.number}: {a.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => handleToggleStatus(ch.id)}
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                              ch.status === 'published'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {ch.status}
                          </button>

                          <Link
                            to="/write/editor/$workId/$chapterId"
                            params={{ workId: work.id, chapterId: ch.id }}
                            className="rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 no-underline shadow-2xs"
                          >
                            Edit Chapter
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(ch.id, ch.title)}
                            className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                            title="Delete Chapter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Add Next Act CTA Divider */}
            <button
              type="button"
              onClick={openCreateActModal}
              className="w-full py-4 border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl text-center text-xs font-mono font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]/50 transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>+ Add Act {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][acts.length] || String(acts.length + 1)} Divider</span>
            </button>
          </div>
        ) : (
          /* Flat All Chapters View (Used when acts === 0 or when author selects All Chapters) */
          <div className="space-y-4">
            {displayedChapters.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-3">
                <p className="font-serif text-sm text-[var(--ink-muted)]">
                  {searchQuery || chapterFilter !== 'all'
                    ? 'No chapters found matching your filter.'
                    : 'Your manuscript folio is waiting for its first chapter.'}
                </p>
                {!searchQuery && chapterFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => openCreateChapterModal()}
                    className="inline-flex items-center gap-1.5 rounded bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Pen First Chapter</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
                {displayedChapters.map((ch) => {
                  const matchedAct = acts.find((a) => a.id === ch.actId || a.number === ch.actNumber)
                  return (
                    <div
                      key={ch.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-[var(--bg-canvas)] transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <span className="font-mono text-sm font-bold text-[var(--ink-faint)] w-8">
                          {String(ch.number).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                              {ch.title}
                            </h4>
                            {matchedAct && (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                Act {matchedAct.number}
                              </span>
                            )}
                          </div>
                          {ch.subtitle && (
                            <p className="text-xs text-[var(--ink-muted)] font-serif italic">
                              {ch.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--ink-faint)] mt-1">
                            <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                            <span>•</span>
                            <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min read</span>
                            {ch.publishedAt && <span>• Published {ch.publishedAt}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center gap-3 sm:justify-end">
                        {acts.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                            <span className="text-[10px] uppercase text-[var(--ink-faint)] hidden sm:inline">Move:</span>
                            <select
                              value={ch.actId || ''}
                              onChange={(e) => handleAssignChapterAct(ch.id, e.target.value || null)}
                              className="text-[11px] font-mono bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded px-2 py-0.5 cursor-pointer focus:outline-none"
                              title="Move Chapter to Act"
                            >
                              <option value="">No Act</option>
                              {acts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  Act {a.number}: {a.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

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
                          className="rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 no-underline shadow-2xs"
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

                        <button
                          type="button"
                          onClick={() => handleDeleteChapter(ch.id, ch.title)}
                          className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Subtle bottom prompt to introduce Acts when manuscript has multiple chapters and 0 acts */}
            {acts.length === 0 && chapters.length > 1 && (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--ink-muted)] bg-[var(--bg-surface)]/40">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Planning a longer narrative arc? You can divide chapters into overarching narrative Acts anytime.</span>
                </div>
                <button
                  type="button"
                  onClick={openCreateActModal}
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--ink-primary)] hover:underline whitespace-nowrap"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Act Divider</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New / Edit Act Modal */}
      {actModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-[var(--bg-subtle)] text-[var(--ink-primary)]">
                <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  {editingAct ? 'Edit Act' : acts.length === 0 ? 'Create First Act' : 'Add New Act'}
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Acts divide your serialized story into overarching narrative movements or arcs.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAct} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Act Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Act I: The Departure"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Description / Movement Focus (Optional)
                </label>
                <textarea
                  rows={2}
                  value={actDescription}
                  onChange={(e) => setActDescription(e.target.value)}
                  placeholder="e.g. The journey across the border and the descent into uncharted territories..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)] resize-none"
                />
              </div>

              {/* Chapter Assignment Assistant when creating a new Act */}
              {!editingAct && chapters.length > 0 && (
                <div className="rounded-lg bg-[var(--bg-canvas)] p-3 border border-[var(--border-subtle)] space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                    Chapter Assignment
                  </label>
                  <div className="space-y-2 text-xs text-[var(--ink-secondary)]">
                    {acts.length === 0 ? (
                      <>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="assignMode"
                            checked={assignMode === 'all'}
                            onChange={() => setAssignMode('all')}
                            className="mt-0.5 text-[var(--ink-primary)]"
                          />
                          <div>
                            <span className="font-medium text-[var(--ink-primary)]">Group all existing chapters (Chapters 1 to {chapters.length}) into this Act</span>
                            <p className="text-[11px] text-[var(--ink-muted)]">Your current chapters will become Act I.</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="assignMode"
                            checked={assignMode === 'none'}
                            onChange={() => setAssignMode('none')}
                            className="mt-0.5 text-[var(--ink-primary)]"
                          />
                          <div>
                            <span className="font-medium text-[var(--ink-primary)]">Start Act empty</span>
                            <p className="text-[11px] text-[var(--ink-muted)]">Leave existing chapters unassigned; you can move them into this Act later.</p>
                          </div>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="radio"
                            name="assignMode"
                            checked={assignMode === 'none'}
                            onChange={() => setAssignMode('none')}
                            className="mt-0.5 text-[var(--ink-primary)]"
                          />
                          <div>
                            <span className="font-medium text-[var(--ink-primary)]">Start Act empty (Recommended)</span>
                            <p className="text-[11px] text-[var(--ink-muted)]">Pen new chapters directly inside this Act or move chapters later.</p>
                          </div>
                        </label>

                        {chapters.some((c) => !c.actId) && (
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="radio"
                              name="assignMode"
                              checked={assignMode === 'unassigned'}
                              onChange={() => setAssignMode('unassigned')}
                              className="mt-0.5 text-[var(--ink-primary)]"
                            />
                            <div>
                              <span className="font-medium text-[var(--ink-primary)]">Move unassigned chapters ({chapters.filter((c) => !c.actId).length}) to this Act</span>
                              <p className="text-[11px] text-[var(--ink-muted)]">Automatically bundle floating chapters into this new Act.</p>
                            </div>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => {
                    setActModalOpen(false)
                    setEditingAct(null)
                  }}
                  className="px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[var(--ink-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
                >
                  {editingAct ? 'Save Changes' : 'Create Act'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publication & Visibility Modal */}
      {pubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[82vh] h-[560px] flex flex-col rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 shrink-0 bg-[var(--bg-surface)]">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Publication & Visibility
                </h3>
                <p className="font-mono text-xs text-[var(--ink-muted)]">
                  Configure reader access and publication state
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPubModalOpen(false)}
                className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded hover:bg-[var(--bg-subtle)] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSavePublication} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Publication Status Selector */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Publication Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalPubStatus('Published')
                        if (modalVisibility === 'Draft') setModalVisibility('Public')
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        modalPubStatus === 'Published'
                          ? 'border-emerald-600 bg-emerald-500/10 text-[var(--ink-primary)] shadow-2xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-300">
                        <Globe className="h-3.5 w-3.5" />
                        <span>Published</span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">Live to audience</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalPubStatus('Draft')
                        setModalVisibility('Draft')
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        modalPubStatus === 'Draft'
                          ? 'border-amber-600 bg-amber-500/10 text-[var(--ink-primary)] shadow-2xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-700 dark:text-amber-300">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Draft</span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">Private drafting</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalPubStatus('Archived')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        modalPubStatus === 'Archived'
                          ? 'border-stone-600 bg-stone-500/10 text-[var(--ink-primary)] shadow-2xs'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-700 dark:text-stone-300">
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archived</span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">Retired catalog</p>
                    </button>
                  </div>
                </div>

                {/* Visibility Selector */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Audience Visibility
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        modalVisibility === 'Public'
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="Public"
                        checked={modalVisibility === 'Public'}
                        onChange={() => {
                          setModalVisibility('Public')
                          if (modalPubStatus === 'Draft') setModalPubStatus('Published')
                        }}
                        className="mt-0.5 accent-[var(--ink-primary)]"
                      />
                      <div>
                        <div className="font-semibold text-xs text-[var(--ink-primary)] flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Public Discovery</span>
                        </div>
                        <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                          Discoverable across Hatchpen search, browse categories, genre shelves, and your author profile.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        modalVisibility === 'Unlisted'
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="Unlisted"
                        checked={modalVisibility === 'Unlisted'}
                        onChange={() => setModalVisibility('Unlisted')}
                        className="mt-0.5 accent-[var(--ink-primary)]"
                      />
                      <div>
                        <div className="font-semibold text-xs text-[var(--ink-primary)] flex items-center gap-1.5">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Unlisted (Direct Link Only)</span>
                        </div>
                        <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                          Hidden from search and catalog. Accessible only by readers with the direct link.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        modalVisibility === 'Draft'
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="Draft"
                        checked={modalVisibility === 'Draft'}
                        onChange={() => {
                          setModalVisibility('Draft')
                          setModalPubStatus('Draft')
                        }}
                        className="mt-0.5 accent-[var(--ink-primary)]"
                      />
                      <div>
                        <div className="font-semibold text-xs text-[var(--ink-primary)] flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                          <span>Private Draft</span>
                        </div>
                        <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                          Completely private. Visible only to you in your Writer Studio.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Story Lifecycle (Ongoing / Completed) */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Story Lifecycle
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setModalStatus('Ongoing')}
                      className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                        modalStatus === 'Ongoing'
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      Ongoing (Serialized)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalStatus('Completed')}
                      className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                        modalStatus === 'Completed'
                          ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      Completed Work
                    </button>
                  </div>
                </div>

                {/* Guidance Info Box */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2.5 text-xs text-[var(--ink-muted)] flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {modalPubStatus === 'Published'
                      ? `Publishing makes your ${chapters.filter((c: any) => c.status === 'published').length} published chapter(s) accessible to readers.`
                      : 'Setting status to Draft will conceal the work from public catalogs so you can write privately.'}
                  </span>
                </div>
              </div>

              {/* Sticky Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
                <button
                  type="button"
                  onClick={() => setPubModalOpen(false)}
                  className="rounded px-4 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPub}
                  className="rounded bg-[var(--ink-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs disabled:opacity-50"
                >
                  {isUpdatingPub ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Chapter Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. The Station at Dawn"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              {/* Show Act selector ONLY if manuscript has Acts */}
              {acts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      Assign to Act
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewChapterModalOpen(false)
                        openCreateActModal()
                      }}
                      className="text-[11px] font-mono text-[var(--ink-primary)] underline hover:opacity-80"
                    >
                      + New Act
                    </button>
                  </div>
                  <select
                    value={targetActId}
                    onChange={(e) => setTargetActId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                  >
                    <option value="">No Act (Unassigned)</option>
                    {acts.map((act) => (
                      <option key={act.id} value={act.id}>
                        Act {act.number}: {act.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setNewChapterModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-[var(--ink-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
                >
                  Create & Launch Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Cover Modal */}
      {coverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Change Manuscript Cover
                </h3>
                <p className="font-mono text-xs text-[var(--ink-muted)]">
                  PNG/JPG files are auto-converted to WebP before uploading
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoverModalOpen(false)}
                className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded hover:bg-[var(--bg-subtle)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <CloudinaryImageUpload
                label="Select or Upload New Cover"
                folder="covers"
                currentImageUrl={coverUrl}
                recommendedDimensions="600 × 900 px"
                aspectRatioHint="Portrait (2:3)"
                onImageUploaded={handleSaveNewCover}
                allowPlatformPicker={true}
              />

              <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  disabled={isSavingCover}
                  onClick={() => setCoverModalOpen(false)}
                  className="rounded px-4 py-1.5 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
