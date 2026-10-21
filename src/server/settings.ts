import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createAdminClient } from '../lib/supabase/server.ts'
import type { Database } from '../lib/supabase/types'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy.ts'

export interface SettingsAccountProfile {
  id: string
  clerkUserId: string
  username: string
  displayName: string
  bio: string | null
  avatarPath: string | null
  websiteUrl: string | null
  location: string | null
  pronouns: string | null
  gender: string | null
  interestedInWriting: boolean
  onboardingCompleted: boolean
  isPublic: boolean
  accountStatus: string
  createdAt: string
}

export interface SettingsReadingPreferences {
  favoriteGenres: string[]
  preferredCategories: string[]
  preferredLanguage: string
  adultContentEnabled: boolean
}

export interface SettingsRecommendations {
  personalized: boolean
  discoveryPreference: 'balanced' | 'emerging' | 'popular'
}

export interface SettingsReadingExperience {
  theme: 'light' | 'sepia' | 'dark'
  fontFamily: 'serif' | 'sans' | 'mono'
  fontSize: 'sm' | 'base' | 'lg' | 'xl'
  lineHeight: 'compact' | 'normal' | 'relaxed'
  readingMode: 'standard' | 'focus'
  inlineMarginalia: boolean
  continuousScroll: boolean
  floatingToc: boolean
}

export interface SettingsNotificationPreferences {
  inAppNotifications: boolean
  newChapterAlerts: boolean
  followedAuthorStories: boolean
  commentReplies: boolean
  emailDigest: boolean
  securityAnnouncements: boolean
}

export interface BlockedUserItem {
  id: string
  username: string
  displayName: string
  avatarPath: string | null
  blockedAt: string
}

export interface TaxonomyOption {
  slug: string
  name: string
  description?: string
  group?: string
}

export interface SettingsDataPayload {
  profile: SettingsAccountProfile
  readingPreferences: SettingsReadingPreferences
  recommendations: SettingsRecommendations
  readingExperience: SettingsReadingExperience
  notifications: SettingsNotificationPreferences
  privacy: {
    isPublic: boolean
    adultContentEnabled: boolean
    blockedUsers: BlockedUserItem[]
    readingHistoryCount: number
  }
  taxonomy: {
    categories: TaxonomyOption[]
    genres: TaxonomyOption[]
  }
}

// ============================================================================
// CORE EXECUTORS (Tested deterministically with dependency injection)
// ============================================================================

export async function executeGetSettingsData(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  fallbackData?: Partial<SettingsDataPayload>
}): Promise<SettingsDataPayload> {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required to access settings.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  // 1. Fetch user's profile
  const { data: profileRow, error: profileErr } = await admin
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (profileErr) {
    throw new Error(`Failed to load profile: ${profileErr.message}`)
  }

  let profile = profileRow
  if (!profile) {
    // Graceful self-healing: synthesize minimal shell if record not yet synced
    profile = {
      id: 'usr_' + clerkUserId.slice(-8),
      clerk_user_id: clerkUserId,
      username: 'user_' + clerkUserId.slice(-6).toLowerCase(),
      display_name: 'HatchPen Member',
      bio: null,
      avatar_path: null,
      website_url: null,
      location: null,
      pronouns: null,
      gender: null,
      is_public: true,
      account_status: 'active',
      preferences: {},
      created_at: new Date().toISOString(),
    }
  }

  // 2. Fetch user preferences table row
  let userPrefRow: any = null
  if (profile.id) {
    const { data: prefData } = await admin
      .from('user_preferences')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle()
    userPrefRow = prefData
  }

  // 3. Fetch active categories and genres
  const { data: catRows } = await admin
    .from('categories')
    .select('slug, name, description')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  const { data: genreRows } = await admin
    .from('genres')
    .select('slug, name, description')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // 4. Fetch blocked users
  const blockedUsers: BlockedUserItem[] = []
  if (profile.id) {
    try {
      const { data: blocks } = await admin
        .from('user_blocks')
        .select(`
          id,
          created_at,
          blocked_id,
          blocked_profile:profiles!user_blocks_blocked_id_fkey (
            id,
            username,
            display_name,
            avatar_path
          )
        `)
        .eq('blocker_id', profile.id)

      if (Array.isArray(blocks)) {
        for (const b of blocks) {
          const bp = (b as any).blocked_profile
          if (bp) {
            blockedUsers.push({
              id: bp.id,
              username: bp.username,
              displayName: bp.display_name,
              avatarPath: bp.avatar_path,
              blockedAt: b.created_at,
            })
          }
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }

  // 5. Fetch reading history session count
  let readingHistoryCount = 0
  if (profile.id) {
    try {
      const { count } = await admin
        .from('reading_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
      readingHistoryCount = count || 0
    } catch {
      readingHistoryCount = 0
    }
  }

  const pJson = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}
  const rJson = (pJson.reading && typeof pJson.reading === 'object') ? pJson.reading : {}
  const uxJson = (pJson.readerUx && typeof pJson.readerUx === 'object') ? pJson.readerUx : {}
  const nJson = (pJson.notifications && typeof pJson.notifications === 'object') ? pJson.notifications : {}
  const recJson = (pJson.recommendations && typeof pJson.recommendations === 'object') ? pJson.recommendations : {}

  return {
    profile: {
      id: profile.id,
      clerkUserId: profile.clerk_user_id,
      username: profile.username || '',
      displayName: profile.display_name || '',
      bio: profile.bio || null,
      avatarPath: profile.avatar_path || null,
      websiteUrl: profile.website_url || null,
      location: profile.location || null,
      pronouns: profile.pronouns || null,
      gender: profile.gender || null,
      interestedInWriting: Boolean(pJson.interestedInWriting ?? false),
      onboardingCompleted: Boolean(profile.onboarding_completed ?? false),
      isPublic: profile.is_public ?? true,
      accountStatus: profile.account_status || 'active',
      createdAt: profile.created_at || new Date().toISOString(),
    },
    readingPreferences: {
      favoriteGenres: (Array.isArray(pJson.genres) && pJson.genres.length > 0 ? pJson.genres : (Array.isArray(pJson.interests) ? pJson.interests : []))
        .map((g: any) => {
          if (typeof g === 'string') return g.toLowerCase().trim()
          const val = g.id || g.slug || g.name || ''
          return String(val).toLowerCase().trim()
        })
        .filter(Boolean),
      preferredCategories: (Array.isArray(pJson.categories) ? pJson.categories : [])
        .map((c: any) => {
          if (typeof c === 'string') return c.toLowerCase().trim()
          const val = c.id || c.slug || c.name || ''
          return String(val).toLowerCase().trim()
        })
        .filter(Boolean),
      preferredLanguage: userPrefRow?.preferred_language || pJson.preferred_language || 'en',
      adultContentEnabled: Boolean(userPrefRow?.adult_content_enabled ?? pJson.adult_content_enabled ?? false),
    },
    recommendations: {
      personalized: recJson.personalized !== false,
      discoveryPreference: (recJson.discoveryPreference === 'emerging' || recJson.discoveryPreference === 'popular')
        ? recJson.discoveryPreference
        : 'balanced',
    },
    readingExperience: {
      theme: rJson.theme || userPrefRow?.theme || 'light',
      fontFamily: rJson.fontFamily || 'serif',
      fontSize: rJson.fontSize || (userPrefRow?.font_size === 'lg' || userPrefRow?.font_size === 18 ? 'lg' : userPrefRow?.font_size === 'sm' || userPrefRow?.font_size === 14 ? 'sm' : userPrefRow?.font_size === 'xl' || userPrefRow?.font_size === 20 ? 'xl' : 'base'),
      lineHeight: rJson.lineHeight || (userPrefRow?.line_height === 'compact' || userPrefRow?.line_height === 1.5 ? 'compact' : userPrefRow?.line_height === 'relaxed' || userPrefRow?.line_height === 1.9 ? 'relaxed' : 'normal'),
      readingMode: rJson.readingMode || userPrefRow?.reading_mode || 'standard',
      inlineMarginalia: uxJson.inlineMarginalia ?? true,
      continuousScroll: uxJson.continuousScroll ?? false,
      floatingToc: uxJson.floatingToc ?? true,
    },
    notifications: {
      inAppNotifications: userPrefRow?.push_notifications_enabled ?? nJson.inApp ?? true,
      newChapterAlerts: userPrefRow?.new_chapter_notifications_enabled ?? nJson.newChapters ?? true,
      followedAuthorStories: userPrefRow?.follow_notifications_enabled ?? nJson.followedAuthors ?? true,
      commentReplies: userPrefRow?.comment_notifications_enabled ?? nJson.commentReplies ?? true,
      emailDigest: userPrefRow?.email_notifications_enabled ?? nJson.emailDigest ?? true,
      securityAnnouncements: true, // Always true and locked for security
    },
    privacy: {
      isPublic: profile.is_public ?? true,
      adultContentEnabled: Boolean(userPrefRow?.adult_content_enabled ?? pJson.adult_content_enabled ?? false),
      blockedUsers,
      readingHistoryCount,
    },
    taxonomy: {
      categories: (catRows && catRows.length > 0 ? catRows : GLOBAL_CATEGORIES).map((c: any) => ({
        slug: c.slug,
        name: c.name,
        description: c.description || undefined,
      })),
      genres: (genreRows && genreRows.length > 0 ? genreRows : GLOBAL_GENRES).map((g: any) => ({
        slug: g.slug,
        name: g.name,
        group: g.group || g.genre_group || 'General',
        description: g.description || undefined,
      })),
    },
  }
}

export async function executeUpdateAccountProfile(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: {
    displayName?: string
    username?: string
    bio?: string | null
    avatarPath?: string | null
    websiteUrl?: string | null
    location?: string | null
    pronouns?: string | null
    gender?: string | null
    interestedInWriting?: boolean
  }
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required to update profile.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (deps.data.displayName !== undefined) {
    const trimmed = deps.data.displayName.trim()
    if (trimmed.length < 2) {
      throw new Error('Display name must be at least 2 characters.')
    }
    if (trimmed.length > 50) {
      throw new Error('Display name cannot exceed 50 characters.')
    }
    updates.display_name = trimmed
  }

  if (deps.data.username !== undefined) {
    const raw = deps.data.username.trim().toLowerCase()
    const normalized = raw.replace(/[^a-z0-9_]/g, '')
    if (normalized.length < 3) {
      throw new Error('Username must be at least 3 characters and contain only lowercase letters, numbers, and underscores.')
    }
    if (normalized.length > 30) {
      throw new Error('Username cannot exceed 30 characters.')
    }

    // Check collision with other user
    const { data: existingUser } = await admin
      .from('profiles')
      .select('id, clerk_user_id')
      .eq('username', normalized)
      .neq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (existingUser) {
      throw new Error(`The username "${normalized}" is already taken. Please choose another username.`)
    }
    updates.username = normalized
  }

  if (deps.data.bio !== undefined) {
    const bioText = deps.data.bio?.trim() || null
    if (bioText && bioText.length > 500) {
      throw new Error('Bio cannot exceed 500 characters.')
    }
    updates.bio = bioText
  }

  if (deps.data.avatarPath !== undefined) {
    updates.avatar_path = deps.data.avatarPath || null
  }
  if (deps.data.websiteUrl !== undefined) {
    updates.website_url = deps.data.websiteUrl?.trim() || null
  }
  if (deps.data.location !== undefined) {
    updates.location = deps.data.location?.trim() || null
  }
  if (deps.data.pronouns !== undefined) {
    updates.pronouns = deps.data.pronouns?.trim() || null
  }
  if (deps.data.gender !== undefined) {
    updates.gender = deps.data.gender?.trim() || null
  }

  if (deps.data.interestedInWriting !== undefined) {
    const { data: currentP } = await admin
      .from('profiles')
      .select('preferences')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()
    const pObj = currentP?.preferences && typeof currentP.preferences === 'object' ? currentP.preferences : {}
    updates.preferences = {
      ...pObj,
      interestedInWriting: Boolean(deps.data.interestedInWriting),
    }
  }

  const { data: updated, error } = await admin
    .from('profiles')
    .update(updates)
    .eq('clerk_user_id', clerkUserId)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`The username is already taken. Please choose another username.`)
    }
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return {
    ...updated,
    success: true,
    profile: updated,
  }
}

export async function executeUpdateReadingPreferences(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: {
    favoriteGenres: string[]
    preferredCategories: string[]
    preferredLanguage: string
    adultContentEnabled: boolean
  }
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  // Fetch current profile to get UUID and existing JSON
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, preferences')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (pErr || !profile) {
    throw new Error('Profile not found.')
  }

  const currentPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}
  const cleanGenres = Array.from(new Set((deps.data.favoriteGenres || []).map((s) => String(s).trim().toLowerCase()))).filter(Boolean)
  const cleanCategories = Array.from(new Set((deps.data.preferredCategories || []).map((s) => String(s).trim().toLowerCase()))).filter(Boolean)

  if (cleanGenres.length > 5) {
    throw new Error('You can select a maximum of 5 favorite genres.')
  }
  if (cleanCategories.length > 3) {
    throw new Error('You can select a maximum of 3 preferred story formats.')
  }
  const lang = String(deps.data.preferredLanguage || 'en').trim().toLowerCase().slice(0, 10)
  const adultEnabled = Boolean(deps.data.adultContentEnabled)

  const updatedPrefs = {
    ...currentPrefs,
    genres: cleanGenres,
    interests: cleanGenres,
    categories: cleanCategories,
    preferred_language: lang,
    adult_content_enabled: adultEnabled,
  }

  // 1. Update profiles table JSONB
  await admin
    .from('profiles')
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  // 2. Synchronize user_preferences table
  await admin
    .from('user_preferences')
    .upsert({
      user_id: profile.id,
      preferred_language: lang,
      adult_content_enabled: adultEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return {
    success: true,
    favoriteGenres: cleanGenres,
    preferredCategories: cleanCategories,
    preferredLanguage: lang,
    adultContentEnabled: adultEnabled,
  }
}

export async function executeUpdateRecommendations(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: {
    personalized: boolean
    discoveryPreference: 'balanced' | 'emerging' | 'popular'
  }
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, preferences')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  const currentPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}
  const recPrefs = (currentPrefs.recommendations && typeof currentPrefs.recommendations === 'object') ? currentPrefs.recommendations : {}

  const updatedRecommendations: SettingsRecommendations = {
    personalized: Boolean(deps.data.personalized),
    discoveryPreference: deps.data.discoveryPreference === 'emerging' || deps.data.discoveryPreference === 'popular'
      ? deps.data.discoveryPreference
      : 'balanced',
  }

  await admin
    .from('profiles')
    .update({
      preferences: {
        ...currentPrefs,
        recommendations: {
          ...recPrefs,
          ...updatedRecommendations,
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  return updatedRecommendations
}

export async function executeResetRecommendationTaste(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  // Flush reading_history to reset active taste shift (preserving reading progress & library bookmarks!)
  await admin
    .from('reading_history')
    .delete()
    .eq('user_id', profile.id)

  return { success: true }
}

export async function executeUpdateReadingExperience(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: SettingsReadingExperience
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, preferences')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  const currentPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}
  const fontSizeInt = deps.data.fontSize === 'sm' ? 14 : deps.data.fontSize === 'lg' ? 18 : deps.data.fontSize === 'xl' ? 20 : 16
  const lineHeightNum = deps.data.lineHeight === 'compact' ? 1.5 : deps.data.lineHeight === 'relaxed' ? 1.9 : 1.7

  const updatedPrefs = {
    ...currentPrefs,
    reading: {
      theme: deps.data.theme,
      fontFamily: deps.data.fontFamily,
      fontSize: deps.data.fontSize,
      lineHeight: deps.data.lineHeight,
      readingMode: deps.data.readingMode,
    },
    readerUx: {
      inlineMarginalia: deps.data.inlineMarginalia,
      continuousScroll: deps.data.continuousScroll,
      floatingToc: deps.data.floatingToc,
    },
  }

  // 1. Update profiles table
  await admin
    .from('profiles')
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  // 2. Synchronize user_preferences table
  await admin
    .from('user_preferences')
    .upsert({
      user_id: profile.id,
      theme: deps.data.theme,
      font_size: fontSizeInt,
      line_height: lineHeightNum,
      reading_mode: deps.data.readingMode,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return deps.data
}

export async function executeUpdateNotificationPreferences(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: SettingsNotificationPreferences
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, preferences')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  const currentPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}

  const updatedPrefs = {
    ...currentPrefs,
    notifications: {
      inApp: Boolean(deps.data.inAppNotifications),
      newChapters: Boolean(deps.data.newChapterAlerts),
      followedAuthors: Boolean(deps.data.followedAuthorStories),
      commentReplies: Boolean(deps.data.commentReplies),
      emailDigest: Boolean(deps.data.emailDigest),
    },
  }

  // 1. Update profiles JSON
  await admin
    .from('profiles')
    .update({
      preferences: updatedPrefs,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  // 2. Synchronize user_preferences columns
  await admin
    .from('user_preferences')
    .upsert({
      user_id: profile.id,
      push_notifications_enabled: Boolean(deps.data.inAppNotifications),
      new_chapter_notifications_enabled: Boolean(deps.data.newChapterAlerts),
      follow_notifications_enabled: Boolean(deps.data.followedAuthorStories),
      comment_notifications_enabled: Boolean(deps.data.commentReplies),
      email_notifications_enabled: Boolean(deps.data.emailDigest),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return deps.data
}

export async function executeUpdatePrivacySettings(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  data: {
    isPublic: boolean
    adultContentEnabled: boolean
  }
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, preferences')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  const isPublic = Boolean(deps.data.isPublic)
  const adultContentEnabled = Boolean(deps.data.adultContentEnabled)
  const currentPrefs = (profile.preferences && typeof profile.preferences === 'object') ? profile.preferences : {}

  await admin
    .from('profiles')
    .update({
      is_public: isPublic,
      preferences: {
        ...currentPrefs,
        adult_content_enabled: adultContentEnabled,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  await admin
    .from('user_preferences')
    .upsert({
      user_id: profile.id,
      adult_content_enabled: adultContentEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return { isPublic, adultContentEnabled }
}

export async function executeUnblockUser(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  targetProfileId: string
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  await admin
    .from('user_blocks')
    .delete()
    .eq('blocker_id', profile.id)
    .eq('blocked_id', deps.targetProfileId)

  return { success: true, unblockedId: deps.targetProfileId }
}

export async function executeClearReadingHistory(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!profile) throw new Error('Profile not found.')

  await admin
    .from('reading_history')
    .delete()
    .eq('user_id', profile.id)

  return { success: true }
}

export async function executeDeleteUserAccount(deps: {
  getAuthState: () => Promise<{ userId: string | null } | null>
  adminClient?: any
  clerkSecretKey?: string
}) {
  const authState = await deps.getAuthState()
  if (!authState?.userId) {
    throw new Error('UNAUTHORIZED: Authentication required.')
  }
  const clerkUserId = authState.userId
  const admin = deps.adminClient || createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (profile?.id) {
    // Clean auxiliary items before cascading profile deletion
    await admin.from('comments').delete().eq('user_id', profile.id)
    await admin.from('notifications').delete().or(`user_id.eq.${profile.id},actor_id.eq.${profile.id}`)
    await admin.from('moderation_reports').delete().eq('reporter_id', profile.id)
    await admin.from('user_blocks').delete().or(`blocker_id.eq.${profile.id},blocked_id.eq.${profile.id}`)
    await admin.from('profiles').delete().eq('id', profile.id)
  }

  // Also purge from Clerk authentication
  const key = deps.clerkSecretKey || process.env.CLERK_SECRET_KEY
  if (key) {
    try {
      await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      console.warn('[executeDeleteUserAccount] Non-fatal Clerk deletion error:', e)
    }
  }

  return { success: true }
}

// ============================================================================
// TANSTACK START SERVER FUNCTIONS
// ============================================================================

export const getSettingsDataServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return executeGetSettingsData({
      getAuthState: async () => await auth(),
    })
  })

export const updateAccountProfileServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    displayName?: string
    username?: string
    bio?: string | null
    avatarPath?: string | null
    websiteUrl?: string | null
    location?: string | null
    pronouns?: string | null
    gender?: string | null
    interestedInWriting?: boolean
  }) => params)
  .handler(async ({ data }) => {
    return executeUpdateAccountProfile({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const updateReadingPreferencesServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    favoriteGenres: string[]
    preferredCategories: string[]
    preferredLanguage: string
    adultContentEnabled: boolean
  }) => params)
  .handler(async ({ data }) => {
    return executeUpdateReadingPreferences({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const updateRecommendationsSettingsServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    personalized: boolean
    discoveryPreference: 'balanced' | 'emerging' | 'popular'
  }) => params)
  .handler(async ({ data }) => {
    return executeUpdateRecommendations({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const resetRecommendationTasteServerFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    return executeResetRecommendationTaste({
      getAuthState: async () => await auth(),
    })
  })

export const updateReadingExperienceServerFn = createServerFn({ method: 'POST' })
  .validator((params: SettingsReadingExperience) => params)
  .handler(async ({ data }) => {
    return executeUpdateReadingExperience({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const updateNotificationPreferencesServerFn = createServerFn({ method: 'POST' })
  .validator((params: SettingsNotificationPreferences) => params)
  .handler(async ({ data }) => {
    return executeUpdateNotificationPreferences({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const updatePrivacySettingsServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    isPublic: boolean
    adultContentEnabled: boolean
  }) => params)
  .handler(async ({ data }) => {
    return executeUpdatePrivacySettings({
      getAuthState: async () => await auth(),
      data,
    })
  })

export const unblockUserServerFn = createServerFn({ method: 'POST' })
  .validator((params: { targetProfileId: string }) => {
    if (!params.targetProfileId) throw new Error('targetProfileId is required')
    return params
  })
  .handler(async ({ data }) => {
    return executeUnblockUser({
      getAuthState: async () => await auth(),
      targetProfileId: data.targetProfileId,
    })
  })

export const clearReadingHistoryServerFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    return executeClearReadingHistory({
      getAuthState: async () => await auth(),
    })
  })

export const deleteUserAccountServerFn = createServerFn({ method: 'POST' })
  .handler(async () => {
    return executeDeleteUserAccount({
      getAuthState: async () => await auth(),
    })
  })
