import { supabase } from '../client'
import type { Database } from '../types'

export type LibraryItemRow = Database['public']['Tables']['library_items']['Row']
export type ReadingProgressRow = Database['public']['Tables']['reading_progress']['Row']

/**
 * Get works saved in a user's personal Library with strict field selection and pagination.
 */
export async function getReaderLibrary(
  userId: string,
  options?: { limit?: number; offset?: number }
) {
  const { limit = 20, offset = 0 } = options || {}
  const boundedLimit = Math.min(Math.max(1, limit), 50)

  const { data, error } = await supabase
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
        author:profiles!works_author_id_fkey(
          id,
          username,
          display_name,
          avatar_path
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + boundedLimit - 1)

  if (error) {
    console.error('[getReaderLibrary] Error:', error.message)
    return []
  }
  return data
}

/**
 * Save a Work to a user's library.
 * Returns only the newly created library record ID and association.
 */
export async function saveWorkToLibrary(userId: string, workId: string) {
  const { data, error } = await supabase
    .from('library_items')
    .insert({ user_id: userId, work_id: workId })
    .select('id, user_id, work_id, created_at')
    .single()

  if (error) {
    console.error('[saveWorkToLibrary] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Remove a Work from a user's library.
 */
export async function removeWorkFromLibrary(userId: string, workId: string) {
  const { error } = await supabase
    .from('library_items')
    .delete()
    .eq('user_id', userId)
    .eq('work_id', workId)

  if (error) {
    console.error('[removeWorkFromLibrary] Error:', error.message)
    throw new Error(error.message)
  }
  return true
}

/**
 * Retrieve the current reading position of a reader in a specific Work.
 * Explicitly fetches only the reading coordinates and percentage.
 */
export async function getReadingProgress(userId: string, workId: string) {
  const { data, error } = await supabase
    .from('reading_progress')
    .select('id, user_id, work_id, chapter_id, progress_percent, position, last_read_at')
    .eq('user_id', userId)
    .eq('work_id', workId)
    .maybeSingle()

  if (error) {
    console.error('[getReadingProgress] Error:', error.message)
    return null
  }
  return data
}

/**
 * Upsert the reader's current progress in a Work.
 * Returns only updated coordinates.
 */
export async function updateReadingProgress(
  userId: string,
  workId: string,
  chapterId: string,
  progressPercent: number,
  position?: string
) {
  const { data, error } = await supabase
    .from('reading_progress')
    .upsert(
      {
        user_id: userId,
        work_id: workId,
        chapter_id: chapterId,
        progress_percent: Math.min(100, Math.max(0, progressPercent)),
        position: position || null,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,work_id' }
    )
    .select('id, user_id, work_id, chapter_id, progress_percent, position, last_read_at')
    .single()

  if (error) {
    console.error('[updateReadingProgress] Error:', error.message)
    throw new Error(error.message)
  }
  return data
}

/**
 * Log a meaningful reading session into history.
 */
export async function recordReadingHistory(
  userId: string,
  workId: string,
  chapterId: string | null,
  durationSeconds: number,
  completed: boolean = false
) {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('reading_history')
    .insert({
      user_id: userId,
      work_id: workId,
      chapter_id: chapterId,
      duration_seconds: durationSeconds,
      started_at: now,
      last_read_at: now,
      completed_at: completed ? now : null,
    })
    .select('id, user_id, work_id, chapter_id, duration_seconds, started_at, completed_at')
    .single()

  if (error) {
    console.error('[recordReadingHistory] Error:', error.message)
    return null
  }
  return data
}
