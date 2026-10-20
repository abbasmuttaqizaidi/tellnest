import { create } from 'zustand'
import type {
  ParagraphInfo,
  ReadingPosition,
  PendingProgressBatch,
} from './types.ts'
import { calculateStoryProgressPercent } from './paragraphUtils.ts'

function generateBatchId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'b-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
}

export interface ReadingProgressState {
  workId: string | null
  chapterId: string | null
  totalParagraphs: number
  /** Latest eligible reading position (can move backwards when reader scrolls up) */
  lastPosition: ReadingPosition | null
  /** Highest eligible paragraph order index reached in the whole story */
  highestOrderIndex: number
  /** Whole-story progress percentage (monotonically non-decreasing) */
  progressPercent: number
  /** The currently visible candidate paragraph (may not yet have reached 3 seconds) */
  candidateParagraph: ParagraphInfo | null
  /** Pending batch awaiting server acknowledgement */
  pendingBatch: PendingProgressBatch | null
  /** Network sync indicator */
  isSyncing: boolean

  // Actions
  initStory: (params: {
    workId: string
    chapterId: string
    totalParagraphs: number
    initialHighestOrderIndex?: number
    initialLastPosition?: ReadingPosition | null
    initialProgressPercent?: number
  }) => void

  setCandidateParagraph: (paragraph: ParagraphInfo | null) => void

  /**
   * Marks a paragraph as eligible after passing the 3-second visibility threshold.
   * Updates last_position, advances highestOrderIndex if greater, and enqueues a pending batch.
   */
  markParagraphEligible: (paragraph: ParagraphInfo) => PendingProgressBatch | null

  /** Manually sets or enqueues a pending batch (e.g. during recovery) */
  setPendingBatch: (batch: PendingProgressBatch | null) => void

  /**
   * Acknowledges server save. Deletes ONLY the batch matching batchId.
   * If a newer batch arrived while the older batch was in-flight, the newer batch is preserved!
   */
  acknowledgeBatch: (batchId: string) => boolean

  setSyncing: (isSyncing: boolean) => void

  reset: () => void
}

export const useReadingProgressStore = create<ReadingProgressState>((set, get) => ({
  workId: null,
  chapterId: null,
  totalParagraphs: 0,
  lastPosition: null,
  highestOrderIndex: 0,
  progressPercent: 0,
  candidateParagraph: null,
  pendingBatch: null,
  isSyncing: false,

  initStory: ({
    workId,
    chapterId,
    totalParagraphs,
    initialHighestOrderIndex = 0,
    initialLastPosition = null,
    initialProgressPercent = 0,
  }) => {
    const highest = Math.max(0, initialHighestOrderIndex)
    const calcPercent = totalParagraphs > 0 ? calculateStoryProgressPercent(highest, totalParagraphs) : initialProgressPercent
    const resolvedPercent = Math.max(initialProgressPercent, calcPercent)

    set({
      workId,
      chapterId,
      totalParagraphs,
      highestOrderIndex: highest,
      progressPercent: resolvedPercent,
      lastPosition: initialLastPosition,
      candidateParagraph: null,
      pendingBatch: null,
      isSyncing: false,
    })
  },

  setCandidateParagraph: (paragraph) => {
    set({ candidateParagraph: paragraph })
  },

  markParagraphEligible: (paragraph) => {
    const state = get()
    if (!state.workId || !paragraph) return null

    // Avoid duplicate batch generation if reader is already at this exact position and progress is stable
    const isSamePosition =
      state.lastPosition?.paragraphId === paragraph.id &&
      state.lastPosition?.orderIndex === paragraph.orderIndex

    const newHighest = Math.max(state.highestOrderIndex, paragraph.orderIndex)
    const newPercent = calculateStoryProgressPercent(newHighest, state.totalParagraphs)

    // Progress percent must never decrease
    const finalPercent = Math.max(state.progressPercent, newPercent)

    const newPosition: ReadingPosition = {
      paragraphId: paragraph.id,
      orderIndex: paragraph.orderIndex,
      chapterId: paragraph.chapterId,
      timestamp: Date.now(),
    }

    if (isSamePosition && state.highestOrderIndex >= paragraph.orderIndex && !state.pendingBatch) {
      // Nothing changed and no pending persistence required
      return null
    }

    const newBatch: PendingProgressBatch = {
      batchId: generateBatchId(),
      workId: state.workId,
      chapterId: paragraph.chapterId,
      lastPosition: newPosition,
      highestOrderIndex: newHighest,
      totalParagraphs: state.totalParagraphs,
      progressPercent: finalPercent,
      createdAt: Date.now(),
      attempts: 0,
    }

    set({
      lastPosition: newPosition,
      highestOrderIndex: newHighest,
      progressPercent: finalPercent,
      pendingBatch: newBatch,
    })

    return newBatch
  },

  setPendingBatch: (batch) => {
    set({ pendingBatch: batch })
  },

  acknowledgeBatch: (batchId) => {
    const current = get().pendingBatch
    if (current && current.batchId === batchId) {
      // Only clear if the in-memory batch matches the acknowledged batch
      set({ pendingBatch: null, isSyncing: false })
      return true
    }
    // Newer batch arrived or ID did not match; preserve current pending batch
    set({ isSyncing: false })
    return false
  },

  setSyncing: (isSyncing) => {
    set({ isSyncing })
  },

  reset: () => {
    set({
      workId: null,
      chapterId: null,
      totalParagraphs: 0,
      lastPosition: null,
      highestOrderIndex: 0,
      progressPercent: 0,
      candidateParagraph: null,
      pendingBatch: null,
      isSyncing: false,
    })
  },
}))
