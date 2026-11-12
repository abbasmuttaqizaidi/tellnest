import { test } from 'node:test'
import assert from 'node:assert/strict'
import { executeGetHatchpenHits, clearHatchpenHitsCache } from '../src/server/hatchpenHits.ts'
import { BROWSE_COLLECTIONS, executeGetBrowseCollectionData } from '../src/server/works.ts'
import { buildSitemapEntries } from '../src/server/sitemap.ts'

test('HatchPen Hits: Returns public-safe sanitized DTO without sensitive data leaks', async () => {
  clearHatchpenHitsCache()
  const res = await executeGetHatchpenHits()

  assert.ok(res, 'Response must exist')
  assert.equal(res.collection.slug, 'hatchpen-hits')
  assert.equal(res.collection.name, 'HatchPen Hits')
  assert.ok(Array.isArray(res.works), 'Works must be an array')
  assert.ok(res.works.length > 0, 'Must contain works')

  // Verify strict Least Data Principle: Zero sensitive leaks
  for (const w of res.works) {
    assert.ok(w.id, 'Work must have id')
    assert.ok(w.title, 'Work must have title')
    assert.ok(w.slug, 'Work must have slug')
    assert.ok(w.cover, 'Work must have cover')
    assert.ok(w.author, 'Work must have author')
    assert.ok(w.author.name, 'Author must have name')

    // Sensitive field leak invariants
    assert.equal(w.author.email, undefined, 'Author email must NEVER leak')
    assert.equal(w.author.clerkId, undefined, 'Clerk ID must NEVER leak')
    assert.equal(w.author.private_tokens, undefined, 'Private tokens must NEVER leak')
    assert.equal(w.author.preferences, undefined, 'Preferences must NEVER leak')
    assert.equal(w.visibility, undefined, 'Internal visibility flag should not leak')
    assert.equal(w.publication_status, undefined, 'Internal publication status should not leak')
    assert.notEqual(w.categorySlug, 'religion-spirituality', 'Religious works must be excluded')
  }
})

test('HatchPen Hits: Caches response in memory for 60s', async () => {
  clearHatchpenHitsCache()
  const first = await executeGetHatchpenHits()
  const second = await executeGetHatchpenHits()

  assert.equal(first.cachedAt, second.cachedAt, 'Second call must return cached result within TTL')
})

test('HatchPen Hits: Canonical collections registry includes hatchpen-hits', async () => {
  assert.ok(BROWSE_COLLECTIONS['hatchpen-hits'], 'BROWSE_COLLECTIONS must contain hatchpen-hits')
  assert.equal(BROWSE_COLLECTIONS['hatchpen-hits'].slug, 'hatchpen-hits')
  assert.equal(BROWSE_COLLECTIONS['hatchpen-hits'].accentLetter, 'H')

  const browseRes = await executeGetBrowseCollectionData('hatchpen-hits', {
    fetchDbWorks: async () => [],
  })
  assert.equal(browseRes.isNotFound, false, 'Collection must be found')
  assert.ok(browseRes.works.length > 0, 'Collection must return works')
})

test('Sitemap: Includes /hatchpen-hits with priority 0.95', async () => {
  const entries = await buildSitemapEntries()
  const hitsEntry = entries.find((e) => e.loc === 'https://hatchpen.com/hatchpen-hits')

  assert.ok(hitsEntry, 'Sitemap must contain https://hatchpen.com/hatchpen-hits')
  assert.equal(hitsEntry.priority, 0.95, 'Hits priority must be 0.95 for prominent Google indexing')
  assert.equal(hitsEntry.changefreq, 'daily')

  const browseHitsEntry = entries.find((e) => e.loc === 'https://hatchpen.com/browse/hatchpen-hits')
  assert.ok(browseHitsEntry, 'Sitemap must contain /browse/hatchpen-hits')
})

test('Admin Toggle: Rejects unauthorized requests fail-closed', async () => {
  const { executeAdminToggleWorkHatchpenHit } = await import('../src/server/admin.ts')

  await assert.rejects(
    async () => {
      await executeAdminToggleWorkHatchpenHit({
        adminToken: 'invalid-token',
        workId: 'test-work-id',
        isHit: true,
      })
    },
    /Unauthorized/i,
    'Must reject invalid admin token'
  )
})

test('Google Sitelinks Schema: __root.tsx declares SiteNavigationElement for HatchPen Hits & Contests', async () => {
  const fs = await import('node:fs')
  const rootContent = fs.readFileSync('src/routes/__root.tsx', 'utf-8')

  assert.ok(rootContent.includes('SiteNavigationElement'), '__root.tsx must declare SiteNavigationElement')
  assert.ok(rootContent.includes('https://hatchpen.com/hatchpen-hits'), 'Must link /hatchpen-hits for Google Sitelinks')
  assert.ok(rootContent.includes('https://hatchpen.com/writing-contests'), 'Must link /writing-contests for Google Sitelinks')
  assert.ok(rootContent.includes('https://hatchpen.com/discover'), 'Must link /discover for Google Sitelinks')
})

test('Search Intent: Brand query "hatchpen" supports signature works', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')
  const res = await executeGlobalSearch({ query: 'hatchpen' })

  assert.ok(res, 'Search response must exist')
  assert.equal(res.type, 'stories')
  assert.ok(Array.isArray(res.stories), 'Must return stories')
})

test('Sitewide Link Equity: Footer.tsx distributes crawl equity to signature works and /hatchpen-hits', async () => {
  const fs = await import('node:fs')
  const footerContent = fs.readFileSync('src/components/Footer.tsx', 'utf-8')

  assert.ok(footerContent.includes('the-season-we-fell'), 'Footer must link The Season We Fell for Google crawl equity')
  assert.ok(footerContent.includes('pleasure-after-dark'), 'Footer must link Pleasure After Dark for Google crawl equity')
  assert.ok(footerContent.includes('apartment-407'), 'Footer must link Apartment 407 for Google crawl equity')
  assert.ok(footerContent.includes('/hatchpen-hits'), 'Footer must link /hatchpen-hits')
})
