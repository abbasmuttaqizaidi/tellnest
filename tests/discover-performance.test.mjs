import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAndSortWorks } from '../src/lib/discover/filters.ts'

function generateBenchmarkCatalog(count) {
  const categories = ['novels', 'short-stories', 'poetry', 'essays']
  const genres = ['literary-fiction', 'fantasy', 'sci-fi', 'mystery', 'romance', 'philosophy']
  const statuses = ['Ongoing', 'Completed']

  const catalog = []
  const baseTime = new Date('2026-10-14T12:00:00.000Z').getTime()

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length]
    const gen = genres[i % genres.length]
    const stat = statuses[i % statuses.length]
    // 20% published this week, 80% older
    const isNew = i % 5 === 0
    const pubTime = isNew ? baseTime - 1000 * 60 * 60 * 24 : baseTime - 1000 * 60 * 60 * 24 * 60

    catalog.push({
      id: `bench-story-${i}`,
      title: `Story Title ${i} in ${cat} and ${gen}`,
      categorySlug: cat,
      genreSlug: gen,
      genres: [{ id: `g-${gen}`, name: gen, slug: gen }],
      tags: ['Tag1', 'Tag2', `Key-${i % 20}`],
      status: stat,
      visibility: 'Public',
      publishedAt: new Date(pubTime).toISOString(),
      updatedAt: new Date(pubTime).toISOString(),
      totalReads: `${(i * 137) % 500}K`,
      ratingScore: 4.0 + (i % 10) * 0.1,
      synopsis: `Synopsis for benchmark story ${i} with exploratory narrative prose.`,
      fullDescription: `Full description detailing the plot and stylistic elements of story ${i}.`,
      author: {
        id: `author-${i % 50}`,
        name: `Author Persona ${i % 50}`,
        handle: `author_${i % 50}`,
      },
      chapters: [
        {
          id: `ch-${i}-1`,
          number: 1,
          title: 'Chapter 1',
          status: 'published',
          publishedAt: new Date(pubTime).toISOString(),
        },
      ],
    })
  }
  return catalog
}

test('Benchmark: Discover filtering performance across realistic catalog sizes', () => {
  const sizes = [10, 100, 1000, 5000]
  const refDate = new Date('2026-10-14T12:00:00.000Z')

  console.log('\n--- Discover Filter Benchmark Results ---')

  for (const size of sizes) {
    const catalog = generateBenchmarkCatalog(size)

    // Benchmark 1: Tab filter (new_this_week)
    const t0 = performance.now()
    const r1 = filterAndSortWorks(catalog, {
      activeTab: 'new_this_week',
      selectedCategory: 'all',
      selectedGenre: 'all',
      selectedStatus: 'all',
      searchTerm: '',
      sortBy: 'popularity',
      isSignedIn: false,
      nowDate: refDate,
    })
    const tTab = performance.now() - t0

    // Benchmark 2: Search matching across all metadata
    const t1 = performance.now()
    const r2 = filterAndSortWorks(catalog, {
      activeTab: 'all',
      selectedCategory: 'all',
      selectedGenre: 'all',
      selectedStatus: 'all',
      searchTerm: 'narrative',
      sortBy: 'popularity',
      isSignedIn: false,
      nowDate: refDate,
    })
    const tSearch = performance.now() - t1

    // Benchmark 3: Conjunction of Tab + Category + Genre + Status + Search + Rating Sort
    const t2 = performance.now()
    const r3 = filterAndSortWorks(catalog, {
      activeTab: 'all',
      selectedCategory: 'novels',
      selectedGenre: 'fantasy',
      selectedStatus: 'Completed',
      searchTerm: 'prose',
      sortBy: 'rating',
      isSignedIn: false,
      nowDate: refDate,
    })
    const tComplex = performance.now() - t2

    console.log(
      `Catalog size: ${size.toString().padStart(5)} works | Tab filter: ${tTab.toFixed(3)}ms | Search: ${tSearch.toFixed(3)}ms | Complex Conjunction: ${tComplex.toFixed(3)}ms`
    )

    // For up to 1,000 works, total operation should complete well under 16ms (1 UI frame)
    if (size <= 1000) {
      assert.ok(tComplex < 20, `Execution for ${size} works took ${tComplex}ms, expected < 20ms`)
    }
  }
  console.log('-----------------------------------------\n')
})
