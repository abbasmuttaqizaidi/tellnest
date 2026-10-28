import type { Work } from '../../data/mockData.ts'
import { getWorkLatestActivityDate } from '../../data/mockData.ts'
import { parseTotalReads } from '../utils.ts'

export { parseTotalReads }

/**
 * Calculates the current UTC week boundary (Monday 00:00:00.000 UTC to next Monday 00:00:00.000 UTC).
 * Inclusive start, exclusive end.
 */
export function getUtcWeekBoundaries(nowDate: Date = new Date()): { startUtc: Date; endUtc: Date } {
  const d = new Date(nowDate.getTime())
  const day = d.getUTCDay()
  // Sunday = 0 -> 6 days back; Monday = 1 -> 0 days back; Tuesday = 2 -> 1 day back...
  const diffToMonday = day === 0 ? 6 : day - 1

  const startUtc = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate() - diffToMonday,
      0,
      0,
      0,
      0
    )
  )

  const endUtc = new Date(startUtc.getTime() + 7 * 24 * 60 * 60 * 1000)
  return { startUtc, endUtc }
}

/**
 * Determines whether a timestamp falls within a specific UTC week [startUtc, endUtc).
 */
export function isTimestampInUtcWeek(
  timestamp: string | number | Date | undefined | null,
  week: { startUtc: Date; endUtc: Date },
  nowDate?: Date
): boolean {
  if (!timestamp) return false
  const date = new Date(timestamp)
  const time = date.getTime()
  if (isNaN(time)) return false
  if (nowDate && time > nowDate.getTime()) return false
  return time >= week.startUtc.getTime() && time < week.endUtc.getTime()
}

/**
 * Determines if a work is public and published (not draft, not private, valid non-future publishedAt).
 */
export function isPublicPublishedWork(work: Work, nowDate: Date = new Date()): boolean {
  if (!work) return false
  const visibility = (work.visibility || '').toLowerCase()
  if (visibility !== 'public') return false
  if (work.status === 'Draft') return false
  if (!work.publishedAt) return false
  const pubTime = new Date(work.publishedAt).getTime()
  if (isNaN(pubTime)) return false
  if (pubTime > nowDate.getTime()) return false
  return true
}

/**
 * Determines if a work qualifies for "New This Week":
 * - Must be public and published
 * - Initial publication date (publishedAt) must fall within current week [Monday 00:00 UTC, next Monday 00:00 UTC)
 * - Strict publication truth: Database created_at flags CANNOT override publishedAt
 * - Missing, future, or invalid publishedAt returns false
 */
export function isWorkNewThisWeek(work: Work, nowDate: Date = new Date()): boolean {
  if (!isPublicPublishedWork(work, nowDate)) return false
  if (!work.publishedAt) return false

  const week = getUtcWeekBoundaries(nowDate)
  return isTimestampInUtcWeek(work.publishedAt, week, nowDate)
}

/**
 * Determines if a work qualifies for "New Chapters This Week":
 * - Must be public and published
 * - Must NOT be a brand-new work published this week (established works only)
 * - Has at least one published chapter whose publication date falls in current week
 * - Strict publication truth: Unpublished chapters and database created_at flags CANNOT override chapter publishedAt
 */
export function isWorkNewChaptersThisWeek(work: Work, nowDate: Date = new Date()): boolean {
  if (!isPublicPublishedWork(work, nowDate)) return false

  // Brand-new works published this week do not qualify for new_chapters_this_week
  if (isWorkNewThisWeek(work, nowDate)) {
    return false
  }

  const week = getUtcWeekBoundaries(nowDate)

  // Check actual published chapters
  const chapters = work.chapters || []
  for (const ch of chapters) {
    if (ch.status === 'published' && ch.publishedAt) {
      if (isTimestampInUtcWeek(ch.publishedAt, week, nowDate)) {
        return true
      }
    }
  }

  // Check acts chapters if nested
  if (work.acts && work.acts.length > 0) {
    for (const act of work.acts) {
      if (act.status !== 'draft' && act.chapters) {
        for (const ch of act.chapters) {
          if (ch.status === 'published' && ch.publishedAt) {
            if (isTimestampInUtcWeek(ch.publishedAt, week, nowDate)) {
              return true
            }
          }
        }
      }
    }
  }

  return false
}

/**
 * Genre filter check with OR semantics across primary and secondary genres.
 */
export function matchesGenre(work: Work, selectedGenre: string): boolean {
  if (!selectedGenre || selectedGenre === 'all') return true
  if (work.genreSlug === selectedGenre) return true
  if (Array.isArray(work.genres)) {
    return work.genres.some((g) => g.slug === selectedGenre)
  }
  return false
}

/**
 * Category filter check.
 */
export function matchesCategory(work: Work, selectedCategory: string): boolean {
  if (!selectedCategory || selectedCategory === 'all') return true
  return work.categorySlug === selectedCategory
}

/**
 * Status filter check.
 */
export function matchesStatus(work: Work, selectedStatus: string): boolean {
  if (!selectedStatus || selectedStatus === 'all') return true
  return work.status === selectedStatus
}

/**
 * Search check against title, author name/handle, synopsis/description, and tags.
 */
export function matchesSearch(work: Work, searchTerm: string): boolean {
  if (!searchTerm || !searchTerm.trim()) return true
  const rawQuery = searchTerm.toLowerCase().trim()
  const normQuery = rawQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const fields = [
    work.title || '',
    work.author?.name || '',
    work.author?.handle || '',
    work.synopsis || '',
    work.fullDescription || '',
    ...(work.tags || []),
  ]

  return fields.some((field) => {
    const rawField = field.toLowerCase()
    if (rawField.includes(rawQuery)) return true
    const normField = rawField.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return normField.includes(normQuery)
  })
}

/**
 * Tab filter check.
 */
export function matchesTab(
  work: Work,
  activeTab: 'all' | 'new_this_week' | 'new_chapters' | 'trending' | 'rising' | 'recent' | 'completed',
  isSignedIn: boolean,
  nowDate: Date = new Date()
): boolean {
  if (!isPublicPublishedWork(work, nowDate)) return false

  switch (activeTab) {
    case 'all':
      return true
    case 'new_this_week':
      return isWorkNewThisWeek(work, nowDate)
    case 'new_chapters':
      return isWorkNewChaptersThisWeek(work, nowDate)
    case 'trending':
      return Boolean(work.trending || (work.collection || []).includes('trending_now'))
    case 'rising':
      if (!isSignedIn) return false
      return Boolean(work.rising || (work.collection || []).includes('rising_stories'))
    case 'recent':
      return true
    case 'completed':
      return work.status === 'Completed'
    default:
      return true
  }
}

export interface DiscoverFilterOptions {
  activeTab: 'all' | 'new_this_week' | 'new_chapters' | 'trending' | 'rising' | 'recent' | 'completed'
  selectedCategory: string
  selectedGenre: string
  selectedStatus: string
  searchTerm: string
  sortBy: 'popularity' | 'updated' | 'rating'
  isSignedIn: boolean
  nowDate?: Date
  seed?: number
}

/**
 * 32-bit pseudo-random number generator for deterministic permutations
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded pseudo-random generator.
 * Produces identical permutations for identical seeds across sessions and pagination pages.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array]
  const random = mulberry32(seed)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

/**
 * Filters and deterministically sorts a collection of works.
 */
export function filterAndSortWorks(
  works: Work[],
  options: DiscoverFilterOptions
): Work[] {
  const {
    activeTab,
    selectedCategory,
    selectedGenre,
    selectedStatus,
    searchTerm,
    sortBy,
    isSignedIn,
    nowDate = new Date(),
    seed,
  } = options

  const filtered = works.filter((work) => {
    if (!isPublicPublishedWork(work, nowDate)) return false
    if (!matchesTab(work, activeTab, isSignedIn, nowDate)) return false
    if (!matchesCategory(work, selectedCategory)) return false
    if (!matchesGenre(work, selectedGenre)) return false
    if (!matchesStatus(work, selectedStatus)) return false
    if (!matchesSearch(work, searchTerm)) return false
    return true
  })

  // If a seed is provided, apply deterministic seeded shuffle across the filtered catalog
  if (typeof seed === 'number' && !isNaN(seed)) {
    return seededShuffle(filtered, seed)
  }

  return filtered.sort((a, b) => {
      if (activeTab === 'trending') {
        const hasRankA = typeof (a as any).trendingRank === 'number'
        const hasRankB = typeof (b as any).trendingRank === 'number'
        if (hasRankA || hasRankB) {
          const rankA = hasRankA ? (a as any).trendingRank : 999
          const rankB = hasRankB ? (b as any).trendingRank : 999
          const diff = rankA - rankB
          if (diff !== 0) return diff
          return a.id.localeCompare(b.id)
        }
      }
      if (sortBy === 'rating') {
        const diff = (b.ratingScore || 0) - (a.ratingScore || 0)
        if (diff !== 0) return diff
        return a.id.localeCompare(b.id)
      }
      if (sortBy === 'updated' || activeTab === 'recent') {
        const timeA = getWorkLatestActivityDate(a).getTime()
        const timeB = getWorkLatestActivityDate(b).getTime()
        const diff = timeB - timeA
        if (diff !== 0) return diff
        return a.id.localeCompare(b.id)
      }
      // default popularity by reads
      const readsA = parseTotalReads(a.totalReads)
      const readsB = parseTotalReads(b.totalReads)
      const diff = readsB - readsA
      if (diff !== 0) return diff
      return a.id.localeCompare(b.id)
    })
}
