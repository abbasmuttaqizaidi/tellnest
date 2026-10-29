import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { formatInlineMarkdown } from '../src/lib/markdown.ts'

test('FormattedSynopsis: formatInlineMarkdown converts markdown to React elements', () => {
  // 1. Plain text returns as is
  const plain = formatInlineMarkdown('Plain synopsis text without markdown.')
  assert.strictEqual(plain, 'Plain synopsis text without markdown.')

  // 2. Bold with asterisks
  const boldAsterisks = formatInlineMarkdown('This is **bold text** here.')
  assert.ok(Array.isArray(boldAsterisks), 'Must return an array of nodes when markdown is present')
  const strongEl = boldAsterisks.find((node) => React.isValidElement(node) && node.type === 'strong')
  assert.ok(strongEl, 'Should render strong element')
  assert.strictEqual(strongEl.props.children, 'bold text')

  // 3. Bold with underscores
  const boldUnderscores = formatInlineMarkdown('This is __bold with underscores__.')
  const strongUnderEl = boldUnderscores.find((node) => React.isValidElement(node) && node.type === 'strong')
  assert.ok(strongUnderEl, 'Should render strong element for __text__')
  assert.strictEqual(strongUnderEl.props.children, 'bold with underscores')

  // 4. Italic with asterisks
  const italic = formatInlineMarkdown('A story about *solitude and silence*.')
  const emEl = italic.find((node) => React.isValidElement(node) && node.type === 'em')
  assert.ok(emEl, 'Should render em element')
  assert.strictEqual(emEl.props.children, 'solitude and silence')

  // 5. Bold and Italic combined
  const boldItalic = formatInlineMarkdown('A ***vital revelation*** arrives.')
  const biStrong = boldItalic.find((node) => React.isValidElement(node) && node.type === 'strong')
  assert.ok(biStrong, 'Should render strong element for ***text***')
  assert.strictEqual(biStrong.props.children.type, 'em')
  assert.strictEqual(biStrong.props.children.props.children, 'vital revelation')

  // 6. Strikethrough
  const strike = formatInlineMarkdown('The ~~forgotten~~ path.')
  const delEl = strike.find((node) => React.isValidElement(node) && node.type === 'del')
  assert.ok(delEl, 'Should render del element')
  assert.strictEqual(delEl.props.children, 'forgotten')

  // 7. Inline code
  const code = formatInlineMarkdown('Read chapter `folio-1` first.')
  const codeEl = code.find((node) => React.isValidElement(node) && node.type === 'code')
  assert.ok(codeEl, 'Should render code element')
  assert.strictEqual(codeEl.props.children, 'folio-1')
})

test('FormattedSynopsis: Works and Manage routes integrate FormattedSynopsis', () => {
  const worksFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/works.$workId.tsx'),
    'utf-8'
  )
  const manageFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/write.manage.$workId.tsx'),
    'utf-8'
  )

  // 1. works.$workId.tsx imports FormattedSynopsis
  assert.ok(
    worksFile.includes("import { FormattedSynopsis } from '../components/FormattedSynopsis'"),
    'works.$workId.tsx must import FormattedSynopsis'
  )

  // 2. works.$workId.tsx renders FormattedSynopsis in a vertically scrollable 10-line max-height container
  assert.ok(
    worksFile.includes('<FormattedSynopsis'),
    'works.$workId.tsx must render FormattedSynopsis component'
  )
  assert.ok(
    worksFile.includes('max-h-[260px]') && worksFile.includes('overflow-y-auto'),
    'works.$workId.tsx must enclose synopsis in a max-h-[260px] overflow-y-auto container to cap at ~10 lines'
  )
  assert.ok(
    worksFile.includes('text={work.fullDescription || work.synopsis'),
    'works.$workId.tsx must pass work.fullDescription or work.synopsis to FormattedSynopsis'
  )

  // 3. write.manage.$workId.tsx integrates FormattedSynopsis for synopsis preview
  assert.ok(
    manageFile.includes("import { FormattedSynopsis } from '../components/FormattedSynopsis'"),
    'write.manage.$workId.tsx must import FormattedSynopsis'
  )
  assert.ok(
    manageFile.includes('<FormattedSynopsis'),
    'write.manage.$workId.tsx must render FormattedSynopsis in hero synopsis preview'
  )
})
