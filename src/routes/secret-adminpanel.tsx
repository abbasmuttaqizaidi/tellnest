import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import {
  adminLoginServerFn,
  verifyAdminSessionServerFn,
  getAdminUsersServerFn,
  getAdminWorksServerFn,
  getAdminWorkActsAnalyticsServerFn,
  purgeUserServerFn,
  adminPostWorkServerFn,
  adminPostChapterServerFn,
  adminUpdateUserProfileServerFn,
  adminSendEmailServerFn,
  adminUpdateWorkCoverServerFn,
  type AdminUser,
  type AdminDashboardData,
  type AdminWorkRow,
  type WorkActAnalytics,
  type AdminSendEmailInput,
} from '../server/admin'
import { Badge, Button, Modal } from '../design-system'
import { UnisexAvatar } from '../components/UnisexAvatar'
import { HeartsBreakdownModal } from '../components/HeartsBreakdownModal'
import { CloudinaryImageUpload } from '../components/CloudinaryImageUpload'
import {
  ShieldAlert,
  Trash2,
  Users,
  BookOpen,
  Bookmark,
  Clock,
  Search,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Database,
  KeyRound,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Plus,
  FileText,
  User,
  X,
  Sparkles,
  CheckCircle2,
  Edit,
  Heart,
  Sliders,
  Globe,
  Mail,
  Send,
  Inbox,
  AtSign,
  HelpCircle,
  Info,
  Camera,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

import { generateMeta } from '../lib/seo'
import { formatHeartCount } from '../lib/utils'

export const Route = createFileRoute('/secret-adminpanel')({
  head: () =>
    generateMeta({
      title: 'Restricted Administration',
      noindex: true,
    }),
  component: SecretAdminPanelPage,
})

const ADMIN_TOKEN_KEY = 'hatchpen_admin_session_token'
const LEGACY_ADMIN_TOKEN_KEY = 'tellnest_admin_session_token'

import { CATEGORIES, GENRES, AUTHORS } from '../data/mockData'
import type { Work, Author } from '../data/mockData'

const PRESET_MOCK_AVATARS = [
  { label: 'Elena (Noir)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { label: 'Marcus (Sci-Fi)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { label: 'Alistair (Scholar)', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
  { label: 'Maya (Poet)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
]

const PRESET_WORK_COVERS = [
  { label: 'Perimeter Architecture', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80' },
  { label: 'Monochrome Coast', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Atmospheric Fog', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Cosmic Static', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
]

function SecretAdminPanelPage() {
  const { user: currentClerkUser } = useUser()
  const { allWorks, writerWorks, savedWorkIds, readingProgress: localReadingProgress, showToast, addAdminPostedWork, addAdminPostedChapter, reloadWorksFromDb, updateWork, categories, genres } = useApp()

  // Authentication State
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
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true)

  // Login Form State
  const [passkeyInput, setPasskeyInput] = useState('')
  const [showPasskey, setShowPasskey] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Dashboard Navigation & Data State
  const [activeAdminSection, setActiveAdminSection] = useState<'works' | 'users' | 'mailer'>('works')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'real' | 'mock' | 'authors' | 'readers' | 'saved'>('all')
  const [activeTabByUser, setActiveTabByUser] = useState<Record<string, 'works' | 'reading' | 'interests'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedWorkForHearts, setSelectedWorkForHearts] = useState<any | null>(null)

  // Direct Mailer / Email Broadcast State (Anti-Spam Hardened)
  const [mailRecipientsMode, setMailRecipientsMode] = useState<'custom' | 'all'>('custom')
  const [mailCustomRecipients, setMailCustomRecipients] = useState('')
  const [mailFromPreset, setMailFromPreset] = useState<'editorial' | 'team' | 'welcome' | 'notifications' | 'custom'>('editorial')
  const [mailCustomPrefix, setMailCustomPrefix] = useState('editorial')
  const [mailCustomName, setMailCustomName] = useState('HatchPen Editorial')
  const [mailReplyTo, setMailReplyTo] = useState('zaidi.yam5@gmail.com')
  const [mailSubject, setMailSubject] = useState('')
  const [mailHeadline, setMailHeadline] = useState('')
  const [mailBody, setMailBody] = useState('')
  const [mailCtaText, setMailCtaText] = useState('')
  const [mailCtaUrl, setMailCtaUrl] = useState('')
  const [isSendingMail, setIsSendingMail] = useState(false)
  const [isSendingTestMail, setIsSendingTestMail] = useState(false)
  const [mailSendResult, setMailSendResult] = useState<{ success: boolean; message: string; count?: number; id?: string } | null>(null)
  const [mailPreviewTab, setMailPreviewTab] = useState<'compose' | 'preview'>('compose')

  // Works Table (50 per page, lightweight fetch)
  const [adminWorks, setAdminWorks] = useState<AdminWorkRow[]>([])
  const [worksTotalCount, setWorksTotalCount] = useState<number>(0)
  const [worksPage, setWorksPage] = useState<number>(1)
  const [worksTotalPages, setWorksTotalPages] = useState<number>(1)
  const [loadingWorks, setLoadingWorks] = useState(false)
  const [worksSearchQuery, setWorksSearchQuery] = useState('')
  const [worksFilter, setWorksFilter] = useState<'all' | 'real' | 'mock'>('all')

  // Acts Views Analytics Popup State
  const [selectedWorkForActs, setSelectedWorkForActs] = useState<AdminWorkRow | null>(null)
  const [actsAnalyticsData, setActsAnalyticsData] = useState<WorkActAnalytics[]>([])
  const [loadingActsAnalytics, setLoadingActsAnalytics] = useState(false)

  // Change Story Cover Modal State
  const [coverTargetWork, setCoverTargetWork] = useState<AdminWorkRow | null>(null)
  const [newCoverUrl, setNewCoverUrl] = useState<string>('')
  const [isCoverUploading, setIsCoverUploading] = useState<boolean>(false)
  const [isSavingCover, setIsSavingCover] = useState<boolean>(false)

  // Purge Modal State
  const [purgeTarget, setPurgeTarget] = useState<AdminUser | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; message: string } | null>(null)

  // Customize User Profile & Visibility Modal State
  const [showCustomizeUserModal, setShowCustomizeUserModal] = useState(false)
  const [customizeTargetUser, setCustomizeTargetUser] = useState<AdminUser | null>(null)
  const [customizeDisplayName, setCustomizeDisplayName] = useState('')
  const [customizeUsername, setCustomizeUsername] = useState('')
  const [customizeAvatarUrl, setCustomizeAvatarUrl] = useState('')
  const [customizeBio, setCustomizeBio] = useState('')
  const [customizeLocation, setCustomizeLocation] = useState('')
  const [customizeIsPublic, setCustomizeIsPublic] = useState(false)
  const [customizeWorksVisibility, setCustomizeWorksVisibility] = useState<'public' | 'hidden'>('public')
  const [customizeShowAvatar, setCustomizeShowAvatar] = useState(true)
  const [customizeShowName, setCustomizeShowName] = useState(true)
  const [customizeShowUsername, setCustomizeShowUsername] = useState(true)
  const [customizeShowReads, setCustomizeShowReads] = useState(false)
  const [customizeShowFollowers, setCustomizeShowFollowers] = useState(false)
  const [customizeShowWorksCount, setCustomizeShowWorksCount] = useState(false)
  const [customizeShowReadingHistory, setCustomizeShowReadingHistory] = useState(false)
  const [isSavingUserCustomization, setIsSavingUserCustomization] = useState(false)
  const [customizeUserError, setCustomizeUserError] = useState<string | null>(null)

  // Post Work Modal State
  const [showPostWorkModal, setShowPostWorkModal] = useState(false)
  const [postWorkAuthorMode, setPostWorkAuthorMode] = useState<'mock' | 'existing'>('mock')
  const [postWorkExistingUserId, setPostWorkExistingUserId] = useState('')
  const [postWorkExistingProfileId, setPostWorkExistingProfileId] = useState('')
  const [postWorkExistingName, setPostWorkExistingName] = useState('')
  const [postWorkExistingHandle, setPostWorkExistingHandle] = useState('')
  const [postWorkUserSearch, setPostWorkUserSearch] = useState('')

  // Mock author fields
  const [mockAuthorName, setMockAuthorName] = useState('')
  const [mockAuthorHandle, setMockAuthorHandle] = useState('')
  const [mockAuthorAvatar, setMockAuthorAvatar] = useState('')
  const [mockAuthorBio, setMockAuthorBio] = useState('')
  const [mockAuthorLocation, setMockAuthorLocation] = useState('')

  // Work fields
  const [postWorkTitle, setPostWorkTitle] = useState('')
  const [postWorkSubtitle, setPostWorkSubtitle] = useState('')
  const [postWorkCover, setPostWorkCover] = useState('')
  const [postWorkCategory, setPostWorkCategory] = useState('Novels')
  const [postWorkGenre, setPostWorkGenre] = useState('Literary Fiction')
  const [postWorkSynopsis, setPostWorkSynopsis] = useState('')
  const [postWorkFullDesc, setPostWorkFullDesc] = useState('')
  const [postWorkTags, setPostWorkTags] = useState('')
  const [postWorkStatus, setPostWorkStatus] = useState<'Ongoing' | 'Completed'>('Ongoing')
  const [postWorkVisibility, setPostWorkVisibility] = useState<'Public' | 'Unlisted'>('Public')
  const [postWorkChapterTitle, setPostWorkChapterTitle] = useState('Chapter One')
  const [postWorkChapterContent, setPostWorkChapterContent] = useState('')
  const [isPostingWork, setIsPostingWork] = useState(false)
  const [postWorkError, setPostWorkError] = useState<string | null>(null)

  // Post Part / Chapter Modal State
  const [showPostChapterModal, setShowPostChapterModal] = useState(false)
  const [targetWorkForChapter, setTargetWorkForChapter] = useState<{
    id: string
    title: string
    authorName: string
    currentChaptersCount: number
    category?: string
    genre?: string
  } | null>(null)
  const [postChapterTitle, setPostChapterTitle] = useState('')
  const [postChapterSubtitle, setPostChapterSubtitle] = useState('')
  const [postChapterNumber, setPostChapterNumber] = useState<number>(2)
  const [postChapterActNumber, setPostChapterActNumber] = useState<number>(1)
  const [postChapterGenre, setPostChapterGenre] = useState('Literary Fiction')
  const [postChapterCategory, setPostChapterCategory] = useState('Novels')
  const [postChapterMoodTag, setPostChapterMoodTag] = useState('')
  const [postChapterStatus, setPostChapterStatus] = useState<'published' | 'draft'>('published')
  const [postChapterContent, setPostChapterContent] = useState('')
  const [isPostingChapter, setIsPostingChapter] = useState(false)
  const [postChapterError, setPostChapterError] = useState<string | null>(null)

  // 1. Check existing session on mount
  useEffect(() => {
    async function checkSession() {
      if (!adminToken) {
        setIsVerifyingSession(false)
        setIsAuthenticated(false)
        return
      }

      try {
        const verifyRes = await verifyAdminSessionServerFn({ data: { token: adminToken } })
        if (verifyRes.valid) {
          setIsAuthenticated(true)
          fetchDashboard(adminToken)
        } else {
          sessionStorage.removeItem(ADMIN_TOKEN_KEY)
          setAdminToken(null)
          setIsAuthenticated(false)
        }
      } catch (e) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY)
        setAdminToken(null)
        setIsAuthenticated(false)
      } finally {
        setIsVerifyingSession(false)
      }
    }

    checkSession()
  }, [])

  // 2. Fetch Admin Data with Token
  const fetchWorks = async (token: string, pageNum = 1) => {
    setLoadingWorks(true)
    try {
      const res = await getAdminWorksServerFn({
        data: {
          adminToken: token,
          page: pageNum,
          limit: 50,
        },
      })
      setAdminWorks(res.works)
      setWorksTotalCount(res.totalCount)
      setWorksPage(res.page)
      setWorksTotalPages(res.totalPages)
    } catch (err: any) {
      console.error('[SecretAdminPanel] Error fetching works table:', err)
    } finally {
      setLoadingWorks(false)
    }
  }

  // Fetch Acts Analytics for a work
  const openActsAnalyticsModal = async (work: AdminWorkRow) => {
    setSelectedWorkForActs(work)
    setLoadingActsAnalytics(true)
    setActsAnalyticsData([])

    // Check if it's a mocked/local work first
    const mockMatch = allWorks.find((mw) => mw.id === work.id || mw.title.toLowerCase().trim() === work.title.toLowerCase().trim())
    if (mockMatch) {
      // Build mock acts hierarchy from mock chapters
      const chapters = mockMatch.chapters || []
      // Group by actNumber if available or generate Act I & Act II
      const actsMap = new Map<number, typeof chapters>()
      chapters.forEach((ch) => {
        const actNum = ch.actNumber || 1
        if (!actsMap.has(actNum)) actsMap.set(actNum, [])
        actsMap.get(actNum)!.push(ch)
      })

      if (actsMap.size === 0) {
        actsMap.set(1, chapters)
      }

      const totalWorkViews = work.viewCount || 1000
      const calculatedActs: WorkActAnalytics[] = Array.from(actsMap.entries()).map(([actNum, actChapters], idx) => {
        const actShare = Math.round(totalWorkViews * (idx === 0 ? 0.65 : 0.35))
        return {
          id: `mock-act-${mockMatch.id}-${actNum}`,
          actNumber: actNum,
          title: `Act ${actNum === 1 ? 'I' : actNum === 2 ? 'II' : actNum === 3 ? 'III' : actNum}: ${actNum === 1 ? 'The Exposition' : 'The Climax'}`,
          description: actNum === 1 ? 'Foundational movement' : 'Secondary movement',
          viewCount: actShare,
          chaptersCount: actChapters.length,
          chapters: actChapters.map((ch, chIdx) => ({
            id: ch.id,
            chapterNumber: ch.number,
            title: ch.title,
            viewCount: Math.round(actShare * Math.pow(0.9, chIdx)),
          })),
        }
      })

      setActsAnalyticsData(calculatedActs)
      setLoadingActsAnalytics(false)
      return
    }

    // Otherwise, fetch from Supabase server function
    if (adminToken) {
      try {
        const res = await getAdminWorkActsAnalyticsServerFn({
          data: {
            adminToken,
            workId: work.id,
          },
        })
        setActsAnalyticsData(res.acts)
      } catch (err: any) {
        console.error('[openActsAnalyticsModal] Error:', err)
        // Fallback default single act
        setActsAnalyticsData([
          {
            id: `act-1-${work.id}`,
            actNumber: 1,
            title: 'Act I: The Opening Movement',
            viewCount: work.viewCount,
            chaptersCount: 1,
            chapters: [
              {
                id: `ch-1-${work.id}`,
                chapterNumber: 1,
                title: 'Part 1',
                viewCount: work.viewCount,
              },
            ],
          },
        ])
      } finally {
        setLoadingActsAnalytics(false)
      }
    } else {
      setLoadingActsAnalytics(false)
    }
  }

  // Open Change Story Cover Modal
  const openChangeCoverModal = (work: AdminWorkRow) => {
    setCoverTargetWork(work)
    setNewCoverUrl(work.cover || '')
  }

  // Handle Save Cover Action
  const handleSaveCover = async () => {
    if (!coverTargetWork || !adminToken) return
    if (!newCoverUrl.trim()) {
      showToast('Please upload or specify a cover image URL')
      return
    }

    setIsSavingCover(true)
    try {
      // 1. Call server function to update cover image in Supabase
      await adminUpdateWorkCoverServerFn({
        data: {
          adminToken,
          workId: coverTargetWork.id,
          coverImageUrl: newCoverUrl.trim(),
        },
      })

      // 2. Update local adminWorks state
      setAdminWorks((prev) =>
        prev.map((w) =>
          w.id === coverTargetWork.id ? { ...w, cover: newCoverUrl.trim() } : w
        )
      )

      // 3. Update global AppContext so everywhere in the platform reflects the new cover
      updateWork(coverTargetWork.id, { cover: newCoverUrl.trim() })

      showToast(`Cover image for "${coverTargetWork.title}" updated successfully!`)
      setCoverTargetWork(null)
    } catch (err: any) {
      console.error('[handleSaveCover] Error:', err)
      showToast(err?.message || 'Failed to update story cover image')
    } finally {
      setIsSavingCover(false)
    }
  }

  const fetchDashboard = async (token: string, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const [userData] = await Promise.all([
        getAdminUsersServerFn({ data: { adminToken: token } }),
        fetchWorks(token, 1),
      ])
      setDashboardData(userData)
    } catch (err: any) {
      console.error('[SecretAdminPanel] Error fetching registry data:', err)
      if (err?.message?.includes('Unauthorized')) {
        handleLogout()
        showToast('Admin session expired. Please log in again.')
      } else {
        showToast('Failed to load user registry')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 3. Handle Admin Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passkeyInput.trim()) {
      setLoginError('Please enter the administration access key')
      return
    }

    setIsLoggingIn(true)
    setLoginError(null)

    try {
      const res = await adminLoginServerFn({ data: { passkey: passkeyInput.trim() } })
      if (res.success && res.token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, res.token)
        localStorage.setItem(ADMIN_TOKEN_KEY, res.token)
        sessionStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, res.token)
        localStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, res.token)
        setAdminToken(res.token)
        setIsAuthenticated(true)
        setPasskeyInput('')
        showToast('Admin authority verified')
        fetchDashboard(res.token)
      }
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid administrative access key')
    } finally {
      setIsLoggingIn(false)
    }
  }

  // 4. Handle Admin Logout
  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY)
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY)
    setAdminToken(null)
    setIsAuthenticated(false)
    setDashboardData(null)
    setPurgeTarget(null)
    showToast('Logged out of Admin Registry')
  }

  // 5. Merge client-side session info for current logged-in user if available
  const unifiedUsers = useMemo(() => {
    if (!dashboardData) return []
    return dashboardData.users.map((u) => {
      const isCurrentUser = currentClerkUser?.id === u.clerkId
      if (!isCurrentUser) return u

      const clientWorks = writerWorks.map((ww) => ({
        id: ww.id,
        title: ww.title,
        slug: ww.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: 'Manuscript in active writer studio',
        status: ww.status,
        visibility: 'private',
        chapterCount: ww.chaptersCount || 1,
        wordCount: 1250,
        viewCount: parseInt(ww.totalReads) || 0,
        saveCount: ww.totalSaves || 0,
        createdAt: ww.lastUpdated,
        categoryName: ww.category || 'Literary Fiction',
      }))

      const clientReading = Object.entries(localReadingProgress).map(([workId, rp]) => {
        const matchingWork = allWorks.find((w) => w.id === workId)
        return {
          workId,
          workTitle: matchingWork?.title || rp.chapterTitle || 'Active Manuscript',
          workSlug: matchingWork?.categorySlug,
          chapterId: rp.chapterId,
          chapterNumber: rp.chapterNumber,
          chapterTitle: rp.chapterTitle,
          progressPercent: rp.progressPercent,
          lastReadAt: rp.lastReadAt,
        }
      })

      const combinedWorks = [...u.works]
      for (const cw of clientWorks) {
        if (!combinedWorks.some((w) => w.title.toLowerCase() === cw.title.toLowerCase())) {
          combinedWorks.push(cw)
        }
      }

      const combinedReading = [...u.readingProgress]
      for (const cr of clientReading) {
        if (!combinedReading.some((r) => r.workId === cr.workId)) {
          combinedReading.push(cr)
        }
      }

      const combinedSaved = [...u.savedWorks]
      for (const swId of savedWorkIds) {
        const found = allWorks.find((w) => w.id === swId)
        if (found && !combinedSaved.some((s) => s.workId === swId)) {
          combinedSaved.push({
            workId: swId,
            workTitle: found.title,
            coverImage: found.cover,
            savedAt: 'Recent',
          })
        }
      }

      const interests = Array.from(
        new Set([
          ...u.interests,
          ...combinedWorks.map((w) => w.categoryName || 'Fiction'),
          ...combinedSaved.map(() => 'Curated Library'),
        ])
      )

      return {
        ...u,
        works: combinedWorks,
        readingProgress: combinedReading,
        savedWorks: combinedSaved,
        interests,
      }
    })
  }, [dashboardData, currentClerkUser, writerWorks, localReadingProgress, savedWorkIds, allWorks])

  // Filtered and searched users
  const filteredUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.clerkId.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (activeFilter === 'real') {
        return !u.isMock
      }
      if (activeFilter === 'mock') {
        return Boolean(u.isMock)
      }
      if (activeFilter === 'authors') {
        return u.works.length > 0
      }
      if (activeFilter === 'readers') {
        return u.readingProgress.length > 0
      }
      if (activeFilter === 'saved') {
        return u.savedWorks.length > 0
      }
      return true
    })
  }, [unifiedUsers, searchQuery, activeFilter])

  // Combined lightweight works list (DB works + Mock works)
  const combinedAdminWorks = useMemo(() => {
    // Convert client/mock allWorks to lightweight AdminWorkRow format
    const mockRows: AdminWorkRow[] = allWorks.map((w) => {
      // Parse totalReads string like '215K' into number
      let parsedViews = 0
      if (typeof w.totalReads === 'string') {
        const cleaned = w.totalReads.replace(/,/g, '').trim().toUpperCase()
        if (cleaned.endsWith('K')) {
          parsedViews = Math.round(parseFloat(cleaned) * 1000)
        } else if (cleaned.endsWith('M')) {
          parsedViews = Math.round(parseFloat(cleaned) * 1000000)
        } else {
          parsedViews = parseInt(cleaned) || 0
        }
      } else if (typeof (w as any).view_count === 'number') {
        parsedViews = (w as any).view_count
      }

      return {
        id: w.id,
        title: w.title,
        slug: w.slug || '',
        cover: w.cover || (w as any).cover_image_path || null,
        author: {
          id: w.author.id,
          name: w.author.name,
          handle: w.author.handle,
          avatar: w.author.avatar,
          isMock: true,
        },
        postedAt: w.createdAt,
        viewCount: parsedViews,
        likeCount: (w as any).likeCount || 0,
        status: w.status,
      }
    })

    // Merge without duplicates (DB works take precedence, then mock works that aren't already listed)
    const existingIds = new Set(adminWorks.map((w) => w.id))
    const existingTitles = new Set(adminWorks.map((w) => w.title.toLowerCase().trim()))

    const uniqueMockRows = mockRows.filter(
      (m) => !existingIds.has(m.id) && !existingTitles.has(m.title.toLowerCase().trim())
    )

    return [...adminWorks, ...uniqueMockRows]
  }, [adminWorks, allWorks])

  // Filtered and searched works (for Works Directory table)
  const filteredAdminWorks = useMemo(() => {
    return combinedAdminWorks.filter((w) => {
      const q = worksSearchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        w.title.toLowerCase().includes(q) ||
        w.author.name.toLowerCase().includes(q) ||
        w.author.handle.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q)

      if (!matchesSearch) return false

      if (worksFilter === 'real') {
        return !w.author.isMock
      }
      if (worksFilter === 'mock') {
        return Boolean(w.author.isMock)
      }
      return true
    })
  }, [combinedAdminWorks, worksSearchQuery, worksFilter])

  // Copy ID to clipboard
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    showToast('User ID copied to clipboard')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Handle Purge Action
  const executePurge = async () => {
    if (!purgeTarget || !adminToken) return
    if (purgeConfirmText.trim().toUpperCase() !== 'PURGE') {
      showToast('Please type PURGE to confirm')
      return
    }

    setIsPurging(true)
    setPurgeResult(null)

    try {
      const result = await purgeUserServerFn({
        data: {
          adminToken,
          clerkUserId: purgeTarget.clerkId,
          profileId: purgeTarget.profileId,
        },
      })

      if (result.success || result.clerkDeleted || result.supabaseDeleted) {
        showToast(`User ${purgeTarget.displayName} successfully purged`)
        setPurgeResult({
          success: true,
          message: `Flushed: Clerk (${result.clerkMessage}) • Supabase (${result.supabaseMessage})`,
        })

        // Instantly remove user from active view
        setDashboardData((prev) => {
          if (!prev) return null
          const nextUsers = prev.users.filter((u) => u.clerkId !== purgeTarget.clerkId)
          return {
            ...prev,
            users: nextUsers,
            totalCount: nextUsers.length,
            stats: {
              ...prev.stats,
              totalUsers: nextUsers.length,
            },
          }
        })

        setTimeout(() => {
          setPurgeTarget(null)
          setPurgeConfirmText('')
          setPurgeResult(null)
        }, 2200)
      } else {
        setPurgeResult({
          success: false,
          message: `Purge warning: ${result.clerkMessage || ''} ${result.supabaseMessage || ''}`,
        })
      }
    } catch (err: any) {
      console.error('[SecretAdminPanel] Purge failed:', err)
      setPurgeResult({
        success: false,
        message: err?.message || 'Purge failed due to server authorization error',
      })
    } finally {
      setIsPurging(false)
    }
  }

  // ── Unified Selectable Author Identities ───────────────────────────
  const selectableIdentities = useMemo(() => {
    const list: Array<{
      id: string
      clerkId?: string
      profileId?: string
      displayName: string
      username: string
      avatarUrl: string | null
      bio?: string
      location?: string
      manuscriptCount: number
      source: 'registered' | 'platform'
    }> = []

    // 1. Registered users from unified list
    unifiedUsers.forEach((u) => {
      list.push({
        id: u.clerkId,
        clerkId: u.clerkId,
        profileId: u.profileId || undefined,
        displayName: u.displayName,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.interests?.join(', ') || 'Registered platform author/reader',
        manuscriptCount: u.works.length,
        source: 'registered',
      })
    })

    // 2. Platform canonical authors
    AUTHORS.forEach((a) => {
      if (!list.some((existing) => existing.username.toLowerCase() === a.handle.toLowerCase())) {
        list.push({
          id: a.id,
          displayName: a.name,
          username: a.handle,
          avatarUrl: a.avatar,
          bio: a.bio,
          location: a.location,
          manuscriptCount: a.worksCount,
          source: 'platform',
        })
      }
    })

    return list
  }, [unifiedUsers])

  // Random persona generator for testing mock author creations
  const generateRandomPersona = () => {
    const randomFirstNames = ['Julian', 'Cassandra', 'Silas', 'Evelyn', 'Rowan', 'Genevieve', 'Arthur', 'Valerie']
    const randomLastNames = ['Vane', 'Mercer', 'Blackwood', 'Holloway', 'St. Clair', 'Winter', 'Moran', 'Thorne']
    const randomCities = ['Prague, Czechia', 'Edinburgh, UK', 'Kyoto, Japan', 'Vienna, Austria', 'Seattle, USA', 'Valparaíso, Chile']
    const first = randomFirstNames[Math.floor(Math.random() * randomFirstNames.length)]
    const last = randomLastNames[Math.floor(Math.random() * randomLastNames.length)]
    const fullName = `${first} ${last}`
    const handle = `${first.toLowerCase()}${last.toLowerCase()}`
    const avatar = PRESET_MOCK_AVATARS[Math.floor(Math.random() * PRESET_MOCK_AVATARS.length)].url
    const loc = randomCities[Math.floor(Math.random() * randomCities.length)]

    setMockAuthorName(fullName)
    setMockAuthorHandle(handle)
    setMockAuthorAvatar(avatar)
    setMockAuthorLocation(loc)
    setMockAuthorBio(`Resident essayist and author of serialized speculative prose based in ${loc.split(',')[0]}.`)
  }

  // ── Post Work Helpers ────────────────────────────────────────────────
  const resetPostWorkForm = () => {
    setPostWorkAuthorMode('mock')
    setPostWorkExistingUserId('')
    setPostWorkExistingProfileId('')
    setPostWorkExistingName('')
    setPostWorkExistingHandle('')
    setPostWorkUserSearch('')
    setMockAuthorName('')
    setMockAuthorHandle('')
    setMockAuthorAvatar(PRESET_MOCK_AVATARS[0].url)
    setMockAuthorBio('')
    setMockAuthorLocation('')
    setPostWorkTitle('')
    setPostWorkSubtitle('')
    setPostWorkCover(PRESET_WORK_COVERS[0].url)
    setPostWorkCategory('Novels')
    setPostWorkGenre('Literary Fiction')
    setPostWorkSynopsis('')
    setPostWorkFullDesc('')
    setPostWorkTags('')
    setPostWorkStatus('Ongoing')
    setPostWorkVisibility('Public')
    setPostWorkChapterTitle('Chapter One: The Crossing')
    setPostWorkChapterContent('')
    setPostWorkError(null)
  }

  const openCustomizeUserModal = (target: AdminUser) => {
    setCustomizeTargetUser(target)
    setCustomizeDisplayName(target.displayName || '')
    setCustomizeUsername(target.username || '')
    setCustomizeAvatarUrl(target.avatarUrl || '')
    setCustomizeBio(target.bio || '')
    setCustomizeLocation(target.location || '')
    setCustomizeIsPublic(Boolean(target.isPublic))
    setCustomizeWorksVisibility(target.worksVisibility || 'public')
    setCustomizeShowAvatar(target.showAvatar !== false)
    setCustomizeShowName(target.showName !== false)
    setCustomizeShowUsername(target.showUsername !== false)
    setCustomizeShowReads(Boolean(target.showReads))
    setCustomizeShowFollowers(Boolean(target.showFollowers))
    setCustomizeShowWorksCount(Boolean(target.showWorksCount))
    setCustomizeShowReadingHistory(Boolean(target.showReadingHistory))
    setCustomizeUserError(null)
    setShowCustomizeUserModal(true)
  }

  const handleSaveUserCustomization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminToken || !customizeTargetUser) return
    setIsSavingUserCustomization(true)
    setCustomizeUserError(null)

    try {
      const res = await adminUpdateUserProfileServerFn({
        data: {
          adminToken,
          clerkUserId: customizeTargetUser.clerkId,
          profileId: customizeTargetUser.profileId || undefined,
          displayName: customizeDisplayName.trim(),
          username: customizeUsername.trim(),
          avatarUrl: customizeAvatarUrl.trim() || null,
          bio: customizeBio.trim() || null,
          location: customizeLocation.trim() || null,
          isPublic: customizeIsPublic,
          worksVisibility: customizeWorksVisibility,
          showAvatar: customizeShowAvatar,
          showName: customizeShowName,
          showUsername: customizeShowUsername,
          showReads: customizeShowReads,
          showFollowers: customizeShowFollowers,
          showWorksCount: customizeShowWorksCount,
          showReadingHistory: customizeShowReadingHistory,
        },
      })

      if (!res.success) {
        throw new Error('Failed to update profile.')
      }

      showToast(`Profile & privacy settings saved for @${customizeUsername}`, 'success')
      setShowCustomizeUserModal(false)

      // Refresh dashboard registry
      fetchDashboard(adminToken, true)
    } catch (err: any) {
      console.error('[Admin] Error customizing user profile:', err)
      setCustomizeUserError(err?.message || 'Failed to update user profile and privacy.')
    } finally {
      setIsSavingUserCustomization(false)
    }
  }

  const openPostWorkModal = (preselectedUser?: AdminUser | typeof AUTHORS[0]) => {
    resetPostWorkForm()
    if (preselectedUser) {
      setPostWorkAuthorMode('existing')
      if ('clerkId' in preselectedUser) {
        setPostWorkExistingUserId(preselectedUser.clerkId)
        setPostWorkExistingProfileId(preselectedUser.profileId || '')
        setPostWorkExistingName(preselectedUser.displayName)
        setPostWorkExistingHandle(preselectedUser.username)
      } else {
        setPostWorkExistingUserId(preselectedUser.id)
        setPostWorkExistingName(preselectedUser.name)
        setPostWorkExistingHandle(preselectedUser.handle)
      }
    }
    setShowPostWorkModal(true)
  }

  const handlePostWork = async () => {
    setPostWorkError(null)

    // Client-side validation & resolution
    let resolvedExistingName = postWorkExistingName.trim()
    let resolvedExistingHandle = postWorkExistingHandle.trim()
    let resolvedExistingAvatar = ''
    let resolvedExistingBio = ''

    if (postWorkAuthorMode === 'mock') {
      if (!mockAuthorName.trim()) { setPostWorkError('Mock author display name is required'); return }
      if (!mockAuthorHandle.trim()) {
        const generatedHandle = mockAuthorName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
        setMockAuthorHandle(generatedHandle)
      }
    } else {
      if (!postWorkExistingUserId && !postWorkExistingProfileId && !resolvedExistingName) {
        setPostWorkError('Please enter an existing user name or pick a registered user'); return
      }

      // Try to find in selectable identities for rich details
      const matched = selectableIdentities.find(
        (i) =>
          (postWorkExistingUserId && i.id === postWorkExistingUserId) ||
          (resolvedExistingName && i.displayName.toLowerCase() === resolvedExistingName.toLowerCase()) ||
          (resolvedExistingHandle && i.username.toLowerCase() === resolvedExistingHandle.toLowerCase())
      )

      if (matched) {
        resolvedExistingName = matched.displayName
        resolvedExistingHandle = matched.username
        resolvedExistingAvatar = matched.avatarUrl || ''
        resolvedExistingBio = matched.bio || ''
      }
    }

    if (!postWorkTitle.trim()) { setPostWorkError('Manuscript title is required'); return }
    if (!postWorkSynopsis.trim()) { setPostWorkError('Manuscript synopsis is required'); return }
    const finalChapterTitle = postWorkChapterTitle.trim() || 'Chapter One'
    if (!postWorkChapterContent.trim()) { setPostWorkError('Initial chapter content is required'); return }

    if (!adminToken) { setPostWorkError('Administrative session expired. Please re-enter access key.'); return }

    setIsPostingWork(true)
    try {
      const finalMockHandle = (
        mockAuthorHandle.trim() ||
        mockAuthorName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
      )

      const result = await adminPostWorkServerFn({
        data: {
          adminToken,
          authorMode: postWorkAuthorMode,
          existingUserClerkId: postWorkAuthorMode === 'existing' && postWorkExistingUserId ? postWorkExistingUserId : undefined,
          existingUserProfileId: postWorkAuthorMode === 'existing' && postWorkExistingProfileId ? postWorkExistingProfileId : undefined,
          existingUserName: postWorkAuthorMode === 'existing' ? (resolvedExistingName || undefined) : undefined,
          existingUserHandle: postWorkAuthorMode === 'existing' ? (resolvedExistingHandle || undefined) : undefined,
          existingUserAvatar: postWorkAuthorMode === 'existing' ? (resolvedExistingAvatar || undefined) : undefined,
          existingUserBio: postWorkAuthorMode === 'existing' ? (resolvedExistingBio || undefined) : undefined,
          mockAuthor: postWorkAuthorMode === 'mock' ? {
            name: mockAuthorName.trim(),
            handle: finalMockHandle,
            avatar: mockAuthorAvatar.trim() || PRESET_MOCK_AVATARS[0].url,
            bio: mockAuthorBio.trim() || 'Resident essayist and serialized storyteller on Stories by Relay.',
            location: mockAuthorLocation.trim() || undefined,
          } : undefined,
          workData: {
            title: postWorkTitle.trim(),
            subtitle: postWorkSubtitle.trim() || undefined,
            cover: postWorkCover.trim() || PRESET_WORK_COVERS[0].url,
            category: postWorkCategory,
            genre: postWorkGenre,
            synopsis: postWorkSynopsis.trim(),
            fullDescription: postWorkFullDesc.trim() || undefined,
            tags: postWorkTags.trim() ? postWorkTags.split(',').map((t) => t.trim()).filter(Boolean) : [postWorkGenre, postWorkCategory],
            status: postWorkStatus,
            visibility: postWorkVisibility,
            chapterTitle: finalChapterTitle,
            chapterContent: postWorkChapterContent.trim(),
          },
        },
      })

      if (result.success) {
        const wordCount = postWorkChapterContent.trim().split(/\s+/).filter(Boolean).length
        const authorId = result.authorId || (postWorkAuthorMode === 'mock' ? `mock-${Date.now()}` : (postWorkExistingUserId || `user-${Date.now()}`))
        const authorName = result.authorName || (postWorkAuthorMode === 'mock' ? mockAuthorName.trim() : (resolvedExistingName || 'Author'))
        const authorHandle = result.authorHandle || (postWorkAuthorMode === 'mock' ? finalMockHandle : (resolvedExistingHandle || authorName.toLowerCase().replace(/[^a-z0-9_-]/g, '')))
        const authorAvatar = result.authorAvatar || (postWorkAuthorMode === 'mock' ? (mockAuthorAvatar.trim() || PRESET_MOCK_AVATARS[0].url) : (resolvedExistingAvatar || '/unisex-avatar.svg'))
        const authorBio = result.authorBio || (postWorkAuthorMode === 'mock' ? (mockAuthorBio.trim() || 'Author on Stories by Relay') : (resolvedExistingBio || 'Author on Stories by Relay'))
        const authorLocation = result.authorLocation || (postWorkAuthorMode === 'mock' ? mockAuthorLocation.trim() || undefined : undefined)

        const newWork: Work = {
          id: result.workId || `admin-work-${Date.now()}`,
          title: postWorkTitle.trim(),
          subtitle: postWorkSubtitle.trim() || undefined,
          author: {
            id: authorId,
            name: authorName,
            handle: authorHandle,
            avatar: authorAvatar,
            bio: authorBio,
            location: authorLocation,
            worksCount: 1,
            followersCount: 0,
            totalReads: '0',
            verified: true,
          },
          cover: postWorkCover.trim() || PRESET_WORK_COVERS[0].url,
          category: postWorkCategory,
          categorySlug: postWorkCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          genre: postWorkGenre,
          genreSlug: postWorkGenre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          tags: postWorkTags.trim() ? postWorkTags.split(',').map((t) => t.trim()).filter(Boolean) : [postWorkGenre, postWorkCategory],
          language: 'English',
          status: postWorkStatus,
          visibility: postWorkVisibility,
          isMature: false,
          featured: true,
          trending: true,
          synopsis: postWorkSynopsis.trim(),
          fullDescription: postWorkFullDesc.trim() || postWorkSynopsis.trim(),
          chaptersCount: 1,
          publishedChaptersCount: 1,
          totalReads: '0',
          totalSaves: 0,
          ratingScore: 5.0,
          ratingCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          chapters: [
            {
              id: result.supabaseChapterId || `admin-ch-${Date.now()}-1`,
              number: 1,
              title: finalChapterTitle,
              status: 'published',
              wordCount,
              readTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)),
              publishedAt: new Date().toISOString(),
              content: postWorkChapterContent.trim(),
            },
          ],
        }

        // Add to AppContext
        addAdminPostedWork(newWork)
        reloadWorksFromDb()

        // Locally update dashboardData so the user's authored works ledger reflects immediately
        if (dashboardData) {
          const updatedUsers = dashboardData.users.map((u) => {
            if (u.clerkId === postWorkExistingUserId || u.displayName.toLowerCase() === authorName.toLowerCase()) {
              return {
                ...u,
                works: [
                  {
                    id: newWork.id,
                    title: newWork.title,
                    slug: newWork.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    description: newWork.synopsis,
                    status: newWork.status,
                    visibility: newWork.visibility,
                    chapterCount: 1,
                    wordCount,
                    viewCount: 0,
                    saveCount: 0,
                    createdAt: 'Just now',
                    categoryName: newWork.category,
                  },
                  ...u.works,
                ],
              }
            }
            return u
          })
          setDashboardData({
            ...dashboardData,
            users: updatedUsers,
            stats: {
              ...dashboardData.stats,
              totalWorks: dashboardData.stats.totalWorks + 1,
            },
          })
        }

        showToast(result.message)
        setShowPostWorkModal(false)
        resetPostWorkForm()

        // Background sync
        fetchDashboard(adminToken)
      } else {
        setPostWorkError(result.message || 'Failed to post work')
      }
    } catch (err: any) {
      console.error('[SecretAdminPanel] Post work failed:', err)
      setPostWorkError(err?.message || 'Server error while posting manuscript')
    } finally {
      setIsPostingWork(false)
    }
  }

  const resetPostChapterForm = () => {
    setTargetWorkForChapter(null)
    setPostChapterTitle('')
    setPostChapterSubtitle('')
    setPostChapterNumber(2)
    setPostChapterActNumber(1)
    setPostChapterGenre('Literary Fiction')
    setPostChapterCategory('Novels')
    setPostChapterMoodTag('')
    setPostChapterStatus('published')
    setPostChapterContent('')
    setPostChapterError(null)
  }

  const openPostChapterModal = (work: { id: string; title: string; chapterCount?: number; categoryName?: string }, authorName: string) => {
    resetPostChapterForm()
    const currentCount = work.chapterCount || 1
    const nextNumber = currentCount + 1

    // Determine estimated current act from existing chapter count (e.g., acts of ~5 chapters)
    const currentAct = Math.max(1, Math.ceil(nextNumber / 5))

    setTargetWorkForChapter({
      id: work.id,
      title: work.title,
      authorName,
      currentChaptersCount: currentCount,
      category: work.categoryName || 'Novels',
      genre: 'Literary Fiction',
    })
    setPostChapterNumber(nextNumber)
    setPostChapterActNumber(currentAct)
    setPostChapterTitle(`Part ${nextNumber}: `)
    setPostChapterCategory(work.categoryName || 'Novels')
    setShowPostChapterModal(true)
  }

  const handlePostChapter = async () => {
    setPostChapterError(null)

    if (!targetWorkForChapter) {
      setPostChapterError('No target manuscript selected')
      return
    }
    if (!postChapterTitle.trim()) {
      setPostChapterError('Part / Chapter title is required')
      return
    }
    if (!postChapterContent.trim()) {
      setPostChapterError('Part / Chapter manuscript text is required')
      return
    }
    if (!adminToken) {
      setPostChapterError('Administrative session expired. Please re-enter access key.')
      return
    }

    setIsPostingChapter(true)
    try {
      const result = await adminPostChapterServerFn({
        data: {
          adminToken,
          workId: targetWorkForChapter.id,
          workTitle: targetWorkForChapter.title,
          chapterNumber: postChapterNumber,
          actNumber: postChapterActNumber,
          title: postChapterTitle.trim(),
          subtitle: postChapterSubtitle.trim() || undefined,
          genre: postChapterGenre,
          category: postChapterCategory,
          moodTag: postChapterMoodTag.trim() || undefined,
          content: postChapterContent.trim(),
          status: postChapterStatus,
        },
      })

      if (result.success) {
        const words = postChapterContent.trim().split(/\s+/).filter(Boolean).length
        const readMinutes = Math.max(1, Math.ceil(words / 220))

        const newChapterObj: Chapter = {
          id: result.supabaseChapterId || result.chapterId || `admin-ch-${Date.now()}-${result.chapterNumber}`,
          number: result.chapterNumber,
          title: postChapterTitle.trim(),
          subtitle: postChapterSubtitle.trim() || undefined,
          actNumber: postChapterActNumber,
          actTitle: `Act ${postChapterActNumber === 1 ? 'I' : postChapterActNumber === 2 ? 'II' : postChapterActNumber === 3 ? 'III' : postChapterActNumber}`,
          status: postChapterStatus,
          wordCount: words,
          readTimeMinutes: readMinutes,
          publishedAt: new Date().toISOString(),
          content: postChapterContent.trim(),
        }

        // 1. Inject into client AppContext
        addAdminPostedChapter(targetWorkForChapter.id, newChapterObj)
        reloadWorksFromDb()

        // 2. Optimistically update local dashboardData user ledger
        if (dashboardData) {
          const updatedUsers = dashboardData.users.map((u) => {
            const hasWork = u.works.some((w) => w.id === targetWorkForChapter.id)
            if (!hasWork) return u

            return {
              ...u,
              works: u.works.map((w) => {
                if (w.id !== targetWorkForChapter.id) return w
                return {
                  ...w,
                  chapterCount: Math.max(w.chapterCount + 1, result.chapterNumber),
                  wordCount: w.wordCount + words,
                }
              }),
            }
          })

          setDashboardData({
            ...dashboardData,
            users: updatedUsers,
          })
        }

        showToast(result.message || `Part ${result.chapterNumber} published!`)
        setShowPostChapterModal(false)
        resetPostChapterForm()

        // Background sync
        fetchDashboard(adminToken)
      } else {
        setPostChapterError(result.message || 'Failed to publish part')
      }
    } catch (err: any) {
      console.error('[SecretAdminPanel] Post chapter failed:', err)
      setPostChapterError(err?.message || 'Server error while publishing part')
    } finally {
      setIsPostingChapter(false)
    }
  }

  // --- DIRECT MAILER MEMOS & HANDLERS (ANTI-SPAM HARDENED) ---
  const resolvedFromSender = useMemo(() => {
    switch (mailFromPreset) {
      case 'editorial':
        return 'HatchPen Editorial <editorial@hatchpen.com>'
      case 'team':
        return 'Syed from HatchPen <team@hatchpen.com>'
      case 'welcome':
        return 'HatchPen <welcome@hatchpen.com>'
      case 'notifications':
        return 'HatchPen Updates <notifications@hatchpen.com>'
      case 'custom': {
        const cleanPrefix = mailCustomPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'editorial'
        const cleanName = mailCustomName.trim() || 'HatchPen'
        return `${cleanName} <${cleanPrefix}@hatchpen.com>`
      }
      default:
        return 'HatchPen Editorial <editorial@hatchpen.com>'
    }
  }, [mailFromPreset, mailCustomPrefix, mailCustomName])

  // Real users with a valid email (excluding mock personas)
  const realUsersWithEmail = useMemo(() => {
    return unifiedUsers.filter((u) => !u.isMock && u.email && u.email.includes('@'))
  }, [unifiedUsers])

  const targetRecipientEmails = useMemo(() => {
    if (mailRecipientsMode === 'all') {
      return realUsersWithEmail.map((u) => u.email.trim().toLowerCase())
    }
    return mailCustomRecipients
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'))
  }, [mailRecipientsMode, mailCustomRecipients, realUsersWithEmail])

  // Anti-Spam Subject Analyzer
  const spamAnalysis = useMemo(() => {
    const warnings: string[] = []
    const sub = mailSubject.trim()
    if (!sub) return { score: 100, warnings: [], isClean: true }

    if (sub.length > 5 && sub === sub.toUpperCase() && /[A-Z]/.test(sub)) {
      warnings.push('Subject is in ALL CAPS — high spam trigger risk')
    }
    if (/[!]{2,}|\?{2,}|\${2,}/.test(sub)) {
      warnings.push('Avoid repetitive punctuation like "!!!" or "$$$"')
    }
    const triggerWords = ['free', 'guarantee', 'urgent', 'winner', 'click here', 'act now', 'limited time', 'buy now', 'cash', 'earn']
    const matchedWords = triggerWords.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(sub))
    if (matchedWords.length > 0) {
      warnings.push(`Contains spam-associated trigger words: ${matchedWords.join(', ')}`)
    }

    const score = Math.max(20, 100 - warnings.length * 25)
    return {
      score,
      warnings,
      isClean: warnings.length === 0,
    }
  }, [mailSubject])

  const handleSendTestEmailToMyself = async () => {
    if (!adminToken) return
    if (!mailSubject.trim()) {
      showToast('Please enter an email subject first')
      return
    }
    if (!mailBody.trim()) {
      showToast('Please enter message body first')
      return
    }

    const testEmail = 'zaidi.yam5@gmail.com'
    setIsSendingTestMail(true)
    try {
      const res = await adminSendEmailServerFn({
        data: {
          adminToken,
          recipients: [testEmail],
          subject: `[Test] ${mailSubject.trim()}`,
          headline: mailHeadline.trim() || undefined,
          message: mailBody.trim(),
          ctaText: mailCtaText.trim() || undefined,
          ctaUrl: mailCtaUrl.trim() || undefined,
          fromSender: resolvedFromSender,
          replyTo: mailReplyTo.trim() || 'welcome@hatchpen.com',
        },
      })
      if (res.success) {
        showToast(`Test email successfully delivered to ${testEmail}!`)
      }
    } catch (err: any) {
      showToast(`Failed to send test email: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsSendingTestMail(false)
    }
  }

  const handleSendDirectEmail = async () => {
    if (!adminToken) return
    if (targetRecipientEmails.length === 0) {
      showToast('Please provide at least one valid recipient email.')
      return
    }
    if (!mailSubject.trim()) {
      showToast('Please enter a subject line.')
      return
    }
    if (!mailBody.trim()) {
      showToast('Please write your message body.')
      return
    }

    if (mailRecipientsMode === 'all') {
      const confirmed = window.confirm(
        `Are you sure you want to broadcast this email to ALL ${targetRecipientEmails.length} registered HatchPen users?`
      )
      if (!confirmed) return
    }

    setIsSendingMail(true)
    setMailSendResult(null)
    try {
      const res = await adminSendEmailServerFn({
        data: {
          adminToken,
          recipients: targetRecipientEmails,
          subject: mailSubject.trim(),
          headline: mailHeadline.trim() || undefined,
          message: mailBody.trim(),
          ctaText: mailCtaText.trim() || undefined,
          ctaUrl: mailCtaUrl.trim() || undefined,
          fromSender: resolvedFromSender,
          replyTo: mailReplyTo.trim() || 'welcome@hatchpen.com',
        },
      })

      if (res.success) {
        setMailSendResult({
          success: true,
          message: `Dispatched to ${res.recipientsCount} recipient(s)! (Resend ID: ${res.id || 'ok'})`,
          count: res.recipientsCount,
          id: res.id,
        })
        showToast(`Email dispatched to ${res.recipientsCount} recipient(s)!`)
      }
    } catch (err: any) {
      setMailSendResult({
        success: false,
        message: err?.message || 'Error dispatching email via Resend',
      })
      showToast(`Failed to send email: ${err?.message || 'Error'}`)
    } finally {
      setIsSendingMail(false)
    }
  }

  // Loading Session Gate
  if (isVerifyingSession) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <RefreshCw className="h-8 w-8 text-[var(--ink-primary)] animate-spin" />
        <p className="font-mono text-xs text-[var(--ink-muted)]">
          Verifying administrative credentials...
        </p>
      </div>
    )
  }

  // UN-AUTHENTICATED: ADMIN LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 shadow-xl space-y-8">
          
          {/* Header Icon & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] shadow-xs">
              <Lock className="h-6 w-6 stroke-[1.75]" />
            </div>
            
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-rose-600 dark:text-rose-400 font-bold">
                Restricted Clearance
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
                Secret Admin Gateway
              </h1>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed max-w-xs mx-auto">
                Authentication is required to inspect user registries, manuscript archives, and execute database purge actions.
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                Administrative Access Key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
                <input
                  type={showPasskey ? 'text' : 'password'}
                  value={passkeyInput}
                  onChange={(e) => {
                    setPasskeyInput(e.target.value)
                    if (loginError) setLoginError(null)
                  }}
                  placeholder="Enter admin secret key"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-10 pr-10 py-2.5 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] focus:ring-1 focus:ring-[var(--ink-primary)] transition-all"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasskey(!showPasskey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPasskey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-mono text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying Key...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Authorize Admin Session</span>
                </>
              )}
            </button>
          </form>

          {/* Environmental Hint */}
          <div className="rounded-lg bg-[var(--bg-subtle)] p-3 border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--ink-muted)] text-center">
            Configured via <code className="text-[var(--ink-primary)]">ADMIN_SECRET_KEY</code>
          </div>

        </div>
      </div>
    )
  }

  // AUTHENTICATED: SECRET ADMIN DASHBOARD
  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      
      {/* ADMIN HERO HEADER */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-xs font-semibold uppercase tracking-wider border border-rose-500/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                Root Authority
              </span>
              <span className="text-[var(--ink-faint)] font-mono text-xs">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Authenticated Session
              </span>
              <span className="text-[var(--ink-faint)] font-mono text-xs">•</span>
              <span className="font-mono text-xs text-[var(--ink-muted)]">/secret-adminpanel</span>
            </div>
            
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink-primary)]">
              Folio Registry & Identity Control
            </h1>
            
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-2xl leading-relaxed">
              Administrative view of all registered accounts, manuscript archives, active reading progress, and reader interests across Clerk authentication and Supabase PostgreSQL.
            </p>
          </div>

          {/* Quick Admin Actions (Post Work, Add Part, Refresh & Logout) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openPostWorkModal()}
              title="Post a new manuscript as admin"
            >
              Post Manuscript
            </Button>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileText className="h-3.5 w-3.5" />}
              onClick={() => {
                // Find first available work or prompt
                const firstUserWithWork = unifiedUsers.find(u => u.works.length > 0)
                const firstWork = firstUserWithWork?.works[0]
                if (firstWork && firstUserWithWork) {
                  openPostChapterModal(firstWork, firstUserWithWork.displayName)
                } else if (allWorks.length > 0) {
                  const fallbackWork = allWorks[0]
                  openPostChapterModal({
                    id: fallbackWork.id,
                    title: fallbackWork.title,
                    chapterCount: fallbackWork.chaptersCount || fallbackWork.chapters.length,
                    categoryName: fallbackWork.category,
                  }, fallbackWork.author.name)
                } else {
                  showToast('Please create a manuscript first before adding parts')
                }
              }}
              title="Add a new chapter / part to an existing manuscript"
            >
              Add Part
            </Button>

            <button
              onClick={() => adminToken && fetchDashboard(adminToken, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-mono font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Re-query Clerk & Supabase"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-mono font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer shadow-2xs"
              title="Sign Out of Admin Panel"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* METRIC STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-[var(--border-subtle)]">
          <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)]">
              <Users className="h-3.5 w-3.5" />
              <span>Registered Users</span>
            </div>
            <p className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
              {unifiedUsers.length}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)]">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Authored Works</span>
            </div>
            <p className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
              {unifiedUsers.reduce((acc, u) => acc + u.works.length, 0)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)]">
              <Clock className="h-3.5 w-3.5" />
              <span>Active Reading Sessions</span>
            </div>
            <p className="font-serif text-2xl font-bold text-[var(--ink-primary)]">
              {unifiedUsers.reduce((acc, u) => acc + u.readingProgress.length, 0)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)]">
              <Database className="h-3.5 w-3.5" />
              <span>Dual Storage Status</span>
            </div>
            <p className="font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              Synced
            </p>
          </div>
        </div>

        {/* SECTION NAVIGATION TABS: WORKS DIRECTORY vs USER REGISTRY */}
        <div className="flex items-center gap-2 mt-6 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveAdminSection('works')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeAdminSection === 'works'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Works Directory (Table)</span>
            <span className="ml-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] text-[var(--ink-muted)]">
              {combinedAdminWorks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('users')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeAdminSection === 'users'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users & Accounts</span>
            <span className="ml-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] text-[var(--ink-muted)]">
              {unifiedUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('mailer')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer ${
              activeAdminSection === 'mailer'
                ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-bold'
                : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Direct Mailer</span>
            <span className="ml-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-mono font-semibold">
              Anti-Spam Verified
            </span>
          </button>
        </div>
      </section>

      {/* SECTION CONTENT: WORKS DIRECTORY TABLE vs USERS LIST */}
      {activeAdminSection === 'works' ? (
        <section className="space-y-4">
          {/* Controls: Search, Story Origin Filter, & Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={worksSearchQuery}
                  onChange={(e) => setWorksSearchQuery(e.target.value)}
                  placeholder="Search works by title, author name or handle..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-4 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors shadow-2xs"
                />
              </div>

              {/* Works Filter Buttons */}
              <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setWorksFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                    worksFilter === 'all'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  All Stories ({combinedAdminWorks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorksFilter('real')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                    worksFilter === 'real'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  Real-User ({combinedAdminWorks.filter((w) => !w.author.isMock).length})
                </button>
                <button
                  type="button"
                  onClick={() => setWorksFilter('mock')}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                    worksFilter === 'mock'
                      ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  Mock-Author ({combinedAdminWorks.filter((w) => w.author.isMock).length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--ink-muted)]">
                Showing {filteredAdminWorks.length} of {combinedAdminWorks.length} manuscripts
              </span>
              <button
                onClick={() => adminToken && fetchWorks(adminToken, worksPage)}
                disabled={loadingWorks}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer disabled:opacity-50"
                title="Reload works table"
              >
                <RefreshCw className={`h-3 w-3 ${loadingWorks ? 'animate-spin' : ''}`} />
                <span>Reload</span>
              </button>
            </div>
          </div>

          {/* Lightweight Works Table (50 per page: Title, Author, Posted, Views) */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Author</th>
                  <th className="py-3 px-4 font-semibold">Posted</th>
                  <th className="py-3 px-4 font-semibold text-right">No. of Views</th>
                  <th className="py-3 px-4 font-semibold text-right">Hearts</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-mono">
                {loadingWorks ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-[var(--ink-muted)] font-mono">
                      <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-[var(--ink-faint)]" />
                      Loading works (50 per page)...
                    </td>
                  </tr>
                ) : filteredAdminWorks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--ink-muted)] font-mono">
                      No works found in database.
                    </td>
                  </tr>
                ) : (
                  filteredAdminWorks.map((work) => (
                    <tr
                      key={work.id}
                      className="hover:bg-[var(--bg-subtle)]/60 transition-colors"
                    >
                      {/* 1. Title + Cover */}
                      <td className="py-3 px-4 font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openChangeCoverModal(work)}
                            className="relative h-11 w-8 shrink-0 rounded overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] transition-all group/cover cursor-pointer bg-[var(--bg-subtle)]"
                            title="Click to change story cover image"
                          >
                            {work.cover ? (
                              <img
                                src={work.cover}
                                alt=""
                                className="h-full w-full object-cover group-hover/cover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[var(--ink-muted)]">
                                <BookOpen className="h-3 w-3" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Camera className="h-3 w-3" />
                            </div>
                          </button>

                          <Link
                            to="/admin-work-editor/$workId"
                            params={{ workId: work.id }}
                            className="flex items-center gap-1.5 hover:underline text-[var(--ink-primary)] cursor-pointer"
                            title="Open Admin Manuscript Editor"
                          >
                            <span className="line-clamp-1">{work.title}</span>
                          </Link>
                        </div>
                      </td>

                      {/* 2. Author */}
                      <td className="py-3 px-4 text-[var(--ink-primary)]">
                        <div className="flex items-center gap-2">
                          <UnisexAvatar
                            src={work.author.avatar || undefined}
                            name={work.author.name}
                            size="sm"
                          />
                          <div>
                            <div className="font-medium text-[var(--ink-primary)] leading-tight flex items-center gap-1.5">
                              <span>{work.author.name}</span>
                              {work.author.isMock && (
                                <span className="inline-block px-1 rounded text-[9px] font-mono font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                                  Mock
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--ink-muted)] font-mono">
                              @{work.author.handle}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Posted */}
                      <td className="py-3 px-4 text-[var(--ink-muted)] text-[11px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-[var(--ink-faint)]" />
                          <span>
                            {work.postedAt ? new Date(work.postedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* 4. No. of Views (Interactive Trigger for Acts Breakdown Popup) */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openActsAnalyticsModal(work)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono font-semibold text-[var(--ink-primary)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] hover:bg-[var(--bg-surface)] hover:shadow-xs transition-all cursor-pointer group"
                          title="Click to view Acts & Chapters readership breakdown"
                        >
                          <Eye className="h-3.5 w-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-colors" />
                          <span>{work.viewCount.toLocaleString()}</span>
                          <span className="text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] font-sans">
                            acts ↗
                          </span>
                        </button>
                      </td>

                      {/* 4.5. Hearts (Interactive Trigger for Hearts Breakdown Popup) */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const matched = allWorks.find((w) => w.id === work.id) || {
                              ...work,
                              likeCount: work.likeCount || 0,
                              chapters: [],
                            }
                            setSelectedWorkForHearts(matched)
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono font-semibold text-[var(--ink-primary)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] hover:bg-[var(--bg-surface)] hover:shadow-xs transition-all cursor-pointer group"
                          title={`${formatHeartCount(work.likeCount, false)} hearts • Click to adjust`}
                        >
                          <Heart className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)] group-hover:scale-110 transition-transform" />
                          <span>{formatHeartCount(work.likeCount, true)}</span>
                          <span className="text-[10px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] font-sans">
                            adjust ↗
                          </span>
                        </button>
                      </td>

                      {/* 5. Status */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          size="sm"
                          className="font-mono text-[9px] uppercase tracking-wider"
                        >
                          {work.status}
                        </Badge>
                      </td>

                      {/* 6. Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openChangeCoverModal(work)}
                            className="inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-mono font-medium text-[var(--ink-primary)] hover:border-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                            title={`Change cover image for "${work.title}"`}
                          >
                            <Camera className="h-3 w-3 text-[var(--ink-muted)]" />
                            <span>Cover</span>
                          </button>

                          <Link
                            to="/admin-work-editor/$workId"
                            params={{ workId: work.id }}
                            className="inline-flex items-center gap-1 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 text-[11px] font-mono font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] no-underline cursor-pointer"
                            title="Edit manuscript fields, acts, and chapters"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Edit Folio</span>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Plus className="h-3 w-3" />}
                            onClick={() => {
                              openPostChapterModal(
                                {
                                  id: work.id,
                                  title: work.title,
                                },
                                work.author.name
                              )
                            }}
                            className="h-7 px-2 text-[10px]"
                            title={`Add chapter to ${work.title}`}
                          >
                            Add Part
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (50 per page) */}
          {worksTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <span className="text-[var(--ink-muted)]">
                Page {worksPage} of {worksTotalPages} ({worksTotalCount} total manuscripts)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={worksPage <= 1 || loadingWorks}
                  onClick={() => adminToken && fetchWorks(adminToken, worksPage - 1)}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={worksPage >= worksTotalPages || loadingWorks}
                  onClick={() => adminToken && fetchWorks(adminToken, worksPage + 1)}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      ) : activeAdminSection === 'users' ? (
        <>
          {/* FILTER & SEARCH CONTROLS */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, handle or Clerk ID..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-4 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            All ({unifiedUsers.length})
          </button>
          <button
            onClick={() => setActiveFilter('real')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'real'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            Real Users ({unifiedUsers.filter((u) => !u.isMock).length})
          </button>
          <button
            onClick={() => setActiveFilter('mock')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'mock'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            Mock Personas ({unifiedUsers.filter((u) => u.isMock).length})
          </button>
          <button
            onClick={() => setActiveFilter('authors')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'authors'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            Authors ({unifiedUsers.filter((u) => u.works.length > 0).length})
          </button>
          <button
            onClick={() => setActiveFilter('readers')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'readers'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            Active Readers ({unifiedUsers.filter((u) => u.readingProgress.length > 0).length})
          </button>
          <button
            onClick={() => setActiveFilter('saved')}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
              activeFilter === 'saved'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
            }`}
          >
            Library Holders ({unifiedUsers.filter((u) => u.savedWorks.length > 0).length})
          </button>
        </div>
      </section>

      {/* USER LIST CARDS */}
      <section className="space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <RefreshCw className="h-8 w-8 mx-auto text-[var(--ink-muted)] animate-spin" />
            <p className="font-serif text-lg text-[var(--ink-primary)]">
              Querying Clerk & Supabase Database Registries...
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <Users className="h-10 w-10 mx-auto text-[var(--ink-faint)]" />
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              No matching accounts found
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Try adjusting your query or filter parameters.
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const currentTab = activeTabByUser[user.clerkId] || 'works'

            return (
              <div
                key={user.clerkId}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-6 transition-all hover:border-[var(--border-strong)]"
              >
                {/* USER IDENTITY ROW */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
                  
                  {/* Left: Avatar & Meta */}
                  <div className="flex items-start sm:items-center gap-4">
                    <UnisexAvatar
                      src={user.avatarUrl}
                      name={user.displayName}
                      size="xl"
                      showStatus={true}
                      statusColor="bg-emerald-500"
                    />

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                          {user.displayName}
                        </h3>
                        <span className="font-mono text-xs text-[var(--ink-muted)]">
                          @{user.username}
                        </span>
                        <Badge variant="subtle" size="sm" className="font-mono text-[10px]">
                          {user.status}
                        </Badge>
                        {user.isMock ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Mock Persona
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                            Real User
                          </span>
                        )}
                        {user.clerkId === currentClerkUser?.id && (
                          <Badge variant="default" size="sm" className="font-mono text-[10px]">
                            You (Current Session)
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--ink-muted)]">
                        <span className="font-mono">{user.email}</span>
                        <span>•</span>
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                          <span>{user.clerkId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(user.clerkId)}
                            className="hover:text-[var(--ink-primary)] cursor-pointer ml-1"
                            title="Copy Clerk ID"
                          >
                            {copiedId === user.clerkId ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <span>•</span>
                        <span className="text-[11px] font-mono">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Mail className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setMailCustomRecipients(user.email)
                        setMailRecipientsMode('custom')
                        setActiveAdminSection('mailer')
                        showToast(`Direct mailer opened for ${user.displayName} (${user.email})`)
                      }}
                      title={user.email ? `Send direct email to ${user.email}` : 'No email address registered'}
                      disabled={!user.email || user.isMock}
                    >
                      Email User
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Sliders className="h-3.5 w-3.5" />}
                      onClick={() => openCustomizeUserModal(user)}
                      title={`Customize profile and hide/show options for ${user.displayName}`}
                    >
                      Customize Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<FileText className="h-3.5 w-3.5" />}
                      onClick={() => openPostWorkModal(user)}
                      title={`Post manuscript under ${user.displayName}`}
                    >
                      Post Work as User
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPurgeTarget(user)
                        setPurgeConfirmText('')
                        setPurgeResult(null)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:border-rose-400 transition-all cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Purge User Data</span>
                    </button>
                  </div>
                </div>

                {/* USER DETAILS TABS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]">
                    <button
                      onClick={() =>
                        setActiveTabByUser((prev) => ({ ...prev, [user.clerkId]: 'works' }))
                      }
                      className={`pb-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
                        currentTab === 'works'
                          ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                          : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Authored Works ({user.works.length})
                    </button>
                    <button
                      onClick={() =>
                        setActiveTabByUser((prev) => ({ ...prev, [user.clerkId]: 'reading' }))
                      }
                      className={`pb-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
                        currentTab === 'reading'
                          ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                          : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Currently Reading ({user.readingProgress.length})
                    </button>
                    <button
                      onClick={() =>
                        setActiveTabByUser((prev) => ({ ...prev, [user.clerkId]: 'interests' }))
                      }
                      className={`pb-2 text-xs font-mono transition-colors border-b-2 cursor-pointer ${
                        currentTab === 'interests'
                          ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                          : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Interests & Library ({user.interests.length})
                    </button>
                  </div>

                  {/* TAB 1: AUTHORED WORKS */}
                  {currentTab === 'works' && (
                    <div>
                      {user.works.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {user.works.map((work) => (
                            <div
                              key={work.id}
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase">
                                  {work.categoryName || 'Manuscript'}
                                </span>
                                <Badge variant="outline" size="sm" className="font-mono text-[9px]">
                                  {work.status}
                                </Badge>
                              </div>

                              <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] line-clamp-1">
                                {work.title}
                              </h4>

                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center gap-2.5 text-[11px] font-mono text-[var(--ink-muted)]">
                                  <span>{work.chapterCount} Parts</span>
                                  <span>•</span>
                                  <span>{work.wordCount.toLocaleString()} w</span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5" title={`${formatHeartCount(work.likeCount, false)} Hearts`}>
                                    <Heart className="h-2.5 w-2.5 fill-current text-[var(--ink-primary)]" />
                                    <span>{formatHeartCount(work.likeCount, true)}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matched = allWorks.find((w) => w.id === work.id) || {
                                        ...work,
                                        likeCount: work.likeCount || 0,
                                        chapters: [],
                                      }
                                      setSelectedWorkForHearts(matched)
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-mono font-medium text-[var(--ink-primary)] hover:border-[var(--ink-primary)] cursor-pointer"
                                    title={`Adjust hearts for "${work.title}"`}
                                  >
                                    <Heart className="h-2.5 w-2.5 fill-current text-[var(--ink-primary)]" />
                                    <span>Hearts</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      openChangeCoverModal({
                                        id: work.id,
                                        title: work.title,
                                        cover: (work as any).coverImage || (work as any).cover || null,
                                        author: {
                                          id: user.id,
                                          name: user.displayName,
                                          handle: user.username,
                                          isMock: Boolean(user.isMock),
                                        },
                                        postedAt: (work as any).publishedAt || new Date().toISOString(),
                                        viewCount: (work as any).views || 0,
                                        likeCount: (work as any).likeCount || 0,
                                        status: work.status || 'Ongoing',
                                      })
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-mono font-medium text-[var(--ink-primary)] hover:border-[var(--ink-primary)] cursor-pointer"
                                    title={`Change cover image for "${work.title}"`}
                                  >
                                    <Camera className="h-2.5 w-2.5 text-[var(--ink-muted)]" />
                                    <span>Cover</span>
                                  </button>

                                  <Link
                                    to="/admin-work-editor/$workId"
                                    params={{ workId: work.id }}
                                    className="inline-flex items-center gap-1 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 text-[10px] font-mono font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] no-underline cursor-pointer"
                                    title={`Edit "${work.title}" metadata, acts, and chapters`}
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span>Edit</span>
                                  </Link>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="h-3 w-3" />}
                                    onClick={() => openPostChapterModal(work, user.displayName)}
                                    className="h-7 px-2 text-[10px]"
                                    title={`Add a new Part / Chapter to "${work.title}"`}
                                  >
                                    Add Part
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-[var(--bg-subtle)] text-center text-xs text-[var(--ink-muted)] font-mono">
                          No manuscripts authored or published by this user yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CURRENTLY READING */}
                  {currentTab === 'reading' && (
                    <div>
                      {user.readingProgress.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {user.readingProgress.map((item) => (
                            <div
                              key={item.workId}
                              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate">
                                    {item.workTitle}
                                  </h4>
                                  <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                                    Chapter {item.chapterNumber}: {item.chapterTitle}
                                  </p>
                                </div>
                                <span className="font-mono text-xs font-bold text-[var(--ink-primary)]">
                                  {item.progressPercent}%
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="h-1.5 w-full rounded-full bg-[var(--bg-canvas)] overflow-hidden">
                                <div
                                  className="h-full bg-[var(--ink-primary)] rounded-full transition-all"
                                  style={{ width: `${item.progressPercent}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink-faint)]">
                                <span>Active session</span>
                                <span>Last read: {item.lastReadAt}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-[var(--bg-subtle)] text-center text-xs text-[var(--ink-muted)] font-mono">
                          No active reading progress records logged for this reader.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: INTERESTS & LIBRARY */}
                  {currentTab === 'interests' && (
                    <div className="space-y-4">
                      {/* Topic Tags */}
                      <div className="space-y-1.5">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                          Literary Preferences & Genres:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {user.interests.map((interest) => (
                            <span
                              key={interest}
                              className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--ink-secondary)]"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Saved Manuscripts in Library */}
                      <div className="space-y-2 pt-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
                          Saved in Personal Library ({user.savedWorks.length}):
                        </span>
                        {user.savedWorks.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {user.savedWorks.map((sw) => (
                              <div
                                key={sw.workId}
                                className="flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)]"
                              >
                                <Bookmark className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                                <span>{sw.workTitle}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-mono text-[var(--ink-faint)]">
                            User has not bookmarked any manuscripts to their reading library yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )
          })
        )}
      </section>
        </>
      ) : (
        /* DIRECT MAILER SECTION (ANTI-SPAM HARDENED) */
        <section className="space-y-8">
          {/* DELIVERABILITY TRUST & ANTI-SPAM STATUS HEADER */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Zero-Spam Hardening Active
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                    Domain: <strong className="font-semibold">hatchpen.com</strong> (Verified SPF, DKIM & DMARC)
                  </span>
                </div>
                <h2 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  High-Deliverability Editorial Mailer
                </h2>
                <p className="text-xs text-[var(--ink-muted)] max-w-2xl leading-relaxed">
                  All outgoing emails are signed cryptographically with DKIM and verified with SPF on <code className="font-mono text-emerald-700 dark:text-emerald-300">hatchpen.com</code>. Every dispatch auto-generates dual multipart MIME (HTML + Clean Plain-Text) and includes CAN-SPAM compliant footers so messages land directly in Primary Inboxes rather than Spam or Promotions.
                </p>
              </div>

              {/* 4 Invariant Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                <div className="rounded-lg bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/40 p-2.5 text-center">
                  <div className="text-[10px] font-mono text-[var(--ink-muted)]">DKIM & SPF</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Aligned</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/40 p-2.5 text-center">
                  <div className="text-[10px] font-mono text-[var(--ink-muted)]">MIME Mode</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">HTML + Text</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/40 p-2.5 text-center">
                  <div className="text-[10px] font-mono text-[var(--ink-muted)]">CAN-SPAM</div>
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Compliant</div>
                </div>
                <div className="rounded-lg bg-[var(--bg-surface)] border border-emerald-200 dark:border-emerald-900/40 p-2.5 text-center">
                  <div className="text-[10px] font-mono text-[var(--ink-muted)]">Active Users</div>
                  <div className="text-xs font-semibold text-[var(--ink-primary)]">{realUsersWithEmail.length} reachable</div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN 2-COLUMN MAILER INTERFACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: COMPOSER (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--ink-primary)]" />
                    <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                      Compose Dispatch
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-[var(--ink-muted)]">
                    Target: {targetRecipientEmails.length} recipient{targetRecipientEmails.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* 1. SENDER IDENTITY SELECTOR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
                      <AtSign className="h-3.5 w-3.5 text-amber-500" />
                      Sender Identity (From Address)
                    </label>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      Domain locked to @hatchpen.com for SPF
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: 'editorial',
                        title: 'HatchPen Editorial',
                        email: 'editorial@hatchpen.com',
                        desc: 'Best for book recommendations & community news',
                      },
                      {
                        id: 'team',
                        title: 'Syed from HatchPen',
                        email: 'team@hatchpen.com',
                        desc: 'Personal founder note (highest inbox & open rate)',
                      },
                      {
                        id: 'welcome',
                        title: 'HatchPen',
                        email: 'welcome@hatchpen.com',
                        desc: 'Official platform identity & updates',
                      },
                      {
                        id: 'notifications',
                        title: 'HatchPen Updates',
                        email: 'notifications@hatchpen.com',
                        desc: 'System maintenance & operational notices',
                      },
                    ].map((preset) => (
                      <div
                        key={preset.id}
                        onClick={() => setMailFromPreset(preset.id as any)}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          mailFromPreset === preset.id
                            ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/40'
                            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--ink-primary)]">
                            {preset.title}
                          </span>
                          {mailFromPreset === preset.id && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--ink-muted)] mt-0.5">
                          {preset.email}
                        </div>
                        <div className="text-[10px] text-[var(--ink-faint)] mt-1">
                          {preset.desc}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Sender Prefix Option */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setMailFromPreset(mailFromPreset === 'custom' ? 'editorial' : 'custom')}
                      className="text-xs font-mono text-amber-600 dark:text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>{mailFromPreset === 'custom' ? '← Back to Presets' : '+ Use Custom Sender Prefix on @hatchpen.com'}</span>
                    </button>

                    {mailFromPreset === 'custom' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10">
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-[var(--ink-muted)]">Display Name</label>
                          <input
                            type="text"
                            value={mailCustomName}
                            onChange={(e) => setMailCustomName(e.target.value)}
                            placeholder="e.g. HatchPen Curators"
                            className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-mono text-[var(--ink-muted)]">Email Prefix (@hatchpen.com)</label>
                          <div className="flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
                            <input
                              type="text"
                              value={mailCustomPrefix}
                              onChange={(e) => setMailCustomPrefix(e.target.value)}
                              placeholder="curators"
                              className="w-full px-2.5 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none"
                            />
                            <span className="px-2 text-xs font-mono text-[var(--ink-muted)] bg-[var(--bg-subtle)] border-l border-[var(--border-subtle)]">
                              @hatchpen.com
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply-To Config */}
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-mono text-[var(--ink-muted)]">
                      Reply-To Address (User replies go here):
                    </label>
                    <input
                      type="email"
                      value={mailReplyTo}
                      onChange={(e) => setMailReplyTo(e.target.value)}
                      placeholder="zaidi.yam5@gmail.com"
                      className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] w-full sm:w-64"
                    />
                  </div>
                </div>

                {/* 2. RECIPIENTS MODE */}
                <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold text-[var(--ink-primary)]">
                      Audience & Recipients
                    </label>
                    <div className="inline-flex rounded-md p-0.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                      <button
                        type="button"
                        onClick={() => setMailRecipientsMode('custom')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                          mailRecipientsMode === 'custom'
                            ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        Specific Email(s)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMailRecipientsMode('all')}
                        className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                          mailRecipientsMode === 'all'
                            ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-2xs'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        All Registered Users ({realUsersWithEmail.length})
                      </button>
                    </div>
                  </div>

                  {mailRecipientsMode === 'custom' ? (
                    <div className="space-y-1.5">
                      <textarea
                        rows={2}
                        value={mailCustomRecipients}
                        onChange={(e) => setMailCustomRecipients(e.target.value)}
                        placeholder="Enter email addresses separated by commas or newlines (e.g. reader@example.com, author@example.com)..."
                        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                        <span>{targetRecipientEmails.length} valid destination address{targetRecipientEmails.length === 1 ? '' : 'es'} parsed</span>
                        <button
                          type="button"
                          onClick={() => setMailCustomRecipients('zaidi.yam5@gmail.com')}
                          className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          Fill with my email (zaidi.yam5@gmail.com)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Broadcast Mode Selected
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        This email will be delivered individually to all <strong>{realUsersWithEmail.length}</strong> real registered accounts in Clerk/Supabase. Mock personas are automatically filtered out.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. EMAIL CONTENT COMPOSER */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                  {/* Subject Line + Spam Detector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold text-[var(--ink-primary)]">
                        Subject Line
                      </label>
                      <div className="flex items-center gap-2">
                        {spamAnalysis.warnings.length === 0 && mailSubject.trim() && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            Spam Risk: Minimal
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                          {mailSubject.length} chars
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      placeholder="e.g. New Serialized Releases This Week on HatchPen"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                    />

                    {/* Spam Warnings */}
                    {spamAnalysis.warnings.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {spamAnalysis.warnings.map((warn, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Headline (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-semibold text-[var(--ink-primary)] flex items-center justify-between">
                      <span>Editorial Headline (Optional)</span>
                      <span className="text-[10px] font-mono text-[var(--ink-muted)]">Renders as serif title</span>
                    </label>
                    <input
                      type="text"
                      value={mailHeadline}
                      onChange={(e) => setMailHeadline(e.target.value)}
                      placeholder="e.g. Three New Novels Have Arrived in the Atelier"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                    />
                  </div>

                  {/* Message Body */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold text-[var(--ink-primary)]">
                        Message Body
                      </label>
                      <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                        Separate paragraphs with blank lines
                      </span>
                    </div>

                    <textarea
                      rows={6}
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      placeholder="Write your email message here. Blank lines between sentences will automatically turn into elegant editorial paragraphs..."
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] leading-relaxed"
                    />
                  </div>

                  {/* Optional Call to Action Button */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                    <label className="text-xs font-mono font-semibold text-[var(--ink-primary)]">
                      Call to Action Button (Optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={mailCtaText}
                        onChange={(e) => setMailCtaText(e.target.value)}
                        placeholder="Button Text (e.g. Read Chapter One)"
                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none"
                      />
                      <input
                        type="url"
                        value={mailCtaUrl}
                        onChange={(e) => setMailCtaUrl(e.target.value)}
                        placeholder="Button URL (e.g. https://hatchpen.com/discover)"
                        className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. ACTIONS & STATUS */}
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  {mailSendResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                        mailSendResult.success
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                          : 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {mailSendResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <span>{mailSendResult.message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={isSendingTestMail || !mailSubject.trim() || !mailBody.trim()}
                      onClick={handleSendTestEmailToMyself}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-xs font-mono font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 transition-all cursor-pointer shadow-2xs"
                      title="Send a real test email to zaidi.yam5@gmail.com to check inbox placement"
                    >
                      <Inbox className={`h-3.5 w-3.5 ${isSendingTestMail ? 'animate-spin' : ''}`} />
                      <span>{isSendingTestMail ? 'Dispatching Test...' : 'Send 1-Click Test to Myself'}</span>
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMailSubject('')
                          setMailHeadline('')
                          setMailBody('')
                          setMailCtaText('')
                          setMailCtaUrl('')
                          setMailSendResult(null)
                        }}
                        className="px-3 py-2 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                      >
                        Reset Form
                      </button>

                      <Button
                        variant="primary"
                        size="md"
                        leftIcon={<Send className={`h-3.5 w-3.5 ${isSendingMail ? 'animate-spin' : ''}`} />}
                        disabled={isSendingMail || targetRecipientEmails.length === 0 || !mailSubject.trim() || !mailBody.trim()}
                        onClick={handleSendDirectEmail}
                        title={`Send dispatch to ${targetRecipientEmails.length} recipient(s)`}
                      >
                        {isSendingMail
                          ? 'Dispatching via Resend...'
                          : `Send Email (${targetRecipientEmails.length})`}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN: LIVE DESKTOP/MOBILE PREVIEW (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[var(--ink-primary)]" />
                    <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                      Recipient Inbox Preview
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Live WYSIWYG
                  </span>
                </div>

                {/* Email Envelope Meta */}
                <div className="rounded-lg bg-[var(--bg-subtle)] p-3 border border-[var(--border-subtle)] space-y-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ink-muted)] w-14 shrink-0">From:</span>
                    <span className="text-[var(--ink-primary)] font-semibold truncate">{resolvedFromSender}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ink-muted)] w-14 shrink-0">Reply-To:</span>
                    <span className="text-[var(--ink-muted)] truncate">{mailReplyTo || 'welcome@hatchpen.com'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ink-muted)] w-14 shrink-0">To:</span>
                    <span className="text-[var(--ink-muted)] truncate">
                      {targetRecipientEmails.length > 0
                        ? targetRecipientEmails.slice(0, 2).join(', ') + (targetRecipientEmails.length > 2 ? ` (+${targetRecipientEmails.length - 2} more)` : '')
                        : 'recipient@domain.com'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[var(--ink-muted)] w-14 shrink-0">Subject:</span>
                    <span className="text-[var(--ink-primary)] font-semibold truncate">
                      {mailSubject.trim() || '(No subject entered yet)'}
                    </span>
                  </div>
                </div>

                {/* Visual Email Card Canvas */}
                <div className="rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 overflow-hidden shadow-md">
                  {/* Brand Banner */}
                  <div className="bg-[#121214] p-5 text-white border-b-2 border-amber-600 flex items-center justify-between">
                    <div>
                      <div className="font-serif text-lg font-bold tracking-tight text-white">HatchPen</div>
                      <div className="text-[10px] text-neutral-400">A Quieter Place for Bolder Stories</div>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-300 bg-white/10 px-2 py-0.5 rounded">
                      Editorial Note
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-4">
                    {mailHeadline && (
                      <h3 className="font-serif text-base font-semibold text-neutral-900 leading-snug">
                        {mailHeadline}
                      </h3>
                    )}

                    <div className="text-xs text-neutral-700 space-y-2.5 leading-relaxed font-sans">
                      {mailBody.trim() ? (
                        mailBody.split(/\n{2,}/).map((p, idx) => (
                          <p key={idx} className="m-0">
                            {p}
                          </p>
                        ))
                      ) : (
                        <p className="text-neutral-400 italic">
                          Write your email content on the left to see the live rendering here...
                        </p>
                      )}
                    </div>

                    {/* CTA Button Mock */}
                    {mailCtaText && (
                      <div className="pt-2">
                        <span className="inline-block bg-[#111111] text-white text-xs font-semibold px-4 py-2 rounded-lg">
                          {mailCtaText} &rarr;
                        </span>
                      </div>
                    )}

                    {/* Sign-off */}
                    <div className="pt-4 border-t border-neutral-100 text-xs text-neutral-600">
                      <div>Warm regards,</div>
                      <div className="font-serif italic font-semibold text-neutral-800">
                        {resolvedFromSender.includes('<') ? resolvedFromSender.split('<')[0].trim() : 'The HatchPen Team'}
                      </div>
                    </div>
                  </div>

                  {/* Anti-Spam Footer */}
                  <div className="bg-[#fafaf8] p-4 border-t border-neutral-200 text-[9px] text-neutral-500 font-sans space-y-1">
                    <div className="font-semibold text-neutral-600">HatchPen Publishing &bull; Serialized Indie Literature</div>
                    <div>You received this communication as a registered member on hatchpen.com.</div>
                    <div className="text-neutral-400">SPF Pass &bull; DKIM Signed &bull; DMARC Verified &bull; hatchpen.com</div>
                  </div>
                </div>

                {/* Tip callout */}
                <div className="text-[11px] font-mono text-[var(--ink-muted)] flex items-start gap-1.5 p-2 rounded bg-[var(--bg-subtle)]">
                  <Info className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    Pro-tip: Test sending to yourself first using the <strong>1-Click Test</strong> button to preview directly in your Gmail app.
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* ACTS & CHAPTERS READERSHIP BREAKDOWN POPUP MODAL (ANIMATED) */}
      <AnimatePresence>
        {selectedWorkForActs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with fade-in animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedWorkForActs(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Card with spring zoom & slide animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              className="relative w-full max-w-xl max-h-[88vh] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl z-10 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40">
                <div className="space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--ink-muted)]">
                      Readership Breakdown
                    </span>
                    <Badge variant="outline" size="sm" className="font-mono text-[10px]">
                      {selectedWorkForActs.status}
                    </Badge>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)] line-clamp-1">
                    {selectedWorkForActs.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
                    <span>By {selectedWorkForActs.author.name}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink-primary)]">
                      <Eye className="h-3.5 w-3.5" />
                      {selectedWorkForActs.viewCount.toLocaleString()} Total Manuscript Views
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedWorkForActs(null)}
                  className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)] transition-all cursor-pointer"
                  title="Close popup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body: Acts List with View Counts */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                {loadingActsAnalytics ? (
                  <div className="py-12 text-center space-y-3 font-mono text-xs text-[var(--ink-muted)]">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin text-[var(--ink-faint)]" />
                    <span>Loading Acts view counts...</span>
                  </div>
                ) : actsAnalyticsData.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-[var(--ink-muted)]">
                    No acts configured for this manuscript yet.
                  </div>
                ) : (
                  actsAnalyticsData.map((act, actIdx) => (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: actIdx * 0.06 }}
                      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden transition-all hover:border-[var(--border-strong)]"
                    >
                      {/* Act Header Row with Total Act Views */}
                      <div className="flex items-center justify-between p-4 bg-[var(--bg-subtle)]/70 border-b border-[var(--border-subtle)]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--ink-primary)] uppercase tracking-wider">
                              {act.title}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                              ({act.chaptersCount} chapters)
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-[11px] font-serif text-[var(--ink-muted)] line-clamp-1 italic">
                              {act.description}
                            </p>
                          )}
                        </div>

                        {/* Act View Count Pill */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-xs font-bold text-[var(--ink-primary)] shadow-2xs">
                          <Eye className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                          <span>{act.viewCount.toLocaleString()} views</span>
                        </div>
                      </div>

                      {/* Chapters within Act */}
                      <div className="divide-y divide-[var(--border-subtle)] p-1">
                        {act.chapters.map((ch) => (
                          <div
                            key={ch.id}
                            className="flex items-center justify-between px-3 py-2 text-xs font-mono hover:bg-[var(--bg-subtle)]/50 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[var(--ink-faint)] w-5 text-right">
                                #{ch.chapterNumber}
                              </span>
                              <span className="font-medium text-[var(--ink-primary)] line-clamp-1">
                                {ch.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-right">
                              <span className="text-[11px] font-semibold text-[var(--ink-secondary)]">
                                {ch.viewCount.toLocaleString()} views
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--ink-muted)] text-[11px]">
                  {actsAnalyticsData.length} Acts • Click backdrop to close
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWorkForActs(null)}
                  className="text-xs"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PERMANENT PURGE CONFIRMATION MODAL */}
      {purgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-rose-300 dark:border-rose-900 bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <ShieldAlert className="h-6 w-6 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">
                  Irreversible User Purge
                </h3>
                <p className="text-xs text-[var(--ink-muted)]">
                  Complete dual destruction across Clerk Authentication and Supabase PostgreSQL.
                </p>
              </div>
            </div>

            {/* Target Account Summary Box */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Target User:</span>
                <span className="font-bold text-[var(--ink-primary)]">{purgeTarget.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Email:</span>
                <span className="text-[var(--ink-primary)]">{purgeTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Clerk ID:</span>
                <span className="text-[var(--ink-primary)]">{purgeTarget.clerkId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Associated Works:</span>
                <span className="text-[var(--ink-primary)]">{purgeTarget.works.length} manuscripts</span>
              </div>
            </div>

            {/* Warning Checklist */}
            <div className="space-y-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/30 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This will execute the following purge cascade:
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
                <li>Permanently delete Clerk user login, credentials, and OAuth connections.</li>
                <li>Cascade delete Supabase profile and user preferences.</li>
                <li>Flush all authored manuscripts, chapters, and drafts from works table.</li>
                <li>Remove all active reading progress, bookmarks, and library saves.</li>
                <li>Erase follower links, social comments, and notifications.</li>
              </ul>
            </div>

            {/* Safety Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[var(--ink-secondary)]">
                Type <span className="font-bold text-rose-600 dark:text-rose-400">PURGE</span> to confirm destruction:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="Type PURGE in capital letters"
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600"
                disabled={isPurging}
                autoFocus
              />
            </div>

            {/* Status Feedback Message */}
            {purgeResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono ${
                  purgeResult.success
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {purgeResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPurgeTarget(null)
                  setPurgeConfirmText('')
                  setPurgeResult(null)
                }}
                disabled={isPurging}
                className="px-4 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={executePurge}
                disabled={purgeConfirmText.trim().toUpperCase() !== 'PURGE' || isPurging}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Purging from Clerk & Supabase...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Execute Purge</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOMIZE USER PROFILE & VISIBILITY MODAL */}
      {showCustomizeUserModal && customizeTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <UnisexAvatar
                  src={customizeAvatarUrl || customizeTargetUser.avatarUrl}
                  name={customizeDisplayName || customizeTargetUser.displayName}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                      Customize Profile & Visibility
                    </h3>
                    {customizeTargetUser.isMock ? (
                      <Badge variant="subtle" size="sm">Mock Persona</Badge>
                    ) : (
                      <Badge variant="outline" size="sm">User Account</Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Configure persona details, public visibility, and stats display for @{customizeTargetUser.username}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomizeUserModal(false)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {customizeUserError && (
              <div className="p-3.5 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{customizeUserError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserCustomization} className="space-y-6">
              {/* SECTION 1: PROFILE DETAILS */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-primary)]">
                  1. Profile Details & Persona
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Display Name *</label>
                    <input
                      type="text"
                      required
                      value={customizeDisplayName}
                      onChange={(e) => setCustomizeDisplayName(e.target.value)}
                      placeholder="e.g. Elena Vasquez"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Handle (@username) *</label>
                    <input
                      type="text"
                      required
                      value={customizeUsername}
                      onChange={(e) => setCustomizeUsername(e.target.value)}
                      placeholder="e.g. elenavasquez"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Avatar URL</label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {PRESET_MOCK_AVATARS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCustomizeAvatarUrl(preset.url)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                            customizeAvatarUrl === preset.url
                              ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                          }`}
                        >
                          <img src={preset.url} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="url"
                      value={customizeAvatarUrl}
                      onChange={(e) => setCustomizeAvatarUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Biography</label>
                    <textarea
                      rows={2}
                      value={customizeBio}
                      onChange={(e) => setCustomizeBio(e.target.value)}
                      placeholder="Brief author biography or reader journey..."
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Location</label>
                    <input
                      type="text"
                      value={customizeLocation}
                      onChange={(e) => setCustomizeLocation(e.target.value)}
                      placeholder="e.g. Prague, Czechia"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: HIDE / SHOW CONTROLS (UNIFIED SINGLE CARD) */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-primary)]">
                  2. Visibility & Hide/Show Settings (Single Card)
                </h4>

                <div className="p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-4">
                  {/* Part A: Profile Visibility */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[var(--ink-primary)]">
                          Profile Visibility
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            customizeIsPublic
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {customizeIsPublic ? 'Public Profile' : 'Private (Default)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)]">
                        {customizeIsPublic
                          ? 'Signed-in HatchPen members can view this profile, bio, and chosen public statistics.'
                          : 'Profile is private. Other users see "This Profile is Private".'}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={customizeIsPublic}
                        onClick={() => setCustomizeIsPublic(!customizeIsPublic)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          customizeIsPublic
                            ? 'bg-[var(--ink-primary)]'
                            : 'bg-[var(--border-strong)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            customizeIsPublic ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Part B: Works Catalog Visibility */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[var(--ink-primary)]">
                          Works & Manuscripts Catalog
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            customizeWorksVisibility === 'public'
                              ? 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]'
                              : 'bg-neutral-200 dark:bg-neutral-800 text-[var(--ink-muted)]'
                          }`}
                        >
                          {customizeWorksVisibility === 'public' ? 'Public' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-muted)]">
                        {customizeWorksVisibility === 'public'
                          ? 'Authored works are displayed in the catalog on this profile.'
                          : 'Authored works are hidden from visitors on this profile.'}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={customizeWorksVisibility === 'public'}
                        onClick={() =>
                          setCustomizeWorksVisibility(
                            customizeWorksVisibility === 'public' ? 'hidden' : 'public'
                          )
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          customizeWorksVisibility === 'public'
                            ? 'bg-[var(--ink-primary)]'
                            : 'bg-[var(--border-strong)]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            customizeWorksVisibility === 'public' ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Part C: Identity Visibility (DP, Name, Username) */}
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--ink-primary)]">
                        Profile Identity & Details
                      </p>
                      <p className="text-[10px] text-[var(--ink-muted)]">
                        Control public visibility of the display photo, full name, and handle badge.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Show/Hide DP / Avatar */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Display Picture (DP)
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            {customizeShowAvatar ? 'Custom photo visible' : 'Silhouette placeholder'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowAvatar}
                          onChange={(e) => setCustomizeShowAvatar(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Name */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Full Name
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            {customizeShowName ? 'Display name shown' : 'Hidden to public'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowName}
                          onChange={(e) => setCustomizeShowName(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Username */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Username (@handle)
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            {customizeShowUsername ? '@handle badge visible' : 'Hidden on profile'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowUsername}
                          onChange={(e) => setCustomizeShowUsername(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Part D: Granular Statistics (Hide / Show) */}
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[var(--ink-primary)]">
                        Public Profile Statistics
                      </p>
                      <p className="text-[10px] text-[var(--ink-muted)]">
                        Select which metrics appear publicly on this profile.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Lifetime Reads */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Lifetime Reads
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            Show reads counter
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowReads}
                          onChange={(e) => setCustomizeShowReads(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>

                      {/* Followers */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Followers Count
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            Show subscribers count
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowFollowers}
                          onChange={(e) => setCustomizeShowFollowers(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>

                      {/* Works Count */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Works Count
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            Show cataloged count
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowWorksCount}
                          onChange={(e) => setCustomizeShowWorksCount(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>

                      {/* Reading History */}
                      <label className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] cursor-pointer hover:border-[var(--border-strong)] transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-[var(--ink-primary)] block">
                            Reading History
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)] block">
                            Show reading activity
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={customizeShowReadingHistory}
                          onChange={(e) => setCustomizeShowReadingHistory(e.target.checked)}
                          className="rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-[var(--ink-primary)] h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCustomizeUserModal(false)}
                  className="px-4 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserCustomization}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] px-5 py-2 text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSavingUserCustomization && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Profile & Privacy</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* POST WORK MODAL */}
      {showPostWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)]">
                  <FileText className="h-5 w-5 stroke-[1.75]" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">
                      Post Manuscript as Admin
                    </h3>
                    <Badge variant="default" size="sm">Admin Level</Badge>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Publish an editorial work under a mock persona with full dossier or assign to an existing user name.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowPostWorkModal(false); resetPostWorkForm() }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Author Identity Mode Switcher */}
            <div className="space-y-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Author Identity Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPostWorkAuthorMode('mock')}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-mono font-semibold transition-all cursor-pointer ${
                    postWorkAuthorMode === 'mock'
                      ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Mock Fake Profile
                </button>
                <button
                  type="button"
                  onClick={() => setPostWorkAuthorMode('existing')}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-mono font-semibold transition-all cursor-pointer ${
                    postWorkAuthorMode === 'existing'
                      ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Use Name of Existing User
                </button>
              </div>
            </div>

            {/* Mock Author Fields */}
            {postWorkAuthorMode === 'mock' && (
              <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                      Mock Persona Details
                    </span>
                    <Badge variant="outline" size="sm">Simulated Author</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Sparkles className="h-3 w-3" />}
                    onClick={generateRandomPersona}
                  >
                    Random Identity
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Display Name *</label>
                    <input
                      type="text"
                      value={mockAuthorName}
                      onChange={(e) => {
                        const val = e.target.value
                        setMockAuthorName(val)
                        if (!mockAuthorHandle || mockAuthorHandle === mockAuthorName.toLowerCase().replace(/[^a-z0-9_-]/g, '')) {
                          setMockAuthorHandle(val.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                        }
                      }}
                      placeholder="e.g. Elena Vasquez"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Handle (@username) *</label>
                    <input
                      type="text"
                      value={mockAuthorHandle}
                      onChange={(e) => setMockAuthorHandle(e.target.value)}
                      placeholder="e.g. elenavasquez"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Avatar Presets or Custom URL</label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {PRESET_MOCK_AVATARS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMockAuthorAvatar(preset.url)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                            mockAuthorAvatar === preset.url
                              ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                          }`}
                        >
                          <img src={preset.url} alt="" className="h-4 w-4 rounded-full object-cover" />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={mockAuthorAvatar}
                      onChange={(e) => setMockAuthorAvatar(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Location</label>
                    <input
                      type="text"
                      value={mockAuthorLocation}
                      onChange={(e) => setMockAuthorLocation(e.target.value)}
                      placeholder="e.g. Buenos Aires, Argentina"
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Author Bio / Dossier</label>
                    <textarea
                      value={mockAuthorBio}
                      onChange={(e) => setMockAuthorBio(e.target.value)}
                      placeholder="Author biographical monograph or literary credentials..."
                      rows={2}
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Mock Author Dossier Preview Card */}
                {(mockAuthorName || mockAuthorHandle) && (
                  <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center gap-3.5 shadow-2xs">
                    <img
                      src={mockAuthorAvatar || PRESET_MOCK_AVATARS[0].url}
                      alt={mockAuthorName}
                      className="h-10 w-10 rounded-full object-cover border border-[var(--border-strong)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">
                          {mockAuthorName || 'Unnamed Author'}
                        </p>
                        <CheckCircle2 className="h-3 w-3 text-[var(--ink-primary)]" />
                      </div>
                      <p className="text-[10px] font-mono text-[var(--ink-muted)] truncate">
                        @{mockAuthorHandle || 'handle'} {mockAuthorLocation ? `• ${mockAuthorLocation}` : ''}
                      </p>
                      {mockAuthorBio && (
                        <p className="text-[11px] text-[var(--ink-secondary)] line-clamp-1 italic mt-0.5">
                          "{mockAuthorBio}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Existing User Selector */}
            {postWorkAuthorMode === 'existing' && (
              <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                    Existing User Assignment
                  </span>
                  <Badge variant="outline" size="sm">Type Name or Pick from List</Badge>
                </div>

                {/* Option to type existing name directly */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">
                    Existing User / Author Name *
                  </label>
                  <input
                    type="text"
                    value={postWorkExistingName}
                    onChange={(e) => {
                      const val = e.target.value
                      setPostWorkExistingName(val)
                      // Try auto-matching from selectableIdentities
                      const matched = selectableIdentities.find(
                        (i) => i.displayName.toLowerCase() === val.trim().toLowerCase()
                      )
                      if (matched) {
                        setPostWorkExistingUserId(matched.clerkId || matched.id)
                        setPostWorkExistingProfileId(matched.profileId || '')
                        setPostWorkExistingHandle(matched.username)
                      }
                    }}
                    placeholder="Type an existing user or author name (e.g. Elena Rostova)..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                  <p className="text-[10px] font-mono text-[var(--ink-faint)]">
                    You can type the exact name of an existing user or select them from the registry below.
                  </p>
                </div>

                {/* Search filter for registry */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">
                    Search Registered Users & Platform Authors
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <input
                      type="text"
                      value={postWorkUserSearch}
                      onChange={(e) => setPostWorkUserSearch(e.target.value)}
                      placeholder="Search by name, handle, or email..."
                      className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-9 pr-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                    />
                  </div>
                </div>

                {/* Scrollable list */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-[var(--border-subtle)] rounded-lg p-1.5 bg-[var(--bg-canvas)]">
                  {selectableIdentities
                    .filter((u) => {
                      const q = postWorkUserSearch.toLowerCase().trim()
                      return (
                        !q ||
                        u.displayName.toLowerCase().includes(q) ||
                        u.username.toLowerCase().includes(q) ||
                        (u.bio && u.bio.toLowerCase().includes(q))
                      )
                    })
                    .map((u) => {
                      const isSelected =
                        (postWorkExistingUserId && (postWorkExistingUserId === u.clerkId || postWorkExistingUserId === u.id)) ||
                        (postWorkExistingName.trim().toLowerCase() === u.displayName.toLowerCase())

                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setPostWorkExistingUserId(u.clerkId || u.id)
                            setPostWorkExistingProfileId(u.profileId || '')
                            setPostWorkExistingName(u.displayName)
                            setPostWorkExistingHandle(u.username)
                          }}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--bg-subtle)] border border-[var(--border-strong)] shadow-xs'
                              : 'hover:bg-[var(--bg-subtle)]/50 border border-transparent'
                          }`}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover shrink-0 border border-[var(--border-subtle)]" />
                          ) : (
                            <UnisexAvatar name={u.displayName} size="sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-[var(--ink-primary)] truncate">{u.displayName}</p>
                              <Badge variant={u.source === 'registered' ? 'default' : 'outline'} size="sm">
                                {u.source === 'registered' ? 'Registered' : 'Author'}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-mono text-[var(--ink-muted)] truncate">
                              @{u.username} • {u.manuscriptCount} works
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-[var(--ink-primary)] shrink-0" />
                          )}
                        </button>
                      )
                    })}
                </div>

                {/* Selected Identity Confirmation Pill */}
                {postWorkExistingName && (
                  <div className="p-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--ink-primary)]" />
                      <span className="font-mono text-[11px] text-[var(--ink-primary)] font-semibold">
                        Assigned Author: <span className="underline">{postWorkExistingName}</span> {postWorkExistingHandle ? `(@${postWorkExistingHandle})` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPostWorkExistingName('')
                        setPostWorkExistingHandle('')
                        setPostWorkExistingUserId('')
                        setPostWorkExistingProfileId('')
                      }}
                      className="text-[10px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-[var(--border-subtle)]" />

            {/* Manuscript Metadata Details */}
            <div className="space-y-3.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Manuscript Metadata
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Work Title *</label>
                  <input
                    type="text"
                    value={postWorkTitle}
                    onChange={(e) => setPostWorkTitle(e.target.value)}
                    placeholder="e.g. The Cartographer's Silence"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={postWorkSubtitle}
                    onChange={(e) => setPostWorkSubtitle(e.target.value)}
                    placeholder="e.g. A serialized monograph on cartographic espionage"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Cover Image Presets or Custom URL</label>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {PRESET_WORK_COVERS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPostWorkCover(preset.url)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono transition-all cursor-pointer ${
                          postWorkCover === preset.url
                            ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <img src={preset.url} alt="" className="h-4 w-4 rounded object-cover" />
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={postWorkCover}
                    onChange={(e) => setPostWorkCover(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Category *</label>
                  <select
                    value={postWorkCategory}
                    onChange={(e) => setPostWorkCategory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Genre *</label>
                  <select
                    value={postWorkGenre}
                    onChange={(e) => setPostWorkGenre(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    {genres.map((g) => (
                      <option key={g.slug} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Status</label>
                  <select
                    value={postWorkStatus}
                    onChange={(e) => setPostWorkStatus(e.target.value as 'Ongoing' | 'Completed')}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Visibility</label>
                  <select
                    value={postWorkVisibility}
                    onChange={(e) => setPostWorkVisibility(e.target.value as 'Public' | 'Unlisted')}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    <option value="Public">Public (Cataloged)</option>
                    <option value="Unlisted">Unlisted (Private Direct URL)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Tags (optional, comma-separated)</label>
                  <input
                    type="text"
                    value={postWorkTags}
                    onChange={(e) => setPostWorkTags(e.target.value)}
                    placeholder="e.g. Isolation, Memory, Urban, Slow‑Burn, Dark"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Synopsis *</label>
                <textarea
                  value={postWorkSynopsis}
                  onChange={(e) => setPostWorkSynopsis(e.target.value)}
                  placeholder="A compelling editorial synopsis of the literary work..."
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-none leading-relaxed"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Extended Monograph Description</label>
                <textarea
                  value={postWorkFullDesc}
                  onChange={(e) => setPostWorkFullDesc(e.target.value)}
                  placeholder="Extended critical notes or full description (optional)..."
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border-subtle)]" />

            {/* Initial Chapter */}
            <div className="space-y-3.5">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Initial Installment / Chapter
              </span>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Chapter Title *</label>
                <input
                  type="text"
                  value={postWorkChapterTitle}
                  onChange={(e) => setPostWorkChapterTitle(e.target.value)}
                  placeholder="e.g. Chapter One: The Crossing"
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[var(--ink-secondary)]">Chapter Content *</label>
                <textarea
                  value={postWorkChapterContent}
                  onChange={(e) => setPostWorkChapterContent(e.target.value)}
                  placeholder="Draft or paste the complete chapter text here..."
                  rows={7}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-y leading-relaxed"
                />
                {postWorkChapterContent.trim() && (
                  <p className="text-[10px] font-mono text-[var(--ink-faint)] text-right">
                    {postWorkChapterContent.trim().split(/\s+/).filter(Boolean).length} words •{' '}
                    {Math.max(1, Math.ceil(postWorkChapterContent.trim().split(/\s+/).filter(Boolean).length / 220))} min read
                  </p>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {postWorkError && (
              <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-rose-300 dark:border-rose-900 text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{postWorkError}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowPostWorkModal(false); resetPostWorkForm() }}
                disabled={isPostingWork}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isPostingWork}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={handlePostWork}
              >
                Publish Manuscript
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* POST PART / CHAPTER MODAL */}
      {showPostChapterModal && targetWorkForChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-2xl space-y-6">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)]">
                  <FileText className="h-5 w-5 stroke-[1.75]" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)]">
                      Publish Story Part
                    </h3>
                    <Badge variant="default" size="sm">Part {postChapterNumber}</Badge>
                  </div>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Adding a serialized chapter to <span className="font-medium text-[var(--ink-primary)]">"{targetWorkForChapter.title}"</span> by {targetWorkForChapter.authorName}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowPostChapterModal(false); resetPostChapterForm() }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Work Target Selector (Allows switching target manuscript if needed) */}
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-2">
              <label className="block text-[11px] font-mono text-[var(--ink-muted)] uppercase tracking-wider">
                Target Manuscript
              </label>
              <select
                value={targetWorkForChapter.id}
                onChange={(e) => {
                  const selectedId = e.target.value
                  // Find in unifiedUsers
                  for (const u of unifiedUsers) {
                    const found = u.works.find(w => w.id === selectedId)
                    if (found) {
                      openPostChapterModal(found, u.displayName)
                      return
                    }
                  }
                  // Find in allWorks
                  const fallback = allWorks.find(w => w.id === selectedId)
                  if (fallback) {
                    openPostChapterModal({
                      id: fallback.id,
                      title: fallback.title,
                      chapterCount: fallback.chaptersCount || fallback.chapters.length,
                      categoryName: fallback.category,
                    }, fallback.author.name)
                  }
                }}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
              >
                {/* List all available works */}
                {unifiedUsers.flatMap(u => u.works.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.title} (by {u.displayName} • {w.chapterCount} existing parts)
                  </option>
                )))}
                {allWorks.filter(aw => !unifiedUsers.some(u => u.works.some(uw => uw.id === aw.id))).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.title} (by {w.author.name} • {w.chaptersCount} existing parts)
                  </option>
                ))}
              </select>
            </div>

            {/* Part Metadata Grid */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Target Act
                  </label>
                  <select
                    value={postChapterActNumber}
                    onChange={(e) => setPostChapterActNumber(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  >
                    <option value={1}>Act I</option>
                    <option value={2}>Act II</option>
                    <option value={3}>Act III</option>
                    <option value={4}>Act IV</option>
                    <option value={5}>Act V</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Chapter / Part #
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={postChapterNumber}
                    onChange={(e) => setPostChapterNumber(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Chapter Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={postChapterTitle}
                    onChange={(e) => setPostChapterTitle(e.target.value)}
                    placeholder={`e.g. Part ${postChapterNumber}: The Crossing`}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Part Subtitle / Header (Optional)
                  </label>
                  <input
                    type="text"
                    value={postChapterSubtitle}
                    onChange={(e) => setPostChapterSubtitle(e.target.value)}
                    placeholder="e.g. A transmission from the perimeter"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Mood / Arc Tag
                  </label>
                  <input
                    type="text"
                    value={postChapterMoodTag}
                    onChange={(e) => setPostChapterMoodTag(e.target.value)}
                    placeholder="e.g. Climax, Revelation, Nocturne"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
              </div>

              {/* Part Specific Category, Genre & Publishing Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Part Category
                  </label>
                  <select
                    value={postChapterCategory}
                    onChange={(e) => setPostChapterCategory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Part Genre
                  </label>
                  <select
                    value={postChapterGenre}
                    onChange={(e) => setPostChapterGenre(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  >
                    {genres.map((g) => (
                      <option key={g.slug} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Status
                  </label>
                  <select
                    value={postChapterStatus}
                    onChange={(e) => setPostChapterStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  >
                    <option value="published">Published (Instant Live)</option>
                    <option value="draft">Draft (Private)</option>
                  </select>
                </div>
              </div>

              {/* Part Manuscript Text */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-mono text-[var(--ink-muted)]">
                    Part Content / Manuscript Text <span className="text-rose-500">*</span>
                  </label>
                  {postChapterContent.trim() && (
                    <span className="text-[10px] font-mono text-[var(--ink-faint)]">
                      {postChapterContent.trim().split(/\s+/).filter(Boolean).length} words •{' '}
                      {Math.max(1, Math.ceil(postChapterContent.trim().split(/\s+/).filter(Boolean).length / 220))} min read
                    </span>
                  )}
                </div>
                <textarea
                  value={postChapterContent}
                  onChange={(e) => setPostChapterContent(e.target.value)}
                  placeholder="Draft or paste the full manuscript content for this part..."
                  rows={8}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors resize-y leading-relaxed"
                />
              </div>
            </div>

            {/* Error Banner */}
            {postChapterError && (
              <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-rose-300 dark:border-rose-900 text-xs font-mono text-rose-600 dark:text-rose-400 flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{postChapterError}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowPostChapterModal(false); resetPostChapterForm() }}
                disabled={isPostingChapter}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isPostingChapter}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={handlePostChapter}
              >
                Publish Part {postChapterNumber}
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* CHANGE STORY COVER MODAL */}
      {coverTargetWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-2xl space-y-5">

            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-strong)]">
                  <Camera className="h-5 w-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
                    Change Story Cover
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)] line-clamp-1">
                    "{coverTargetWork.title}" by {coverTargetWork.author.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCoverTargetWork(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex gap-4 items-center p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="relative h-28 w-20 shrink-0 rounded-lg overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-canvas)] shadow-xs">
                  {newCoverUrl.trim() ? (
                    <img
                      src={newCoverUrl.trim()}
                      alt="Cover Preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[var(--ink-muted)]">
                      <BookOpen className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-mono font-medium text-[var(--ink-muted)] uppercase tracking-wider">
                    Live Preview
                  </span>
                  <div className="font-serif text-sm font-bold text-[var(--ink-primary)] line-clamp-1">
                    {coverTargetWork.title}
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">
                    Recommended ratio: 2:3 portrait (600×900 px)
                  </div>
                </div>
              </div>

              {/* Cloudinary Upload */}
              <CloudinaryImageUpload
                label="Upload New Book Cover (Cloudinary CDN)"
                currentImageUrl={newCoverUrl}
                onImageUploaded={(url) => setNewCoverUrl(url)}
                onImageRemoved={() => setNewCoverUrl('')}
                onUploading={setIsCoverUploading}
                folder="covers"
                recommendedDimensions="600 × 900 px"
                aspectRatioHint="Portrait (2:3)"
                maxSizeMb={10}
              />

              {/* Direct URL input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  Or Paste External Image URL
                </label>
                <input
                  type="text"
                  value={newCoverUrl}
                  onChange={(e) => setNewCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-mono text-[var(--ink-muted)]">Quick Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_WORK_COVERS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNewCoverUrl(preset.url)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] text-[11px] font-mono text-[var(--ink-secondary)] cursor-pointer"
                    >
                      <img src={preset.url} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCoverTargetWork(null)}
                disabled={isSavingCover}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSavingCover || isCoverUploading}
                leftIcon={<Check className="h-3.5 w-3.5" />}
                onClick={handleSaveCover}
                disabled={!newCoverUrl.trim() || isCoverUploading}
              >
                Save Cover Image
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* HEARTS BREAKDOWN MODAL */}
      {selectedWorkForHearts && (
        <HeartsBreakdownModal
          isOpen={Boolean(selectedWorkForHearts)}
          onClose={() => setSelectedWorkForHearts(null)}
          work={selectedWorkForHearts}
          adminToken={adminToken}
          allowAdminAdjust={true}
          onHeartsUpdated={(newTotal) => {
            if (adminToken) {
              fetchDashboard(adminToken, true)
            }
            reloadWorksFromDb()
            showToast(`Story hearts updated to ${newTotal.toLocaleString()}!`)
          }}
        />
      )}

    </div>
  )
}
