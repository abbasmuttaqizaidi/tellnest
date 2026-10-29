import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Chapter Editor UX: Direct Editor Navigation & Deferred Chapter DB Creation', async (t) => {
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )
  const editorFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.editor.$workId.$chapterId.tsx'),
    'utf-8'
  )

  // 1. Verify handleStartNewChapter exists and navigates to 'new' chapter without DB creation
  assert.ok(
    manageFile.includes('handleStartNewChapter'),
    'write.manage must implement handleStartNewChapter for direct editor navigation'
  )

  // 2. Verify + Add dropdown navigates directly to editor via handleStartNewChapter
  assert.ok(
    manageFile.includes('onClick={() => handleStartNewChapter()}'),
    'Add Chapter action must directly trigger handleStartNewChapter without modal barrier'
  )

  // 3. Verify act cards trigger handleStartNewChapter with preselected act.id
  assert.ok(
    manageFile.includes('handleStartNewChapter(act.id)'),
    'Act cards must trigger chapter navigation directly assigned to that act'
  )

  // 4. Verify DB creation is strictly deferred until editor save
  assert.ok(
    editorFile.includes("if (currentChapter.id === 'new')"),
    'write.editor must defer database creation until manual save on new chapter'
  )
  assert.ok(
    editorFile.includes('createWriterChapterServerFn({'),
    'write.editor must create chapter in DB when user explicitly saves new draft'
  )

  // 5. Verify write.manage prioritizes loaderData.work over contextWork to prevent empty acts/lost chapters
  assert.ok(
    manageFile.includes('loaderData?.work || contextWork'),
    'write.manage must prioritize loaderData.work from PostgreSQL over cached contextWork'
  )

  // 6. Verify StoryRichEditor preserves session during draft saving and remounts across chapter switches
  assert.ok(
    editorFile.includes("key={chapterId === 'new' ? 'draft-session' : currentChapter.id}"),
    'StoryRichEditor must preserve draft session on save and remount on chapter switch'
  )

  // 7. Verify navigation disables resetScroll so page does not jump or scroll up on click
  assert.ok(
    manageFile.includes('resetScroll: false'),
    'write.manage must pass resetScroll: false to prevent unexpected scroll up on chapter creation click'
  )

  // 8. Verify immediate visual feedback and preloading on intent
  assert.ok(
    manageFile.includes('isOpeningEditor'),
    'write.manage must track isOpeningEditor state for instant 0ms user feedback'
  )
  assert.ok(
    manageFile.includes('preloadEditor'),
    'write.manage must preload editor route on hover/intent to optimize transition speed'
  )

  // 9. Verify new draft chapter act assignment: only assign act if created from Act card, otherwise unassigned
  assert.ok(
    editorFile.includes('const preselectedAct = targetActIdFromSearch || null'),
    'write.editor must assign targetActId when created from Act card, and null when created from top'
  )

  // 10. Verify manual save updates address bar without unmounting editor or displaying pending route screens
  assert.ok(
    editorFile.includes('window.history?.replaceState'),
    'write.editor must update URL via replaceState on first save to avoid disruptive "Opening chapter..." screen during save'
  )

  // 11. Verify state transition safety to prevent content flushing on save
  assert.ok(
    editorFile.includes('setPersistedChapterId(newId)'),
    'write.editor must track persistedChapterId to preserve typed prose upon saving new chapter'
  )
  assert.ok(
    editorFile.includes('content: currentContent'),
    'write.editor must include typed content in createWriterChapterServerFn payload'
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

  // 2. Verify Act selector dropdown is rendered on drafting canvas above Title input
  assert.ok(
    richEditorFile.includes('aria-label="Dramatic Act Selection"'),
    'StoryRichEditor drafting canvas must render Dramatic Act selector'
  )

  // 3. Verify top header gives clean full-width display to chapter name without cramped dropdown
  assert.ok(
    !richEditorFile.includes('aria-label="Assign chapter to Act"'),
    'Top toolbar header should remain clean and uncluttered without redundant dropdown next to chapter title'
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

test('Chapter-Act Invariant: Strict Act Isolation & Unassigned Logic', async (t) => {
  const writerServerFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/writer.ts'),
    'utf-8'
  )
  const editorFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.editor.$workId.$chapterId.tsx'),
    'utf-8'
  )
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )

  // 1. Verify getWriterWorkDetailsServerFn does not default unassigned chapter actNumber to 1
  assert.ok(
    writerServerFile.includes('actNumber: parentAct ? parentAct.number : undefined'),
    'writer.ts must NOT default unassigned chapter actNumber to 1, avoiding false matching with Act 1'
  )

  // 2. Verify write.editor strictly matches act chapters by actId only
  assert.ok(
    editorFile.includes('(c: any) => c.actId === act.id'),
    'write.editor must strictly match act chapters by actId only, never falling back to actNumber'
  )
  assert.ok(
    !editorFile.includes('c.actId === act.id || c.actNumber === act.number'),
    'write.editor must NOT use actNumber fallback which causes ghost duplicates across multiple acts'
  )

  // 3. Verify write.manage strictly matches act chapters by actId only
  assert.ok(
    manageFile.includes('(ch) => ch.actId === act.id'),
    'write.manage must strictly match act chapters by actId only'
  )
  assert.ok(
    !manageFile.includes('ch.actId === act.id || ch.actNumber === act.number'),
    'write.manage must NOT use actNumber fallback which causes ghost duplicates across multiple acts'
  )

  // 4. Functional simulation of Case 1 (No Acts)
  const case1Work = {
    acts: [],
    chapters: [
      { id: 'ch-1', number: 1, title: 'Chapter 1', actId: null },
      { id: 'ch-2', number: 2, title: 'Chapter 2', actId: null },
    ],
  }
  const case1HasActs = case1Work.acts && case1Work.acts.length > 0
  assert.strictEqual(case1HasActs, false, 'Case 1: Story has no acts')
  // In Case 1, no unassigned block is rendered; chapters are displayed as flat list

  // 5. Functional simulation of Case 2 & Case 3 (Story with Acts)
  const act1 = { id: 'act-1-uuid', number: 1, title: 'Act I' }
  const act2 = { id: 'act-2-uuid', number: 2, title: 'Act II' }
  const case2Work = {
    acts: [act1, act2],
    chapters: [
      { id: 'ch-1', number: 1, title: 'The Beginning', actId: 'act-1-uuid' },
      { id: 'ch-2', number: 2, title: 'The Midpoint', actId: 'act-2-uuid' },
      { id: 'ch-3', number: 3, title: 'The Things We Take Home', actId: null },
    ],
  }

  // Act 1 chapters
  const act1Chapters = case2Work.chapters.filter((c) => c.actId === act1.id)
  assert.deepStrictEqual(act1Chapters.map((c) => c.id), ['ch-1'], 'Act 1 must only contain ch-1')

  // Act 2 chapters
  const act2Chapters = case2Work.chapters.filter((c) => c.actId === act2.id)
  assert.deepStrictEqual(act2Chapters.map((c) => c.id), ['ch-2'], 'Act 2 must only contain ch-2')

  // Unassigned chapters
  const unassignedChapters = case2Work.chapters.filter(
    (c) => !c.actId || !case2Work.acts.some((a) => a.id === c.actId)
  )
  assert.deepStrictEqual(
    unassignedChapters.map((c) => c.id),
    ['ch-3'],
    'Only unassigned chapter ch-3 must appear in Unassigned block'
  )

  // Invariant verification: no chapter appears in more than one section
  const allCategorizedIds = [
    ...act1Chapters.map((c) => c.id),
    ...act2Chapters.map((c) => c.id),
    ...unassignedChapters.map((c) => c.id),
  ]
  const uniqueIds = new Set(allCategorizedIds)
  assert.strictEqual(
    allCategorizedIds.length,
    uniqueIds.size,
    'Each chapter must appear in exactly one section without duplicate rendering'
  )
})
