export { cn } from "cn"

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
 * Formats a view/read count into standard readable format.
 * - Under 1,000: exact number (e.g., "850")
 * - 1,000 to 999,999: compact notation with 1 decimal if needed (e.g., "1.2K", "45K", "125.4K")
 * - 1,000,000+: compact notation in millions (e.g., "1.2M", "10M")
 * If compact is false, returns comma-separated full number (e.g., "1,245")
 */
export function formatViewCount(val: number | string | undefined | null, compact = true): string {
  if (val === undefined || val === null || val === '') return '0'

  // If already formatted like '124K' or '1.2M' and we just want compact, preserve it
  if (compact && typeof val === 'string' && /[KMB]$/i.test(val.trim())) {
    return val.trim().toUpperCase()
  }

  const num = typeof val === 'number' ? val : parseTotalReads(val)
  if (isNaN(num) || num <= 0) return '0'

  if (!compact) {
    return Math.round(num).toLocaleString('en-US')
  }

  if (num < 1000) {
    return Math.round(num).toString()
  }

  if (num < 1_000_000) {
    const formatted = (num / 1000).toFixed(1)
    return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}K`
  }

  const formatted = (num / 1_000_000).toFixed(1)
  return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted}M`
}

/**
 * Reusable helper for formatting heart / like metrics across chapters, stories, and reflections.
 * Default is compact notation (e.g. 1.2K, 45K), with full comma-separated string when compact=false.
 */
export const formatHeartCount = formatViewCount

/**
 * Format timestamp into human-readable relative time (e.g. "Just now", "5m ago", "2h ago", "Oct 24")
 */
export function formatRelativeTimestamp(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Never'
  try {
    const date = new Date(isoDate)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 0) return 'Just now'
    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

