import type { ParagraphInfo, StoryParagraphMap } from './types.ts'

/**
 * Splits chapter prose text into clean paragraph strings.
 * Follows the project standard of separating by blank lines (double newline).
 */
export function extractParagraphTexts(content: string): string[] {
  if (!content || typeof content !== 'string') return []
  return content
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Parses a chapter's content into ordered ParagraphInfo records.
 * @param content The prose content of the chapter
 * @param chapterId Chapter UUID or identifier
 * @param startOrderIndex The starting 1-based order index across the story
 */
export function parseChapterParagraphs(
  content: string,
  chapterId: string,
  startOrderIndex = 1
): ParagraphInfo[] {
  const texts = extractParagraphTexts(content)
  return texts.map((text, idx) => ({
    id: `${chapterId}:p${idx}`,
    chapterId,
    chapterIndex: idx,
    orderIndex: startOrderIndex + idx,
    textPreview: text.slice(0, 60),
  }))
}

export interface ChapterInput {
  id: string
  chapter_number?: number
  number?: number
  content?: string
}

/**
 * Builds a deterministic whole-story paragraph map across all readable chapters of a work.
 * Chapters are ordered strictly by chapter number ascending.
 * Denominator is the total ordered paragraph count across the whole story.
 */
export function buildStoryParagraphMap(
  chapters: ChapterInput[],
  workId: string
): StoryParagraphMap {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    return {
      workId,
      totalParagraphs: 0,
      paragraphs: [],
      paragraphsById: {},
      chapterOffsets: {},
    }
  }

  // Sort chapters deterministically by chapter_number or number
  const sortedChapters = [...chapters].sort((a, b) => {
    const numA = typeof a.chapter_number === 'number' ? a.chapter_number : (a.number ?? 0)
    const numB = typeof b.chapter_number === 'number' ? b.chapter_number : (b.number ?? 0)
    return numA - numB
  })

  const allParagraphs: ParagraphInfo[] = []
  const paragraphsById: Record<string, ParagraphInfo> = {}
  const chapterOffsets: Record<string, { startOrderIndex: number; paragraphCount: number }> = {}

  let currentOrderIndex = 1

  for (const ch of sortedChapters) {
    const chParagraphs = parseChapterParagraphs(ch.content || '', ch.id, currentOrderIndex)
    chapterOffsets[ch.id] = {
      startOrderIndex: currentOrderIndex,
      paragraphCount: chParagraphs.length,
    }

    for (const p of chParagraphs) {
      allParagraphs.push(p)
      paragraphsById[p.id] = p
    }

    currentOrderIndex += chParagraphs.length
  }

  return {
    workId,
    totalParagraphs: allParagraphs.length,
    paragraphs: allParagraphs,
    paragraphsById,
    chapterOffsets,
  }
}

/**
 * Computes the whole-story progress percentage based on the highest eligible paragraph order index.
 * Progress = (highestOrderIndex / totalParagraphs) * 100
 * Clamped strictly between 0% and 100%, rounded to two decimal places.
 */
export function calculateStoryProgressPercent(
  highestOrderIndex: number,
  totalParagraphs: number
): number {
  if (!totalParagraphs || totalParagraphs <= 0 || highestOrderIndex <= 0) {
    return 0
  }
  const raw = (highestOrderIndex / totalParagraphs) * 100
  const clamped = Math.min(100, Math.max(0, raw))
  return Math.round(clamped * 100) / 100
}
