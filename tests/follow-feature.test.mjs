import test from 'node:test'
import assert from 'node:assert/strict'

test('Follow Invariants: isAuthorFollowed matches case-insensitively, trims whitespace, and matches UUID or handle', () => {
  const followedAuthorIds = [
    'd841e217-1234-4567-89ab-cdef01234567',
    'elenavasquez',
    'marcusvance',
  ]

  const isAuthorFollowed = (authorId) => {
    if (!authorId) return false
    const clean = authorId.toLowerCase().trim()
    return followedAuthorIds.some((id) => id.toLowerCase().trim() === clean)
  }

  // Exact match
  assert.equal(isAuthorFollowed('elenavasquez'), true)
  assert.equal(isAuthorFollowed('marcusvance'), true)

  // Case-insensitivity & whitespace
  assert.equal(isAuthorFollowed('  ElenaVasquez  '), true)
  assert.equal(isAuthorFollowed('MARCUSVANCE'), true)
  assert.equal(isAuthorFollowed('D841E217-1234-4567-89AB-CDEF01234567'), true)

  // Unfollowed author
  assert.equal(isAuthorFollowed('unknown_author'), false)
  assert.equal(isAuthorFollowed(''), false)
  assert.equal(isAuthorFollowed(null), false)
  assert.equal(isAuthorFollowed(undefined), false)
})

test('Follow Calculation: Baseline math prevents double counting when already followed on load', () => {
  const computeFollowersCount = (baselineCount, followed, initialFollowState) => {
    return Math.max(
      0,
      baselineCount + (followed ? 1 : 0) - (initialFollowState ? 1 : 0)
    )
  }

  // Scenario 1: User already followed author before page load (baseline is 5)
  const baselineFollowed = 5
  const initialFollowed = true

  // Initial render: still 5 (NOT 6!)
  assert.equal(computeFollowersCount(baselineFollowed, true, initialFollowed), 5)

  // User clicks unfollow: drops to 4
  assert.equal(computeFollowersCount(baselineFollowed, false, initialFollowed), 4)

  // User clicks re-follow: back to 5
  assert.equal(computeFollowersCount(baselineFollowed, true, initialFollowed), 5)

  // Scenario 2: User did NOT follow author before page load (baseline is 5)
  const baselineUnfollowed = 5
  const initialUnfollowed = false

  // Initial render: 5
  assert.equal(computeFollowersCount(baselineUnfollowed, false, initialUnfollowed), 5)

  // User clicks follow: increments to 6
  assert.equal(computeFollowersCount(baselineUnfollowed, true, initialUnfollowed), 6)

  // User clicks unfollow: back to 5
  assert.equal(computeFollowersCount(baselineUnfollowed, false, initialUnfollowed), 5)

  // Scenario 3: Baseline is 0
  assert.equal(computeFollowersCount(0, false, false), 0)
  assert.equal(computeFollowersCount(0, true, false), 1)
})

test('Follow Sanitization: Strips leading @ from target handles', () => {
  const sanitizeTarget = (raw) => raw.replace(/^@/, '').trim().toLowerCase()

  assert.equal(sanitizeTarget('@elenavasquez'), 'elenavasquez')
  assert.equal(sanitizeTarget('@@elenavasquez'), '@elenavasquez')
  assert.equal(sanitizeTarget('  elenavasquez  '), 'elenavasquez')
  assert.equal(sanitizeTarget('@MarcusVance'), 'marcusvance')
})

test('Follow Self-Prevention Invariant: Cannot follow oneself', () => {
  const canFollow = (followerId, targetId, followerHandle, targetHandle) => {
    if (followerId && targetId && followerId === targetId) return false
    if (
      followerHandle &&
      targetHandle &&
      followerHandle.toLowerCase().trim() === targetHandle.toLowerCase().trim()
    ) {
      return false
    }
    return true
  }

  assert.equal(canFollow('usr_1', 'usr_1', 'alice', 'alice'), false)
  assert.equal(canFollow('usr_1', 'usr_2', 'alice', 'alice'), false)
  assert.equal(canFollow('usr_1', 'usr_2', 'alice', 'bob'), true)
})
