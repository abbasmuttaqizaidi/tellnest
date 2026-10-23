import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useRef, useMemo } from 'react'
import {
  Eye,
  MapPin,
  Link2,
  Check,
  Upload,
  Lock,
  Download,
  Shield,
  Palette,
  Sliders,
  BookOpen,
  Edit,
  X,
  Camera,
  Award,
  Star,
  Plus,
  Globe,
  Mail,
  Fingerprint,
} from 'lucide-react'
import { useUser, useClerk } from '@clerk/react'
import { motion } from 'motion/react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { RouteHeader } from '../components/RouteHeader'
import { useApp } from '../context/AppContext'
import {
  Modal,
  Button,
  Badge,
  TactileSlider,
  AnimatedTabs,
  DropdownSelect,
  type SelectOption,
  UnisexAvatar,
  isDefaultOrInitialAvatar,
  SPRINGS,
} from '../design-system'
import { getUserProfileServerFn, updateUserProfileServerFn } from '../server/authors'
import { uploadToCloudinary } from '../lib/cloudinary'
import { uploadImage, optimizeAvatarImage, STORAGE_BUCKETS } from '../lib/supabase/storage'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/profile')({
  head: () =>
    generateMeta({
      title: 'Profile & Settings — Hatchpen',
      description: 'Manage your public persona, reading comfort, editorial typography, and alert cadence.',
      noindex: true,
    }),
  component: () => (
    <div className="min-h-screen pb-12">
      <RouteHeader
        title="Profile"
        subtitle="Manage your public persona & preferences"
      />
      <ProtectedRoute
        title="Profile & Settings"
        description="Sign in to manage your public persona, reading comfort, and alert cadence."
        featureBadge="Account Preferences"
      >
        <UserProfileAndSettingsPage />
      </ProtectedRoute>
    </div>
  ),
})

type ProfileData = {
  name: string
  handle: string
  bio: string
  location: string
  website: string
  newsletter: string
  isPseudonym: boolean
  pronouns: string
  gender: string
}

const INITIAL_PROFILE: ProfileData = {
  name: 'Cordelia Vance',
  handle: '@cordelia.vance',
  bio: 'Writing serialized speculative naturalism. Creator of The Glass Greenhouse.',
  location: 'London & The High Veldt',
  website: 'https://cordeliavance.press',
  newsletter: 'https://greenhouse.meridian.pub',
  isPseudonym: false,
  pronouns: '',
  gender: '',
}

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

// Type conversion helpers between ReaderSettings and App Settings UI
const FONT_SIZE_TO_KEY: Record<number, 'sm' | 'base' | 'lg' | 'xl'> = {
  15: 'sm',
  17: 'base',
  20: 'lg',
  24: 'xl',
}
const KEY_TO_FONT_SIZE: Record<string, number> = {
  sm: 15,
  base: 17,
  lg: 20,
  xl: 24,
}

const LINE_HEIGHT_TO_KEY: Record<number, 'tight' | 'normal' | 'relaxed' | 'loose'> = {
  1.4: 'tight',
  1.7: 'normal',
  2.0: 'loose',
}
const KEY_TO_LINE_HEIGHT: Record<string, number> = {
  tight: 1.4,
  normal: 1.7,
  relaxed: 1.7,
  loose: 2.0,
}

export function UserProfileAndSettingsPage() {
  const { user } = useUser()
  const clerk = useClerk()
  const {
    siteTheme,
    setSiteTheme,
    readerSettings,
    updateReaderSettings,
    showToast,
    userDisplayName,
    setUserDisplayName,
    setUserProfileUsername,
    customAvatarUrl,
    setCustomAvatarUrl,
    writerWorks,
    followedAuthorIds,
  } = useApp()

  // Tab State: 'profile' vs 'reading' vs 'account'
  const [activeTab, setActiveTab] = useState<'profile' | 'reading' | 'account'>('profile')

  // Profile data
  const [profile, setProfile] = useState<ProfileData>(INITIAL_PROFILE)
  const [dbProfile, setDbProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Modals
  const [isPublicPreviewOpen, setIsPublicPreviewOpen] = useState(false)
  const [isBioModalOpen, setIsBioModalOpen] = useState(false)
  const [modalBioInput, setModalBioInput] = useState('')

  // Avatar Uploading
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Typography Engine Preview State (synced with readerSettings)
  const [currentFont, setCurrentFont] = useState<'Outfit' | 'Inter' | 'JetBrains Mono'>(
    readerSettings.fontFamily === 'sans' ? 'Inter' : readerSettings.fontFamily === 'mono' ? 'JetBrains Mono' : 'Outfit'
  )
  const [currentFontSize, setCurrentFontSize] = useState<number>(() => {
    if (typeof readerSettings.fontSize === 'number') return readerSettings.fontSize
    return KEY_TO_FONT_SIZE[readerSettings.fontSize] || 17
  })
  const [currentLineSpacing, setCurrentLineSpacing] = useState<number>(() => {
    if (readerSettings.customLineHeight) return readerSettings.customLineHeight
    if (typeof readerSettings.lineHeight === 'number') return readerSettings.lineHeight
    return KEY_TO_LINE_HEIGHT[readerSettings.lineHeight] || 1.7
  })
  const [lineSpacingLabel, setLineSpacingLabel] = useState<string>(() => {
    const val = readerSettings.customLineHeight || (typeof readerSettings.lineHeight === 'number' ? readerSettings.lineHeight : KEY_TO_LINE_HEIGHT[readerSettings.lineHeight] || 1.7)
    if (val <= 1.45) return 'Tighter'
    if (val >= 1.9) return 'Spacious'
    return 'Harmonic'
  })

  // Selected Atmosphere Tone (for explicit ring selection between Linen, Sage, Paper, Obsidian)
  const [activeAtmosphereTone, setActiveAtmosphereTone] = useState<'linen' | 'sage' | 'paper' | 'obsidian'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'obsidian' || savedTheme === 'dark') return 'obsidian'
      if (savedTheme === 'linen' || savedTheme === 'sepia') return 'linen'
      if (savedTheme === 'sage') return 'sage'
      if (savedTheme === 'paper') return 'paper'
    }
    if (readerSettings.theme === 'dark' || siteTheme === 'dark') return 'obsidian'
    if (readerSettings.theme === 'sepia' || siteTheme === 'sepia' || siteTheme === 'linen') return 'linen'
    if (siteTheme === 'sage') return 'sage'
    if (siteTheme === 'paper') return 'paper'
    return 'sage'
  })

  // Toggle Switches under App Settings (hydrated from localStorage / Supabase)
  const [inlineMarginalia, setInlineMarginalia] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('relay_reader_inline_marginalia')
      if (saved !== null) return saved === 'true'
    }
    return true
  })
  const [continuousScroll, setContinuousScroll] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('relay_reader_continuous_scroll')
      if (saved !== null) return saved === 'true'
    }
    return true
  })
  const [floatingToc, setFloatingToc] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('relay_reader_floating_toc')
      if (saved !== null) return saved === 'true'
    }
    return true
  })

  // Notifications
  const [bulletinAlerts, setBulletinAlerts] = useState(true)
  const [weeklyGazette, setWeeklyGazette] = useState(true)
  const [commentMentions, setCommentMentions] = useState(true)

  // Load user data from Supabase
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    let isCancelled = false
    setIsLoading(true)

    getUserProfileServerFn({ data: user.id })
      .then((dbData) => {
        if (!isCancelled && dbData) {
          setDbProfile(dbData)
          setProfile({
            name: dbData.display_name || user.fullName || user.firstName || 'Cordelia Vance',
            handle: dbData.username ? (dbData.username.startsWith('@') ? dbData.username : `@${dbData.username}`) : (user.username ? `@${user.username}` : '@author'),
            bio: typeof dbData.bio === 'string' && !dbData.bio.startsWith('{') ? dbData.bio : INITIAL_PROFILE.bio,
            location: dbData.location || INITIAL_PROFILE.location,
            website: dbData.website_url || INITIAL_PROFILE.website,
            newsletter: dbData.preferences?.newsletter || INITIAL_PROFILE.newsletter,
            isPseudonym: Boolean(dbData.preferences?.isPseudonym),
            pronouns: dbData.pronouns || '',
            gender: dbData.gender || '',
          })
          if (dbData.display_name) {
            setUserDisplayName(dbData.display_name)
          }
          if (dbData.username) {
            setUserProfileUsername(dbData.username)
          }

          // Hydrate App Settings toggles and reading preferences if present
          if (dbData.preferences?.reading) {
            const rPref = dbData.preferences.reading
            if (rPref.fontSize) {
              const numSize = typeof rPref.fontSize === 'number' ? rPref.fontSize : KEY_TO_FONT_SIZE[rPref.fontSize] || 17
              setCurrentFontSize(numSize)
            }
            if (rPref.lineHeight) {
              const numSpacing = typeof rPref.lineHeight === 'number' ? rPref.lineHeight : KEY_TO_LINE_HEIGHT[rPref.lineHeight] || 1.7
              setCurrentLineSpacing(numSpacing)
            }
            if (rPref.fontFamily) {
              setCurrentFont(rPref.fontFamily === 'sans' ? 'Inter' : rPref.fontFamily === 'mono' ? 'JetBrains Mono' : 'Outfit')
            }
            if (rPref.atmosphereTone) {
              setActiveAtmosphereTone(rPref.atmosphereTone)
              setSiteTheme(rPref.atmosphereTone === 'obsidian' ? 'dark' : rPref.atmosphereTone)
              updateReaderSettings({ theme: rPref.atmosphereTone === 'obsidian' ? 'dark' : rPref.atmosphereTone === 'linen' ? 'sepia' : 'light' })
            } else if (rPref.theme) {
              if (rPref.theme === 'dark') {
                setActiveAtmosphereTone('obsidian')
                setSiteTheme('dark')
                updateReaderSettings({ theme: 'dark' })
              } else if (rPref.theme === 'sepia') {
                setActiveAtmosphereTone('linen')
                setSiteTheme('linen')
                updateReaderSettings({ theme: 'sepia' })
              } else {
                setActiveAtmosphereTone('sage')
                setSiteTheme('sage')
                updateReaderSettings({ theme: 'light' })
              }
            }
          }

          if (dbData.preferences?.readerUx) {
            if (typeof dbData.preferences.readerUx.inlineMarginalia === 'boolean') {
              setInlineMarginalia(dbData.preferences.readerUx.inlineMarginalia)
            }
            if (typeof dbData.preferences.readerUx.continuousScroll === 'boolean') {
              setContinuousScroll(dbData.preferences.readerUx.continuousScroll)
            }
            if (typeof dbData.preferences.readerUx.floatingToc === 'boolean') {
              setFloatingToc(dbData.preferences.readerUx.floatingToc)
            }
          }

          if (dbData.preferences?.notifications) {
            if (typeof dbData.preferences.notifications.bulletinAlerts === 'boolean') {
              setBulletinAlerts(dbData.preferences.notifications.bulletinAlerts)
            }
            if (typeof dbData.preferences.notifications.weeklyGazette === 'boolean') {
              setWeeklyGazette(dbData.preferences.notifications.weeklyGazette)
            }
            if (typeof dbData.preferences.notifications.commentMentions === 'boolean') {
              setCommentMentions(dbData.preferences.notifications.commentMentions)
            }
          }
        } else if (!isCancelled) {
          // Initialize defaults from Clerk user
          setProfile((prev) => ({
            ...prev,
            name: user.fullName || user.firstName || prev.name,
            handle: user.username ? `@${user.username}` : prev.handle,
          }))
        }
      })
      .catch((err) => {
        console.warn('[ProfileSettings] Load error:', err)
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [user?.id])

  const isAvatarRemoved = customAvatarUrl === 'none' || dbProfile?.avatar_path === 'none'
  const activeAvatar = isAvatarRemoved ? null : (customAvatarUrl || dbProfile?.avatar_path || user?.imageUrl || null)
  const serialsCount = dbProfile?.stats?.authoredWorksCount ?? writerWorks?.length ?? 4
  const readersCount = dbProfile?.stats?.readsCount ? `${dbProfile.stats.readsCount}` : '18.4k'
  const notesCount = dbProfile?.stats?.followersCount ? `${dbProfile.stats.followersCount}` : '142'

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      showToast('Image exceeds 1MB limit. Please choose a smaller portrait.')
      return
    }

    try {
      setIsUploadingAvatar(true)
      let avatarUrl = ''

      // 1. Try Cloudinary direct CDN upload
      try {
        const cldRes = await uploadToCloudinary(file, 'avatars')
        if (cldRes?.secure_url) {
          avatarUrl = cldRes.secure_url
        }
      } catch (cldErr) {
        console.warn('[Profile] Cloudinary upload failed, attempting storage fallback:', cldErr)
      }

      // 2. Try Supabase Storage upload
      if (!avatarUrl) {
        try {
          const optimizedFile = await optimizeAvatarImage(file, 300, 0.85)
          const ext = optimizedFile.name.split('.').pop() || 'webp'
          const filePath = `${user?.id || 'creator'}/avatar_${Date.now()}.${ext}`

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
          console.warn('[Profile] Supabase storage upload failed:', storageErr)
        }
      }

      if (!avatarUrl) {
        throw new Error('Upload failed. Please try a different image.')
      }

      setCustomAvatarUrl(avatarUrl)
      if (user?.id) {
        try {
          await updateUserProfileServerFn({
            data: {
              clerkUserId: user.id,
              avatarUrl,
            },
          })
        } catch {}
      }
      showToast('Author portrait updated successfully')
    } catch (err: any) {
      console.error('[AvatarUpload] Error:', err)
      showToast(err.message || 'Failed to upload image')
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleResetAvatar = async () => {
    setCustomAvatarUrl('none')
    setDbProfile((prev: any) => (prev ? { ...prev, avatar_path: 'none' } : prev))
    if (user?.id) {
      try {
        await updateUserProfileServerFn({
          data: {
            clerkUserId: user.id,
            avatarUrl: 'none',
          },
        })
      } catch {}
    }
    showToast('Author portrait restored to default placeholder')
  }

  // Save Settings Function
  const handleSave = async () => {
    // Persist reader UX toggles to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('relay_reader_inline_marginalia', String(inlineMarginalia))
      localStorage.setItem('relay_reader_continuous_scroll', String(continuousScroll))
      localStorage.setItem('relay_reader_floating_toc', String(floatingToc))
    }

    if (!user?.id) {
      showToast('Settings saved successfully')
      return
    }

    setIsSaving(true)
    try {
      const cleanUsername = profile.handle.replace(/^@/, '')
      const cleanPronouns = profile.pronouns === 'Other' ? null : (profile.pronouns?.trim() || null)
      const cleanGender = profile.gender?.trim() || null

      await updateUserProfileServerFn({
        data: {
          clerkUserId: user.id,
          username: cleanUsername,
          displayName: profile.name?.trim(),
          bio: profile.bio,
          location: profile.location,
          websiteUrl: profile.website,
          pronouns: cleanPronouns,
          gender: cleanGender,
          preferences: {
            newsletter: profile.newsletter,
            isPseudonym: profile.isPseudonym,
            reading: {
              fontFamily: currentFont === 'Inter' ? 'sans' : currentFont === 'JetBrains Mono' ? 'mono' : 'serif',
              fontSize: FONT_SIZE_TO_KEY[currentFontSize] || 'base',
              lineHeight: LINE_HEIGHT_TO_KEY[currentLineSpacing] || 'normal',
              customLineHeight: currentLineSpacing,
              theme: readerSettings.theme,
              atmosphereTone: activeAtmosphereTone,
            },
            readerUx: {
              inlineMarginalia,
              continuousScroll,
              floatingToc,
            },
            notifications: {
              bulletinAlerts,
              weeklyGazette,
              commentMentions,
            },
          },
        },
      })
      if (profile.name?.trim()) {
        setUserDisplayName(profile.name.trim())
      }
      if (cleanUsername) {
        setUserProfileUsername(cleanUsername)
      }
      showToast('Settings saved successfully')
    } catch (err: any) {
      console.error('[SaveSettings] Error:', err)
      showToast(err?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  // Non-blocking background sync helper to persist preferences directly to Database
  const syncPreferencesToDb = async (partialPreferences: Record<string, any>) => {
    if (!user?.id) return
    try {
      await updateUserProfileServerFn({
        data: {
          clerkUserId: user.id,
          preferences: partialPreferences,
        },
      })
    } catch (err) {
      console.warn('[SyncPreferences] Non-blocking DB sync error:', err)
    }
  }

  // Canvas Atmosphere Theme Changer
  const applyCanvasTheme = async (theme: 'linen' | 'sage' | 'paper' | 'obsidian') => {
    setActiveAtmosphereTone(theme)
    let toastLabel = 'Muted Sage'
    const resolvedTheme = theme === 'obsidian' ? 'dark' : theme === 'linen' ? 'sepia' : 'light'
    if (theme === 'obsidian') {
      setSiteTheme('dark')
      updateReaderSettings({ theme: 'dark' })
      toastLabel = 'Obsidian Night'
    } else if (theme === 'sage') {
      setSiteTheme('sage')
      updateReaderSettings({ theme: 'light' })
      toastLabel = 'Muted Sage'
    } else if (theme === 'paper') {
      setSiteTheme('paper')
      updateReaderSettings({ theme: 'light' })
      toastLabel = 'Pure Paper'
    } else {
      setSiteTheme('linen')
      updateReaderSettings({ theme: 'sepia' })
      toastLabel = 'Linen Cream'
    }
    showToast(`Canvas tone set to ${toastLabel}`)

    // Immediately persist to Database in background so it dynamically syncs everywhere
    syncPreferencesToDb({
      reading: {
        theme: resolvedTheme,
        atmosphereTone: theme,
      },
    })
  }

  // Font adjustments with direct DB sync
  const applyTypeface = (font: 'Outfit' | 'Inter' | 'JetBrains Mono') => {
    setCurrentFont(font)
    const familyKey = font === 'Inter' ? 'sans' : font === 'JetBrains Mono' ? 'mono' : 'serif'
    updateReaderSettings({
      fontFamily: familyKey,
    })
    syncPreferencesToDb({
      reading: {
        fontFamily: familyKey,
      },
    })
    showToast(`Typesetting font changed to ${font}`)
  }

  const applyFontSize = (size: number, label: string) => {
    setCurrentFontSize(size)
    const key = FONT_SIZE_TO_KEY[size] || 'base'
    updateReaderSettings({ fontSize: key })
    syncPreferencesToDb({
      reading: {
        fontSize: key,
      },
    })
    showToast(`Font scaling: ${size}px (${label})`)
  }

  const applyLineSpacing = (spacing: number, label: string) => {
    setCurrentLineSpacing(spacing)
    setLineSpacingLabel(label)
    const key = LINE_HEIGHT_TO_KEY[spacing] || 'normal'
    updateReaderSettings({ lineHeight: key, customLineHeight: spacing })
    syncPreferencesToDb({
      reading: {
        lineHeight: key,
        customLineHeight: spacing,
      },
    })
    showToast(`Line spacing: ${label}`)
  }

  // Dropdown options for App Settings
  const atmosphereOptions: SelectOption[] = useMemo(
    () => [
      {
        id: 'linen',
        label: 'Linen Cream',
        description: 'Editorial warm (E-ink sepia tone)',
        icon: <span className="w-3 h-3 rounded-full bg-[#f9faef] border border-[var(--border-subtle)] shadow-xs shrink-0" />,
      },
      {
        id: 'sage',
        label: 'Muted Sage',
        description: 'Soft contrast (Eye-soothing green/moss)',
        icon: <span className="w-3 h-3 rounded-full bg-[#e8eadf] border border-[var(--border-subtle)] shadow-xs shrink-0" />,
      },
      {
        id: 'paper',
        label: 'Pure Paper',
        description: 'High crispness (Clean paper white)',
        icon: <span className="w-3 h-3 rounded-full bg-[#ffffff] border border-[var(--border-subtle)] shadow-xs shrink-0" />,
      },
      {
        id: 'obsidian',
        label: 'Obsidian',
        description: 'Night mode (Deep AMOLED midnight)',
        icon: <span className="w-3 h-3 rounded-full bg-[#0d0e10] border border-neutral-600 shadow-xs shrink-0" />,
      },
    ],
    []
  )

  const fontScalingOptions: SelectOption[] = useMemo(
    () => [
      { id: '15', label: '15px — Compact', description: 'Dense layout for high information measure' },
      { id: '17', label: '17px — Classic', description: 'Balanced publishing standard reading scale' },
      { id: '20', label: '20px — Generous', description: 'Comfortable long-form narrative pacing' },
      { id: '24', label: '24px — Editorial XL', description: 'Large format for high legibility' },
    ],
    []
  )

  const lineSpacingOptions: SelectOption[] = useMemo(
    () => [
      { id: '1.4', label: '1.4 — Tighter', description: 'Compact leading for concise reading' },
      { id: '1.7', label: '1.7 — Harmonic', description: 'Optimal golden ratio typographical cadence' },
      { id: '2', label: '2.0 — Spacious', description: 'Breathable airy spacing for relaxed reading' },
    ],
    []
  )

  const fontOptions: SelectOption[] = useMemo(
    () => [
      { id: 'Outfit', label: 'Outfit', description: 'Editorial Serif with literary character' },
      { id: 'Inter', label: 'Inter', description: 'Clean modern neo-grotesque sans-serif' },
      { id: 'JetBrains Mono', label: 'JetBrains Mono', description: 'Monospace structure for technical clarity' },
    ],
    []
  )

  // Data Export Simulator
  const triggerDataExport = () => {
    showToast('Exporting serialized notebooks (.json)...')
    setTimeout(() => {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(
            {
              author: profile.name,
              handle: profile.handle,
              bio: profile.bio,
              timestamp: new Date().toISOString(),
              serials_count: serialsCount,
              notes_count: notesCount,
            },
            null,
            2
          )
        )
      const dlAnchor = document.createElement('a')
      dlAnchor.setAttribute('href', dataStr)
      dlAnchor.setAttribute('download', `${profile.handle.replace('@', '')}_archive_notes.json`)
      document.body.appendChild(dlAnchor)
      dlAnchor.click()
      dlAnchor.remove()
      showToast('Archive downloaded successfully!')
    }, 700)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--ink-primary)] border-t-transparent animate-spin" />
        <p className="font-mono text-xs text-[var(--ink-muted)]">Loading Colophon & Preferences...</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-[var(--bg-canvas)] text-[var(--color-on-surface)] min-h-[calc(100vh-16rem)] transition-colors duration-300 font-sans">
      {/* Hidden file input for avatar uploading */}
      <input
        ref={avatarInputRef}
        accept="image/*"
        className="hidden"
        id="avatar-file-input"
        onChange={handleAvatarFileChange}
        type="file"
      />

      <div className="flex flex-col w-full pb-16">
        {/* =========================================================================
            TOP EDITORIAL HEADER & BREADCRUMB (Matching live_instructions.md)
            ========================================================================= */}
        <section className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 pt-2 sm:pt-7 pb-2">
          <div className="hidden md:flex items-center gap-2 mb-2 font-mono text-xs">
            <span className="uppercase tracking-widest text-[var(--color-outline)] font-medium">Account</span>
            <span className="text-[var(--color-outline)] text-xs">/</span>
            <span className="uppercase tracking-wider text-[var(--color-primary)] font-semibold">
              {activeTab === 'profile' ? 'Profile' : activeTab === 'reading' ? 'Reading' : 'Account & Alerts'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="hidden md:block">
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--color-on-surface)] tracking-tight leading-tight">
                Profile & Settings
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mt-1">
                Manage your account settings
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant="primary"
                size="sm"
                isLoading={isSaving}
                onClick={handleSave}
                leftIcon={<Check className="w-3.5 h-3.5" />}
                className="font-mono"
              >
                Save Settings
              </Button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            AUTHOR & READER PROFILE HERO CARD (Matching live_instructions.md)
            ========================================================================= */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 my-6">
          <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border border-[var(--border-subtle)]/60 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              {/* Avatar with upload overlay */}
              <div
                className="relative group cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
                title="Click to change portrait"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-sm bg-[var(--bg-surface)] ring-2 ring-[var(--color-primary)]/40 group-hover:ring-[var(--color-primary)] transition-all">
                  <UnisexAvatar
                    src={activeAvatar}
                    forceUnisex={isAvatarRemoved}
                    hasImage={Boolean(activeAvatar && !isDefaultOrInitialAvatar(activeAvatar))}
                    name={profile.name}
                    size="2xl"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Bio & Details */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="font-serif text-2xl font-semibold text-[var(--color-on-surface)]">
                    {profile.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-mono text-xs font-semibold">
                    Author & Serialist
                  </span>
                  {profile.isPseudonym && (
                    <span className="px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-outline)] font-mono text-xs border border-[var(--border-subtle)]">
                      Masked
                    </span>
                  )}
                </div>

                <p className="font-mono text-xs text-[var(--color-outline)]">
                  {profile.handle} • {profile.location}
                </p>

                <p className="text-xs sm:text-sm leading-relaxed text-[var(--color-on-surface-variant)] max-w-lg pt-1 font-serif italic">
                  {profile.bio || 'Writing serialized speculative naturalism.'}
                </p>
              </div>
            </div>

            {/* Metrics & Edit Bio Button */}
            <div className="flex sm:flex-col items-center sm:items-end gap-6 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] w-full sm:w-auto justify-around sm:justify-start">
              <div className="flex items-center gap-6 text-center sm:text-right">
                <div>
                  <div className="font-serif text-xl sm:text-2xl text-[var(--color-on-surface)] font-medium">
                    {serialsCount}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[var(--color-outline)] tracking-wider">
                    Serials
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xl sm:text-2xl text-[var(--color-on-surface)] font-medium">
                    {readersCount}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[var(--color-outline)] tracking-wider">
                    Readers
                  </div>
                </div>
                <div>
                  <div className="font-serif text-xl sm:text-2xl text-[var(--color-on-surface)] font-medium">
                    {notesCount}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[var(--color-outline)] tracking-wider">
                    Annotations
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalBioInput(profile.bio)
                  setIsBioModalOpen(true)
                }}
                className="px-3.5 py-1.5 bg-[var(--bg-surface)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] rounded font-mono text-xs border border-[var(--border-subtle)] transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>Edit Bio</span>
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TABS SWITCHER (Profile vs Reading vs Account)
            ========================================================================= */}
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mb-6">
          <AnimatedTabs
            id="profile-app-settings-tabs"
            variant="underline"
            size="md"
            className="w-full"
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as 'profile' | 'reading' | 'account')}
            tabs={[
              {
                id: 'profile',
                label: 'Profile Settings',
                icon: <Fingerprint className="w-4 h-4" />,
              },
              {
                id: 'reading',
                label: 'Reading Settings',
                icon: <BookOpen className="w-4 h-4" />,
              },
              {
                id: 'account',
                label: 'Account & Notifications',
                icon: <Shield className="w-4 h-4" />,
              },
            ]}
          />
        </div>

        {/* =========================================================================
            SETTINGS CONTENT CONTAINER
            ========================================================================= */}
        <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="space-y-8">
              <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-7 shadow-xs space-y-6 border border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
                        Public Author & Reader Identity
                      </h3>
                      <span className="px-2 py-0.5 rounded bg-[var(--color-primary)] text-[var(--accent-contrast)] font-mono text-[10px] uppercase tracking-wider">
                        Profile
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 font-serif italic">
                      Manage your display byline, pseudonym masking, and literary biographical imprint.
                    </p>
                  </div>
                  <Fingerprint className="w-5 h-5 text-[var(--color-outline)]" />
                </div>

                {/* Colophon Avatar Details */}
                <div className="flex flex-col sm:flex-row gap-6 items-start pb-2">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden shadow-xs bg-[var(--bg-surface)] ring-2 ring-[var(--color-primary)] transition-all group-hover:brightness-90">
                      <UnisexAvatar
                        src={activeAvatar}
                        forceUnisex={isAvatarRemoved}
                        hasImage={Boolean(activeAvatar && !isDefaultOrInitialAvatar(activeAvatar))}
                        name={profile.name}
                        size="xl"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-on-surface)]">
                      Colophon Avatar & Coverlet
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      Visible on serialized chapters, literary marginalia notes, and salon commentary.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-3 py-1 bg-[var(--bg-surface)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] border border-[var(--border-subtle)] rounded font-mono text-xs transition-colors active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Change Portrait</span>
                      </button>
                      {!isAvatarRemoved && Boolean(activeAvatar) && (
                        <button
                          type="button"
                          onClick={handleResetAvatar}
                          className="px-3 py-1 text-[var(--color-outline)] hover:text-red-600 font-mono text-xs transition-colors cursor-pointer"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name & Handle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Display / Colophon Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] px-3.5 py-2.5 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Public Author Handle
                    </label>
                    <input
                      type="text"
                      value={profile.handle}
                      onChange={(e) => setProfile({ ...profile, handle: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] px-3.5 py-2.5 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Bio & Live Counter */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Author Bio & Literary Manifesto
                    </label>
                    <span className="font-mono text-[11px] text-[var(--color-outline)]">
                      {profile.bio.length} / 300 characters
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-[var(--bg-surface)] p-3.5 rounded text-xs sm:text-sm text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] shadow-xs resize-y min-h-[90px] font-serif"
                  />
                </div>

                {/* Social Links & External Press */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Primary External Portfolio / Press URL
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 text-[var(--color-outline)] w-4 h-4" />
                      <input
                        type="text"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="w-full bg-[var(--bg-surface)] pl-9 pr-3.5 py-2 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Substack / Dispatch Newsletter
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-[var(--color-outline)] w-4 h-4" />
                      <input
                        type="text"
                        value={profile.newsletter}
                        onChange={(e) => setProfile({ ...profile, newsletter: e.target.value })}
                        placeholder="https://letters.meridian.pub"
                        className="w-full bg-[var(--bg-surface)] pl-9 pr-3.5 py-2 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Pronouns & Gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Author Pronouns
                    </label>
                    <select
                      value={normalizePronounsSelection(profile.pronouns)}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'Other') {
                          setProfile((prev) => ({
                            ...prev,
                            pronouns: prev.pronouns && normalizePronounsSelection(prev.pronouns) === 'Other' ? prev.pronouns : 'Other',
                          }))
                        } else {
                          setProfile((prev) => ({ ...prev, pronouns: val }))
                        }
                      }}
                      className="w-full bg-[var(--bg-surface)] px-3.5 py-2.5 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="She / Her">She / Her</option>
                      <option value="He / Him">He / Him</option>
                      <option value="They / Them">They / Them</option>
                      <option value="Any / All Pronouns">Any / All Pronouns</option>
                      <option value="Other">Other / Custom</option>
                    </select>
                    {normalizePronounsSelection(profile.pronouns) === 'Other' && (
                      <input
                        type="text"
                        value={profile.pronouns === 'Other' ? '' : (profile.pronouns || '')}
                        onChange={(e) => setProfile((prev) => ({ ...prev, pronouns: e.target.value || 'Other' }))}
                        placeholder="Type custom pronouns (e.g. ze/hir)..."
                        className="mt-2 w-full bg-[var(--bg-surface)] px-3.5 py-2 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Gender Identity
                    </label>
                    <select
                      value={normalizeGenderSelection(profile.gender)}
                      onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full bg-[var(--bg-surface)] px-3.5 py-2.5 rounded font-mono text-xs text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all shadow-xs"
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

                {/* Nom de Plume Toggle Switch */}
                <div className="p-4 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-on-surface)] flex items-center gap-2">
                      <span>Publish Under Nom de Plume (Pseudonym Masking)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-normal">
                        Privacy
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-on-surface-variant)]">
                      Shields legal identity across billing archives, public copyright credits, and royalties.
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      const next = !profile.isPseudonym
                      setProfile((prev) => ({ ...prev, isPseudonym: next }))
                      syncPreferencesToDb({ isPseudonym: next })
                      showToast(next ? 'Nom de plume privacy mode enabled' : 'Pseudonym masking removed')
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      profile.isPseudonym ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-high)]'
                    }`}
                  >
                    <motion.span
                      layout
                      transition={SPRINGS.snappy}
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                        profile.isPseudonym ? 'translate-x-5.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* Literary Badges Showcase */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-on-surface)]">
                      Literary Badges & Guild Affiliations
                    </div>
                    <span className="font-mono text-xs text-[var(--color-outline)]">3 Guilds Connected</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-mono text-xs font-semibold shadow-xs">
                      <Award className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                      <span>Folio Founding Author</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-mono text-xs border border-[var(--border-subtle)]">
                      <BookOpen className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
                      <span>Botanical Fiction Guild</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-mono text-xs border border-[var(--border-subtle)]">
                      <Star className="w-3.5 h-3.5 text-amber-700" />
                      <span>10k Readers Society</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => showToast('Guild directory opened: request guild review')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-surface)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] border border-dashed border-[var(--border-subtle)] font-mono text-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Guild</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: READING SETTINGS */}
          {activeTab === 'reading' && (
            <div className="space-y-8">
              {/* 1. Reading Experience & Ergonomics */}
              <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-7 shadow-xs space-y-6 border border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
                        Reading Ergonomics & Canvas Tone
                      </h3>
                      <Badge variant="subtle" size="sm">
                        Reader UX
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 font-serif italic">
                      Customized canvas warmth, daylight tone, and eye-strain reduction across devices.
                    </p>
                  </div>
                  <Palette className="w-5 h-5 text-[var(--color-outline)]" />
                </div>

                {/* Canvas Atmosphere Palette Dropdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label className="font-medium text-[var(--color-on-surface)]">Canvas Atmosphere Palette</label>
                    <span className="text-[var(--color-primary)] font-semibold">
                      Active: {
                        activeAtmosphereTone === 'obsidian'
                          ? 'Obsidian'
                          : activeAtmosphereTone === 'linen'
                          ? 'Linen Cream'
                          : activeAtmosphereTone === 'paper'
                          ? 'Pure Paper'
                          : 'Muted Sage'
                      }
                    </span>
                  </div>

                  <DropdownSelect
                    options={atmosphereOptions}
                    value={activeAtmosphereTone}
                    onChange={(val) => applyCanvasTheme(val as any)}
                    placeholder="Select atmosphere tone..."
                    size="sm"
                  />
                </div>

                {/* Live Reading Sandbox Preview */}
                <div
                  className={`p-4 sm:p-5 rounded-lg border transition-all duration-300 ${
                    activeAtmosphereTone === 'obsidian'
                      ? 'bg-[#121316] text-[#e0e3e5] border-[#2d3133]'
                      : activeAtmosphereTone === 'linen'
                      ? 'bg-[#f9faef] text-[#2C2219] border-[#e5e6da]'
                      : activeAtmosphereTone === 'paper'
                      ? 'bg-[#ffffff] text-[#111827] border-[#e9ecef] shadow-xs'
                      : 'bg-[#f0f2eb] text-[#1b231d] border-[#d6dbcf]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/15 font-mono text-[11px] opacity-75">
                    <span className="uppercase tracking-wider flex items-center gap-1.5 font-semibold text-[var(--color-primary)]">
                      <BookOpen className="w-3.5 h-3.5" />
                      Live Typesetting Preview
                    </span>
                    <span>
                      {currentFont} • {currentFontSize}px • {lineSpacingLabel}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily:
                        currentFont === 'Outfit'
                          ? '"Outfit", -apple-system, sans-serif'
                          : currentFont === 'Inter'
                          ? '"Inter", -apple-system, sans-serif'
                          : '"JetBrains Mono", monospace',
                      fontSize: `${currentFontSize}px`,
                      lineHeight: currentLineSpacing,
                    }}
                    className="transition-all"
                  >
                    “The damp moss clustered upon the sill whispered of ancient rain. In the conservatory of the estate, each pane held a century of quiet respiration, neither mourning the past nor bracing for the frost.”
                  </p>
                </div>

                {/* Font Scaling & Line Spacing using DropdownSelect */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  {/* Font Scaling */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Reader Font Scaling
                    </label>
                    <DropdownSelect
                      options={fontScalingOptions}
                      value={String(currentFontSize)}
                      onChange={(val) => {
                        const num = Number(val)
                        const labels: Record<number, string> = { 15: 'Compact', 17: 'Classic', 20: 'Generous', 24: 'Editorial XL' }
                        applyFontSize(num, labels[num] || `${num}px`)
                      }}
                      placeholder="Select font size..."
                      size="sm"
                    />
                  </div>

                  {/* Line Spacing */}
                  <div className="space-y-2">
                    <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      Line Spacing & Measure
                    </label>
                    <DropdownSelect
                      options={lineSpacingOptions}
                      value={String(currentLineSpacing)}
                      onChange={(val) => {
                        const num = Number(val)
                        const labels: Record<number, string> = { 1.4: 'Tighter', 1.7: 'Harmonic', 2.0: 'Spacious' }
                        applyLineSpacing(num, labels[num] || `${num}`)
                      }}
                      placeholder="Select line spacing..."
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Typography Engine & Display Navigation */}
              <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-7 shadow-xs space-y-6 border border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
                        Typography Engine & Display Navigation
                      </h3>
                      <Badge variant="subtle" size="sm">
                        Reader UX
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 font-serif italic">
                      Typefaces, chapter transition mechanics, and marginalia commentary overlays.
                    </p>
                  </div>
                  <BookOpen className="w-5 h-5 text-[var(--color-outline)]" />
                </div>

                {/* Typeface Selector using DropdownSelect */}
                <div className="space-y-2">
                  <label className="block font-mono text-xs font-medium text-[var(--color-on-surface)]">
                    Editorial Typesetting Font
                  </label>
                  <DropdownSelect
                    options={fontOptions}
                    value={currentFont}
                    onChange={(val) => applyTypeface(val as any)}
                    placeholder="Select font family..."
                    size="sm"
                  />
                </div>

                {/* Interactive Reading Mechanics Toggles */}
                <div className="space-y-3 pt-2">
                  {[
                    {
                      title: 'Inline Marginalia & Passage Reactions',
                      desc: 'Display subtle reader reflections alongside page gutters during reading.',
                      checked: inlineMarginalia,
                      onToggle: (checked: boolean) => {
                        setInlineMarginalia(checked)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('relay_reader_inline_marginalia', String(checked))
                          window.dispatchEvent(new Event('storage'))
                        }
                        syncPreferencesToDb({ readerUx: { inlineMarginalia: checked } })
                        showToast(checked ? 'Inline marginalia enabled' : 'Inline marginalia hidden')
                      },
                    },
                    {
                      title: 'Continuous Chapter Progression',
                      desc: 'Scroll seamlessly into consecutive serial drops without pagination breaks.',
                      checked: continuousScroll,
                      onToggle: (checked: boolean) => {
                        setContinuousScroll(checked)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('relay_reader_continuous_scroll', String(checked))
                          window.dispatchEvent(new Event('storage'))
                        }
                        syncPreferencesToDb({ readerUx: { continuousScroll: checked } })
                        showToast(checked ? 'Continuous scroll progression active' : 'Paginated chapter breaks enabled')
                      },
                    },
                    {
                      title: 'Floating Table of Contents (Quick Drawer)',
                      desc: 'Keep chapter outline accessible via corner tap or key-command.',
                      checked: floatingToc,
                      onToggle: (checked: boolean) => {
                        setFloatingToc(checked)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('relay_reader_floating_toc', String(checked))
                          window.dispatchEvent(new Event('storage'))
                        }
                        syncPreferencesToDb({ readerUx: { floatingToc: checked } })
                        showToast(checked ? 'Floating chapter drawer enabled' : 'Drawer docked to header')
                      },
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.onToggle(!item.checked)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-all cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
                    >
                      <div className="space-y-0.5 pr-4">
                        <div className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-on-surface)]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[var(--color-on-surface-variant)]">
                          {item.desc}
                        </div>
                      </div>
                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                          item.checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-high)]'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={SPRINGS.snappy}
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                            item.checked ? 'translate-x-5.5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & NOTIFICATIONS */}
          {activeTab === 'account' && (
            <div className="space-y-8">
              {/* 1. Notifications & Dispatches */}
              <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-7 shadow-xs space-y-6 border border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
                        Notifications & Dispatch Cadence
                      </h3>
                      <Badge variant="subtle" size="sm">
                        Delivery
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 font-serif italic">
                      Control when new serialization chapters, editorial digests, and comments reach your inbox.
                    </p>
                  </div>
                  <Mail className="w-5 h-5 text-[var(--color-outline)]" />
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: 'Immediate Serial Drop Bulletins',
                      desc: 'Real-time alert the moment bookmarked authors release installments.',
                      checked: bulletinAlerts,
                      onToggle: (checked: boolean) => {
                        setBulletinAlerts(checked)
                        syncPreferencesToDb({ notifications: { bulletinAlerts: checked } })
                        showToast(checked ? 'Immediate serial bulletins active' : 'Immediate bulletins muted')
                      },
                    },
                    {
                      title: 'Sunday SAGA Gazette & Essays',
                      desc: 'Weekly digest with curated serial spotlights and critical commentary.',
                      checked: weeklyGazette,
                      onToggle: (checked: boolean) => {
                        setWeeklyGazette(checked)
                        syncPreferencesToDb({ notifications: { weeklyGazette: checked } })
                        showToast(checked ? 'Subscribed to Sunday Gazette' : 'Unsubscribed from Gazette digest')
                      },
                    },
                    {
                      title: 'Reader Commentary & Annotation Mentions',
                      desc: 'Notify when readers quote or reply to your notes in shared salon threads.',
                      checked: commentMentions,
                      onToggle: (checked: boolean) => {
                        setCommentMentions(checked)
                        syncPreferencesToDb({ notifications: { commentMentions: checked } })
                        showToast(checked ? 'Annotation reply alerts turned on' : 'Annotation mentions muted')
                      },
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => item.onToggle(!item.checked)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-all cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
                    >
                      <div className="space-y-0.5 pr-4">
                        <div className="font-mono text-xs sm:text-sm font-semibold text-[var(--color-on-surface)]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[var(--color-on-surface-variant)]">
                          {item.desc}
                        </div>
                      </div>
                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                          item.checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-high)]'
                        }`}
                      >
                        <motion.span
                          layout
                          transition={SPRINGS.snappy}
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                            item.checked ? 'translate-x-5.5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Account, Subscriptions & Data Archive */}
              <div className="bg-[var(--color-surface-container-low)] rounded-xl p-6 sm:p-7 shadow-xs space-y-6 border border-[var(--border-subtle)]/60">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
                        Subscription, System & Data Archive
                      </h3>
                      <Badge variant="subtle" size="sm">
                        Account
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5 font-serif italic">
                      Manage patronage membership, security credentials, and export reading notebooks.
                    </p>
                  </div>
                  <Shield className="w-5 h-5 text-[var(--color-outline)]" />
                </div>

                <div className="p-4 bg-[var(--bg-surface)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--border-subtle)]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" size="sm">
                        Active Tier
                      </Badge>
                      <span className="font-serif font-bold text-[var(--color-on-surface)] text-sm sm:text-base">
                        Atelier Patron Pass
                      </span>
                    </div>
                    <p className="font-mono text-xs text-[var(--color-outline)]">
                      $8.00 / month • Auto-renews Dec 1, 2025
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => showToast('Subscription billing portal invoked')}
                      className="font-mono"
                    >
                      Manage Subscription
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs font-medium text-[var(--color-on-surface)]">
                      {user?.primaryEmailAddress?.emailAddress || 'cordelia.vance@meridian.press'}
                    </div>
                    <div className="text-xs text-[var(--color-outline)]">
                      Primary account email for logins & receipts
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (clerk?.openUserProfile) {
                          clerk.openUserProfile()
                        } else {
                          showToast('Security verification link sent to email')
                        }
                      }}
                      leftIcon={<Lock className="w-3.5 h-3.5" />}
                      className="font-mono"
                    >
                      Update Password
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerDataExport}
                      leftIcon={<Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
                      className="font-mono"
                    >
                      Export Notes (.json)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* =========================================================================
          PUBLIC FOLIO PREVIEW MODAL (Matching live_instructions.md)
          ========================================================================= */}
      <Modal
        isOpen={isPublicPreviewOpen}
        onClose={() => setIsPublicPreviewOpen(false)}
        size="md"
        className="max-w-lg p-0 overflow-hidden rounded-2xl bg-[var(--bg-surface)]"
      >
        <div className="h-28 bg-gradient-to-r from-[var(--color-primary)]/30 via-[var(--color-secondary-container)] to-[var(--color-surface-container-high)] relative p-4 flex justify-between items-start">
          <span className="px-2 py-0.5 rounded bg-[var(--bg-surface)]/80 backdrop-blur text-[var(--color-primary)] font-mono text-xs uppercase tracking-wider font-semibold">
            Public Folio Card
          </span>
          <button
            type="button"
            onClick={() => setIsPublicPreviewOpen(false)}
            className="p-1 rounded-full bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] text-[var(--color-on-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="-mt-12 mb-3 flex justify-between items-end">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-[var(--bg-surface)] shadow-md bg-[var(--bg-surface)]">
              <UnisexAvatar
                src={activeAvatar}
                forceUnisex={isAvatarRemoved}
                hasImage={Boolean(activeAvatar && !isDefaultOrInitialAvatar(activeAvatar))}
                name={profile.name}
                size="xl"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-mono text-xs font-semibold">
              Active Serialist
            </span>
          </div>

          <div>
            <h3 className="font-serif text-2xl font-bold text-[var(--color-on-surface)]">
              {profile.name}
            </h3>
            <p className="font-mono text-xs text-[var(--color-outline)]">
              {profile.handle}
            </p>
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mt-3 leading-relaxed border-t border-[var(--border-subtle)] pt-3 font-serif italic">
            {profile.bio || 'Writing serialized speculative naturalism.'}
          </p>

          <div className="grid grid-cols-3 gap-2 py-3 mt-4 bg-[var(--color-surface-container-low)] rounded-lg text-center">
            <div>
              <div className="font-serif text-base text-[var(--color-on-surface)] font-medium">
                {serialsCount}
              </div>
              <div className="font-mono text-[10px] text-[var(--color-outline)] uppercase">
                Serials
              </div>
            </div>
            <div>
              <div className="font-serif text-base text-[var(--color-on-surface)] font-medium">
                {readersCount}
              </div>
              <div className="font-mono text-[10px] text-[var(--color-outline)] uppercase">
                Readers
              </div>
            </div>
            <div>
              <div className="font-serif text-base text-[var(--color-on-surface)] font-medium">
                {notesCount}
              </div>
              <div className="font-mono text-[10px] text-[var(--color-outline)] uppercase">
                Annotations
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 flex items-center justify-between border-t border-[var(--border-subtle)] text-xs text-[var(--color-outline)] font-mono">
            <span className="truncate max-w-[240px]">{profile.website}</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(profile.website)
                  showToast('Link copied to clipboard')
                }
                setIsPublicPreviewOpen(false)
              }}
              className="px-3 py-1 bg-[var(--color-primary)] text-[var(--accent-contrast)] rounded font-mono text-xs hover:bg-[var(--color-primary-container)] transition-colors cursor-pointer"
            >
              Copy URL
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          EDIT BIO MODAL (Matching live_instructions.md)
          ========================================================================= */}
      <Modal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        size="md"
        className="max-w-lg p-6 space-y-4 rounded-2xl bg-[var(--bg-surface)]"
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-[var(--color-primary)]" />
            <h3 className="font-serif text-lg font-bold text-[var(--color-on-surface)]">
              Edit Literary Biography
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsBioModalOpen(false)}
            className="p-1 rounded-full text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="block font-mono text-xs text-[var(--color-outline)]">
            Author Bio (Summary & Current Serials)
          </label>
          <textarea
            rows={4}
            maxLength={300}
            value={modalBioInput}
            onChange={(e) => setModalBioInput(e.target.value)}
            className="w-full bg-[var(--color-surface-container-low)] p-3 rounded text-xs sm:text-sm text-[var(--color-on-surface)] border border-[var(--border-subtle)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] shadow-inner font-serif"
          />
          <div className="flex justify-end">
            <span className="font-mono text-xs text-[var(--color-outline)]">
              {modalBioInput.length} / 300 characters
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setIsBioModalOpen(false)}
            className="px-3 py-1.5 bg-[var(--bg-surface)] text-[var(--color-on-surface)] rounded font-mono text-xs hover:bg-[var(--color-surface-container-high)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setProfile((prev) => ({ ...prev, bio: modalBioInput }))
              setIsBioModalOpen(false)
              showToast('Author bio updated')
            }}
            className="px-4 py-1.5 bg-[var(--color-primary)] text-[var(--accent-contrast)] rounded font-mono text-xs hover:bg-[var(--color-primary-container)] transition-colors shadow-xs cursor-pointer"
          >
            Apply Bio
          </button>
        </div>
      </Modal>
    </div>
  )
}
