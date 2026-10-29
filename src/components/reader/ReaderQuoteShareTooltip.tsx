import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { FaXTwitter, FaWhatsapp } from 'react-icons/fa6'
import { useApp } from '../../context/AppContext'

interface ReaderQuoteShareTooltipProps {
  containerRef: React.RefObject<HTMLElement | null>
  storyTitle: string
  authorName: string
  chapterTitle: string
  workId: string
  chapterId: string
  canonicalUrl?: string
}

interface Position {
  top: number
  left: number
}

export function ReaderQuoteShareTooltip({
  containerRef,
  storyTitle,
  authorName,
  chapterTitle,
  workId,
  chapterId,
  canonicalUrl,
}: ReaderQuoteShareTooltipProps) {
  const shareUrl = canonicalUrl || `https://hatchpen.com/read/${workId}/${chapterId}`
  const [selectedText, setSelectedText] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [copied, setCopied] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useApp()

  const handleSelection = useCallback(() => {
    if (typeof window === 'undefined') return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setPosition(null)
      setSelectedText('')
      return
    }

    const text = selection.toString().trim()
    // Require at least 5 characters to avoid accidental single-word triggers
    if (text.length < 5) {
      setPosition(null)
      setSelectedText('')
      return
    }

    // Check if selection is within the prose container
    const container = containerRef.current
    if (container && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const commonAncestor = range.commonAncestorContainer
      const isInside = container.contains(commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor)
      if (!isInside) {
        setPosition(null)
        setSelectedText('')
        return
      }

      const rect = range.getBoundingClientRect()
      // Position above the selection, centered horizontally
      const tooltipHeight = 44
      const tooltipWidth = 190
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      let top = rect.top + scrollY - tooltipHeight - 10
      // If too close to viewport top, show beneath selection
      if (rect.top < tooltipHeight + 16) {
        top = rect.bottom + scrollY + 10
      }

      let left = rect.left + scrollX + rect.width / 2 - tooltipWidth / 2
      // Clamp within viewport margins
      left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12))

      setSelectedText(text)
      setPosition({ top, left })
    }
  }, [containerRef])

  useEffect(() => {
    const onMouseUp = () => {
      // Delay slightly so browser finalizes selection bounds
      setTimeout(handleSelection, 20)
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPosition(null)
        setSelectedText('')
        return
      }
      setTimeout(handleSelection, 20)
    }

    const onScroll = () => {
      // Reposition on scroll if active
      if (selectedText) {
        handleSelection()
      }
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keyup', onKeyUp)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('scroll', onScroll)
    }
  }, [handleSelection, selectedText])

  if (!position || !selectedText) return null

  // Clean quote text for citations
  const cleanSnippet = selectedText.replace(/\s+/g, ' ').slice(0, 240)
  const fullCitation = `“${cleanSnippet}”\n— ${storyTitle} (${chapterTitle}) by ${authorName}\n${shareUrl}`

  const handleCopyQuote = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullCitation)
      } else {
        const input = document.createElement('textarea')
        input.value = fullCitation
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      showToast('Quote copied with citation!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy quote', 'error')
    }
  }

  const handleShareTwitter = (e: React.MouseEvent) => {
    e.stopPropagation()
    const tweetText = `“${cleanSnippet.length > 180 ? cleanSnippet.slice(0, 177) + '...' : cleanSnippet}”\n\n— ${storyTitle} by ${authorName}`
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`
    window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=550,height=420')
  }

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const waText = `“${cleanSnippet}”\n\n— *${storyTitle}* by ${authorName}\n${shareUrl}`
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`
    window.open(waUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={tooltipRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="absolute z-50 flex items-center gap-1 p-1 bg-neutral-900/95 dark:bg-neutral-950/95 text-white backdrop-blur-md rounded-xl border border-neutral-700/80 shadow-xl animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      <button
        type="button"
        onClick={handleCopyQuote}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors cursor-pointer"
        title="Copy quote with story citation"
        aria-label="Copy quote with citation"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono text-emerald-300">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">Quote</span>
          </>
        )}
      </button>

      <div className="w-px h-4 bg-neutral-700 mx-0.5" />

      <button
        type="button"
        onClick={handleShareTwitter}
        className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        title="Share quote to X (Twitter)"
        aria-label="Share quote to X"
      >
        <FaXTwitter className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleShareWhatsApp}
        className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800 transition-colors cursor-pointer"
        title="Share quote to WhatsApp"
        aria-label="Share quote to WhatsApp"
      >
        <FaWhatsapp className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
