import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useApp } from '../context/AppContext'
import {
  verifyAdminSessionServerFn,
  adminUpdateWorkServerFn,
  adminUpsertActServerFn,
  adminPostChapterServerFn,
  getAdminWorkActsAnalyticsServerFn,
  type WorkActAnalytics,
} from '../server/admin'
import { Badge, Button } from '../design-system'
import { UnisexAvatar } from '../components/UnisexAvatar'
import {
  ShieldAlert,
  ArrowLeft,
  BookOpen,
  Plus,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Eye,
  Settings2,
  Image as ImageIcon,
  Tag,
  PenTool,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import type { Work, Act, Chapter } from '../data/mockData'

const ADMIN_TOKEN_KEY = 'tellnest_admin_session_token'

export const Route = createFileRoute('/admin-work-editor/$workId')({
  head: () =>
    generateMeta({
      title: 'Admin Manuscript Editor',
      noindex: true,
    }),
  component: AdminWorkEditorPage,
})

const PRESET_COVERS = [
  { label: 'Perimeter Architecture', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80' },
  { label: 'Monochrome Coast', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Atmospheric Fog', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cosmic Static', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
  { label: 'Editorial Manuscript', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80' },
]

function AdminWorkEditorPage() {
  const { workId } = Route.useParams()
  const navigate = useNavigate()
  const {
    getWorkById,
    allWorks,
    updateWork,
    addActToWork,
    updateActInWork,
    addAdminPostedChapter,
    reloadWorksFromDb,
    categories,
    genres,
    showToast,
  } = useApp()

  // 1. Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY)
    }
    return null
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(true)

  // 2. Resolve Work target
  const work = useMemo(() => {
    return (
      getWorkById(workId) ||
      allWorks.find(
        (w) =>
          w.id === workId ||
          w.id.toLowerCase() === workId.toLowerCase() ||
          w.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === workId.toLowerCase()
      )
    )
  }, [workId, getWorkById, allWorks])

  // 3. Form State
  const [title, setTitle] = useState(work?.title || '')
  const [subtitle, setSubtitle] = useState(work?.subtitle || '')
  const [cover, setCover] = useState(work?.cover || PRESET_COVERS[0].url)
  const [category, setCategory] = useState(work?.category || 'Novels')
  const [genre, setGenre] = useState(work?.genre || 'Literary Fiction')
  const [synopsis, setSynopsis] = useState(work?.synopsis || '')
  const [fullDesc, setFullDesc] = useState(work?.fullDescription || '')
  const [tags, setTags] = useState(work?.tags?.join(', ') || '')
  const [status, setStatus] = useState<'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled'>(
    (work?.status as any) || 'Ongoing'
  )
  const [visibility, setVisibility] = useState<'Public' | 'Unlisted' | 'Draft'>(
    (work?.visibility as any) || 'Public'
  )
  const [authorName, setAuthorName] = useState(work?.author.name || '')
  const [authorHandle, setAuthorHandle] = useState(work?.author.handle || '')

  // Tab Navigation: 'details' | 'acts' | 'chapters'
  const [activeTab, setActiveTab] = useState<'details' | 'acts' | 'chapters'>('details')

  // Save State
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // 4. Act Modal State
  const [showActModal, setShowActModal] = useState(false)
  const [actModalMode, setActModalMode] = useState<'create' | 'edit'>('create')
  const [selectedActId, setSelectedActId] = useState<string | null>(null)
  const [actNumberInput, setActNumberInput] = useState<number>(1)
  const [actTitleInput, setActTitleInput] = useState('')
  const [actDescInput, setActDescInput] = useState('')
  const [isSubmittingAct, setIsSubmittingAct] = useState(false)

  // 5. Chapter Modal State (Add chapter to specific act)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [targetActForChapter, setTargetActForChapter] = useState<{
    id: string
    number: number
    title: string
  } | null>(null)
  const [chNumberInput, setChNumberInput] = useState<number>(1)
  const [chTitleInput, setChTitleInput] = useState('')
  const [chSubtitleInput, setChSubtitleInput] = useState('')
  const [chStatusInput, setChStatusInput] = useState<'published' | 'draft'>('published')
  const [chContentInput, setChContentInput] = useState('')
  const [isSubmittingChapter, setIsSubmittingChapter] = useState(false)

  // 6. DB Acts breakdown state
  const [dbActs, setDbActs] = useState<WorkActAnalytics[]>([])
  const [loadingDbActs, setLoadingDbActs] = useState(false)

  // Sync state if work arrives/changes
  useEffect(() => {
    if (work) {
      setTitle(work.title)
      setSubtitle(work.subtitle || '')
      setCover(work.cover || PRESET_COVERS[0].url)
      setCategory(work.category || 'Novels')
      setGenre(work.genre || 'Literary Fiction')
      setSynopsis(work.synopsis || '')
      setFullDesc(work.fullDescription || '')
      setTags(work.tags?.join(', ') || '')
      setStatus((work.status as any) || 'Ongoing')
      setVisibility((work.visibility as any) || 'Public')
      setAuthorName(work.author.name || '')
      setAuthorHandle(work.author.handle || '')
    }
  }, [work])

  // Verify Admin Session on mount
  useEffect(() => {
    async function verify() {
      if (!adminToken) {
        setIsVerifying(false)
        setIsAuthenticated(false)
        return
      }
      try {
        const res = await verifyAdminSessionServerFn({ data: { token: adminToken } })
        if (res.valid) {
          setIsAuthenticated(true)
          loadActsFromDb(adminToken)
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      } finally {
        setIsVerifying(false)
      }
    }
    verify()
  }, [adminToken, workId])

  const loadActsFromDb = async (token: string) => {
    if (!work) return
    setLoadingDbActs(true)
    try {
      const res = await getAdminWorkActsAnalyticsServerFn({
        data: { adminToken: token, workId: work.id },
      })
      if (res && res.acts) {
        setDbActs(res.acts)
      }
    } catch (e) {
      console.warn('[AdminWorkEditorPage] Could not load DB acts analytics:', e)
    } finally {
      setLoadingDbActs(false)
    }
  }

  // Combined acts (from work.acts, dbActs, or synthesized default)
  const computedActs = useMemo(() => {
    if (work?.acts && work.acts.length > 0) {
      return work.acts
    }
    if (dbActs && dbActs.length > 0) {
      return dbActs.map((da) => ({
        id: da.id,
        workId: work?.id || workId,
        number: da.actNumber,
        title: da.title,
        slug: `act-${da.actNumber}`,
        description: da.description || undefined,
        status: 'published' as const,
        chapters: (work?.chapters || []).filter(
          (c) => c.actNumber === da.actNumber || (da.actNumber === 1 && !c.actNumber)
        ),
      }))
    }
    // Fallback: 1 single default act containing all chapters
    const chapters = work?.chapters || []
    return [
      {
        id: `act-${work?.id || workId}-1`,
        workId: work?.id || workId,
        number: 1,
        title: 'Act I: The Opening Movement',
        slug: 'act-1',
        description: 'Primary narrative cycle',
        status: 'published' as const,
        chapters,
      },
    ]
  }, [work, dbActs, workId])

  // Save work metadata handler
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!work) return
    if (!title.trim()) {
      setSaveError('Manuscript title is required')
      return
    }
    if (!synopsis.trim()) {
      setSaveError('Synopsis is required')
      return
    }
    if (!adminToken) {
      setSaveError('Admin authorization token expired. Please re-login.')
      return
    }

    setIsSavingDetails(true)
    setSaveError(null)

    const parsedTags = tags
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [genre, category]

    try {
      // 1. Call server function to update Supabase DB
      const result = await adminUpdateWorkServerFn({
        data: {
          adminToken,
          workId: work.id,
          workData: {
            title: title.trim(),
            subtitle: subtitle.trim() || undefined,
            cover: cover.trim() || undefined,
            category,
            genre,
            synopsis: synopsis.trim(),
            fullDescription: fullDesc.trim() || synopsis.trim(),
            tags: parsedTags,
            status,
            visibility,
            authorName: authorName.trim() || undefined,
            authorHandle: authorHandle.trim() || undefined,
          },
        },
      })

      // 2. Update React AppContext & localStorage
      updateWork(work.id, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        cover: cover.trim(),
        category,
        categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        genre,
        genreSlug: genre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        synopsis: synopsis.trim(),
        fullDescription: fullDesc.trim() || synopsis.trim(),
        tags: parsedTags,
        status: status as any,
        visibility: visibility as any,
        author: {
          ...work.author,
          name: authorName.trim() || work.author.name,
          handle: authorHandle.trim() || work.author.handle,
        },
      })

      showToast(result.message || 'Manuscript updated successfully')
      reloadWorksFromDb()
    } catch (err: any) {
      console.error('[handleSaveDetails] Error:', err)
      setSaveError(err?.message || 'Failed to update manuscript')
    } finally {
      setIsSavingDetails(false)
    }
  }

  // Act creation / edit modal trigger
  const openNewActModal = () => {
    const nextNumber = computedActs.length + 1
    setActModalMode('create')
    setSelectedActId(null)
    setActNumberInput(nextNumber)
    setActTitleInput(`Act ${nextNumber === 2 ? 'II' : nextNumber === 3 ? 'III' : nextNumber === 4 ? 'IV' : nextNumber}: `)
    setActDescInput('')
    setShowActModal(true)
  }

  const openEditActModal = (act: { id: string; number: number; title: string; description?: string }) => {
    setActModalMode('edit')
    setSelectedActId(act.id)
    setActNumberInput(act.number)
    setActTitleInput(act.title)
    setActDescInput(act.description || '')
    setShowActModal(true)
  }

  // Save Act handler
  const handleSaveAct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!work || !adminToken) return
    if (!actTitleInput.trim()) {
      showToast('Act title is required')
      return
    }

    setIsSubmittingAct(true)
    try {
      // 1. Supabase Server call
      await adminUpsertActServerFn({
        data: {
          adminToken,
          workId: work.id,
          actId: selectedActId || undefined,
          actNumber: actNumberInput,
          title: actTitleInput.trim(),
          description: actDescInput.trim() || undefined,
        },
      })

      // 2. Client AppContext call
      if (actModalMode === 'edit' && selectedActId) {
        updateActInWork(work.id, selectedActId, actTitleInput.trim(), actDescInput.trim() || undefined)
      } else {
        addActToWork(work.id, actTitleInput.trim(), actDescInput.trim() || undefined)
      }

      setShowActModal(false)
      loadActsFromDb(adminToken)
      reloadWorksFromDb()
      showToast(`Act ${actNumberInput} saved successfully`)
    } catch (err: any) {
      console.error('[handleSaveAct] Error:', err)
      showToast(err?.message || 'Failed to save act')
    } finally {
      setIsSubmittingAct(false)
    }
  }

  // Chapter creation modal trigger
  const openAddChapterModal = (act: { id: string; number: number; title: string }) => {
    setTargetActForChapter(act)
    const totalChapters = work?.chapters?.length || 0
    const nextNum = totalChapters + 1
    setChNumberInput(nextNum)
    setChTitleInput(`Chapter ${nextNum}: `)
    setChSubtitleInput('')
    setChStatusInput('published')
    setChContentInput('')
    setShowChapterModal(true)
  }

  // Save Chapter handler
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!work || !adminToken || !targetActForChapter) return
    if (!chTitleInput.trim()) {
      showToast('Chapter title is required')
      return
    }
    if (!chContentInput.trim()) {
      showToast('Chapter manuscript text is required')
      return
    }

    setIsSubmittingChapter(true)
    try {
      const words = chContentInput.trim().split(/\s+/).filter(Boolean).length
      const readMinutes = Math.max(1, Math.ceil(words / 220))

      // 1. Supabase server call
      const res = await adminPostChapterServerFn({
        data: {
          adminToken,
          workId: work.id,
          workTitle: work.title,
          chapterNumber: chNumberInput,
          actId: targetActForChapter.id.startsWith('act-') ? undefined : targetActForChapter.id,
          actNumber: targetActForChapter.number,
          title: chTitleInput.trim(),
          subtitle: chSubtitleInput.trim() || undefined,
          genre,
          category,
          content: chContentInput.trim(),
          status: chStatusInput,
        },
      })

      // 2. Client AppContext injection
      const newCh: Chapter = {
        id: res.supabaseChapterId || res.chapterId || `admin-ch-${Date.now()}-${chNumberInput}`,
        number: chNumberInput,
        title: chTitleInput.trim(),
        subtitle: chSubtitleInput.trim() || undefined,
        actId: targetActForChapter.id,
        actNumber: targetActForChapter.number,
        actTitle: targetActForChapter.title,
        status: chStatusInput,
        wordCount: words,
        readTimeMinutes: readMinutes,
        publishedAt: new Date().toISOString(),
        content: chContentInput.trim(),
      }

      addAdminPostedChapter(work.id, newCh)
      setShowChapterModal(false)
      loadActsFromDb(adminToken)
      reloadWorksFromDb()
      showToast(res.message || `Chapter ${chNumberInput} added to Act ${targetActForChapter.number}!`)
    } catch (err: any) {
      console.error('[handleSaveChapter] Error:', err)
      showToast(err?.message || 'Failed to add chapter')
    } finally {
      setIsSubmittingChapter(false)
    }
  }

  // Verification Gate
  if (isVerifying) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="h-8 w-8 text-[var(--ink-primary)] animate-spin" />
        <p className="font-mono text-xs text-[var(--ink-muted)]">
          Verifying administrative authorization...
        </p>
      </div>
    )
  }

  // Un-authenticated gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
          Administrative Authorization Required
        </h2>
        <p className="text-xs text-[var(--ink-muted)] max-w-md">
          You need an active administrative session token to inspect and edit manuscript folios directly.
        </p>
        <Link
          to="/secret-adminpanel"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-4 py-2 text-xs font-semibold no-underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Admin Gateway</span>
        </Link>
      </div>
    )
  }

  // Work Not Found Gate
  if (!work) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
          Manuscript Not Found
        </h2>
        <p className="text-xs text-[var(--ink-muted)] max-w-md">
          No work found in active registries with ID <code className="font-mono">{workId}</code>.
        </p>
        <Link
          to="/secret-adminpanel"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-4 py-2 text-xs font-semibold no-underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Works Directory</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* TOP BREADCRUMB & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--ink-muted)]">
          <Link
            to="/secret-adminpanel"
            className="hover:text-[var(--ink-primary)] flex items-center gap-1 no-underline"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Admin Gateway</span>
          </Link>
          <span>/</span>
          <span className="text-[var(--ink-primary)] font-semibold line-clamp-1">
            {work.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/works/$workId"
            params={{ workId: work.id }}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] no-underline"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Public Reader View</span>
          </Link>

          <Link
            to="/write/manage/$workId"
            params={{ workId: work.id }}
            className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] no-underline"
          >
            <Settings2 className="h-3 w-3" />
            <span>Writer Studio View</span>
          </Link>
        </div>
      </div>

      {/* HEADER BANNER */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <img
              src={cover || work.cover}
              alt={title}
              className="h-28 w-20 rounded-lg object-cover grayscale border border-[var(--border-strong)] shadow-sm shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider border border-rose-500/20">
                  <ShieldAlert className="h-3 w-3" />
                  Admin Direct Edit
                </span>
                <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                  {status}
                </Badge>
                <Badge variant="subtle" size="sm" className="font-mono text-[10px]">
                  {category}
                </Badge>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
                {title}
              </h1>

              <p className="text-xs font-mono text-[var(--ink-muted)] flex items-center gap-2">
                <span>By {authorName} (@{authorHandle})</span>
                <span>•</span>
                <span>{work.chapters?.length || 0} Chapters</span>
                <span>•</span>
                <span>{computedActs.length} Acts</span>
                <span>•</span>
                <span>{work.totalReads} Views</span>
              </p>
            </div>
          </div>

          {/* Quick Act / Chapter CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Layers className="h-3.5 w-3.5" />}
              onClick={openNewActModal}
            >
              Add New Act
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                const firstAct = computedActs[0]
                if (firstAct) openAddChapterModal(firstAct)
              }}
            >
              Add Chapter
            </Button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 mt-8 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>Manuscript Metadata & Fields</span>
          </button>

          <button
            onClick={() => setActiveTab('acts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'acts'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Acts Hierarchy ({computedActs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'chapters'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>All Chapters ({work.chapters?.length || 0})</span>
          </button>
        </div>
      </section>

      {/* TAB 1: MANUSCRIPT METADATA EDIT FORM */}
      {activeTab === 'details' && (
        <form onSubmit={handleSaveDetails} className="space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6 shadow-xs">
            
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Core Folio Information
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Edit title, synopsis, attribution, and taxonomic categorizations directly.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSavingDetails}
                leftIcon={<Save className="h-3.5 w-3.5" />}
              >
                Save All Changes
              </Button>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-mono text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Manuscript Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. A Novel in Three Parts"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              {/* Author Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Author Display Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              {/* Author Handle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Author Handle (@handle)
                </label>
                <input
                  type="text"
                  value={authorHandle}
                  onChange={(e) => setAuthorHandle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] cursor-pointer"
                >
                  {genres.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Publication Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] cursor-pointer"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Hiatus">Hiatus</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] cursor-pointer"
                >
                  <option value="Public">Public (Catalog & Searchable)</option>
                  <option value="Unlisted">Unlisted (Link Access Only)</option>
                  <option value="Draft">Draft (Restricted)</option>
                </select>
              </div>
            </div>

            {/* Cover Image URL */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                Cover Image URL
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  value={cover}
                  onChange={(e) => setCover(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">Quick Presets:</span>
                {PRESET_COVERS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setCover(preset.url)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:border-[var(--ink-primary)] cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Synopsis */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                Brief Synopsis <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="A high-level summary of the manuscript..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-y"
              />
            </div>

            {/* Full Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                Full Description & Themes
              </label>
              <textarea
                rows={5}
                value={fullDesc}
                onChange={(e) => setFullDesc(e.target.value)}
                placeholder="Expanded editorial commentary or back cover blurb..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-y"
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                Comma-separated Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Memory, Noir, Serialized, Tokyo"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSavingDetails}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save All Changes
              </Button>
            </div>

          </div>
        </form>
      )}

      {/* TAB 2: ACTS HIERARCHY */}
      {activeTab === 'acts' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                Acts & Narrative Cycles
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Organize chapters into dramatic acts. Add new acts or add chapters directly to any existing act.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={openNewActModal}
            >
              Add New Act
            </Button>
          </div>

          <div className="space-y-4">
            {computedActs.map((act) => {
              const actChapters = (work.chapters || []).filter(
                (c) => c.actNumber === act.number || (act.number === 1 && !c.actNumber)
              )

              return (
                <div
                  key={act.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs uppercase font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          Act {act.number}
                        </span>
                        <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                          {act.title}
                        </h4>
                      </div>
                      {act.description && (
                        <p className="text-xs text-[var(--ink-muted)] font-serif italic">
                          {act.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditActModal(act)}
                        className="px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] cursor-pointer"
                      >
                        Edit Act Title
                      </button>

                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-3 w-3" />}
                        onClick={() => openAddChapterModal(act)}
                        className="h-7 text-xs"
                      >
                        Add Chapter to Act {act.number}
                      </Button>
                    </div>
                  </div>

                  {/* Act's Chapter list */}
                  {actChapters.length === 0 ? (
                    <div className="py-6 text-center text-xs font-mono text-[var(--ink-muted)] bg-[var(--bg-subtle)] rounded-lg">
                      No chapters in this act yet. Click &ldquo;Add Chapter to Act {act.number}&rdquo; above.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                      {actChapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center justify-between p-3.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] transition-colors text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-[var(--ink-faint)] w-6">
                              #{ch.number}
                            </span>
                            <div>
                              <div className="font-serif font-medium text-[var(--ink-primary)]">
                                {ch.title}
                              </div>
                              <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                                {ch.wordCount.toLocaleString()} words • {ch.readTimeMinutes} min read
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              size="sm"
                              className="font-mono text-[9px] uppercase"
                            >
                              {ch.status}
                            </Badge>

                            <Link
                              to="/write/editor/$workId/$chapterId"
                              params={{ workId: work.id, chapterId: ch.id }}
                              className="px-2.5 py-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-[11px] no-underline"
                            >
                              Editor
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* TAB 3: ALL CHAPTERS TABLE */}
      {activeTab === 'chapters' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                All Serialized Chapters
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Direct catalog of all chapters across this manuscript.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                const firstAct = computedActs[0]
                if (firstAct) openAddChapterModal(firstAct)
              }}
            >
              Add Next Chapter
            </Button>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  <th className="py-3 px-4 font-semibold w-14">#</th>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Act</th>
                  <th className="py-3 px-4 font-semibold">Length</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-mono">
                {(work.chapters || []).map((ch) => (
                  <tr key={ch.id} className="hover:bg-[var(--bg-subtle)]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[var(--ink-faint)]">
                      {ch.number}
                    </td>
                    <td className="py-3 px-4 font-serif font-medium text-[var(--ink-primary)] text-sm">
                      {ch.title}
                      {ch.subtitle && (
                        <span className="block text-[11px] text-[var(--ink-muted)] font-serif italic">
                          {ch.subtitle}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[var(--ink-muted)]">
                      Act {ch.actNumber || 1}
                    </td>
                    <td className="py-3 px-4 text-[var(--ink-muted)]">
                      {ch.wordCount.toLocaleString()} w • {ch.readTimeMinutes} min
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" size="sm" className="font-mono text-[9px] uppercase">
                        {ch.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/write/editor/$workId/$chapterId"
                          params={{ workId: work.id, chapterId: ch.id }}
                          className="px-2.5 py-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-[11px] no-underline"
                        >
                          Launch Editor
                        </Link>
                        <Link
                          to="/read/$workId/$chapterId"
                          params={{ workId: work.id, chapterId: ch.id }}
                          target="_blank"
                          className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                          title="Read View"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL: ADD / EDIT ACT */}
      {showActModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                {actModalMode === 'edit' ? 'Edit Act' : 'Add New Act'}
              </h3>
              <button
                type="button"
                onClick={() => setShowActModal(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAct} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                  Act Sequence Number
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={actNumberInput}
                  onChange={(e) => setActNumberInput(parseInt(e.target.value) || 1)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                  Act Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Act II: The Shattered Mirror"
                  value={actTitleInput}
                  onChange={(e) => setActTitleInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                  Dramatic Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. The conflict sharpens and past truths collide."
                  value={actDescInput}
                  onChange={(e) => setActDescInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowActModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmittingAct}
                >
                  Save Act
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CHAPTER TO ACT */}
      {showChapterModal && targetActForChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Add Chapter to Act {targetActForChapter.number}
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  {targetActForChapter.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowChapterModal(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                    Chapter Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={chNumberInput}
                    onChange={(e) => setChNumberInput(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                    Publication Status
                  </label>
                  <select
                    value={chStatusInput}
                    onChange={(e) => setChStatusInput(e.target.value as any)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] cursor-pointer"
                  >
                    <option value="published">Published (Live to readers)</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                  Chapter Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 3: The Departure"
                  value={chTitleInput}
                  onChange={(e) => setChTitleInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                  Subtitle (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. In which shadows begin to lengthen"
                  value={chSubtitleInput}
                  onChange={(e) => setChSubtitleInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                    Manuscript Text <span className="text-rose-500">*</span>
                  </label>
                  {chContentInput.trim() && (
                    <span className="text-[10px] font-mono text-[var(--ink-faint)]">
                      {chContentInput.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  )}
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste or write the chapter content here..."
                  value={chContentInput}
                  onChange={(e) => setChContentInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowChapterModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmittingChapter}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Publish Chapter {chNumberInput}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
