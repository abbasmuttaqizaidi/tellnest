import test from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, GENRES } from '../src/data/mockData.ts'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../src/lib/taxonomy.ts'
import { executeGetTaxonomy } from '../src/server/taxonomy.ts'

test('Taxonomy Alphabetical & Religious Inclusion: Canonical definitions', () => {
  // Check Religion & Spirituality category in canonical list
  const religionCat = GLOBAL_CATEGORIES.find((c) => c.slug === 'religion-spirituality' || c.name === 'Religion & Spirituality')
  assert.ok(religionCat, 'GLOBAL_CATEGORIES must contain Religion & Spirituality')
  assert.equal(religionCat.name, 'Religion & Spirituality')

  // Check Faith & Spirituality genre in canonical list
  const faithGenre = GLOBAL_GENRES.find((g) => g.slug === 'faith-spirituality' || g.name === 'Faith & Spirituality')
  assert.ok(faithGenre, 'GLOBAL_GENRES must contain Faith & Spirituality')
  assert.equal(faithGenre.name, 'Faith & Spirituality')
})

test('Taxonomy Alphabetical & Religious Inclusion: mockData CATEGORIES and GENRES', () => {
  // 1. Religion & Spirituality category exists
  const religionCat = CATEGORIES.find((c) => c.slug === 'religion-spirituality' || c.name === 'Religion & Spirituality')
  assert.ok(religionCat, 'CATEGORIES in mockData must include Religion & Spirituality')

  // 2. Faith & Spirituality genre exists
  const faithGenre = GENRES.find((g) => g.slug === 'faith-spirituality' || g.name === 'Faith & Spirituality')
  assert.ok(faithGenre, 'GENRES in mockData must include Faith & Spirituality')

  // 3. CATEGORIES is strictly sorted alphabetically by name
  for (let i = 0; i < CATEGORIES.length - 1; i++) {
    const current = CATEGORIES[i].name
    const next = CATEGORIES[i + 1].name
    assert.ok(
      current.localeCompare(next) <= 0,
      `CATEGORIES must be sorted alphabetically: "${current}" should come before or equal "${next}"`
    )
  }

  // 4. GENRES is strictly sorted alphabetically by name
  for (let i = 0; i < GENRES.length - 1; i++) {
    const current = GENRES[i].name
    const next = GENRES[i + 1].name
    assert.ok(
      current.localeCompare(next) <= 0,
      `GENRES must be sorted alphabetically: "${current}" should come before or equal "${next}"`
    )
  }
})

test('Taxonomy Alphabetical & Religious Inclusion: executeGetTaxonomy', async () => {
  const result = await executeGetTaxonomy({ skipCache: true })
  assert.ok(result, 'getTaxonomyServerFn should return result')
  assert.ok(Array.isArray(result.categories), 'categories must be an array')
  assert.ok(Array.isArray(result.genres), 'genres must be an array')

  // 1. Religion & Spirituality category is present
  const relCat = result.categories.find((c) => c.slug === 'religion-spirituality' || c.name === 'Religion & Spirituality')
  assert.ok(relCat, 'getTaxonomyServerFn must include Religion & Spirituality')

  // 2. Faith & Spirituality genre is present
  const faithGen = result.genres.find((g) => g.slug === 'faith-spirituality' || g.name === 'Faith & Spirituality')
  assert.ok(faithGen, 'getTaxonomyServerFn must include Faith & Spirituality')

  // 3. Categories are sorted alphabetically
  for (let i = 0; i < result.categories.length - 1; i++) {
    const current = result.categories[i].name
    const next = result.categories[i + 1].name
    assert.ok(
      current.localeCompare(next) <= 0,
      `Server categories must be sorted alphabetically: "${current}" should come before or equal "${next}"`
    )
  }

  // 4. Genres are sorted alphabetically
  for (let i = 0; i < result.genres.length - 1; i++) {
    const current = result.genres[i].name
    const next = result.genres[i + 1].name
    assert.ok(
      current.localeCompare(next) <= 0,
      `Server genres must be sorted alphabetically: "${current}" should come before or equal "${next}"`
    )
  }
})

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

test('Design System: Combobox component exists and is used in write.new.tsx', () => {
  // 1. Verify Combobox.tsx exists in design-system
  const comboboxPath = path.join(rootDir, 'src/design-system/Combobox.tsx')
  assert.ok(fs.existsSync(comboboxPath), 'src/design-system/Combobox.tsx must exist')
  const comboboxContent = fs.readFileSync(comboboxPath, 'utf-8')
  assert.ok(comboboxContent.includes('export const Combobox'), 'Combobox.tsx must export Combobox')
  assert.ok(!comboboxContent.includes('tag') || comboboxContent.includes('zero chips/tags'), 'Combobox must be single-select without chips/tags')

  // 2. Verify design-system/index.ts exports Combobox
  const indexContent = fs.readFileSync(path.join(rootDir, 'src/design-system/index.ts'), 'utf-8')
  assert.ok(indexContent.includes("export * from './Combobox'"), 'index.ts must export Combobox')

  // 3. Verify write.new.tsx uses Combobox for Category and Genre
  const writeNewContent = fs.readFileSync(path.join(rootDir, 'src/routes/write.new.tsx'), 'utf-8')
  assert.ok(writeNewContent.includes('Combobox'), 'write.new.tsx must import Combobox')
  assert.ok(writeNewContent.includes('<Combobox'), 'write.new.tsx must render Combobox component')
  assert.ok(writeNewContent.includes('options={categoryOptions}'), 'Category must use Combobox')
  assert.ok(writeNewContent.includes('options={genreOptions}'), 'Genre must use Combobox')
})

test('Taxonomy Bidirectional Sync: Religion & Spirituality <-> Faith & Spirituality in write.new.tsx', () => {
  const writeNewContent = fs.readFileSync(path.join(rootDir, 'src/routes/write.new.tsx'), 'utf-8')
  
  // Verify handleCategoryChange sets Faith & Spirituality when Religion & Spirituality is selected
  assert.ok(writeNewContent.includes('handleCategoryChange'), 'Must define handleCategoryChange')
  assert.ok(writeNewContent.includes('Faith & Spirituality'), 'Must synchronize to Faith & Spirituality')

  // Verify handleGenreChange sets Religion & Spirituality when Faith & Spirituality is selected
  assert.ok(writeNewContent.includes('handleGenreChange'), 'Must define handleGenreChange')
  assert.ok(writeNewContent.includes('Religion & Spirituality'), 'Must synchronize to Religion & Spirituality')

  // Verify onChange connections
  assert.ok(writeNewContent.includes('onChange={handleCategoryChange}'), 'Category Combobox must use handleCategoryChange')
  assert.ok(writeNewContent.includes('onChange={handleGenreChange}'), 'Genre Combobox must use handleGenreChange')
})
