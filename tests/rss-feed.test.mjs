import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateRssXml,
  generateStoryRssXml,
  formatRfc822Date,
  cdata,
} from '../src/server/rss.ts'
import rssHandler from '../src/server/rss-handler.ts'
import storyRssHandler from '../src/server/story-rss-handler.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function createMockSupabase(worksData = []) {
  return {
    from(table) {
      assert.equal(table, 'works')
      return {
        select() {
          return {
            eq(col1, val1) {
              return {
                eq(col2, val2) {
                  return {
                    eq(col3, val3) {
                      return {
                        order() {
                          return {
                            limit: async () => ({
                              data: worksData,
                              error: null,
                            }),
                          }
                        },
                      }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

// ---------------------------------------------------------------------------
// 1. RFC 822 Date Formatting Invariants
// ---------------------------------------------------------------------------

test('RSS 2.0 Invariant: formatRfc822Date formats valid dates to RFC 822 standard', () => {
  const timestamp = '2026-10-29T12:00:00.000Z'
  const formatted = formatRfc822Date(timestamp)
  assert.equal(formatted, 'Thu, 29 Oct 2026 12:00:00 GMT')

  // Date parsing roundtrip
  const parsed = new Date(formatted)
  assert.equal(parsed.getTime(), new Date(timestamp).getTime())

  // Fallback on null/undefined
  const fallback = formatRfc822Date(null)
  assert.ok(fallback.endsWith('GMT'))
})

test('RSS 2.0 Invariant: cdata wraps content safely and handles nested terminations', () => {
  assert.equal(cdata('Hello World'), '<![CDATA[Hello World]]>')
  // Safely escapes nested ]]> to prevent breaking XML
  assert.equal(
    cdata('Breaking ]]> block'),
    '<![CDATA[Breaking ]]]]><![CDATA[> block]]>'
  )
})

// ---------------------------------------------------------------------------
// 2. Channel Structure and XML Compliance
// ---------------------------------------------------------------------------

test('RSS 2.0 Generation: Produces standard RSS 2.0 XML with valid channel metadata', async () => {
  const mockWork = {
    id: 'work-1',
    slug: 'the-last-odyssey',
    title: 'The Last Odyssey',
    synopsis: 'A deep space journey across uncharted nebulae.',
    genre: 'Sci-Fi',
    category: 'Novels',
    cover: 'https://images.unsplash.com/sample-cover.jpg',
    created_at: '2026-10-20T10:00:00.000Z',
    published_at: '2026-10-25T14:30:00.000Z',
    updated_at: '2026-10-28T16:00:00.000Z',
    visibility: 'public',
    publication_status: 'published',
    is_indexable: true,
    profiles: { id: 'author-1', username: 'stargazer', display_name: 'Elena Rostova' },
  }

  const mockDb = createMockSupabase([mockWork])
  const xml = await generateRssXml({ supabaseClient: mockDb })

  // XML declaration & root
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert.ok(xml.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"'))
  assert.ok(xml.endsWith('</rss>'))

  // Channel tags
  assert.ok(xml.includes('<title>HatchPen — Writings. Beyond the Hype.</title>'))
  assert.ok(xml.includes('<link>https://hatchpen.com</link>'))
  assert.ok(xml.includes('<language>en</language>'))
  assert.ok(xml.includes('<atom:link href="https://hatchpen.com/rss.xml" rel="self" type="application/rss+xml" />'))
  assert.ok(xml.includes('<url>https://hatchpen.com/icon-512.png</url>'))

  // Item verification
  assert.ok(xml.includes('<item>'))
  assert.ok(xml.includes('<title><![CDATA[The Last Odyssey]]></title>'))
  assert.ok(xml.includes('<link>https://hatchpen.com/works/the-last-odyssey</link>'))
  assert.ok(xml.includes('<guid isPermaLink="true">https://hatchpen.com/works/the-last-odyssey</guid>'))
  assert.ok(xml.includes('<pubDate>Sun, 25 Oct 2026 14:30:00 GMT</pubDate>'))
  assert.ok(xml.includes('<author><![CDATA[Elena Rostova]]></author>'))
  assert.ok(xml.includes('<category><![CDATA[Sci-Fi]]></category>'))
  assert.ok(xml.includes('<description><![CDATA[A deep space journey across uncharted nebulae.]]></description>'))
  assert.ok(xml.includes('<enclosure url="https://images.unsplash.com/sample-cover.jpg" length="0" type="image/jpeg" />'))
})

// ---------------------------------------------------------------------------
// 3. Strict Exclusion of Draft / Private / Non-Indexable Stories
// ---------------------------------------------------------------------------

test('RSS 2.0 Invariant: Draft, unlisted, private, or non-indexable stories are excluded', async () => {
  const mixedWorks = [
    // 1. Valid public published work -> Included
    {
      id: 'pub-1',
      slug: 'valid-public-story',
      title: 'Valid Public Story',
      visibility: 'public',
      publication_status: 'published',
      is_indexable: true,
      published_at: '2026-10-25T14:30:00.000Z',
    },
    // 2. Draft publication status -> Excluded
    {
      id: 'draft-1',
      slug: 'draft-story',
      title: 'Draft Story',
      visibility: 'public',
      publication_status: 'draft',
      is_indexable: true,
    },
    // 3. Unlisted visibility -> Excluded
    {
      id: 'unlisted-1',
      slug: 'unlisted-story',
      title: 'Unlisted Story',
      visibility: 'unlisted',
      publication_status: 'published',
      is_indexable: true,
    },
    // 4. Private visibility -> Excluded
    {
      id: 'private-1',
      slug: 'private-story',
      title: 'Private Story',
      visibility: 'private',
      publication_status: 'published',
      is_indexable: true,
    },
    // 5. is_indexable: false -> Excluded
    {
      id: 'non-index-1',
      slug: 'non-index-story',
      title: 'Non Indexable Story',
      visibility: 'public',
      publication_status: 'published',
      is_indexable: false,
    },
  ]

  const mockDb = createMockSupabase(mixedWorks)
  const xml = await generateRssXml({ supabaseClient: mockDb })

  assert.ok(xml.includes('Valid Public Story'), 'Public published story must be in feed')
  assert.ok(!xml.includes('Draft Story'), 'Draft story must be strictly excluded')
  assert.ok(!xml.includes('Unlisted Story'), 'Unlisted story must be strictly excluded')
  assert.ok(!xml.includes('Private Story'), 'Private story must be strictly excluded')
  assert.ok(!xml.includes('Non Indexable Story'), 'Non-indexable story must be strictly excluded')
})

// ---------------------------------------------------------------------------
// 4. XML Character Escaping Invariance
// ---------------------------------------------------------------------------

test('RSS 2.0 Invariant: Special characters (&, <, >, quotes) do not corrupt XML format', async () => {
  const specialWork = {
    id: 'special-1',
    slug: 'fire-&-blood',
    title: 'Fire & Blood <Origins> "Chronicles"',
    synopsis: 'A story of swords, shields & daggers < 100 years old.',
    genre: 'Fantasy & Lore',
    visibility: 'public',
    publication_status: 'published',
    is_indexable: true,
    published_at: '2026-10-25T14:30:00.000Z',
    profiles: { id: 'auth-1', username: 'author', display_name: 'Jane & John Doe' },
  }

  const mockDb = createMockSupabase([specialWork])
  const xml = await generateRssXml({ supabaseClient: mockDb })

  // CDATA handles unescaped ampersands safely inside <title>, <description>, etc.
  assert.ok(xml.includes('<title><![CDATA[Fire & Blood <Origins> "Chronicles"]]></title>'))
  assert.ok(xml.includes('<category><![CDATA[Fantasy & Lore]]></category>'))
  assert.ok(xml.includes('<author><![CDATA[Jane & John Doe]]></author>'))

  // URLs outside CDATA are properly XML-escaped
  assert.ok(xml.includes('https://hatchpen.com/works/fire-&amp;-blood'))
})

// ---------------------------------------------------------------------------
// 5. Nitro Server Handler Contract
// ---------------------------------------------------------------------------

test('RSS 2.0 Handler: Returns status 200, XML content-type, and edge cache headers', async () => {
  const response = await rssHandler()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/xml; charset=utf-8')

  const cacheControl = response.headers.get('cache-control')
  assert.ok(cacheControl?.includes('public'))
  assert.ok(cacheControl?.includes('max-age=1800'))

  const text = await response.text()
  assert.ok(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert.ok(text.includes('<rss version="2.0"'))
})

// ---------------------------------------------------------------------------
// 6. Autodiscovery Meta Tag & Robots.txt Directives
// ---------------------------------------------------------------------------

test('RSS Autodiscovery: src/routes/__root.tsx defines application/rss+xml link tag', () => {
  const rootCode = fs.readFileSync(path.join(rootDir, 'src/routes/__root.tsx'), 'utf-8')
  assert.ok(rootCode.includes("rel: 'alternate'"), 'Root must define alternate link')
  assert.ok(rootCode.includes("type: 'application/rss+xml'"), 'Root must declare RSS mime type')
  assert.ok(rootCode.includes("href: 'https://hatchpen.com/rss.xml'"), 'Root must link to /rss.xml')
})

test('RSS Robots Invariant: public/robots.txt allows /rss.xml and /feed.xml', () => {
  const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf-8')
  assert.ok(robots.includes('Allow: /rss.xml'), 'robots.txt must allow /rss.xml')
  assert.ok(robots.includes('Allow: /feed.xml'), 'robots.txt must allow /feed.xml')
  assert.ok(robots.includes('Allow: /rss/'), 'robots.txt must allow /rss/')
})

test('RSS Route Invariant: vite.config.ts configures nitro routes for /rss.xml and /feed.xml', () => {
  const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf-8')
  assert.ok(viteConfig.includes("route: '/rss.xml'"), 'vite.config.ts must map /rss.xml')
  assert.ok(viteConfig.includes("route: '/feed.xml'"), 'vite.config.ts must map /feed.xml')
  assert.ok(viteConfig.includes("route: '/rss/:workId'"), 'vite.config.ts must map /rss/:workId')
  assert.ok(viteConfig.includes('./src/server/rss-handler.ts'), 'vite.config.ts must point to rss-handler')
  assert.ok(viteConfig.includes('./src/server/story-rss-handler.ts'), 'vite.config.ts must point to story-rss-handler')
})

// ---------------------------------------------------------------------------
// 7. Story-Specific Chapter RSS Feeds (/rss/:workId.xml)
// ---------------------------------------------------------------------------

test('Story RSS 2.0 Generation: Produces standard chapter RSS 2.0 with chapter items', async () => {
  const mockWork = {
    id: 'work-abc',
    slug: 'the-girl-who-saw',
    title: 'The Girl Who Saw',
    description: 'A psychological thriller mystery novel.',
    cover_image_path: 'https://images.unsplash.com/cover.jpg',
    visibility: 'public',
    publication_status: 'published',
    is_indexable: true,
    published_at: '2026-10-01T10:00:00.000Z',
    profiles: { id: 'author-123', username: 'mysterywriter', display_name: 'Arthur C. Finch' },
  }

  const mockChapters = [
    {
      id: 'chap-1',
      chapter_number: 1,
      title: 'The Awakening',
      excerpt: 'She woke up to the sound of breaking glass.',
      status: 'published',
      is_indexable: true,
      published_at: '2026-10-01T12:00:00.000Z',
    },
    {
      id: 'chap-2',
      chapter_number: 2,
      title: 'Shadows in the Mist',
      excerpt: 'Footsteps echoed through the damp alleyway.',
      status: 'published',
      is_indexable: true,
      published_at: '2026-10-05T15:30:00.000Z',
    },
  ]

  const xml = await generateStoryRssXml('the-girl-who-saw', {
    workData: mockWork,
    chaptersData: mockChapters,
  })

  assert.ok(xml, 'XML should be generated for valid story')
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert.ok(xml.includes('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"'))
  assert.ok(xml.endsWith('</rss>'))

  // Channel tags
  assert.ok(xml.includes('<title><![CDATA[The Girl Who Saw — Chapter Feed | HatchPen]]></title>'))
  assert.ok(xml.includes('<link>https://hatchpen.com/works/the-girl-who-saw</link>'))
  assert.ok(xml.includes('<atom:link href="https://hatchpen.com/rss/the-girl-who-saw.xml" rel="self" type="application/rss+xml" />'))
  assert.ok(xml.includes('<url>https://images.unsplash.com/cover.jpg</url>'))

  // Chapter 1 verification
  assert.ok(xml.includes('<title><![CDATA[Chapter 1: The Awakening]]></title>'))
  assert.ok(xml.includes('<link>https://hatchpen.com/read/the-girl-who-saw/chap-1</link>'))
  assert.ok(xml.includes('<guid isPermaLink="true">https://hatchpen.com/read/the-girl-who-saw/chap-1</guid>'))
  assert.ok(xml.includes('<author><![CDATA[Arthur C. Finch]]></author>'))
  assert.ok(xml.includes('<description><![CDATA[She woke up to the sound of breaking glass.]]></description>'))

  // Chapter 2 verification
  assert.ok(xml.includes('<title><![CDATA[Chapter 2: Shadows in the Mist]]></title>'))
  assert.ok(xml.includes('<link>https://hatchpen.com/read/the-girl-who-saw/chap-2</link>'))
})

test('Story RSS 2.0 Invariant: Returns null for draft, unlisted, or private stories', async () => {
  const draftWork = {
    id: 'work-draft',
    slug: 'draft-book',
    title: 'Draft Book',
    visibility: 'public',
    publication_status: 'draft',
    is_indexable: true,
  }

  const unlistedWork = {
    id: 'work-unlisted',
    slug: 'unlisted-book',
    title: 'Unlisted Book',
    visibility: 'unlisted',
    publication_status: 'published',
    is_indexable: true,
  }

  const nonIndexableWork = {
    id: 'work-non-index',
    slug: 'no-index-book',
    title: 'No Index Book',
    visibility: 'public',
    publication_status: 'published',
    is_indexable: false,
  }

  assert.equal(await generateStoryRssXml('draft-book', { workData: draftWork }), null)
  assert.equal(await generateStoryRssXml('unlisted-book', { workData: unlistedWork }), null)
  assert.equal(await generateStoryRssXml('no-index-book', { workData: nonIndexableWork }), null)
  assert.equal(await generateStoryRssXml(''), null)
})

test('Story RSS 2.0 Invariant: Excludes draft and non-indexable chapters', async () => {
  const mockWork = {
    id: 'work-mixed',
    slug: 'mixed-chapters',
    title: 'Mixed Story',
    visibility: 'public',
    publication_status: 'published',
    is_indexable: true,
  }

  const chapters = [
    {
      id: 'chap-published',
      chapter_number: 1,
      title: 'Published Chapter',
      status: 'published',
      is_indexable: true,
    },
    {
      id: 'chap-draft',
      chapter_number: 2,
      title: 'Secret Draft Chapter',
      status: 'draft',
      is_indexable: true,
    },
    {
      id: 'chap-hidden',
      chapter_number: 3,
      title: 'Hidden Chapter',
      status: 'published',
      is_indexable: false,
    },
  ]

  const xml = await generateStoryRssXml('mixed-chapters', {
    workData: mockWork,
    chaptersData: chapters,
  })

  assert.ok(xml.includes('Published Chapter'))
  assert.ok(!xml.includes('Secret Draft Chapter'))
  assert.ok(!xml.includes('Hidden Chapter'))
})

test('Story RSS 2.0 Handler: Returns 200 with XML content-type or 404 if not found', async () => {
  // Test 404 response for unknown story
  const notFoundEvent = {
    context: { params: { workId: 'unknown-story-slug.xml' } },
    node: { req: { url: '/rss/unknown-story-slug.xml' } },
  }
  const notFoundRes = await storyRssHandler(notFoundEvent)
  assert.equal(notFoundRes.status, 404)

  // Test 400 response for empty workId
  const emptyEvent = {
    context: { params: { workId: '' } },
    node: { req: { url: '/rss/' } },
  }
  const emptyRes = await storyRssHandler(emptyEvent)
  assert.equal(emptyRes.status, 400)
})

test('Story RSS Autodiscovery: works.$workId.tsx configures chapter feed alternate link', () => {
  const worksCode = fs.readFileSync(path.join(rootDir, 'src/routes/works.$workId.tsx'), 'utf-8')
  assert.ok(worksCode.includes("rel: 'alternate'"), 'works.$workId.tsx must configure alternate link')
  assert.ok(worksCode.includes("type: 'application/rss+xml'"), 'works.$workId.tsx must declare RSS mime type')
  assert.ok(worksCode.includes('/rss/${canonicalSlug}.xml'), 'works.$workId.tsx must link to canonical story RSS')
})
