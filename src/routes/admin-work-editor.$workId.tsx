import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useApp } from '../context/AppContext'
import {
  verifyAdminSessionServerFn,
  adminUpdateWorkServerFn,
  adminUpsertActServerFn,
  adminPostChapterServerFn,
  adminUpdateChapterServerFn,
  adminDeleteChapterServerFn,
  getAdminWorkActsAnalyticsServerFn,
  getAdminUsersServerFn,
  adminBulkLinkLoreServerFn,
  adminBulkUnlinkLoreServerFn,
  type WorkActAnalytics,
  type AdminUser,
} from '../server/admin'
import { StoryLoreModal } from '../components/studio/StoryLoreModal'
import {
  extractLoreEntities,
  countEntityMentions,
  type LoreEntity,
} from '../lib/lore/loreParser'
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
  Heart,
  Settings2,
  Image as ImageIcon,
  Tag,
  PenTool,
  Bookmark,
  UserCheck,
  Trash2,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { getWorkSlug, type Work, type Act, type Chapter } from '../data/mockData'
import { CloudinaryImageUpload } from '../components/CloudinaryImageUpload'
import { ViewsBreakdownModal } from '../components/ViewsBreakdownModal'
import { HeartsBreakdownModal } from '../components/HeartsBreakdownModal'
import { SavesAdjustmentModal } from '../components/SavesAdjustmentModal'
import { formatViewCount, formatHeartCount } from '../lib/utils'

import { getPublicWorkServerFn } from '../server/works'
import { getWriterWorkDetailsServerFn } from '../server/writer'

const ADMIN_TOKEN_KEY = 'hatchpen_admin_session_token'
const LEGACY_ADMIN_TOKEN_KEY = 'tellnest_admin_session_token'

export const Route = createFileRoute('/admin-work-editor/$workId')({
  loader: async ({ params }) => {
    try {
      const dbWork = await getWriterWorkDetailsServerFn({ data: { workId: params.workId } })
      if (dbWork) return { loadedWork: dbWork }
    } catch (e) {
      console.warn('[admin-work-editor] Loader error fetching writer details:', e)
    }

    try {
      const publicDbWork = await getPublicWorkServerFn({ data: params.workId })
      if (publicDbWork) return { loadedWork: publicDbWork }
    } catch {}

    return { loadedWork: null }
  },
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
  const loaderData = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const {
    getWorkById,
    allWorks,
    updateWork,
    addActToWork,
    updateActInWork,
    addAdminPostedChapter,
    updateChapterContent,
    reloadWorksFromDb,
    categories,
    genres,
    showToast,
  } = useApp()

  // 1. Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return (
        sessionStorage.getItem(ADMIN_TOKEN_KEY) ||
        localStorage.getItem(ADMIN_TOKEN_KEY) ||
        sessionStorage.getItem(LEGACY_ADMIN_TOKEN_KEY) ||
        localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY)
      )
    }
    return null
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(true)

  // Local work override for instantaneous UI updates after edits
  const [localWorkOverride, setLocalWorkOverride] = useState<Work | null>(null)

  // Synchronize local override when loaderData refreshes from the server
  useEffect(() => {
    if (loaderData?.loadedWork) {
      setLocalWorkOverride(loaderData.loadedWork as any)
    }
  }, [loaderData?.loadedWork])

  // 2. Resolve Work target (localWorkOverride first, then loaderData, then context, then mock/allWorks)
  const work = useMemo(() => {
    if (localWorkOverride) return localWorkOverride
    if (loaderData?.loadedWork) return loaderData.loadedWork as any
    const fromAllWorks = allWorks.find(
      (w) =>
        w.id === workId ||
        w.id.toLowerCase() === workId.toLowerCase() ||
        (w.slug && w.slug.toLowerCase() === workId.toLowerCase()) ||
        w.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === workId.toLowerCase()
    )
    return fromAllWorks || getWorkById(workId)
  }, [localWorkOverride, loaderData?.loadedWork, workId, getWorkById, allWorks])

  // Track initial hydration to avoid resetting form while user is typing
  const initialHydratedRef = useState<{ hydratedWorkId: string | null }>({ hydratedWorkId: null })[0]

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
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>(work?.author.id || '')
  const [availableAuthors, setAvailableAuthors] = useState<AdminUser[]>([])

  // Tab Navigation: 'details' | 'acts' | 'chapters' | 'lore'
  const [activeTab, setActiveTab] = useState<'details' | 'acts' | 'chapters' | 'lore'>('details')

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

  // 5. Chapter Modal State (Add or Edit chapter)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterModalMode, setChapterModalMode] = useState<'create' | 'edit'>('create')
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [targetActForChapter, setTargetActForChapter] = useState<{
    id: string
    number: number
    title: string
  } | null>(null)
  const [chNumberInput, setChNumberInput] = useState<number>(1)
  const [chTitleInput, setChTitleInput] = useState('')
  const [chSubtitleInput, setChSubtitleInput] = useState('')
  const [chStatusInput, setChStatusInput] = useState<'published' | 'draft'>('published')
  const [chBannerInput, setChBannerInput] = useState<string>('')
  const [isBannerUploading, setIsBannerUploading] = useState(false)
  const [isCoverUploading, setIsCoverUploading] = useState(false)
  const [chContentInput, setChContentInput] = useState('')
  const [isSubmittingChapter, setIsSubmittingChapter] = useState(false)
  const [showChLoreModal, setShowChLoreModal] = useState(false)

  // 6. DB Acts breakdown state
  const [dbActs, setDbActs] = useState<WorkActAnalytics[]>([])
  const [loadingDbActs, setLoadingDbActs] = useState(false)
  const [showViewsModal, setShowViewsModal] = useState(false)
  const [showHeartsModal, setShowHeartsModal] = useState(false)
  const [showSavesModal, setShowSavesModal] = useState(false)

  // 7. Delete Chapter Modal State
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; title: string; number?: number } | null>(null)
  const [isDeletingChapter, setIsDeletingChapter] = useState(false)

  // 8. Story Lore Management State
  const [newLoreName, setNewLoreName] = useState('')
  const [newLoreType, setNewLoreType] = useState<'Character' | 'Location' | 'Lore'>('Character')
  const [newLoreDesc, setNewLoreDesc] = useState('')
  const [isLinkingLore, setIsLinkingLore] = useState(false)

  // Sync state ONLY on initial load of this manuscript or when work ID changes, NOT on every background re-fetch while editing
  useEffect(() => {
    if (work && initialHydratedRef.hydratedWorkId !== work.id) {
      initialHydratedRef.hydratedWorkId = work.id
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
      setSelectedAuthorId(work.author.id || '')
    }
  }, [work, initialHydratedRef])

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
          // Also fetch platform authors to support ownership reassignment
          getAdminUsersServerFn({ data: { adminToken } })
            .then((uRes) => {
              if (uRes?.users) setAvailableAuthors(uRes.users)
            })
            .catch(() => {})
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
          (c) =>
            (c.actId && c.actId === da.id) ||
            c.actNumber === da.actNumber ||
            (da.actNumber === 1 && !c.actNumber && !c.actId)
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
    if (isCoverUploading) {
      setSaveError('Please wait for the cover image to finish uploading.')
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
            authorId: selectedAuthorId || undefined,
            authorName: authorName.trim() || undefined,
            authorHandle: authorHandle.trim() || undefined,
          },
        },
      })

      // 2. Update React AppContext & local override
      const updatedSlug = result.slug || work.slug || getWorkSlug(work)
      const updatedFields: Partial<Work> = {
        title: title.trim(),
        slug: updatedSlug,
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
      }

      setLocalWorkOverride((prev) => {
        const base = prev || work
        if (!base) return null
        return {
          ...base,
          ...updatedFields,
        }
      })

      updateWork(work.id, updatedFields)
      showToast(result.message || 'Manuscript updated successfully')
      await reloadWorksFromDb()
      await router.invalidate()
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
      await router.invalidate()
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
    setChapterModalMode('create')
    setEditingChapterId(null)
    setTargetActForChapter(act)
    const totalChapters = work?.chapters?.length || 0
    const nextNum = totalChapters + 1
    setChNumberInput(nextNum)
    setChTitleInput(`Chapter ${nextNum}: `)
    setChSubtitleInput('')
    setChStatusInput('published')
    setChBannerInput('')
    setChContentInput('')
    setShowChapterModal(true)
  }

  // Chapter edit modal trigger
  const openEditChapterModal = (ch: Chapter) => {
    setChapterModalMode('edit')
    setEditingChapterId(ch.id)
    const matchedAct = computedActs.find((a) => a.id === ch.actId || a.number === ch.actNumber) || computedActs[0]
    setTargetActForChapter(matchedAct ? { id: matchedAct.id, number: matchedAct.number, title: matchedAct.title } : null)
    setChNumberInput(ch.number)
    setChTitleInput(ch.title)
    setChSubtitleInput(ch.subtitle || '')
    setChStatusInput(ch.status === 'draft' ? 'draft' : 'published')
    setChBannerInput(ch.bannerImage || '')
    setChContentInput(ch.content || '')
    setShowChapterModal(true)
  }

  // Save / Update Chapter handler
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!work) return
    if (!adminToken) {
      showToast('Admin session expired. Please re-login.')
      return
    }
    if (isBannerUploading) {
      showToast('Please wait for the banner image to finish uploading.')
      return
    }
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

      if (chapterModalMode === 'edit' && editingChapterId) {
        // --- EDIT MODE ---
        // 1. Supabase server update
        await adminUpdateChapterServerFn({
          data: {
            adminToken,
            workId: work.id,
            chapterId: editingChapterId,
            title: chTitleInput.trim(),
            subtitle: chSubtitleInput.trim() || undefined,
            content: chContentInput.trim(),
            status: chStatusInput,
            bannerImagePath: chBannerInput.trim() || null,
          },
        })

        // 2. Immediate local optimistic state update so UI updates INSTANTLY
        setLocalWorkOverride((prev) => {
          const base = prev || work
          if (!base) return null
          const updatedChapters = (base.chapters || []).map((ch) => {
            if (ch.id !== editingChapterId) return ch
            return {
              ...ch,
              title: chTitleInput.trim(),
              subtitle: chSubtitleInput.trim() || undefined,
              content: chContentInput.trim(),
              status: chStatusInput,
              bannerImage: chBannerInput.trim() || undefined,
              wordCount: words,
              readTimeMinutes: readMinutes,
            }
          })
          const updatedActs = (base.acts || []).map((act) => ({
            ...act,
            chapters: (act.chapters || []).map((ch) =>
              ch.id === editingChapterId
                ? {
                    ...ch,
                    title: chTitleInput.trim(),
                    subtitle: chSubtitleInput.trim() || undefined,
                    content: chContentInput.trim(),
                    status: chStatusInput,
                    bannerImage: chBannerInput.trim() || undefined,
                    wordCount: words,
                    readTimeMinutes: readMinutes,
                  }
                : ch
            ),
          }))
          return {
            ...base,
            chapters: updatedChapters,
            acts: updatedActs,
          }
        })

        // 3. Client AppContext update
        updateChapterContent(
          work.id,
          editingChapterId,
          chTitleInput.trim(),
          chContentInput.trim(),
          chStatusInput,
          chBannerInput.trim() || null
        )
        setShowChapterModal(false)
        loadActsFromDb(adminToken)
        reloadWorksFromDb()
        showToast(`Chapter "${chTitleInput.trim()}" successfully updated!`)

        // 4. Invalidate and re-pull fresh DB data
        try {
          const fresh = await getWriterWorkDetailsServerFn({ data: { workId: work.id } })
          if (fresh) {
            setLocalWorkOverride(fresh as any)
            updateWork(work.id, fresh as any)
          }
        } catch {}
        await router.invalidate()
      } else {
        // --- CREATE MODE ---
        if (!targetActForChapter) {
          showToast('Target act is required for creating a chapter')
          return
        }

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
            bannerImagePath: chBannerInput.trim() || null,
          },
        })

        // 2. Client AppContext & local override injection
        const newCh: Chapter = {
          id: res.supabaseChapterId || res.chapterId || `admin-ch-${Date.now()}-${chNumberInput}`,
          number: chNumberInput,
          title: chTitleInput.trim(),
          subtitle: chSubtitleInput.trim() || undefined,
          actId: targetActForChapter.id,
          actNumber: targetActForChapter.number,
          actTitle: targetActForChapter.title,
          status: chStatusInput,
          bannerImage: chBannerInput.trim() || undefined,
          wordCount: words,
          readTimeMinutes: readMinutes,
          publishedAt: new Date().toISOString(),
          content: chContentInput.trim(),
        }

        setLocalWorkOverride((prev) => {
          const base = prev || work
          if (!base) return null
          return {
            ...base,
            chapters: [...(base.chapters || []), newCh],
          }
        })

        addAdminPostedChapter(work.id, newCh)
        setShowChapterModal(false)
        loadActsFromDb(adminToken)
        reloadWorksFromDb()
        showToast(res.message || `Chapter ${chNumberInput} added to Act ${targetActForChapter.number}!`)

        try {
          const fresh = await getWriterWorkDetailsServerFn({ data: { workId: work.id } })
          if (fresh) {
            setLocalWorkOverride(fresh as any)
            updateWork(work.id, fresh as any)
          }
        } catch {}
        await router.invalidate()
      }
    } catch (err: any) {
      console.error('[handleSaveChapter] Error:', err)
      showToast(err?.message || 'Failed to save chapter')
    } finally {
      setIsSubmittingChapter(false)
    }
  }

  const handleConfirmDeleteChapter = async () => {
    if (!chapterToDelete || !work) return
    setIsDeletingChapter(true)
    try {
      const res = await adminDeleteChapterServerFn({
        data: {
          adminToken,
          workId: work.id,
          chapterId: chapterToDelete.id,
        },
      })

      // 1. Optimistically update localWorkOverride and AppContext
      const updatedChapters = (work.chapters || []).filter((ch) => ch.id !== chapterToDelete.id)
      const updatedActs = computedActs.map((act) => ({
        ...act,
        chapters: (act.chapters || []).filter((ch) => ch.id !== chapterToDelete.id),
      }))

      const updatedWorkData: Work = {
        ...work,
        chapterCount: res.publishedCount,
        publicationStatus: res.workRevertedToDraft ? 'draft' : work.publicationStatus,
        visibility: res.workRevertedToDraft ? 'draft' : work.visibility,
        chapters: updatedChapters,
        acts: updatedActs,
      }

      setLocalWorkOverride(updatedWorkData)
      updateWork(work.id, updatedWorkData)

      // If edit modal was open for this chapter, close it
      if (editingChapterId === chapterToDelete.id) {
        setShowChapterModal(false)
        setEditingChapterId(null)
      }

      const deletedTitle = chapterToDelete.title
      setChapterToDelete(null)

      // 2. Fetch fresh DB state directly without depending on stale caches
      try {
        const fresh = await getWriterWorkDetailsServerFn({ data: { workId: work.id } })
        if (fresh) {
          setLocalWorkOverride(fresh as any)
          updateWork(work.id, fresh as any)
        }
      } catch (fErr) {
        console.warn('[handleConfirmDeleteChapter] Fresh lookup fallback:', fErr)
      }

      // 3. Sync acts and invalidate router
      await loadActsFromDb(adminToken)
      reloadWorksFromDb()
      await router.invalidate()

      if (res.workRevertedToDraft) {
        showToast(
          `Chapter "${deletedTitle}" deleted. Manuscript reverted to Draft as no published chapters remain.`
        )
      } else {
        showToast(`Chapter "${deletedTitle}" successfully deleted.`)
      }
    } catch (err: any) {
      console.error('[AdminWorkEditorPage] Delete chapter error:', err)
      showToast(err?.message || 'Failed to delete chapter', 'error')
    } finally {
      setIsDeletingChapter(false)
    }
  }

  // All chapters combined text to extract story-wide lore entities
  const storyLoreEntities = useMemo(() => {
    if (!work?.chapters) return []
    const combinedContent = work.chapters.map((c) => c.content || '').join('\n\n')
    return extractLoreEntities(combinedContent)
  }, [work?.chapters])

  // Admin Bulk Link Lore across all chapters in this story
  const handleAdminBulkLinkLore = async (entity: LoreEntity) => {
    if (!adminToken) {
      showToast('Admin session expired. Please re-authenticate.', 'error')
      return
    }
    setIsLinkingLore(true)
    try {
      const res = await adminBulkLinkLoreServerFn({
        data: {
          adminToken,
          workId: work.id,
          entity,
        },
      })
      if (res?.success) {
        showToast(
          `Linked ${res.totalMentionsLinked} mention${res.totalMentionsLinked !== 1 ? 's' : ''} of "${entity.name}" across ${res.updatedChaptersCount} chapter${res.updatedChaptersCount !== 1 ? 's' : ''}!`,
          'success'
        )
        // Refresh DB data
        await loadActsFromDb(adminToken)
        try {
          const dbWork = await getPublicWorkServerFn({ data: work.id })
          if (dbWork) setLocalWorkOverride(dbWork)
        } catch {}
        await reloadWorksFromDb()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to bulk link lore across chapters', 'error')
    } finally {
      setIsLinkingLore(false)
    }
  }

  // Admin Bulk Unlink Lore across all chapters in this story
  const handleAdminBulkUnlinkLore = async (entityName: string) => {
    if (!adminToken) return
    setIsLinkingLore(true)
    try {
      const res = await adminBulkUnlinkLoreServerFn({
        data: {
          adminToken,
          workId: work.id,
          entityName,
        },
      })
      if (res?.success) {
        showToast(
          `Unlinked ${res.totalMentionsUnlinked} mention${res.totalMentionsUnlinked !== 1 ? 's' : ''} of "${entityName}" across ${res.updatedChaptersCount} chapter${res.updatedChaptersCount !== 1 ? 's' : ''}.`,
          'success'
        )
        await loadActsFromDb(adminToken)
        try {
          const dbWork = await getPublicWorkServerFn({ data: work.id })
          if (dbWork) setLocalWorkOverride(dbWork)
        } catch {}
        await reloadWorksFromDb()
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to unlink lore across chapters', 'error')
    } finally {
      setIsLinkingLore(false)
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
            params={{ workId: getWorkSlug(work) }}
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
              className="h-28 w-20 rounded-lg object-cover border border-[var(--border-strong)] shadow-sm shrink-0"
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

              <div className="text-xs font-mono text-[var(--ink-muted)] flex flex-wrap items-center gap-2">
                <span>By {authorName} (@{authorHandle})</span>
                <span>•</span>
                <span>{work.chapters?.length || 0} Chapters</span>
                <span>•</span>
                <span>{computedActs.length} Acts</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowViewsModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-subtle)] hover:border-amber-500 bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition cursor-pointer font-bold text-[11px]"
                  title={`${formatViewCount(work.totalReads, false)} views • Click to view & adjust 3-layer view counts`}
                >
                  <Eye className="h-3 w-3 text-amber-500" />
                  <span>{formatViewCount(work.totalReads, true)} Views</span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">(Adjust)</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowHeartsModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition cursor-pointer font-bold text-[11px]"
                  title={`${formatHeartCount(Number((localWorkOverride || work).likeCount ?? (localWorkOverride || work as any).like_count) || 0, false)} hearts • Click to adjust story and chapter hearts`}
                >
                  <Heart className="h-3 w-3 fill-current text-[var(--ink-primary)]" />
                  <span>{formatHeartCount(Number((localWorkOverride || work).likeCount ?? (localWorkOverride || work as any).like_count) || 0, true)} Hearts</span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">(Adjust)</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowSavesModal(true)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] text-[var(--ink-primary)] transition cursor-pointer font-bold text-[11px]"
                  title={`${(Number((localWorkOverride || work).totalSaves ?? (localWorkOverride || work as any).save_count) || 0).toLocaleString()} library saves • Click to adjust story saves`}
                >
                  <Bookmark className="h-3 w-3 fill-current text-[var(--ink-primary)]" />
                  <span>{formatViewCount(Number((localWorkOverride || work).totalSaves ?? (localWorkOverride || work as any).save_count) || 0, true)} Saves</span>
                  <span className="text-[9px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">(Adjust)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Act / Chapter CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Eye className="h-3.5 w-3.5 text-amber-500" />}
              onClick={() => setShowViewsModal(true)}
            >
              Adjust Views
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Heart className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)]" />}
              onClick={() => setShowHeartsModal(true)}
            >
              Adjust Hearts
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Bookmark className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)]" />}
              onClick={() => setShowSavesModal(true)}
            >
              Adjust Saves
            </Button>
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

          <button
            onClick={() => setActiveTab('lore')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'lore'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Story Lore & Characters</span>
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

              {/* Author Ownership & Reassignment */}
              <div className="space-y-2 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                    Manuscript Ownership & Author
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-purple-400">
                    <UserCheck className="h-3 w-3" />
                    <span>Reassign Folio</span>
                  </span>
                </div>

                {availableAuthors.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--ink-muted)] mb-1">
                      Select Author Profile
                    </label>
                    <select
                      value={selectedAuthorId}
                      onChange={(e) => {
                        const newId = e.target.value
                        setSelectedAuthorId(newId)
                        const matched = availableAuthors.find((u) => u.profileId === newId || u.username === newId)
                        if (matched) {
                          setAuthorName(matched.displayName)
                          setAuthorHandle(matched.username)
                        }
                      }}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Keep Current Author / Custom --</option>
                      {availableAuthors.map((u) => (
                        <option key={u.profileId || u.username} value={u.profileId}>
                          {u.displayName} (@{u.username}) {u.isMock ? '[Mock Persona]' : '[Real Member]'} • {u.works?.length || 0} stories
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--ink-muted)] mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--ink-muted)] mb-1">
                      Handle (@handle)
                    </label>
                    <input
                      type="text"
                      value={authorHandle}
                      onChange={(e) => setAuthorHandle(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value
                    setCategory(val)
                    if (val.toLowerCase().includes('religion')) {
                      setGenre('Faith & Spirituality')
                    }
                  }}
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
                  onChange={(e) => {
                    const val = e.target.value
                    setGenre(val)
                    if (val.toLowerCase().includes('faith')) {
                      setCategory('Religion & Spirituality')
                    }
                  }}
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

            {/* Cover Image URL & Cloudinary Upload */}
            <div className="space-y-3">
              <CloudinaryImageUpload
                label="Upload Book Cover Image (Cloudinary CDN)"
                currentImageUrl={cover}
                onImageUploaded={(url) => setCover(url)}
                onImageRemoved={() => setCover('')}
                onUploading={setIsCoverUploading}
                folder="covers"
                recommendedDimensions="600 × 900 px"
                aspectRatioHint="Portrait (2:3)"
                maxSizeMb={10}
              />

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                  Or Paste External Image URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <input
                    type="text"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    placeholder="https://..."
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
                (c) =>
                  (c.actId && c.actId === act.id) ||
                  c.actNumber === act.number ||
                  (act.number === 1 && !c.actNumber && !c.actId)
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

                            <button
                              type="button"
                              onClick={() => openEditChapterModal(ch)}
                              className="px-2.5 py-1 rounded border border-[var(--border-strong)] bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] text-[var(--ink-primary)] font-medium text-[11px] cursor-pointer"
                            >
                              Edit Chapter
                            </button>

                            <Link
                              to="/write/editor/$workId/$chapterId"
                              params={{ workId: work.id, chapterId: ch.id }}
                              className="px-2 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-medium text-[11px] no-underline"
                              title="Open in Writer Canvas"
                            >
                              Studio
                            </Link>

                            <button
                              type="button"
                              onClick={() => setChapterToDelete({ id: ch.id, title: ch.title, number: ch.number })}
                              className="p-1 rounded text-[var(--ink-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
                      Act {ch.actNumber || computedActs.find((a) => a.id === ch.actId)?.number || 1}
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
                        <button
                          type="button"
                          onClick={() => openEditChapterModal(ch)}
                          className="px-2.5 py-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium text-[11px] hover:opacity-90 cursor-pointer"
                        >
                          Edit Content
                        </button>
                        <Link
                          to="/read/$workId/$chapterId"
                          params={{ workId: work.id, chapterId: ch.id }}
                          target="_blank"
                          className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                          title="Read View"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setChapterToDelete({ id: ch.id, title: ch.title, number: ch.number })}
                          className="p-1 text-[var(--ink-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Delete Chapter"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: STORY LORE & CHARACTERS MANAGER */}
      {activeTab === 'lore' && (
        <section className="space-y-6 animate-in fade-in duration-150">
          {/* Header Banner */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                  Characters, Locations & Story Lore Codex
                </h3>
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-xl">
                Define story entities once, then link them across all {work.chapters?.length || 0} chapters with one click. Readers see interactive tooltips when tapping names in prose.
              </p>
            </div>
            {storyLoreEntities.length > 0 && (
              <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-mono font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--ink-primary)]">
                {storyLoreEntities.length} Entit{storyLoreEntities.length !== 1 ? 'ies' : 'y'} Defined
              </span>
            )}
          </div>

          {/* Add New Entity Form */}
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!newLoreName.trim() || !newLoreDesc.trim()) return
              const ent: LoreEntity = {
                name: newLoreName.trim(),
                entityType: newLoreType,
                description: newLoreDesc.trim(),
              }
              await handleAdminBulkLinkLore(ent)
              setNewLoreName('')
              setNewLoreDesc('')
            }}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                Add & Link Story Entity
              </span>
              <div className="flex items-center gap-1">
                {(['Character', 'Location', 'Lore'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewLoreType(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      newLoreType === t
                        ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)] mb-1">
                  Name / Term <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arthur Pendragon, Camelot"
                  value={newLoreName}
                  onChange={(e) => setNewLoreName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--ink-secondary)] mb-1">
                  Tooltip Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Male, 23 — protagonist and rightful heir"
                  value={newLoreDesc}
                  onChange={(e) => setNewLoreDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[11px] text-[var(--ink-muted)]">
                Clicking save will automatically scan all chapters and link mentions.
              </p>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isLinkingLore}
                disabled={!newLoreName.trim() || !newLoreDesc.trim()}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                Save & Link Across All Chapters
              </Button>
            </div>
          </form>

          {/* List of Defined Lore Entities */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
              Defined Characters & Terms in this Manuscript ({storyLoreEntities.length})
            </h4>

            {storyLoreEntities.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40">
                <BookOpen className="h-8 w-8 text-[var(--ink-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-serif font-bold text-[var(--ink-primary)]">
                  No characters or lore linked yet
                </p>
                <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
                  Use the form above to define character details once, and the admin engine will hyperlink all occurrences across every chapter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {storyLoreEntities.map((ent) => {
                  const combinedContent = (work.chapters || []).map((c) => c.content || '').join('\n\n')
                  const stats = countEntityMentions(combinedContent, ent.name)
                  return (
                    <div
                      key={ent.name.toLowerCase()}
                      className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between gap-3 hover:border-[var(--border-strong)] transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-bold text-sm text-[var(--ink-primary)]">
                            {ent.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--ink-muted)] border border-[var(--border-subtle)]">
                            {ent.entityType}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                          {ent.description}
                        </p>
                        <div className="text-[11px] font-mono text-[var(--ink-muted)] pt-1">
                          {stats.linkedCount} linked
                          {stats.unlinkedCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1.5">
                              • {stats.unlinkedCount} unlinked
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                        {stats.unlinkedCount > 0 ? (
                          <button
                            type="button"
                            disabled={isLinkingLore}
                            onClick={() => handleAdminBulkLinkLore(ent)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Link All Chapters ({stats.unlinkedCount})</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fully linked
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isLinkingLore}
                          onClick={() => handleAdminBulkUnlinkLore(ent.name)}
                          className="text-[11px] font-mono text-[var(--ink-muted)] hover:text-red-500 transition-colors cursor-pointer"
                          title="Unlink all mentions across the story"
                        >
                          Unlink All
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chapters Lore Audit Table */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
              Per-Chapter Lore Status & Linking
            </h4>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] font-mono text-[11px]">
                    <th className="py-2.5 px-4 font-normal">#</th>
                    <th className="py-2.5 px-4 font-normal">Chapter</th>
                    <th className="py-2.5 px-4 font-normal">Words</th>
                    <th className="py-2.5 px-4 font-normal">Lore Status</th>
                    <th className="py-2.5 px-4 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {(work.chapters || []).map((ch, idx) => {
                    const chEntities = extractLoreEntities(ch.content || '')
                    return (
                      <tr key={ch.id} className="hover:bg-[var(--bg-canvas)]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-[var(--ink-muted)]">
                          {ch.chapterNumber || idx + 1}
                        </td>
                        <td className="py-3 px-4 font-serif font-bold text-[var(--ink-primary)]">
                          {ch.title || `Chapter ${ch.chapterNumber || idx + 1}`}
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--ink-secondary)]">
                          {(ch.content || '').split(/\s+/).filter(Boolean).length.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {chEntities.length > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              {chEntities.length} entit{chEntities.length !== 1 ? 'ies' : 'y'} active
                            </span>
                          ) : (
                            <span className="text-[var(--ink-faint)]">0 entities linked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChapterId(ch.id)
                              setChNumberInput(ch.chapterNumber || idx + 1)
                              setChTitleInput(ch.title || '')
                              setChSubtitleInput(ch.subtitle || '')
                              setChContentInput(ch.content || '')
                              setChStatusInput(ch.status === 'draft' ? 'draft' : 'published')
                              setChBannerInput(ch.bannerImagePath || '')
                              setChapterModalMode('edit')
                              setShowChapterModal(true)
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] transition-colors cursor-pointer"
                          >
                            Edit & Link Chapter
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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

      {/* MODAL: ADD / EDIT CHAPTER */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  {chapterModalMode === 'edit'
                    ? `Edit Chapter ${chNumberInput}`
                    : `Add Chapter to Act ${targetActForChapter?.number || 1}`}
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  {chapterModalMode === 'edit'
                    ? 'Modify chapter title, manuscript narrative, and publication status.'
                    : targetActForChapter?.title || 'Serialized Manuscript Act'}
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

              {/* Cloudinary Chapter Banner Upload */}
              <CloudinaryImageUpload
                label="Chapter Banner Image (Cloudinary CDN)"
                currentImageUrl={chBannerInput}
                onImageUploaded={(url) => setChBannerInput(url)}
                onImageRemoved={() => setChBannerInput('')}
                onUploading={setIsBannerUploading}
                folder="banners"
                recommendedDimensions="1200 × 450 px"
                aspectRatioHint="Wide Landscape (~21:9)"
                maxSizeMb={10}
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
                    Manuscript Text <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChLoreModal(true)}
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Manage interactive footnotes and character links for this chapter"
                    >
                      <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>Lore & Footnotes</span>
                    </button>
                    {chContentInput.trim() && (
                      <span className="text-[10px] font-mono text-[var(--ink-faint)]">
                        {chContentInput.trim().split(/\s+/).filter(Boolean).length} words
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  required
                  rows={10}
                  placeholder="Paste or write the chapter content here..."
                  value={chContentInput}
                  onChange={(e) => setChContentInput(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-y"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                {chapterModalMode === 'edit' && editingChapterId ? (
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setChapterToDelete({
                        id: editingChapterId,
                        title: chTitleInput || `Chapter ${chNumberInput}`,
                        number: chNumberInput,
                      })
                    }}
                    leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Delete Chapter
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
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
                    leftIcon={chapterModalMode === 'edit' ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  >
                    {chapterModalMode === 'edit' ? 'Save Chapter Changes' : `Publish Chapter ${chNumberInput}`}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chapter Lore Modal */}
      <StoryLoreModal
        isOpen={showChLoreModal}
        onClose={() => setShowChLoreModal(false)}
        content={chContentInput}
        onUpdateContent={(newContent) => {
          setChContentInput(newContent)
        }}
      />

      {/* MODAL: 3-LAYER VIEWS BREAKDOWN WITH ADMIN INCREMENT / DECREMENT */}
      <ViewsBreakdownModal
        isOpen={showViewsModal}
        onClose={() => setShowViewsModal(false)}
        work={localWorkOverride || work}
        adminToken={adminToken}
        allowAdminAdjust={true}
        onViewsUpdated={(updated) => {
          setLocalWorkOverride(updated)
          reloadWorksFromDb()
        }}
      />

      {/* MODAL: HEARTS BREAKDOWN WITH ADMIN INCREMENT / DECREMENT */}
      <HeartsBreakdownModal
        isOpen={showHeartsModal}
        onClose={() => setShowHeartsModal(false)}
        work={localWorkOverride || work}
        adminToken={adminToken}
        allowAdminAdjust={true}
        onHeartsUpdated={(newTotalHearts, updatedChapters) => {
          setLocalWorkOverride((prev: any) => {
            const base = prev || work
            const chMap = new Map((updatedChapters || []).map((c) => [c.id, c.heartCount]))
            const newChs = (base.chapters || []).map((c: any) => ({
              ...c,
              likeCount: chMap.has(c.id) ? chMap.get(c.id) : c.likeCount,
              like_count: chMap.has(c.id) ? chMap.get(c.id) : c.like_count,
            }))
            return {
              ...base,
              likeCount: newTotalHearts,
              like_count: newTotalHearts,
              chapters: newChs,
            }
          })
          reloadWorksFromDb()
          showToast(`Story hearts updated to ${newTotalHearts.toLocaleString()}!`)
        }}
      />

      {/* MODAL: SAVES ADJUSTMENT WITH ADMIN INCREMENT / DECREMENT */}
      <SavesAdjustmentModal
        isOpen={showSavesModal}
        onClose={() => setShowSavesModal(false)}
        work={localWorkOverride || work}
        adminToken={adminToken}
        onSavesUpdated={(newTotalSaves) => {
          setLocalWorkOverride((prev: any) => {
            const base = prev || work
            return {
              ...base,
              totalSaves: newTotalSaves,
              save_count: newTotalSaves,
              saveCount: newTotalSaves,
            }
          })
          reloadWorksFromDb()
          showToast(`Story library saves updated to ${newTotalSaves.toLocaleString()}!`)
        }}
      />

      {/* MODAL: CONFIRM DELETE CHAPTER */}
      {chapterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 rounded-full bg-rose-500/10">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Delete Chapter
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  This action permanently removes the chapter from the manuscript.
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[var(--ink-primary)]">
                {chapterToDelete.number ? `Chapter ${chapterToDelete.number}: ` : ''}
                "{chapterToDelete.title}"
              </span>
              ? Manuscript total word count and reading time will be recalculated automatically.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={isDeletingChapter}
                onClick={() => setChapterToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                type="button"
                isLoading={isDeletingChapter}
                onClick={handleConfirmDeleteChapter}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Delete Permanently
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
