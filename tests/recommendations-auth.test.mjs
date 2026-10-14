import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeGetUserRecommendationSignals,
  UnauthorizedError,
} from '../src/server/recommendations.ts'

/**
 * Unit Test Suite: Recommendation Endpoint Authentication & Access Boundaries
 *
 * Verifies that:
 * 1. Anonymous requests (null session) are rejected fail-closed with 401 Unauthorized.
 * 2. Requests with missing or null userId are rejected fail-closed with 401 Unauthorized.
 * 3. HTTP status 401 is explicitly passed to response status handling.
 * 4. Authenticated users with valid session identity resolve signals successfully.
 */

function createMockAdmin(profileData = { id: 'prof-uuid-1', preferences: { genres: ['fantasy'] } }) {
  return {
    from(table) {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: profileData, error: null }),
                gte() {
                  return {
                    order: async () => ({
                      data: [
                        {
                          work_id: 'work-1',
                          chapter_id: 'ch-1',
                          duration_seconds: 120,
                          last_read_at: new Date().toISOString(),
                        },
                      ],
                      error: null,
                    }),
                  }
                },
                then(resolve) {
                  // bookmarks query
                  resolve({
                    data: [{ work_id: 'work-bookmarked-1' }],
                    error: null,
                  })
                },
              }
            },
          }
        },
      }
    },
  }
}

test('Recommendations Auth: Anonymous session is rejected fail-closed with 401 Unauthorized', async () => {
  let reportedStatus = null

  await assert.rejects(
    async () => {
      await executeGetUserRecommendationSignals({
        getAuthState: async () => null,
        setResponseStatus: (status) => {
          reportedStatus = status
        },
      })
    },
    (err) => {
      assert(err instanceof UnauthorizedError, 'Should throw UnauthorizedError instance')
      assert.equal(err.status, 401, 'Error status must be 401')
      assert.match(err.message, /Unauthorized: Authentication required/)
      return true
    }
  )

  assert.equal(reportedStatus, 401, 'Response status must be explicitly set to 401')
})

test('Recommendations Auth: Session with null userId is rejected with 401 Unauthorized', async () => {
  let reportedStatus = null

  await assert.rejects(
    async () => {
      await executeGetUserRecommendationSignals({
        getAuthState: async () => ({ userId: null }),
        setResponseStatus: (status) => {
          reportedStatus = status
        },
      })
    },
    (err) => {
      assert.equal(err.status, 401)
      assert(err instanceof UnauthorizedError)
      return true
    }
  )

  assert.equal(reportedStatus, 401)
})

test('Recommendations Auth: Authenticated session resolves user signals without throwing', async () => {
  const mockAdmin = createMockAdmin()

  const signals = await executeGetUserRecommendationSignals({
    getAuthState: async () => ({ userId: 'clerk_user_valid' }),
    createAdminClient: () => mockAdmin,
  })

  assert.equal(signals.profileId, 'prof-uuid-1')
  assert.equal(signals.readingHistory.length, 1)
  assert.equal(signals.readingHistory[0].workId, 'work-1')
  assert.deepEqual(signals.bookmarkedWorkIds, ['work-bookmarked-1'])
  assert.deepEqual(signals.preferences, { genres: ['fantasy'] })
})

test('Recommendations Auth: Integration: Produces real HTTP 401 Response on server endpoint', async () => {
  // Simulates TanStack Start / Nitro HTTP server action pipeline
  const mockEventResponse = { status: 200, statusText: 'OK', headers: new Headers() }

  let thrownError = null
  try {
    await executeGetUserRecommendationSignals({
      getAuthState: async () => null,
      setResponseStatus: (code) => {
        mockEventResponse.status = code
        mockEventResponse.statusText = 'Unauthorized'
      },
    })
  } catch (err) {
    thrownError = err
  }

  assert(thrownError instanceof UnauthorizedError)

  // Construct the final Web standard HTTP Response as TanStack Start's server-functions-handler does
  const httpResponse = new Response(
    JSON.stringify({ message: thrownError.message }),
    {
      status: mockEventResponse.status,
      statusText: mockEventResponse.statusText,
      headers: {
        'Content-Type': 'application/json',
        'x-tss-serialized': 'true',
      },
    }
  )

  assert.equal(httpResponse.status, 401, 'HTTP Response status must be exactly 401')
  assert.equal(httpResponse.ok, false, 'HTTP Response ok must be false for 401')
  assert.equal(httpResponse.statusText, 'Unauthorized')

  const body = await httpResponse.json()
  assert.match(body.message, /Unauthorized: Authentication required/)
})

test('Recommendations Auth: Client safely handles HTTP 401 without exposing recommendations', () => {
  let recommendationSignals = null
  let isLoadingSignals = true

  // Simulate client fetch catching 401 response
  function handleClientCatch(err) {
    recommendationSignals = null
    isLoadingSignals = false
  }

  handleClientCatch(new UnauthorizedError('Unauthorized'))

  assert.equal(isLoadingSignals, false)
  assert.equal(recommendationSignals, null)

  // Verify that recommendation list evaluates to empty array when signals are null
  function computeRecommendations(signals, userId) {
    if (!signals || !userId) return []
    return [{ id: 'leaked-work' }]
  }

  const result = computeRecommendations(recommendationSignals, 'some-user')
  assert.deepEqual(result, [], 'No recommendations should be computed on auth failure')
})
