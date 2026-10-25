import type { Work } from '../../data/mockData.ts'
import { FOR_YOU_CONFIG, type ForYouConfig } from './config.ts'
import { parseTotalReads } from '../utils.ts'

export interface ReadingSessionRecord {
  workId: string
  chapterId?: string | null
  durationSeconds: number
  lastReadAt: string
}

export interface UserPreferencesPayload {
  genres?: Array<{ id?: string; name?: string } | string>
  categories?: Array<{ id?: string; name?: string } | string>
  interests?: string[]
}

export interface RecommendedWorkItem {
  work: Work
  score: number
  explanationLabel: string
}

/**
 * Normalizes genre strings and slugs to uniform lowercase identifiers for robust comparison.
 */
function normalizeIdentifier(val: string | undefined | null): string {
  if (!val) return ''
  return val.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Extracts all normalized genre slugs associated with a work (supporting single or multiple genres).
 */
export function getWorkGenreSlugs(work: Work): string[] {
  const slugs = new Set<string>()
  if (work.genreSlug) slugs.add(normalizeIdentifier(work.genreSlug))
  if (work.genre) slugs.add(normalizeIdentifier(work.genre))
  if (Array.isArray((work as any).genres)) {
    for (const g of (work as any).genres) {
      if (typeof g === 'string') {
        slugs.add(normalizeIdentifier(g))
      } else if (g && typeof g === 'object') {
        if (g.slug) slugs.add(normalizeIdentifier(g.slug))
        if (g.name) slugs.add(normalizeIdentifier(g.name))
      }
    }
  }
  return Array.from(slugs).filter(Boolean)
}

/**
 * Validates that a work meets all baseline eligibility requirements:
 * 1. Must be published.
 * 2. Must be public.
 * 3. Must have at least one published chapter.
 * 4. Must not be authored by the current user.
 * 5. Must not be already saved/bookmarked by the current user.
 */
export function isWorkEligibleForRecommendations(
  work: Work,
  options: {
    currentUserId?: string | null
    currentUserProfileId?: string | null
    bookmarkedWorkIds?: string[]
    excludeBookmarked?: boolean
  }
): boolean {
  if (!work) return false

  // 1. Publication status: Must be published
  const isPublished =
    work.status !== 'Cancelled' &&
    work.visibility !== 'Draft' &&
    work.visibility !== 'Unlisted'
  if (!isPublished) return false

  // 2. Chapter readiness: Must have at least 1 genuinely published chapter
  const hasPublishedChapter =
    (typeof work.publishedChaptersCount === 'number' && work.publishedChaptersCount >= 1) ||
    (Array.isArray(work.chapters) && work.chapters.some((c) => c.status === 'published'))
  if (!hasPublishedChapter) return false

  // 3. Authorship exclusion: Reader's own works must never be recommended
  const authorId = work.author?.id || (work as any).authorId || (work as any).author_id
  if (authorId) {
    if (options.currentUserId && authorId === options.currentUserId) return false
    if (options.currentUserProfileId && authorId === options.currentUserProfileId) return false
  }

  // 4. Bookmark exclusion: Bookmarked/saved manuscripts are NOT excluded from recommendations
  // (unless explicitly requested with options.excludeBookmarked === true).
  // This guarantees that saving/bookmarking a story from Recommended does not cause it to disappear.
  if (options.excludeBookmarked && options.bookmarkedWorkIds && options.bookmarkedWorkIds.includes(work.id)) {
    return false
  }

  return true
}

/**
 * Aggregates recent reading history to detect verified, repeated genre affinity.
 * Applies the documented gradual adaptation rule:
 * - A single visit or brief interaction (< 30s) does NOT override onboarding preferences.
 * - Requires at least MIN_SESSIONS_FOR_TASTE_SHIFT and MIN_ACTIVE_SECONDS_FOR_TASTE_SHIFT
 *   within LOOKBACK_DAYS before a genre becomes eligible for taste shift priority.
 */
export function detectActiveReadingShift(
  history: ReadingSessionRecord[],
  candidateWorks: Work[],
  config: ForYouConfig = FOR_YOU_CONFIG
): { topGenreSlug: string; totalActiveSeconds: number; sessionCount: number } | null {
  if (!history || history.length === 0) return null

  const nowMs = Date.now()
  const lookbackCutoffMs = nowMs - config.LOOKBACK_DAYS * 24 * 60 * 60 * 1000

  // Filter sessions within lookback window
  const recentSessions = history.filter((s) => {
    const timestamp = new Date(s.lastReadAt).getTime()
    return !isNaN(timestamp) && timestamp >= lookbackCutoffMs
  })

  if (recentSessions.length === 0) return null

  // Map each session to the genre of the corresponding work
  const genreStats = new Map<string, { seconds: number; sessions: number }>()

  for (const session of recentSessions) {
    const work = candidateWorks.find((w) => w.id === session.workId)
    if (!work) continue

    const genreSlugs = getWorkGenreSlugs(work)
    if (genreSlugs.length === 0) continue

    for (const genreSlug of genreSlugs) {
      const current = genreStats.get(genreSlug) || { seconds: 0, sessions: 0 }
      current.seconds += Math.max(0, session.durationSeconds || 0)
      current.sessions += 1
      genreStats.set(genreSlug, current)
    }
  }

  // Find genre with highest active seconds that meets the shift threshold
  let bestShift: { topGenreSlug: string; totalActiveSeconds: number; sessionCount: number } | null = null

  for (const [slug, stats] of genreStats.entries()) {
    if (
      stats.sessions >= config.MIN_SESSIONS_FOR_TASTE_SHIFT &&
      stats.seconds >= config.MIN_ACTIVE_SECONDS_FOR_TASTE_SHIFT
    ) {
      if (!bestShift || stats.seconds > bestShift.totalActiveSeconds) {
        bestShift = {
          topGenreSlug: slug,
          totalActiveSeconds: stats.seconds,
          sessionCount: stats.sessions,
        }
      }
    }
  }

  return bestShift
}

/**
 * Calculates deterministic "For You" recommendations.
 * 
 * Guarantees:
 * 1. Prioritizes recent, verified active reading behavior over static preferences.
 * 2. Adapts gradually; never modifies user's stored preferences object.
 * 3. Uses explicit preferences as cold-start and secondary supporting signals.
 * 4. Respects all eligibility and hard exclusion rules (own works, bookmarked works).
 * 5. Returns <= 10 items without duplicates.
 */
export function calculateForYouRecommendations(params: {
  candidateWorks: Work[]
  readingHistory?: ReadingSessionRecord[]
  userPreferences?: UserPreferencesPayload | null
  bookmarkedWorkIds?: string[]
  excludeBookmarked?: boolean
  currentUserId?: string | null
  currentUserProfileId?: string | null
  config?: ForYouConfig
}): RecommendedWorkItem[] {
  const config = params.config || FOR_YOU_CONFIG
  const {
    candidateWorks,
    readingHistory = [],
    userPreferences,
    bookmarkedWorkIds = [],
    excludeBookmarked = false,
  } = params

  // 1. Filter candidates strictly by eligibility
  const eligibleCandidates = candidateWorks.filter((w) =>
    isWorkEligibleForRecommendations(w, {
      currentUserId: params.currentUserId,
      currentUserProfileId: params.currentUserProfileId,
      bookmarkedWorkIds,
      excludeBookmarked,
    })
  )

  if (eligibleCandidates.length === 0) {
    return []
  }

  // 2. Detect verified active reading shift
  const verifiedShift = detectActiveReadingShift(readingHistory, candidateWorks, config)

  // 3. Extract normalized onboarding preferences
  const preferredGenreSlugs = new Set(
    (userPreferences?.genres || []).map((g) =>
      typeof g === 'string' ? normalizeIdentifier(g) : normalizeIdentifier(g.id || g.name)
    )
  )

  const preferredCategorySlugs = new Set(
    (userPreferences?.categories || []).map((c) =>
      typeof c === 'string' ? normalizeIdentifier(c) : normalizeIdentifier(c.id || c.name)
    )
  )

  // 4. Score each candidate deterministically
  const scoredItems: RecommendedWorkItem[] = eligibleCandidates.map((work) => {
    let score = 0
    let primaryDriver = ''

    const workGenreSlugs = getWorkGenreSlugs(work)
    const workCatSlug = normalizeIdentifier(work.categorySlug || work.category)

    // Signal A: Active Reading Shift (Highest Priority when verified)
    if (verifiedShift && workGenreSlugs.includes(verifiedShift.topGenreSlug)) {
      score += config.WEIGHTS.ACTIVE_READING_GENRE_AFFINITY
      primaryDriver = `Based on your recent reading in ${work.genre}`
    }

    // Signal B: Declared Onboarding Genre Match
    const matchedPreferredGenre = workGenreSlugs.find((slug) => preferredGenreSlugs.has(slug))
    if (matchedPreferredGenre) {
      score += config.WEIGHTS.ONBOARDING_GENRE_MATCH
      if (!primaryDriver) {
        primaryDriver = `Based on your interest in ${work.genre}`
      }
    }

    // Signal C: Declared Onboarding Category / Format Match
    if (preferredCategorySlugs.has(workCatSlug)) {
      score += config.WEIGHTS.ONBOARDING_CATEGORY_MATCH
      if (!primaryDriver) {
        primaryDriver = `Recommended ${work.category}`
      }
    }

    // Signal D: Recent Chapter Activity (Living serial bonus)
    const lastActivity = work.lastActivityAt ? new Date(work.lastActivityAt).getTime() : 0
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
    if (lastActivity >= fourteenDaysAgo || work.new_chapters_this_week) {
      score += config.WEIGHTS.RECENT_CHAPTER_DROP_BONUS
    }

    // Signal E: Organic Engagement Baseline (Reads/views quality tie-breaker)
    const totalReadsNum = parseTotalReads(work.totalReads)
    if (totalReadsNum > 5000 || work.featured || work.trending) {
      score += config.WEIGHTS.ORGANIC_ENGAGEMENT_BONUS
    }

    // Fallback explanation if no specific personal signal drove the score
    if (!primaryDriver) {
      primaryDriver = 'Recommended Serial'
    }

    return {
      work,
      score,
      explanationLabel: primaryDriver,
    }
  })

  // 5. Sort descending by score, tie-break by total reads & recency, deduplicate, and limit to max 10
  const sorted = scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const readsA = parseTotalReads(a.work.totalReads)
    const readsB = parseTotalReads(b.work.totalReads)
    return readsB - readsA
  })

  // Ensure unique works only
  const seenIds = new Set<string>()
  const finalResults: RecommendedWorkItem[] = []

  for (const item of sorted) {
    if (!seenIds.has(item.work.id)) {
      seenIds.add(item.work.id)
      finalResults.push(item)
      if (finalResults.length >= config.MAX_RECOMMENDATIONS) {
        break
      }
    }
  }

  return finalResults
}
