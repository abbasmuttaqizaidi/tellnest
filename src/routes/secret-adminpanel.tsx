import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import {
  adminLoginServerFn,
  verifyAdminSessionServerFn,
  getAdminUsersServerFn,
  purgeUserServerFn,
  type AdminUser,
  type AdminDashboardData
} from '../server/admin'
import { Badge } from '../design-system'
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
  ShieldCheck
} from 'lucide-react'

export const Route = createFileRoute('/secret-adminpanel')({
  component: SecretAdminPanelPage,
})

const ADMIN_TOKEN_KEY = 'tellnest_admin_session_token'

function SecretAdminPanelPage() {
  const { user: currentClerkUser } = useUser()
  const { allWorks, writerWorks, savedWorkIds, readingProgress: localReadingProgress, showToast } = useApp()

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

  // Dashboard Data State
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'authors' | 'readers' | 'saved'>('all')
  const [activeTabByUser, setActiveTabByUser] = useState<Record<string, 'works' | 'reading' | 'interests'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Purge Modal State
  const [purgeTarget, setPurgeTarget] = useState<AdminUser | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; message: string } | null>(null)

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
  const fetchDashboard = async (token: string, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await getAdminUsersServerFn({ data: { adminToken: token } })
      setDashboardData(data)
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

          {/* Quick Admin Actions (Refresh & Logout) */}
          <div className="flex items-center gap-3 shrink-0">
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
      </section>

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
                    <div className="relative">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-14 w-14 rounded-full object-cover border border-[var(--border-strong)] grayscale"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full border border-[var(--border-strong)] bg-[var(--bg-subtle)] flex items-center justify-center font-mono font-bold text-sm text-[var(--ink-primary)]">
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" title="Account Active" />
                    </div>

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

                  {/* Right: Purge Button */}
                  <div className="flex items-center gap-3 shrink-0">
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

                              <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--ink-muted)] pt-1 border-t border-[var(--border-subtle)]">
                                <span>{work.chapterCount} Chapters</span>
                                <span>•</span>
                                <span>{work.wordCount.toLocaleString()} words</span>
                                <span>•</span>
                                <span>{work.viewCount} reads</span>
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

    </div>
  )
}
