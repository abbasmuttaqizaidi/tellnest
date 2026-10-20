/**
 * IndexedDB Recovery Layer for HatchPen Reading Progress.
 *
 * Guarantees:
 * - Eligible reading changes are written locally before network attempts.
 * - Does not delete pending data merely because a network request starts.
 * - Deletes ONLY the exact acknowledged batch after confirmed server success.
 * - Newer changes that arrived while an older batch was in-flight are strictly preserved.
 * - Retains pending data after network failures or uncertain responses.
 * - Fails safely and gracefully if IndexedDB is disabled, blocked, or unavailable.
 */

import type { PendingProgressBatch } from './types.ts'

const DB_NAME = 'hatchpen_reading_progress_v2'
const STORE_NAME = 'pending_batches'
const DB_VERSION = 1

interface StorageRecord {
  workId: string
  batchId: string
  batch: PendingProgressBatch
  savedAt: number
}

// Fallback in-memory map for environments where IndexedDB is unavailable (Node.js, SSR, private browsing)
const memoryStore = new Map<string, StorageRecord>()

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' && window.indexedDB !== null
  } catch {
    return false
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'workId' })
        }
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        // Fall back gracefully to memory store without breaking the reader
        resolve(null)
      }

      request.onblocked = () => {
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
}

/**
 * Persists an eligible pending batch locally before network transmission.
 */
export async function savePendingBatchToStorage(
  batch: PendingProgressBatch
): Promise<boolean> {
  if (!batch || !batch.workId) return false

  const record: StorageRecord = {
    workId: batch.workId,
    batchId: batch.batchId,
    batch,
    savedAt: Date.now(),
  }

  // Always keep in-memory fallback updated
  memoryStore.set(batch.workId, record)

  const db = await openDatabase()
  if (!db) return true // In-memory fallback succeeded

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const putReq = store.put(record)

      putReq.onsuccess = () => resolve(true)
      putReq.onerror = () => {
        // Fallback already recorded in memoryStore
        resolve(true)
      }
      tx.oncomplete = () => db.close()
    } catch {
      resolve(true)
    }
  })
}

/**
 * Retrieves the pending batch for a specific work.
 */
export async function getPendingBatchFromStorage(
  workId: string
): Promise<PendingProgressBatch | null> {
  if (!workId) return null

  const db = await openDatabase()
  if (!db) {
    const mem = memoryStore.get(workId)
    return mem ? mem.batch : null
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(workId)

      getReq.onsuccess = () => {
        const result = getReq.result as StorageRecord | undefined
        if (result && result.batch) {
          resolve(result.batch)
        } else {
          const mem = memoryStore.get(workId)
          resolve(mem ? mem.batch : null)
        }
      }

      getReq.onerror = () => {
        const mem = memoryStore.get(workId)
        resolve(mem ? mem.batch : null)
      }

      tx.oncomplete = () => db.close()
    } catch {
      const mem = memoryStore.get(workId)
      resolve(mem ? mem.batch : null)
    }
  })
}

/**
 * Removes ONLY the exact acknowledged batch after confirmed server success.
 * If a newer batch was written while an older batch was in flight, the newer batch is preserved!
 */
export async function clearAcknowledgedBatchFromStorage(
  workId: string,
  acknowledgedBatchId: string
): Promise<boolean> {
  if (!workId || !acknowledgedBatchId) return false

  // Check in-memory record first
  const mem = memoryStore.get(workId)
  if (mem) {
    if (mem.batchId === acknowledgedBatchId) {
      memoryStore.delete(workId)
    }
    // If mem.batchId !== acknowledgedBatchId, do NOT delete (newer batch is preserved)
  }

  const db = await openDatabase()
  if (!db) return true

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(workId)

      getReq.onsuccess = () => {
        const existing = getReq.result as StorageRecord | undefined
        if (existing && existing.batchId === acknowledgedBatchId) {
          // Exact batch matches: safely remove from storage
          const delReq = store.delete(workId)
          delReq.onsuccess = () => resolve(true)
          delReq.onerror = () => resolve(false)
        } else {
          // Newer batch arrived or record doesn't match: preserve existing record!
          resolve(true)
        }
      }

      getReq.onerror = () => resolve(false)
      tx.oncomplete = () => db.close()
    } catch {
      resolve(false)
    }
  })
}

/**
 * Returns all pending batches across all works (useful on startup / recovery reconciliation).
 */
export async function getAllPendingBatchesFromStorage(): Promise<PendingProgressBatch[]> {
  const db = await openDatabase()
  if (!db) {
    return Array.from(memoryStore.values()).map((r) => r.batch)
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getAllReq = store.getAll()

      getAllReq.onsuccess = () => {
        const records = (getAllReq.result || []) as StorageRecord[]
        const batches = records.map((r) => r.batch).filter(Boolean)
        resolve(batches)
      }

      getAllReq.onerror = () => {
        resolve(Array.from(memoryStore.values()).map((r) => r.batch))
      }

      tx.oncomplete = () => db.close()
    } catch {
      resolve(Array.from(memoryStore.values()).map((r) => r.batch))
    }
  })
}

/**
 * Resets local test store (used exclusively in test suites).
 */
export function _resetMemoryStoreForTesting(): void {
  memoryStore.clear()
}
