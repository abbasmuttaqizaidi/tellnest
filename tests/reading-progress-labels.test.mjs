import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Test Suite: Reading Progress Label Clarity (Option 1)
 *
 * Guarantees:
 * 1. Home page Continue Reading shelf clearly contrasts chapter position ("Ch. X of Y")
 *    against whole-story progress ("Z% of story") so readers never mistake story progress
 *    for individual chapter completion.
 * 2. Reader top bar displays "Ch. X of Y • Z% of story" without dropping the story context on mobile.
 * 3. Library bookcase items explicitly display "Ch. X of Y · Z% of story".
 * 4. WorkCard lists "Z% of story" for active reading progress.
 */

test('Progress Clarity: LoggedInHome Continue Reading card displays chapter position and story progress', () => {
  const file = fs.readFileSync(
    path.resolve('src/components/home/LoggedInHome.tsx'),
    'utf-8'
  )

  assert.ok(
    file.includes('Ch. {chapterNumber} of {totalChapters}'),
    'Must display current chapter number out of total chapters'
  )
  assert.ok(
    file.includes('{progressPercent}% of story'),
    'Must explicitly state % of story instead of standalone %'
  )
})

test('Progress Clarity: Reader top bar displays chapter position and story progress', () => {
  const file = fs.readFileSync(
    path.resolve('src/routes/read.$workId.$chapterId.tsx'),
    'utf-8'
  )

  assert.ok(
    file.includes('Ch. {chapter.number} of {work.publishedChaptersCount ?? work.chaptersCount}'),
    'Must display chapter number of total published chapters'
  )
  assert.ok(
    file.includes('% of story'),
    'Must state % of story in the reader header'
  )
})

test('Progress Clarity: Library views display chapter position and % of story', () => {
  const file = fs.readFileSync(
    path.resolve('src/routes/library.tsx'),
    'utf-8'
  )

  assert.ok(
    file.includes('{safePercent}% of story'),
    'Focal hero must show % of story'
  )
  assert.ok(
    file.includes('Ch. {progress.chapterNumber || 1} of {work.chaptersCount || 1}'),
    'Must display chapter number out of total chapters'
  )
  assert.ok(
    file.includes('{percent}% of story'),
    'Mobile list and in-progress items must display % of story'
  )
})

test('Progress Clarity: WorkCard displays % of story for active progress', () => {
  const file = fs.readFileSync(
    path.resolve('src/components/WorkCard.tsx'),
    'utf-8'
  )

  assert.ok(
    file.includes('% of story'),
    'WorkCard must state % of story'
  )
})
