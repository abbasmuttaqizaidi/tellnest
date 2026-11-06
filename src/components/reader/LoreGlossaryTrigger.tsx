import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

export interface LoreGlossaryTriggerProps {
  text: string
  entityType?: string
  description: string
}

export function LoreGlossaryTrigger({
  text,
  entityType = 'LORE',
  description,
}: LoreGlossaryTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean } | null>(null)
  const hoverTimeoutRef = useRef<any>(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const popoverWidth = 240
    const popoverEstimatedHeight = 70
    const padding = 12

    // Center horizontally on trigger word, but clamp within screen
    let left = rect.left + rect.width / 2 - popoverWidth / 2
    if (left < padding) left = padding
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding
    }

    // Place above if there is space, else below
    const spaceAbove = rect.top
    const placeAbove = spaceAbove > popoverEstimatedHeight + 16
    const top = placeAbove
      ? rect.top + window.scrollY - 8
      : rect.bottom + window.scrollY + 8

    setCoords({ top, left, placeAbove })
  }, [])

  const handleOpen = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    updatePosition()
    setIsOpen(true)
  }

  const handleClose = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setIsOpen(false)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isOpen) {
      handleClose()
    } else {
      handleOpen()
    }
  }

  const handleMouseEnter = () => {
    // Only auto-open on hover on devices that support hover (desktop)
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = setTimeout(handleOpen, 120)
    }
  }

  const handleMouseLeave = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = setTimeout(handleClose, 250)
    }
  }

  // Recalculate position on scroll / resize when open
  useEffect(() => {
    if (!isOpen) return
    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('scroll', handleScrollOrResize, { passive: true })
    window.addEventListener('resize', handleScrollOrResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, updatePosition])

  // Dismiss on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        handleClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Clean formatted entity type (uppercase)
  const displayType = (entityType || 'LORE').trim().toUpperCase()

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline font-inherit text-inherit underline underline-offset-4 decoration-1 hover:text-[var(--ink-primary)] transition-colors cursor-pointer select-text bg-transparent border-none p-0 m-0"
        aria-label={`${text} (${displayType}) - ${description}`}
        aria-expanded={isOpen}
      >
        {text}
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
            }}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'absolute',
              top: coords.top,
              left: coords.left,
              transform: coords.placeAbove ? 'translateY(-100%)' : 'none',
              width: '240px',
            }}
            className="z-[9999] pointer-events-auto animate-in fade-in zoom-in-95 duration-150 rounded-lg p-2.5 bg-[var(--bg-surface)] text-[var(--ink-primary)] border border-[var(--border-subtle)] shadow-xl text-left"
          >
            {/* Entity Type */}
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-black dark:text-white select-none">
              {displayType}
            </div>

            {/* Description */}
            <div className="mt-1 text-xs text-[var(--ink-primary)] leading-snug font-sans break-words whitespace-normal select-text">
              {description}
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
