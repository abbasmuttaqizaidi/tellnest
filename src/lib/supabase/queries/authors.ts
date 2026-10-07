import { supabase } from '../client'
import { createAdminClient } from '../server'
import type { Database } from '../types'

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * Get an author's public profile by their unique canonical username.
 * Strictly excludes private identifiers (Clerk user ID, private email, internal flags).
 */
export async function getPublicAuthor(username: string) {
  const normalizedUsername = username.toLowerCase().trim()

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      display_name,
      bio,
      avatar_path,
      website_url,
      location,
      pronouns,
      preferences,
      is_verified,
      created_at,
      links:profile_links(platform, url, display_order)
    `)
    .eq('username', normalizedUsername)
    .eq('is_public', true)
    .eq('account_status', 'active')
    .single()

  if (error) {
    console.error(`[getPublicAuthor] Error fetching '${username}':`, error.message)
    return null
  }
  return data
}

/**
 * Get all published works by an author with pagination and card-specific projection.
 */
export async function getAuthorPublishedWorks(
  authorId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 20, offset = 0 } = options || {}
  const boundedLimit = Math.min(Math.max(1, limit), 50)

  const { data, error } = await supabase
    .from('works')
    .select(`
      id,
      title,
      slug,
      description,
      cover_image_path,
      status,
      word_count,
      chapter_count,
      reading_time_minutes,
      view_count,
      like_count,
      save_count,
      published_at,
      category:categories(id, name, slug)
    `)
    .eq('author_id', authorId)
    .eq('visibility', 'public')
    .eq('publication_status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + boundedLimit - 1)

  if (error) {
    console.error(`[getAuthorPublishedWorks] Error fetching author ${authorId}:`, error.message)
    return []
  }
  return data
}

/**
 * Syncs a Clerk User into Tellnest's `profiles` table.
 * Uses the Service Role client to ensure reliable synchronization during webhooks or login hooks.
 * Projects only safe identity fields.
 */
export async function syncClerkUserToProfile(params: {
  clerkUserId: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string | null
}) {
  const admin = createAdminClient()

  const payload: Record<string, any> = {
    clerk_user_id: params.clerkUserId,
    username: params.username.toLowerCase().trim(),
    display_name: params.displayName,
    avatar_path: params.avatarUrl || null,
    is_public: true,
    account_status: 'active',
  }

  if (params.bio !== undefined) {
    payload.bio = params.bio
  }

  const { data, error } = await admin
    .from('profiles')
    .upsert(payload, { onConflict: 'clerk_user_id' })
    .select('id, clerk_user_id, username, display_name, avatar_path, bio, is_public, account_status')
    .single()

  if (error) {
    console.error('[syncClerkUserToProfile] Error syncing Clerk user:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Updates an author's profile details in Supabase
 */
export async function updateAuthorProfile(clerkUserId: string, updates: {
  username?: string
  displayName?: string
  bio?: string | null
}) {
  const admin = createAdminClient()
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString()
  }
  if (updates.username) payload.username = updates.username.toLowerCase().trim()
  if (updates.displayName) payload.display_name = updates.displayName
  if (updates.bio !== undefined) payload.bio = updates.bio

  const { data, error } = await admin
    .from('profiles')
    .update(payload)
    .eq('clerk_user_id', clerkUserId)
    .select('id, clerk_user_id, username, display_name, avatar_path, bio, is_public, account_status')
    .single()

  if (error) {
    console.error('[updateAuthorProfile] Error updating author profile:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Get a user's full profile by their clerk_user_id.
 */
export async function getUserProfileByClerkId(clerkUserId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select(`
      id,
      clerk_user_id,
      username,
      display_name,
      bio,
      avatar_path,
      website_url,
      location,
      is_verified,
      pronouns,
      gender,
      onboarding_completed,
      preferences,
      created_at,
      links:profile_links(platform, url, display_order)
    `)
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (error) {
    console.error('[getUserProfileByClerkId] Error:', error.message)
    return null
  }

  if (!data) return null

  // Fetch live dynamic stats, authored works, and saved library items from the database
  const [
    { count: followersCount },
    { count: followingCount },
    { count: savedWorksCount },
    { count: authoredWorksCount },
    { data: authoredWorks },
    { data: libraryRecords },
  ] = await Promise.all([
    admin.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
    admin.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', data.id),
    admin.from('library_items').select('*', { count: 'exact', head: true }).eq('user_id', data.id),
    admin.from('works').select('*', { count: 'exact', head: true }).eq('author_id', data.id),
    admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        status,
        visibility,
        publication_status,
        chapter_count,
        word_count,
        reading_time_minutes,
        view_count,
        like_count,
        save_count,
        published_at,
        created_at,
        updated_at,
        category:categories(id, name, slug)
      `)
      .eq('author_id', data.id)
      .order('updated_at', { ascending: false }),
    admin
      .from('library_items')
      .select(`
        id,
        created_at,
        work:works(
          id,
          title,
          slug,
          description,
          cover_image_path,
          status,
          chapter_count,
          word_count,
          published_at,
          category:categories(id, name, slug),
          author:profiles!works_author_id_fkey(
            id,
            username,
            display_name,
            avatar_path
          )
        )
      `)
      .eq('user_id', data.id)
      .order('created_at', { ascending: false }),
  ])

  return {
    ...data,
    authoredWorks: authoredWorks ?? [],
    savedWorks: (libraryRecords ?? []).map((item: any) => item.work).filter(Boolean),
    stats: {
      followersCount: followersCount ?? 0,
      followingCount: followingCount ?? 0,
      savedWorksCount: savedWorksCount ?? 0,
      authoredWorksCount: authoredWorksCount ?? 0,
    },
  }
}
