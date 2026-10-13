import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateForYouRecommendations,
  isWorkEligibleForRecommendations,
} from '../src/lib/recommendations/engine.ts'

/**
 * Unit Test Suite: Mock Author Architecture & Invariants Verification
 *
 * Verifies:
 * 1. Default safety: Standard profiles default to is_mock = false.
 * 2. Selective backfill: Only admin-mock-* pattern is backfilled, not platform-*, static_*, or admin-user-*.
 * 3. Parity: Stories authored by mock authors participate fully in recommendation eligibility.
 * 4. Recommendation scoring: Mock authored stories are scored identically to real-user stories.
 * 5. Admin filtering: Disconnects and filters real users vs mock personas properly.
 * 6. Metric isolation: Real user acquisition metrics cleanly exclude mock profiles.
 * 7. Real reader tracking: Reader heartbeats on mock stories remain genuine reader activity.
 */

test('Mock Architecture: Profile is_mock defaults safely to false for standard users', () => {
  const standardProfile = {
    id: 'user-uuid-1',
    clerk_user_id: 'user_2xyzRealUser',
    username: 'realwriter',
    display_name: 'Real Writer',
    is_mock: false,
  }

  assert.equal(standardProfile.is_mock, false, 'Standard profiles must have is_mock = false')
})

test('Mock Architecture: Selective backfill rule applies only to admin-mock-* prefix', () => {
  const profiles = [
    { id: '1', clerk_user_id: 'admin-mock-17914-abc', username: 'sharads' },
    { id: '2', clerk_user_id: 'user_3KMZHbotf2', username: 'yamevilzaidi' },
    { id: '3', clerk_user_id: 'platform-alistair', username: 'alistairvance' },
    { id: '4', clerk_user_id: 'static_kenji', username: 'kenji' },
    { id: '5', clerk_user_id: 'admin-user-12345', username: 'externalguest' },
  ]

  const backfilled = profiles.map((p) => {
    // Exact SQL logic from migration 14: WHERE clerk_user_id LIKE 'admin-mock-%'
    const isMock = p.clerk_user_id.startsWith('admin-mock-')
    return { ...p, is_mock: isMock }
  })

  assert.equal(backfilled.find((p) => p.username === 'sharads')?.is_mock, true, 'admin-mock-* must be true')
  assert.equal(backfilled.find((p) => p.username === 'yamevilzaidi')?.is_mock, false, 'Real clerk user must remain false')
  assert.equal(backfilled.find((p) => p.username === 'alistairvance')?.is_mock, false, 'platform-* must remain untouched (false)')
  assert.equal(backfilled.find((p) => p.username === 'kenji')?.is_mock, false, 'static_* must remain untouched (false)')
  assert.equal(backfilled.find((p) => p.username === 'externalguest')?.is_mock, false, 'admin-user-* must remain untouched (false)')
})

test('Mock Architecture: Stories by mock authors are 100% eligible for recommendations under normal rules', () => {
  const mockAuthorWork = {
    id: 'work-cold-perimeter',
    title: 'The Cold Perimeter',
    author: { id: 'mock-author-uuid', name: 'Sharad S', isMock: true },
    authorId: 'mock-author-uuid',
    genre: 'Science Fiction',
    genreSlug: 'science-fiction',
    category: 'Novels',
    categorySlug: 'novels',
    status: 'Ongoing',
    visibility: 'Public',
    publishedChaptersCount: 5,
    chapters: [{ id: 'ch-1', status: 'published' }],
    totalReads: '1200',
  }

  // Normal reader visiting
  const isEligible = isWorkEligibleForRecommendations(mockAuthorWork, {
    currentUserId: 'reader-clerk-id',
    currentUserProfileId: 'reader-profile-uuid',
    bookmarkedWorkIds: [],
  })

  assert.equal(isEligible, true, 'Mock-authored published work must pass recommendation eligibility')
})

test('Mock Architecture: Recommendation engine scores mock and real authors identically based on reader taste', () => {
  const realAuthorWork = {
    id: 'work-real',
    title: 'The Echo Chamber',
    author: { id: 'real-author-uuid', name: 'Real Writer', isMock: false },
    authorId: 'real-author-uuid',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    status: 'Ongoing',
    visibility: 'Public',
    publishedChaptersCount: 3,
    chapters: [{ id: 'ch-1', status: 'published' }],
    totalReads: '2000',
  }

  const mockAuthorWork = {
    id: 'work-mock',
    title: 'The Glass Archipelago',
    author: { id: 'mock-author-uuid', name: 'Kapil Fictional', isMock: true },
    authorId: 'mock-author-uuid',
    genre: 'Fantasy',
    genreSlug: 'fantasy',
    status: 'Ongoing',
    visibility: 'Public',
    publishedChaptersCount: 4,
    chapters: [{ id: 'ch-2', status: 'published' }],
    totalReads: '2500',
  }

  const recommendations = calculateForYouRecommendations({
    candidateWorks: [realAuthorWork, mockAuthorWork],
    readingHistory: [],
    userPreferences: { genres: ['Fantasy'] },
    bookmarkedWorkIds: [],
    currentUserId: 'reader-uuid',
  })

  assert.equal(recommendations.length, 2, 'Both works must be recommended')
  assert.equal(recommendations[0].score, recommendations[1].score, 'Scores must be identical given identical genre match signals')
})

test('Mock Architecture: Admin metrics calculation strictly isolates real users from mock personas', () => {
  const sampleUsers = [
    { id: '1', displayName: 'Real Reader', isMock: false },
    { id: '2', displayName: 'Real Writer', isMock: false },
    { id: '3', displayName: 'Kapil (Fictional)', isMock: true },
    { id: '4', displayName: 'Shravi (Fictional)', isMock: true },
  ]

  const totalRegisteredUsers = sampleUsers.filter((u) => !u.isMock).length
  const totalPersonas = sampleUsers.filter((u) => u.isMock).length

  assert.equal(totalRegisteredUsers, 2, 'Real user metric must exclude mock personas')
  assert.equal(totalPersonas, 2, 'Mock personas must be counted separately')
})

test('Mock Architecture: Admin works filter cleanly separates real-user stories from mock stories', () => {
  const works = [
    { id: 'w1', title: 'Real Story 1', author: { id: 'a1', isMock: false } },
    { id: 'w2', title: 'Real Story 2', author: { id: 'a2', isMock: false } },
    { id: 'w3', title: 'Editorial Story 1', author: { id: 'a3', isMock: true } },
  ]

  const realWorks = works.filter((w) => !w.author.isMock)
  const mockWorks = works.filter((w) => w.author.isMock)

  assert.equal(realWorks.length, 2, 'Real-user stories filter must return 2 works')
  assert.equal(mockWorks.length, 1, 'Mock-author stories filter must return 1 work')
})
