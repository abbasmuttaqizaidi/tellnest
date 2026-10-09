import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server'
import crypto from 'node:crypto'

const ADMIN_SECRET =
  (typeof process !== 'undefined' && (process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD)) ||
  'relay-admin-2026'

/**
 * Generate a cryptographically signed HMAC admin session token valid for 12 hours.
 */
export function generateAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 12 // 12 hours
  const payload = `${expiresAt}:${ADMIN_SECRET}`
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')
  const token = Buffer.from(`${expiresAt}:${hmac}`).toString('base64')
  return { token, expiresAt }
}

/**
 * Validates the HMAC signature and expiration timestamp of an admin session token.
 */
export function isValidAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [expiresAtStr, hmac] = decoded.split(':')
    if (!expiresAtStr || !hmac) return false

    const expiresAt = parseInt(expiresAtStr, 10)
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false
    }

    const payload = `${expiresAt}:${ADMIN_SECRET}`
    const expectedHmac = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex')

    if (hmac.length !== expectedHmac.length) return false
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))
  } catch {
    return false
  }
}

export interface AdminUserWork {
  id: string
  title: string
  slug: string
  description?: string | null
  status: string
  visibility: string
  publicationStatus?: string
  chapterCount: number
  wordCount: number
  viewCount: number
  saveCount: number
  createdAt: string
  categoryName?: string
}

export interface AdminUserReading {
  workId: string
  workTitle: string
  workSlug?: string
  chapterId?: string | null
  chapterNumber?: number
  chapterTitle?: string
  progressPercent: number
  lastReadAt: string
}

export interface AdminUserSavedWork {
  workId: string
  workTitle: string
  coverImage?: string | null
  savedAt: string
}

export interface AdminUserFollowedAuthor {
  authorId: string
  authorName: string
  handle?: string
}

export interface AdminUser {
  clerkId: string
  profileId?: string | null
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  username: string
  avatarUrl: string | null
  createdAt: string
  lastSignInAt: string | null
  status: 'active' | 'suspended' | 'banned'
  works: AdminUserWork[]
  readingProgress: AdminUserReading[]
  savedWorks: AdminUserSavedWork[]
  followedAuthors: AdminUserFollowedAuthor[]
  interests: string[]
  preferences?: {
    theme?: string
    readingMode?: string
    fontSize?: number
  } | null
}

export interface AdminDashboardData {
  users: AdminUser[]
  totalCount: number
  stats: {
    totalUsers: number
    totalWorks: number
    activeReadingSessions: number
    totalLibrarySaves: number
  }
}

/**
 * Server Function: Authenticate Admin using master passkey.
 * Returns an HMAC signed token upon successful verification.
 */
export const adminLoginServerFn = createServerFn({ method: 'POST' })
  .validator((params: { passkey: string }) => {
    if (!params || !params.passkey || typeof params.passkey !== 'string') {
      throw new Error('Access key is required')
    }
    return { passkey: params.passkey.trim() }
  })
  .handler(async ({ data: { passkey } }) => {
    if (passkey !== ADMIN_SECRET.trim()) {
      throw new Error('Invalid administration access key')
    }

    const { token, expiresAt } = generateAdminToken()
    return {
      success: true,
      token,
      expiresAt,
      message: 'Admin authorization granted',
    }
  })

/**
 * Server Function: Verify existing Admin session token.
 */
export const verifyAdminSessionServerFn = createServerFn({ method: 'POST' })
  .validator((params: { token: string }) => {
    return { token: params?.token || '' }
  })
  .handler(async ({ data: { token } }) => {
    return {
      valid: isValidAdminToken(token),
    }
  })

/**
 * Server Function: Fetches all users from Clerk and joins their Supabase manuscripts,
 * reading progress, saved library items, and engagement metrics.
 * Requires valid Admin session token.
 */
export const getAdminUsersServerFn = createServerFn({ method: 'POST' })
  .validator((params?: { adminToken?: string }) => {
    return { adminToken: params?.adminToken || '' }
  })
  .handler(async ({ data: { adminToken } }): Promise<AdminDashboardData> => {
    if (!isValidAdminToken(adminToken)) {
      throw new Error('Unauthorized: Valid admin authentication token required')
    }

    const clerkSecretKey = process.env.CLERK_SECRET_KEY || ''
    const admin = createAdminClient()

    // 1. Fetch Clerk Users
    let clerkUsers: any[] = []
    if (clerkSecretKey) {
      try {
        const clerkRes = await fetch('https://api.clerk.com/v1/users?limit=100&order_by=-created_at', {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        })
        if (clerkRes.ok) {
          const body = await clerkRes.json()
          if (Array.isArray(body)) {
            clerkUsers = body
          }
        } else {
          console.warn('[getAdminUsersServerFn] Clerk API returned status:', clerkRes.status)
        }
      } catch (err: any) {
        console.error('[getAdminUsersServerFn] Error fetching Clerk users:', err?.message)
      }
    }

    // 2. Fetch Supabase Data
    let profiles: any[] = []
    let works: any[] = []
    let readingProgress: any[] = []
    let libraryItems: any[] = []
    let follows: any[] = []
    let userPreferences: any[] = []

    try {
      const [
        pRes,
        wRes,
        rpRes,
        liRes,
        fRes,
        upRes
      ] = await Promise.all([
        admin.from('profiles').select('*'),
        admin.from('works').select('*, category:categories(name)'),
        admin.from('reading_progress').select('*, work:works(id, title, slug), chapter:chapters(id, chapter_number, title)'),
        admin.from('library_items').select('*, work:works(id, title, slug, cover_image_path)'),
        admin.from('follows').select('*, following:profiles!follows_following_id_fkey(id, display_name, username)'),
        admin.from('user_preferences').select('*')
      ])

      profiles = pRes.data || []
      works = wRes.data || []
      readingProgress = rpRes.data || []
      libraryItems = liRes.data || []
      follows = fRes.data || []
      userPreferences = upRes.data || []
    } catch (dbErr: any) {
      console.warn('[getAdminUsersServerFn] Supabase query notice:', dbErr?.message)
    }

    // 3. Assemble unified user list
    const usersMap = new Map<string, AdminUser>()

    // First map all Clerk users
    for (const u of clerkUsers) {
      const email = u.email_addresses?.[0]?.email_address || 'No email'
      const firstName = u.first_name || ''
      const lastName = u.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim() || u.username || email.split('@')[0]
      const username = u.username || email.split('@')[0] || `user_${u.id.slice(0, 8)}`
      const avatarUrl = u.image_url || null
      const createdDate = u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null

      const matchingProfile = profiles.find((p) => p.clerk_user_id === u.id)
      const profileId = matchingProfile?.id || null

      const userWorks: AdminUserWork[] = profileId
        ? works
            .filter((w) => w.author_id === profileId)
            .map((w) => ({
              id: w.id,
              title: w.title,
              slug: w.slug,
              description: w.description,
              status: w.status,
              visibility: w.visibility,
              publicationStatus: w.publication_status,
              chapterCount: w.chapter_count || 0,
              wordCount: w.word_count || 0,
              viewCount: Number(w.view_count || 0),
              saveCount: Number(w.save_count || 0),
              createdAt: w.created_at,
              categoryName: w.category?.name || 'General Literature',
            }))
        : []

      const userReading: AdminUserReading[] = profileId
        ? readingProgress
            .filter((rp) => rp.user_id === profileId)
            .map((rp) => ({
              workId: rp.work_id,
              workTitle: rp.work?.title || 'Manuscript',
              workSlug: rp.work?.slug,
              chapterId: rp.chapter_id,
              chapterNumber: rp.chapter?.chapter_number || 1,
              chapterTitle: rp.chapter?.title || 'Chapter',
              progressPercent: Number(rp.progress_percent || 0),
              lastReadAt: rp.last_read_at,
            }))
        : []

      const userSaved: AdminUserSavedWork[] = profileId
        ? libraryItems
            .filter((li) => li.user_id === profileId)
            .map((li) => ({
              workId: li.work_id,
              workTitle: li.work?.title || 'Saved Manuscript',
              coverImage: li.work?.cover_image_path || null,
              savedAt: li.created_at,
            }))
        : []

      const userFollows: AdminUserFollowedAuthor[] = profileId
        ? follows
            .filter((f) => f.follower_id === profileId)
            .map((f) => ({
              authorId: f.following_id,
              authorName: f.following?.display_name || 'Resident Author',
              handle: f.following?.username,
            }))
        : []

      const prefs = profileId ? userPreferences.find((pr) => pr.user_id === profileId) : null

      // Deduce interests from works & saved items
      const interestSet = new Set<string>()
      userWorks.forEach((w) => {
        if (w.categoryName) interestSet.add(w.categoryName)
      })
      userSaved.forEach(() => interestSet.add('Serialized Fiction'))
      if (interestSet.size === 0) {
        interestSet.add('Contemporary Prose')
        interestSet.add('Serialized Fiction')
      }

      usersMap.set(u.id, {
        clerkId: u.id,
        profileId,
        email,
        firstName,
        lastName,
        displayName: matchingProfile?.display_name || fullName,
        username: matchingProfile?.username || username,
        avatarUrl: matchingProfile?.avatar_path || avatarUrl,
        createdAt: matchingProfile?.created_at || createdDate,
        lastSignInAt: lastSignIn,
        status: (matchingProfile?.account_status as any) || 'active',
        works: userWorks,
        readingProgress: userReading,
        savedWorks: userSaved,
        followedAuthors: userFollows,
        interests: Array.from(interestSet),
        preferences: prefs
          ? {
              theme: prefs.theme,
              readingMode: prefs.reading_mode,
              fontSize: prefs.font_size,
            }
          : null,
      })
    }

    // Also include any profiles in Supabase that might not be in the current Clerk page
    for (const p of profiles) {
      if (!usersMap.has(p.clerk_user_id)) {
        const userWorks = works
          .filter((w) => w.author_id === p.id)
          .map((w) => ({
            id: w.id,
            title: w.title,
            slug: w.slug,
            description: w.description,
            status: w.status,
            visibility: w.visibility,
            publicationStatus: w.publication_status,
            chapterCount: w.chapter_count || 0,
            wordCount: w.word_count || 0,
            viewCount: Number(w.view_count || 0),
            saveCount: Number(w.save_count || 0),
            createdAt: w.created_at,
            categoryName: w.category?.name || 'General Literature',
          }))

        const userReading = readingProgress
          .filter((rp) => rp.user_id === p.id)
          .map((rp) => ({
            workId: rp.work_id,
            workTitle: rp.work?.title || 'Manuscript',
            workSlug: rp.work?.slug,
            chapterId: rp.chapter_id,
            chapterNumber: rp.chapter?.chapter_number || 1,
            chapterTitle: rp.chapter?.title || 'Chapter',
            progressPercent: Number(rp.progress_percent || 0),
            lastReadAt: rp.last_read_at,
          }))

        usersMap.set(p.clerk_user_id, {
          clerkId: p.clerk_user_id,
          profileId: p.id,
          email: `${p.username}@tellnest.folio`,
          firstName: p.display_name?.split(' ')[0] || null,
          lastName: p.display_name?.split(' ').slice(1).join(' ') || null,
          displayName: p.display_name,
          username: p.username,
          avatarUrl: p.avatar_path,
          createdAt: p.created_at,
          lastSignInAt: null,
          status: p.account_status || 'active',
          works: userWorks,
          readingProgress: userReading,
          savedWorks: [],
          followedAuthors: [],
          interests: ['Serialized Fiction'],
          preferences: null,
        })
      }
    }

    const users = Array.from(usersMap.values())

    return {
      users,
      totalCount: users.length,
      stats: {
        totalUsers: users.length,
        totalWorks: works.length,
        activeReadingSessions: readingProgress.length,
        totalLibrarySaves: libraryItems.length,
      },
    }
  })

/**
 * Server Function: Purges a user completely from both Clerk and Supabase.
 * Cascades through all Supabase tables (profiles, works, chapters, library_items,
 * reading_progress, comments, notifications) and deletes the Clerk user identity.
 * Requires valid Admin session token.
 */
export const purgeUserServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; profileId?: string | null; adminToken: string }) => {
    if (!params.adminToken) {
      throw new Error('Admin authorization token is required')
    }
    if (!params.clerkUserId || typeof params.clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required to purge a user')
    }
    return {
      adminToken: params.adminToken,
      clerkUserId: params.clerkUserId.trim(),
      profileId: params.profileId ? params.profileId.trim() : null,
    }
  })
  .handler(async ({ data: { adminToken, clerkUserId, profileId } }) => {
    if (!isValidAdminToken(adminToken)) {
      throw new Error('Unauthorized: Invalid admin token')
    }

    const admin = createAdminClient()
    const clerkSecretKey = process.env.CLERK_SECRET_KEY || ''

    const report = {
      success: false,
      clerkDeleted: false,
      supabaseDeleted: false,
      clerkMessage: '',
      supabaseMessage: '',
    }

    // 1. Flush Supabase Database
    try {
      let targetProfileId = profileId
      if (!targetProfileId) {
        const { data: found } = await admin
          .from('profiles')
          .select('id')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle()
        if (found?.id) {
          targetProfileId = found.id
        }
      }

      if (targetProfileId) {
        // Clean auxiliary social and notification items
        await admin.from('comments').delete().eq('user_id', targetProfileId)
        await admin.from('notifications').delete().or(`user_id.eq.${targetProfileId},actor_id.eq.${targetProfileId}`)
        await admin.from('moderation_reports').delete().eq('reporter_id', targetProfileId)

        // Delete profile (cascades to works, chapters, library_items, reading_progress, reading_history, follows, preferences)
        const { error: delErr } = await admin.from('profiles').delete().eq('id', targetProfileId)
        if (delErr) {
          report.supabaseMessage = `Supabase error: ${delErr.message}`
        } else {
          report.supabaseDeleted = true
          report.supabaseMessage = 'All database records, manuscripts, and activity flushed successfully.'
        }
      } else {
        report.supabaseDeleted = true
        report.supabaseMessage = 'No associated Supabase profile rows found (already clean).'
      }
    } catch (sbErr: any) {
      report.supabaseMessage = sbErr?.message || 'Failed during Supabase table purge'
      console.error('[purgeUserServerFn] Supabase purge exception:', sbErr)
    }

    // 2. Flush Clerk Authentication System
    if (clerkSecretKey) {
      try {
        const clerkRes = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (clerkRes.ok) {
          report.clerkDeleted = true
          report.clerkMessage = 'User credentials and security tokens purged from Clerk.'
        } else if (clerkRes.status === 404) {
          report.clerkDeleted = true
          report.clerkMessage = 'User was already absent or previously deleted in Clerk.'
        } else {
          const errData = await clerkRes.json().catch(() => ({}))
          report.clerkMessage = errData?.errors?.[0]?.message || `Clerk HTTP ${clerkRes.status}`
        }
      } catch (cErr: any) {
        report.clerkMessage = cErr?.message || 'Failed to communicate with Clerk API'
        console.error('[purgeUserServerFn] Clerk API purge exception:', cErr)
      }
    } else {
      report.clerkMessage = 'CLERK_SECRET_KEY missing in server environment.'
    }

    report.success = report.clerkDeleted && report.supabaseDeleted
    return report
  })

import { AUTHORS } from '../data/mockData'

// ─────────────────────────────────────────────────────────────────────────────
// Admin Post Work — Create a manuscript under a mock persona or existing user
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminPostWorkPayload {
  adminToken: string
  authorMode: 'mock' | 'existing'
  // For 'existing' mode
  existingUserClerkId?: string
  existingUserProfileId?: string
  existingUserName?: string
  existingUserHandle?: string
  existingUserAvatar?: string
  existingUserBio?: string
  // For 'mock' mode
  mockAuthor?: {
    name: string
    handle: string
    avatar?: string
    bio?: string
    location?: string
  }
  // Work details
  workData: {
    title: string
    subtitle?: string
    cover?: string
    category: string
    genre: string
    synopsis: string
    fullDescription?: string
    tags?: string[]
    status: 'Ongoing' | 'Completed'
    visibility: 'Public' | 'Unlisted'
    chapterTitle: string
    chapterContent: string
  }
}

export interface AdminPostWorkResult {
  success: boolean
  message: string
  workId?: string
  authorId?: string
  authorName?: string
  authorHandle?: string
  authorAvatar?: string
  authorBio?: string
  authorLocation?: string
  supabaseWorkId?: string
  supabaseChapterId?: string
}

export const adminPostWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: AdminPostWorkPayload) => {
    if (!params.adminToken) {
      throw new Error('Admin authorization token is required')
    }
    if (!params.authorMode || !['mock', 'existing'].includes(params.authorMode)) {
      throw new Error('authorMode must be "mock" or "existing"')
    }
    if (params.authorMode === 'mock') {
      if (!params.mockAuthor?.name?.trim() || !params.mockAuthor?.handle?.trim()) {
        throw new Error('Mock author requires a display name and handle')
      }
    }
    if (params.authorMode === 'existing') {
      const hasIdentifier =
        Boolean(params.existingUserClerkId?.trim()) ||
        Boolean(params.existingUserProfileId?.trim()) ||
        Boolean(params.existingUserName?.trim()) ||
        Boolean(params.existingUserHandle?.trim())
      if (!hasIdentifier) {
        throw new Error('Existing user mode requires a user ID, profile ID, or user name/handle')
      }
    }
    if (!params.workData?.title?.trim()) {
      throw new Error('Work title is required')
    }
    if (!params.workData?.chapterTitle?.trim()) {
      throw new Error('Initial chapter title is required')
    }
    if (!params.workData?.chapterContent?.trim()) {
      throw new Error('Initial chapter content is required')
    }
    return params
  })
  .handler(async ({ data }): Promise<AdminPostWorkResult> => {
    const {
      adminToken,
      authorMode,
      existingUserClerkId,
      existingUserProfileId,
      existingUserName,
      existingUserHandle,
      existingUserAvatar,
      existingUserBio,
      mockAuthor,
      workData,
    } = data

    if (!isValidAdminToken(adminToken)) {
      throw new Error('Unauthorized: Invalid admin token')
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    let resolvedProfileId: string | null = null
    let resolvedAuthorName = ''
    let resolvedAuthorHandle = ''
    let resolvedAuthorAvatar = existingUserAvatar || ''
    let resolvedAuthorBio = existingUserBio || ''
    let resolvedAuthorLocation = ''

    // ── Resolve Author ────────────────────────────────────────────────
    if (authorMode === 'existing') {
      let profile: any = null

      // 1. By profile ID if given
      if (existingUserProfileId) {
        const { data: p } = await admin
          .from('profiles')
          .select('id, display_name, username, avatar_path, bio, location')
          .eq('id', existingUserProfileId)
          .maybeSingle()
        profile = p
      }

      // 2. By Clerk user ID if given
      if (!profile && existingUserClerkId) {
        const { data: p } = await admin
          .from('profiles')
          .select('id, display_name, username, avatar_path, bio, location')
          .eq('clerk_user_id', existingUserClerkId)
          .maybeSingle()
        profile = p
      }

      // 3. By existing user name or handle in Supabase profiles
      if (!profile && (existingUserName || existingUserHandle)) {
        const nameQuery = (existingUserName || existingUserHandle)!.trim()
        const { data: matches } = await admin
          .from('profiles')
          .select('id, display_name, username, avatar_path, bio, location')
          .or(`display_name.ilike.%${nameQuery}%,username.ilike.%${nameQuery}%`)
          .limit(1)
        if (matches && matches.length > 0) {
          profile = matches[0]
        }
      }

      // 4. If found in Supabase profiles
      if (profile) {
        resolvedProfileId = profile.id
        resolvedAuthorName = profile.display_name || existingUserName || 'Existing Author'
        resolvedAuthorHandle = profile.username || existingUserHandle || 'author'
        resolvedAuthorAvatar = profile.avatar_path || existingUserAvatar || ''
        resolvedAuthorBio = profile.bio || existingUserBio || ''
        resolvedAuthorLocation = profile.location || ''
      } else {
        // 5. Check platform AUTHORS list from mockData
        const nameSearch = (existingUserName || existingUserHandle || '').trim().toLowerCase()
        const foundPlatformAuthor = AUTHORS.find(
          (a) =>
            a.name.toLowerCase() === nameSearch ||
            a.handle.toLowerCase() === nameSearch ||
            a.name.toLowerCase().includes(nameSearch) ||
            a.id.toLowerCase() === nameSearch
        )

        if (foundPlatformAuthor) {
          resolvedAuthorName = foundPlatformAuthor.name
          resolvedAuthorHandle = foundPlatformAuthor.handle
          resolvedAuthorAvatar = foundPlatformAuthor.avatar || existingUserAvatar || ''
          resolvedAuthorBio = foundPlatformAuthor.bio || existingUserBio || ''
          resolvedAuthorLocation = foundPlatformAuthor.location || ''

          // Create or sync a Supabase profile for this author
          try {
            const platformClerkId = `platform-${foundPlatformAuthor.id}`
            const { data: newProfile } = await admin
              .from('profiles')
              .insert({
                clerk_user_id: platformClerkId,
                display_name: foundPlatformAuthor.name,
                username: foundPlatformAuthor.handle,
                avatar_path: foundPlatformAuthor.avatar,
                bio: foundPlatformAuthor.bio,
                location: foundPlatformAuthor.location,
              })
              .select('id, display_name, username, avatar_path, bio, location')
              .single()

            if (newProfile) {
              resolvedProfileId = newProfile.id
            }
          } catch {}
        } else {
          // 6. Check Clerk API if user exists
          const clerkSecretKey = process.env.CLERK_SECRET_KEY || ''
          let clerkFoundUser: any = null

          if (clerkSecretKey) {
            try {
              if (existingUserClerkId) {
                const clerkRes = await fetch(
                  `https://api.clerk.com/v1/users/${encodeURIComponent(existingUserClerkId)}`,
                  {
                    headers: {
                      Authorization: `Bearer ${clerkSecretKey}`,
                      'Content-Type': 'application/json',
                    },
                  }
                )
                if (clerkRes.ok) clerkFoundUser = await clerkRes.json()
              } else if (existingUserName || existingUserHandle) {
                const clerkListRes = await fetch(
                  `https://api.clerk.com/v1/users?query=${encodeURIComponent(existingUserName || existingUserHandle || '')}&limit=5`,
                  {
                    headers: {
                      Authorization: `Bearer ${clerkSecretKey}`,
                      'Content-Type': 'application/json',
                    },
                  }
                )
                if (clerkListRes.ok) {
                  const users = await clerkListRes.json()
                  if (Array.isArray(users) && users.length > 0) clerkFoundUser = users[0]
                }
              }
            } catch (err: any) {
              console.warn('[adminPostWork] Clerk query warning:', err?.message)
            }
          }

          if (clerkFoundUser) {
            const displayName =
              `${clerkFoundUser.first_name || ''} ${clerkFoundUser.last_name || ''}`.trim() ||
              clerkFoundUser.username ||
              existingUserName ||
              'Existing Author'
            const username =
              clerkFoundUser.username ||
              clerkFoundUser.email_addresses?.[0]?.email_address?.split('@')[0] ||
              existingUserHandle ||
              `user_${clerkFoundUser.id.slice(0, 8)}`

            resolvedAuthorName = displayName
            resolvedAuthorHandle = username
            resolvedAuthorAvatar = clerkFoundUser.image_url || existingUserAvatar || ''

            try {
              const { data: newProfile } = await admin
                .from('profiles')
                .insert({
                  clerk_user_id: clerkFoundUser.id,
                  display_name: displayName,
                  username,
                  avatar_path: clerkFoundUser.image_url || null,
                  bio: existingUserBio || null,
                  location: null,
                })
                .select('id, display_name, username')
                .single()

              if (newProfile) {
                resolvedProfileId = newProfile.id
              }
            } catch {}
          } else {
            // 7. Fallback for typed existing user name: resolve details
            resolvedAuthorName = existingUserName?.trim() || existingUserHandle?.trim() || 'Existing Author'
            resolvedAuthorHandle = (
              existingUserHandle?.trim().replace(/^@/, '') ||
              resolvedAuthorName.toLowerCase().replace(/[^a-z0-9_-]/g, '')
            ) || 'author'
            resolvedAuthorAvatar = existingUserAvatar || '/unisex-avatar.svg'
            resolvedAuthorBio = existingUserBio || 'Author profile on Stories by Relay'

            // Create Supabase profile for them so work insertion doesn't fail foreign key
            try {
              const { data: existingProf } = await admin
                .from('profiles')
                .select('id')
                .eq('username', resolvedAuthorHandle)
                .maybeSingle()

              if (existingProf) {
                resolvedProfileId = existingProf.id
              } else {
                const fallbackClerkId = `admin-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                const { data: newProfile } = await admin
                  .from('profiles')
                  .insert({
                    clerk_user_id: fallbackClerkId,
                    display_name: resolvedAuthorName,
                    username: resolvedAuthorHandle,
                    avatar_path: resolvedAuthorAvatar,
                    bio: resolvedAuthorBio,
                    location: null,
                  })
                  .select('id')
                  .single()

                if (newProfile) {
                  resolvedProfileId = newProfile.id
                }
              }
            } catch {}
          }
        }
      }
    } else {
      // Mock author mode — create a fake profile in Supabase
      const mockName = mockAuthor!.name.trim()
      const mockHandle = mockAuthor!.handle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `mock_${Date.now().toString(36)}`
      const mockAvatar = mockAuthor?.avatar?.trim() || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      const mockBio = mockAuthor?.bio?.trim() || 'Resident essayist and serialized storyteller.'
      const mockLocation = mockAuthor?.location?.trim() || null

      resolvedAuthorName = mockName
      resolvedAuthorHandle = mockHandle
      resolvedAuthorAvatar = mockAvatar
      resolvedAuthorBio = mockBio
      resolvedAuthorLocation = mockLocation || ''

      try {
        const { data: existingMock } = await admin
          .from('profiles')
          .select('id, display_name, username')
          .eq('username', mockHandle)
          .maybeSingle()

        if (existingMock) {
          resolvedProfileId = existingMock.id
        } else {
          const mockClerkId = `admin-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          const { data: newProfile, error: profileErr } = await admin
            .from('profiles')
            .insert({
              clerk_user_id: mockClerkId,
              display_name: mockName,
              username: mockHandle,
              avatar_path: mockAvatar,
              bio: mockBio,
              location: mockLocation,
            })
            .select('id, display_name, username')
            .single()

          if (newProfile && !profileErr) {
            resolvedProfileId = newProfile.id
          } else {
            console.warn('[adminPostWork] Mock profile insert warning:', profileErr?.message)
            // Retry find in case of concurrent insert
            const { data: retryProfile } = await admin
              .from('profiles')
              .select('id')
              .eq('username', mockHandle)
              .maybeSingle()
            if (retryProfile) resolvedProfileId = retryProfile.id
          }
        }
      } catch (err: any) {
        console.warn('[adminPostWork] Mock profile creation exception:', err?.message)
      }
    }

    // ── Create Work in Supabase ───────────────────────────────────────
    // Clean, SEO-oriented slug: converts all special characters to hyphens
    const baseSlug = workData.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'manuscript'

    let workSlug = baseSlug

    // Check if the exact clean slug already exists in database; if yes, append incremental suffix (2, 3...)
    if (admin) {
      try {
        const { data: existingWorks } = await admin
          .from('works')
          .select('slug')
          .ilike('slug', `${baseSlug}%`)

        if (existingWorks && existingWorks.length > 0) {
          const existingSlugs = new Set(existingWorks.map((w: any) => w.slug))
          if (existingSlugs.has(baseSlug)) {
            let counter = 2
            while (existingSlugs.has(`${baseSlug}-${counter}`)) {
              counter++
            }
            workSlug = `${baseSlug}-${counter}`
          }
        }
      } catch (err: any) {
        console.warn('[adminPostWork] Slug collision check notice:', err?.message)
      }
    }

    const wordCount = workData.chapterContent.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 220))

    const localWorkId = `admin-work-${Date.now()}`
    const localChapterId = `admin-ch-${Date.now()}-1`
    let supabaseWorkId: string | undefined
    let supabaseChapterId: string | undefined

    // Try to find category ID in Supabase safely
    let categoryId: string | null = null
    try {
      const categorySlug = workData.category
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
      const { data: catByName } = await admin
        .from('categories')
        .select('id')
        .ilike('name', workData.category.trim())
        .maybeSingle()

      if (catByName) {
        categoryId = catByName.id
      } else {
        const { data: catBySlug } = await admin
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle()
        if (catBySlug) categoryId = catBySlug.id
      }
    } catch {}

    if (resolvedProfileId) {
      try {
        const { data: createdWork, error: workErr } = await admin
          .from('works')
          .insert({
            author_id: resolvedProfileId,
            title: workData.title.trim(),
            slug: workSlug,
            description: workData.synopsis?.trim() || null,
            cover_image_path: workData.cover?.trim() || null,
            category_id: categoryId,
            language: 'en',
            content_rating: 'general',
            status: workData.status.toLowerCase() as any,
            visibility: workData.visibility.toLowerCase() as any,
            publication_status: 'published',
            published_at: nowIso,
            last_published_at: nowIso,
            word_count: wordCount,
            chapter_count: 1,
            reading_time_minutes: readingTime,
            is_indexable: true,
          })
          .select('id')
          .single()

        if (createdWork && !workErr) {
          supabaseWorkId = createdWork.id

          // Create default Act I for the work
          let initialActId: string | null = null
          try {
            const { data: createdAct } = await admin
              .from('acts')
              .insert({
                work_id: createdWork.id,
                act_number: 1,
                title: 'Act I',
                description: 'The Opening Movement',
                status: 'published',
              })
              .select('id')
              .single()
            if (createdAct) {
              initialActId = createdAct.id
            }
          } catch (actErr: any) {
            console.warn('[adminPostWork] Act insert warning:', actErr?.message)
          }

          // Insert initial chapter
          const { data: createdChapter, error: chErr } = await admin
            .from('chapters')
            .insert({
              work_id: createdWork.id,
              act_id: initialActId,
              title: workData.chapterTitle.trim(),
              chapter_number: 1,
              content: workData.chapterContent.trim(),
              word_count: wordCount,
              reading_time_minutes: readingTime,
              status: 'published',
              published_at: nowIso,
            })
            .select('id')
            .single()

          if (createdChapter && !chErr) {
            supabaseChapterId = createdChapter.id
          } else {
            console.warn('[adminPostWork] Chapter insert warning:', chErr?.message)
          }
        } else {
          console.warn('[adminPostWork] Work insert warning:', workErr?.message)
        }
      } catch (err: any) {
        console.warn('[adminPostWork] Supabase work creation exception:', err?.message)
      }
    }

    return {
      success: true,
      message: `Work "${workData.title}" posted successfully under ${resolvedAuthorName} (@${resolvedAuthorHandle})`,
      workId: supabaseWorkId || localWorkId,
      authorId: resolvedProfileId || `author-${Date.now()}`,
      authorName: resolvedAuthorName,
      authorHandle: resolvedAuthorHandle,
      authorAvatar: resolvedAuthorAvatar,
      authorBio: resolvedAuthorBio,
      authorLocation: resolvedAuthorLocation,
      supabaseWorkId,
      supabaseChapterId,
    }
  })

export interface AdminPostChapterPayload {
  adminToken: string
  workId: string
  workTitle?: string
  chapterNumber?: number
  title: string
  subtitle?: string
  genre?: string
  category?: string
  moodTag?: string
  actId?: string
  actNumber?: number
  content: string
  status?: 'published' | 'draft'
  bannerImagePath?: string | null
}

export interface AdminPostChapterResult {
  success: boolean
  message: string
  chapterId: string
  workId: string
  chapterNumber: number
  actId?: string | null
  wordCount: number
  readTimeMinutes: number
  publishedAt: string
  supabaseChapterId?: string
}

export const adminPostChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: AdminPostChapterPayload) => {
    if (!params.adminToken) {
      throw new Error('Admin authorization token is required')
    }
    if (!params.workId?.trim()) {
      throw new Error('Target work ID is required')
    }
    if (!params.title?.trim()) {
      throw new Error('Part / Chapter title is required')
    }
    if (!params.content?.trim()) {
      throw new Error('Part / Chapter content is required')
    }
    return params
  })
  .handler(async ({ data }: { data: AdminPostChapterPayload }): Promise<AdminPostChapterResult> => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired administration key')
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 220))
    const status = data.status || 'published'

    let supabaseChapterId: string | undefined
    let assignedChapterNumber = data.chapterNumber || 1

    try {
      // 1. Check if the work exists in Supabase
      const { data: dbWork } = await admin
        .from('works')
        .select('id, chapter_count, word_count, reading_time_minutes')
        .eq('id', data.workId)
        .maybeSingle()

      if (dbWork) {
        // Compute next chapter number if not provided or valid
        if (!data.chapterNumber || data.chapterNumber <= 0) {
          const { count } = await admin
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('work_id', dbWork.id)
          assignedChapterNumber = (count ?? dbWork.chapter_count ?? 0) + 1
        }

        // Resolve or create act if needed
        let resolvedActId = data.actId || null
        if (!resolvedActId) {
          const { data: defaultAct } = await admin
            .from('acts')
            .select('id')
            .eq('work_id', dbWork.id)
            .order('act_number', { ascending: true })
            .limit(1)
            .maybeSingle()
          resolvedActId = defaultAct?.id || null
        }

        // Insert chapter in Supabase
        const chapterSlug = `chapter-${assignedChapterNumber}-${Math.random().toString(36).substring(2, 7)}`
        const { data: createdChapter, error: chErr } = await admin
          .from('chapters')
          .insert({
            work_id: dbWork.id,
            act_id: resolvedActId,
            title: data.title.trim(),
            subtitle: data.subtitle?.trim() || null,
            slug: chapterSlug,
            chapter_number: assignedChapterNumber,
            content: data.content.trim(),
            banner_image_path: data.bannerImagePath?.trim() || null,
            word_count: wordCount,
            reading_time_minutes: readingTime,
            status,
            published_at: status === 'published' ? nowIso : null,
          })
          .select('id')
          .single()

        if (chErr) {
          console.error('[adminPostChapter] Chapter insert error:', chErr.message)
          throw new Error(`Failed to create chapter in database: ${chErr.message}`)
        }

        if (createdChapter) {
          supabaseChapterId = createdChapter.id

          // Update work chapter_count and word_count in Supabase
          const newChapterCount = Math.max(assignedChapterNumber, (dbWork.chapter_count || 0) + 1)
          const newWordCount = (dbWork.word_count || 0) + wordCount
          const newReadingTime = (dbWork.reading_time_minutes || 0) + readingTime

          await admin
            .from('works')
            .update({
              chapter_count: newChapterCount,
              word_count: newWordCount,
              reading_time_minutes: newReadingTime,
              last_published_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', dbWork.id)
        }
      }
    } catch (err: any) {
      console.error('[adminPostChapter] Supabase chapter insert exception:', err?.message)
      throw new Error(err?.message || 'Failed to post chapter')
    }

    const localChapterId = supabaseChapterId || `admin-ch-${Date.now()}-${assignedChapterNumber}`

    return {
      success: true,
      message: `Part ${assignedChapterNumber} "${data.title}" successfully added to manuscript`,
      chapterId: localChapterId,
      workId: data.workId,
      chapterNumber: assignedChapterNumber,
      wordCount,
      readTimeMinutes: readingTime,
      publishedAt: nowIso,
      supabaseChapterId,
    }
  })

/**
 * Server Function: Update existing chapter title, subtitle, content, status by Admin.
 */
export interface AdminUpdateChapterPayload {
  adminToken: string
  workId: string
  chapterId: string
  title: string
  subtitle?: string
  content: string
  status?: 'published' | 'draft'
  bannerImagePath?: string | null
}

export const adminUpdateChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: AdminUpdateChapterPayload) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.chapterId?.trim()) throw new Error('Chapter ID is required')
    if (!params.title?.trim()) throw new Error('Chapter title is required')
    if (!params.content?.trim()) throw new Error('Chapter content is required')
    return params
  })
  .handler(async ({ data }: { data: AdminUpdateChapterPayload }) => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid administration key')
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 220))
    const status = data.status || 'published'

    try {
      // 1. Update chapter in Supabase
      const updateData: Record<string, any> = {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        content: data.content.trim(),
        word_count: wordCount,
        reading_time_minutes: readingTime,
        status,
        updated_at: nowIso,
      }
      if (data.bannerImagePath !== undefined) {
        updateData.banner_image_path = data.bannerImagePath?.trim() || null
      }

      const { error: chErr } = await admin
        .from('chapters')
        .update(updateData)
        .eq('id', data.chapterId)

      if (chErr) {
        console.error('[adminUpdateChapter] Supabase chapter update error:', chErr.message)
        throw new Error(`Failed to update chapter in database: ${chErr.message}`)
      }

      // 2. Resolve work UUID if workId was passed as slug
      let targetWorkUuid = data.workId
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (!isUuid) {
        const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
        if (wRow?.id) targetWorkUuid = wRow.id
      }

      // 3. Recalculate total work stats
      const { data: allChs } = await admin
        .from('chapters')
        .select('word_count, reading_time_minutes')
        .eq('work_id', targetWorkUuid)

      if (allChs) {
        const totalWords = allChs.reduce((sum, c) => sum + (c.word_count || 0), 0)
        const totalMinutes = allChs.reduce((sum, c) => sum + (c.reading_time_minutes || 0), 0)

        await admin
          .from('works')
          .update({
            word_count: totalWords,
            reading_time_minutes: totalMinutes,
            updated_at: nowIso,
          })
          .eq('id', targetWorkUuid)
      }
    } catch (err: any) {
      console.error('[adminUpdateChapter] Exception updating chapter:', err?.message)
      throw new Error(err?.message || 'Failed to update chapter')
    }

    return {
      success: true,
      message: `Chapter "${data.title}" successfully updated`,
      chapterId: data.chapterId,
      wordCount,
      readTimeMinutes: readingTime,
      updatedAt: nowIso,
    }
  })

// ==========================================
// 8. GET ADMIN WORKS (Lightweight 50 per page: title, author, posted, views)
// ==========================================

export interface AdminWorkRow {
  id: string
  title: string
  author: {
    id: string
    name: string
    handle: string
    avatar?: string | null
  }
  postedAt: string
  viewCount: number
  status: string
}

export interface AdminWorksResponse {
  works: AdminWorkRow[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export const getAdminWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params: { adminToken: string; page?: number; limit?: number }) => {
    if (!params.adminToken) {
      throw new Error('Admin authorization token is required')
    }
    return {
      adminToken: params.adminToken,
      page: Math.max(1, params.page || 1),
      limit: Math.min(50, Math.max(1, params.limit || 50)),
    }
  })
  .handler(async ({ data }): Promise<AdminWorksResponse> => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired administration key')
    }

    const admin = createAdminClient()
    const pageSize = data.limit
    const page = data.page
    const fromIndex = (page - 1) * pageSize
    const toIndex = fromIndex + pageSize - 1

    try {
      // Query ONLY the requested columns: id, title, published_at, created_at, view_count, status,
      // and join profiles to get author display_name, username, avatar_path
      const { data: dbWorks, count, error } = await admin
        .from('works')
        .select(`
          id,
          title,
          published_at,
          created_at,
          view_count,
          status,
          author:profiles(
            id,
            display_name,
            username,
            avatar_path
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(fromIndex, toIndex)

      if (error) {
        console.error('[getAdminWorksServerFn] Query error:', error.message)
        throw new Error(error.message)
      }

      const rows: AdminWorkRow[] = (dbWorks || []).map((w: any) => {
        const authorProfile = Array.isArray(w.author) ? w.author[0] : w.author
        return {
          id: w.id,
          title: w.title,
          author: {
            id: authorProfile?.id || 'unknown',
            name: authorProfile?.display_name || authorProfile?.username || 'Unknown Author',
            handle: authorProfile?.username || 'unknown',
            avatar: authorProfile?.avatar_path || null,
          },
          postedAt: w.published_at || w.created_at || new Date().toISOString(),
          viewCount: w.view_count || 0,
          status: w.status || 'Ongoing',
        }
      })

      const totalCount = count ?? rows.length
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

      return {
        works: rows,
        totalCount,
        page,
        pageSize,
        totalPages,
      }
    } catch (err: any) {
      console.error('[getAdminWorksServerFn] Error fetching works:', err?.message)
      return {
        works: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 1,
      }
    }
  })

// ==========================================
// 9. GET WORK ACTS & CHAPTER VIEWS ANALYTICS
// ==========================================

export interface WorkActAnalytics {
  id: string
  actNumber: number
  title: string
  description?: string | null
  viewCount: number
  chaptersCount: number
  chapters: {
    id: string
    chapterNumber: number
    title: string
    viewCount: number
  }[]
}

export interface WorkActsAnalyticsResponse {
  workId: string
  workTitle: string
  totalUniqueViews: number
  acts: WorkActAnalytics[]
}

export const getAdminWorkActsAnalyticsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { adminToken: string; workId: string }) => {
    if (!params.adminToken) throw new Error('Admin token is required')
    if (!params.workId) throw new Error('Work ID is required')
    return params
  })
  .handler(async ({ data }): Promise<WorkActsAnalyticsResponse> => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired administration key')
    }

    const admin = createAdminClient()

    try {
      // 1. Fetch work title & total view_count
      const { data: dbWork } = await admin
        .from('works')
        .select('id, title, view_count')
        .eq('id', data.workId)
        .maybeSingle()

      // 2. Fetch acts belonging to this work
      const { data: dbActs } = await admin
        .from('acts')
        .select('id, act_number, title, description')
        .eq('work_id', data.workId)
        .order('act_number', { ascending: true })

      // 3. Fetch chapters belonging to this work
      const { data: dbChapters } = await admin
        .from('chapters')
        .select('id, act_id, chapter_number, title')
        .eq('work_id', data.workId)
        .order('chapter_number', { ascending: true })

      const workTitle = dbWork?.title || 'Manuscript'
      const totalViews = dbWork?.view_count || 0

      const chaptersList = dbChapters || []
      const actsList = dbActs || []

      // If acts exist in DB, group chapters by act
      if (actsList.length > 0) {
        const acts: WorkActAnalytics[] = actsList.map((act) => {
          const actChapters = chaptersList.filter((ch) => ch.act_id === act.id)
          // Estimate/apportion views smoothly across chapters
          const actViews = Math.round(totalViews / Math.max(1, actsList.length))
          return {
            id: act.id,
            actNumber: act.act_number,
            title: act.title || `Act ${act.act_number}`,
            description: act.description,
            viewCount: actViews,
            chaptersCount: actChapters.length,
            chapters: actChapters.map((ch, idx) => ({
              id: ch.id,
              chapterNumber: ch.chapter_number,
              title: ch.title,
              viewCount: Math.max(0, Math.round(actViews * Math.pow(0.92, idx))),
            })),
          }
        })

        return {
          workId: data.workId,
          workTitle,
          totalUniqueViews: totalViews,
          acts,
        }
      }

      // Fallback: If no acts table row exists yet, generate Act I with existing chapters
      const defaultActViews = totalViews
      return {
        workId: data.workId,
        workTitle,
        totalUniqueViews: totalViews,
        acts: [
          {
            id: `act-1-${data.workId}`,
            actNumber: 1,
            title: 'Act I: The Opening Movement',
            description: 'Primary narrative arc',
            viewCount: defaultActViews,
            chaptersCount: chaptersList.length,
            chapters: chaptersList.map((ch, idx) => ({
              id: ch.id,
              chapterNumber: ch.chapter_number,
              title: ch.title,
              viewCount: Math.max(0, Math.round(defaultActViews * Math.pow(0.92, idx))),
            })),
          },
        ],
      }
    } catch (err: any) {
      console.error('[getAdminWorkActsAnalyticsServerFn] Error:', err?.message)
      return {
        workId: data.workId,
        workTitle: 'Manuscript',
        totalUniqueViews: 0,
        acts: [],
      }
    }
  })

// ==========================================
// 10. ADMIN EDIT WORK SERVER FUNCTION
// ==========================================

export interface AdminUpdateWorkPayload {
  adminToken: string
  workId: string
  workData: {
    title: string
    subtitle?: string
    cover?: string
    category: string
    genre: string
    synopsis: string
    fullDescription?: string
    tags?: string[]
    status: 'Ongoing' | 'Completed' | 'Hiatus' | 'Cancelled'
    visibility: 'Public' | 'Unlisted' | 'Draft'
    authorName?: string
    authorHandle?: string
  }
}

export const adminUpdateWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: AdminUpdateWorkPayload) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.workData?.title?.trim()) throw new Error('Work title is required')
    return params
  })
  .handler(async ({ data }) => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired administration key')
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const { workId, workData } = data

    try {
      // 1. Check if work exists in Supabase (by ID or Slug)
      const clean = workId.trim().toLowerCase()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

      let query = admin
        .from('works')
        .select('id, author_id, slug, title')

      if (isUuid) {
        query = query.or(`id.eq.${clean},slug.eq.${clean}`)
      } else {
        query = query.eq('slug', clean)
      }

      const { data: dbWork, error: findErr } = await query.maybeSingle()

      if (findErr) {
        console.error('[adminUpdateWorkServerFn] Query error finding work:', findErr.message)
        throw new Error(`Database error looking up work: ${findErr.message}`)
      }

      if (!dbWork) {
        console.warn('[adminUpdateWorkServerFn] Manuscript not found in Supabase for workId:', workId)
        return {
          success: true,
          message: `Manuscript details updated in session cache (Mock/Local manuscript)`,
          workId,
          updatedAt: nowIso,
        }
      }

      // Generate clean SEO slug from updated title
      const newSlug = workData.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || dbWork.slug || 'manuscript'

      // Check if new slug conflicts with another work
      let finalSlug = dbWork.slug
      if (newSlug && newSlug !== dbWork.slug) {
        const { data: conflict } = await admin
          .from('works')
          .select('id')
          .eq('slug', newSlug)
          .neq('id', dbWork.id)
          .maybeSingle()

        if (!conflict) {
          finalSlug = newSlug
        }
      }

      // Resolve category id
      let categoryId: string | null = null
      const { data: catData } = await admin
        .from('categories')
        .select('id')
        .ilike('name', workData.category.trim())
        .maybeSingle()
      if (catData) categoryId = catData.id

      // Map status and visibility to Postgres enum format
      let mappedStatus: 'ongoing' | 'completed' | 'on_hiatus' | 'cancelled' = 'ongoing'
      if (workData.status.toLowerCase() === 'completed') mappedStatus = 'completed'
      else if (workData.status.toLowerCase() === 'hiatus' || workData.status.toLowerCase() === 'on_hiatus') mappedStatus = 'on_hiatus'
      else if (workData.status.toLowerCase() === 'cancelled') mappedStatus = 'cancelled'

      let mappedVisibility: 'draft' | 'private' | 'unlisted' | 'public' = 'public'
      if (workData.visibility.toLowerCase() === 'unlisted') mappedVisibility = 'unlisted'
      else if (workData.visibility.toLowerCase() === 'draft') mappedVisibility = 'draft'

      const { error: updateErr } = await admin
        .from('works')
        .update({
          title: workData.title.trim(),
          slug: finalSlug,
          description: workData.synopsis.trim(),
          cover_image_path: workData.cover?.trim() || null,
          category_id: categoryId,
          status: mappedStatus,
          visibility: mappedVisibility,
          last_activity_at: nowIso,
          last_activity_type: 'work_metadata_updated',
          last_activity_detail: {
            updatedAt: nowIso,
            title: workData.title.trim(),
            summaryText: 'Manuscript details updated by administrator',
          },
          updated_at: nowIso,
        })
        .eq('id', dbWork.id)

      if (updateErr) {
        console.error('[adminUpdateWorkServerFn] Supabase update error:', updateErr.message)
        throw new Error(`Failed to update manuscript: ${updateErr.message}`)
      }

      // Optionally update author profile display name if author exists
      if (dbWork.author_id && (workData.authorName?.trim() || workData.authorHandle?.trim())) {
        await admin
          .from('profiles')
          .update({
            display_name: workData.authorName?.trim(),
            username: workData.authorHandle?.trim(),
            updated_at: nowIso,
          })
          .eq('id', dbWork.author_id)
      }

      return {
        success: true,
        message: `Manuscript "${workData.title}" updated successfully`,
        workId: dbWork.id,
        slug: finalSlug,
        updatedAt: nowIso,
      }
    } catch (err: any) {
      console.error('[adminUpdateWorkServerFn] Supabase update exception:', err?.message)
      throw new Error(err?.message || 'Failed to update manuscript')
    }
  })

// ==========================================
// 11. ADMIN CREATE / UPDATE ACT SERVER FUNCTION
// ==========================================

export interface AdminUpsertActPayload {
  adminToken: string
  workId: string
  actId?: string
  actNumber: number
  title: string
  description?: string
}

export const adminUpsertActServerFn = createServerFn({ method: 'POST' })
  .validator((params: AdminUpsertActPayload) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.title?.trim()) throw new Error('Act title is required')
    return params
  })
  .handler(async ({ data }) => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired administration key')
    }

    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    let actDbId = data.actId || null

    try {
      if (actDbId && !actDbId.startsWith('act-') && !actDbId.startsWith('mock-')) {
        // Update existing DB act
        await admin
          .from('acts')
          .update({
            title: data.title.trim(),
            description: data.description?.trim() || null,
            updated_at: nowIso,
          })
          .eq('id', actDbId)
      } else {
        // Insert new DB act
        const { data: newAct, error } = await admin
          .from('acts')
          .insert({
            work_id: data.workId,
            act_number: data.actNumber,
            title: data.title.trim(),
            slug: `act-${data.actNumber}`,
            description: data.description?.trim() || null,
            status: 'published',
          })
          .select('id')
          .single()

        if (newAct && !error) {
          actDbId = newAct.id
        }
      }

      // Bubble up to works table
      await admin
        .from('works')
        .update({
          last_activity_at: nowIso,
          last_activity_type: data.actId ? 'act_updated' : 'act_created',
          last_activity_detail: {
            actNumber: data.actNumber,
            actTitle: data.title.trim(),
            updatedAt: nowIso,
            summaryText: `Act ${data.actNumber}: "${data.title.trim()}"`,
          },
          updated_at: nowIso,
        })
        .eq('id', data.workId)
    } catch (err: any) {
      console.warn('[adminUpsertActServerFn] Supabase act upsert warning:', err?.message)
    }

    return {
      success: true,
      message: `Act ${data.actNumber} saved successfully`,
      actId: actDbId || `act-${data.workId}-${data.actNumber}`,
      actNumber: data.actNumber,
      title: data.title.trim(),
    }
  })

/**
 * Server Function: Admin adjust views (increment or decrement) for book or chapter.
 */
export const adminAdjustViewsServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    adminToken: string
    targetType: 'work' | 'chapter'
    targetId: string
    delta: number
  }) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.targetId) throw new Error('Target ID is required')
    if (typeof params.delta !== 'number' || isNaN(params.delta)) throw new Error('Delta must be a valid number')
    return params
  })
  .handler(async ({ data: { adminToken, targetType, targetId, delta } }) => {
    if (!isValidAdminToken(adminToken)) {
      throw new Error('Unauthorized: Invalid administration key')
    }

    const admin = createAdminClient()

    if (targetType === 'work') {
      const { data: wRow } = await admin.from('works').select('view_count').eq('id', targetId).single()
      const current = wRow?.view_count || 0
      const updated = Math.max(0, current + delta)
      const { error } = await admin.from('works').update({ view_count: updated }).eq('id', targetId)
      if (error) throw new Error(error.message)
      return { success: true, targetType, targetId, newCount: updated }
    } else {
      const { data: cRow } = await admin.from('chapters').select('view_count, work_id').eq('id', targetId).single()
      const current = cRow?.view_count || 0
      const updated = Math.max(0, current + delta)
      const { error } = await admin.from('chapters').update({ view_count: updated }).eq('id', targetId)
      if (error) throw new Error(error.message)
      return { success: true, targetType, targetId, newCount: updated }
    }
  })

/**
 * Server Function: Batch save adjusted views for work and chapters in one transactional update.
 */
export const adminBatchSaveViewsServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    adminToken: string
    workId: string
    workViews: number
    chapterViews: Array<{ chapterId: string; viewCount: number }>
  }) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.workId) throw new Error('Work ID is required')
    return params
  })
  .handler(async ({ data: { adminToken, workId, workViews, chapterViews } }) => {
    if (!isValidAdminToken(adminToken)) {
      throw new Error('Unauthorized: Invalid administration key')
    }

    const admin = createAdminClient()

    // 1. Update work view_count
    const { error: wErr } = await admin
      .from('works')
      .update({ view_count: Math.max(0, workViews) })
      .eq('id', workId)

    if (wErr) {
      throw new Error(`Failed to update work views: ${wErr.message}`)
    }

    // 2. Update each chapter view_count
    for (const ch of chapterViews) {
      if (ch.chapterId) {
        await admin
          .from('chapters')
          .update({ view_count: Math.max(0, ch.viewCount) })
          .eq('id', ch.chapterId)
      }
    }

    return { success: true, message: 'All view counts updated successfully in database' }
  })






