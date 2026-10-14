import type { Work } from '../../data/mockData.ts'
import { getWorkLatestActivityDate } from '../../data/mockData.ts'

/**
 * Parses numeric reads count from formatted strings (e.g. '1.2M', '215K', '500')
 * or raw numbers into a reliable integer count.
 */
export function parseTotalReads(totalReads?: string | number | null): number {
  if (typeof totalReads === 'number') {
    return isNaN(totalReads) ? 0 : Math.round(totalReads)
  }
  if (!totalReads || typeof totalReads !== 'string') {
    return 0
  }
  const cleaned = totalReads.replace(/,/g, '').trim().toUpperCase()
  if (cleaned.endsWith('M')) {
    const num = parseFloat(cleaned.slice(0, -1))
    return isNaN(num) ? 0 : Math.round(num * 1_000_000)
  }
  if (cleaned.endsWith('K')) {
    const num = parseFloat(cleaned.slice(0, -1))
    return isNaN(num) ? 0 : Math.round(num * 1_000)
  }
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.round(parsed)
}

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
  } = options

  return works
    .filter((work) => {
      if (!isPublicPublishedWork(work, nowDate)) return false
      if (!matchesTab(work, activeTab, isSignedIn, nowDate)) return false
      if (!matchesCategory(work, selectedCategory)) return false
      if (!matchesGenre(work, selectedGenre)) return false
      if (!matchesStatus(work, selectedStatus)) return false
      if (!matchesSearch(work, searchTerm)) return false
      return true
    })
    .sort((a, b) => {
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
