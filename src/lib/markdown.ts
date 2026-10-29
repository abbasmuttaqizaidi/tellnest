import React from 'react'

/**
 * Parses inline markdown formatted text (bold, italic, bold+italic, strikethrough, inline code)
 * into safe, escaped React nodes using React.createElement. Zero danger of XSS injection.
 */
export function formatInlineMarkdown(text: string): React.ReactNode {
  if (!text) return null
  // Strip trailing markdown hard-break artifacts (backslashes)
  const cleanText = text.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')

  // Regex matches:
  // 1. Bold + Italic (***text*** or ___text___)
  // 2. Bold (**text** or __text__)
  // 3. Italic (*text* or _text_)
  // 4. Strikethrough (~~text~~)
  // 5. Inline code (`code`)
  const regex = /(\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|~~[^~]+~~|`[^`]+`)/g
  const parts = cleanText.split(regex)
  if (parts.length === 1) return cleanText

  return parts.map((part, index) => {
    // Bold + Italic: ***text*** or ___text___
    if (
      (part.startsWith('***') && part.endsWith('***') && part.length >= 6) ||
      (part.startsWith('___') && part.endsWith('___') && part.length >= 6)
    ) {
      return React.createElement(
        'strong',
        { key: index, className: 'font-semibold text-[var(--ink-primary)]' },
        React.createElement('em', { className: 'italic' }, part.slice(3, -3))
      )
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return React.createElement(
        'strong',
        { key: index, className: 'font-semibold text-[var(--ink-primary)]' },
        part.slice(2, -2)
      )
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return React.createElement(
        'em',
        { key: index, className: 'italic text-[var(--ink-primary)]' },
        part.slice(1, -1)
      )
    }

    // Strikethrough: ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return React.createElement(
        'del',
        { key: index, className: 'line-through text-[var(--ink-muted)]' },
        part.slice(2, -2)
      )
    }

    // Inline code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return React.createElement(
        'code',
        {
          key: index,
          className:
            'font-mono text-[0.88em] bg-[var(--bg-subtle)] text-[var(--ink-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]',
        },
        part.slice(1, -1)
      )
    }

    return part
  })
}
