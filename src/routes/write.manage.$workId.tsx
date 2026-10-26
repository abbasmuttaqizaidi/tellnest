import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import {
  ArrowLeft,
  PenLine,
  Plus,
  ChevronDown,
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
  Camera,
  Search,
  Image as ImageIcon,
  X
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
  staleTime: 30_000,
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

  // Add Button Dropdown State (+ Chapter / + Act)
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const addDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addDropdownRef.current && !addDropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false)
      }
    }
    if (addDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [addDropdownOpen])

  // Act 3-dots Menu & Delete Confirmation State
  const [openActMenuId, setOpenActMenuId] = useState<string | null>(null)
  const [deleteActTarget, setDeleteActTarget] = useState<{ id: string; title: string; chapterCount: number } | null>(null)
  const [isDeletingAct, setIsDeletingAct] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target?.closest('.act-menu-container')) {
        setOpenActMenuId(null)
      }
    }
    if (openActMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openActMenuId])

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
    if (modalPubStatus === 'Published' && publishedChaptersCount === 0) {
      showToast('Cannot publish manuscript without at least 1 published chapter. Please publish Chapter 1 first.')
      return
    }
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
    if (publishedChaptersCount === 0) {
      showToast('Cannot publish manuscript without at least 1 published chapter. Please publish Chapter 1 first.')
      return
    }
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

  const handleConfirmDeleteAct = async () => {
    if (!deleteActTarget) return
    setIsDeletingAct(true)
    const { id: actId, title: actTitle } = deleteActTarget

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
      setDeleteActTarget(null)
    } catch (err: any) {
      console.error('[handleConfirmDeleteAct] Error:', err)
      showToast(err?.message || 'Failed to remove act')
    } finally {
      setIsDeletingAct(false)
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
      const res = await deleteWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId,
        },
      })
      if (res?.workRevertedToDraft) {
        setPublicationStatus('Draft')
        setVisibility('Draft')
        if (work) {
          work.publicationStatus = 'Draft'
          work.visibility = 'Draft'
        }
        await Promise.all([
          reloadWriterWorksFromDb?.(),
          reloadWorksFromDb?.(),
        ])
        showToast(`Chapter "${chapterTitle}" deleted. Manuscript reverted to Draft as no published chapters remain.`)
      } else {
        showToast(`Chapter "${chapterTitle}" deleted`)
      }
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
      const res = await saveWriterChapterServerFn({
        data: {
          workId: work.id,
          chapterId,
          title: targetChapter.title,
          status: nextStatus,
        },
      })
      if (res?.workRevertedToDraft) {
        setPublicationStatus('Draft')
        setVisibility('Draft')
        if (work) {
          work.publicationStatus = 'Draft'
          work.visibility = 'Draft'
        }
        await Promise.all([
          reloadWriterWorksFromDb?.(),
          reloadWorksFromDb?.(),
        ])
        showToast('Manuscript reverted to Draft as no published chapters remain.')
      }
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

  // Calculate total manuscript word count across all chapters
  const totalWordCount = useMemo(() => {
    return chapters.reduce((acc, c) => acc + (c.wordCount ?? (c as any).word_count ?? 0), 0)
  }, [chapters])

  const publishedChaptersCount = useMemo(() => {
    return chapters.filter((c) => c.status === 'published').length
  }, [chapters])

  const draftChaptersCount = useMemo(() => {
    return chapters.filter((c) => c.status === 'draft').length
  }, [chapters])

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/write"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Writer Dashboard</span>
        </Link>

        {/* Reading preview link if manuscript has published chapters */}
        {publishedChaptersCount > 0 && (
          <Link
            to="/works/$workId"
            params={{ workId: getWorkSlug(work) }}
            className="inline-flex items-center gap-1 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
          >
            <span>View Reader Folio</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Manuscript Overview Hero Card */}
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-7 mb-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Left: Book Cover + Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full md:w-auto">
            {/* Interactive Cover Thumbnail */}
            <div className="relative group shrink-0">
              <img
                src={coverUrl || work.cover}
                alt={work.title}
                className="h-24 w-16 sm:h-28 sm:w-20 rounded-lg object-cover border border-[var(--border-strong)] shadow-xs transition-transform group-hover:scale-[1.02]"
              />
              <button
                type="button"
                onClick={() => setCoverModalOpen(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono cursor-pointer backdrop-blur-2xs"
                title="Change Manuscript Cover"
              >
                <Camera className="h-4 w-4" />
                <span>Change</span>
              </button>
            </div>

            {/* Title, Taxonomy, Interactive Badges & Inline Stats */}
            <div className="space-y-1.5 min-w-0 flex-1">
              {/* Badges & Category Row */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {/* Clickable Publication Status Pill */}
                <button
                  type="button"
                  onClick={openPubModal}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                    publicationStatus === 'Published'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : publicationStatus === 'Archived'
                      ? 'bg-stone-500/15 text-stone-700 dark:text-stone-300 border border-stone-500/30 hover:bg-stone-500/25'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                  title="Click to change Publication & Visibility settings"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    publicationStatus === 'Published' ? 'bg-emerald-500' : publicationStatus === 'Archived' ? 'bg-stone-400' : 'bg-amber-500 animate-pulse'
                  }`} />
                  <span>{publicationStatus}</span>
                  <span className="text-[9px] opacity-60">({visibility})</span>
                </button>

                {/* Work Lifecycle Badge */}
                <span className="rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--ink-secondary)] uppercase tracking-wider">
                  {workStatus}
                </span>

                {work.category && (
                  <span className="font-mono text-xs text-[var(--ink-muted)] hidden sm:inline">
                    • {work.category}
                  </span>
                )}
              </div>

              {/* Manuscript Title */}
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight truncate">
                {work.title}
              </h1>

              {/* Clean Inline Metrics Strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-[var(--ink-muted)] pt-0.5">
                <span className="font-semibold text-[var(--ink-primary)]">
                  {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'}
                </span>
                <span>•</span>
                <span>{totalWordCount.toLocaleString()} words</span>
                <span>•</span>
                <span title={`${formatViewCount(work.totalReads, false)} Lifetime Reads`}>
                  {formatViewCount(work.totalReads, true)} reads
                </span>
                {work.totalSaves > 0 && (
                  <>
                    <span>•</span>
                    <span>{work.totalSaves} saves</span>
                  </>
                )}
                {acts.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {acts.length} {acts.length === 1 ? 'Act' : 'Acts'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Streamlined Action Cluster */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
            {/* Quick Publish CTA if manuscript is still in Draft */}
            {publicationStatus === 'Draft' && (
              <button
                type="button"
                onClick={handleQuickPublish}
                disabled={isUpdatingPub || publishedChaptersCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title={
                  publishedChaptersCount === 0
                    ? 'Publish at least 1 chapter before publishing manuscript'
                    : 'Publish entire manuscript to readers'
                }
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{isUpdatingPub ? 'Publishing...' : 'Publish'}</span>
              </button>
            )}

            {/* Publication & Visibility Settings */}
            <button
              type="button"
              onClick={openPubModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer shadow-2xs"
              title="Configure audience visibility and publication state"
            >
              <Settings className="h-3.5 w-3.5 text-black dark:text-white" />
              <span>Visibility</span>
            </button>

            {/* Analytics */}
            <Link
              to="/write/analytics/$workId"
              params={{ workId: work.id }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors no-underline shadow-2xs"
            >
              <BarChart3 className="h-3.5 w-3.5 text-black dark:text-white" />
              <span className="hidden sm:inline">Analytics</span>
            </Link>

            {/* Add Button with Popup Dropdown */}
            <div className="relative" ref={addDropdownRef}>
              <button
                type="button"
                onClick={() => setAddDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] px-3.5 py-2 text-xs font-semibold text-[var(--ink-primary)] shadow-2xs transition-colors cursor-pointer"
                title="Add Chapter or Act"
                aria-expanded={addDropdownOpen}
              >
                <Plus className="h-4 w-4 text-black dark:text-white" strokeWidth={2.5} />
                <span>Add</span>
                <ChevronDown className={`h-3 w-3 text-black dark:text-white transition-transform duration-150 ${addDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {addDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setAddDropdownOpen(false)
                      openCreateChapterModal()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-black dark:text-white shrink-0" strokeWidth={2.5} />
                    <span className="font-semibold">Chapter</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddDropdownOpen(false)
                      openCreateActModal()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-black dark:text-white shrink-0" strokeWidth={2.5} />
                    <span className="font-semibold">Act</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Chapters Folio Workspace */}
      <div className="space-y-4">
        
        {/* Workspace Toolbar: Full-Width Tabs with Right-Aligned Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
          
          {/* Left: Full Tabs */}
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto -mb-px">
            <button
              type="button"
              onClick={() => setChapterFilter('all')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                chapterFilter === 'all'
                  ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>All</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                chapterFilter === 'all'
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {chapters.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChapterFilter('published')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                chapterFilter === 'published'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Published</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                chapterFilter === 'published'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {publishedChaptersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChapterFilter('draft')}
              className={`flex items-center gap-2 pb-3 pt-1 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                chapterFilter === 'draft'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
              }`}
            >
              <span>Draft</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                chapterFilter === 'draft'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
              }`}>
                {draftChaptersCount}
              </span>
            </button>
          </div>

          {/* Right: Search Input Only */}
          <div className="flex items-center pb-2.5 sm:pb-2 sm:w-64 w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-sans bg-[var(--bg-canvas)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] focus:border-[var(--ink-primary)] focus:ring-1 focus:ring-[var(--ink-primary)] rounded-full pl-8.5 pr-8 py-1.5 shadow-2xs focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Chapters Content Display */}
        {acts.length > 0 && viewMode === 'grouped' ? (
          /* Grouped by Acts View */
          <div className="space-y-5">
            {acts.map((act) => {
              const actChapters = displayedChapters.filter(
                (ch) => ch.actId === act.id || ch.actNumber === act.number
              )
              const actWordCount = actChapters.reduce((acc, c) => acc + (c.wordCount ?? (c as any).word_count ?? 0), 0)

              return (
                <div
                  key={act.id}
                  className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs ${
                    openActMenuId === act.id ? 'relative z-30 overflow-visible' : 'overflow-hidden'
                  }`}
                >
                  {/* Clean Act Header */}
                  <div className="px-4 sm:px-5 py-3.5 bg-[var(--bg-canvas)]/60 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-6 w-6 rounded-full bg-black text-white flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-xs">
                        {act.number}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)] truncate">
                          {act.title || `Act ${act.number}`}
                        </h3>
                        {act.description && (
                          <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate max-w-md">
                            {act.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <div className="relative act-menu-container">
                        <button
                          type="button"
                          onClick={() => setOpenActMenuId((prev) => (prev === act.id ? null : act.id))}
                          className="p-1.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                          title="Act options"
                          aria-label="Act options"
                          aria-expanded={openActMenuId === act.id}
                        >
                          <MoreVertical className="h-4 w-4 text-black dark:text-white" />
                        </button>

                        {openActMenuId === act.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActMenuId(null)
                                openEditActModal(act)
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-black dark:text-white shrink-0" />
                              <span>Edit Act</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActMenuId(null)
                                openCreateChapterModal(act.id)
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5 text-black dark:text-white shrink-0" strokeWidth={2.2} />
                              <span>Add Chapter</span>
                            </button>

                            <div className="my-1 border-t border-[var(--border-subtle)]" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActMenuId(null)
                                setDeleteActTarget({
                                  id: act.id,
                                  title: act.title || `Act ${act.number}`,
                                  chapterCount: actChapters.length,
                                })
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-black dark:text-white shrink-0" />
                              <span>Delete Act</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Act Chapter Rows */}
                  {actChapters.length === 0 ? (
                    <div className="p-8 text-center text-xs font-serif text-[var(--ink-muted)] space-y-2">
                      <p>No chapters filed under {act.title} yet.</p>
                      <button
                        type="button"
                        onClick={() => openCreateChapterModal(act.id)}
                        className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--ink-primary)] hover:underline"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Pen first chapter for this Act</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {actChapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 hover:bg-[var(--bg-canvas)]/40 transition-colors group"
                        >
                          {/* Chapter Identification (Clickable title navigates straight to editor) */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-[var(--ink-muted)] w-6 text-center shrink-0">
                              {String(ch.number).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <Link
                                to="/write/editor/$workId/$chapterId"
                                params={{ workId: work.id, chapterId: ch.id }}
                                className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] hover:underline truncate block no-underline"
                              >
                                {ch.title}
                              </Link>
                              {ch.subtitle && (
                                <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate">
                                  {ch.subtitle}
                                </p>
                              )}
                              <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                                <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                                <span>•</span>
                                <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min</span>
                                {(ch.bannerImage || (ch as any).banner_image_path) && (
                                  <>
                                    <span>•</span>
                                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-0.5">
                                      <ImageIcon className="h-3 w-3" />
                                      <span>Banner</span>
                                    </span>
                                  </>
                                )}
                                {ch.publishedAt && <span>• {ch.publishedAt}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Chapter Action Controls */}
                          <div className="flex items-center gap-2 sm:justify-end shrink-0 pl-9 sm:pl-0">
                            {/* Move Act Dropdown (Only if multiple acts exist) */}
                            {acts.length > 1 && (
                              <select
                                value={ch.actId || ''}
                                onChange={(e) => handleAssignChapterAct(ch.id, e.target.value || null)}
                                className="text-[11px] font-mono bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-1 cursor-pointer focus:outline-none"
                                title="Move Chapter to another Act"
                              >
                                {acts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    Act {a.number}
                                  </option>
                                ))}
                                <option value="">(Unassign)</option>
                              </select>
                            )}

                            {/* Status Toggle Pill */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ch.id)}
                              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                                ch.status === 'published'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                              }`}
                              title="Click to toggle chapter publish status"
                            >
                              {ch.status}
                            </button>

                            {/* Edit Button */}
                            <Link
                              to="/write/editor/$workId/$chapterId"
                              params={{ workId: work.id, chapterId: ch.id }}
                              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ink-primary)] no-underline shadow-2xs transition-colors"
                            >
                              Edit
                            </Link>

                            {/* Preview Reader */}
                            <Link
                              to="/read/$workId/$chapterId"
                              params={{ workId: work.id, chapterId: ch.id }}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded hover:bg-[var(--bg-subtle)] transition-colors"
                              title="Preview Reading View"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteChapter(ch.id, ch.title)}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                              title="Delete Chapter"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Unassigned Chapters (If any chapters are floating without an Act) */}
            {(() => {
              const unassigned = displayedChapters.filter(
                (ch) => !ch.actId || !acts.some((a) => a.id === ch.actId || a.number === ch.actNumber)
              )
              if (unassigned.length === 0) return null

              return (
                <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
                  <div className="px-5 py-3 bg-[var(--bg-canvas)]/40 border-b border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        Unassigned Chapters ({unassigned.length})
                      </h4>
                      <p className="text-xs text-[var(--ink-muted)]">
                        Chapters waiting to be grouped into an Act.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)]">
                    {unassigned.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 hover:bg-[var(--bg-canvas)]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-[var(--ink-muted)] w-6 text-center shrink-0">
                            {String(ch.number).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to="/write/editor/$workId/$chapterId"
                              params={{ workId: work.id, chapterId: ch.id }}
                              className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] hover:underline truncate block no-underline"
                            >
                              {ch.title}
                            </Link>
                            {ch.subtitle && (
                              <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate">
                                {ch.subtitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                              <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                              <span>•</span>
                              <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min</span>
                              {(ch.bannerImage || (ch as any).banner_image_path) && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-0.5">
                                    <ImageIcon className="h-3 w-3" />
                                    <span>Banner</span>
                                  </span>
                                </>
                              )}
                              {ch.publishedAt && <span>• {ch.publishedAt}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:justify-end shrink-0 pl-9 sm:pl-0">
                          <select
                            value=""
                            onChange={(e) => handleAssignChapterAct(ch.id, e.target.value)}
                            className="text-[11px] font-mono bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)] rounded px-1.5 py-1 cursor-pointer focus:outline-none"
                          >
                            <option value="" disabled>Assign to Act...</option>
                            {acts.map((a) => (
                              <option key={a.id} value={a.id}>
                                Act {a.number}: {a.title}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(ch.id)}
                            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
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
                            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ink-primary)] no-underline shadow-2xs"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(ch.id, ch.title)}
                            className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                            title="Delete Chapter"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Quick Add Next Act Divider */}
            <button
              type="button"
              onClick={openCreateActModal}
              className="w-full py-3.5 border border-dashed border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl text-center text-xs font-mono font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>+ Add Act {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][acts.length] || String(acts.length + 1)} Divider</span>
            </button>
          </div>
        ) : (
          /* Flat All Chapters View */
          <div className="space-y-4">
            {displayedChapters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-10 text-center space-y-3">
                <FileText className="h-8 w-8 text-[var(--ink-muted)] mx-auto opacity-50" />
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  {searchQuery ? 'No chapters match your search query' : 'No chapters in this manuscript yet'}
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try clearing the search or changing your filter criteria.'
                    : 'Every epic begins with a single sentence. Pen your first chapter now.'}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setChapterFilter('all')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-primary)] underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCreateChapterModal()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Chapter</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs divide-y divide-[var(--border-subtle)]">
                {displayedChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-5 hover:bg-[var(--bg-canvas)]/40 transition-colors group"
                  >
                    {/* Chapter Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-[var(--ink-muted)] w-6 text-center shrink-0">
                        {String(ch.number).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to="/write/editor/$workId/$chapterId"
                          params={{ workId: work.id, chapterId: ch.id }}
                          className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] hover:underline truncate block no-underline"
                        >
                          {ch.title}
                        </Link>
                        {ch.subtitle && (
                          <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate">
                            {ch.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                          <span>{Number(ch.wordCount ?? (ch as any).word_count ?? 0).toLocaleString()} words</span>
                          <span>•</span>
                          <span>{ch.readTimeMinutes ?? (ch as any).reading_time_minutes ?? 1} min</span>
                          {ch.publishedAt && <span>• {ch.publishedAt}</span>}
                          {ch.actTitle && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              • {ch.actTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Chapter Actions */}
                    <div className="flex items-center gap-2 sm:justify-end shrink-0 pl-9 sm:pl-0">
                      {/* Status Toggle Pill */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(ch.id)}
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          ch.status === 'published'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                        }`}
                        title="Click to toggle publish status"
                      >
                        {ch.status}
                      </button>

                      {/* Edit Button */}
                      <Link
                        to="/write/editor/$workId/$chapterId"
                        params={{ workId: work.id, chapterId: ch.id }}
                        className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ink-primary)] no-underline shadow-2xs transition-colors"
                      >
                        Edit
                      </Link>

                      {/* Preview Reading View */}
                      <Link
                        to="/read/$workId/$chapterId"
                        params={{ workId: work.id, chapterId: ch.id }}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded hover:bg-[var(--bg-subtle)] transition-colors"
                        title="Preview Reading View"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      {/* Delete Chapter */}
                      <button
                        type="button"
                        onClick={() => handleDeleteChapter(ch.id, ch.title)}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-red-600 rounded hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                        title="Delete Chapter"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
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
                  {publishedChaptersCount === 0 && (
                    <div className="mb-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
                      ⚠️ <strong>Cannot publish yet:</strong> Publish at least 1 chapter before making this story public.
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={publishedChaptersCount === 0}
                      onClick={() => {
                        if (publishedChaptersCount === 0) return
                        setModalPubStatus('Published')
                        if (modalVisibility === 'Draft') setModalVisibility('Public')
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        publishedChaptersCount === 0
                          ? 'opacity-40 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-canvas)]'
                          : modalPubStatus === 'Published'
                          ? 'border-emerald-600 bg-emerald-500/10 text-[var(--ink-primary)] shadow-2xs cursor-pointer'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] cursor-pointer'
                      }`}
                      title={publishedChaptersCount === 0 ? 'Publish at least 1 chapter first' : undefined}
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

      {/* Delete Act Confirmation Modal */}
      {deleteActTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Delete Act?
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Are you sure you want to delete <span className="font-semibold text-[var(--ink-primary)] font-serif">"{deleteActTarget.title}"</span>?
                </p>
              </div>
            </div>

            {/* Informational Banner */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-3.5 flex items-start gap-3 text-xs">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Chapters will NOT be deleted
                </p>
                <p className="text-[11px] leading-relaxed text-[var(--ink-secondary)]">
                  Yeh Act delete karne se kewal Act delete hoga, chapters delete nahi honge. Is Act ke andar ke tamaam {deleteActTarget.chapterCount} chapter(s) manuscript mein <strong>Unassigned Chapters</strong> ke taur par mehfooz rahenge.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                disabled={isDeletingAct}
                onClick={() => setDeleteActTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAct}
                onClick={handleConfirmDeleteAct}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeletingAct ? 'Deleting...' : 'Delete Act'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
