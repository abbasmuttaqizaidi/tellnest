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
