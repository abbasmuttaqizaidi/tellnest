/**
 * Lore & Character Annotation Parser & Replacer
 * Supports standard Markdown format: [Name](lore:Type|Description)
 * and Obsidian/Wiki style: [[Name|Type|Description]] or [[Name|Description]]
 *
 * Fully supports multi-word entities, non-ASCII/Devanagari scripts,
 * and RFC 3986 URL-safe encoding so TipTap WYSIWYG never escapes brackets.
 */

export interface LoreEntity {
  name: string
  entityType: string // 'Character' | 'Location' | 'Lore' | custom
  description: string
}

export interface ParsedLoreToken {
  type: 'lore'
  text: string
  entityType: string
  description: string
}

/**
 * Encodes a string according to RFC 3986, ensuring parentheses, quotes,
 * and spaces do not break Markdown link URL syntax [Text](URL).
 */
export function fixedEncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  )
}

/**
 * Builds a valid, URL-safe lore payload: e.g. "lore:Character|EncodedDescription"
 */
export function buildLorePayload(entity: LoreEntity): string {
  const entityType = (entity.entityType || 'LORE').trim()
  const encodedDesc = fixedEncodeURIComponent(entity.description.trim())
  return `lore:${entityType}|${encodedDesc}`
}

/**
 * Normalizes all lore links in a markdown document so that unencoded spaces,
 * parentheses, and quotes in legacy lore payloads are cleanly converted to RFC 3986.
 */
export function normalizeLoreLinks(markdown: string): string {
  if (!markdown) return markdown
  return markdown.replace(/\\*\[([^\]]+)\\*\]\(lore:([^)]+)\)/g, (full, name, rawPayload) => {
    if (
      rawPayload.includes(' ') ||
      rawPayload.includes('(') ||
      rawPayload.includes(')') ||
      rawPayload.includes('"') ||
      rawPayload.includes("'")
    ) {
      const { entityType, description } = parseLorePayload(rawPayload)
      return `[${name}](${buildLorePayload({ name, entityType, description })})`
    }
    return full
  })
}

/**
 * Parses payload string into entityType and description.
 * Safe against double-encoding and unencoded legacy strings.
 * e.g. "Character|Male%2C%2023" -> { entityType: "Character", description: "Male, 23" }
 * e.g. "lore:Character|Male, 23" -> { entityType: "Character", description: "Male, 23" }
 */
export function parseLorePayload(rawPayload: string): { entityType: string; description: string } {
  let raw = rawPayload.trim()
  if (raw.startsWith('lore:')) {
    raw = raw.slice(5)
  }

  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch (e) {
    decoded = raw
  }

  const pipeIndex = decoded.indexOf('|')
  if (pipeIndex !== -1) {
    const rawType = decoded.slice(0, pipeIndex).trim()
    const desc = decoded.slice(pipeIndex + 1).trim()
    return {
      entityType: rawType || 'LORE',
      description: desc,
    }
  }
  return {
    entityType: 'LORE',
    description: decoded,
  }
}

/**
 * Extracts all unique LoreEntities currently defined in markdown prose.
 * Resilient against any escaped bracket artifacts from legacy editor versions.
 */
export function extractLoreEntities(markdown: string): LoreEntity[] {
  if (!markdown) return []
  const map = new Map<string, LoreEntity>()

  // 1. Match [Text](lore:Payload) with optional leading backslashes
  const mdRegex = /\\*\[([^\]]+)\\*\]\(lore:([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = mdRegex.exec(markdown)) !== null) {
    const name = match[1].trim()
    const { entityType, description } = parseLorePayload(match[2])
    const key = name
    if (!map.has(key)) {
      map.set(key, { name, entityType, description })
    }
  }

  // 2. Match [[Text|Payload]] or [[Text|Type|Description]] with optional leading backslashes
  const wikiRegex = /\\*\[\\*\[([^|\]]+)\|([^\]]+)\\*\]\\*\]/g
  while ((match = wikiRegex.exec(markdown)) !== null) {
    const name = match[1].trim()
    const { entityType, description } = parseLorePayload(match[2])
    const key = name
    if (!map.has(key)) {
      map.set(key, { name, entityType, description })
    }
  }

  return Array.from(map.values())
}

/**
 * Escapes regex special characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Counts linked and unlinked occurrences of an entity name in markdown.
 * Note: Case sensitivity is strictly preserved (no 'i' flag per requirement).
 * Fully supports multi-word and non-ASCII/Devanagari scripts.
 */
export function countEntityMentions(
  markdown: string,
  entityName: string
): { linkedCount: number; unlinkedCount: number } {
  if (!markdown || !entityName.trim()) {
    return { linkedCount: 0, unlinkedCount: 0 }
  }

  const trimmed = entityName.trim()
  const escaped = escapeRegExp(trimmed)

  // Count linked occurrences (exact case)
  const linkedRegex = new RegExp(
    `\\\\*\\[${escaped}\\\\*\\]\\(lore:[^)]+\\)|\\\\*\\[\\\\*\\[${escaped}\\|[^\\]]+\\\\*\\]\\\\*\\]`,
    'gu'
  )
  const linkedMatches = markdown.match(linkedRegex)
  const linkedCount = linkedMatches ? linkedMatches.length : 0

  // Strip protected zones before counting unlinked mentions:
  // code blocks, inline code, HTML tags, markdown links, wiki links
  const sanitized = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\*\[([^\]]+)\\*\]\([^)]+\)/g, '')
    .replace(/\\*\[\\*\[[^\]]+\\*\]\\*\]/g, '')

  // Unicode-aware word boundary for exact case (no 'i' flag)
  const wordBoundaryRegex = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${escaped})(?![\\p{L}\\p{N}_])`,
    'gu'
  )
  const unlinkedMatches = sanitized.match(wordBoundaryRegex)
  const unlinkedCount = unlinkedMatches ? unlinkedMatches.length : 0

  return { linkedCount, unlinkedCount }
}

/**
 * Links ALL unlinked occurrences of an entity name across the chapter prose.
 * Protects code blocks, inline code, HTML tags, and existing links.
 * Preserves exact case matching (no 'i' flag).
 */
export function linkAllOccurrences(
  markdown: string,
  entity: LoreEntity
): { newMarkdown: string; countReplaced: number } {
  if (!markdown || !entity.name.trim() || !entity.description.trim()) {
    return { newMarkdown: markdown, countReplaced: 0 }
  }

  const targetName = entity.name.trim()
  const escaped = escapeRegExp(targetName)
  const lorePayload = buildLorePayload(entity)

  let countReplaced = 0

  // Protected tokens:
  // 1. Code blocks: ```...```
  // 2. Inline code: `...`
  // 3. HTML tags: <...>
  // 4. Markdown links: [...](...) (including escaped \[...\])
  // 5. Wiki links: [[...]] (including escaped)
  const tokenRegex = /(```[\s\S]*?```|`[^`]+`|<[^>]+>|!?\\*\[[^\]]*\\*\]\([^)]*\)|\\*\[\\*\[[^\]]*\\*\]\\*\])/g

  const parts = markdown.split(tokenRegex)

  const processed = parts.map((part) => {
    // If it's a protected block, leave untouched
    if (
      part.startsWith('```') ||
      (part.startsWith('`') && part.endsWith('`')) ||
      part.startsWith('<') ||
      part.startsWith('[') ||
      part.startsWith('![') ||
      part.startsWith('\\[')
    ) {
      return part
    }

    // Replace whole-word matches in plain prose (exact case, no 'i' flag)
    const wordRegex = new RegExp(
      `(?<![\\p{L}\\p{N}_])(${escaped})(?![\\p{L}\\p{N}_])`,
      'gu'
    )
    return part.replace(wordRegex, (_full, matchedWord) => {
      countReplaced++
      return `[${matchedWord}](${lorePayload})`
    })
  })

  return {
    newMarkdown: processed.join(''),
    countReplaced,
  }
}

/**
 * Links ONLY the first unlinked occurrence of an entity name across the chapter prose.
 * Used when applyToAll is unchecked.
 */
export function linkSingleOccurrence(
  markdown: string,
  entity: LoreEntity
): { newMarkdown: string; countReplaced: number } {
  if (!markdown || !entity.name.trim() || !entity.description.trim()) {
    return { newMarkdown: markdown, countReplaced: 0 }
  }

  const targetName = entity.name.trim()
  const escaped = escapeRegExp(targetName)
  const lorePayload = buildLorePayload(entity)

  let countReplaced = 0

  const tokenRegex = /(```[\s\S]*?```|`[^`]+`|<[^>]+>|!?\\*\[[^\]]*\\*\]\([^)]*\)|\\*\[\\*\[[^\]]*\\*\]\\*\])/g
  const parts = markdown.split(tokenRegex)

  const processed = parts.map((part) => {
    if (countReplaced > 0) return part

    if (
      part.startsWith('```') ||
      (part.startsWith('`') && part.endsWith('`')) ||
      part.startsWith('<') ||
      part.startsWith('[') ||
      part.startsWith('![') ||
      part.startsWith('\\[')
    ) {
      return part
    }

    const wordRegex = new RegExp(
      `(?<![\\p{L}\\p{N}_])(${escaped})(?![\\p{L}\\p{N}_])`,
      'u'
    )
    if (wordRegex.test(part)) {
      countReplaced = 1
      return part.replace(wordRegex, (_full, matchedWord) => `[${matchedWord}](${lorePayload})`)
    }
    return part
  })

  return {
    newMarkdown: processed.join(''),
    countReplaced,
  }
}

/**
 * Unlinks all occurrences of an entity from markdown prose, restoring clean plain text.
 * Exact case preserved.
 */
export function unlinkAllOccurrences(
  markdown: string,
  entityName: string
): { newMarkdown: string; countUnlinked: number } {
  if (!markdown || !entityName.trim()) {
    return { newMarkdown: markdown, countUnlinked: 0 }
  }

  const escaped = escapeRegExp(entityName.trim())
  let countUnlinked = 0

  // 1. Replace [Name](lore:...) -> Name (supporting possible escaped brackets)
  const mdRegex = new RegExp(`\\\\*\\[(${escaped})\\\\*\\]\\(lore:[^)]+\\)`, 'gu')
  let result = markdown.replace(mdRegex, (_full, name) => {
    countUnlinked++
    return name
  })

  // 2. Replace [[Name|...]] -> Name
  const wikiRegex = new RegExp(`\\\\*\\[\\\\*\\[(${escaped})\\|[^\\]]+\\\\*\\]\\\\*\\]`, 'gu')
  result = result.replace(wikiRegex, (_full, name) => {
    countUnlinked++
    return name
  })

  return { newMarkdown: result, countUnlinked }
}

/**
 * Strips all lore annotations from markdown, leaving only plain display text.
 * E.g. "[Navya](lore:Character%7CLead%20Actress)" -> "Navya"
 * and "[[Navya|Character|Lead Actress]]" -> "Navya"
 */
export function stripLoreToPlainText(text: string): string {
  if (!text) return ''
  return text
    .replace(/\\*\[([^\]]+)\\*\]\(lore:[^)]*(?:\)|$)/g, '$1')
    .replace(/\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g, '$1')
}

/**
 * Strips lore links, markdown formatting, HTML tags, and trims down to a clean plain text snippet.
 * Ideal for Table of Contents, chapter cards, search previews, and RSS feeds.
 */
export function getCleanChapterSnippet(content: string, maxLength: number = 220): string {
  if (!content) return ''

  const clean = content
    // Remove HTML tags
    .replace(/<[^>]*>?/gm, '')
    // Replace lore links (handles both fully formed and end-of-string truncated links)
    .replace(/\\*\[([^\]]+)\\*\]\(lore:[^)]*(?:\)|$)/g, '$1')
    // Replace wiki lore links
    .replace(/\[\[([^|\]]+)(?:\|[^\]]*)?\]\]/g, '$1')
    // Replace standard markdown links [Text](URL) -> Text
    .replace(/\[([^\]]+)\]\([^)]*(?:\)|$)/g, '$1')
    // Remove images ![Alt](URL) -> empty
    .replace(/!\[([^\]]*)\]\([^)]*(?:\)|$)/g, '')
    // Remove scene breaks (--- or ***)
    .replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '')
    // Remove headings (# Heading -> Heading)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes (> quote -> quote)
    .replace(/^>\s*/gm, '')
    // Remove bold/italics
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Remove loose backslashes
    .replace(/\\+/g, '')
    // Collapse all whitespace into single spaces
    .replace(/\s+/g, ' ')
    .trim()

  if (clean.length <= maxLength) {
    return clean
  }

  // Slice at maxLength and try to break at last space for natural word boundary
  const sliced = clean.slice(0, maxLength)
  const lastSpace = sliced.lastIndexOf(' ')
  const safeSnippet = lastSpace > maxLength * 0.7 ? sliced.slice(0, lastSpace) : sliced
  return `${safeSnippet}...`
}
