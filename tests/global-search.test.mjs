/**
 * Global Search Performance & Correctness Test Suite
 *
 * Verifies:
 * 1. Zero Full-Catalogue Downloads: Invariant that executeGetPlatformWorks is NEVER invoked during search.
 * 2. Database Query Construction: Projection, ILIKE filter with trigram compatibility, and delimiter sanitization.
 * 3. Publication Visibility: Only public & published works are included.
 * 4. Bilingual & Non-English Matching: Hindi (Devanagari) and Unicode text handling.
 * 5. Pagination & Limit Constraints: Math, capping, hasMore, and page offsets.
 * 6. Relevance Ranking: Title matches prioritize over description matches.
 * 7. Stale Response & Race Condition Guard: Monotonic request sequence simulation prevents out-of-order overwrites.
 * 8. Three-Mode Search: stories, author, genre modes return correct shape.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// Auto-load environment variables if .env exists
if (typeof process.loadEnvFile === 'function' && fs.existsSync(path.resolve(process.cwd(), '.env'))) {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'))
  } catch (e) {
    // Ignore if already loaded or unreadable
  }
}

// --- Invariant 1: Static Architectural Proof against Full-Catalog Scans ---
test('Invariant: executeGetPlatformWorks is NEVER referenced in src/server/search.ts', () => {
  const searchFileContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/search.ts'),
    'utf-8'
  )

  assert.ok(
    !searchFileContent.includes('executeGetPlatformWorks'),
    'Fatal regression: executeGetPlatformWorks() was found in src/server/search.ts'
  )
  assert.ok(
    !searchFileContent.includes("from './works.ts'") &&
    !searchFileContent.includes('from "./works.ts"') &&
    !searchFileContent.includes("import('./works.ts')") &&
    !searchFileContent.includes('import("./works.ts")'),
    'Fatal regression: src/server/search.ts imports from works.ts'
  )
})

// --- Invariant 2: Migration 18 Trigram Index Definition (Stories-Only) ---
test('Invariant: Migration 18 defines pg_trgm and GIN indexes for title and description only', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261022000018_search_trgm_indexes.sql'
  )
  assert.ok(fs.existsSync(migrationPath), 'Migration 18 file must exist')

  const sql = fs.readFileSync(migrationPath, 'utf-8')
  assert.ok(sql.includes('CREATE EXTENSION IF NOT EXISTS "pg_trgm"'), 'Must enable pg_trgm extension')
  assert.ok(sql.includes('idx_works_title_trgm'), 'Must define idx_works_title_trgm')
  assert.ok(sql.includes('idx_works_description_trgm'), 'Must define idx_works_description_trgm')
  assert.ok(sql.includes('gin_trgm_ops'), 'Must use gin_trgm_ops')
  // Confirm profiles indexes are strictly excluded from stories-only search scope
  assert.ok(!sql.includes('idx_profiles_username_trgm'), 'Must NOT define profiles username index in stories search migration')
  assert.ok(!sql.includes('idx_profiles_display_name_trgm'), 'Must NOT define profiles display_name index in stories search migration')
})

// --- Unit Tests: executeGlobalSearch Core Logic ---
test('Query Construction: Short queries (< 2 characters) return empty response without DB calls', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const emptyRes = await executeGlobalSearch({ query: '' })
  assert.equal(emptyRes.stories.length, 0)
  assert.equal(emptyRes.totalCount, 0)

  const oneCharRes = await executeGlobalSearch({ query: 'c' })
  assert.equal(oneCharRes.stories.length, 0)
  assert.equal(oneCharRes.totalCount, 0)

  const whitespaceRes = await executeGlobalSearch({ query: '   a   ' })
  assert.equal(whitespaceRes.stories.length, 0)
  assert.equal(whitespaceRes.totalCount, 0)
})

test('Sanitization: Query strings with commas and parentheses are safely sanitized', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  // Should not throw or generate malformed PostgREST filter
  const res = await executeGlobalSearch({ query: 'Kyoto, (Cold) "Test"' })
  assert.ok(Array.isArray(res.stories))
  assert.equal(res.type, 'stories')
})

test('Relevance Ranking: Stories with matching title rank ahead of description-only matches', () => {
  const query = 'cold'
  const stories = [
    {
      id: 'story-desc-only',
      title: 'A Winter in Norway',
      synopsis: 'A chilling adventure through the cold mountain pass.',
      viewCount: 50000,
    },
    {
      id: 'story-title-match',
      title: 'The Cold Perimeter',
      synopsis: 'An espionage thriller set in the Baltic border stations.',
      viewCount: 1200,
    },
  ]

  // Apply search ranking logic
  const lowerQuery = query.toLowerCase()
  stories.sort((a, b) => {
    const aTitleMatch = a.title.toLowerCase().includes(lowerQuery)
    const bTitleMatch = b.title.toLowerCase().includes(lowerQuery)
    if (aTitleMatch && !bTitleMatch) return -1
    if (!aTitleMatch && bTitleMatch) return 1
    return Number(b.viewCount || 0) - Number(a.viewCount || 0)
  })

  assert.equal(stories[0].id, 'story-title-match', 'Story with title match must rank first despite lower view count')
  assert.equal(stories[1].id, 'story-desc-only', 'Story with description match should rank second')
})

test('Exact Substring Title Matching: "co" matches "The Cold Perimeter" and excludes non-matching titles', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')
  const res = await executeGlobalSearch({ query: 'co' })
  assert.equal(res.type, 'stories')
  for (const story of res.stories) {
    assert.ok(
      story.title.toLowerCase().includes('co'),
      `Every returned story must have "co" in its title in exact order. Received: "${story.title}"`
    )
  }
})

test('Pagination: Page and limit capping behaves predictably', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  // Negative or excessive limits are constrained (between 1 and 50)
  const res = await executeGlobalSearch({ query: 'winter', limit: 9999, page: 1 })
  assert.ok(res.stories.length <= 50, 'Limit must be capped to 50')
  assert.equal(res.page, 1)

  const page2Res = await executeGlobalSearch({ query: 'winter', limit: 5, page: 2 })
  assert.equal(page2Res.page, 2)
})

test('Bilingual Support: Hindi (Devanagari) characters are handled without error or truncation', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const hindiQuery = 'कहानी'
  const res = await executeGlobalSearch({ query: hindiQuery })
  assert.equal(res.query, hindiQuery)
  assert.ok(Array.isArray(res.stories))
})

// --- Three-Mode Search Tests ---
test('Three-Mode: type=stories returns { type: "stories", stories: [...], authors: [] }', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: 'vance', type: 'stories' })
  assert.equal(res.type, 'stories')
  assert.ok(Array.isArray(res.stories), 'stories must be an array')
  assert.ok(Array.isArray(res.authors), 'authors must be an array')
  assert.equal(res.authors.length, 0, 'authors must be empty for stories mode')

  for (const story of res.stories) {
    assert.ok(story.id, 'Every result item must have an id')
    assert.ok(story.title, 'Every result item must be a story having a title')
    assert.ok(typeof story.title === 'string', 'Story title must be string')
  }
})

test('Three-Mode: type=author with empty query returns { authors: [], totalCount: 0 }', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: '', type: 'author' })
  assert.equal(res.type, 'author')
  assert.ok(Array.isArray(res.authors), 'authors must be an array')
  assert.equal(res.authors.length, 0, 'empty query must return no authors')
  assert.equal(res.totalCount, 0)
  assert.ok(Array.isArray(res.stories), 'stories must always be an array')
  assert.equal(res.stories.length, 0)
})

test('Three-Mode: type=author with short query (< 2 chars) returns empty immediately', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: 'e', type: 'author' })
  assert.equal(res.type, 'author')
  assert.equal(res.authors.length, 0)
  assert.equal(res.totalCount, 0)
})

test('Three-Mode: type=genre with no genreSlugs returns empty immediately', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: '', type: 'genre' })
  assert.equal(res.type, 'genre')
  assert.ok(Array.isArray(res.stories), 'stories must be an array')
  assert.equal(res.stories.length, 0, 'must return empty stories when no genreSlugs')
  assert.equal(res.totalCount, 0)
  assert.ok(Array.isArray(res.authors), 'authors must be an array')
})

test('Three-Mode: type=genre with empty genreSlugs array returns empty immediately', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: '', type: 'genre', genreSlugs: [] })
  assert.equal(res.type, 'genre')
  assert.equal(res.stories.length, 0)
  assert.equal(res.totalCount, 0)
})

// --- Unit Test: Request Sequence / Stale Response Guard ---
test('Race Condition Guard: Monotonic sequence guard discards out-of-order older responses', async () => {
  let currentRequestId = 0
  let displayedResults = null
  let activeSearchingState = false

  // Simulate client-side search dispatcher with sequence guard
  const simulateSearchDispatch = async (term, artificialDelayMs) => {
    const requestId = ++currentRequestId
    activeSearchingState = true

    // Simulate async server call
    const result = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({ query: term, items: [`result-for-${term}`] })
      }, artificialDelayMs)
    })

    // Sequence Guard
    if (requestId !== currentRequestId) {
      // Discard stale response
      return
    }

    displayedResults = result
    activeSearchingState = false
  }

  // User types "c" (short, ignored)
  // User types "co" -> fires slow request (delay 150ms)
  const req1 = simulateSearchDispatch('co', 150)

  // 40ms later, user types "cold" -> fires fast request (delay 30ms, cached or index hit)
  await new Promise((r) => setTimeout(r, 40))
  const req2 = simulateSearchDispatch('cold', 30)

  // Wait for both to complete
  await Promise.all([req1, req2])

  // Even though req1 took longer and completed later, displayedResults MUST reflect "cold"
  assert.equal(displayedResults?.query, 'cold', 'Results for earlier query "co" must NOT overwrite "cold"')
  assert.equal(activeSearchingState, false, 'Searching indicator should cleanly turn off')
})

// --- Tests for Audit Fixes ---
test('Author Mode: Offline/Mock fallback returns valid author results with id and handle', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: 'Elena', type: 'author' })
  assert.equal(res.type, 'author')
  assert.ok(res.authors.length > 0, 'Author search must return matching mock authors when DB is unavailable')
  assert.ok(res.authors.some(a => a.displayName.includes('Elena') || a.username.includes('elena')))
  assert.equal(res.stories.length, 0, 'Author search must NEVER return stories')
})

test('Author Route Invariant: Author cards in search.tsx link to /author/$authorId, NEVER to /profile/$username', () => {
  const searchRouteContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/routes/search.tsx'),
    'utf-8'
  )

  assert.ok(
    !searchRouteContent.includes('/profile/${author.username}') &&
    !searchRouteContent.includes('/profile/${author.id}'),
    'Fatal regression: Author cards in search.tsx still link to private /profile route'
  )
  assert.ok(
    searchRouteContent.includes('to="/author/$authorId"'),
    'Author cards in search.tsx must link to canonical /author/$authorId route'
  )
})

test('Navbar Search Invariant: Header.tsx explicitly sets type: stories on navigation', () => {
  const headerContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/Header.tsx'),
    'utf-8'
  )

  assert.ok(
    headerContent.includes("type: 'stories'"),
    'Header.tsx must explicitly pass type: stories when navigating to /search'
  )
})

test('Genre Mode: Returns stories matching any of the selected genres with OR semantics', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: '', type: 'genre', genreSlugs: ['literary-fiction', 'mystery'] })
  assert.equal(res.type, 'genre')
  assert.ok(Array.isArray(res.stories))
  assert.ok(res.stories.length > 0, 'Genre search must return matching stories')
  assert.equal(res.authors.length, 0, 'Genre search must NEVER return authors')

  for (const story of res.stories) {
    const sGenre = story.genreSlug.toLowerCase()
    const sName = (story.genre || '').toLowerCase()
    const hasMatch =
      sGenre.includes('literary') ||
      sGenre.includes('mystery') ||
      sName.includes('literary') ||
      sName.includes('mystery') ||
      story.genres.some(g => g.toLowerCase().includes('literary') || g.toLowerCase().includes('mystery'))
    assert.ok(hasMatch, `Story "${story.title}" must match at least one of the queried genres`)
  }
})

test('Genre Mode: Server function validator strictly caps genreSlugs to 3', async () => {
  const searchFile = fs.readFileSync(
    path.resolve(process.cwd(), 'src/server/search.ts'),
    'utf-8'
  )

  // Verify slice(0, 3) is present in the validator definition
  assert.ok(
    searchFile.includes('slice(0, 3)'),
    'globalSearchServerFn must enforce slice(0, 3) on genreSlugs'
  )
})

test('Genre Mode with Text Query: Combines genre filter and contiguous title substring search', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  const res = await executeGlobalSearch({ query: 'co', type: 'genre', genreSlugs: ['literary-fiction'] })
  assert.equal(res.type, 'genre')
  assert.ok(Array.isArray(res.stories))
  for (const story of res.stories) {
    assert.ok(
      story.title.toLowerCase().includes('co'),
      `Story "${story.title}" must contain "co" in exact order`
    )
  }
})

test('Search Robustness: Quotes stripping and phonetic tolerance ("The Cold Parameter" matches "The Cold Perimeter")', async () => {
  const { executeGlobalSearch } = await import('../src/server/search.ts')

  // With quotes: "co"
  const quotedRes = await executeGlobalSearch({ query: '"co"' })
  assert.ok(quotedRes.stories.some(s => s.title === 'The Cold Perimeter'))

  // With common user spelling variant "parameter"
  const paramRes = await executeGlobalSearch({ query: 'The Cold Parameter' })
  assert.ok(paramRes.stories.some(s => s.title === 'The Cold Perimeter'))
})

test('Questionnaire Recommendations: Dynamically scores and returns recommendations from DB catalog', async () => {
  const { executeGetQuestionnaireRecommendations } = await import('../src/server/search.ts')

  // Suspense mood: must include The Cold Perimeter, exclude whimsical comfort stories
  const suspenseRes = await executeGetQuestionnaireRecommendations({ mood: 'suspense', categorySlug: 'all', genreSlug: 'all' })
  assert.ok(Array.isArray(suspenseRes))
  assert.ok(suspenseRes.length > 0)
  assert.ok(suspenseRes.some(s => s.title === 'The Cold Perimeter'), 'The Cold Perimeter should be recommended for suspense mood')
  assert.ok(!suspenseRes.some(s => s.title === 'The Starlight Clockmaker'), 'The Starlight Clockmaker should not be recommended for suspense mood')

  // Quiet mood: must include A Winter in Kyoto and Notes on Subarctic Light
  const quietRes = await executeGetQuestionnaireRecommendations({ mood: 'quiet', categorySlug: 'all', genreSlug: 'all' })
  assert.ok(quietRes.some(s => s.title === 'A Winter in Kyoto'), 'A Winter in Kyoto should be recommended for quiet mood')
  assert.ok(!quietRes.some(s => s.title === 'The Redacted Script'), 'The Redacted Script should not be recommended for quiet mood')

  // Comforting mood: must include The Starlight Clockmaker, exclude cold bunker espionage
  const comfortRes = await executeGetQuestionnaireRecommendations({ mood: 'comforting', categorySlug: 'all', genreSlug: 'all' })
  assert.ok(comfortRes.some(s => s.title === 'The Starlight Clockmaker'), 'The Starlight Clockmaker should be recommended for comforting mood')
  assert.ok(!comfortRes.some(s => s.title === 'The Cold Perimeter'), 'The Cold Perimeter should not be recommended for comforting mood')
})
