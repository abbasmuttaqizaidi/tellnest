import type { Work } from '../../data/mockData.ts'
import { parseTotalReads } from '../utils.ts'

export interface BingeableCalculationParams {
  candidateWorks: Work[]
  readingHistory?: Array<{ workId: string; lastReadAt?: string }>
  userPreferences?: {
    genres?: Array<{ id?: string; name?: string } | string>
    categories?: Array<{ id?: string; name?: string } | string>
    interests?: string[]
  } | null
  currentUserId?: string | null
  currentUserProfileId?: string | null
}

/**
 * Returns the effective published chapter count of a work.
 * Hardened against:
 * 1. String chapter numbers ("1", "2").
 * 2. Draft chapters inside `work.chapters` disguised under generic `chaptersCount`.
 * 3. Null / undefined / NaN inputs.
 */
export function getWorkPublishedChapterCount(work: Work): number {
  if (!work) return 0

  // 1. If explicit chapters array is available, inspect actual published chapter objects
  if (Array.isArray(work.chapters) && work.chapters.length > 0) {
    return work.chapters.filter((c) => {
      const s = String(c.status || '').toLowerCase().trim()
      return s === 'published' || s === ''
    }).length
  }

  // 2. Check publishedChaptersCount (support both number and valid numeric string)
  if (work.publishedChaptersCount !== undefined && work.publishedChaptersCount !== null) {
    const parsed = Number(work.publishedChaptersCount)
    if (!isNaN(parsed)) return Math.max(0, Math.floor(parsed))
  }

  // 3. Fallback to chaptersCount only if publicationStatus is not draft
  const pubStatus = String(
    (work as any).publication_status ||
    (work as any).publicationStatus ||
    'published'
  ).toLowerCase().trim()

  if (pubStatus !== 'draft' && work.chaptersCount !== undefined && work.chaptersCount !== null) {
    const parsed = Number(work.chaptersCount)
    if (!isNaN(parsed)) return Math.max(0, Math.floor(parsed))
  }

  return 0
}

/**
 * Strict eligibility check for Bingeable Reads:
 * 1. Must have exactly 1 or 2 published chapters (<= 2 chapters).
 * 2. Must be published, public, and indexable.
 * 3. Must not be a draft or cancelled.
 */
export function isWorkBingeable(work: Work): boolean {
  if (!work) return false

  // 1. Chapter count boundary: strictly 1 or 2 chapters
  const chCount = getWorkPublishedChapterCount(work)
  if (chCount < 1 || chCount > 2) {
    return false
  }

  // 2. Publication status & visibility
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

  return isPublic && isNotCancelled && isNotDraft && isIndexable
}

/**
 * Normalizes genre and category strings for fuzzy comparison.
 */
function normalizeGenreName(str?: string | null): string {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Calculates and returns personalized Bingeable Reads ranked by affinity, completion, and momentum.
 */
export function calculateBingeableReads({
  candidateWorks,
  readingHistory = [],
  userPreferences = null,
  currentUserId = null,
  currentUserProfileId = null,
}: BingeableCalculationParams): Work[] {
  if (!Array.isArray(candidateWorks) || candidateWorks.length === 0) {
    return []
  }

  // 1. Build user genre affinity set from preferences and recent reading sessions
  const preferredGenres = new Set<string>()

  if (userPreferences?.genres) {
    for (const g of userPreferences.genres) {
      if (typeof g === 'string') preferredGenres.add(normalizeGenreName(g))
      else if (g && typeof g === 'object') {
        if (g.name) preferredGenres.add(normalizeGenreName(g.name))
        if (g.id) preferredGenres.add(normalizeGenreName(g.id))
      }
    }
  }

  // Extract genres of recently read stories from reading history
  const readWorkIds = new Set(readingHistory.map((h) => h.workId))
  for (const w of candidateWorks) {
    if (readWorkIds.has(w.id)) {
      if (w.genre) preferredGenres.add(normalizeGenreName(w.genre))
      if (w.genreSlug) preferredGenres.add(normalizeGenreName(w.genreSlug))
      if (Array.isArray(w.genres)) {
        w.genres.forEach((g) => {
          if (typeof g === 'string') preferredGenres.add(normalizeGenreName(g))
          else if (g?.name) preferredGenres.add(normalizeGenreName(g.name))
        })
      }
    }
  }

  // 2. Filter qualifying bingeable stories
  const eligibleWorks = candidateWorks.filter((work) => {
    // Must satisfy core Bingeable definition (<= 2 chapters)
    if (!isWorkBingeable(work)) return false

    // Exclude author's own manuscripts
    const authorId = work.author?.id || (work as any).authorId || (work as any).author_id
    if (authorId) {
      if (currentUserId && authorId === currentUserId) return false
      if (currentUserProfileId && authorId === currentUserProfileId) return false
    }

    return true
  })

  // 3. Compute score for each eligible work
  const scoredWorks = eligibleWorks.map((work) => {
    let score = 0

    // Component A: Genre & Affinity Match (up to +60 points)
    const workGenre = normalizeGenreName(work.genre || work.genreSlug)
    if (workGenre && preferredGenres.has(workGenre)) {
      score += 40
    }

    if (Array.isArray(work.genres)) {
      for (const g of work.genres) {
        const gn = typeof g === 'string' ? normalizeGenreName(g) : normalizeGenreName(g?.name)
        if (gn && preferredGenres.has(gn)) {
          score += 20
          break
        }
      }
    }

    // Component B: Completion Status Bonus (+30 for Completed, +10 for Ongoing)
    const statusNormalized = (work.status || '').toLowerCase().trim()
    if (statusNormalized === 'completed') {
      score += 30
    } else {
      score += 10
    }

    // Component C: Engagement Momentum Score (logarithmic scaling with strict NaN / negative defense)
    const reads = Math.max(0, parseTotalReads(work.totalReads) || 0)
    const saves = Math.max(0, Number(work.totalSaves || (work as any).save_count || 0) || 0)
    const rawMomentum = 5 * Math.log(1 + reads) + 3 * Math.log(1 + saves)
    score += isNaN(rawMomentum) ? 0 : rawMomentum

    return {
      work,
      score,
    }
  })

  // 4. Deterministic Sort: Score descending -> PublishedAt descending -> ID ascending
  scoredWorks.sort((a, b) => {
    const scoreDiff = b.score - a.score
    if (!isNaN(scoreDiff) && Math.abs(scoreDiff) > 0.001) {
      return scoreDiff
    }

    const rawTimeA = a.work.publishedAt ? new Date(a.work.publishedAt).getTime() : 0
    const rawTimeB = b.work.publishedAt ? new Date(b.work.publishedAt).getTime() : 0
    const timeA = isNaN(rawTimeA) ? 0 : rawTimeA
    const timeB = isNaN(rawTimeB) ? 0 : rawTimeB

    if (timeB !== timeA) {
      return timeB - timeA
    }
    return String(a.work.id).localeCompare(String(b.work.id))
  })

  return scoredWorks.map((item) => item.work)
}
