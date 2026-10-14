import type { Work } from '../../data/mockData.ts'

/**
 * Calculates the exact expiration timestamp 5 calendar months after account creation.
 * Clamps to the final day of the target month if original day exceeds month length.
 * e.g., Oct 31 -> March 31
 *       Sept 30 (2023) -> Feb 29 (2024, Leap Year)
 *       Sept 30 (2024) -> Feb 28 (2025, Non-Leap Year)
 *       Jan 31 -> June 30
 */
export function calculateFiveMonthExpiration(createdAt: string | Date | number): Date {
  const date = new Date(createdAt)
  const targetYear = date.getUTCFullYear()
  const targetMonth = date.getUTCMonth() + 5
  const originalDay = date.getUTCDate()

  const finalYear = targetYear + Math.floor(targetMonth / 12)
  const finalMonth = targetMonth % 12

  // Determine last day of the target month: day 0 of month + 1
  const lastDayOfTargetMonth = new Date(Date.UTC(finalYear, finalMonth + 1, 0)).getUTCDate()
  const clampedDay = Math.min(originalDay, lastDayOfTargetMonth)

  return new Date(Date.UTC(
    finalYear,
    finalMonth,
    clampedDay,
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  ))
}

/**
 * Evaluates whether an account is within the 5 calendar months eligibility window.
 * Strict boundary: `referenceDate < expirationTimestamp` means eligible;
 * at or after expiration timestamp, the writer is ineligible.
 */
export function isNewVoiceEligible(
  createdAt: string | Date | number | undefined | null,
  referenceDate: Date = new Date()
): boolean {
  if (!createdAt) return false
  const accountCreated = new Date(createdAt)
  if (isNaN(accountCreated.getTime())) return false

  const expiration = calculateFiveMonthExpiration(accountCreated)
  return referenceDate.getTime() < expiration.getTime()
}

/**
 * Evaluates whether an individual story qualifies for the New Voices showcase.
 * Requirements:
 * 1. Author was eligible at publication time (published within author's 5-month window).
 * 2. Author is currently within their 5-month eligibility window.
 * 3. Story is published and public with at least 1 chapter.
 * 4. Editing an old story cannot make it newly eligible because publication timestamp is checked.
 */
export function isStoryEligibleForNewVoices(
  story: Work,
  authorCreatedAt?: string | Date | number | null,
  referenceDate: Date = new Date()
): boolean {
  const authorCreated = authorCreatedAt || story.author?.createdAt
  if (!authorCreated) return false

  // Author must currently be an eligible New Voice
  if (!isNewVoiceEligible(authorCreated, referenceDate)) {
    return false
  }

  // Publication status checks
  const isPublic = story.visibility === 'Public'
  const isPublished = (story.status as string) !== 'Draft'
  const hasChapters = (story.publishedChaptersCount || 0) > 0 || (story.chaptersCount || 0) > 0

  if (!isPublic || !isPublished || !hasChapters) {
    return false
  }

  // Verify the story has an explicit valid publication timestamp within the author's 5-month window
  const publishedDateStr = story.publishedAt
  if (!publishedDateStr) return false

  const publishedTime = new Date(publishedDateStr).getTime()
  if (isNaN(publishedTime)) return false

  const authorCreatedTime = new Date(authorCreated).getTime()
  const authorExpirationTime = calculateFiveMonthExpiration(authorCreated).getTime()

  // Story must have been published during author's 5-month window
  return publishedTime >= authorCreatedTime && publishedTime < authorExpirationTime
}

/**
 * Filters and orders stories for the dedicated New Voices discovery section.
 * - Includes every qualifying story published by eligible writers during their 5-month window.
 * - Ordered primarily by publication timestamp (publishedAt) descending.
 * - Deterministic tie-breaker: story ID ascending.
 * - Avoids popularity shortcuts or view-count bias.
 */
export function filterAndOrderNewVoicesStories(
  works: Work[],
  currentUserId?: string | null,
  referenceDate: Date = new Date()
): Work[] {
  return works
    .filter((work) => {
      // Exclude reader's own manuscripts from discovery if authenticated
      if (currentUserId && (work.author?.id === currentUserId || (work as any).author_id === currentUserId)) {
        return false
      }
      return isStoryEligibleForNewVoices(work, work.author?.createdAt, referenceDate)
    })
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt!).getTime()
      const timeB = new Date(b.publishedAt!).getTime()

      if (timeB !== timeA) {
        return timeB - timeA
      }
      // Deterministic tie-breaker
      return String(a.id).localeCompare(String(b.id))
    })
}
