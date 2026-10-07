import { createServerFn } from '@tanstack/react-start'
import {
  getPublicAuthor,
  getAuthorPublishedWorks,
} from '../lib/supabase/queries/authors'

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
    const { getUserProfileByClerkId } = await import('../lib/supabase/queries/authors')
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
  }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    return params
  })
  .handler(async ({ data }) => {
    const { syncClerkUserToProfile } = await import('../lib/supabase/queries/authors')
    return await syncClerkUserToProfile(data)
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
    pronouns: string
    gender: string
    termsAccepted: boolean
    interests: Array<{ id: string; name: string }>
    genres: Array<{ id: string; name: string }>
    categories: Array<{ id: string; name: string }>
  }) => {
    if (!params.clerkUserId) throw new Error('clerkUserId is required')
    if (!params.username) throw new Error('username is required')
    return params
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    const preferencesPayload = {
      interests: data.interests,
      genres: data.genres,
      categories: data.categories,
      termsAccepted: data.termsAccepted,
      completedAt: new Date().toISOString(),
    }

    const displayName = (data.displayName && data.displayName.trim()) || data.username

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
          preferences: preferencesPayload,
          is_public: true,
          account_status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id, clerk_user_id, username, display_name, avatar_path, bio, pronouns, gender, onboarding_completed, preferences, is_public, account_status')
      .single()

    if (error) {
      console.error('[saveUserOnboardingServerFn] Error persisting onboarding profile:', error.message)
      throw new Error(error.message)
    }

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
      }
    }

    const { data: updated, error } = await admin
      .from('profiles')
      .update(updates)
      .eq('clerk_user_id', data.clerkUserId)
      .select('id, clerk_user_id, username, display_name, avatar_path, bio, location, website_url, pronouns, gender, onboarding_completed, preferences, is_public, account_status')
      .single()

    if (error) {
      console.error('[updateUserProfileServerFn] Error:', error.message)
      if (error.code === '23505') {
        throw new Error(`The username "${data.username}" is already taken. Please choose another username.`)
      }
      throw new Error(error.message)
    }

    return updated
  })
