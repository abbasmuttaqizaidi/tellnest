/**
 * Lore & Character Annotation Parser & Replacer
 * Supports standard Markdown format: [Name](lore:Type|Description)
 * and Obsidian/Wiki style: [[Name|Type|Description]] or [[Name|Description]]
 */

export interface LoreEntity {
  name: string
  entityType: string // 'CHARACTER' | 'LOCATION' | 'LORE' | custom
  description: string
}

export interface ParsedLoreToken {
  type: 'lore'
  text: string
  entityType: string
  description: string
}

/**
 * Parses payload string into entityType and description.
 * e.g. "Character|Male, 23 — protagonist" -> { entityType: "Character", description: "Male, 23 — protagonist" }
 * e.g. "Male, 23 — protagonist" -> { entityType: "LORE", description: "Male, 23 — protagonist" }
 */
export function parseLorePayload(rawPayload: string): { entityType: string; description: string } {
  const decoded = decodeURIComponent(rawPayload.trim())
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
 */
export function extractLoreEntities(markdown: string): LoreEntity[] {
  if (!markdown) return []
  const map = new Map<string, LoreEntity>()

  // 1. Match [Text](lore:Payload)
  const mdRegex = /\[([^\]]+)\]\(lore:([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = mdRegex.exec(markdown)) !== null) {
    const name = match[1].trim()
    const { entityType, description } = parseLorePayload(match[2])
    const key = name.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { name, entityType, description })
    }
  }

  // 2. Match [[Text|Payload]] or [[Text|Type|Description]]
  const wikiRegex = /\[\[([^|\]]+)\|([^\]]+)\]\]/g
  while ((match = wikiRegex.exec(markdown)) !== null) {
    const name = match[1].trim()
    const { entityType, description } = parseLorePayload(match[2])
    const key = name.toLowerCase()
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

  // Count linked occurrences
  const linkedRegex = new RegExp(
    `\\[${escaped}\\]\\(lore:[^)]+\\)|\\[\\[${escaped}\\|[^\\]]+\\]\\]`,
    'gi'
  )
  const linkedMatches = markdown.match(linkedRegex)
  const linkedCount = linkedMatches ? linkedMatches.length : 0

  // To count unlinked mentions, strip out existing links and code blocks first
  const sanitized = markdown
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // markdown links
    .replace(/\[\[[^\]]+\]\]/g, '') // wiki links

  const wordBoundaryRegex = new RegExp(`\\b${escaped}\\b`, 'gi')
  const unlinkedMatches = sanitized.match(wordBoundaryRegex)
  const unlinkedCount = unlinkedMatches ? unlinkedMatches.length : 0

  return { linkedCount, unlinkedCount }
}

/**
 * Links all unlinked occurrences of an entity name across the chapter prose.
 * Protects existing links, code blocks, and markdown headings.
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
  const entityType = (entity.entityType || 'LORE').trim()
  const lorePayload = `lore:${entityType}|${entity.description.trim()}`

  let countReplaced = 0

  // Tokenize the markdown into protected segments vs plain text segments
  // Protected:
  // 1. Code blocks: ```...```
  // 2. Inline code: `...`
  // 3. Existing Markdown links / images: ![...](...) or [...](...)
  // 4. Existing Wiki links: [[...]]
  const tokenRegex = /(```[\s\S]*?```|`[^`]+`|!?\[[^\]]*\]\([^)]*\)|\[\[[^\]]*\]\])/g

  const parts = markdown.split(tokenRegex)

  const processed = parts.map((part) => {
    // If it's a protected block, leave untouched
    if (
      part.startsWith('```') ||
      (part.startsWith('`') && part.endsWith('`')) ||
      part.startsWith('[') ||
      part.startsWith('![')
    ) {
      return part
    }

    // Replace whole-word matches in plain prose
    const wordRegex = new RegExp(`\\b(${escaped})\\b`, 'g')
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
 * Unlinks all occurrences of an entity from markdown prose, restoring plain text.
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

  // 1. Replace [Name](lore:...) -> Name
  const mdRegex = new RegExp(`\\[(${escaped})\\]\\(lore:[^)]+\\)`, 'gi')
  let result = markdown.replace(mdRegex, (_full, name) => {
    countUnlinked++
    return name
  })

  // 2. Replace [[Name|...]] -> Name
  const wikiRegex = new RegExp(`\\[\\[(${escaped})\\|[^\\]]+\\]\\]`, 'gi')
  result = result.replace(wikiRegex, (_full, name) => {
    countUnlinked++
    return name
  })

  return { newMarkdown: result, countUnlinked }
}
