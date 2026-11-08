import type { StoryLoreEntity } from './loreParser'

export interface LoreBibleCacheEntry {
  entities: StoryLoreEntity[]
  loreTypes: string[]
  totalChaptersCount: number
  timestamp: number
}

const clientLoreBibleCache = new Map<string, LoreBibleCacheEntry>()
const CLIENT_LORE_CACHE_TTL_MS = 120_000 // 2 minutes in-memory client cache

/**
 * Returns cached Story Lore Bible data for the given work if available and within TTL.
 */
export function getClientLoreBibleCache(workId?: string): LoreBibleCacheEntry | null {
  if (!workId) return null
  const key = workId.trim().toLowerCase()
  const entry = clientLoreBibleCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CLIENT_LORE_CACHE_TTL_MS) {
    clientLoreBibleCache.delete(key)
    return null
  }
  return entry
}

/**
 * Stores retrieved Story Lore Bible data in client cache with current timestamp.
 */
export function setClientLoreBibleCache(
  workId: string,
  data: {
    entities: StoryLoreEntity[]
    loreTypes?: string[]
    totalChaptersCount?: number
  }
): void {
  if (!workId) return
  const key = workId.trim().toLowerCase()
  clientLoreBibleCache.set(key, {
    entities: Array.isArray(data.entities) ? data.entities : [],
    loreTypes: Array.isArray(data.loreTypes) && data.loreTypes.length > 0 ? data.loreTypes : ['Character', 'Location', 'Lore'],
    totalChaptersCount: typeof data.totalChaptersCount === 'number' ? data.totalChaptersCount : 0,
    timestamp: Date.now(),
  })
}

/**
 * Invalidates client-side cache for a given work (or all works) on mutations (save, delete, link, import).
 */
export function invalidateClientLoreBibleCache(workId?: string): void {
  if (workId) {
    clientLoreBibleCache.delete(workId.trim().toLowerCase())
  } else {
    clientLoreBibleCache.clear()
  }
}
