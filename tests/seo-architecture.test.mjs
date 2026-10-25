import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateMeta,
  resolveAbsoluteUrl,
  DEFAULT_SITE_URL,
  DEFAULT_OG_IMAGE,
} from '../src/lib/seo.ts'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../src/lib/taxonomy.ts'
import {
  isSitemapEligibleWork,
  isSitemapEligibleChapter,
  escapeXml,
  formatLastmod,
  buildSitemapEntries,
  generateSitemapXml,
  CANONICAL_BASE_URL,
} from '../src/server/sitemap.ts'
import {
  executeGetCategoryPageData,
  executeGetGenrePageData,
} from '../src/server/works.ts'
import sitemapHandler from '../src/server/sitemap-handler.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Phase 2 Metadata Tests
// ---------------------------------------------------------------------------

test('SEO Architecture: generateMeta emits noindex, nofollow when noindex is true', () => {
  const meta = generateMeta({
    title: 'Private Folio',
    noindex: true,
  })

  const robots = meta.meta.find((m) => m.name === 'robots')
  assert.ok(robots, 'Robots meta tag must exist')
  assert.equal(robots.content, 'noindex, nofollow')
})

test('SEO Architecture: generateMeta emits index, follow when noindex is false or undefined', () => {
  const meta = generateMeta({
    title: 'Public Catalog',
  })

  const robots = meta.meta.find((m) => m.name === 'robots')
  assert.ok(robots)
  assert.equal(robots.content, 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
})

test('SEO Architecture: Canonical URL is emitted cleanly with canonical link tag and og:url', () => {
  const meta = generateMeta({
    title: 'Discover Works',
    canonicalUrl: 'https://hatchpen.com/discover',
  })

  const link = meta.links.find((l) => l.rel === 'canonical')
  assert.ok(link, 'Canonical link tag must exist')
  assert.equal(link.href, 'https://hatchpen.com/discover')

  const ogUrl = meta.meta.find((m) => m.property === 'og:url')
  assert.ok(ogUrl, 'og:url tag must exist')
  assert.equal(ogUrl.content, 'https://hatchpen.com/discover')
})

test('SEO Architecture: resolveAbsoluteUrl converts relative paths to absolute canonical URLs', () => {
  assert.equal(resolveAbsoluteUrl(''), 'https://hatchpen.com/og-image.png')
  assert.equal(resolveAbsoluteUrl(null), 'https://hatchpen.com/og-image.png')
  assert.equal(resolveAbsoluteUrl('/og-image.png'), 'https://hatchpen.com/og-image.png')
  assert.equal(resolveAbsoluteUrl('cover.jpg'), 'https://hatchpen.com/cover.jpg')
  assert.equal(
    resolveAbsoluteUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg'),
    'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  )
})

test('SEO Architecture: generateMeta always emits absolute og:image and twitter:image URLs', () => {
  const defaultMeta = generateMeta({ title: 'Default Cover' })
  const ogImg1 = defaultMeta.meta.find((m) => m.property === 'og:image')
  const twImg1 = defaultMeta.meta.find((m) => m.name === 'twitter:image')
  assert.equal(ogImg1?.content, 'https://hatchpen.com/og-image.png')
  assert.equal(twImg1?.content, 'https://hatchpen.com/og-image.png')

  const customRelativeMeta = generateMeta({
    title: 'Custom Relative Cover',
    ogImage: '/covers/story-1.webp',
  })
  const ogImg2 = customRelativeMeta.meta.find((m) => m.property === 'og:image')
  const twImg2 = customRelativeMeta.meta.find((m) => m.name === 'twitter:image')
  assert.equal(ogImg2?.content, 'https://hatchpen.com/covers/story-1.webp')
  assert.equal(twImg2?.content, 'https://hatchpen.com/covers/story-1.webp')

  // Confirm default og-image file physically exists in public directory
  const ogFile = path.join(rootDir, 'public', 'og-image.png')
  assert.ok(fs.existsSync(ogFile), 'public/og-image.png must exist on disk')
  assert.ok(fs.statSync(ogFile).size > 1000, 'public/og-image.png must not be empty')
})

test('SEO Route Audit: src/routes/settings.tsx defines head metadata with noindex', () => {
  const settingsCode = fs.readFileSync(path.join(rootDir, 'src/routes/settings.tsx'), 'utf-8')
  assert.ok(settingsCode.includes("title: 'Account Settings'"), 'settings route must define title')
  assert.ok(settingsCode.includes('noindex: true'), 'settings route must define noindex: true')
})

test('SEO Route Audit: src/routes/read.$workId.$chapterId.tsx sets mainEntityOfPage to canonicalUrl', () => {
  const readerCode = fs.readFileSync(
    path.join(rootDir, 'src/routes/read.$workId.$chapterId.tsx'),
    'utf-8'
  )
  assert.ok(
    readerCode.includes('mainEntityOfPage: canonicalUrl'),
    'reader JSON-LD mainEntityOfPage must strictly match canonicalUrl'
  )
})

// ---------------------------------------------------------------------------
// Phase 1 Sitemap Invariant & Function Tests
// ---------------------------------------------------------------------------

test('Sitemap Invariant: isSitemapEligibleWork strictly requires public visibility, published status, and is_indexable', () => {
  assert.equal(
    isSitemapEligibleWork({ visibility: 'public', publication_status: 'published', is_indexable: true }),
    true
  )
  // Unlisted work
  assert.equal(
    isSitemapEligibleWork({ visibility: 'unlisted', publication_status: 'published', is_indexable: true }),
    false
  )
  // Private work
  assert.equal(
    isSitemapEligibleWork({ visibility: 'private', publication_status: 'published', is_indexable: true }),
    false
  )
  // Draft publication status
  assert.equal(
    isSitemapEligibleWork({ visibility: 'public', publication_status: 'draft', is_indexable: true }),
    false
  )
  // Archived publication status
  assert.equal(
    isSitemapEligibleWork({ visibility: 'public', publication_status: 'archived', is_indexable: true }),
    false
  )
  // Explicitly marked non-indexable
  assert.equal(
    isSitemapEligibleWork({ visibility: 'public', publication_status: 'published', is_indexable: false }),
    false
  )
  // Permissive undefined is_indexable is strictly rejected (must be explicitly true)
  assert.equal(
    isSitemapEligibleWork({ visibility: 'public', publication_status: 'published' }),
    false,
    'Undefined is_indexable must NOT be accepted under strict indexability policy'
  )
  // Capitalized and camelCase UI models (e.g. from executeGetPlatformWorks)
  assert.equal(
    isSitemapEligibleWork({ visibility: 'Public', publicationStatus: 'published', isIndexable: true }),
    true,
    'Capitalized visibility and camelCase publicationStatus/isIndexable must be accepted'
  )
})

test('Sitemap Invariant: isSitemapEligibleChapter strictly requires eligible parent work, published status, and is_indexable', () => {
  const eligibleWork = { visibility: 'public', publication_status: 'published', is_indexable: true }
  const unlistedWork = { visibility: 'unlisted', publication_status: 'published', is_indexable: true }

  // Published chapter of eligible work -> eligible
  assert.equal(
    isSitemapEligibleChapter({ status: 'published', is_indexable: true }, eligibleWork),
    true
  )
  // Draft chapter of eligible work -> excluded
  assert.equal(
    isSitemapEligibleChapter({ status: 'draft', is_indexable: true }, eligibleWork),
    false
  )
  // Archived chapter of eligible work -> excluded
  assert.equal(
    isSitemapEligibleChapter({ status: 'archived', is_indexable: true }, eligibleWork),
    false
  )
  // Published chapter with is_indexable = false -> excluded
  assert.equal(
    isSitemapEligibleChapter({ status: 'published', is_indexable: false }, eligibleWork),
    false
  )
  // Published chapter with undefined is_indexable -> strictly rejected
  assert.equal(
    isSitemapEligibleChapter({ status: 'published' }, eligibleWork),
    false,
    'Undefined chapter is_indexable must NOT be accepted'
  )
  // Published chapter of an UNLISTED parent work -> strictly excluded
  assert.equal(
    isSitemapEligibleChapter({ status: 'published', is_indexable: true }, unlistedWork),
    false
  )
  // CamelCase and capitalized status support
  assert.equal(
    isSitemapEligibleChapter({ status: 'Published', isIndexable: true }, eligibleWork),
    true
  )

  // Act hierarchy checks:
  const publishedActIds = new Set(['act-pub-1'])
  // 1. Chapter in published act -> eligible
  assert.equal(
    isSitemapEligibleChapter(
      { status: 'published', is_indexable: true, act_id: 'act-pub-1' },
      eligibleWork,
      publishedActIds
    ),
    true
  )
  // 2. Chapter in draft act -> strictly excluded
  assert.equal(
    isSitemapEligibleChapter(
      { status: 'published', is_indexable: true, act_id: 'act-draft-99' },
      eligibleWork,
      publishedActIds
    ),
    false,
    'Chapter in unpublished act must NOT be sitemap eligible'
  )
  // 3. Chapter with null act_id (standalone unassigned chapter) -> eligible
  assert.equal(
    isSitemapEligibleChapter(
      { status: 'published', is_indexable: true, act_id: null },
      eligibleWork,
      publishedActIds
    ),
    true,
    'Standalone chapter with null act_id must be eligible'
  )
  // 4. Chapter with embedded draft act -> excluded
  assert.equal(
    isSitemapEligibleChapter(
      { status: 'published', is_indexable: true, act: { status: 'draft' } },
      eligibleWork
    ),
    false,
    'Chapter with embedded draft act must be excluded'
  )
})

test('Sitemap Escaping & Formatting: escapeXml and formatLastmod behave deterministically', () => {
  assert.equal(escapeXml('A & B < C > "quoted" \'single\''), 'A &amp; B &lt; C &gt; &quot;quoted&quot; &apos;single&apos;')
  assert.equal(formatLastmod('2026-10-25T14:30:00.000Z'), '2026-10-25')
  assert.equal(formatLastmod('invalid-date'), undefined)
  assert.equal(formatLastmod(null), undefined)
})

test('Taxonomy Coverage: All 16 canonical categories must have canonical slugs for SEO indexing', () => {
  assert.equal(GLOBAL_CATEGORIES.length, 16, 'Exactly 16 canonical categories must be defined')
  for (const cat of GLOBAL_CATEGORIES) {
    assert.ok(cat.slug, `Category ${cat.name} must have a valid slug`)
    assert.match(cat.slug, /^[a-z0-9-]+$/, `Slug ${cat.slug} must be URL-safe kebab-case`)
  }
})

test('Taxonomy Coverage: All 33 canonical genres must have canonical slugs for SEO indexing', () => {
  assert.equal(GLOBAL_GENRES.length, 33, 'Exactly 33 canonical genres must be defined in taxonomy')
  for (const genre of GLOBAL_GENRES) {
    assert.ok(genre.slug, `Genre ${genre.name} must have a valid slug`)
    assert.match(genre.slug, /^[a-z0-9-]+$/, `Slug ${genre.slug} must be URL-safe kebab-case`)
  }
})

test('Sitemap Generation: generateSitemapXml produces valid XML conforming to Sitemap 0.9 protocol', async () => {
  // Test with mock Supabase client providing 1 public work and 1 unlisted work
  const mockClient = {
    from: (table) => {
      if (table === 'works') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'w-pub-1',
                        slug: 'chronicles-of-elysium',
                        title: 'Chronicles of Elysium',
                        updated_at: '2026-10-25T10:00:00Z',
                        published_at: '2026-10-20T10:00:00Z',
                        visibility: 'public',
                        publication_status: 'published',
                        is_indexable: true,
                        profiles: { id: 'auth-real-1', username: 'lyra_valen' },
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'acts') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                { id: 'act-pub-1', work_id: 'w-pub-1', status: 'published' },
              ],
              error: null,
            }),
          }),
        }
      }
      if (table === 'chapters') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: 'ch-real-1',
                      work_id: 'w-pub-1',
                      act_id: 'act-pub-1',
                      title: 'Chapter 1: The Awakening',
                      status: 'published',
                      is_indexable: true,
                      updated_at: '2026-10-22T08:00:00Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    },
  }

  const xml = await generateSitemapXml({ supabaseClient: mockClient })

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'))
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'))
  assert.ok(xml.endsWith('</urlset>\n'))

  // Core URLs
  assert.ok(xml.includes('<loc>https://hatchpen.com/</loc>'))
  assert.ok(xml.includes('<loc>https://hatchpen.com/discover</loc>'))

  // Categories
  for (const cat of GLOBAL_CATEGORIES) {
    assert.ok(xml.includes(`<loc>https://hatchpen.com/category/${cat.slug}</loc>`))
  }

  // Genres
  for (const genre of GLOBAL_GENRES) {
    assert.ok(xml.includes(`<loc>https://hatchpen.com/genre/${genre.slug}</loc>`))
  }

  // Live Work, Author, and Chapter
  assert.ok(xml.includes('<loc>https://hatchpen.com/works/chronicles-of-elysium</loc>'))
  assert.ok(xml.includes('<loc>https://hatchpen.com/author/lyra_valen</loc>'))
  assert.ok(xml.includes('<loc>https://hatchpen.com/read/chronicles-of-elysium/ch-real-1</loc>'))
})

test('Dynamic Sitemap Server Handler: responds with 200, XML content-type, edge cache headers, and canonical items', async () => {
  const res = await sitemapHandler()
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('content-type'), 'application/xml; charset=utf-8')
  assert.equal(
    res.headers.get('cache-control'),
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  )

  const sitemapXml = await res.text()

  // Zero mock items
  assert.ok(!sitemapXml.includes('/works/the-cartographer-of-lost-ships'), 'Mock work must not be in sitemap')
  assert.ok(!sitemapXml.includes('/works/a-winter-in-kyoto'), 'Mock work must not be in sitemap')
  assert.ok(!sitemapXml.includes('/works/the-bureaucracy-of-miracles'), 'Mock work must not be in sitemap')
  assert.ok(!sitemapXml.includes('/author/auth-1'), 'Mock author auth-1 must not be in sitemap')
  assert.ok(!sitemapXml.includes('/author/auth-2'), 'Mock author auth-2 must not be in sitemap')
  assert.ok(!sitemapXml.includes('ch-101'), 'Mock chapter ch-101 must not be in sitemap')

  // All 16 canonical categories present
  for (const cat of GLOBAL_CATEGORIES) {
    assert.ok(
      sitemapXml.includes(`<loc>https://hatchpen.com/category/${cat.slug}</loc>`),
      `Category ${cat.slug} must be in sitemap`
    )
  }

  // All 33 canonical genres present
  for (const genre of GLOBAL_GENRES) {
    assert.ok(
      sitemapXml.includes(`<loc>https://hatchpen.com/genre/${genre.slug}</loc>`),
      `Genre ${genre.slug} must be in sitemap`
    )
  }

  // Check URL uniqueness
  const locMatches = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  assert.ok(locMatches.length > 50, 'Sitemap must contain > 50 URLs')
  const uniqueUrls = new Set(locMatches)
  assert.equal(uniqueUrls.size, locMatches.length, 'Every URL in sitemap must be unique (no duplicates)')

  // Check canonical host
  for (const u of locMatches) {
    assert.ok(u.startsWith('https://hatchpen.com/'), `URL ${u} must start with canonical host https://hatchpen.com/`)
  }

  // Verify public/sitemap.xml does NOT exist so Vercel handle: filesystem does not shadow dynamic handler
  const staticSitemap = path.join(rootDir, 'public', 'sitemap.xml')
  assert.equal(
    fs.existsSync(staticSitemap),
    false,
    'public/sitemap.xml must be omitted so Vercel routes /sitemap.xml to the dynamic serverless handler'
  )
})

// ---------------------------------------------------------------------------
// Phase 3 Category & Genre SSR & SEO Tests
// ---------------------------------------------------------------------------

test('Phase 3 Category SSR: executeGetCategoryPageData resolves canonical category and filters works', async () => {
  const mockWorks = [
    {
      id: 'w-novels-1',
      title: 'A Tale of Two Realms',
      slug: 'a-tale-of-two-realms',
      category: 'Novels',
      categorySlug: 'novels',
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-novels-draft',
      title: 'Secret Draft Novel',
      slug: 'secret-draft-novel',
      category: 'Novels',
      categorySlug: 'novels',
      visibility: 'Draft',
      publicationStatus: 'draft',
      isIndexable: true,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-novels-unlisted',
      title: 'Unlisted Novel',
      slug: 'unlisted-novel',
      category: 'Novels',
      categorySlug: 'novels',
      visibility: 'Unlisted',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-novels-noindex',
      title: 'Noindex Novel',
      slug: 'noindex-novel',
      category: 'Novels',
      categorySlug: 'novels',
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: false,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-poetry-1',
      title: 'Autumn Sonnets',
      slug: 'autumn-sonnets',
      category: 'Poetry',
      categorySlug: 'poetry',
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a2', name: 'Author Two' },
    },
  ]

  const dependencies = {
    queryRows: async () => mockWorks.map((w) => ({
      id: w.id,
      title: w.title,
      slug: w.slug,
      category_name: w.category,
      category_slug: w.categorySlug,
      visibility: w.visibility === 'Public' ? 'public' : 'unlisted',
      publication_status: w.publicationStatus,
      is_indexable: w.isIndexable,
      author_id: w.author.id,
      author_name: w.author.name,
      genres: [],
      chapters: [],
    })),
  }

  const result = await executeGetCategoryPageData('novels', dependencies)
  assert.equal(result.isNotFound, false)
  assert.ok(result.category)
  assert.equal(result.category.slug, 'novels')
  assert.equal(result.category.name, 'Novels')

  // Only the public, published, indexable novel should appear
  assert.equal(result.works.length, 1)
  assert.equal(result.works[0].id, 'w-novels-1')
})

test('Phase 3 Category SSR: executeGetCategoryPageData returns isNotFound: true for invalid slug', async () => {
  const result1 = await executeGetCategoryPageData('not-a-real-category-xyz')
  assert.equal(result1.isNotFound, true)
  assert.equal(result1.category, null)
  assert.equal(result1.works.length, 0)

  const result2 = await executeGetCategoryPageData('')
  assert.equal(result2.isNotFound, true)

  const result3 = await executeGetCategoryPageData(null)
  assert.equal(result3.isNotFound, true)
})

test('Phase 3 Genre SSR: executeGetGenrePageData resolves canonical genre and filters works', async () => {
  const mockWorks = [
    {
      id: 'w-cyber-1',
      title: 'Neon Shadows',
      slug: 'neon-shadows',
      genre: 'Cyberpunk',
      genreSlug: 'cyberpunk',
      genres: [{ id: 'g1', name: 'Cyberpunk', slug: 'cyberpunk' }],
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-cyber-unlisted',
      title: 'Hidden Cyberpunk',
      slug: 'hidden-cyberpunk',
      genre: 'Cyberpunk',
      genreSlug: 'cyberpunk',
      genres: [{ id: 'g1', name: 'Cyberpunk', slug: 'cyberpunk' }],
      visibility: 'Unlisted',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-cyber-noindex',
      title: 'Non-Indexable Cyberpunk',
      slug: 'non-indexable-cyberpunk',
      genre: 'Cyberpunk',
      genreSlug: 'cyberpunk',
      genres: [{ id: 'g1', name: 'Cyberpunk', slug: 'cyberpunk' }],
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: false,
      author: { id: 'a1', name: 'Author One' },
    },
    {
      id: 'w-fantasy-1',
      title: 'The Dragon Queen',
      slug: 'the-dragon-queen',
      genre: 'Fantasy',
      genreSlug: 'fantasy',
      genres: [
        { id: 'g2', name: 'Fantasy', slug: 'fantasy' },
        { id: 'g1', name: 'Cyberpunk', slug: 'cyberpunk' }, // secondary genre
      ],
      visibility: 'Public',
      publicationStatus: 'published',
      isIndexable: true,
      author: { id: 'a2', name: 'Author Two' },
    },
  ]

  const dependencies = {
    queryRows: async () => mockWorks.map((w) => ({
      id: w.id,
      title: w.title,
      slug: w.slug,
      category_name: 'Novels',
      category_slug: 'novels',
      visibility: w.visibility === 'Public' ? 'public' : 'unlisted',
      publication_status: w.publicationStatus,
      is_indexable: w.isIndexable,
      author_id: w.author.id,
      author_name: w.author.name,
      genres: w.genres,
      chapters: [],
    })),
  }

  const result = await executeGetGenrePageData('cyberpunk', dependencies)
  assert.equal(result.isNotFound, false)
  assert.ok(result.genre)
  assert.equal(result.genre.slug, 'cyberpunk')
  assert.equal(result.genre.name, 'Cyberpunk')

  // Both primary and secondary cyberpunk matches should be returned if public & indexable
  const matchedIds = result.works.map((w) => w.id).sort()
  assert.deepEqual(matchedIds, ['w-cyber-1', 'w-fantasy-1'])
})

test('Phase 3 Genre SSR: executeGetGenrePageData returns isNotFound: true for invalid slug', async () => {
  const result1 = await executeGetGenrePageData('bogus-genre-xyz')
  assert.equal(result1.isNotFound, true)
  assert.equal(result1.genre, null)
  assert.equal(result1.works.length, 0)

  const result2 = await executeGetGenrePageData('   ')
  assert.equal(result2.isNotFound, true)
})

test('Phase 3 Route Contract: category and genre routes define loaders, canonical URLs, and valid JSON-LD', () => {
  const catCode = fs.readFileSync(path.join(rootDir, 'src/routes/category.$slug.tsx'), 'utf-8')
  const genreCode = fs.readFileSync(path.join(rootDir, 'src/routes/genre.$slug.tsx'), 'utf-8')

  // Check loaders
  assert.ok(catCode.includes('getCategoryPageDataServerFn'), 'Category route must use getCategoryPageDataServerFn in loader')
  assert.ok(genreCode.includes('getGenrePageDataServerFn'), 'Genre route must use getGenrePageDataServerFn in loader')

  // Check structured data
  assert.ok(catCode.includes("'@type': 'BreadcrumbList'"), 'Category must emit BreadcrumbList')
  assert.ok(catCode.includes("'@type': 'CollectionPage'"), 'Category must emit CollectionPage')
  assert.ok(catCode.includes('https://hatchpen.com/category/'), 'Category must emit canonical URL')

  assert.ok(genreCode.includes("'@type': 'BreadcrumbList'"), 'Genre must emit BreadcrumbList')
  assert.ok(genreCode.includes("'@type': 'CollectionPage'"), 'Genre must emit CollectionPage')
  assert.ok(genreCode.includes('https://hatchpen.com/genre/'), 'Genre must emit canonical URL')

  // Check 404 / noindex behavior
  assert.ok(catCode.includes("title: 'Category Not Found'"), 'Category route must handle not found')
  assert.ok(catCode.includes('noindex: true'), 'Category route must emit noindex on not found')
  assert.ok(genreCode.includes("title: 'Genre Not Found'"), 'Genre route must handle not found')
  assert.ok(genreCode.includes('noindex: true'), 'Genre route must emit noindex on not found')
})

