import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Copy, Share2 } from 'lucide-react'

export interface ShareStoryModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  authorName?: string
  url: string
  cover?: string
}

export function ShareStoryModal({
  isOpen,
  onClose,
  title,
  authorName = 'HatchPen Author',
  url,
  cover,
}: ShareStoryModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shareText = `Read "${title}" by ${authorName} on HatchPen`
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `"${title}" by ${authorName} — Read original serialized fiction on @HatchPen\n\n`
  )}&url=${encodeURIComponent(url)}`
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Read "${title}" by ${authorName} on HatchPen:\n${url}`
  )}`
  const redditShareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(
    `"${title}" by ${authorName} — Serialized Fiction on HatchPen`
  )}`

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {}
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        })
      } catch {}
    }
  }

  const hasNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-sm rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-strong)] p-6 shadow-2xl text-[var(--ink-primary)] z-10 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[var(--accent-contrast)]" />
              <h3 className="text-sm font-semibold tracking-tight">Share Story</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              aria-label="Close share dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Story Card Snippet */}
          <div className="flex items-center gap-3 my-4 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            {cover ? (
              <img
                src={cover}
                alt={title}
                className="w-12 h-16 object-cover rounded-md shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-16 rounded-md bg-[var(--border-strong)] flex items-center justify-center text-[10px] text-[var(--ink-tertiary)] shrink-0">
                Cover
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold truncate leading-snug">{title}</h4>
              <p className="text-[11px] text-[var(--ink-secondary)] truncate mt-0.5">by {authorName}</p>
              <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-mono text-[var(--ink-tertiary)]">
                hatchpen.com
              </span>
            </div>
          </div>

          {/* Social Share Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {/* WhatsApp */}
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[#25D366]/40 transition-all group no-underline text-center"
            >
              <span className="text-base mb-1 group-hover:scale-110 transition-transform">💬</span>
              <span className="text-[11px] font-medium text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]">
                WhatsApp
              </span>
            </a>

            {/* X / Twitter */}
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-black/30 dark:hover:border-white/30 transition-all group no-underline text-center"
            >
              <span className="text-xs font-bold font-mono mb-1 group-hover:scale-110 transition-transform">
                𝕏
              </span>
              <span className="text-[11px] font-medium text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]">
                Twitter
              </span>
            </a>

            {/* Reddit */}
            <a
              href={redditShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[#FF4500]/40 transition-all group no-underline text-center"
            >
              <span className="text-base mb-1 group-hover:scale-110 transition-transform">🤖</span>
              <span className="text-[11px] font-medium text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]">
                Reddit
              </span>
            </a>
          </div>

          {/* Native Share on supported devices */}
          {hasNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full mb-3 py-2 px-3 rounded-xl text-xs font-medium border border-[var(--border-strong)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-[var(--ink-primary)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>More Options (Mobile Share)</span>
            </button>
          )}

          {/* Copy Link Input Bar */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)]">
            <input
              type="text"
              readOnly
              value={url}
              className="w-full bg-transparent px-2 text-xs font-mono text-[var(--ink-secondary)] truncate focus:outline-hidden select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
