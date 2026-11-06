import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLorePayload,
  extractLoreEntities,
  countEntityMentions,
  linkAllOccurrences,
  unlinkAllOccurrences,
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
})

test('extractLoreEntities parses both markdown and wiki-style lore tags', () => {
  const markdown = `
    In the court of [Arthur](lore:Character|King of Camelot), legends were born.
    Later, [Camelot](lore:Location|The legendary castle) stood tall.
    Another friend [[Merlin|Wizard|Court sorcerer]] watched over.
    And a repeat mention of [Arthur](lore:Character|King of Camelot).
  `
  const entities = extractLoreEntities(markdown)
  assert.equal(entities.length, 3)

  const arthur = entities.find((e) => e.name.toLowerCase() === 'arthur')
  assert.ok(arthur)
  assert.equal(arthur.entityType, 'Character')
  assert.equal(arthur.description, 'King of Camelot')

  const camelot = entities.find((e) => e.name.toLowerCase() === 'camelot')
  assert.ok(camelot)
  assert.equal(camelot.entityType, 'Location')

  const merlin = entities.find((e) => e.name.toLowerCase() === 'merlin')
  assert.ok(merlin)
  assert.equal(merlin.description, 'Court sorcerer')
})

test('countEntityMentions counts linked and unlinked occurrences accurately', () => {
  const markdown = `
    [Arthur](lore:Character|King) was brave.
    Arthur went into the forest.
    Later, Arthur drew the sword.
    Someone said: "Long live Arthur!"
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
  `
  const entity = {
    name: 'Arthur',
    entityType: 'Character',
    description: 'King of Camelot',
  }

  const { newMarkdown, countReplaced } = linkAllOccurrences(markdown, entity)
  assert.equal(countReplaced, 2)
  assert.ok(newMarkdown.includes('[Arthur](lore:Character|King of Camelot) then called his men.'))
  assert.ok(newMarkdown.includes('[Arthur](lore:Character|King of Camelot) smiled.'))
  assert.ok(newMarkdown.includes('`Arthur` should be ignored.'))
  assert.ok(newMarkdown.includes("[Visit Arthur's town](https://example.com)"))
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
