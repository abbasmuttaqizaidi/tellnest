export { cn } from "cn"

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
  if (typeof val === 'string' && /[KMB]$/i.test(val.trim())) {
    return compact ? val.trim().toUpperCase() : val.trim()
  }

  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''))
  if (isNaN(num) || num <= 0) return '0'

  if (!compact) {
    return Math.round(num).toLocaleString()
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
