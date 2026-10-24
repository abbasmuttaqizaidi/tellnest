import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useUser, useClerk } from '@clerk/react'
import {
  ArrowLeft,
  User,
  BookOpen,
  Sparkles,
  Sliders,
  Bell,
  Shield,
  Home,
  Compass,
  Bookmark,
  PenLine,
  LogOut,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  X,
  ChevronRight,
  Eye,
  Lock,
  Type,
  Camera,
  Pencil,
  Globe,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { UnisexAvatar } from '../components/UnisexAvatar'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { RouteHeader } from '../components/RouteHeader'
import { HatchpenLoader } from '../components/TellnestLoader'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy'
import { uploadToCloudinary } from '../lib/cloudinary'
import { uploadImage, optimizeAvatarImage, convertFileToOptimizedDataUrl, STORAGE_BUCKETS } from '../lib/supabase/storage'
import {
  getSettingsDataServerFn,
  updateAccountProfileServerFn,
  verifyUsernameAvailabilityServerFn,
  updateReadingPreferencesServerFn,
  updateRecommendationsSettingsServerFn,
  resetRecommendationTasteServerFn,
  updateReadingExperienceServerFn,
  updateNotificationPreferencesServerFn,
  updatePrivacySettingsServerFn,
  unblockUserServerFn,
  clearReadingHistoryServerFn,
  deleteUserAccountServerFn,
  type SettingsDataPayload,
  type SettingsAccountProfile,
  type SettingsReadingPreferences,
  type SettingsRecommendations,
  type SettingsReadingExperience,
  type SettingsNotificationPreferences,
  type BlockedUserItem,
} from '../server/settings'

function normalizeGenderSelection(val: string | null | undefined): string {
  if (!val) return ''
  const s = val.trim().toLowerCase().replace(/[\s\-_]/g, '')
  if (s === 'female') return 'Female'
  if (s === 'male') return 'Male'
  if (s === 'nonbinary') return 'Non-binary'
  if (s === 'genderqueer') return 'Genderqueer'
  if (s === 'prefernottsay' || s === 'iprefernottosay' || s.includes('prefernot')) return ''
  if (s === 'other') return 'Other'
  return val
}

function normalizePronounsSelection(val: string | null | undefined): string {
  if (!val) return ''
  const s = val.trim().toLowerCase().replace(/\s+/g, ' ')
  if (s === 'she / her' || s === 'she/her' || s === 'she_her') return 'She / Her'
  if (s === 'he / him' || s === 'he/him' || s === 'he_him') return 'He / Him'
  if (s === 'they / them' || s === 'they/them' || s === 'they_them') return 'They / Them'
  if (s.includes('any') || s === 'any_all') return 'Any / All Pronouns'
  if (s.includes('prefer') || s === 'prefer_not_say') return ''
  return 'Other'
}

export interface SettingsSearch {
  section?: string
  preview?: string
}

const DEMO_SETTINGS_DATA: SettingsDataPayload = {
  profile: {
    id: 'demo_author_id',
    clerkUserId: 'demo_user',
    username: 'eleanor_vance',
    displayName: 'Eleanor Vance',
    bio: 'Author of quiet dread, gothic fiction, and serialized chamber mysteries.',
    avatarPath: null,
    websiteUrl: 'https://eleanorvance.com',
    location: 'Hill House, VT',
    pronouns: 'She / Her',
    gender: 'Female',
    interestedInWriting: true,
    onboardingCompleted: true,
    isPublic: true,
    accountStatus: 'active',
    createdAt: '2025-04-12T00:00:00Z',
  },
  readingPreferences: {
    favoriteGenres: ['fantasy', 'horror', 'literary-fiction', 'mystery'],
    preferredCategories: ['serialized-novels', 'short-stories'],
    preferredLanguage: 'en',
    adultContentEnabled: false,
  },
  recommendations: {
    personalized: true,
    discoveryPreference: 'balanced',
  },
  readingExperience: {
    theme: 'light',
    fontFamily: 'serif',
    fontSize: 'base',
    lineHeight: 'normal',
    readingMode: 'standard',
    inlineMarginalia: true,
    continuousScroll: false,
    floatingToc: true,
  },
  notifications: {
    inAppNotifications: true,
    newChapterAlerts: true,
    followedAuthorStories: true,
    commentReplies: true,
    emailDigest: true,
    securityAnnouncements: true,
  },
  privacy: {
    isPublic: false,
    worksVisibility: 'public',
    showAvatar: true,
    showName: true,
    showUsername: true,
    showReads: false,
    showFollowers: false,
    showWorksCount: false,
    showReadingHistory: false,
    adultContentEnabled: false,
    blockedUsers: [],
    readingHistoryCount: 28,
  },
  taxonomy: {
    categories: [
      { slug: 'serialized-novels', name: 'Serialized Novels' },
      { slug: 'short-stories', name: 'Short Stories' },
      { slug: 'poetry', name: 'Poetry & Verse' },
      { slug: 'essays', name: 'Essays & Longform' },
    ],
    genres: [
      { slug: 'fantasy', name: 'Fantasy' },
      { slug: 'sci-fi', name: 'Science Fiction' },
      { slug: 'mystery', name: 'Mystery & Thriller' },
      { slug: 'horror', name: 'Horror' },
      { slug: 'literary-fiction', name: 'Literary Fiction' },
      { slug: 'poetry', name: 'Poetry' },
    ],
  },
}

export const Route = createFileRoute('/settings')({
  staleTime: 5 * 60 * 1000, // 5 minutes cache lifetime (instant 0ms navigation on revisit)
  gcTime: 10 * 60 * 1000,    // Retain cached settings for 10 minutes
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    const res: SettingsSearch = {}
    if (typeof search.section === 'string' && search.section.trim()) {
      res.section = search.section.trim()
    }
    if (search.preview) {
      res.preview = String(search.preview)
    }
    return res
  },
  loaderDeps: ({ search }) => ({ preview: search?.preview }),
  loader: async ({ deps }) => {
    try {
      const data = await getSettingsDataServerFn()
      return { data, error: null }
    } catch (fnErr: any) {
      if (deps?.preview === 'true') {
        return { data: DEMO_SETTINGS_DATA, error: null }
      }
      return { data: null, error: fnErr?.message || 'Failed to load settings.' }
    }
  },
  component: SettingsPageRoute,
})

function SettingsPageRoute() {
  const { preview } = Route.useSearch()
  const isPreviewMode =
    preview === 'true' ||
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'true')

  if (isPreviewMode) {
    return <SettingsView isPreview={true} />
  }

  return (
    <ProtectedRoute
      title="HatchPen Settings"
      description="Sign in to manage your account, preferences, recommendations, and reading experience."
      featureBadge="Account & Preferences"
    >
      <SettingsView />
    </ProtectedRoute>
  )
}

// -----------------------------------------------------------------------------
// SECTION DEFINITIONS
// -----------------------------------------------------------------------------
type SectionId =
  | 'account'
  | 'reading-preferences'
  | 'recommendations'
  | 'reading-experience'
  | 'notifications'
  | 'privacy'

interface SectionMeta {
  id: SectionId
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'account',
    title: 'Account & Profile',
    description: 'Personal details, pen name, handle, bio, and login methods',
    icon: User,
  },
  {
    id: 'reading-preferences',
    title: 'Reading Preferences',
    description: 'Favourite genres, story formats, languages, and mature content',
    icon: BookOpen,
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    description: 'Algorithmic personalization, discovery focus, and taste profile',
    icon: Sparkles,
  },
  {
    id: 'reading-experience',
    title: 'Reading Experience',
    description: 'Reader typography, themes, font size, and layout settings',
    icon: Sliders,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'In-app alerts, chapter releases, author updates, and email',
    icon: Bell,
  },
  {
    id: 'privacy',
    title: 'Privacy & Safety',
    description: 'Profile visibility, blocked accounts, reading history, and data',
    icon: Shield,
  },
]

// -----------------------------------------------------------------------------
// MAIN SETTINGS VIEW (Responsive: Mobile-First & Desktop Parity)
// -----------------------------------------------------------------------------
function SettingsView({ isPreview = false }: { isPreview?: boolean }) {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()

  const handleSignOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('hatchpen_has_session')
        localStorage.removeItem('hatchpen_cached_bookmarks')
        document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch {}
    }
    try {
      await signOut()
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [signOut])
  const navigate = useNavigate()
  const router = useRouter()
  const loaderData = Route.useLoaderData() as { data: SettingsDataPayload | null; error: string | null } | undefined
  const initialData: SettingsDataPayload | null = isPreview ? DEMO_SETTINGS_DATA : (loaderData?.data || null)
  const { section: rawSection, preview } = Route.useSearch()
  const {
    updateReaderSettings,
    siteTheme,
    setSiteTheme,
    showToast,
    userDisplayName,
    setUserDisplayName,
    setUserProfileUsername,
    customAvatarUrl,
    setCustomAvatarUrl,
  } = useApp()

  // Routing state: has the user picked a specific section?
  // On desktop, defaults to 'account' if unset.
  // On mobile, if unset, renders the 6-category navigation menu.
  const isSectionSelected = Boolean(rawSection && SECTIONS.some((s) => s.id === rawSection))
  const activeSection: SectionId = isSectionSelected ? (rawSection as SectionId) : 'account'

  const setActiveSection = useCallback(
    (id: SectionId) => {
      navigate({
        to: '/settings',
        search: { section: id, preview },
      })
    },
    [navigate, preview]
  )

  const handleBackToCategories = useCallback(() => {
    navigate({
      to: '/settings',
      search: { preview },
    })
  }, [navigate, preview])

  // Remote data state (pre-populated synchronously from Route loader cache if available)
  const [data, setData] = useState<SettingsDataPayload | null>(initialData)
  const [loading, setLoading] = useState(!initialData && !loaderData?.error)
  const [loadError, setLoadError] = useState<string | null>(loaderData?.error || null)

  // Local form states
  const [accountForm, setAccountForm] = useState<Partial<SettingsAccountProfile>>(() =>
    initialData
      ? {
          displayName: initialData.profile.displayName,
          username: initialData.profile.username,
          bio: initialData.profile.bio || '',
          avatarPath: initialData.profile.avatarPath ?? customAvatarUrl ?? '',
          websiteUrl: initialData.profile.websiteUrl || '',
          location: initialData.profile.location || '',
          pronouns: initialData.profile.pronouns || '',
          gender: initialData.profile.gender || '',
          interestedInWriting: Boolean(initialData.profile.interestedInWriting),
        }
      : {}
  )
  const [readingPrefsForm, setReadingPrefsForm] = useState<SettingsReadingPreferences>(() =>
    initialData?.readingPreferences || {
      favoriteGenres: [],
      preferredCategories: [],
      preferredLanguage: 'en',
      adultContentEnabled: false,
    }
  )
  const [recsForm, setRecsForm] = useState<SettingsRecommendations>(() =>
    initialData?.recommendations || {
      personalized: true,
      discoveryPreference: 'balanced',
    }
  )
  const [readingExpForm, setReadingExpForm] = useState<SettingsReadingExperience>(() =>
    initialData?.readingExperience || {
      theme: 'light',
      fontFamily: 'serif',
      fontSize: 'base',
      lineHeight: 'normal',
      readingMode: 'standard',
      inlineMarginalia: true,
      continuousScroll: false,
      floatingToc: true,
    }
  )
  const [notifsForm, setNotifsForm] = useState<SettingsNotificationPreferences>(() =>
    initialData?.notifications || {
      inAppNotifications: true,
      newChapterAlerts: true,
      followedAuthorStories: true,
      commentReplies: true,
      emailDigest: false,
      securityAnnouncements: true,
    }
  )
  const [privacyForm, setPrivacyForm] = useState<{
    isPublic: boolean
    worksVisibility: 'public' | 'hidden'
    showAvatar: boolean
    showName: boolean
    showUsername: boolean
    showReads: boolean
    showFollowers: boolean
    showWorksCount: boolean
    showReadingHistory: boolean
    adultContentEnabled: boolean
  }>(() =>
    initialData
      ? {
          isPublic: Boolean(initialData.privacy?.isPublic ?? false),
          worksVisibility: initialData.privacy?.worksVisibility || 'public',
          showAvatar: initialData.privacy?.showAvatar !== false,
          showName: initialData.privacy?.showName !== false,
          showUsername: initialData.privacy?.showUsername !== false,
          showReads: Boolean(initialData.privacy?.showReads ?? false),
          showFollowers: Boolean(initialData.privacy?.showFollowers ?? false),
          showWorksCount: Boolean(initialData.privacy?.showWorksCount ?? false),
          showReadingHistory: Boolean(initialData.privacy?.showReadingHistory ?? false),
          adultContentEnabled: Boolean(initialData.privacy?.adultContentEnabled),
        }
      : {
          isPublic: false,
          worksVisibility: 'public',
          showAvatar: true,
          showName: true,
          showUsername: true,
          showReads: false,
          showFollowers: false,
          showWorksCount: false,
          showReadingHistory: false,
          adultContentEnabled: false,
        }
  )
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>(
    () => initialData?.privacy?.blockedUsers || []
  )
  const [readingHistoryCount, setReadingHistoryCount] = useState<number>(
    () => initialData?.privacy?.readingHistoryCount || 0
  )

  // Saving states & feedback
  const [saving, setSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null)

  // Username verification state
  const [isVerifyingUsername, setIsVerifyingUsername] = useState(false)
  const [usernameVerification, setUsernameVerification] = useState<{
    available: boolean
    message: string
    isCurrent?: boolean
  } | null>(null)

  // Modals state
  const [confirmResetTasteOpen, setConfirmResetTasteOpen] = useState(false)
  const [confirmClearHistoryOpen, setConfirmClearHistoryOpen] = useState(false)
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] = useState(false)
  const [confirmMakePublicOpen, setConfirmMakePublicOpen] = useState(false)
  const [publicModalStats, setPublicModalStats] = useState({
    worksVisibility: 'public' as 'public' | 'hidden',
    showAvatar: true,
    showName: true,
    showUsername: true,
    showReads: true,
    showFollowers: true,
    showWorksCount: true,
    showReadingHistory: false,
  })
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Avatar upload state & ref
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image exceeds 2MB limit. Please choose a smaller portrait.', 'error')
      return
    }

    setIsUploadingAvatar(true)
    try {
      let avatarUrl = ''

      // 1. Try Cloudinary direct CDN upload (Primary, instant 0ms CDN delivery)
      try {
        const cldRes = await uploadToCloudinary(file, 'avatars')
        if (cldRes?.secure_url) {
          avatarUrl = cldRes.secure_url
        }
      } catch (cldErr) {
        console.warn('[Settings] Cloudinary upload failed, attempting storage fallback:', cldErr)
      }

      // 2. Try Supabase Storage upload
      if (!avatarUrl) {
        try {
          const optimizedFile = await optimizeAvatarImage(file, 300, 0.85)
          const ext = optimizedFile.name.split('.').pop() || 'webp'
          const filePath = `${user?.id || 'author'}/avatar_${Date.now()}.${ext}`

          const uploadResult = await uploadImage({
            bucket: STORAGE_BUCKETS.AVATARS,
            path: filePath,
            file: optimizedFile,
            upsert: true,
          })

          if (uploadResult?.url) {
            avatarUrl = uploadResult.url
          }
        } catch (storageErr) {
          console.warn('[Settings] Storage upload failed, falling back to data URL:', storageErr)
        }
      }

      // 3. Fallback to optimized WebP data URL
      if (!avatarUrl) {
        avatarUrl = await convertFileToOptimizedDataUrl(file, 300, 0.85)
      }

      if (!avatarUrl) {
        throw new Error('Unable to process avatar image.')
      }

      setAccountForm((prev) => ({ ...prev, avatarPath: avatarUrl }))
      setCustomAvatarUrl(avatarUrl)

      // Persist directly to Supabase profiles table
      await updateAccountProfileServerFn({
        data: {
          avatarPath: avatarUrl,
        },
      })
      router.invalidate()

      showToast('Profile avatar updated', 'success')
    } catch (err: any) {
      console.error('[Settings] Avatar upload error:', err)
      showToast(err?.message || 'Failed to update avatar', 'error')
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) {
        avatarInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true)
    try {
      setAccountForm((prev) => ({ ...prev, avatarPath: 'none' }))
      setCustomAvatarUrl('none')
      await updateAccountProfileServerFn({
        data: {
          avatarPath: 'none',
        },
      })
      router.invalidate()
      showToast('Avatar removed', 'info')
    } catch (err: any) {
      showToast('Failed to remove avatar', 'error')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleVerifyUsername = async () => {
    const handle = accountForm.username?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || ''
    if (!handle || handle.length < 3) {
      const msg = 'Username must be at least 3 characters (lowercase letters, numbers, underscores).'
      setUsernameVerification({
        available: false,
        message: msg,
      })
      showToast(msg, 'error')
      return
    }

    setIsVerifyingUsername(true)
    setUsernameVerification(null)
    try {
      const res = await verifyUsernameAvailabilityServerFn({
        data: { username: handle },
      })
      setUsernameVerification({
        available: res.available,
        message: res.message,
        isCurrent: res.isCurrent,
      })
      if (res.available) {
        showToast(res.message, 'success')
      } else {
        showToast(res.message, 'error')
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to verify username availability.'
      setUsernameVerification({
        available: false,
        message: msg,
      })
      showToast(msg, 'error')
    } finally {
      setIsVerifyingUsername(false)
    }
  }

  // Taxonomy fallbacks
  const availableGenres = useMemo(() => {
    if (data?.taxonomy?.genres && data.taxonomy.genres.length > 0) {
      return data.taxonomy.genres
    }
    return GLOBAL_GENRES.map((g) => ({
      slug: g.slug,
      name: g.name,
      description: g.description,
    }))
  }, [data?.taxonomy?.genres])

  const availableCategories = useMemo(() => {
    if (data?.taxonomy?.categories && data.taxonomy.categories.length > 0) {
      return data.taxonomy.categories
    }
    return GLOBAL_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
    }))
  }, [data?.taxonomy?.categories])

  // Lock body scroll when modals open on mobile & desktop
  useEffect(() => {
    const anyModalOpen =
      confirmResetTasteOpen ||
      confirmClearHistoryOpen ||
      confirmDeleteAccountOpen ||
      confirmMakePublicOpen
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [confirmResetTasteOpen, confirmClearHistoryOpen, confirmDeleteAccountOpen, confirmMakePublicOpen])

  // Fetch initial data fallback (if not supplied via route loader cache)
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(null)
      let res: SettingsDataPayload
      try {
        res = await getSettingsDataServerFn()
      } catch (fnErr: any) {
        if (isPreview) {
          res = DEMO_SETTINGS_DATA
        } else {
          throw fnErr
        }
      }
      setData(res)

      // Initialize forms
      setAccountForm({
        displayName: res.profile.displayName,
        username: res.profile.username,
        bio: res.profile.bio || '',
        avatarPath: res.profile.avatarPath || '',
        websiteUrl: res.profile.websiteUrl || '',
        location: res.profile.location || '',
        pronouns: res.profile.pronouns || '',
        gender: res.profile.gender || '',
        interestedInWriting: Boolean(res.profile.interestedInWriting),
      })
      setReadingPrefsForm(res.readingPreferences)
      setRecsForm(res.recommendations)
      setReadingExpForm(res.readingExperience)
      setNotifsForm(res.notifications)
      setPrivacyForm({
        isPublic: res.privacy.isPublic,
        adultContentEnabled: res.privacy.adultContentEnabled,
      })
      setBlockedUsers(res.privacy.blockedUsers)
      setReadingHistoryCount(res.privacy.readingHistoryCount)
    } catch (err: any) {
      console.error('[Settings] Failed to load data:', err)
      setLoadError(err?.message || 'Failed to load your settings.')
    } finally {
      setLoading(false)
    }
  }, [isPreview])

  // Synchronize state when TanStack Router loader data refreshes or becomes available
  useEffect(() => {
    if (loaderData?.data) {
      const res = loaderData.data
      setData(res)
      setLoading(false)
      setLoadError(null)
      if (res.profile.displayName) {
        setUserDisplayName(res.profile.displayName)
      }
      if (res.profile.username) {
        setUserProfileUsername(res.profile.username)
      }
      if (res.profile.avatarPath) {
        setCustomAvatarUrl(res.profile.avatarPath)
      }
      setAccountForm({
        displayName: res.profile.displayName || '',
        username: res.profile.username || '',
        bio: res.profile.bio || '',
        avatarPath: res.profile.avatarPath || '',
        websiteUrl: res.profile.websiteUrl || '',
        location: res.profile.location || '',
        pronouns: res.profile.pronouns || '',
        gender: res.profile.gender || '',
        interestedInWriting: Boolean(res.profile.interestedInWriting),
      })
      setReadingPrefsForm((prev) => (prev.favoriteGenres.length > 0 ? prev : res.readingPreferences))
      setRecsForm((prev) => prev || res.recommendations)
      setReadingExpForm((prev) => prev || res.readingExperience)
      setNotifsForm((prev) => prev || res.notifications)
      setPrivacyForm((prev) => prev || {
        isPublic: res.privacy.isPublic,
        adultContentEnabled: res.privacy.adultContentEnabled,
      })
      setBlockedUsers(res.privacy.blockedUsers)
      setReadingHistoryCount(res.privacy.readingHistoryCount)
    } else if (loaderData?.error && !data) {
      setLoadError(loaderData.error)
      setLoading(false)
    }
  }, [loaderData])

  useEffect(() => {
    if (!initialData && !loaderData?.error) {
      loadData()
    }
  }, [initialData, loaderData?.error, loadData])

  // Clear messages when tab changes
  useEffect(() => {
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
  }, [activeSection])

  // Handlers
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const cleanPronouns = accountForm.pronouns === 'Other' ? null : (accountForm.pronouns?.trim() || null)
      const cleanGender = accountForm.gender?.trim() || null

      const res: any = await updateAccountProfileServerFn({
        data: {
          displayName: accountForm.displayName?.trim(),
          username: accountForm.username,
          bio: accountForm.bio,
          avatarPath: accountForm.avatarPath,
          websiteUrl: accountForm.websiteUrl,
          location: accountForm.location,
          pronouns: cleanPronouns,
          gender: cleanGender,
          interestedInWriting: accountForm.interestedInWriting,
        },
      })
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to update profile.')
      }

      if (accountForm.displayName?.trim()) {
        setUserDisplayName(accountForm.displayName.trim())
      }
      if (accountForm.username?.trim()) {
        setUserProfileUsername(accountForm.username.trim())
      }
      if (accountForm.avatarPath) {
        setCustomAvatarUrl(accountForm.avatarPath)
      }

      router.invalidate()
      setSaveSuccessMsg('Profile changes saved successfully.')
      showToast('Profile updated', 'success')
      const updatedProfile = res?.profile || res
      if (updatedProfile) {
        setAccountForm((prev) => ({
          ...prev,
          displayName: updatedProfile.display_name || prev.displayName,
          username: updatedProfile.username || prev.username,
          bio: updatedProfile.bio !== undefined ? (updatedProfile.bio || '') : prev.bio,
          avatarPath: updatedProfile.avatar_path !== undefined ? (updatedProfile.avatar_path || '') : prev.avatarPath,
          websiteUrl: updatedProfile.website_url !== undefined ? (updatedProfile.website_url || '') : prev.websiteUrl,
          location: updatedProfile.location !== undefined ? (updatedProfile.location || '') : prev.location,
          pronouns: updatedProfile.pronouns !== undefined ? (updatedProfile.pronouns || '') : (cleanPronouns || ''),
          gender: updatedProfile.gender !== undefined ? (updatedProfile.gender || '') : (cleanGender || ''),
          interestedInWriting: Boolean(updatedProfile.preferences?.interestedInWriting ?? prev.interestedInWriting),
        }))
      }
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save account changes.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveReadingPreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const res = await updateReadingPreferencesServerFn({
        data: readingPrefsForm,
      })
      if (!res.success) {
        throw new Error(res.error || 'Failed to update preferences.')
      }
      router.invalidate()
      setPrivacyForm((prev) => ({
        ...prev,
        adultContentEnabled: readingPrefsForm.adultContentEnabled,
      }))
      setSaveSuccessMsg('Reading preferences saved successfully.')
      showToast('Reading preferences updated', 'success')
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save reading preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveRecommendations = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const res = await updateRecommendationsSettingsServerFn({
        data: recsForm,
      })
      if (!res.success) {
        throw new Error(res.error || 'Failed to update recommendation settings.')
      }
      router.invalidate()
      setSaveSuccessMsg('Recommendation preferences saved.')
      showToast('Recommendations updated', 'success')
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save recommendations.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetTaste = async () => {
    setSaving(true)
    try {
      const res = await resetRecommendationTasteServerFn()
      if (!res.success) {
        throw new Error(res.error || 'Failed to reset taste signals.')
      }
      router.invalidate()
      setConfirmResetTasteOpen(false)
      setSaveSuccessMsg('Recommendation taste profile has been reset to defaults.')
      showToast('Taste profile reset', 'success')
      await loadData()
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to reset taste profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveReadingExperience = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const res = await updateReadingExperienceServerFn({
        data: readingExpForm,
      })
      if (!res.success) {
        throw new Error(res.error || 'Failed to update reading experience.')
      }
      router.invalidate()
      updateReaderSettings({
        fontSize: readingExpForm.fontSize,
        fontFamily: readingExpForm.fontFamily,
        lineHeight:
          readingExpForm.lineHeight === 'compact'
            ? 'tight'
            : readingExpForm.lineHeight === 'relaxed'
            ? 'relaxed'
            : 'normal',
        theme: readingExpForm.theme,
      })
      if (['light', 'dark', 'sepia'].includes(readingExpForm.theme)) {
        setSiteTheme(readingExpForm.theme as any)
      }
      setSaveSuccessMsg('Reader experience preferences saved.')
      showToast('Reader settings updated', 'success')
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save reading experience.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const res = await updateNotificationPreferencesServerFn({
        data: notifsForm,
      })
      if (!res.success) {
        throw new Error(res.error || 'Failed to update notifications.')
      }
      router.invalidate()
      setSaveSuccessMsg('Notification preferences updated.')
      showToast('Notifications updated', 'success')
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save notification settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccessMsg(null)
    setSaveErrorMsg(null)
    try {
      const res = await updatePrivacySettingsServerFn({
        data: privacyForm,
      })
      if (!res.success) {
        throw new Error(res.error || 'Failed to update privacy settings.')
      }
      router.invalidate()
      setReadingPrefsForm((prev) => ({
        ...prev,
        adultContentEnabled: privacyForm.adultContentEnabled,
      }))
      setSaveSuccessMsg('Privacy & safety settings saved.')
      showToast('Privacy settings updated', 'success')
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Failed to save privacy settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnblockUser = async (targetProfileId: string) => {
    try {
      const res = await unblockUserServerFn({ data: { targetProfileId } })
      if (!res.success) {
        throw new Error(res.error || 'Failed to unblock user.')
      }
      router.invalidate()
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetProfileId))
      showToast('User unblocked', 'info')
    } catch (err: any) {
      showToast(err?.message || 'Failed to unblock user', 'error')
    }
  }

  const handleClearReadingHistory = async () => {
    setSaving(true)
    try {
      const res = await clearReadingHistoryServerFn()
      if (!res.success) {
        throw new Error(res.error || 'Failed to clear reading history.')
      }
      router.invalidate()
      setReadingHistoryCount(0)
      setConfirmClearHistoryOpen(false)
      showToast('Reading history cleared', 'success')
    } catch (err: any) {
      showToast(err?.message || 'Failed to clear history', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'DELETE') return
    setIsDeleting(true)
    try {
      const res = await deleteUserAccountServerFn()
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete account.')
      }
      await handleSignOut()
    } catch (err: any) {
      setIsDeleting(false)
      showToast(err?.message || 'Failed to delete account', 'error')
    }
  }

  if (loading) {
    return <HatchpenLoader message="Loading settings..." />
  }

  if (loadError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white dark:bg-[#0B0C0E] p-4 sm:p-6">
        <div className="max-w-md w-full p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto" />
          <h2 className="text-lg font-serif font-bold text-red-950 dark:text-red-200">Unable to Load Settings</h2>
          <p className="text-xs text-red-700 dark:text-red-300 font-sans">{loadError}</p>
          <button
            onClick={() => loadData()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  const currentSectionMeta = SECTIONS.find((s) => s.id === activeSection)
  const isAvatarRemoved = accountForm.avatarPath === 'none' || customAvatarUrl === 'none'
  const activeAvatarPath = isAvatarRemoved ? null : (accountForm.avatarPath || customAvatarUrl || user?.imageUrl || null)

  return (
    <div className="min-h-screen bg-neutral-50/30 dark:bg-[#0B0C0E] text-neutral-900 dark:text-neutral-100 antialiased">
      <RouteHeader title="Settings" />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)] md:border-x border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E]">
        
        {/* =====================================================================
            SETTINGS NAVIGATION PANEL
            - Visible on Desktop (md:flex)
            - Visible on Mobile only when no specific section is selected (!isSectionSelected)
        ===================================================================== */}
        <aside
          className={`${
            isSectionSelected ? 'hidden md:flex' : 'flex'
          } w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-neutral-200/80 dark:border-neutral-800/80 shrink-0 bg-neutral-50/40 dark:bg-[#0E0F12]/60 flex-col`}
        >
          {/* Landing / Navigation Header */}
          <div className="p-4 sm:p-6 border-b border-neutral-200/60 dark:border-neutral-800/60">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Settings
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
              Manage your account, preferences and reading experience.
            </p>
          </div>

          {/* Navigation Category Items */}
          <div className="p-3 sm:p-4 space-y-1.5 flex-1 overflow-y-auto">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={sec.id}
                  data-section-id={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center justify-between p-3.5 sm:p-3 rounded-xl text-left transition-all min-h-[56px] ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 shadow-xs font-medium'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 active:bg-neutral-200/60 dark:active:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`h-10 w-10 sm:h-8 sm:w-8 rounded-xl sm:rounded-lg shrink-0 flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-white dark:bg-neutral-700 text-neutral-950 dark:text-neutral-100 shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm sm:text-xs font-semibold leading-snug truncate">
                        {sec.title}
                      </div>
                      <div className="text-xs sm:text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1 leading-tight">
                        {sec.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 ml-2" />
                </button>
              )
            })}
          </div>

          {/* Mobile Bottom User Summary */}
          <div className="p-4 border-t border-neutral-200/60 dark:border-neutral-800/60 md:hidden bg-white dark:bg-[#0B0C0E]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <UnisexAvatar
                  size="sm"
                  avatarPath={activeAvatarPath}
                  forceUnisex={isAvatarRemoved}
                  seed={accountForm.username || user?.username || 'user'}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {accountForm.displayName || user?.fullName || 'HatchPen Member'}
                  </p>
                  <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                    @{accountForm.username || user?.username || 'member'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
              >
                Log Out
              </button>
            </div>
          </div>
        </aside>

        {/* =====================================================================
            SETTINGS CONTENT PANEL
            - Visible on Desktop (md:block)
            - Visible on Mobile only when a section is active (isSectionSelected)
        ===================================================================== */}
        <main
          className={`${
            isSectionSelected ? 'block' : 'hidden md:block'
          } flex-1 overflow-y-auto bg-neutral-50/20 dark:bg-[#0E0F12]/30 p-4 sm:p-8 lg:p-10`}
        >
          <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
            
            {/* Mobile Section Header with Back Navigation */}
            <div className="md:hidden flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
              <button
                type="button"
                onClick={handleBackToCategories}
                className="inline-flex items-center gap-1.5 py-2 px-2.5 -ml-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Back to Settings categories"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Settings</span>
              </button>
              {currentSectionMeta && (
                <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  {currentSectionMeta.title}
                </span>
              )}
            </div>

            {/* Feedback Banners */}
            {saveSuccessMsg && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
                <button
                  onClick={() => setSaveSuccessMsg(null)}
                  className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {saveErrorMsg && (
              <div className="p-3.5 sm:p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-200 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
                <button
                  onClick={() => setSaveErrorMsg(null)}
                  className="p-1 text-red-600 hover:text-red-800 dark:hover:text-red-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ---------------------------------------------------------------
                SECTION 1: ACCOUNT & PROFILE
            --------------------------------------------------------------- */}
            {activeSection === 'account' && (
              <form onSubmit={handleSaveAccount} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Account & Profile
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Manage your public author persona, verified handle, and account security.
                  </p>
                </div>

                {/* Core Identity Fields */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-4">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="sr-only"
                    onChange={handleAvatarFileChange}
                  />

                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Literary Identity
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      {/* Profile Avatar with on-hover pencil overlay */}
                      <div className="relative group shrink-0" title="Click to change avatar">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          aria-label="Change profile avatar"
                          className="relative w-11 h-11 rounded-full overflow-hidden p-0 m-0 border-0 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 cursor-pointer group shrink-0 block"
                        >
                          <UnisexAvatar
                            size="md"
                            avatarPath={activeAvatarPath}
                            forceUnisex={isAvatarRemoved}
                            seed={accountForm.username || user?.username || 'author'}
                            className="w-11 h-11 h-full w-full ring-1 ring-neutral-200 dark:ring-neutral-800 group-hover:ring-neutral-400 dark:group-hover:ring-neutral-600 transition-all"
                          />
                          {/* Hover Pencil Icon Overlay - exact matching circular bounds */}
                          <div className="absolute inset-0 w-full h-full rounded-full bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white pointer-events-none">
                            <Pencil className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                          </div>
                          {isUploadingAvatar && (
                            <div className="absolute inset-0 w-full h-full rounded-full bg-black/60 flex items-center justify-center text-white pointer-events-none">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            </div>
                          )}
                        </button>
                        {!isAvatarRemoved && Boolean(accountForm.avatarPath || customAvatarUrl || user?.imageUrl) && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            disabled={isUploadingAvatar}
                            title="Remove avatar"
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-neutral-800 hover:bg-red-600 text-white flex items-center justify-center text-[9px] shadow-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Display / Pen Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          autoComplete="name"
                          value={accountForm.displayName || ''}
                          onChange={(e) => setAccountForm((p) => ({ ...p, displayName: e.target.value }))}
                          placeholder="e.g. Eleanor Vance"
                          className="w-full px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all min-h-[44px] sm:min-h-0"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Unique Handle <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleVerifyUsername}
                          disabled={isVerifyingUsername || saving || !accountForm.username?.trim()}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isVerifyingUsername ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-neutral-600 dark:text-neutral-400" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <span>Verify</span>
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 sm:top-2 text-xs text-neutral-400 font-mono">@</span>
                        <input
                          type="text"
                          required
                          pattern="^[a-zA-Z0-9_]{3,30}$"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={accountForm.username || ''}
                          onChange={(e) => {
                            setUsernameVerification(null)
                            setAccountForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))
                          }}
                          placeholder="handle"
                          className="w-full pl-8 pr-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all min-h-[44px] sm:min-h-0"
                        />
                      </div>
                      {usernameVerification && (
                        <p
                          className={`mt-1.5 text-xs font-medium ${
                            usernameVerification.available
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {usernameVerification.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Author Biography
                      </label>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {(accountForm.bio || '').length}/500
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={500}
                      autoCapitalize="sentences"
                      value={accountForm.bio || ''}
                      onChange={(e) => setAccountForm((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Briefly describe your writing style, publishing milestones, or literary background..."
                      className="w-full px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all resize-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Website / Portfolio
                      </label>
                      <input
                        type="url"
                        autoComplete="url"
                        value={accountForm.websiteUrl || ''}
                        onChange={(e) => setAccountForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                        placeholder="https://author.com"
                        className="w-full px-3.5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 min-h-[44px] sm:min-h-0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Location
                      </label>
                      <input
                        type="text"
                        autoComplete="address-level2"
                        value={accountForm.location || ''}
                        onChange={(e) => setAccountForm((p) => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. Edinburgh, Scotland"
                        className="w-full px-3.5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 min-h-[44px] sm:min-h-0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Pronouns
                      </label>
                      <select
                        value={normalizePronounsSelection(accountForm.pronouns)}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === 'Other') {
                            setAccountForm((p) => ({
                              ...p,
                              pronouns: p.pronouns && normalizePronounsSelection(p.pronouns) === 'Other' ? p.pronouns : 'Other',
                            }))
                          } else {
                            setAccountForm((p) => ({ ...p, pronouns: val }))
                          }
                        }}
                        className="w-full px-3.5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 min-h-[44px] sm:min-h-0"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="She / Her">She / Her</option>
                        <option value="He / Him">He / Him</option>
                        <option value="They / Them">They / Them</option>
                        <option value="Any / All Pronouns">Any / All Pronouns</option>
                        <option value="Other">Other / Custom</option>
                      </select>
                      {normalizePronounsSelection(accountForm.pronouns) === 'Other' && (
                        <input
                          type="text"
                          value={accountForm.pronouns === 'Other' ? '' : (accountForm.pronouns || '')}
                          onChange={(e) => setAccountForm((p) => ({ ...p, pronouns: e.target.value || 'Other' }))}
                          placeholder="Type custom pronouns (e.g. ze/hir)..."
                          className="mt-2 w-full px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Gender
                      </label>
                      <select
                        value={normalizeGenderSelection(accountForm.gender)}
                        onChange={(e) => setAccountForm((p) => ({ ...p, gender: e.target.value }))}
                        className="w-full px-3.5 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 min-h-[44px] sm:min-h-0"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Genderqueer">Genderqueer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={saving || isVerifyingUsername}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-medium transition-all shadow-xs disabled:opacity-50 min-h-[38px] cursor-pointer"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>

                {/* Onboarding & Creator Interest Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Creator & Author Workspace
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Author preferences configured during initial onboarding.
                      </p>
                    </div>
                    {data?.profile?.onboardingCompleted && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Onboarding Completed</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60">
                    <div className="pr-4">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        Interested in Writing & Publishing
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        Enables manuscript studio tools, serialization management, and author publication access.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={Boolean(accountForm.interestedInWriting)}
                        onChange={(e) => setAccountForm((p) => ({ ...p, interestedInWriting: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-neutral-900 dark:peer-checked:bg-neutral-100 dark:peer-checked:after:bg-neutral-900"></div>
                    </label>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------------------
                SECTION 2: READING PREFERENCES
            --------------------------------------------------------------- */}
            {activeSection === 'reading-preferences' && (
              <form onSubmit={handleSaveReadingPreferences} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Reading Preferences
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Customize the genres, literary formats, and language settings that shape your catalog.
                  </p>
                </div>

                {/* Genres Multi-Select Chips */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Favourite Genres
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Select up to 5 genres you enjoy discovering.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {readingPrefsForm.favoriteGenres.length}/5 selected{readingPrefsForm.favoriteGenres.length >= 5 ? ' (max)' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {availableGenres.map((g) => {
                      const isSelected = readingPrefsForm.favoriteGenres.some(
                        (s) => s.toLowerCase() === g.slug.toLowerCase()
                      )
                      const isMaxReached = readingPrefsForm.favoriteGenres.length >= 5 && !isSelected
                      return (
                        <button
                          type="button"
                          key={g.slug}
                          aria-pressed={isSelected}
                          disabled={isMaxReached}
                          onClick={() => {
                            if (isSelected) {
                              setReadingPrefsForm((prev) => ({
                                ...prev,
                                favoriteGenres: prev.favoriteGenres.filter(
                                  (s) => s.toLowerCase() !== g.slug.toLowerCase()
                                ),
                              }))
                            } else {
                              if (readingPrefsForm.favoriteGenres.length >= 5) {
                                showToast('Maximum 5 favorite genres allowed', 'info')
                                return
                              }
                              setReadingPrefsForm((prev) => ({
                                ...prev,
                                favoriteGenres: [...prev.favoriteGenres, g.slug.toLowerCase()],
                              }))
                            }
                          }}
                          className={`min-h-[40px] px-3.5 py-2 sm:py-1.5 rounded-full text-xs transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-medium shadow-xs'
                              : isMaxReached
                                ? 'border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
                                : 'border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          {g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Story Formats / Categories */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Preferred Story Formats
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Select up to 3 preferred formats across the HatchPen platform.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {readingPrefsForm.preferredCategories.length}/3 selected{readingPrefsForm.preferredCategories.length >= 3 ? ' (max)' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {availableCategories.map((cat) => {
                      const isSelected = readingPrefsForm.preferredCategories.some(
                        (s) => s.toLowerCase() === cat.slug.toLowerCase()
                      )
                      const isMaxReached = readingPrefsForm.preferredCategories.length >= 3 && !isSelected
                      return (
                        <button
                          type="button"
                          key={cat.slug}
                          aria-pressed={isSelected}
                          disabled={isMaxReached}
                          onClick={() => {
                            if (isSelected) {
                              setReadingPrefsForm((prev) => ({
                                ...prev,
                                preferredCategories: prev.preferredCategories.filter(
                                  (s) => s.toLowerCase() !== cat.slug.toLowerCase()
                                ),
                              }))
                            } else {
                              if (readingPrefsForm.preferredCategories.length >= 3) {
                                showToast('Maximum 3 preferred formats allowed', 'info')
                                return
                              }
                              setReadingPrefsForm((prev) => ({
                                ...prev,
                                preferredCategories: [...prev.preferredCategories, cat.slug.toLowerCase()],
                              }))
                            }
                          }}
                          className={`min-h-[40px] px-3.5 py-2 sm:py-1.5 rounded-full text-xs transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-medium shadow-xs'
                              : isMaxReached
                                ? 'border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/40 text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-50'
                                : 'border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Language Selection */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Primary Reading Language
                  </h3>
                  <select
                    value={readingPrefsForm.preferredLanguage}
                    onChange={(e) => setReadingPrefsForm((p) => ({ ...p, preferredLanguage: e.target.value }))}
                    className="w-full sm:w-64 px-3.5 py-2.5 sm:py-2 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 min-h-[44px] sm:min-h-0"
                  >
                    <option value="en">English (Default)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="fr">Français (French)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="ja">日本語 (Japanese)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="pt">Português (Portuguese)</option>
                    <option value="it">Italiano (Italian)</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                </div>

                {/* Mature Content Filter */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Mature & 18+ Content Visibility
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        When enabled, works containing mature themes or content warnings appear in discovery and search.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={readingPrefsForm.adultContentEnabled}
                        onClick={() =>
                          setReadingPrefsForm((p) => ({ ...p, adultContentEnabled: !p.adultContentEnabled }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          readingPrefsForm.adultContentEnabled
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            readingPrefsForm.adultContentEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Preferences</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------------------
                SECTION 3: RECOMMENDATIONS
            --------------------------------------------------------------- */}
            {activeSection === 'recommendations' && (
              <form onSubmit={handleSaveRecommendations} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Recommendations
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Control how HatchPen's discovery algorithm tailors suggested reading for your library.
                  </p>
                </div>

                {/* Personalization Toggle */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Personalized Recommendations
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        When enabled, HatchPen suggests works based on your reading history and followed authors. When disabled, standard curated discovery is used.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={recsForm.personalized}
                        onClick={() => setRecsForm((p) => ({ ...p, personalized: !p.personalized }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          recsForm.personalized
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            recsForm.personalized ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Discovery Focus Cards */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Discovery Focus
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Choose the editorial emphasis for works surfaced in your recommendation queues.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {[
                      {
                        id: 'balanced' as const,
                        title: 'Balanced',
                        desc: 'A harmonious blend of popular titles and emerging debut writers.',
                      },
                      {
                        id: 'emerging' as const,
                        title: 'Emerging Voices',
                        desc: 'Prioritizes new serialized projects and lesser-known authors.',
                      },
                      {
                        id: 'popular' as const,
                        title: 'Community Favorites',
                        desc: 'Surfaces works with high reader praise and substantial readership.',
                      },
                    ].map((item) => {
                      const isSelected = recsForm.discoveryPreference === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setRecsForm((p) => ({ ...p, discoveryPreference: item.id }))}
                          className={`p-3.5 sm:p-3 rounded-xl border text-left transition-all min-h-[56px] active:scale-[0.99] ${
                            isSelected
                              ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/80 shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                              {item.title}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-neutral-100" />}
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                            {item.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Fair Discovery Standard Box */}
                <div className="p-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-100/50 dark:bg-neutral-900/40 text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    HatchPen Fair-Discovery Standard:
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Popularity does not equal literary quality. The discovery engine allocates organic exposure to new chapters so debut authors are never disadvantaged.
                  </p>
                </div>

                {/* Reset Recommendation Taste */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Reset Taste Profile
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Clears algorithmic preferences without touching your library, reading progress, or saved stories.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmResetTasteOpen(true)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors shrink-0 flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Taste</span>
                  </button>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Recommendations</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------------------
                SECTION 4: READING EXPERIENCE
            --------------------------------------------------------------- */}
            {activeSection === 'reading-experience' && (
              <form onSubmit={handleSaveReadingExperience} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Reading Experience
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Customize the typography, palette, and distraction-free reader settings.
                  </p>
                </div>

                {/* Live Preview Box */}
                <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Live Typography Preview
                    </h3>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {readingExpForm.fontFamily.toUpperCase()} • {readingExpForm.fontSize.toUpperCase()} •{' '}
                      {readingExpForm.lineHeight.toUpperCase()}
                    </span>
                  </div>

                  {/* Themed Preview Container */}
                  <div
                    className={`p-4 sm:p-6 rounded-xl transition-all duration-200 border ${
                      readingExpForm.theme === 'sepia'
                        ? 'bg-[#F4ECD8] text-[#433422] border-[#E2D5BA]'
                        : readingExpForm.theme === 'dark'
                        ? 'bg-[#121316] text-[#E4E4E7] border-neutral-800'
                        : 'bg-white text-neutral-900 border-neutral-200'
                    }`}
                  >
                    <p
                      className={`${
                        readingExpForm.fontFamily === 'serif'
                          ? 'font-serif'
                          : readingExpForm.fontFamily === 'mono'
                          ? 'font-mono'
                          : 'font-sans'
                      } ${
                        readingExpForm.fontSize === 'sm'
                          ? 'text-xs'
                          : readingExpForm.fontSize === 'lg'
                          ? 'text-base'
                          : readingExpForm.fontSize === 'xl'
                          ? 'text-lg'
                          : 'text-sm'
                      } ${
                        readingExpForm.lineHeight === 'compact'
                          ? 'leading-snug'
                          : readingExpForm.lineHeight === 'relaxed'
                          ? 'leading-loose'
                          : 'leading-relaxed'
                      }`}
                    >
                      “In the quiet hours before dawn, when the ink is still wet upon the parchment, words find their truest resonance. Every story begins with a flicker of imagination waiting to be heard.”
                    </p>
                  </div>
                </div>

                {/* Theme Picker */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Reading Palette Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { id: 'light' as const, name: 'Light', previewBg: 'bg-white text-neutral-900 border-neutral-300' },
                      { id: 'sepia' as const, name: 'Sepia', previewBg: 'bg-[#F4ECD8] text-[#433422] border-[#E2D5BA]' },
                      { id: 'dark' as const, name: 'Dark', previewBg: 'bg-[#121316] text-white border-neutral-700' },
                    ].map((t) => {
                      const isSelected = readingExpForm.theme === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setReadingExpForm((p) => ({ ...p, theme: t.id }))}
                          className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center gap-2 transition-all min-h-[64px] active:scale-[0.98] ${
                            isSelected
                              ? 'border-neutral-900 dark:border-neutral-100 ring-2 ring-neutral-900/10 dark:ring-neutral-100/10 font-semibold'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                          }`}
                        >
                          <div className={`w-full h-7 sm:h-8 rounded-lg border ${t.previewBg} flex items-center justify-center text-xs font-serif`}>
                            Aa
                          </div>
                          <span className="text-xs text-neutral-800 dark:text-neutral-200">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Font Family */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Font Family
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {[
                      { id: 'serif' as const, label: 'Serif', fontClass: 'font-serif', sub: 'Newsreader / Literary' },
                      { id: 'sans' as const, label: 'Sans-Serif', fontClass: 'font-sans', sub: 'Inter / Modern' },
                      { id: 'mono' as const, label: 'Monospace', fontClass: 'font-mono', sub: 'JetBrains / Technical' },
                    ].map((f) => {
                      const isSelected = readingExpForm.fontFamily === f.id
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setReadingExpForm((p) => ({ ...p, fontFamily: f.id }))}
                          className={`p-3 rounded-xl border text-left transition-all min-h-[52px] active:scale-[0.99] ${
                            isSelected
                              ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900 font-medium'
                              : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                          }`}
                        >
                          <p className={`text-sm ${f.fontClass} text-neutral-900 dark:text-neutral-100`}>{f.label}</p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{f.sub}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Font Size & Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Font Size
                    </h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'sm' as const, label: 'Small' },
                        { id: 'base' as const, label: 'Base' },
                        { id: 'lg' as const, label: 'Large' },
                        { id: 'xl' as const, label: 'XL' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setReadingExpForm((p) => ({ ...p, fontSize: s.id }))}
                          className={`py-2 px-1 sm:px-2 rounded-xl sm:rounded-lg text-xs font-medium transition-all min-h-[42px] sm:min-h-0 ${
                            readingExpForm.fontSize === s.id
                              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-xs'
                              : 'border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Line Spacing
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'compact' as const, label: 'Compact' },
                        { id: 'normal' as const, label: 'Normal' },
                        { id: 'relaxed' as const, label: 'Relaxed' },
                      ].map((lh) => (
                        <button
                          key={lh.id}
                          type="button"
                          onClick={() => setReadingExpForm((p) => ({ ...p, lineHeight: lh.id }))}
                          className={`py-2 px-1 sm:px-2 rounded-xl sm:rounded-lg text-xs font-medium transition-all min-h-[42px] sm:min-h-0 ${
                            readingExpForm.lineHeight === lh.id
                              ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-xs'
                              : 'border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {lh.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reader Layout Switches */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3 sm:space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Reader Layout & Ergonomics
                  </h3>

                  <div className="flex items-center justify-between py-1.5 sm:py-1">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Continuous Scrolling</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Scroll continuously across chapters instead of paged breaks.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={readingExpForm.continuousScroll}
                        onClick={() =>
                          setReadingExpForm((p) => ({ ...p, continuousScroll: !p.continuousScroll }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          readingExpForm.continuousScroll
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            readingExpForm.continuousScroll ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Inline Marginalia</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Display reader annotations and comments alongside text.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={readingExpForm.inlineMarginalia}
                        onClick={() =>
                          setReadingExpForm((p) => ({ ...p, inlineMarginalia: !p.inlineMarginalia }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          readingExpForm.inlineMarginalia
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            readingExpForm.inlineMarginalia ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Floating Table of Contents</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Keep chapter navigation index accessible while reading.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={readingExpForm.floatingToc}
                        onClick={() =>
                          setReadingExpForm((p) => ({ ...p, floatingToc: !p.floatingToc }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          readingExpForm.floatingToc
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            readingExpForm.floatingToc ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Experience Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------------------
                SECTION 5: NOTIFICATIONS
            --------------------------------------------------------------- */}
            {activeSection === 'notifications' && (
              <form onSubmit={handleSaveNotifications} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Notification Preferences
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Decide what literary events, author releases, and discussion alerts reach you.
                  </p>
                </div>

                {/* In-App Alerts */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3 sm:space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    In-App Alerts
                  </h3>

                  <div className="flex items-center justify-between py-1.5 sm:py-1">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">In-App Notification Bell</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Show badges and alert notifications inside the web application.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifsForm.inAppNotifications}
                        onClick={() =>
                          setNotifsForm((p) => ({ ...p, inAppNotifications: !p.inAppNotifications }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifsForm.inAppNotifications
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifsForm.inAppNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">New Chapter Updates</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Alert me when stories in my library publish new chapters.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifsForm.newChapterAlerts}
                        onClick={() =>
                          setNotifsForm((p) => ({ ...p, newChapterAlerts: !p.newChapterAlerts }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifsForm.newChapterAlerts
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifsForm.newChapterAlerts ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Followed Author Releases</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Notify me when writers I follow announce or publish new works.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifsForm.followedAuthorStories}
                        onClick={() =>
                          setNotifsForm((p) => ({ ...p, followedAuthorStories: !p.followedAuthorStories }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifsForm.followedAuthorStories
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifsForm.followedAuthorStories ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Comments & Replies</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Alert me when readers comment on my stories or reply to my annotations.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifsForm.commentReplies}
                        onClick={() =>
                          setNotifsForm((p) => ({ ...p, commentReplies: !p.commentReplies }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifsForm.commentReplies
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifsForm.commentReplies ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Email Communications */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-3 sm:space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Email Communications
                  </h3>

                  <div className="flex items-center justify-between py-1.5 sm:py-1">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Weekly Literary Digest</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        A quiet Sunday email summarizing your reading milestones.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={notifsForm.emailDigest}
                        onClick={() =>
                          setNotifsForm((p) => ({ ...p, emailDigest: !p.emailDigest }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifsForm.emailDigest
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifsForm.emailDigest ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 sm:py-1 border-t border-neutral-100 dark:border-neutral-800/60">
                    <div className="pr-3">
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">Security & Account Notices</p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                        Essential account alerts, terms updates, and security verifications.
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={true}
                        disabled
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-neutral-900 dark:bg-neutral-100 opacity-60"
                        title="Essential service notices are always active."
                      >
                        <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 translate-x-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Notification Settings</span>
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------------------
                SECTION 6: PRIVACY & SAFETY
            --------------------------------------------------------------- */}
            {activeSection === 'privacy' && (
              <form onSubmit={handleSavePrivacy} className="space-y-5 sm:space-y-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Privacy & Visibility
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Manage your profile visibility, manuscripts catalog, public stats, and block list. Profiles are private by default.
                  </p>
                </div>

                {/* Unified Visibility & Privacy Controls Card (Hide/Show All In One Card) */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-5">
                  {/* 1. Profile Visibility: Public vs Private (Default Private) */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          Profile Visibility
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            privacyForm.isPublic
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {privacyForm.isPublic ? 'Public Profile' : 'Private (Default)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {privacyForm.isPublic
                          ? 'Signed-in HatchPen members can view your author profile, bio, and chosen public statistics.'
                          : 'Your profile is completely private. Other users cannot see your profile, works catalog, or stats. Only you can view it.'}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={privacyForm.isPublic}
                        onClick={() => {
                          if (!privacyForm.isPublic) {
                            setPublicModalStats({
                              worksVisibility: privacyForm.worksVisibility,
                              showAvatar: privacyForm.showAvatar,
                              showName: privacyForm.showName,
                              showUsername: privacyForm.showUsername,
                              showReads: privacyForm.showReads,
                              showFollowers: privacyForm.showFollowers,
                              showWorksCount: privacyForm.showWorksCount,
                              showReadingHistory: privacyForm.showReadingHistory,
                            })
                            setConfirmMakePublicOpen(true)
                          } else {
                            setPrivacyForm((p) => ({ ...p, isPublic: false }))
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          privacyForm.isPublic
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            privacyForm.isPublic ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800/80" />

                  {/* 2. Work / Catalog Visibility */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          Works & Manuscripts Catalog
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
                            privacyForm.worksVisibility === 'public'
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {privacyForm.worksVisibility === 'public' ? 'Public' : 'Hidden'}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {privacyForm.worksVisibility === 'public'
                          ? 'Your published manuscripts and serials are listed on your profile for readers to discover.'
                          : 'Your authored works are hidden from your profile catalog.'}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center p-1">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={privacyForm.worksVisibility === 'public'}
                        onClick={() =>
                          setPrivacyForm((p) => ({
                            ...p,
                            worksVisibility: p.worksVisibility === 'public' ? 'hidden' : 'public',
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          privacyForm.worksVisibility === 'public'
                            ? 'bg-neutral-900 dark:bg-neutral-100'
                            : 'bg-neutral-200 dark:bg-neutral-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-md ring-0 transition duration-200 ease-in-out ${
                            privacyForm.worksVisibility === 'public' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800/80" />

                  {/* 3. Identity & Profile Information (Hide / Show) */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                        Profile Identity & Details
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Decide whether your display photo, full name, or username handle are shown publicly to readers.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0.5">
                      {/* Show/Hide DP / Avatar */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Display Picture (DP)
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            {privacyForm.showAvatar ? 'Custom photo visible' : 'Hidden (anonymous silhouette)'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showAvatar}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showAvatar: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Name */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Full Name
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            {privacyForm.showName ? 'Display name visible' : 'Hidden to public'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showName}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showName: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Username */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Username (@handle)
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            {privacyForm.showUsername ? '@handle badge visible' : 'Hidden on profile'}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showUsername}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showUsername: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800/80" />

                  {/* 4. Granular Statistics Visibility (Hide / Show) */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                        Public Profile Statistics
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Choose which stats readers can see on your profile. Any unchecked metric will remain hidden.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                      {/* Show/Hide Lifetime Reads */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Lifetime Reads
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            Show total reads counter
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showReads}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showReads: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Followers Count */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Followers Count
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            Show your subscriber tally
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showFollowers}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showFollowers: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Works Count */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Works Count
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            Show number of cataloged works
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showWorksCount}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showWorksCount: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>

                      {/* Show/Hide Reading History */}
                      <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="space-y-0.5 pr-2">
                          <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
                            Reading History
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                            Show reading activity sessions
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={privacyForm.showReadingHistory}
                          onChange={(e) => setPrivacyForm((p) => ({ ...p, showReadingHistory: e.target.checked }))}
                          className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Blocked Accounts List */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Blocked Accounts ({blockedUsers.length})
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Blocked users cannot comment on your manuscripts or message you.
                    </p>
                  </div>

                  {blockedUsers.length === 0 ? (
                    <div className="p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30 text-center">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        You have not blocked any users.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                      {blockedUsers.map((bu) => (
                        <div key={bu.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <UnisexAvatar size="sm" avatarPath={bu.avatarPath} seed={bu.username} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                {bu.displayName}
                              </p>
                              <p className="text-[10px] font-mono text-neutral-400 truncate">@{bu.username}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(bu.id)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors min-h-[40px] flex items-center"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reading History Management */}
                <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#0B0C0E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Recorded Reading History
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                      Currently tracking {readingHistoryCount} reading sessions. Clearing history will not remove your saved library bookmarks.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmClearHistoryOpen(true)}
                    disabled={readingHistoryCount === 0}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-xl sm:rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 transition-colors shrink-0 disabled:opacity-40 min-h-[44px] sm:min-h-0 flex items-center justify-center"
                  >
                    Clear History
                  </button>
                </div>

                {/* Action Bar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || isVerifyingUsername}
                    className="w-full sm:w-auto sm:ml-auto px-5 py-3 sm:py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-sm sm:text-xs font-semibold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Save Privacy Settings</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>

      {/* =====================================================================
          MOBILE & DESKTOP ACCESSIBLE CONFIRMATION MODALS
      ===================================================================== */}

      {/* 1. Reset Recommendation Taste Modal */}
      {confirmResetTasteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border-t sm:border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-neutral-900 dark:text-neutral-100">
                Reset Recommendation Taste?
              </h3>
              <button
                onClick={() => setConfirmResetTasteOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              This will clear your algorithmic discovery preferences and personalized taste weights. Your saved library, bookmarks, and reading progress will remain completely untouched.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetTasteOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetTaste}
                disabled={saving || isVerifyingUsername}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Clear Reading History Modal */}
      {confirmClearHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border-t sm:border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-neutral-900 dark:text-neutral-100">
                Clear Reading History?
              </h3>
              <button
                onClick={() => setConfirmClearHistoryOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              This will permanently delete all {readingHistoryCount} recorded chapter reading progress entries and history sessions. Your bookmarked stories in Library will not be deleted.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearHistoryOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearReadingHistory}
                disabled={saving || isVerifyingUsername}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Clear All History</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Account Modal */}
      {confirmDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border-t sm:border border-red-200 dark:border-red-900 bg-white dark:bg-[#121316] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Delete Account Irrevocably</span>
              </h3>
              <button
                onClick={() => setConfirmDeleteAccountOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you absolutely certain? This will immediately delete your author profile, reading history, bookmarks, and account preferences. This action cannot be reversed.
            </p>
            <div className="space-y-2 pt-1">
              <label className="block text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400">
                Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3.5 py-2.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-600 min-h-[44px]"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteAccountOpen(false)
                  setDeleteConfirmationText('')
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeleting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Make Profile Public Stats Selection Modal */}
      {confirmMakePublicOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border-t sm:border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121316] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-neutral-900 dark:text-neutral-100">
                    Make Profile Public
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Choose which stats & catalogs to share with community members.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmMakePublicOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {/* Works Visibility Selection */}
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="pr-2">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Works & Manuscripts Catalog
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Allow readers to browse your published stories on your profile page.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={publicModalStats.worksVisibility === 'public'}
                    onClick={() =>
                      setPublicModalStats((s) => ({
                        ...s,
                        worksVisibility: s.worksVisibility === 'public' ? 'hidden' : 'public',
                      }))
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      publicModalStats.worksVisibility === 'public'
                        ? 'bg-neutral-900 dark:bg-neutral-100'
                        : 'bg-neutral-200 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-neutral-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                        publicModalStats.worksVisibility === 'public' ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Identity Checkboxes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[10px]">
                  Profile Identity to Display
                </p>

                <div className="space-y-2">
                  {/* Avatar / DP */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Display Picture (Avatar)
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Show your custom profile photo (uncheck to show neutral unisex silhouette)
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showAvatar}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showAvatar: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>

                  {/* Full Name */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Full Name
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Show your author / reader display name
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showName}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showName: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>

                  {/* Username */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Username Handle (@handle)
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Show your @handle badge on the profile header
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showUsername}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showUsername: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              {/* Stats Checkboxes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider text-[10px]">
                  Public Statistics to Display
                </p>

                <div className="space-y-2">
                  {/* Lifetime Reads */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Lifetime Reads
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Display total reads counter on your profile header
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showReads}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showReads: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>

                  {/* Followers */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Followers Count
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Display how many subscribers follow your updates
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showFollowers}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showFollowers: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>

                  {/* Works Count */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Works Count
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Display total count of cataloged stories & manuscripts
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showWorksCount}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showWorksCount: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>

                  {/* Reading History */}
                  <label className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        Reading Activity & Sessions
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block">
                        Display reading history and active literary sessions
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicModalStats.showReadingHistory}
                      onChange={(e) =>
                        setPublicModalStats((s) => ({ ...s, showReadingHistory: e.target.checked }))
                      }
                      className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setConfirmMakePublicOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 min-h-[44px] sm:min-h-0 flex items-center justify-center cursor-pointer"
              >
                Cancel (Keep Private)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrivacyForm((prev) => ({
                    ...prev,
                    isPublic: true,
                    worksVisibility: publicModalStats.worksVisibility,
                    showAvatar: publicModalStats.showAvatar,
                    showName: publicModalStats.showName,
                    showUsername: publicModalStats.showUsername,
                    showReads: publicModalStats.showReads,
                    showFollowers: publicModalStats.showFollowers,
                    showWorksCount: publicModalStats.showWorksCount,
                    showReadingHistory: publicModalStats.showReadingHistory,
                  }))
                  setConfirmMakePublicOpen(false)
                  showToast('Profile set to Public with chosen statistics.', 'info')
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl sm:rounded-lg bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-0 cursor-pointer"
              >
                Confirm & Make Public
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
