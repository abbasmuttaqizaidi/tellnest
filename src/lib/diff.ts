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
