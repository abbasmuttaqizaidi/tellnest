import { createServerFn } from '@tanstack/react-start'
import {
  getPublicAuthor,
  getAuthorPublishedWorks,
} from '../lib/supabase/queries/authors.ts'

/**
 * Server Function: Get an author's public profile.
 * Only returns intentionally public fields.
 */
export const getPublicAuthorServerFn = createServerFn({ method: 'GET' })
  .validator((username: string) => {
    if (!username || typeof username !== 'string') {
      throw new Error('Valid author username is required')
    }
    return username.trim().toLowerCase()
  })
  .handler(async ({ data: username }) => {
    return await getPublicAuthor(username)
  })

/**
 * Server Function: Get a user's profile by their Clerk ID directly from Supabase.
 */
export const getUserProfileServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      throw new Error('Valid Clerk User ID is required')
    }
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }) => {
    const { getUserProfileByClerkId } = await import('../lib/supabase/queries/authors.ts')
    return await getUserProfileByClerkId(clerkUserId)
  })

/**
 * Server Function: Get an author's published works with pagination.
 */
export const getAuthorPublishedWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params: { authorId: string; limit?: number; offset?: number }) => {
    if (!params.authorId) throw new Error('Author ID is required')
    return {
      authorId: params.authorId,
      limit: Math.min(Math.max(1, params.limit || 20), 50),
      offset: Math.max(0, params.offset || 0),
    }
  })
  .handler(async ({ data }) => {
    return await getAuthorPublishedWorks(data.authorId, {
      limit: data.limit,
      offset: data.offset,
    })
  })

/**
 * Server Function: Sync a Clerk user into Supabase profiles on the server with admin client.
 */
export const syncClerkUserServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    clerkUserId: string
    username: string
    displayName: string
    avatarUrl?: string | null
    email?: string | null
  }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    return params
  })
  .handler(async ({ data }) => {
    const { syncClerkUserToProfile } = await import('../lib/supabase/queries/authors.ts')
    return await syncClerkUserToProfile(data)
  })

const userPresenceRateLimitMap = new Map<string, number>()

/**
 * Server Function: Records lightweight presence heartbeat for authenticated user.
 * Throttled to max 1 DB update per 60 seconds per user.
 */
export const recordUserPresenceServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string }) => {
    if (!params.clerkUserId || typeof params.clerkUserId !== 'string') {
      throw new Error('clerkUserId is required')
    }
    return { clerkUserId: params.clerkUserId.trim() }
  })
  .handler(async ({ data: { clerkUserId } }) => {
    const now = Date.now()
    const lastPing = userPresenceRateLimitMap.get(clerkUserId) || 0
    if (now - lastPing < 60_000) {
      return { success: true, throttled: true }
    }
    userPresenceRateLimitMap.set(clerkUserId, now)

    if (userPresenceRateLimitMap.size > 5000) {
      for (const [key, ts] of userPresenceRateLimitMap.entries()) {
        if (now - ts > 300_000) {
          userPresenceRateLimitMap.delete(key)
        }
      }
    }

    try {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      const admin = createAdminClient()
      await admin
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('clerk_user_id', clerkUserId)
      return { success: true }
    } catch {
      return { success: false }
    }
  })

/**
 * Server Function: Save onboarding details into Supabase database for the user.
 */
export const saveUserOnboardingServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    clerkUserId: string
    username: string
    displayName?: string
    avatarUrl?: string
    email?: string
    pronouns: string
    gender: string
    termsAccepted: boolean
    interests: Array<{ id: string; name: string }>
    genres: Array<{ id: string; name: string }>
    categories: Array<{ id: string; name: string }>
    interestedInWriting?: boolean
  }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    if (!params.username) throw new Error('username is required')
    return params
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // Query existing profile to preserve any existing preferences (e.g. reading settings)
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, preferences')
      .eq('clerk_user_id', data.clerkUserId)
      .maybeSingle()

    const currentPrefs =
      existingProfile?.preferences && typeof existingProfile.preferences === 'object'
        ? (existingProfile.preferences as Record<string, any>)
        : {}

    const displayName = (data.displayName && data.displayName.trim()) || data.username

    const preferencesPayload: Record<string, any> = {
      ...currentPrefs,
      interests: data.interests,
      genres: data.genres,
      categories: data.categories,
      interestedInWriting: Boolean(data.interestedInWriting),
      termsAccepted: data.termsAccepted,
      completedAt: new Date().toISOString(),
      username_verified: true,
      verified_username: data.username.toLowerCase().trim(),
      username_verified_at: currentPrefs.username_verified_at || new Date().toISOString(),
      username_last_changed_at: currentPrefs.username_last_changed_at || new Date().toISOString(),
    }

    // Tareeqa B: Send Welcome Email via Resend on onboarding completion if not sent yet
    const alreadySentWelcome = Boolean(currentPrefs.welcomeEmailSent)
    if (!alreadySentWelcome && data.email && data.email.includes('@')) {
      try {
        const { sendWelcomeEmail } = await import('../lib/email/resend')
        await sendWelcomeEmail({
          email: data.email,
          displayName,
          username: data.username,
        })
        preferencesPayload.welcomeEmailSent = true
        preferencesPayload.welcomeEmailSentAt = new Date().toISOString()
      } catch (emailErr) {
        console.warn('[saveUserOnboardingServerFn] Non-blocking welcome email dispatch error:', emailErr)
      }
    }

    // Upsert into Supabase `profiles` table to ensure record exists with dedicated columns
    const { data: profile, error } = await admin
      .from('profiles')
      .upsert(
        {
          clerk_user_id: data.clerkUserId,
          username: data.username.toLowerCase().trim(),
          display_name: displayName,
          avatar_path: data.avatarUrl || '/unisex-avatar.svg',
          pronouns: data.pronouns || null,
          gender: data.gender || null,
          onboarding_completed: true,
          is_username_verified: true,
          preferences: preferencesPayload,
          is_public: true,
          account_status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id, clerk_user_id, username, display_name, avatar_path, bio, pronouns, gender, onboarding_completed, is_username_verified, preferences, is_public, account_status')
      .single()

    if (error) {
      console.error('[saveUserOnboardingServerFn] Error persisting onboarding profile:', error.message)
      throw new Error(error.message)
    }

    // Ensure user_preferences row is also initialized in database
    if (profile?.id) {
      try {
        await admin
          .from('user_preferences')
          .upsert({ user_id: profile.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      } catch (prefErr) {
        console.warn('[saveUserOnboardingServerFn] Non-blocking user_preferences init:', prefErr)
      }
    }

    // Ensure username is recorded in the dedicated usernames table
    try {
      await admin
        .from('usernames')
        .upsert({ username: data.username.toLowerCase().trim() }, { onConflict: 'username' })
    } catch (uErr) {
      console.warn('[saveUserOnboardingServerFn] Non-blocking usernames reservation:', uErr)
    }

    // Also update Clerk public metadata so Clerk token immediately reflects onboarding status
    try {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY
      if (clerkSecretKey) {
        await fetch(`https://api.clerk.com/v1/users/${data.clerkUserId}/metadata`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              onboardingCompleted: true,
            },
          }),
        })
      }
    } catch (clerkSyncErr) {
      console.warn('[saveUserOnboardingServerFn] Non-blocking warning syncing Clerk metadata:', clerkSyncErr)
    }

    // Invalidate profile cache so recommendation signals immediately reflect newly chosen preferences
    invalidateProfileCache(data.clerkUserId)

    return profile
  })

/**
 * Server Function: Update author profile details (display name, username, bio, location, website, pronouns, preferences) in Supabase.
 */
export const updateUserProfileServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    clerkUserId: string
    username?: string
    displayName?: string
    bio?: string | null
    location?: string | null
    websiteUrl?: string | null
    avatarUrl?: string | null
    pronouns?: string | null
    gender?: string | null
    preferences?: Record<string, any>
  }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    return params
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (data.displayName !== undefined) updates.display_name = data.displayName.trim()
    if (data.username !== undefined && data.username.trim()) {
      const normalized = data.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
      if (normalized.length < 3) {
        throw new Error('Username must be at least 3 characters and contain only lowercase letters, numbers, and underscores.')
      }
      if (normalized.length > 30) {
        throw new Error('Username cannot exceed 30 characters.')
      }
      updates.username = normalized
    }
    if (data.bio !== undefined) updates.bio = data.bio?.trim() || null
    if (data.location !== undefined) updates.location = data.location?.trim() || null
    if (data.websiteUrl !== undefined) updates.website_url = data.websiteUrl?.trim() || null
    if (data.avatarUrl !== undefined) updates.avatar_path = data.avatarUrl || null
    if (data.pronouns !== undefined) updates.pronouns = data.pronouns?.trim() || null
    if (data.gender !== undefined) updates.gender = data.gender || null

    if (data.preferences !== undefined) {
      const { data: existing } = await admin
        .from('profiles')
        .select('preferences')
        .eq('clerk_user_id', data.clerkUserId)
        .maybeSingle()

      const currentPrefs = (existing?.preferences && typeof existing.preferences === 'object') ? existing.preferences : {}
      updates.preferences = {
        ...currentPrefs,
        ...data.preferences,
        ...(data.preferences.reading ? {
          reading: {
            ...((currentPrefs.reading && typeof currentPrefs.reading === 'object') ? currentPrefs.reading : {}),
            ...data.preferences.reading,
          },
        } : {}),
        ...(data.preferences.readerUx ? {
          readerUx: {
            ...((currentPrefs.readerUx && typeof currentPrefs.readerUx === 'object') ? currentPrefs.readerUx : {}),
            ...data.preferences.readerUx,
          },
        } : {}),
        ...(data.preferences.notifications ? {
          notifications: {
            ...((currentPrefs.notifications && typeof currentPrefs.notifications === 'object') ? currentPrefs.notifications : {}),
            ...data.preferences.notifications,
          },
        } : {}),
      }
    }

    let { data: updated, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('clerk_user_id', data.clerkUserId)
      .select('id, clerk_user_id, username, display_name, avatar_path, bio, location, website_url, pronouns, gender, onboarding_completed, preferences, is_public, account_status')
      .single()

    // Gracefully self-heal if profile record did not exist yet in database
    if (error && (error.code === 'PGRST116' || error.message?.includes('0 rows'))) {
      const upsertRes = await admin
        .from('profiles')
        .upsert(
          {
            clerk_user_id: data.clerkUserId,
            username: updates.username || ('user_' + data.clerkUserId.slice(-6).toLowerCase()),
            display_name: updates.display_name || 'HatchPen Member',
            avatar_path: updates.avatar_path || null,
            bio: updates.bio || null,
            location: updates.location || null,
            website_url: updates.website_url || null,
            pronouns: updates.pronouns || null,
            gender: updates.gender || null,
            is_public: true,
            account_status: 'active',
            preferences: updates.preferences || {},
            updated_at: updates.updated_at,
          },
          { onConflict: 'clerk_user_id' }
        )
        .select('id, clerk_user_id, username, display_name, avatar_path, bio, location, website_url, pronouns, gender, onboarding_completed, preferences, is_public, account_status')
        .single()
      updated = upsertRes.data
      error = upsertRes.error
    }

    if (error) {
      console.error('[updateUserProfileServerFn] Error:', error.message)
      if (error.code === '23505') {
        throw new Error(`The username "${data.username}" is already taken. Please choose another username.`)
      }
      throw new Error(error.message)
    }

    invalidateProfileCache(data.clerkUserId)

    return updated
  })

/**
 * Server Function: Toggle follow status for an author in PostgreSQL.
 * Inserts/Deletes from `follows` table, and creates a real-time notification in `notifications` table on follow.
 */
export const toggleFollowAuthorServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; targetAuthorId: string }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    if (!params.targetAuthorId) throw new Error('targetAuthorId is required')
    return {
      clerkUserId: params.clerkUserId.trim(),
      targetAuthorId: params.targetAuthorId.trim(),
    }
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve follower profile ID
    let { data: followerProfile } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_path')
      .eq('clerk_user_id', data.clerkUserId)
      .maybeSingle()

    if (!followerProfile?.id) {
      const minimalUsername = `user_${data.clerkUserId.slice(0, 8)}`
      const { data: newProfile, error: createErr } = await admin
        .from('profiles')
        .upsert(
          {
            clerk_user_id: data.clerkUserId,
            username: minimalUsername,
            display_name: 'Reader',
            is_public: true,
          },
          { onConflict: 'clerk_user_id' }
        )
        .select('id, username, display_name, avatar_path')
        .single()

      if (createErr || !newProfile) {
        throw new Error(`Failed to resolve follower profile: ${createErr?.message}`)
      }
      followerProfile = newProfile
    }

    // 2. Resolve target author profile UUID
    const cleanTarget = data.targetAuthorId.replace(/^@/, '').trim()
    let targetProfileId = cleanTarget
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTarget)

    if (!isTargetUuid) {
      const { data: authorProf } = await admin
        .from('profiles')
        .select('id')
        .or(`username.eq.${cleanTarget.toLowerCase()},clerk_user_id.eq.${cleanTarget}`)
        .maybeSingle()

      if (authorProf?.id) {
        targetProfileId = authorProf.id
      } else {
        // If target is a static catalog author (e.g. auth-1, kenjitakahashi), auto-provision a profile row so follows foreign key succeeds
        const cleanHandle = cleanTarget.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30)
        const { data: mockProfile } = await admin
          .from('profiles')
          .upsert(
            {
              clerk_user_id: `static_${cleanHandle}`,
              username: cleanHandle,
              display_name: cleanTarget,
              is_public: true,
            },
            { onConflict: 'clerk_user_id' }
          )
          .select('id')
          .single()

        if (mockProfile?.id) {
          targetProfileId = mockProfile.id
        }
      }
    }

    // Prevent following oneself
    if (followerProfile.id === targetProfileId) {
      return { success: false, isFollowing: false, message: 'You cannot follow yourself' }
    }

    const nowIso = new Date().toISOString()

    // 3. Check if already following
    const { data: existingFollow } = await admin
      .from('follows')
      .select('id')
      .eq('follower_id', followerProfile.id)
      .eq('following_id', targetProfileId)
      .maybeSingle()

    let isFollowing = false

    if (existingFollow) {
      // Unfollow: delete row
      await admin
        .from('follows')
        .delete()
        .eq('id', existingFollow.id)

      isFollowing = false
    } else {
      // Follow: insert row
      const { error: insErr } = await admin
        .from('follows')
        .insert({
          follower_id: followerProfile.id,
          following_id: targetProfileId,
          created_at: nowIso,
        })

      if (insErr) {
        console.error('[toggleFollowAuthorServerFn] Follow insert error:', insErr.message)
        throw new Error(insErr.message)
      }

      isFollowing = true

      // Avoid spamming duplicate new_follower notifications on rapid toggle
      const { data: existingNotif } = await admin
        .from('notifications')
        .select('id')
        .eq('user_id', targetProfileId)
        .eq('actor_id', followerProfile.id)
        .eq('type', 'new_follower')
        .maybeSingle()

      if (!existingNotif) {
        // Create notification row for the author
        await admin
          .from('notifications')
          .insert({
            user_id: targetProfileId,
            type: 'new_follower',
            actor_id: followerProfile.id,
            metadata: {
              actorName: followerProfile.display_name || followerProfile.username || 'A reader',
              actorAvatar: followerProfile.avatar_path || '/unisex-avatar.svg',
              actorHandle: followerProfile.username,
              title: 'New Follower',
              description: `${followerProfile.display_name || followerProfile.username} started following your literary catalog.`,
              targetUrl: `/author/${followerProfile.username || followerProfile.id}`,
            },
            created_at: nowIso,
          })
      }
    }

    // 4. Return updated follower count for the author and current user's followed author IDs
    const [{ count: authorFollowersCount }, { data: allFollowed }] = await Promise.all([
      admin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetProfileId),
      admin
        .from('follows')
        .select(`
          following_id,
          following:profiles!follows_following_id_fkey(id, username, clerk_user_id)
        `)
        .eq('follower_id', followerProfile.id),
    ])

    const ids = new Set<string>()
    for (const r of (allFollowed || []) as any[]) {
      if (r.following_id) ids.add(r.following_id)
      const targetProf = Array.isArray(r.following) ? r.following[0] : r.following
      if (targetProf) {
        if (targetProf.id) ids.add(targetProf.id)
        if (targetProf.username) ids.add(targetProf.username.toLowerCase())
        if (targetProf.clerk_user_id) {
          ids.add(targetProf.clerk_user_id)
          if (targetProf.clerk_user_id.startsWith('static_')) {
            ids.add(targetProf.clerk_user_id.replace('static_', ''))
          }
        }
      }
    }

    return {
      success: true,
      isFollowing,
      authorFollowersCount: authorFollowersCount ?? 0,
      followedAuthorIds: Array.from(ids),
      targetAuthorId: targetProfileId,
    }
  })

/**
 * Server Function: Get user's followed author IDs from PostgreSQL.
 */
export const getUserFollowedAuthorIdsServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId) throw new Error('clerkUserId is required')
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    const profile = await getCachedProfileByClerkId(admin, clerkUserId)
    if (!profile?.id) return { followedAuthorIds: [] }

    const { data: records } = await admin
      .from('follows')
      .select(`
        following_id,
        following:profiles!follows_following_id_fkey(id, username, clerk_user_id)
      `)
      .eq('follower_id', profile.id)

    const ids = new Set<string>()
    for (const r of (records || []) as any[]) {
      if (r.following_id) ids.add(r.following_id)
      const targetProf = Array.isArray(r.following) ? r.following[0] : r.following
      if (targetProf) {
        if (targetProf.id) ids.add(targetProf.id)
        if (targetProf.username) ids.add(targetProf.username.toLowerCase())
        if (targetProf.clerk_user_id) {
          ids.add(targetProf.clerk_user_id)
          if (targetProf.clerk_user_id.startsWith('static_')) {
            ids.add(targetProf.clerk_user_id.replace('static_', ''))
          }
        }
      }
    }

    return {
      followedAuthorIds: Array.from(ids),
    }
  })

/**
 * Server Function: Get user's notifications directly from PostgreSQL.
 */
export const getUserNotificationsServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId) throw new Error('clerkUserId is required')
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    const profile = await getCachedProfileByClerkId(admin, clerkUserId)
    if (!profile?.id) return { notifications: [], profileId: null }

    const { data: dbNotifs, error } = await admin
      .from('notifications')
      .select(`
        id,
        type,
        actor_id,
        work_id,
        chapter_id,
        metadata,
        read_at,
        created_at,
        actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_path)
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('[getUserNotificationsServerFn] Error fetching notifications:', error.message)
      return { notifications: [], profileId: profile.id }
    }

    const notifications = (dbNotifs || []).map((n: any) => {
      const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor
      const meta = n.metadata || {}

      let uiType: 'publish' | 'update' | 'comment' | 'milestone' = 'update'
      if (n.type === 'new_chapter') uiType = 'publish'
      else if (n.type === 'comment' || n.type === 'comment_reply') uiType = 'comment'

      const timeAgo = n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Recently'

      return {
        id: n.id,
        type: uiType,
        actorName: meta.actorName || actor?.display_name || actor?.username || 'A reader',
        actorAvatar: meta.actorAvatar || actor?.avatar_path || '/unisex-avatar.svg',
        title: meta.title || (n.type === 'new_follower' ? 'New Follower' : 'Activity Alert'),
        description: meta.description || (n.type === 'new_follower' ? `${actor?.display_name || 'A reader'} followed you.` : 'Activity on your work'),
        targetUrl: meta.targetUrl || '/write',
        timestamp: timeAgo,
        isRead: Boolean(n.read_at),
      }
    })

    return { notifications, profileId: profile.id }
  })

/**
 * Server Function: Persist notification read status directly in PostgreSQL.
 */
export const markNotificationReadServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; notificationId?: string; markAll?: boolean }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    return params
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', data.clerkUserId)
      .maybeSingle()

    if (!profile?.id) return { success: false }

    const nowIso = new Date().toISOString()
    if (data.markAll) {
      await admin
        .from('notifications')
        .update({ read_at: nowIso })
        .eq('user_id', profile.id)
        .is('read_at', null)
    } else if (data.notificationId) {
      await admin
        .from('notifications')
        .update({ read_at: nowIso })
        .eq('id', data.notificationId)
        .eq('user_id', profile.id)
    }

    return { success: true }
  })

// ============================================================================
// PERFORMANCE OPTIMIZATION: Profile In-Memory Cache & Session Bootstrap
// ============================================================================

export interface UserSessionBootstrap {
  profileId: string | null
  profile: any
  bookmarkIds: string[]
  followedAuthorIds: string[]
  notifications: any[]
  readingProgress: any[]
}

const userProfileCache = new Map<string, { profile: any; timestamp: number }>()

export async function getCachedProfileByClerkId(admin: any, clerkUserId: string) {
  const cached = userProfileCache.get(clerkUserId)
  if (cached && Date.now() - cached.timestamp < 60_000) {
    return cached.profile
  }
  const { data: profile } = await admin
    .from('profiles')
    .select('id, clerk_user_id, username, display_name, preferences, avatar_path')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()
  if (profile) {
    userProfileCache.set(clerkUserId, { profile, timestamp: Date.now() })
  }
  return profile
}

export function invalidateProfileCache(clerkUserId: string) {
  userProfileCache.delete(clerkUserId)
}

/**
 * High-Performance Aggregated Session Bootstrap:
 * Replaces 5 separate client roundtrips with 1 unified database query pipeline.
 * Fetches profile, bookmarks, follows, notifications, and reading progress in parallel.
 */
export const getUserSessionBootstrapServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId || typeof clerkUserId !== 'string') throw new Error('clerkUserId is required')
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }): Promise<UserSessionBootstrap> => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve Profile once with 60s in-memory caching
    const profile = await getCachedProfileByClerkId(admin, clerkUserId)
    if (!profile?.id) {
      return {
        profileId: null,
        profile: null,
        bookmarkIds: [],
        followedAuthorIds: [],
        notifications: [],
        readingProgress: [],
      }
    }

    const profileId = profile.id

    // 2. Concurrently fetch bookmarks, follows, notifications, reading progress
    const [
      bookmarksRes,
      followsRes,
      notifsRes,
      authorWorksRes,
      readingProgressRes,
    ] = await Promise.all([
      // Bookmarks
      admin
        .from('bookmarks')
        .select('work_id, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false }),

      // Follows
      admin
        .from('follows')
        .select(`
          following_id,
          following:profiles!follows_following_id_fkey(id, username, clerk_user_id)
        `)
        .eq('follower_id', profileId),

      // Notifications
      admin
        .from('notifications')
        .select(`
          id,
          type,
          actor_id,
          work_id,
          chapter_id,
          metadata,
          read_at,
          created_at,
          actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_path)
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Author's own works to exclude from reading progress
      admin
        .from('works')
        .select('id')
        .eq('author_id', profileId),

      // Reading Progress
      admin
        .from('reading_progress')
        .select(`
          id,
          user_id,
          work_id,
          chapter_id,
          progress_percent,
          position,
          last_read_at,
          chapter:chapters(id, chapter_number, title)
        `)
        .eq('user_id', profileId)
        .order('last_read_at', { ascending: false }),
    ])

    // Format Bookmarks
    const bookmarkIds = (bookmarksRes.data || []).map((b: any) => b.work_id)

    // Format Follows
    const followIds = new Set<string>()
    for (const r of (followsRes.data || []) as any[]) {
      if (r.following_id) followIds.add(r.following_id)
      const targetProf = Array.isArray(r.following) ? r.following[0] : r.following
      if (targetProf) {
        if (targetProf.id) followIds.add(targetProf.id)
        if (targetProf.username) followIds.add(targetProf.username.toLowerCase())
        if (targetProf.clerk_user_id) {
          followIds.add(targetProf.clerk_user_id)
          if (targetProf.clerk_user_id.startsWith('static_')) {
            followIds.add(targetProf.clerk_user_id.replace('static_', ''))
          }
        }
      }
    }

    // Format Notifications
    const notifications = (notifsRes.data || []).map((n: any) => {
      const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor
      const meta = n.metadata || {}
      let uiType: 'publish' | 'update' | 'comment' | 'milestone' = 'update'
      if (n.type === 'new_chapter') uiType = 'publish'
      else if (n.type === 'comment' || n.type === 'comment_reply') uiType = 'comment'
      else if (n.type === 'milestone') uiType = 'milestone'

      return {
        id: n.id,
        type: uiType,
        workId: n.work_id,
        chapterId: n.chapter_id,
        actorName: actor?.display_name || actor?.username || 'An author',
        actorAvatar: actor?.avatar_path || '/unisex-avatar.svg',
        message: meta.message || (n.type === 'new_chapter' ? 'released a new chapter' : 'updated their story'),
        timestamp: n.created_at,
        isRead: Boolean(n.read_at),
      }
    })

    // Format Reading Progress (filter own works and attach chapter details)
    const authorWorkIds = new Set((authorWorksRes.data || []).map((w: any) => w.id))
    const readingProgress = (readingProgressRes.data || [])
      .filter((r: any) => !authorWorkIds.has(r.work_id))
      .map((r: any) => {
        const ch = Array.isArray(r.chapter) ? r.chapter[0] : r.chapter
        return {
          id: r.id,
          user_id: r.user_id,
          work_id: r.work_id,
          chapter_id: r.chapter_id,
          progress_percent: Math.min(100, Math.max(0, Math.round(Number(r.progress_percent || 0)))),
          position: r.position,
          last_read_at: r.last_read_at,
          chapter_number: ch?.chapter_number || null,
          chapter_title: ch?.title || null,
        }
      })

    return {
      profileId,
      profile,
      bookmarkIds,
      followedAuthorIds: Array.from(followIds),
      notifications,
      readingProgress,
    }
  })


