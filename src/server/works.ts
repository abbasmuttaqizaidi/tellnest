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
