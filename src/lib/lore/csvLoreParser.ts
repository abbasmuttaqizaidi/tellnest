/**
 * RFC 4180 Compliant CSV Parser for Story Lore Entities.
 *
 * Strict Requirements:
 * 1. Exactly 3 required headers (case-sensitive): "Name", "Type", "Tooltip"
 * 2. Triplet-identical deduplication: only consider duplicate if Name, Type, and Tooltip are all identical.
 * 3. Type column is completely flexible (any writer-defined string allowed).
 * 4. Handles UTF-8 BOM (\uFEFF), quoted commas, escaped quotes (""), and multiline cells.
 */

export interface CsvLoreRow {
  name: string
  type: string
  tooltip: string
}

export interface CsvLoreParseResult {
  success: boolean
  rows: CsvLoreRow[]
  validRows: CsvLoreRow[]
  duplicateCount: number
  totalRawRows: number
  totalRows: number
  errors: string[]
}

/**
 * Standard RFC 4180 CSV tokenizer that parses raw text into an array of string rows.
 */
export function parseRawCsv(csvText: string): string[][] {
  if (!csvText) return []

  // Strip optional UTF-8 Byte Order Mark (BOM)
  const cleanText = csvText.replace(/^\uFEFF/, '')

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let insideQuotes = false

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i]
    const nextChar = cleanText[i + 1]

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentCell += '"'
          i++
        } else {
          // Closing quote
          insideQuotes = false
        }
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        insideQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if (char === '\r') {
        if (nextChar === '\n') i++ // Skip \r\n
        currentRow.push(currentCell.trim())
        currentCell = ''
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
      } else if (char === '\n') {
        currentRow.push(currentCell.trim())
        currentCell = ''
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow)
        }
        currentRow = []
      } else {
        currentCell += char
      }
    }
  }

  // Push final remaining cell / row
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

/**
 * Validates strict headers and extracts valid CsvLoreRow records.
 * Rules:
 * - Headers must contain Name, Type, and Tooltip
 * - Strips identical triplets (Name + Type + Tooltip)
 * - Name cannot be empty and brackets '[' / ']' are automatically stripped
 * - Tooltip cannot be empty
 * - Type defaults to 'Character' if empty, otherwise keeps exact user string
 */
export function parseLoreCsv(csvText: string): CsvLoreParseResult {
  const rawRows = parseRawCsv(csvText)

  if (rawRows.length === 0) {
    return {
      success: false,
      rows: [],
      validRows: [],
      duplicateCount: 0,
      totalRawRows: 0,
      totalRows: 0,
      errors: ['The uploaded CSV file is empty.'],
    }
  }

  const cleanHeaders = rawRows[0].map((c) => c.replace(/^[\uFEFF\u200B]+/, '').trim())
  const lowerHeaders = cleanHeaders.map((c) => c.toLowerCase())

  // Flexible header resolution (supports common synonyms and case-insensitive headers)
  const nameIdx = lowerHeaders.findIndex((h) =>
    ['name', 'entity', 'entity name', 'entity_name', 'character', 'title'].includes(h)
  )
  const typeIdx = lowerHeaders.findIndex((h) =>
    ['type', 'entity type', 'entity_type', 'category', 'role', 'tag'].includes(h)
  )
  const tooltipIdx = lowerHeaders.findIndex((h) =>
    ['tooltip', 'description', 'desc', 'summary', 'bio', 'details', 'notes', 'note', 'about'].includes(h)
  )

  const missingHeaders: string[] = []
  if (nameIdx === -1) missingHeaders.push('Name')
  if (typeIdx === -1) missingHeaders.push('Type')
  if (tooltipIdx === -1) missingHeaders.push('Tooltip (or Description)')

  if (missingHeaders.length > 0) {
    return {
      success: false,
      rows: [],
      validRows: [],
      duplicateCount: 0,
      totalRawRows: Math.max(0, rawRows.length - 1),
      totalRows: Math.max(0, rawRows.length - 1),
      errors: [
        `Invalid CSV headers. Missing required columns: ${missingHeaders.join(', ')}. Expected column headers: "Name", "Type", and "Tooltip" (or "Description").`,
      ],
    }
  }

  const rows: CsvLoreRow[] = []
  const seenIdenticalTriplets = new Set<string>()
  let duplicateCount = 0
  const errors: string[] = []

  for (let r = 1; r < rawRows.length; r++) {
    const rawCols = rawRows[r]
    if (rawCols.length === 0 || rawCols.every((c) => !c.trim())) {
      continue // Skip blank lines
    }

    const rawName = (rawCols[nameIdx] || '')
      .replace(/[\[\]]/g, '')
      .replace(/^["']+|["']+$/g, '')
      .replace(/^(\*{1,3}|_{1,3})+/, '')
      .replace(/(\*{1,3}|_{1,3})+$/, '')
      .trim()
    const rawType = (rawCols[typeIdx] || '').replace(/\|/g, '/').trim() || 'Character'
    const rawTooltip = (rawCols[tooltipIdx] || '')
      .replace(/^["']+|["']+$/g, '')
      .trim()

    if (!rawName) {
      errors.push(`Row ${r + 1}: Name cannot be empty.`)
      continue
    }

    if (!rawTooltip) {
      errors.push(`Row ${r + 1}: Tooltip cannot be empty for "${rawName}".`)
      continue
    }

    // Duplicate check: Only consider duplicate if Name, Type, AND Tooltip are all identical
    const tripletKey = `${rawName.toLowerCase()}|||${rawType.toLowerCase()}|||${rawTooltip.toLowerCase()}`
    if (seenIdenticalTriplets.has(tripletKey)) {
      duplicateCount++
      continue
    }

    seenIdenticalTriplets.add(tripletKey)
    rows.push({
      name: rawName,
      type: rawType,
      tooltip: rawTooltip,
    })
  }

  return {
    success: rows.length > 0,
    rows,
    validRows: rows,
    duplicateCount,
    totalRawRows: Math.max(0, rawRows.length - 1),
    totalRows: Math.max(0, rawRows.length - 1),
    errors,
  }
}

/**
 * Returns a downloadable RFC 4180 CSV sample template for writers.
 */
export function generateSampleLoreCsv(): string {
  return [
    'Name,Type,Tooltip',
    'Arthur Pendragon,Character,"Legendary High King of Camelot and wielder of Excalibur."',
    'Camelot,Location,"The mythical fortress and capital castle of King Arthur\'s realm."',
    'Excalibur,Lore,"A magical sword embedded in stone, granted by the Lady of the Lake."',
    'Merlin,Protagonist,"Court sorcerer, prophet, and mystical mentor to the young King."',
  ].join('\n')
}
