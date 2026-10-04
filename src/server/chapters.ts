import { createServerFn } from '@tanstack/react-start'
import {
  getWorkChapters,
  getChapterByNumber,
  getChapterById,
  createChapter,
  updateChapter,
  publishChapter,
} from '../lib/supabase/queries/chapters'

/**
 * Server Function: Get lightweight chapter list for a Work detail page.
 * Returns titles, numbers, reading times, but strictly OMITS full chapter body content.
 */
export const getWorkChaptersServerFn = createServerFn({ method: 'GET' })
  .validator((workId: string) => {
    if (!workId || typeof workId !== 'string') {
      throw new Error('Valid workId is required')
    }
    return workId
  })
  .handler(async ({ data: workId }) => {
    return await getWorkChapters(workId)
  })

/**
 * Server Function: Get full chapter text for the Chapter Reader.
 * Fetches content ONLY for the specific chapter being read.
 */
export const getChapterContentServerFn = createServerFn({ method: 'GET' })
  .validator((params: { workId: string; chapterNumber: number }) => {
    if (!params.workId || typeof params.chapterNumber !== 'number') {
      throw new Error('Valid workId and chapterNumber are required')
    }
    return params
  })
  .handler(async ({ data }) => {
    return await getChapterByNumber(data.workId, data.chapterNumber)
  })

/**
 * Server Function: Create a new chapter draft for a Work.
 */
export const createChapterServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    workId: string
    chapter_number: number
    title: string
    slug: string
    content: string
    excerpt?: string
  }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.title?.trim()) throw new Error('Chapter title is required')
    if (typeof payload.chapter_number !== 'number') throw new Error('Chapter number is required')
    return payload
  })
  .handler(async ({ data }) => {
    return await createChapter(data.workId, data)
  })

/**
 * Server Function: Update an existing chapter's title or content.
 */
export const updateChapterServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    chapterId: string
    title?: string
    content?: string
    excerpt?: string
  }) => {
    if (!payload.chapterId) throw new Error('Chapter ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    const { chapterId, ...updates } = data
    return await updateChapter(chapterId, updates)
  })

/**
 * Server Function: Publish a chapter and optionally dispatch background content moderation.
 */
export const publishChapterServerFn = createServerFn({ method: 'POST' })
  .validator((chapterId: string) => {
    if (!chapterId) throw new Error('Chapter ID is required')
    return chapterId
  })
  .handler(async ({ data: chapterId }) => {
    const published = await publishChapter(chapterId)

    // Optional background non-blocking invocation to content-moderation edge function
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey && published) {
      fetch(`${supabaseUrl}/functions/v1/content-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          targetType: 'chapter',
          targetId: chapterId,
          content: `${published?.title || ''}\n${published?.slug || ''}`,
        }),
      }).catch((err) => {
        console.warn('[publishChapterServerFn] Background moderation trigger warning:', err?.message)
      })
    }

    return published
  })
