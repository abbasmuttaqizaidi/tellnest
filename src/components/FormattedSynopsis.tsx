import React from 'react'
import { formatInlineMarkdown } from '../lib/markdown'

export { formatInlineMarkdown }

interface FormattedSynopsisProps {
  text?: string | null
  className?: string
  paragraphClassName?: string
}

/**
 * Handles single linebreaks within a paragraph with <br />
 */
function renderParagraphLines(text: string): React.ReactNode {
  const lines = text.split('\n')
  if (lines.length === 1) {
    return formatInlineMarkdown(lines[0])
  }

  return lines.map((line, idx) => (
    <React.Fragment key={idx}>
      {formatInlineMarkdown(line)}
      {idx < lines.length - 1 && <br />}
    </React.Fragment>
  ))
}

/**
 * Formats a block of text containing newlines into paragraphs, quotes, and inline markdown.
 */
export function FormattedSynopsis({
  text,
  className = 'space-y-3',
  paragraphClassName = 'text-sm leading-relaxed text-[var(--ink-secondary)] font-sans',
}: FormattedSynopsisProps) {
  if (!text || !text.trim()) return null

  // Normalize Windows \r\n to \n
  const normalized = text.replace(/\r\n/g, '\n').trim()

  // Split into paragraphs by double newlines
  const paragraphs = normalized.split(/\n\s*\n+/)

  return (
    <div className={className}>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim()
        if (!trimmed) return null

        // Check if paragraph is a blockquote (> quote)
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((line) => line.replace(/^>[ \t]?/, ''))
            .join('\n')

          return (
            <blockquote
              key={pIdx}
              className="border-l-2 border-[var(--border-strong)] pl-3.5 py-1 font-serif italic text-[var(--ink-secondary)] bg-[var(--bg-subtle)]/40 rounded-r-lg"
            >
              {renderParagraphLines(quoteLines)}
            </blockquote>
          )
        }

        // Check if paragraph is an unordered list (lines starting with - or *)
        const lines = trimmed.split('\n')
        const isBulletList = lines.every((line) => /^[-*]\s+/.test(line.trim()))

        if (isBulletList) {
          return (
            <ul key={pIdx} className="list-disc pl-5 space-y-1 text-sm text-[var(--ink-secondary)]">
              {lines.map((line, lIdx) => {
                const itemContent = line.trim().replace(/^[-*]\s+/, '')
                return <li key={lIdx}>{formatInlineMarkdown(itemContent)}</li>
              })}
            </ul>
          )
        }

        return (
          <p key={pIdx} className={paragraphClassName}>
            {renderParagraphLines(trimmed)}
          </p>
        )
      })}
    </div>
  )
}
