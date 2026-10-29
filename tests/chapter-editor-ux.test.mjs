import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Chapter Editor UX: Direct Editor Navigation & Quick Add Chapter', async (t) => {
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )

  // 1. Verify handleQuickCreateChapter exists and automatically increments chapter number
  assert.ok(
    manageFile.includes('handleQuickCreateChapter'),
    'write.manage must implement handleQuickCreateChapter for direct chapter creation'
  )

  assert.ok(
    manageFile.includes('isCreatingChapter'),
    'write.manage must track isCreatingChapter state for seamless transition feedback'
  )

  // 2. Verify + Add dropdown navigates directly to editor via handleQuickCreateChapter
  assert.ok(
    manageFile.includes('onClick={() => handleQuickCreateChapter()}'),
    'Add Chapter action must directly trigger handleQuickCreateChapter without modal barrier'
  )

  // 3. Verify act cards trigger handleQuickCreateChapter with preselected act.id
  assert.ok(
    manageFile.includes('handleQuickCreateChapter(act.id)'),
    'Act cards must trigger quick chapter creation directly assigned to that act'
  )
})

test('Chapter Editor UX: Dramatic Act Dropdown in Editor', async (t) => {
  const richEditorFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/studio/StoryRichEditor.tsx'),
    'utf-8'
  )

  const chapterRouteFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.editor.$workId.$chapterId.tsx'),
    'utf-8'
  )

  // 1. Verify StoryRichEditorProps defines acts, actId, and onActChange
  assert.ok(
    richEditorFile.includes('acts?: Array<{ id: string; number: number; title: string }>'),
    'StoryRichEditorProps must accept acts array'
  )
  assert.ok(
    richEditorFile.includes('actId?: string'),
    'StoryRichEditorProps must accept actId string'
  )
  assert.ok(
    richEditorFile.includes('onActChange?: (actId: string) => void'),
    'StoryRichEditorProps must accept onActChange callback'
  )

  // 2. Verify Act selector dropdown is rendered in top toolbar
  assert.ok(
    richEditorFile.includes('aria-label="Assign chapter to Act"'),
    'StoryRichEditor top toolbar must render Act selector dropdown'
  )

  // 3. Verify Act selector dropdown is rendered on drafting canvas
  assert.ok(
    richEditorFile.includes('aria-label="Dramatic Act Selection"'),
    'StoryRichEditor drafting canvas must render Dramatic Act selector'
  )

  // 4. Verify No Act (Unassigned) option exists alongside all acts
  assert.ok(
    richEditorFile.includes('No Act (Unassigned)'),
    'Act dropdown must provide unassigned option for standalone chapters'
  )

  // 5. Verify chapter route wires acts and onActChange handler
  assert.ok(
    chapterRouteFile.includes('acts={work.acts || []}'),
    'Chapter editor route must pass work.acts to StoryRichEditor'
  )
  assert.ok(
    chapterRouteFile.includes('onActChange={handleActChange}'),
    'Chapter editor route must pass handleActChange to StoryRichEditor'
  )
  assert.ok(
    chapterRouteFile.includes('latestStateRef.current.actId = newActId'),
    'handleActChange must update latestStateRef to avoid stale closures'
  )
})

test('Chapter Editor UX: Publish Button Disabled until Saved Invariant', async (t) => {
  const richEditorFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/studio/StoryRichEditor.tsx'),
    'utf-8'
  )

  const chapterRouteFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.editor.$workId.$chapterId.tsx'),
    'utf-8'
  )

  // 1. Verify StoryRichEditor disables Publish button when autosaveStatus is dirty or saving
  assert.ok(
    richEditorFile.includes('disabled={autosaveStatus !== \'saved\'}'),
    'Publish button in StoryRichEditor must be strictly disabled when autosaveStatus !== "saved"'
  )

  // 2. Verify disabled visual styling and tooltip
  assert.ok(
    richEditorFile.includes('Save chapter changes before publishing'),
    'Publish button must inform user that chapter changes must be saved first'
  )

  // 3. Verify disabled cursor and opacity
  assert.ok(
    richEditorFile.includes('cursor-not-allowed opacity-50'),
    'Disabled Publish button must have cursor-not-allowed and reduced opacity'
  )

  // 4. Verify handlePublish in route guards against unsaved publish attempts
  assert.ok(
    chapterRouteFile.includes('if (autosaveStatus !== \'saved\')'),
    'handlePublish in chapter route must reject execution if autosaveStatus !== "saved"'
  )
})
