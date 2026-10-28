import type { Work } from '../../data/mockData.ts'
import { parseTotalReads } from '../utils.ts'
import { getWorkPublishedChapterCount } from './bingeable.ts'

export interface TopShelfOptions {
  currentUserId?: string | null
  currentUserProfileId?: string | null
  limit?: number
}

/**
 * Validates whether a work meets the eligibility baseline for the Top Shelf section.
 */
export function isWorkTopShelfEligible(work: Work): boolean {
  if (!work) return false

  const vis = (work.visibility || '').toLowerCase().trim()
  const status = (work.status || '').toLowerCase().trim()
  const pubStatus = (
    (work as any).publication_status ||
    (work as any).publicationStatus ||
    'published'
  )
    .toLowerCase()
    .trim()

  const isPublic = vis === 'public'
  const isNotCancelled = status !== 'cancelled'
  const isNotDraft = status !== 'draft' && pubStatus !== 'draft'
  const isIndexable = work.isIndexable !== false
  const hasPublishedChapter = getWorkPublishedChapterCount(work) >= 1

  return isPublic && isNotCancelled && isNotDraft && isIndexable && hasPublishedChapter
}

/**
 * Computes the Top Shelf: The most saved, cherished manuscripts across HatchPen.
 * Strictly guarantees:
 * 1. Zero duplication: Every work in the result is guaranteed to have a unique ID.
 * 2. Capped at exactly `limit` (defaults to 10).
 * 3. Deterministic ranking: Total Saves DESC -> Hearts DESC -> Total Reads DESC -> ID ASC.
 * 4. Authorship exclusion: Reader's own works are never shown.
 */
export function getTopShelfWorks(
  candidateWorks: Work[],
  options: TopShelfOptions = {}
): Work[] {
  if (!Array.isArray(candidateWorks) || candidateWorks.length === 0) {
    return []
  }

  const limit = Math.max(1, Math.min(50, options.limit || 10))
  const seenIds = new Set<string>()

  const eligible: Array<{
    work: Work
    saves: number
    hearts: number
    reads: number
    publishedTime: number
  }> = []

  for (const work of candidateWorks) {
    if (!work || !work.id) continue

    // Strict deduplication: never process the same work twice
    if (seenIds.has(work.id)) continue

    if (!isWorkTopShelfEligible(work)) continue

    // Authorship exclusion
    const authorId = work.author?.id || (work as any).authorId || (work as any).author_id
    if (authorId) {
      if (options.currentUserId && authorId === options.currentUserId) continue
      if (options.currentUserProfileId && authorId === options.currentUserProfileId) continue
    }

    seenIds.add(work.id)

    const saves = Math.max(0, Number(work.totalSaves ?? (work as any).save_count ?? 0) || 0)
    const hearts = Math.max(0, Number(work.likeCount ?? (work as any).like_count ?? (work as any).likesCount ?? work.ratingCount ?? 0) || 0)
    const reads = Math.max(0, parseTotalReads(work.totalReads) || 0)
    const rawTime = work.publishedAt ? new Date(work.publishedAt).getTime() : 0
    const publishedTime = isNaN(rawTime) ? 0 : rawTime

    eligible.push({
      work,
      saves,
      hearts,
      reads,
      publishedTime,
    })
  }

  // Deterministic Ranking:
  // 1. Total Saves (Primary community bookmark loyalty) DESC
  // 2. Hearts (Total appreciation) DESC
  // 3. Reads (Audience scale) DESC
  // 4. Published Time DESC
  // 5. Work ID ASC (Guaranteed tie-breaker)
  eligible.sort((a, b) => {
    if (b.saves !== a.saves) {
      return b.saves - a.saves
    }
    if (b.hearts !== a.hearts) {
      return b.hearts - a.hearts
    }
    if (b.reads !== a.reads) {
      return b.reads - a.reads
    }
    if (b.publishedTime !== a.publishedTime) {
      return b.publishedTime - a.publishedTime
    }
    return String(a.work.id).localeCompare(String(b.work.id))
  })

  // Return strictly up to `limit` (max 10) unique works
  return eligible.slice(0, limit).map((item) => item.work)
}
