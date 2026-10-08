import { createServerFn } from '@tanstack/react-start'
import {
  getPublicWorkBySlug,
  getDiscoverWorks,
  getWorkById,
  createWork,
  updateWork,
  publishWork,
} from '../lib/supabase/queries/works'
import type { WorkStatus } from '../lib/supabase/types'

/**
 * Server Function: Get a single public work by its canonical slug.
 * Returns only necessary display fields; does NOT include chapter bodies.
 */
export const getPublicWorkServerFn = createServerFn({ method: 'GET' })
  .validator((slug: string) => {
    if (typeof slug !== 'string' || !slug.trim()) {
      throw new Error('Valid work slug is required')
    }
    return slug.trim().toLowerCase()
  })
  .handler(async ({ data: slug }) => {
    return await getPublicWorkBySlug(slug)
  })

/**
 * Server Function: Get paginated discovery feed.
 * Enforces pagination limits (max 50) and filters.
 */
export const getDiscoverWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { categoryId?: string; status?: WorkStatus; limit?: number; offset?: number }) => {
    const limit = Math.min(Math.max(1, params?.limit || 20), 50)
    const offset = Math.max(0, params?.offset || 0)
    return {
      categoryId: params?.categoryId,
      status: params?.status,
      limit,
      offset,
    }
  })
  .handler(async ({ data }) => {
    return await getDiscoverWorks(data)
  })

/**
 * Server Function: Create a new Work draft in Writer Studio.
 * Validates inputs and creates a minimal draft.
 */
export const createWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    authorProfileId: string
    title: string
    slug: string
    description?: string
    cover_image_path?: string
    category_id?: string
    language?: string
  }) => {
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    if (!payload.title || payload.title.trim().length < 2) throw new Error('Title must be at least 2 characters')
    if (!payload.slug || payload.slug.trim().length < 2) throw new Error('Slug must be at least 2 characters')

    return {
      ...payload,
      title: payload.title.trim(),
      slug: payload.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    }
  })
  .handler(async ({ data }) => {
    return await createWork(data.authorProfileId, data)
  })

/**
 * Server Function: Update an existing Work.
 * Enforces IDOR protection by checking authorProfileId.
 */
export const updateWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    workId: string
    authorProfileId: string
    updates: {
      title?: string
      description?: string
      cover_image_path?: string
      category_id?: string
    }
  }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    return await updateWork(data.workId, data.authorProfileId, data.updates)
  })

/**
 * Server Function: Publish a Work.
 * Enforces author IDOR check and triggers background content moderation if configured.
 */
export const publishWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: { workId: string; authorProfileId: string; visibility?: 'public' | 'unlisted' }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    const published = await publishWork(data.workId, data.authorProfileId, data.visibility || 'public')

    // Optional background non-blocking invocation to content-moderation edge function
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/content-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          targetType: 'work',
          targetId: data.workId,
          content: `${published?.title || ''}\n${published?.description || ''}`,
        }),
      }).catch((err) => {
        // Log background error without interrupting user response
        console.warn('[publishWorkServerFn] Non-blocking moderation trigger error:', err?.message)
      })
    }

    return published
  })

/**
 * Server Function: Get all published works with dynamic collection attributes.
 * Backed directly by PostgreSQL works_with_collections view.
 * Exposes new_this_week, new_chapters_this_week, and collection string array.
 */
export const getPlatformWorksServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    try {
      const q = `
        SELECT
          w.id,
          w.title,
          w.slug,
          w.description,
          w.cover_image_path,
          w.status,
          w.visibility,
          w.publication_status,
          w.word_count,
          w.chapter_count,
          w.reading_time_minutes,
          w.view_count,
          w.like_count,
          w.save_count,
          w.created_at,
          w.updated_at,
          w.last_activity_at,
          w.last_activity_type,
          w.last_activity_detail,
          w.new_this_week,
          w.new_chapters_this_week,
          w.collections,
          p.id AS author_id,
          p.display_name AS author_name,
          p.username AS author_handle,
          p.avatar_path AS author_avatar,
          p.bio AS author_bio,
          c.name AS category_name,
          c.slug AS category_slug,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', a.id,
                  'workId', a.work_id,
                  'number', a.act_number,
                  'title', a.title,
                  'slug', a.slug,
                  'description', a.description,
                  'status', a.status,
                  'chapters', COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', ch.id,
                          'workId', ch.work_id,
                          'number', ch.chapter_number,
                          'title', ch.title,
                          'slug', ch.slug,
                          'content', ch.content,
                          'wordCount', ch.word_count,
                          'readTimeMinutes', ch.reading_time_minutes,
                          'status', ch.status,
                          'publishedAt', ch.published_at,
                          'actId', ch.act_id,
                          'actNumber', a.act_number,
                          'actTitle', a.title
                        ) ORDER BY ch.chapter_number ASC
                      )
                      FROM chapters ch
                      WHERE ch.act_id = a.id
                    ),
                    '[]'
                  )
                ) ORDER BY a.act_number ASC
              )
              FROM acts a
              WHERE a.work_id = w.id
            ),
            '[]'
          ) AS acts,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ch.id,
                  'workId', ch.work_id,
                  'number', ch.chapter_number,
                  'title', ch.title,
                  'slug', ch.slug,
                  'content', ch.content,
                  'wordCount', ch.word_count,
                  'readTimeMinutes', ch.reading_time_minutes,
                  'status', ch.status,
                  'publishedAt', ch.published_at,
                  'actId', ch.act_id
                ) ORDER BY ch.chapter_number ASC
              )
              FROM chapters ch
              WHERE ch.work_id = w.id
            ),
            '[]'
          ) AS chapters
        FROM works_with_collections w
        LEFT JOIN profiles p ON p.id = w.author_id
        LEFT JOIN categories c ON c.id = w.category_id
        WHERE w.visibility = 'public' AND w.publication_status = 'published'
        ORDER BY w.last_activity_at DESC NULLS LAST;
      `

      // Use pg client via service connection for complex lateral aggregates
      const { Client } = await import('pg')
      const client = new Client({
        connectionString:
          process.env.DATABASE_URL ||
          'postgresql://postgres:cvp1EbYv4LR4fkiV@db.amplbczsaqtleoshttsb.supabase.co:5432/postgres',
      })
      await client.connect()
      const res = await client.query(q)
      await client.end()

      return (res.rows || []).map((row: any) => {
        let mappedStatus: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled' = 'Ongoing'
        if (row.status === 'completed') mappedStatus = 'Completed'
        else if (row.status === 'on_hiatus') mappedStatus = 'On Hiatus'
        else if (row.status === 'cancelled') mappedStatus = 'Cancelled'

        return {
          id: row.id,
          title: row.title,
          subtitle: '',
          cover: row.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
          category: row.category_name || 'Novels',
          categorySlug: row.category_slug || 'novels',
          genre: 'Literary Fiction',
          genreSlug: 'literary-fiction',
          tags: ['Serialized', 'Archival'],
          language: row.language || 'English',
          status: mappedStatus,
          visibility: (row.visibility === 'public' ? 'Public' : 'Unlisted') as any,
          isMature: false,
          featured: true,
          trending: (row.collections || []).includes('trending_now'),
          rising: (row.collections || []).includes('rising_stories'),
          editorPick: (row.collections || []).includes('editor_picks'),
          new_this_week: Boolean(row.new_this_week),
          new_chapters_this_week: Boolean(row.new_chapters_this_week),
          collection: row.collections || [],
          synopsis: row.description || '',
          fullDescription: row.description || '',
          chaptersCount: row.chapters?.length || row.chapter_count || 1,
          publishedChaptersCount: (row.chapters || []).filter((c: any) => c.status === 'published').length || 1,
          totalReads: String(row.view_count || '0'),
          totalSaves: Number(row.save_count || 0),
          ratingScore: 5.0,
          ratingCount: 0,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : row.created_at,
          lastActivityType: row.last_activity_type,
          lastActivityDetail: row.last_activity_detail,
          author: {
            id: row.author_id || 'author-unknown',
            name: row.author_name || 'Hatchpen Author',
            handle: row.author_handle || 'author',
            avatar: row.author_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
            bio: row.author_bio || '',
            location: '',
            worksCount: 1,
            followersCount: '0',
          },
          acts: row.acts || [],
          chapters: row.chapters || [],
        }
      })
    } catch (err: any) {
      console.warn('[getPlatformWorksServerFn] Fallback / error fetching DB works:', err?.message)
      return []
    }
  })
