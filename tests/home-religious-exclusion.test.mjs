import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isReligiousWork } from '../src/lib/discover/filters.ts'
import { getTopShelfWorks, isWorkTopShelfEligible } from '../src/lib/recommendations/topShelf.ts'
import { calculateBingeableReads, isWorkBingeable } from '../src/lib/recommendations/bingeable.ts'
import { isStoryEligibleForNewVoices, filterAndOrderNewVoicesStories } from '../src/lib/recommendations/newVoices.ts'
import { isWorkEligibleForRecommendations } from '../src/lib/recommendations/engine.ts'

const rootDir = process.cwd()

test('Religious Detection: isReligiousWork identifies categories, genres, secondary genres, and tags', () => {
  // 1. Category tests
  assert.equal(isReligiousWork({ category: 'Religion & Spirituality' }), true)
  assert.equal(isReligiousWork({ categorySlug: 'religion-spirituality' }), true)
  assert.equal(isReligiousWork({ categorySlug: 'cat-religion-spirituality' }), true)
  assert.equal(isReligiousWork({ category: 'Christianity & Religion' }), true)

  // 2. Genre tests
  assert.equal(isReligiousWork({ genre: 'Faith & Spirituality' }), true)
  assert.equal(isReligiousWork({ genreSlug: 'faith-spirituality' }), true)
  assert.equal(isReligiousWork({ genreSlug: 'genre-faith-spirituality' }), true)
  assert.equal(isReligiousWork({ genre: 'Faith' }), true)

  // 3. Secondary genres array
  assert.equal(
    isReligiousWork({
      genres: [{ id: 'g1', name: 'Faith & Spirituality', slug: 'faith-spirituality' }],
    }),
    true
  )
  assert.equal(
    isReligiousWork({
      genres: [{ id: 'g2', name: 'Religion', slug: 'religion' }],
    }),
    true
  )

  // 4. Tags array
  assert.equal(isReligiousWork({ tags: ['religion'] }), true)
  assert.equal(isReligiousWork({ tags: ['religious'] }), true)
  assert.equal(isReligiousWork({ tags: ['faith'] }), true)
  assert.equal(isReligiousWork({ tags: ['faith-spirituality'] }), true)

  // 5. Non-religious works
  assert.equal(isReligiousWork({ category: 'Novels', genre: 'Sci-Fi' }), false)
  assert.equal(isReligiousWork({ category: 'Fiction', genre: 'Romance', tags: ['love', 'drama'] }), false)
  assert.equal(isReligiousWork(null), false)
  assert.equal(isReligiousWork(undefined), false)
})

test('Top Shelf: Religious works are strictly excluded from Top Shelf calculation and eligibility', () => {
  const religiousWork = {
    id: 'rel-top-1',
    title: 'Divine Verses',
    category: 'Religion & Spirituality',
    categorySlug: 'religion-spirituality',
    genre: 'Faith & Spirituality',
    genreSlug: 'faith-spirituality',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 5,
    totalSaves: 1000,
    likeCount: 500,
    totalReads: '5000',
    publishedAt: '2026-01-01T00:00:00Z',
  }

  const secularWork = {
    id: 'sec-top-1',
    title: 'Starship Chronicles',
    category: 'Novels',
    categorySlug: 'novels',
    genre: 'Sci-Fi',
    genreSlug: 'sci-fi',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 5,
    totalSaves: 100,
    likeCount: 50,
    totalReads: '1000',
    publishedAt: '2026-01-01T00:00:00Z',
  }

  assert.equal(isWorkTopShelfEligible(religiousWork), false, 'Religious work must not be eligible for Top Shelf')
  assert.equal(isWorkTopShelfEligible(secularWork), true, 'Secular work must be eligible for Top Shelf')

  const results = getTopShelfWorks([religiousWork, secularWork], { limit: 10 })
  assert.equal(results.length, 1)
  assert.equal(results[0].id, 'sec-top-1')
})

test('Bingeable Reads: Religious works are strictly excluded from Bingeable calculation and eligibility', () => {
  const religiousBingeable = {
    id: 'rel-binge-1',
    title: 'Prayers of Dawn',
    category: 'Religion & Spirituality',
    genre: 'Faith & Spirituality',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 2,
    chaptersCount: 2,
  }

  const secularBingeable = {
    id: 'sec-binge-1',
    title: 'Midnight Heist',
    category: 'Novels',
    genre: 'Thriller',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 2,
    chaptersCount: 2,
  }

  assert.equal(isWorkBingeable(religiousBingeable), false, 'Religious work must not be bingeable')
  assert.equal(isWorkBingeable(secularBingeable), true, 'Secular work must be bingeable')

  const results = calculateBingeableReads({
    candidateWorks: [religiousBingeable, secularBingeable],
  })
  assert.equal(results.length, 1)
  assert.equal(results[0].id, 'sec-binge-1')
})

test('New Voices: Religious works are strictly excluded from New Voices calculation and eligibility', () => {
  const authorCreated = new Date().toISOString()
  const religiousStory = {
    id: 'rel-nv-1',
    title: 'Sacred Paths',
    category: 'Religion & Spirituality',
    genre: 'Faith & Spirituality',
    visibility: 'Public',
    status: 'Published',
    publishedChaptersCount: 3,
    publishedAt: new Date().toISOString(),
    author: { createdAt: authorCreated },
  }

  const secularStory = {
    id: 'sec-nv-1',
    title: 'Neon Tokyo',
    category: 'Novels',
    genre: 'Cyberpunk',
    visibility: 'Public',
    status: 'Published',
    publishedChaptersCount: 3,
    publishedAt: new Date().toISOString(),
    author: { createdAt: authorCreated },
  }

  assert.equal(
    isStoryEligibleForNewVoices(religiousStory, authorCreated),
    false,
    'Religious story must not be eligible for New Voices'
  )
  assert.equal(
    isStoryEligibleForNewVoices(secularStory, authorCreated),
    true,
    'Secular story must be eligible for New Voices'
  )

  const results = filterAndOrderNewVoicesStories([religiousStory, secularStory], 'user-1', new Date(), {
    excludeBingeable: false,
  })
  assert.equal(results.length, 1)
  assert.equal(results[0].id, 'sec-nv-1')
})

test('Personalized Recommendations: Religious works are strictly excluded from recommendation engine', () => {
  const religiousRec = {
    id: 'rel-rec-1',
    title: 'The Prophecy and the Faith',
    category: 'Religion & Spirituality',
    genre: 'Faith & Spirituality',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 10,
    author: { id: 'author-other' },
  }

  const secularRec = {
    id: 'sec-rec-1',
    title: 'Deep Horizon',
    category: 'Novels',
    genre: 'Sci-Fi',
    visibility: 'public',
    status: 'Completed',
    publishedChaptersCount: 10,
    author: { id: 'author-other' },
  }

  assert.equal(
    isWorkEligibleForRecommendations(religiousRec, { currentUserId: 'user-curr' }),
    false,
    'Religious work must not be eligible for recommendations'
  )
  assert.equal(
    isWorkEligibleForRecommendations(secularRec, { currentUserId: 'user-curr' }),
    true,
    'Secular work must be eligible for recommendations'
  )
})

test('Home Route & Components Architecture Invariants: Religious stories are excluded on home page', () => {
  // 1. Home route index.tsx filters out religious works in loader
  const indexRoutePath = path.join(rootDir, 'src/routes/index.tsx')
  const indexCode = fs.readFileSync(indexRoutePath, 'utf-8')
  assert.ok(indexCode.includes('isReligiousWork'), 'index.tsx must import and use isReligiousWork')
  assert.ok(indexCode.includes('!isReligiousWork(w)'), 'index.tsx loader must filter out religious works')

  // 2. PublicHome.tsx filters out religious works
  const publicHomePath = path.join(rootDir, 'src/components/home/PublicHome.tsx')
  const publicHomeCode = fs.readFileSync(publicHomePath, 'utf-8')
  assert.ok(publicHomeCode.includes('isReligiousWork'), 'PublicHome.tsx must import isReligiousWork')
  assert.ok(publicHomeCode.includes('!isReligiousWork(w)'), 'PublicHome.tsx must filter out religious works')

  // 3. LoggedInHome.tsx filters out religious works
  const loggedInHomePath = path.join(rootDir, 'src/components/home/LoggedInHome.tsx')
  const loggedInHomeCode = fs.readFileSync(loggedInHomePath, 'utf-8')
  assert.ok(loggedInHomeCode.includes('isReligiousWork'), 'LoggedInHome.tsx must import isReligiousWork')
  assert.ok(loggedInHomeCode.includes('!isReligiousWork(w)'), 'LoggedInHome.tsx must filter out religious works')

  // 4. Server works functions filter out religious works
  const worksServerPath = path.join(rootDir, 'src/server/works.ts')
  const worksServerCode = fs.readFileSync(worksServerPath, 'utf-8')
  assert.ok(worksServerCode.includes('isReligiousWork'), 'works.ts must import and use isReligiousWork')

  // 5. Section components filter out religious works
  const topShelfCompPath = path.join(rootDir, 'src/components/home/TopShelfSection.tsx')
  const topShelfCompCode = fs.readFileSync(topShelfCompPath, 'utf-8')
  assert.ok(topShelfCompCode.includes('isReligiousWork'), 'TopShelfSection.tsx must filter religious works')

  const trendingCompPath = path.join(rootDir, 'src/components/home/TrendingSection.tsx')
  const trendingCompCode = fs.readFileSync(trendingCompPath, 'utf-8')
  assert.ok(trendingCompCode.includes('isReligiousWork'), 'TrendingSection.tsx must filter religious works')

  const bingeableCompPath = path.join(rootDir, 'src/components/home/BingeableSection.tsx')
  const bingeableCompCode = fs.readFileSync(bingeableCompPath, 'utf-8')
  assert.ok(bingeableCompCode.includes('isReligiousWork'), 'BingeableSection.tsx must filter religious works')
})
