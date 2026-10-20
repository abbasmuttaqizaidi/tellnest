/**
 * Types and Data Contracts for the Paragraph-Based Reading Progress System
 */

export interface ParagraphInfo {
  /** Stable identifier scoped to story content (e.g. `${chapterId}:p${chapterLocalIndex}`) */
  id: string
  /** The chapter this paragraph belongs to */
  chapterId: string
  /** Zero-based paragraph index within the chapter */
  chapterIndex: number
  /** Deterministic one-based order index across the whole story (1 to totalParagraphs) */
  orderIndex: number
  /** Text preview of the paragraph */
  textPreview?: string
}

export interface ReadingPosition {
  /** Stable identifier of the paragraph */
  paragraphId: string
  /** One-based global story order index */
  orderIndex: number
  /** Chapter ID */
  chapterId: string
  /** Timestamp when the position was recorded */
  timestamp: number
}

export interface ChapterParagraphOffset {
  startOrderIndex: number
  paragraphCount: number
}

export interface StoryParagraphMap {
  workId: string
  totalParagraphs: number
  paragraphs: ParagraphInfo[]
  paragraphsById: Record<string, ParagraphInfo>
  chapterOffsets: Record<string, ChapterParagraphOffset>
}

export interface PendingProgressBatch {
  /** Unique identifier for this save attempt / batch */
  batchId: string
  workId: string
  chapterId: string
  lastPosition: ReadingPosition
  highestOrderIndex: number
  totalParagraphs: number
  progressPercent: number
  createdAt: number
  attempts: number
}

export interface SaveProgressPayload {
  workId: string
  chapterId: string
  batchId: string
  paragraphId: string
  orderIndex: number
  totalParagraphs: number
  lastPosition: string // Serialized ReadingPosition
  clientTimestamp?: number
}

export interface SaveProgressResult {
  success: boolean
  batchId: string
  progressPercent: number
  lastPosition: string | null
  duplicate?: boolean
  error?: string
}
