import { test, describe } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

describe('Reader Header Single-Row Layout and Mobile Navigation Drawer', () => {
  const readerPath = path.resolve(process.cwd(), 'src/routes/read.$workId.$chapterId.tsx')
  const headerPath = path.resolve(process.cwd(), 'src/components/Header.tsx')

  test('reader route imports Menu icon and extracts setMobileDrawerOpen from AppContext', () => {
    const content = fs.readFileSync(readerPath, 'utf8')
    assert.match(content, /Menu,?\s*\}\s*from\s*['"]lucide-react['"]/, 'Menu icon must be imported from lucide-react')
    assert.match(content, /mobileDrawerOpen,\s*setMobileDrawerOpen/, 'Must extract mobileDrawerOpen and setMobileDrawerOpen from useApp()')
  })

  test('reader header uses compact single-row flex layout with truncate and shrink-0 constraints', () => {
    const content = fs.readFileSync(readerPath, 'utf8')
    const headerMatch = content.match(/<header className="sticky top-0[\s\S]*?<\/header>/)
    assert.ok(headerMatch, 'Sticky reading header must exist')
    const headerContent = headerMatch[0]

    assert.match(headerContent, /mx-auto flex h-10 max-w-4xl items-center justify-between px-2\.5 sm:px-4/, 'Header must use single-row container')
    assert.match(headerContent, /shrink-0[\s\S]*?<ArrowLeft[\s\S]*?>Back<\/span>/, 'Back link must be shrink-0 so it does not collapse')
    assert.match(headerContent, /flex-1 min-w-0 text-center font-mono text-\[11px\][^>]*truncate/, 'Center indicator must flex-1 min-w-0 truncate to prevent line wraps')
    assert.match(headerContent, /hidden sm:inline[\s\S]*?% of story/, 'Percentage progress text must be hidden on narrow mobile screens')
  })

  test('reader header right button group contains Headphones, Share, Settings, and Menu in single row', () => {
    const content = fs.readFileSync(readerPath, 'utf8')
    const headerMatch = content.match(/<header className="sticky top-0[\s\S]*?<\/header>/)
    assert.ok(headerMatch, 'Sticky reading header must exist')
    const headerContent = headerMatch[0]

    assert.match(headerContent, /flex items-center gap-0\.5 sm:gap-1 shrink-0/, 'Buttons must have tight gap and shrink-0')
    assert.doesNotMatch(headerContent, /min-h-\[44px\] min-w-\[44px\]/, 'Header buttons must remove awkward 44px min-dimension overrides')
    assert.match(headerContent, /h-8 w-8 sm:h-7 sm:w-7/, 'Must use editor-grade compact button dimensions')
    assert.match(headerContent, /<Headphones className="h-4 w-4 sm:h-3\.5 sm:w-3\.5"/, 'Must contain Headphones icon')
    assert.match(headerContent, /<Share2 className="h-4 w-4 sm:h-3\.5 sm:w-3\.5"/, 'Must contain Share2 icon')
    assert.match(headerContent, /<Settings className="h-4 w-4 sm:h-3\.5 sm:w-3\.5"/, 'Must contain Settings icon')
    assert.match(headerContent, /<Menu className="h-4 w-4 sm:h-3\.5 sm:w-3\.5"/, 'Must contain Menu icon')
    assert.match(headerContent, /onClick=\{\(\) => setMobileDrawerOpen\(!mobileDrawerOpen\)\}/, 'Menu button must toggle mobile drawer state')
  })

  test('Header.tsx keeps Drawer mounted in DOM on reader and editor routes', () => {
    const content = fs.readFileSync(headerPath, 'utf8')
    assert.doesNotMatch(content, /if\s*\(\s*isReaderMode\s*\|\|\s*isEditorMode\s*\)\s*\{\s*return null/, 'Header must NOT early return null on reader/editor modes')
    assert.match(content, /\{!isReaderMode && !isEditorMode && \(\s*<header className=\{headerClasses\}>/, 'Header element itself should be omitted on reader/editor modes while Drawer remains rendered')
    assert.match(content, /<Drawer\s+isOpen=\{mobileDrawerOpen\}/, 'Drawer must remain rendered in the component tree')
  })
})
