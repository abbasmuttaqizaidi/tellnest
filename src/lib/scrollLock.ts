import { useEffect } from 'react'

let lockCount = 0
let originalBodyOverflow = ''
let originalHtmlOverflow = ''
let originalBodyPaddingRight = ''

/**
 * Locks background scrolling without causing layout shifts.
 * Measures scrollbar width and applies padding compensation to document.body
 * and sets the CSS variable `--scrollbar-width`.
 * Reference-counted to safely handle stacked or nested modals.
 */
export function lockScroll(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {}
  }

  if (lockCount === 0) {
    // Measure scrollbar width before locking
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)

    originalBodyOverflow = document.body.style.overflow
    originalHtmlOverflow = document.documentElement.style.overflow
    originalBodyPaddingRight = document.body.style.paddingRight

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`)
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  }

  lockCount++

  let unlocked = false
  return () => {
    if (unlocked) return
    unlocked = true
    unlockScroll()
  }
}

export function unlockScroll(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  lockCount = Math.max(0, lockCount - 1)

  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow
    document.documentElement.style.overflow = originalHtmlOverflow
    document.body.style.paddingRight = originalBodyPaddingRight
    document.documentElement.style.removeProperty('--scrollbar-width')
    originalBodyOverflow = ''
    originalHtmlOverflow = ''
    originalBodyPaddingRight = ''
  }
}

/**
 * React hook to lock scroll when `enabled` is true and automatically
 * release lock on unmount or when `enabled` becomes false.
 */
export function useScrollLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return
    const cleanup = lockScroll()
    return () => {
      cleanup()
    }
  }, [enabled])
}
