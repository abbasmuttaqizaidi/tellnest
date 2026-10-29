import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Share2 } from 'lucide-react'

export interface ReaderQuoteShareTooltipProps {
  containerRef: React.RefObject<HTMLElement | null>
  storyTitle: string
  authorName: string
  chapterTitle?: string
  workId: string
  chapterId: string
}

export function ReaderQuoteShareTooltip({
  containerRef,
  storyTitle,
  authorName,
  chapterTitle,
  workId,
  chapterId,
}: ReaderQuoteShareTooltipProps) {
  const [selectedText, setSelectedText] = useState<string>('')
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleSelectionChange = useCallback(() => {
    if (typeof window === 'undefined') return
    const selection = window.getSelection()

    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setSelectedText('')
      setCoords(null)
      return
    }

    const text = selection.toString().trim()
    // Require at least 8 characters to avoid triggering on accidental clicks
    if (text.length < 8) {
      setSelectedText('')
      setCoords(null)
      return
    }

    // Verify selection is within reader container
    if (containerRef.current) {
      const anchorNode = selection.anchorNode
      const focusNode = selection.focusNode
      if (
        (anchorNode && !containerRef.current.contains(anchorNode)) ||
        (focusNode && !containerRef.current.contains(focusNode))
      ) {
        setSelectedText('')
        setCoords(null)
        return
      }
    }

    try {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0) {
        setSelectedText('')
        setCoords(null)
        return
      }

      // Position tooltip right above center of selection
      const tooltipX = rect.left + rect.width / 2
      const tooltipY = rect.top - 10 // small offset above selection

      setSelectedText(text)
      setCoords({
        left: Math.max(80, Math.min(window.innerWidth - 80, tooltipX)),
        top: Math.max(10, tooltipY),
      })
    } catch {
      setSelectedText('')
      setCoords(null)
    }
  }, [containerRef])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    const handleScroll = () => {
      // Re-calculate or hide on scroll
      handleSelectionChange()
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [handleSelectionChange])

  if (!coords || !selectedText) return null

  const currentUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://hatchpen.com/read/${workId}/${chapterId}`

  const truncatedQuote =
    selectedText.length > 200 ? `${selectedText.slice(0, 197)}...` : selectedText

  const fullQuoteCopy = `“${selectedText}”\n\n— from "${storyTitle}" by ${authorName}${
    chapterTitle ? ` (${chapterTitle})` : ''
  }\nRead on HatchPen: ${currentUrl}`

  const xTweetText = `“${truncatedQuote}”\n\n— "${storyTitle}" by ${authorName} on @HatchPen\n\n${currentUrl}`
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xTweetText)}`

  const whatsappText = `“${truncatedQuote}”\n\n— "${storyTitle}" by ${authorName}\nRead on HatchPen: ${currentUrl}`
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`

  const handleCopyQuote = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullQuoteCopy)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  return (
    <AnimatePresence>
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          transform: 'translate(-50%, -100%)',
          zIndex: 9999,
        }}
        className="pointer-events-auto select-none"
        onMouseDown={(e) => {
          // Prevent losing selection on click
          e.preventDefault()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 6 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900/95 dark:bg-neutral-800/95 text-white shadow-xl backdrop-blur-md border border-white/15 text-xs font-medium"
        >
          {/* Copy Quote Button */}
          <button
            onClick={handleCopyQuote}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
              copied
                ? 'bg-emerald-600/90 text-white'
                : 'hover:bg-white/15 text-white/90 hover:text-white'
            }`}
            title="Copy quote with story attribution"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span className="font-sans">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 opacity-80" />
                <span className="font-sans">Quote</span>
              </>
            )}
          </button>

          <div className="w-[1px] h-3.5 bg-white/20" />

          {/* Share on X (Twitter) */}
          <a
            href={xShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors no-underline cursor-pointer"
            title="Share quote to X / Twitter"
          >
            <span className="font-mono font-bold text-[11px]">𝕏</span>
            <span className="font-sans text-xs">Share</span>
          </a>

          {/* Share on WhatsApp */}
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/15 text-white/90 hover:text-white transition-colors no-underline cursor-pointer"
            title="Share quote to WhatsApp"
          >
            <span className="text-[12px]">💬</span>
          </a>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
