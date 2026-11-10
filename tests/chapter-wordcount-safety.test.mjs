import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Regression Guard: No naked .wordCount.toLocaleString() in routes or components', () => {
  const targetFiles = [
    'src/routes/admin-work-editor.$workId.tsx',
    'src/routes/read.$workId.$chapterId.tsx',
    'src/components/ChapterDrawer.tsx',
    'src/routes/works.$workId.tsx',
    'src/routes/write.manage.$workId.tsx',
  ]

  for (const relativePath of targetFiles) {
    const fullPath = path.resolve(process.cwd(), relativePath)
    assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relativePath}`)
    const code = fs.readFileSync(fullPath, 'utf8')

    // Reject naked chapter.wordCount.toLocaleString() or ch.wordCount.toLocaleString()
    const nakedPattern = /(?:ch|chapter)\.wordCount\.toLocaleString\(\)/g
    const matches = code.match(nakedPattern)
    assert.strictEqual(
      matches,
      null,
      `Found unsafe naked wordCount.toLocaleString() in ${relativePath}: ${JSON.stringify(matches)}`
    )
  }
})

test('Chapter wordCount fallback logic safely handles undefined, null, or snake_case word_count', () => {
  const formatWordCount = (chapter) => {
    return Number(
      chapter.wordCount ??
        chapter.word_count ??
        (chapter.content ? chapter.content.trim().split(/\s+/).filter(Boolean).length : 0)
    ).toLocaleString()
  }

  // 1. Fully defined chapter
  assert.strictEqual(formatWordCount({ wordCount: 1540 }), '1,540')

  // 2. Undefined wordCount, but has snake_case word_count from Supabase
  assert.strictEqual(formatWordCount({ word_count: 2450 }), '2,450')

  // 3. Both undefined, but has text content
  assert.strictEqual(
    formatWordCount({ content: 'The dark perimeter silently expanded across the horizon.' }),
    '8'
  )

  // 4. Completely undefined / empty chapter draft
  assert.strictEqual(formatWordCount({}), '0')

  // 5. Explicitly null wordCount (raw database null)
  assert.strictEqual(formatWordCount({ wordCount: null, word_count: null }), '0')
})
