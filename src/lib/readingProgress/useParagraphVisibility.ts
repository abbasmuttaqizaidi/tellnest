/**
 * Paragraph Visibility Eligibility Engine & React Hook.
 *
 * Implements the 3-second visibility eligibility rule:
 * - A paragraph becomes eligible ONLY after remaining visible in the viewport for MORE than 3 seconds (> 3000ms).
 * - A paragraph visible for <= 3 seconds must not update persisted progress or last_position.
 * - Rapid scrolling past paragraphs is ignored without triggering eligibility.
 * - Inactive/hidden document or window blur pauses accumulation; resumed safely upon focus.
 * - Avoids counting the same elapsed interval twice.
 */

import { useEffect, useRef } from 'react'
import type { ParagraphInfo } from './types.ts'
import { useReadingProgressStore } from './readingProgressStore.ts'
import { savePendingBatchToStorage } from './indexedDbRecovery.ts'

export interface VisibilityTrackerEntry {
  paragraph: ParagraphInfo
  visibleSince: number | null
  accumulatedMs: number
  timerId: ReturnType<typeof setTimeout> | null
  isEligible: boolean
}

/**
 * Pure engine for tracking paragraph visibility and 3-second eligibility.
 * Testable in both Node.js unit tests and browser DOM environments.
 */
export class ParagraphVisibilityEngine {
  private entries = new Map<string, VisibilityTrackerEntry>()
  private isVisible = true
  private onEligible: (paragraph: ParagraphInfo) => void
  private onCandidateChange?: (paragraph: ParagraphInfo | null) => void
  private eligibilityThresholdMs: number

  constructor(options: {
    onEligible: (paragraph: ParagraphInfo) => void
    onCandidateChange?: (paragraph: ParagraphInfo | null) => void
    eligibilityThresholdMs?: number
  }) {
    this.onEligible = options.onEligible
    this.onCandidateChange = options.onCandidateChange
    // Strictly MORE than 3 seconds (> 3000ms)
    this.eligibilityThresholdMs = options.eligibilityThresholdMs ?? 3000
  }

  /**
   * Called when an element becomes visible in the viewport (even 1 line visible).
   */
  handleIntersectionEnter(paragraph: ParagraphInfo, now = Date.now()): void {
    if (!paragraph || !paragraph.id) return

    let entry = this.entries.get(paragraph.id)
    if (!entry) {
      entry = {
        paragraph,
        visibleSince: null,
        accumulatedMs: 0,
        timerId: null,
        isEligible: false,
      }
      this.entries.set(paragraph.id, entry)
    }

    // Update candidate paragraph
    this.updateCurrentCandidate()

    if (entry.isEligible) {
      // Already marked eligible; still record as latest candidate/position
      this.onEligible(paragraph)
      return
    }

    if (this.isVisible && entry.visibleSince === null) {
      entry.visibleSince = now
      this.scheduleEligibilityCheck(entry, now)
    }
  }

  /**
   * Called when an element exits the viewport (scrolled away).
   */
  handleIntersectionExit(paragraphId: string, now = Date.now()): void {
    const entry = this.entries.get(paragraphId)
    if (!entry) return

    if (entry.timerId !== null) {
      clearTimeout(entry.timerId)
      entry.timerId = null
    }

    if (entry.visibleSince !== null) {
      const elapsed = now - entry.visibleSince
      entry.accumulatedMs += Math.max(0, elapsed)
      entry.visibleSince = null
    }

    // If the paragraph scrolled out before reaching > 3 seconds, discard unfulfilled progress
    if (!entry.isEligible) {
      this.entries.delete(paragraphId)
    }

    this.updateCurrentCandidate()
  }

  /**
   * Pauses timers when document is hidden or window blurs.
   */
  handleVisibilityPause(now = Date.now()): void {
    this.isVisible = false

    for (const entry of this.entries.values()) {
      if (entry.timerId !== null) {
        clearTimeout(entry.timerId)
        entry.timerId = null
      }
      if (entry.visibleSince !== null) {
        const elapsed = now - entry.visibleSince
        entry.accumulatedMs += Math.max(0, elapsed)
        entry.visibleSince = null
      }
    }
  }

  /**
   * Resumes timers when document is visible and window gains focus.
   */
  handleVisibilityResume(now = Date.now()): void {
    this.isVisible = true

    for (const entry of this.entries.values()) {
      if (!entry.isEligible && entry.visibleSince === null) {
        entry.visibleSince = now
        this.scheduleEligibilityCheck(entry, now)
      }
    }

    this.updateCurrentCandidate()
  }

  /**
   * Checks elapsed time and schedules the eligibility transition.
   */
  private scheduleEligibilityCheck(entry: VisibilityTrackerEntry, now: number): void {
    if (entry.isEligible) return

    const currentTotal = entry.accumulatedMs + (entry.visibleSince !== null ? now - entry.visibleSince : 0)

    // Strictly MORE than threshold: > 3000ms
    if (currentTotal > this.eligibilityThresholdMs) {
      this.markEligible(entry)
      return
    }

    // Schedule remaining time plus 1 millisecond so it is strictly > 3000ms
    const remainingMs = Math.max(1, this.eligibilityThresholdMs - currentTotal + 1)

    entry.timerId = setTimeout(() => {
      entry.timerId = null
      if (!this.isVisible) return

      const checkNow = Date.now()
      const totalElapsed = entry.accumulatedMs + (entry.visibleSince !== null ? checkNow - entry.visibleSince : 0)

      if (totalElapsed > this.eligibilityThresholdMs) {
        this.markEligible(entry)
      }
    }, remainingMs)
  }

  private markEligible(entry: VisibilityTrackerEntry): void {
    entry.isEligible = true
    if (entry.timerId !== null) {
      clearTimeout(entry.timerId)
      entry.timerId = null
    }
    this.onEligible(entry.paragraph)
  }

  private updateCurrentCandidate(): void {
    let highestOrderCandidate: ParagraphInfo | null = null

    for (const entry of this.entries.values()) {
      if (!highestOrderCandidate || entry.paragraph.orderIndex > highestOrderCandidate.orderIndex) {
        highestOrderCandidate = entry.paragraph
      }
    }

    this.onCandidateChange?.(highestOrderCandidate)
  }

  /**
   * Directly test if a paragraph is marked eligible.
   */
  isParagraphEligible(paragraphId: string): boolean {
    return this.entries.get(paragraphId)?.isEligible ?? false
  }

  /**
   * For testing manual elapsed time advances.
   */
  advanceTime(ms: number): void {
    for (const entry of this.entries.values()) {
      if (entry.visibleSince !== null && !entry.isEligible) {
        const total = entry.accumulatedMs + ms
        entry.accumulatedMs = total
        if (total > this.eligibilityThresholdMs) {
          this.markEligible(entry)
        }
      }
    }
  }

  destroy(): void {
    for (const entry of this.entries.values()) {
      if (entry.timerId !== null) {
        clearTimeout(entry.timerId)
      }
    }
    this.entries.clear()
  }
}

/**
 * React hook connecting DOM paragraph elements to the 3-second visibility eligibility rule.
 */
export function useParagraphVisibility(
  paragraphs: ParagraphInfo[],
  containerRef: React.RefObject<HTMLElement | null>
) {
  const store = useReadingProgressStore()
  const engineRef = useRef<ParagraphVisibilityEngine | null>(null)

  useEffect(() => {
    const engine = new ParagraphVisibilityEngine({
      onEligible: (paragraph) => {
        const batch = store.markParagraphEligible(paragraph)
        if (batch) {
          // Immediately persist pending batch to IndexedDB recovery layer
          savePendingBatchToStorage(batch).catch(() => {})
        }
      },
      onCandidateChange: (candidate) => {
        store.setCandidateParagraph(candidate)
      },
    })

    engineRef.current = engine

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        engine.handleVisibilityPause()
      } else {
        engine.handleVisibilityResume()
      }
    }

    const handleBlur = () => engine.handleVisibilityPause()
    const handleFocus = () => engine.handleVisibilityResume()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    // Build map for quick element lookup
    const paragraphsByOrder = new Map<number, ParagraphInfo>()
    for (const p of paragraphs) {
      paragraphsByOrder.set(p.orderIndex, p)
    }

    // Set up IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement
          const orderStr = target.getAttribute('data-paragraph-order')
          if (!orderStr) continue

          const order = parseInt(orderStr, 10)
          const paragraph = paragraphsByOrder.get(order)
          if (!paragraph) continue

          if (entry.isIntersecting) {
            engine.handleIntersectionEnter(paragraph)
          } else {
            engine.handleIntersectionExit(paragraph.id)
          }
        }
      },
      {
        root: null, // viewport
        threshold: 0.01, // even a single line/pixel visible triggers candidate
      }
    )

    // Observe all paragraph DOM nodes in container
    const container = containerRef.current
    if (container) {
      const pElements = container.querySelectorAll('p[data-paragraph-order]')
      pElements.forEach((el) => observer.observe(el))
    }

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      engine.destroy()
    }
  }, [paragraphs, containerRef])

  return engineRef
}
