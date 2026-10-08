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
  type AdminUser,
  type AdminDashboardData,
  type AdminWorkRow,
  type WorkActAnalytics,
} from '../server/admin'
import { Badge, Button, Modal } from '../design-system'
import { UnisexAvatar } from '../components/UnisexAvatar'
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
} from 'lucide-react'

import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/secret-adminpanel')({
  head: () =>
    generateMeta({
      title: 'Restricted Administration',
      noindex: true,
    }),
  component: SecretAdminPanelPage,
})

const ADMIN_TOKEN_KEY = 'tellnest_admin_session_token'

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
  const { allWorks, writerWorks, savedWorkIds, readingProgress: localReadingProgress, showToast, addAdminPostedWork, addAdminPostedChapter, reloadWorksFromDb, categories, genres } = useApp()

  // Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY)
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
  const [activeAdminSection, setActiveAdminSection] = useState<'works' | 'users'>('works')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'authors' | 'readers' | 'saved'>('all')
  const [activeTabByUser, setActiveTabByUser] = useState<Record<string, 'works' | 'reading' | 'interests'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Works Table (50 per page, lightweight fetch)
  const [adminWorks, setAdminWorks] = useState<AdminWorkRow[]>([])
  const [worksTotalCount, setWorksTotalCount] = useState<number>(0)
  const [worksPage, setWorksPage] = useState<number>(1)
  const [worksTotalPages, setWorksTotalPages] = useState<number>(1)
  const [loadingWorks, setLoadingWorks] = useState(false)
  const [worksSearchQuery, setWorksSearchQuery] = useState('')

  // Acts Views Analytics Popup State
  const [selectedWorkForActs, setSelectedWorkForActs] = useState<AdminWorkRow | null>(null)
  const [actsAnalyticsData, setActsAnalyticsData] = useState<WorkActAnalytics[]>([])
  const [loadingActsAnalytics, setLoadingActsAnalytics] = useState(false)

  // Purge Modal State
  const [purgeTarget, setPurgeTarget] = useState<AdminUser | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; message: string } | null>(null)

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
        author: {
          id: w.author.id,
          name: w.author.name,
          handle: w.author.handle,
          avatar: w.author.avatar,
        },
        postedAt: w.createdAt,
        viewCount: parsedViews,
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
    const q = worksSearchQuery.toLowerCase().trim()
    if (!q) return combinedAdminWorks
    return combinedAdminWorks.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.author.name.toLowerCase().includes(q) ||
        w.author.handle.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q)
    )
  }, [combinedAdminWorks, worksSearchQuery])

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
        </div>
      </section>

      {/* SECTION CONTENT: WORKS DIRECTORY TABLE vs USERS LIST */}
      {activeAdminSection === 'works' ? (
        <section className="space-y-4">
          {/* Controls: Search & Refresh */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-muted)]" />
              <input
                type="text"
                value={worksSearchQuery}
                onChange={(e) => setWorksSearchQuery(e.target.value)}
                placeholder="Search works by title, author name or handle..."
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] pl-10 pr-4 py-2 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors shadow-2xs"
              />
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
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs font-mono">
                {loadingWorks ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[var(--ink-muted)] font-mono">
                      <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin text-[var(--ink-faint)]" />
                      Loading works (50 per page)...
                    </td>
                  </tr>
                ) : filteredAdminWorks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[var(--ink-muted)] font-mono">
                      No works found in database.
                    </td>
                  </tr>
                ) : (
                  filteredAdminWorks.map((work) => (
                    <tr
                      key={work.id}
                      className="hover:bg-[var(--bg-subtle)]/60 transition-colors"
                    >
                      {/* 1. Title */}
                      <td className="py-3 px-4 font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        <Link
                          to="/admin-work-editor/$workId"
                          params={{ workId: work.id }}
                          className="flex items-center gap-2 hover:underline text-[var(--ink-primary)] cursor-pointer"
                          title="Open Admin Manuscript Editor"
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                          <span className="line-clamp-1">{work.title}</span>
                        </Link>
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
                            <div className="font-medium text-[var(--ink-primary)] leading-tight">
                              {work.author.name}
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
      ) : (
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
            All Users ({unifiedUsers.length})
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

                  {/* Right: Post Work & Purge Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
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
                                </div>
                                <div className="flex items-center gap-1.5">
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

    </div>
  )
}
