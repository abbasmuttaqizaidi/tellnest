export interface DiffLine {
  type: 'added' | 'deleted' | 'unchanged'
  text: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface WordToken {
  type: 'added' | 'deleted' | 'unchanged'
  text: string
}

/**
 * Computes Longest Common Subsequence (LCS) line diff.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const m = oldLines.length
  const n = newLines.length

  // Safety guard for extremely large text to prevent memory blowups
  if (m * n > 4000000) {
    return [
      ...oldLines.map((text, idx) => ({
        type: 'deleted' as const,
        text,
        oldLineNumber: idx + 1,
      })),
      ...newLines.map((text, idx) => ({
        type: 'added' as const,
        text,
        newLineNumber: idx + 1,
      })),
    ]
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j])
      }
    }
  }

  let i = m
  let j = n
  const reversed: DiffLine[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({
        type: 'unchanged',
        text: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({
        type: 'added',
        text: newLines[j - 1],
        newLineNumber: j,
      })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      reversed.push({
        type: 'deleted',
        text: oldLines[i - 1],
        oldLineNumber: i,
      })
      i--
    }
  }

  return reversed.reverse()
}

/**
 * Computes word-level diff between two lines to highlight specific modified words.
 */
export function computeWordTokens(oldLine: string, newLine: string): { oldTokens: WordToken[]; newTokens: WordToken[] } {
  const oldWords = oldLine.split(/(\s+)/)
  const newWords = newLine.split(/(\s+)/)
  const m = oldWords.length
  const n = newWords.length

  if (m * n > 50000) {
    return {
      oldTokens: [{ type: 'deleted', text: oldLine }],
      newTokens: [{ type: 'added', text: newLine }],
    }
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldWords[i] === newWords[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j])
      }
    }
  }

  let i = m
  let j = n
  const oldTokensRev: WordToken[] = []
  const newTokensRev: WordToken[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldTokensRev.push({ type: 'unchanged', text: oldWords[i - 1] })
      newTokensRev.push({ type: 'unchanged', text: newWords[j - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newTokensRev.push({ type: 'added', text: newWords[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      oldTokensRev.push({ type: 'deleted', text: oldWords[i - 1] })
      i--
    }
  }

  return {
    oldTokens: oldTokensRev.reverse(),
    newTokens: newTokensRev.reverse(),
  }
}

export interface DiffHunk {
  type: 'change'
  deletedLines: DiffLine[]
  addedLines: DiffLine[]
  startIdx: number
}

export type DiffBlock =
  | { type: 'unchanged'; line: DiffLine }
  | DiffHunk

/**
 * Groups raw diff lines into coherent change blocks (hunks) and unchanged context lines.
 */
export function groupDiffHunks(diffLines: DiffLine[]): DiffBlock[] {
  const blocks: DiffBlock[] = []
  let currentHunk: DiffHunk | null = null

  for (let i = 0; i < diffLines.length; i++) {
    const item = diffLines[i]
    if (item.type === 'unchanged') {
      if (currentHunk) {
        blocks.push(currentHunk)
        currentHunk = null
      }
      blocks.push({ type: 'unchanged', line: item })
    } else {
      if (!currentHunk) {
        currentHunk = {
          type: 'change',
          deletedLines: [],
          addedLines: [],
          startIdx: i,
        }
      }
      if (item.type === 'deleted') {
        currentHunk.deletedLines.push(item)
      } else if (item.type === 'added') {
        currentHunk.addedLines.push(item)
      }
    }
  }
  if (currentHunk) {
    blocks.push(currentHunk)
  }
  return blocks
}

/**
 * Safely reverts an entire change hunk (modification, addition, or deletion) back to saved baseline.
 */
export function revertHunk(hunk: DiffHunk, currentText: string, savedText: string): string {
  const currentLines = currentText.split('\n')
  const oldTextLines = savedText.split('\n')

  // Case 1: Modified lines (both deleted and added exist) -> Replace new lines with original lines
  if (hunk.deletedLines.length > 0 && hunk.addedLines.length > 0) {
    const startLineIdx = hunk.addedLines[0].newLineNumber ? hunk.addedLines[0].newLineNumber - 1 : 0
    const deleteCount = hunk.addedLines.length
    const originalTexts = hunk.deletedLines.map((l) => l.text)
    currentLines.splice(startLineIdx, deleteCount, ...originalTexts)
    return currentLines.join('\n')
  }

  // Case 2: Pure additions (only added lines) -> Remove added lines
  if (hunk.addedLines.length > 0 && hunk.deletedLines.length === 0) {
    const startLineIdx = hunk.addedLines[0].newLineNumber ? hunk.addedLines[0].newLineNumber - 1 : 0
    const deleteCount = hunk.addedLines.length
    currentLines.splice(startLineIdx, deleteCount)
    return currentLines.join('\n')
  }

  // Case 3: Pure deletions (only deleted lines) -> Restore original lines
  if (hunk.deletedLines.length > 0 && hunk.addedLines.length === 0) {
    const originalTexts = hunk.deletedLines.map((l) => l.text)
    const targetOldLine = hunk.deletedLines[0].oldLineNumber || 1
    let insertIdx = 0
    // Find closest previous line in oldText that exists in currentLines
    for (let k = targetOldLine - 2; k >= 0; k--) {
      const matchText = oldTextLines[k]
      const foundIdx = currentLines.indexOf(matchText)
      if (foundIdx !== -1) {
        insertIdx = foundIdx + 1
        break
      }
    }
    currentLines.splice(insertIdx, 0, ...originalTexts)
    return currentLines.join('\n')
  }

  return currentText
}

/**
 * Reverts a single diff line safely by finding its hunk and restoring original text.
 */
export function revertDiffLine(
  diffLines: DiffLine[],
  targetIdx: number,
  currentText: string,
  oldText: string
): string {
  const hunks = groupDiffHunks(diffLines)
  for (const block of hunks) {
    if (block.type === 'change') {
      const totalLines = block.deletedLines.length + block.addedLines.length
      if (targetIdx >= block.startIdx && targetIdx < block.startIdx + totalLines) {
        return revertHunk(block, currentText, oldText)
      }
    }
  }
  return currentText
}

