import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLorePayload,
  extractLoreEntities,
  countEntityMentions,
  linkAllOccurrences,
  linkSingleOccurrence,
  unlinkAllOccurrences,
  buildLorePayload,
  fixedEncodeURIComponent,
  normalizeLoreLinks,
  stripLoreToPlainText,
  getCleanChapterSnippet,
} from '../src/lib/lore/loreParser.ts'

test('parseLorePayload correctly separates entityType and description', () => {
  const res1 = parseLorePayload('Character|Male, 23 — protagonist')
  assert.equal(res1.entityType, 'Character')
  assert.equal(res1.description, 'Male, 23 — protagonist')

  const res2 = parseLorePayload('Location|A mythical forest in England')
  assert.equal(res2.entityType, 'Location')
  assert.equal(res2.description, 'A mythical forest in England')

  // Default when no pipe present
  const res3 = parseLorePayload('An ancient magical artifact')
  assert.equal(res3.entityType, 'LORE')
  assert.equal(res3.description, 'An ancient magical artifact')

  // Supports encoded payload with parentheses and special chars
  const encoded = 'Character|' + fixedEncodeURIComponent('Male, 23 (Prince of Camelot) — "The Brave"')
  const res4 = parseLorePayload(encoded)
  assert.equal(res4.entityType, 'Character')
  assert.equal(res4.description, 'Male, 23 (Prince of Camelot) — "The Brave"')
})

test('extractLoreEntities parses both markdown and wiki-style lore tags', () => {
  const markdown = `
    In the court of [Arthur](lore:Character|King%20of%20Camelot), legends were born.
    Later, [Camelot](lore:Location|The%20legendary%20castle) stood tall.
    Another friend [[Merlin|Wizard|Court sorcerer]] watched over.
    And a repeat mention of [Arthur](lore:Character|King%20of%20Camelot).
  `
  const entities = extractLoreEntities(markdown)
  assert.equal(entities.length, 3)

  const arthur = entities.find((e) => e.name === 'Arthur')
  assert.ok(arthur)
  assert.equal(arthur.entityType, 'Character')
  assert.equal(arthur.description, 'King of Camelot')

  const camelot = entities.find((e) => e.name === 'Camelot')
  assert.ok(camelot)
  assert.equal(camelot.entityType, 'Location')

  const merlin = entities.find((e) => e.name === 'Merlin')
  assert.ok(merlin)
  assert.equal(merlin.description, 'Court sorcerer')
})

test('countEntityMentions counts linked and unlinked occurrences accurately (exact case)', () => {
  const markdown = `
    [Arthur](lore:Character|King) was brave.
    Arthur went into the forest.
    Later, Arthur drew the sword.
    Someone said: "Long live Arthur!"
    Lower-case arthur should NOT match because exact case is preserved.
  `
  const counts = countEntityMentions(markdown, 'Arthur')
  assert.equal(counts.linkedCount, 1)
  assert.equal(counts.unlinkedCount, 3)
})

test('linkAllOccurrences replaces unlinked mentions without corrupting existing links or code', () => {
  const markdown = `
    [Arthur](lore:Character|King) rested.
    Arthur then called his men.
    In the code block: \`Arthur\` should be ignored.
    Also, don't link inside a regular link: [Visit Arthur's town](https://example.com).
    Arthur smiled.
    Lowercase arthur remains unchanged per exact case requirement.
  `
  const entity = {
    name: 'Arthur',
    entityType: 'Character',
    description: 'King of Camelot',
  }

  const { newMarkdown, countReplaced } = linkAllOccurrences(markdown, entity)
  assert.equal(countReplaced, 2)
  assert.ok(newMarkdown.includes('[Arthur](lore:Character|King%20of%20Camelot) then called his men.'))
  assert.ok(newMarkdown.includes('[Arthur](lore:Character|King%20of%20Camelot) smiled.'))
  assert.ok(newMarkdown.includes('`Arthur` should be ignored.'))
  assert.ok(newMarkdown.includes("[Visit Arthur's town](https://example.com)"))
  assert.ok(newMarkdown.includes('Lowercase arthur remains unchanged'))
})

test('supports multiple words lore entities', () => {
  const markdown = 'The Lord Commander stepped forward. The Lord Commander spoke.'
  const entity = {
    name: 'Lord Commander',
    entityType: 'Character',
    description: 'Supreme Commander of the Guard',
  }

  const { newMarkdown, countReplaced } = linkAllOccurrences(markdown, entity)
  assert.equal(countReplaced, 2)
  assert.ok(newMarkdown.includes('[Lord Commander](lore:Character|Supreme%20Commander%20of%20the%20Guard)'))

  const extracted = extractLoreEntities(newMarkdown)
  assert.equal(extracted.length, 1)
  assert.equal(extracted[0].name, 'Lord Commander')
  assert.equal(extracted[0].description, 'Supreme Commander of the Guard')
})

test('supports non-ASCII and Devanagari lore entities', () => {
  const markdown = 'यहाँ विशाखा आई थी। विशाखा ने बात की। विशाखापुर अलग जगह है।'
  const entity = {
    name: 'विशाखा',
    entityType: 'Character',
    description: 'मुख्य नायिका',
  }

  const { newMarkdown, countReplaced } = linkAllOccurrences(markdown, entity)
  assert.equal(countReplaced, 2)
  assert.ok(newMarkdown.includes('[विशाखा]'))
  assert.ok(newMarkdown.includes('विशाखापुर अलग जगह है')) // Substring not replaced

  const extracted = extractLoreEntities(newMarkdown)
  assert.equal(extracted.length, 1)
  assert.equal(extracted[0].name, 'विशाखा')
  assert.equal(extracted[0].description, 'मुख्य नायिका')
})

test('linkSingleOccurrence replaces only one occurrence when applyToAll is false', () => {
  const markdown = 'Arthur walked in. Arthur sat down. Arthur left.'
  const entity = {
    name: 'Arthur',
    entityType: 'Character',
    description: 'King of Camelot',
  }

  const { newMarkdown, countReplaced } = linkSingleOccurrence(markdown, entity)
  assert.equal(countReplaced, 1)
  assert.ok(newMarkdown.startsWith('[Arthur](lore:Character|King%20of%20Camelot) walked in.'))
  assert.ok(newMarkdown.includes('Arthur sat down. Arthur left.'))
})

test('unlinkAllOccurrences cleanly strips lore links back to plain text', () => {
  const markdown = 'Hail [Arthur](lore:Character|King) and [[Merlin|Wizard]]!'
  const { newMarkdown: res1, countUnlinked: c1 } = unlinkAllOccurrences(markdown, 'Arthur')
  assert.equal(c1, 1)
  assert.equal(res1, 'Hail Arthur and [[Merlin|Wizard]]!')

  const { newMarkdown: res2, countUnlinked: c2 } = unlinkAllOccurrences(res1, 'Merlin')
  assert.equal(c2, 1)
  assert.equal(res2, 'Hail Arthur and Merlin!')
})

test('admin multi-chapter lore linking workflow', () => {
  const chapters = [
    { id: 'ch-1', content: 'Chapter 1 begins with Arthur walking in Camelot.' },
    { id: 'ch-2', content: 'Chapter 2 continues. Arthur met Merlin.' },
    { id: 'ch-3', content: 'Chapter 3 concludes. No mentions here.' },
  ]

  const entity = {
    name: 'Arthur',
    entityType: 'Character',
    description: 'The legendary protagonist',
  }

  let totalLinked = 0
  let updatedChapters = 0

  const updated = chapters.map((ch) => {
    const { newMarkdown, countReplaced } = linkAllOccurrences(ch.content, entity)
    if (countReplaced > 0) {
      totalLinked += countReplaced
      updatedChapters++
      return { ...ch, content: newMarkdown }
    }
    return ch
  })

  assert.equal(totalLinked, 2)
  assert.equal(updatedChapters, 2)
  assert.ok(updated[0].content.includes('[Arthur](lore:Character|The%20legendary%20protagonist)'))
  assert.ok(updated[1].content.includes('[Arthur](lore:Character|The%20legendary%20protagonist)'))
  assert.equal(updated[2].content, chapters[2].content)
})

test('user case: links Navya in chapter text containing legacy Kavya lore link', () => {
  const originalText = `This is a story about a woman called Navya and a man called [Kavya](lore:Character|man, 23).

Navya didint know that he can get pass through the bridge but when [Kavya](lore:Character|man, 23) saw that so he was very happy`

  const entity = {
    name: 'Navya',
    entityType: 'Character',
    description: 'woman, 23',
  }

  const { newMarkdown, countReplaced } = linkAllOccurrences(originalText, entity)
  assert.equal(countReplaced, 2)
  const normalized = normalizeLoreLinks(newMarkdown)

  assert.ok(normalized.includes('[Navya](lore:Character|woman%2C%2023)'))
  assert.ok(normalized.includes('[Kavya](lore:Character|man%2C%2023)'))
  assert.ok(!normalized.includes('called Navya and'))
})

test('stripLoreToPlainText cleanly extracts plain text from markdown & wiki lore links', () => {
  const text = 'Hello [Navya](lore:Character%7CLead%20Actress) and [[Kavya|Character|Protagonist]].'
  const plain = stripLoreToPlainText(text)
  assert.equal(plain, 'Hello Navya and Kavya.')
})

test('getCleanChapterSnippet handles TOC cards with multiple lore notes and truncated lore links', () => {
  const input = `this is the first chapter.

[Navya](lore:Character%7CLead%20Actress) is the main character of the story.

But [Navya](lore:Character%7CLead%20Actress) may [not be](lore:Character|Test)

However there [could](lore:Charact`

  const snippet = getCleanChapterSnippet(input, 220)
  assert.ok(!snippet.includes('lore:'))
  assert.ok(!snippet.includes('%7C'))
  assert.ok(!snippet.includes('['))
  assert.ok(!snippet.includes(']'))
  assert.ok(snippet.includes('Navya is the main character'))
  assert.ok(snippet.includes('may not be However there could'))
})
