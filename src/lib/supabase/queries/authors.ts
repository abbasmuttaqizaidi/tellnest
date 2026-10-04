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
}) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .upsert(
      {
        clerk_user_id: params.clerkUserId,
        username: params.username.toLowerCase().trim(),
        display_name: params.displayName,
        avatar_path: params.avatarUrl || null,
        is_public: true,
        account_status: 'active',
      },
      { onConflict: 'clerk_user_id' }
    )
    .select('id, clerk_user_id, username, display_name, avatar_path, is_public, account_status')
    .single()

  if (error) {
    console.error('[syncClerkUserToProfile] Error syncing Clerk user:', error.message)
    throw new Error(error.message)
  }
  return data
}
