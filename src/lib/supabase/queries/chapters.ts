import { supabase } from '../client'
import type { Database, ChapterStatus } from '../types'

export type ChapterRow = Database['public']['Tables']['chapters']['Row']
export type ChapterInsert = Database['public']['Tables']['chapters']['Insert']
export type ChapterUpdate = Database['public']['Tables']['chapters']['Update']

/**
 * Get all lightweight chapter metadata for a specific Work.
 * Strictly avoids fetching heavy chapter body `content` to optimize Work page performance.
 * Respects RLS: readers will only receive published chapters; author receives all.
 */
export async function getWorkChapters(workId: string) {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, excerpt, word_count, reading_time_minutes, status, published_at, created_at')
    .eq('work_id', workId)
    .order('chapter_number', { ascending: true })

  if (error) {
    console.error(`[getWorkChapters] Error fetching work ${workId}:`, error.message)
    return []
  }
  return data
}

/**
 * Get a specific chapter by its sequential number within a Work.
 * Used exclusively by the Chapter Reader when rendering the full text.
 */
export async function getChapterByNumber(workId: string, chapterNumber: number) {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, content, excerpt, word_count, reading_time_minutes, status, published_at')
    .eq('work_id', workId)
    .eq('chapter_number', chapterNumber)
    .single()

  if (error) {
    console.error(`[getChapterByNumber] Error fetching work ${workId} ch ${chapterNumber}:`, error.message)
    return null
  }
  return data
}

/**
 * Get a specific chapter by its unique ID with full text content.
 */
export async function getChapterById(chapterId: string) {
  const { data, error } = await supabase
    .from('chapters')
    .select('id, work_id, chapter_number, title, slug, content, excerpt, word_count, reading_time_minutes, status, published_at')
    .eq('id', chapterId)
    .single()

  if (error) {
    console.error(`[getChapterById] Error fetching chapter ${chapterId}:`, error.message)
    return null
  }
  return data
}

/**
 * Create a new Chapter draft for a Work.
 * Returns only necessary created chapter metadata.
 */
export async function createChapter(
  workId: string,
  payload: {
    chapter_number: number
    title: string
    slug: string
    content: string
    excerpt?: string
    word_count?: number
    reading_time_minutes?: number
  }
) {
  const { data, error } = await supabase
    .from('chapters')
    .insert({
      work_id: workId,
      chapter_number: payload.chapter_number,
      title: payload.title.trim(),
      slug: payload.slug.trim().toLowerCase(),
      content: payload.content,
      excerpt: payload.excerpt?.trim() || null,
      word_count: payload.word_count || payload.content.trim().split(/\s+/).length,
      reading_time_minutes: payload.reading_time_minutes || Math.ceil(payload.content.trim().split(/\s+/).length / 200),
      status: 'draft',
    })
    .select('id, work_id, chapter_number, title, slug, word_count, reading_time_minutes, status, created_at')
    .single()

  if (error) {
    console.error('[createChapter] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Update an existing Chapter's content, title, or metadata.
 * Returns only necessary updated chapter metadata.
 */
export async function updateChapter(
  chapterId: string,
  updates: Partial<ChapterUpdate>
) {
  const { data, error } = await supabase
    .from('chapters')
    .update(updates)
    .eq('id', chapterId)
    .select('id, work_id, chapter_number, title, slug, word_count, reading_time_minutes, status, updated_at')
    .single()

  if (error) {
    console.error('[updateChapter] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Publish a Chapter to make it available to readers.
 */
export async function publishChapter(chapterId: string) {
  const now = new Date().toISOString()
  return updateChapter(chapterId, {
    status: 'published',
    published_at: now,
  })
}
