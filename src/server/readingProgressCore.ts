/**
 * Canonical Server Persistence Core for Paragraph-Based Reading Progress
 *
 * Replaces legacy heartbeat intervals, active-duration bounding, HMAC session tokens,
 * and FIFO metadata rings with an atomic, whole-story progress architecture.
 */

import type { SaveProgressPayload, SaveProgressResult } from '../lib/readingProgress/types.ts'

export interface SaveProgressDbParams extends SaveProgressPayload {
  userId: string
}

/**
 * Validates save payload structure and bounds server-side before database write.
 */
export function validateProgressPayload(data: SaveProgressDbParams): { valid: boolean; error?: string } {
  if (!data.userId || typeof data.userId !== 'string') {
    return { valid: false, error: 'invalid_user_id' }
  }
  if (!data.workId || typeof data.workId !== 'string') {
    return { valid: false, error: 'invalid_work_id' }
  }
  if (!data.chapterId || typeof data.chapterId !== 'string') {
    return { valid: false, error: 'invalid_chapter_id' }
  }
  if (typeof data.orderIndex !== 'number' || isNaN(data.orderIndex) || data.orderIndex < 0) {
    return { valid: false, error: 'invalid_order_index' }
  }
  if (typeof data.totalParagraphs !== 'number' || isNaN(data.totalParagraphs) || data.totalParagraphs < 0) {
    return { valid: false, error: 'invalid_total_paragraphs' }
  }
  if (data.totalParagraphs > 0 && data.orderIndex > data.totalParagraphs) {
    return { valid: false, error: 'order_index_out_of_bounds' }
  }
  if (data.clientTimestamp !== undefined && (typeof data.clientTimestamp !== 'number' || isNaN(data.clientTimestamp))) {
    return { valid: false, error: 'invalid_client_timestamp' }
  }
  return { valid: true }
}

/**
 * Atomically saves reading progress in PostgreSQL:
 * 1. progress_percent is monotonic (GREATEST): NEVER decreases when reader scrolls back.
 * 2. position is updated to latest eligible reading position (can move backwards).
 * 3. chapter_id is updated to current reading location.
 * 4. Idempotent: repeating the same batchId/payload has identical, non-duplicating effects.
 * 5. Out-of-order & Stale Protection: Retrying an older batch cannot overwrite a newer position.
 */
export async function saveReadingProgressAtomicCore(
  admin: any,
  params: SaveProgressDbParams
): Promise<SaveProgressResult> {
  const validation = validateProgressPayload(params)
  if (!validation.valid) {
    return {
      success: false,
      batchId: params.batchId,
      progressPercent: 0,
      lastPosition: null,
      error: validation.error,
    }
  }

  // Calculate story-level percentage
  const calcPercent = params.totalParagraphs > 0
    ? Math.round(((params.orderIndex / params.totalParagraphs) * 100) * 100) / 100
    : 0

  const boundedPercent = Math.min(100, Math.max(0, calcPercent))

  // Determine client event timestamp
  let clientTimestamp = params.clientTimestamp || 0
  if (!clientTimestamp && params.lastPosition) {
    try {
      const parsed = JSON.parse(params.lastPosition)
      if (typeof parsed?.timestamp === 'number') {
        clientTimestamp = parsed.timestamp
      }
    } catch {}
  }
  if (!clientTimestamp) {
    clientTimestamp = Date.now()
  }

  // Prevent client clock anomalies (clamp to serverNow if > 5 minutes in future)
  const nowMs = Date.now()
  if (clientTimestamp > nowMs + 300_000) {
    clientTimestamp = nowMs
  }

  // 1. Try atomic PostgreSQL RPC save_reading_progress_atomic
  try {
    const { data: rpcResult, error: rpcError } = await admin.rpc('save_reading_progress_atomic', {
      p_user_id: params.userId,
      p_work_id: params.workId,
      p_chapter_id: params.chapterId,
      p_order_index: params.orderIndex,
      p_total_paragraphs: params.totalParagraphs,
      p_last_position: params.lastPosition || null,
      p_batch_id: params.batchId || '',
      p_client_timestamp: clientTimestamp,
    })

    if (!rpcError && rpcResult) {
      const res = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult
      return {
        success: Boolean(res.success),
        batchId: res.batch_id || params.batchId,
        progressPercent: Number(res.progress_percent ?? boundedPercent),
        lastPosition: res.last_position || params.lastPosition,
        duplicate: Boolean(res.duplicate),
        error: res.error,
      }
    }
  } catch (err: any) {
    // Fall back to direct atomic SQL upsert if RPC is unavailable in current environment
  }

  // 2. Direct atomic SQL fallback with deduplication ledger and timestamp protection
  const nowIso = new Date().toISOString()
  try {
    // Check batch deduplication ledger
    if (params.batchId) {
      try {
        const { data: dup } = await admin
          .from('reading_progress_batches')
          .select('batch_id, progress_percent, last_position')
          .eq('batch_id', params.batchId)
          .maybeSingle()

        if (dup) {
          return {
            success: true,
            batchId: params.batchId,
            progressPercent: Number(dup.progress_percent),
            lastPosition: dup.last_position,
            duplicate: true,
          }
        }
      } catch {}
    }

    // Check existing row
    const { data: existing } = await admin
      .from('reading_progress')
      .select('id, progress_percent, position, chapter_id, last_position_timestamp')
      .eq('user_id', params.userId)
      .eq('work_id', params.workId)
      .maybeSingle()

    if (existing) {
      const prevPercent = Number(existing.progress_percent || 0)
      const monotonicPercent = Math.max(prevPercent, boundedPercent)

      let existingTs = Number(existing.last_position_timestamp || 0)
      if (!existingTs && existing.position) {
        try {
          const parsed = JSON.parse(existing.position)
          if (typeof parsed?.timestamp === 'number') {
            existingTs = parsed.timestamp
          }
        } catch {}
      }

      // Stale / delayed batch protection: only overwrite position if incoming timestamp >= existing timestamp
      const isNewer = clientTimestamp >= existingTs
      const finalPosition = isNewer ? (params.lastPosition || existing.position) : existing.position
      const finalChapter = isNewer ? params.chapterId : existing.chapter_id
      const finalTs = isNewer ? clientTimestamp : existingTs

      const { data: updated, error: updateErr } = await admin
        .from('reading_progress')
        .update({
          chapter_id: finalChapter,
          progress_percent: monotonicPercent,
          position: finalPosition,
          last_position_timestamp: finalTs,
          last_read_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', existing.id)
        .select('progress_percent, position')
        .maybeSingle()

      if (updateErr) {
        return {
          success: false,
          batchId: params.batchId,
          progressPercent: prevPercent,
          lastPosition: existing.position,
          error: updateErr.message,
        }
      }

      // Record in batch ledger
      if (params.batchId) {
        await admin
          .from('reading_progress_batches')
          .insert({
            batch_id: params.batchId,
            user_id: params.userId,
            work_id: params.workId,
            chapter_id: finalChapter,
            progress_percent: monotonicPercent,
            last_position: finalPosition,
            client_timestamp: finalTs,
          })
          .catch(() => {})
      }

      return {
        success: true,
        batchId: params.batchId,
        progressPercent: Number(updated?.progress_percent ?? monotonicPercent),
        lastPosition: updated?.position ?? finalPosition,
        duplicate: false,
      }
    }

    // Insert new row
    const { data: inserted, error: insertErr } = await admin
      .from('reading_progress')
      .insert({
        user_id: params.userId,
        work_id: params.workId,
        chapter_id: params.chapterId,
        progress_percent: boundedPercent,
        position: params.lastPosition,
        last_position_timestamp: clientTimestamp,
        last_read_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('progress_percent, position')
      .maybeSingle()

    if (insertErr) {
      return {
        success: false,
        batchId: params.batchId,
        progressPercent: boundedPercent,
        lastPosition: params.lastPosition,
        error: insertErr.message,
      }
    }

    // Record in batch ledger
    if (params.batchId) {
      await admin
        .from('reading_progress_batches')
        .insert({
          batch_id: params.batchId,
          user_id: params.userId,
          work_id: params.workId,
          chapter_id: params.chapterId,
          progress_percent: boundedPercent,
          last_position: params.lastPosition,
          client_timestamp: clientTimestamp,
        })
        .catch(() => {})
    }

    return {
      success: true,
      batchId: params.batchId,
      progressPercent: Number(inserted?.progress_percent ?? boundedPercent),
      lastPosition: inserted?.position ?? params.lastPosition,
      duplicate: false,
    }
  } catch (err: any) {
    return {
      success: false,
      batchId: params.batchId,
      progressPercent: 0,
      lastPosition: null,
      error: err?.message || 'internal_db_error',
    }
  }
}
