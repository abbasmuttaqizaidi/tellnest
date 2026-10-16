import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateFiveMonthExpiration,
  isNewVoiceEligible,
  isStoryEligibleForNewVoices,
  filterAndOrderNewVoicesStories,
} from '../src/lib/recommendations/newVoices.ts'
import { executeGetNewVoices } from '../src/server/works.ts'
import { publishWork } from '../src/lib/supabase/queries/works.ts'

test('New Voices Calendar Math: Correctly computes 5 calendar months across month-ends and leap years', () => {
  // 1. Oct 31, 2023 -> March 31, 2024
  const oct31 = new Date(Date.UTC(2023, 9, 31, 12, 0, 0))
  const expOct31 = calculateFiveMonthExpiration(oct31)
  assert.equal(expOct31.getUTCFullYear(), 2024)
  assert.equal(expOct31.getUTCMonth(), 2) // March (0-indexed)
  assert.equal(expOct31.getUTCDate(), 31)

  // 2. Sept 30, 2023 -> Feb 29, 2024 (2024 is a leap year)
  const sept30Leap = new Date(Date.UTC(2023, 8, 30, 8, 30, 0))
  const expLeap = calculateFiveMonthExpiration(sept30Leap)
  assert.equal(expLeap.getUTCFullYear(), 2024)
  assert.equal(expLeap.getUTCMonth(), 1) // February (0-indexed)
  assert.equal(expLeap.getUTCDate(), 29) // Clamped to 29 in leap year

  // 3. Sept 30, 2024 -> Feb 28, 2025 (2025 is a non-leap year)
  const sept30NonLeap = new Date(Date.UTC(2024, 8, 30, 8, 30, 0))
  const expNonLeap = calculateFiveMonthExpiration(sept30NonLeap)
  assert.equal(expNonLeap.getUTCFullYear(), 2025)
  assert.equal(expNonLeap.getUTCMonth(), 1) // February
  assert.equal(expNonLeap.getUTCDate(), 28) // Clamped to 28 in non-leap year

  // 4. Jan 31, 2024 -> June 30, 2024 (June has 30 days)
  const jan31 = new Date(Date.UTC(2024, 0, 31, 15, 45, 0))
  const expJan31 = calculateFiveMonthExpiration(jan31)
  assert.equal(expJan31.getUTCFullYear(), 2024)
  assert.equal(expJan31.getUTCMonth(), 5) // June
  assert.equal(expJan31.getUTCDate(), 30) // Clamped from 31 to 30

  // 5. March 31, 2024 -> August 31, 2024 (August has 31 days)
  const mar31 = new Date(Date.UTC(2024, 2, 31, 10, 0, 0))
  const expMar31 = calculateFiveMonthExpiration(mar31)
  assert.equal(expMar31.getUTCFullYear(), 2024)
  assert.equal(expMar31.getUTCMonth(), 7) // August
  assert.equal(expMar31.getUTCDate(), 31)
})

test('New Voices Expiration Boundary: Strict boundary (now < expiration is eligible; now >= expiration is ineligible)', () => {
  const accountCreated = new Date(Date.UTC(2024, 0, 15, 12, 0, 0)) // Jan 15, 2024
  const expiration = calculateFiveMonthExpiration(accountCreated) // June 15, 2024 12:00:00

  // 1 millisecond before expiration -> ELIGIBLE
  const beforeExp = new Date(expiration.getTime() - 1)
  assert.equal(isNewVoiceEligible(accountCreated, beforeExp), true)

  // Exactly at expiration timestamp -> INELIGIBLE (strict <)
  const exactExp = new Date(expiration.getTime())
  assert.equal(isNewVoiceEligible(accountCreated, exactExp), false)

  // 1 millisecond after expiration -> INELIGIBLE
  const afterExp = new Date(expiration.getTime() + 1)
  assert.equal(isNewVoiceEligible(accountCreated, afterExp), false)

  // Missing or invalid createdAt -> INELIGIBLE
  assert.equal(isNewVoiceEligible(null), false)
  assert.equal(isNewVoiceEligible(undefined), false)
  assert.equal(isNewVoiceEligible('invalid-date'), false)
})

test('New Voices Zero-Stories Invariant: Users remain eligible even if they have not published any stories yet', () => {
  const now = new Date(Date.UTC(2024, 3, 1)) // April 1, 2024
  const userCreatedAt = new Date(Date.UTC(2024, 1, 1)) // Feb 1, 2024 (2 months old)

  // Author has 0 published stories
  const userStories = []
  assert.equal(userStories.length, 0)

  // Author is strictly eligible for New Voices
  assert.equal(isNewVoiceEligible(userCreatedAt, now), true)
})

test('New Voices Story Eligibility: All qualifying stories during window qualify; old stories and drafts are excluded', () => {
  const authorCreated = '2024-01-01T00:00:00.000Z'
  const refDate = new Date('2024-03-01T00:00:00.000Z') // 2 months later, writer is active

  const baseStory = {
    id: 'story-1',
    title: 'Valid Debut',
    synopsis: 'A test serial',
    cover: '/covers/story1.jpg',
    genre: 'Speculative Fiction',
    status: 'Published',
    visibility: 'Public',
    chaptersCount: 3,
    publishedChaptersCount: 3,
    createdAt: '2024-01-15T00:00:00.000Z',
    publishedAt: '2024-01-15T00:00:00.000Z',
    author: {
      id: 'author-1',
      name: 'Test Author',
      handle: 'testauthor',
      avatar: '/avatars/1.jpg',
      createdAt: authorCreated,
    },
  }

  // 1. Valid qualifying story -> eligible
  assert.equal(isStoryEligibleForNewVoices(baseStory, authorCreated, refDate), true)

  // 2. Second qualifying story published by same author in window -> eligible (every qualifying story, not just first)
  const secondStory = {
    ...baseStory,
    id: 'story-2',
    title: 'Second Story',
    publishedAt: '2024-02-10T00:00:00.000Z',
  }
  assert.equal(isStoryEligibleForNewVoices(secondStory, authorCreated, refDate), true)

  // 3. Draft story -> excluded
  const draftStory = { ...baseStory, status: 'Draft' }
  assert.equal(isStoryEligibleForNewVoices(draftStory, authorCreated, refDate), false)

  // 4. Private / Unlisted story -> excluded
  const privateStory = { ...baseStory, visibility: 'Private' }
  assert.equal(isStoryEligibleForNewVoices(privateStory, authorCreated, refDate), false)

  // 5. Zero chapters -> excluded
  const zeroChaptersStory = { ...baseStory, chaptersCount: 0, publishedChaptersCount: 0 }
  assert.equal(isStoryEligibleForNewVoices(zeroChaptersStory, authorCreated, refDate), false)

  // 6. Editing old story: story was originally published before author account (or outside 5-month window) -> excluded
  const editedOldStory = {
    ...baseStory,
    publishedAt: '2023-11-01T00:00:00.000Z', // Before author created
    updatedAt: '2024-02-01T00:00:00.000Z', // Recently edited
  }
  assert.equal(isStoryEligibleForNewVoices(editedOldStory, authorCreated, refDate), false)

  // 7. Author whose 5 months have expired -> story no longer eligible in active showcase
  const postExpirationDate = new Date('2024-07-01T00:00:00.000Z') // > 5 months after Jan 1
  assert.equal(isStoryEligibleForNewVoices(baseStory, authorCreated, postExpirationDate), false)

  // 8. Missing publishedAt (only createdAt present): MUST be excluded (no fallback to createdAt for eligibility)
  const missingPublishedAtStory = {
    ...baseStory,
    publishedAt: undefined,
    createdAt: '2024-01-15T00:00:00.000Z',
  }
  assert.equal(isStoryEligibleForNewVoices(missingPublishedAtStory, authorCreated, refDate), false)

  // 9. Invalid publishedAt string: MUST be excluded
  const invalidPublishedAtStory = {
    ...baseStory,
    publishedAt: 'not-a-valid-timestamp',
  }
  assert.equal(isStoryEligibleForNewVoices(invalidPublishedAtStory, authorCreated, refDate), false)
})

test('New Voices Story Ordering: Ordered by publishedAt descending with deterministic id tie-breaker', () => {
  const authorCreated = '2024-01-01T00:00:00.000Z'
  const refDate = new Date('2024-03-01T00:00:00.000Z')

  const stories = [
    {
      id: 'story-older',
      title: 'Older Story',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 2,
      publishedChaptersCount: 2,
      publishedAt: '2024-01-10T00:00:00.000Z',
      totalReads: 500000, // High reads should NOT bypass chronological publication sort
      author: { id: 'auth-a', name: 'Author A', createdAt: authorCreated },
    },
    {
      id: 'story-newer-b',
      title: 'Newer Story B',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 1,
      publishedChaptersCount: 1,
      publishedAt: '2024-02-15T00:00:00.000Z',
      totalReads: 10,
      author: { id: 'auth-b', name: 'Author B', createdAt: authorCreated },
    },
    {
      id: 'story-newer-a',
      title: 'Newer Story A',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 1,
      publishedChaptersCount: 1,
      publishedAt: '2024-02-15T00:00:00.000Z', // Same publication time as B -> tie broken by id ('story-newer-a' < 'story-newer-b')
      totalReads: 100,
      author: { id: 'auth-c', name: 'Author C', createdAt: authorCreated },
    },
  ]

  const ordered = filterAndOrderNewVoicesStories(stories, 'reader-user-id', refDate)

  assert.equal(ordered.length, 3)
  // Newest stories come first
  assert.equal(ordered[0].id, 'story-newer-a') // Tied with newer-b, but 'a' < 'b' lexicographically
  assert.equal(ordered[1].id, 'story-newer-b')
  assert.equal(ordered[2].id, 'story-older')
})

test('New Voices Own Manuscript Filter: Excludes reader own stories from discovery showcase', () => {
  const authorCreated = '2024-01-01T00:00:00.000Z'
  const refDate = new Date('2024-02-01T00:00:00.000Z')

  const stories = [
    {
      id: 'story-other',
      title: 'Other Author Story',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 2,
      publishedAt: '2024-01-20T00:00:00.000Z',
      author: { id: 'writer-1', name: 'Writer 1', createdAt: authorCreated },
    },
    {
      id: 'story-mine',
      title: 'My Own Story',
      status: 'Published',
      visibility: 'Public',
      chaptersCount: 1,
      publishedAt: '2024-01-25T00:00:00.000Z',
      author: { id: 'my-user-id', name: 'Me', createdAt: authorCreated },
    },
  ]

  const filtered = filterAndOrderNewVoicesStories(stories, 'my-user-id', refDate)
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].id, 'story-other')
})

test('New Voices Server Function Authorization: executeGetNewVoices fails closed with 401 for anonymous users', async () => {
  // 1. Anonymous session
  let anonymousStatus = 200
  let errorCaptured = null
  try {
    await executeGetNewVoices({
      getAuthState: async () => null,
      setResponseStatus: (code) => {
        anonymousStatus = code
      },
      getPlatformWorks: async () => [],
    })
  } catch (err) {
    errorCaptured = err
  }

  assert.ok(errorCaptured, 'Must throw error on unauthenticated request')
  assert.equal(anonymousStatus, 401, 'Must set HTTP 401 response status')
  assert.equal(errorCaptured.status, 401, 'Error object status must be 401')

  // 2. Authenticated session
  const authorCreated = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const publishedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

  const result = await executeGetNewVoices({
    getAuthState: async () => ({
      userId: 'auth-user-123',
    }),
    getPlatformWorks: async () => [
      {
        id: 'work-1',
        title: 'Debut Story',
        status: 'Published',
        visibility: 'Public',
        chaptersCount: 1,
        publishedChaptersCount: 1,
        publishedAt: publishedAt,
        author: {
          id: 'other-author',
          name: 'Other Author',
          createdAt: authorCreated,
        },
      },
    ],
  })

  assert.ok(Array.isArray(result))
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'work-1')
})

test('New Voices Popup Invariants: Triggers for undismissed eligible users; suppresses on dismissal without affecting eligibility', () => {
  const userId = 'writer-clerk-99'
  const authorCreatedAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 2 months old

  // Mock localStorage store
  const mockStorage = new Map()

  function shouldShowPopup(uId, createdAt, storage) {
    if (!uId || !createdAt) return false
    if (!isNewVoiceEligible(createdAt)) return false
    const key = `hatchpen_new_voices_popup_dismissed_${uId}`
    return storage.get(key) !== 'true'
  }

  // 1. Initial visit: user is eligible and undismissed -> Should show popup
  assert.equal(shouldShowPopup(userId, authorCreatedAt, mockStorage), true)

  // 2. User dismisses popup -> key written to localStorage
  mockStorage.set(`hatchpen_new_voices_popup_dismissed_${userId}`, 'true')

  // 3. Subsequent visit: user is still eligible, but popup is dismissed -> Suppressed
  assert.equal(shouldShowPopup(userId, authorCreatedAt, mockStorage), false)

  // 4. Invariant: Dismissal does NOT alter author eligibility or story eligibility
  assert.equal(isNewVoiceEligible(authorCreatedAt), true)

  const sampleStory = {
    id: 'story-test',
    title: 'Sample Story',
    status: 'Published',
    visibility: 'Public',
    chaptersCount: 1,
    publishedChaptersCount: 1,
    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    author: { id: userId, createdAt: authorCreatedAt },
  }
  assert.equal(isStoryEligibleForNewVoices(sampleStory, authorCreatedAt), true)

  // 5. Ineligible user (e.g. 6 months old account) -> Suppressed even if never dismissed
  const expiredCreatedAt = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
  const freshStorage = new Map()
  assert.equal(shouldShowPopup('older-writer', expiredCreatedAt, freshStorage), false)

  // 6. Onboarding Collision Guard: User eligible but onboarding pending -> Suppressed to avoid stacked modals
  function shouldShowWithOnboarding(uId, createdAt, storage, isOnboardingPending) {
    if (!shouldShowPopup(uId, createdAt, storage)) return false
    if (isOnboardingPending) return false
    return true
  }
  assert.equal(shouldShowWithOnboarding(userId, authorCreatedAt, new Map(), true), false)
  assert.equal(shouldShowWithOnboarding(userId, authorCreatedAt, new Map(), false), true)
})

test('Publishing Safety: Initial publish sets published_at and last_published_at; republishing preserves original published_at', async () => {
  const row = {
    id: 'work-draft-1',
    author_id: 'author-101',
    title: 'My First Story',
    slug: 'my-first-story',
    description: 'A test serial',
    cover_image_path: '/cover.jpg',
    status: 'ongoing',
    visibility: 'private',
    publication_status: 'draft',
    published_at: null,
    last_published_at: null,
    updated_at: '2024-01-01T00:00:00.000Z',
  }

  const createMockClient = (workRow) => {
    return {
      from(table) {
        assert.equal(table, 'works')
        let filterId = null
        let filterAuthorId = null
        let filterPublishedAtIsNull = false
        let updatePayload = null

        const queryObj = {
          select(fields) {
            return this
          },
          update(updates) {
            updatePayload = updates
            return this
          },
          eq(column, value) {
            if (column === 'id') filterId = value
            if (column === 'author_id') filterAuthorId = value
            return this
          },
          is(column, value) {
            if (column === 'published_at' && value === null) {
              filterPublishedAtIsNull = true
            }
            return this
          },
          async maybeSingle() {
            if (filterId !== workRow.id || filterAuthorId !== workRow.author_id) {
              return { data: null, error: null }
            }
            if (filterPublishedAtIsNull && workRow.published_at !== null) {
              return { data: null, error: null } // Matched 0 rows because published_at is not null
            }
            if (updatePayload) {
              Object.assign(workRow, updatePayload)
              return { data: { ...workRow }, error: null }
            }
            return { data: { ...workRow }, error: null }
          },
          async single() {
            return this.maybeSingle()
          },
        }
        return queryObj
      },
    }
  }

  // 1. First actual publication of the draft
  const mockClient = createMockClient(row)
  const initialResult = await publishWork('work-draft-1', 'author-101', 'public', mockClient)

  assert.ok(initialResult.published_at, 'Initial publish must set published_at')
  assert.ok(initialResult.last_published_at, 'Initial publish must set last_published_at')
  const originalPublishedAt = initialResult.published_at
  assert.equal(initialResult.visibility, 'public')
  assert.equal(initialResult.publication_status, 'published')

  // 2. Republishing or changing visibility months later
  await new Promise((r) => setTimeout(r, 10))
  const republishResult = await publishWork('work-draft-1', 'author-101', 'unlisted', mockClient)

  assert.equal(republishResult.published_at, originalPublishedAt, 'Republishing MUST preserve original published_at')
  assert.notEqual(republishResult.last_published_at, originalPublishedAt, 'Republishing must update last_published_at')
  assert.equal(republishResult.visibility, 'unlisted')

  // 3. Changing visibility back to public (unarchiving)
  await new Promise((r) => setTimeout(r, 10))
  const publicResult = await publishWork('work-draft-1', 'author-101', 'public', mockClient)

  assert.equal(publicResult.published_at, originalPublishedAt, 'Unarchiving/visibility change MUST preserve original published_at')
  assert.equal(publicResult.visibility, 'public')
})

test('Publishing Safety: Concurrent initial publish requests safely preserve the winner timestamp', async () => {
  const row = {
    id: 'work-concurrent-1',
    author_id: 'author-202',
    published_at: null,
    last_published_at: null,
  }

  let isFirstAttempt = true
  const mockClient = {
    from() {
      let isUpdate = false
      let checkIsNull = false
      return {
        select() {
          return this
        },
        update(payload) {
          isUpdate = true
          return {
            eq() {
              return this
            },
            is(col, val) {
              if (col === 'published_at' && val === null) checkIsNull = true
              return this
            },
            select() {
              return this
            },
            async maybeSingle() {
              if (checkIsNull && !isFirstAttempt) {
                // Concurrent request sees published_at is no longer null
                return { data: null, error: null }
              }
              if (checkIsNull && isFirstAttempt) {
                isFirstAttempt = false
                Object.assign(row, payload)
                return { data: { ...row }, error: null }
              }
              Object.assign(row, payload)
              return { data: { ...row }, error: null }
            },
            async single() {
              return this.maybeSingle()
            },
          }
        },
        eq() {
          return this
        },
        async maybeSingle() {
          return { data: { id: row.id, published_at: row.published_at }, error: null }
        },
        async single() {
          return this.maybeSingle()
        },
      }
    },
  }

  // Request 1 wins the race
  const res1 = await publishWork('work-concurrent-1', 'author-202', 'public', mockClient)
  const winnerTimestamp = res1.published_at
  assert.ok(winnerTimestamp)

  // Request 2 was concurrent (fetch saw null, but atomic update was second)
  const res2 = await publishWork('work-concurrent-1', 'author-202', 'public', mockClient)
  assert.equal(res2.published_at, winnerTimestamp, 'Concurrent publish request must NOT overwrite winner timestamp')
})

test('New Voices Anti-Gaming: Republishing an old story cannot reset publication date or regain New Voices eligibility', () => {
  const authorCreatedAt = '2023-01-01T00:00:00.000Z'
  const oldOriginalPublishedAt = '2023-02-01T00:00:00.000Z'
  const currentDate = new Date('2024-06-01T00:00:00.000Z') // 1.5 years later

  // Story was originally published in Feb 2023
  const oldStory = {
    id: 'story-old-republished',
    title: 'Old Story Republished Today',
    status: 'Published',
    visibility: 'Public',
    chaptersCount: 5,
    publishedChaptersCount: 5,
    createdAt: '2023-01-15T00:00:00.000Z',
    publishedAt: oldOriginalPublishedAt, // Preserved original published_at
    lastPublishedAt: '2024-06-01T00:00:00.000Z', // Recent republish timestamp
    updatedAt: '2024-06-01T00:00:00.000Z',
    author: {
      id: 'author-old',
      name: 'Old Author',
      createdAt: authorCreatedAt,
    },
  }

  // 1. Author is outside 5 calendar months -> Ineligible
  assert.equal(isNewVoiceEligible(authorCreatedAt, currentDate), false)

  // 2. Story eligibility evaluates against original publishedAt -> Ineligible
  assert.equal(isStoryEligibleForNewVoices(oldStory, authorCreatedAt, currentDate), false)

  // 3. Even if evaluated within author's past window, a story originally published outside author's window cannot qualify
  const storyPublishedPriorToAccount = {
    ...oldStory,
    publishedAt: '2022-12-01T00:00:00.000Z',
    lastPublishedAt: '2023-03-01T00:00:00.000Z',
  }
  const refWithinWindow = new Date('2023-03-01T00:00:00.000Z')
  assert.equal(isStoryEligibleForNewVoices(storyPublishedPriorToAccount, authorCreatedAt, refWithinWindow), false)
})

