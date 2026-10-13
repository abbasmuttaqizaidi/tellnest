import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Unit Test Suite: Reading Behavior Tracking Invariants & Business Logic
 * Locks in the rules established for HatchPen's reading behavior tracking:
 * 1. Active time bounds (anti-spoofing delta cap)
 * 2. Document visibility pause / resume semantics
 * 3. Chapter completion rule (physical sentinel + minimum active duration)
 * 4. Fast scroll-through rejection
 * 5. Authorship exclusion
 * 6. Non-UUID mock data safe handling
 */

// --- 1. Delta Bounding & Anti-Spoofing Rule ---
function validateActiveSecondsDelta(rawDelta) {
  return Math.max(0, Math.min(60, Math.round(rawDelta || 0)))
}

test('Delta Bounding: Clamps client delta to [0, 60] seconds', () => {
  assert.equal(validateActiveSecondsDelta(15), 15, 'Valid 15s heartbeat accepted')
  assert.equal(validateActiveSecondsDelta(0), 0, 'Zero delta accepted')
  assert.equal(validateActiveSecondsDelta(-50), 0, 'Negative delta clamped to 0')
  assert.equal(validateActiveSecondsDelta(999999), 60, 'Spoofed large delta clamped to 60')
  assert.equal(validateActiveSecondsDelta(14.7), 15, 'Decimal rounded to nearest whole second')
})

// --- 2. Chapter Completion Rule ---
function evaluateChapterCompletion(params) {
  if (!params.endMarkerReached) return false
  const minRequiredSeconds = params.readTimeMinutes
    ? Math.min(25, params.readTimeMinutes * 15)
    : 20
  return params.accumulatedActiveSeconds >= minRequiredSeconds
}

test('Completion Rule: Fast scroll to bottom without reading does NOT complete', () => {
  const result = evaluateChapterCompletion({
    endMarkerReached: true,
    accumulatedActiveSeconds: 3, // Only 3 seconds on page
    readTimeMinutes: 5,
  })
  assert.equal(result, false, 'Fast skimming must not mark chapter completed')
})

test('Completion Rule: Reading attentively but leaving before end marker does NOT complete', () => {
  const result = evaluateChapterCompletion({
    endMarkerReached: false, // End marker never intersected
    accumulatedActiveSeconds: 300, // Read for 5 minutes
    readTimeMinutes: 5,
  })
  assert.equal(result, false, 'Must reach chapter end marker to complete')
})

test('Completion Rule: Reaching end marker WITH sufficient active time marks completed', () => {
  const result = evaluateChapterCompletion({
    endMarkerReached: true,
    accumulatedActiveSeconds: 45,
    readTimeMinutes: 2,
  })
  assert.equal(result, true, 'Legitimate completion satisfied')
})

// --- 3. Active Time Accumulator with Visibility Pause ---
class ActiveReadingTimeAccumulator {
  constructor() {
    this.accumulated = 0
    this.lastActiveTimestamp = null
    this.isVisible = true
  }

  start(now) {
    this.lastActiveTimestamp = now
    this.isVisible = true
  }

  handleVisibilityChange(visible, now) {
    this.isVisible = visible
    if (!visible) {
      // Backgrounded: freeze and commit slice
      if (this.lastActiveTimestamp !== null) {
        const slice = Math.floor((now - this.lastActiveTimestamp) / 1000)
        this.accumulated += Math.max(0, slice)
        this.lastActiveTimestamp = null
      }
    } else {
      // Foregrounded: resume timer
      this.lastActiveTimestamp = now
    }
  }

  flush(now) {
    if (this.isVisible && this.lastActiveTimestamp !== null) {
      const slice = Math.floor((now - this.lastActiveTimestamp) / 1000)
      this.accumulated += Math.max(0, slice)
      this.lastActiveTimestamp = now
    }
    return this.accumulated
  }
}

test('Visibility Accumulator: Pauses accumulation while tab is hidden', () => {
  const tracker = new ActiveReadingTimeAccumulator()
  let t = 1000000

  tracker.start(t)
  
  // Read for 10 seconds while visible
  t += 10000
  tracker.handleVisibilityChange(false, t) // Tab hidden at t + 10s

  // 60 seconds pass in background tab
  t += 60000

  // User returns to tab
  tracker.handleVisibilityChange(true, t)

  // Read for 5 seconds after returning
  t += 5000
  const total = tracker.flush(t)

  assert.equal(total, 15, 'Should count 10s + 5s = 15s, ignoring the 60s background period')
})

// --- 4. UUID Validation & Mock Data Safety ---
function isValidDatabaseUuid(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

test('UUID Validation: Differentiates DB UUIDs from catalog mock strings', () => {
  assert.equal(isValidDatabaseUuid('35d269b7-0731-4a3b-a7de-522fa755edcb'), true)
  assert.equal(isValidDatabaseUuid('work-1'), false)
  assert.equal(isValidDatabaseUuid('ch-101'), false)
  assert.equal(isValidDatabaseUuid(''), false)
})

// --- 5. Authorship Self-Tracking Exclusion Rule ---
function shouldTrackReaderAnalytics(authorId, currentUserId) {
  return authorId !== currentUserId
}

test('Authorship Safeguard: Authors are never tracked as readers on their own works', () => {
  assert.equal(shouldTrackReaderAnalytics('user-author-uuid', 'user-reader-uuid'), true)
  assert.equal(shouldTrackReaderAnalytics('user-author-uuid', 'user-author-uuid'), false)
})
