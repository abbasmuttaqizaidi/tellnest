import { createServerFn } from '@tanstack/react-start'
import {
  getReaderLibrary,
  saveWorkToLibrary,
  removeWorkFromLibrary,
  getReadingProgress,
  updateReadingProgress,
} from '../lib/supabase/queries/reader'

/**
 * Server Function: Get user's personal Library with strict pagination.
 */
export const getReaderLibraryServerFn = createServerFn({ method: 'GET' })
  .validator((params: { userId: string; limit?: number; offset?: number }) => {
    if (!params.userId) throw new Error('User ID is required')
    return {
      userId: params.userId,
      limit: Math.min(Math.max(1, params.limit || 20), 50),
      offset: Math.max(0, params.offset || 0),
    }
  })
  .handler(async ({ data }) => {
    return await getReaderLibrary(data.userId, { limit: data.limit, offset: data.offset })
  })

/**
 * Server Function: Save a work to library.
 */
export const saveWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await saveWorkToLibrary(data.userId, data.workId)
  })

/**
 * Server Function: Remove a work from library.
 */
export const removeWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await removeWorkFromLibrary(data.userId, data.workId)
  })

/**
 * Server Function: Get reading progress coordinates.
 */
export const getReadingProgressServerFn = createServerFn({ method: 'GET' })
  .validator((params: { userId: string; workId: string }) => {
    if (!params.userId || !params.workId) throw new Error('userId and workId are required')
    return params
  })
  .handler(async ({ data }) => {
    return await getReadingProgress(data.userId, data.workId)
  })

/**
 * Server Function: Update reading progress coordinates.
 */
export const updateReadingProgressServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    userId: string
    workId: string
    chapterId: string
    progressPercent: number
    position?: string
  }) => {
    if (!params.userId || !params.workId || !params.chapterId) {
      throw new Error('userId, workId, and chapterId are required')
    }
    return {
      ...params,
      progressPercent: Math.min(100, Math.max(0, params.progressPercent)),
    }
  })
  .handler(async ({ data }) => {
    return await updateReadingProgress(
      data.userId,
      data.workId,
      data.chapterId,
      data.progressPercent,
      data.position
    )
  })
