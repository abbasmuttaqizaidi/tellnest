import { supabase } from '../client'
import type { Database, WorkStatus, WorkVisibility, PublicationStatus, ContentRating } from '../types'

export type WorkRow = Database['public']['Tables']['works']['Row']
export type WorkInsert = Database['public']['Tables']['works']['Insert']
export type WorkUpdate = Database['public']['Tables']['works']['Update']

/**
 * Get a public or unlisted published work by its canonical slug.
 * Explicitly selects only fields needed for public work presentation.
 * Does not fetch full chapter content, internal audit logs, or private data.
 */
export async function getPublicWorkBySlug(slug: string) {
  const { data, error } = await supabase
    .from('works')
    .select(`
      id,
      author_id,
      title,
      slug,
      description,
      cover_image_path,
      language,
      status,
      visibility,
      publication_status,
      content_rating,
      content_warning_required,
      content_warning_text,
      reading_time_minutes,
      word_count,
      chapter_count,
      view_count,
      like_count,
      save_count,
      comment_count,
      published_at,
      author:profiles!works_author_id_fkey(
        id,
        username,
        display_name,
        avatar_path,
        bio,
        location,
        is_verified
      ),
      category:categories(id, name, slug),
      genres:work_genres(genre:genres(id, name, slug)),
      tags:work_tags(tag:tags(id, name, slug)),
      content_warnings:work_content_warnings(warning:content_warnings(id, name, slug))
    `)
    .eq('slug', slug)
    .in('visibility', ['public', 'unlisted'])
    .eq('publication_status', 'published')
    .single()

  if (error) {
    console.error(`[getPublicWorkBySlug] Error fetching slug '${slug}':`, error.message)
    return null
  }
  return data
}

/**
 * Get a work by its unique ID for metadata views.
 */
export async function getWorkById(id: string) {
  const { data, error } = await supabase
    .from('works')
    .select(`
      id,
      author_id,
      title,
      slug,
      description,
      cover_image_path,
      language,
      status,
      visibility,
      publication_status,
      content_rating,
      reading_time_minutes,
      word_count,
      chapter_count,
      view_count,
      like_count,
      save_count,
      comment_count,
      published_at,
      created_at,
      updated_at,
      author:profiles!works_author_id_fkey(
        id,
        username,
        display_name,
        avatar_path,
        is_verified
      ),
      category:categories(id, name, slug)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error(`[getWorkById] Error fetching work '${id}':`, error.message)
    return null
  }
  return data
}

/**
 * Get public discoverable works ordered by recency, engagement, or filter.
 * Strict field projection: returns only data required by Work Cards.
 * Enforces pagination via range().
 */
export async function getDiscoverWorks(options?: {
  categoryId?: string
  status?: WorkStatus
  limit?: number
  offset?: number
}) {
  const { categoryId, status, limit = 20, offset = 0 } = options || {}
  const boundedLimit = Math.min(Math.max(1, limit), 50)

  let query = supabase
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
      author:profiles!works_author_id_fkey(
        id,
        username,
        display_name,
        avatar_path,
        is_verified
      ),
      category:categories(id, name, slug)
    `)
    .eq('visibility', 'public')
    .eq('publication_status', 'published')
    .eq('is_indexable', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + boundedLimit - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[getDiscoverWorks] Error:', error.message)
    return []
  }
  return data
}

/**
 * Get public works within a specific category slug.
 */
export async function getCategoryWorks(categorySlug: string, limit = 20, offset = 0) {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single()

  if (!category) return []

  return getDiscoverWorks({ categoryId: category.id, limit, offset })
}

/**
 * Create a new Work draft in Writer Studio.
 * Returns only the necessary created metadata fields.
 */
export async function createWork(
  authorProfileId: string,
  payload: {
    title: string
    slug: string
    description?: string
    cover_image_path?: string
    category_id?: string
    language?: string
    content_rating?: ContentRating
  }
) {
  const { data, error } = await supabase
    .from('works')
    .insert({
      author_id: authorProfileId,
      title: payload.title.trim(),
      slug: payload.slug.trim().toLowerCase(),
      description: payload.description?.trim() || null,
      cover_image_path: payload.cover_image_path || null,
      category_id: payload.category_id || null,
      language: payload.language || 'en',
      content_rating: payload.content_rating || 'general',
      visibility: 'draft',
      publication_status: 'draft',
      status: 'ongoing',
    })
    .select('id, title, slug, description, cover_image_path, status, visibility, publication_status, created_at')
    .single()

  if (error) {
    console.error('[createWork] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Update an existing Work.
 * Enforces IDOR protection via authorProfileId check.
 */
export async function updateWork(
  workId: string,
  authorProfileId: string,
  updates: Partial<WorkUpdate>
) {
  const { data, error } = await supabase
    .from('works')
    .update(updates)
    .eq('id', workId)
    .eq('author_id', authorProfileId)
    .select('id, title, slug, description, cover_image_path, status, visibility, publication_status, updated_at')
    .single()

  if (error) {
    console.error('[updateWork] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Publish a Work to the public or unlisted catalog.
 */
export async function publishWork(
  workId: string,
  authorProfileId: string,
  visibility: 'public' | 'unlisted' = 'public'
) {
  const now = new Date().toISOString()
  return updateWork(workId, authorProfileId, {
    visibility,
    publication_status: 'published',
    published_at: now,
    last_published_at: now,
  })
}
