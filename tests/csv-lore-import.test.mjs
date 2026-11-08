import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseRawCsv,
  parseLoreCsv,
  generateSampleLoreCsv,
} from '../src/lib/lore/csvLoreParser.ts'
import {
  linkMultipleEntities,
  extractLoreEntities,
} from '../src/lib/lore/loreParser.ts'
import { executeImportStoryLoreCsv } from '../src/server/writer.ts'

test('RFC 4180 tokenizer handles quotes, commas, escaped quotes, multiline and UTF-8 BOM', () => {
  const sample = '\uFEFFName,Type,Tooltip\n"Arthur Pendragon",Character,"The ""True"" King, wielder of Excalibur."\n"Dark Forest",Location,"A grim place with\nmultiple shadows."\n'
  const rows = parseRawCsv(sample)

  assert.equal(rows.length, 3)
  assert.deepEqual(rows[0], ['Name', 'Type', 'Tooltip'])
  assert.equal(rows[1][0], 'Arthur Pendragon')
  assert.equal(rows[1][1], 'Character')
  assert.equal(rows[1][2], 'The "True" King, wielder of Excalibur.')
  assert.equal(rows[2][0], 'Dark Forest')
  assert.equal(rows[2][1], 'Location')
  assert.equal(rows[2][2], 'A grim place with\nmultiple shadows.')
})

test('parseLoreCsv validates headers flexibly: supports Description as Tooltip, case-insensitivity, and any column order', () => {
  // Truly missing headers (Foo, Bar, Baz)
  const invalidHeaders1 = 'Foo,Bar,Baz\nArthur,Character,King'
  const res1 = parseLoreCsv(invalidHeaders1)
  assert.equal(res1.success, false)
  assert.match(res1.errors[0], /Missing required columns/)

  // Case-insensitive (name, type, tooltip)
  const lowerCsv = 'name,type,tooltip\nArthur,Character,King of Camelot'
  const resLower = parseLoreCsv(lowerCsv)
  assert.equal(resLower.success, true)
  assert.equal(resLower.rows.length, 1)
  assert.equal(resLower.rows[0].name, 'Arthur')

  // Real world export: Type,Name,Description (Description synonym + different column order)
  const userExport = 'Type,Name,Description\nCharacter,Evan,Protagonist; tenant of Apartment 306.'
  const resUser = parseLoreCsv(userExport)
  assert.equal(resUser.success, true)
  assert.equal(resUser.rows.length, 1)
  assert.equal(resUser.rows[0].name, 'Evan')
  assert.equal(resUser.rows[0].type, 'Character')
  assert.equal(resUser.rows[0].tooltip, 'Protagonist; tenant of Apartment 306.')

  // Exact headers (Name, Type, Tooltip)
  const validCsv = 'Name,Type,Tooltip\nArthur,Character,King of Camelot'
  const res2 = parseLoreCsv(validCsv)
  assert.equal(res2.success, true)
  assert.equal(res2.rows.length, 1)
  assert.equal(res2.rows[0].name, 'Arthur')
  assert.equal(res2.rows[0].type, 'Character')
  assert.equal(res2.rows[0].tooltip, 'King of Camelot')
})

test('parseLoreCsv ignores duplicate rows ONLY if all three columns (triplet) are identical', () => {
  const csv = [
    'Name,Type,Tooltip',
    'Arthur,Character,King of Camelot',
    'Arthur,Character,King of Camelot', // exact duplicate -> ignored
    'Arthur,Protagonist,Legendary Sovereign', // same name, different type & tooltip -> KEPT
    'Arthur,Character,A different description', // same name & type, different tooltip -> KEPT
    'Merlin,Mage,Court Sorcerer',
    'Merlin,Mage,Court Sorcerer', // exact duplicate -> ignored
  ].join('\n')

  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.duplicateCount, 2)
  assert.equal(res.rows.length, 4)

  const arthurRows = res.rows.filter((r) => r.name === 'Arthur')
  assert.equal(arthurRows.length, 3)
  assert.equal(arthurRows[0].tooltip, 'King of Camelot')
  assert.equal(arthurRows[1].type, 'Protagonist')
  assert.equal(arthurRows[2].tooltip, 'A different description')

  const merlinRows = res.rows.filter((r) => r.name === 'Merlin')
  assert.equal(merlinRows.length, 1)
})

test('parseLoreCsv allows completely custom strings in Type column and strips brackets from Name', () => {
  const csv = [
    'Name,Type,Tooltip',
    '[[Excalibur]],Divine Artifact,"A holy blade pulled from stone"',
    'Avalon,Mystical Realm,"The isle of blessed apples"',
    'Round Table,,The legendary gathering table of the realm', // Empty type defaults to Character
  ].join('\n')

  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.rows.length, 3)

  assert.equal(res.rows[0].name, 'Excalibur') // Brackets stripped
  assert.equal(res.rows[0].type, 'Divine Artifact') // Custom type

  assert.equal(res.rows[1].name, 'Avalon')
  assert.equal(res.rows[1].type, 'Mystical Realm')

  assert.equal(res.rows[2].name, 'Round Table')
  assert.equal(res.rows[2].type, 'Character') // defaulted
})

test('generateSampleLoreCsv produces valid downloadable CSV matching spec', () => {
  const template = generateSampleLoreCsv()
  const res = parseLoreCsv(template)
  assert.equal(res.success, true)
  assert.ok(res.rows.length >= 3)
  assert.equal(res.duplicateCount, 0)
})

test('linkMultipleEntities links multi-word and substring-shadowed entities in single pass without corrupting nested links', () => {
  const markdown = `
    King Arthur Pendragon sat with Arthur in the grand court of Camelot.
    Later, Arthur Pendragon picked up Excalibur while Merlin observed.
  `

  const entities = [
    { name: 'Arthur', entityType: 'Character', description: 'Prince' },
    { name: 'Arthur Pendragon', entityType: 'Protagonist', description: 'High King of Camelot' },
    { name: 'Excalibur', entityType: 'Artifact', description: 'Legendary Sword' },
    { name: 'Camelot', entityType: 'Location', description: 'Capital fortress' },
  ]

  const { newMarkdown, totalLinked, entityLinkCounts } = linkMultipleEntities(markdown, entities)

  assert.ok(totalLinked > 0)
  assert.equal(entityLinkCounts['Arthur Pendragon'], 2)
  assert.equal(entityLinkCounts['Arthur'], 1)
  assert.equal(entityLinkCounts['Excalibur'], 1)
  assert.equal(entityLinkCounts['Camelot'], 1)

  // Crucial: Arthur Pendragon must NOT contain [[Arthur] Pendragon] or corrupted nested brackets
  assert.ok(!newMarkdown.includes('[[Arthur]'))
  assert.ok(!newMarkdown.includes('[Arthur](lore:Character|Prince) Pendragon'))
  assert.ok(newMarkdown.includes('[Arthur Pendragon](lore:Protagonist|High%20King%20of%20Camelot)'))
  assert.ok(newMarkdown.includes('[Arthur](lore:Character|Prince) in the grand court'))

  // Verify extracted entities from the resulting markdown match correctly
  const extracted = extractLoreEntities(newMarkdown)
  const pendragon = extracted.find((e) => e.name === 'Arthur Pendragon')
  const arthur = extracted.find((e) => e.name === 'Arthur')

  assert.ok(pendragon)
  assert.equal(pendragon.entityType, 'Protagonist')
  assert.ok(arthur)
  assert.equal(arthur.entityType, 'Character')
})

test('executeImportStoryLoreCsv executes batch upsert and multi-chapter linking correctly', async () => {
  const mockWorkId = '11111111-2222-3333-4444-555555555555'
  const mockAuthorProfileId = 'author-prof-123'
  const mockClerkUserId = 'user_clerk_123'

  const mockDbChapters = [
    {
      id: 'chap-1',
      work_id: mockWorkId,
      content: 'Arthur Pendragon marched across Camelot with his soldiers.',
    },
    {
      id: 'chap-2',
      work_id: mockWorkId,
      content: 'In the shadows, Merlin whispered secrets to Arthur.',
    },
    {
      id: 'chap-3',
      work_id: mockWorkId,
      content: 'A quiet night in the tavern with no mentions.',
    },
  ]

  const upsertedEntities = []
  const updatedChapters = []

  const mockAdminClient = {
    from(table) {
      if (table === 'profiles') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { id: mockAuthorProfileId, clerk_user_id: mockClerkUserId },
                  }),
                }
              },
            }
          },
        }
      }
      if (table === 'works') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: {
                      id: mockWorkId,
                      title: 'The Legend',
                      slug: 'the-legend',
                      author_id: mockAuthorProfileId,
                    },
                  }),
                }
              },
            }
          },
        }
      }
      if (table === 'story_lore_entities') {
        return {
          upsert: async (rows) => {
            upsertedEntities.push(...rows)
            return { error: null }
          },
        }
      }
      if (table === 'chapters') {
        return {
          select() {
            return {
              eq(col, val) {
                return Promise.resolve({ data: mockDbChapters })
              },
            }
          },
          update(updates) {
            return {
              eq(col, val) {
                updatedChapters.push({ id: val, updates })
                return Promise.resolve({ error: null })
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const csv = [
    'Name,Type,Tooltip',
    'Arthur Pendragon,Character,High King of Camelot',
    'Camelot,Location,Capital City',
    'Merlin,Sage,Court Sorcerer',
    'Arthur Pendragon,Character,High King of Camelot', // duplicate ignored
  ].join('\n')

  const res = await executeImportStoryLoreCsv(
    {
      workId: mockWorkId,
      clerkUserId: mockClerkUserId,
      csvText: csv,
      linkAllChapters: true,
    },
    mockAdminClient,
    async () => ({ userId: mockClerkUserId })
  )

  assert.equal(res.success, true)
  assert.equal(res.importedCount, 3)
  assert.equal(res.duplicateCount, 1)
  assert.equal(res.chaptersUpdated, 2) // chap-1 and chap-2 updated, chap-3 untouched
  assert.ok(res.totalMentionsLinked >= 3)
  assert.equal(upsertedEntities.length, 3)

  // Verify chap-1 got updated with links
  const ch1Update = updatedChapters.find((c) => c.id === 'chap-1')
  assert.ok(ch1Update)
  assert.ok(ch1Update.updates.content.includes('[Arthur Pendragon](lore:Character|High%20King%20of%20Camelot)'))
  assert.ok(ch1Update.updates.content.includes('[Camelot](lore:Location|Capital%20City)'))
})

test('Edge Case: Header cells with whitespace or zero-width spaces parse smoothly', () => {
  const csv = ' Name , Type , Tooltip \nArthur,Character,King of Camelot'
  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.rows.length, 1)
  assert.equal(res.rows[0].name, 'Arthur')
})

test('Edge Case: Type column containing pipes is sanitized to avoid payload syntax corruption', () => {
  const csv = 'Name,Type,Tooltip\nLancelot,Knight | Champion,The First Knight of the Round Table'
  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.rows[0].type, 'Knight / Champion')

  // Linking with this sanitized type produces valid parseable lore link
  const markdown = 'Sir Lancelot rode forth.'
  const { newMarkdown } = linkMultipleEntities(markdown, [
    { name: res.rows[0].name, entityType: res.rows[0].type, description: res.rows[0].tooltip },
  ])
  const extracted = extractLoreEntities(newMarkdown)
  assert.equal(extracted.length, 1)
  assert.equal(extracted[0].name, 'Lancelot')
  assert.equal(extracted[0].entityType, 'Knight / Champion')
  assert.equal(extracted[0].description, 'The First Knight of the Round Table')
})

test('Edge Case: Cells wrapped in outer quotes or extra brackets are cleanly trimmed', () => {
  const csv = 'Name,Type,Tooltip\n"[[Guinevere]]",Queen,"""Queen of Camelot"""'
  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.rows[0].name, 'Guinevere')
  assert.equal(res.rows[0].tooltip, 'Queen of Camelot')
})

test('Edge Case: Name column with asterisks or underscores is sanitized', () => {
  const csv = 'Name,Type,Tooltip\n"**Kavya**",Character,"Heroine"\n"__Aarav__",Character,"Hero"'
  const res = parseLoreCsv(csv)
  assert.equal(res.success, true)
  assert.equal(res.rows[0].name, 'Kavya')
  assert.equal(res.rows[1].name, 'Aarav')
})

