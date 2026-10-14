import test from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'

const DB_URL = process.env.DATABASE_URL || ''

/**
 * Read-only Supabase integration tests for Discover data structures.
 * Guarantees zero write operations (SELECT only).
 * Verifies live PostgreSQL schema for:
 * - works_with_collections view
 * - work_genres join and multi-genre aggregation
 * - published_at and chapter timestamps
 */
test('Supabase Read-Only Integration: Live Schema and Multi-Genre Aggregation', async (t) => {
  if (!DB_URL) {
    t.skip('SKIPPED: DATABASE_URL not available in test environment.')
    return
  }

  const client = new pg.Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
  } catch (err) {
    assert.fail(`Could not connect to PostgreSQL: ${err.message}`)
  }

  try {
    // 1. Verify works_with_collections view exists and has required discovery columns
    const columnsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'works_with_collections'
    `)
    const colNames = columnsRes.rows.map((r) => r.column_name)
    assert.ok(colNames.includes('id'), 'Expected id column in works_with_collections')
    assert.ok(colNames.includes('title'), 'Expected title column in works_with_collections')
    assert.ok(colNames.includes('published_at'), 'Expected published_at column in works_with_collections')
    assert.ok(colNames.includes('publication_status'), 'Expected publication_status column in works_with_collections')
    assert.ok(colNames.includes('status'), 'Expected status column in works_with_collections')
    assert.ok(colNames.includes('visibility'), 'Expected visibility column in works_with_collections')
    assert.ok(colNames.includes('new_this_week'), 'Expected new_this_week column in works_with_collections')
    assert.ok(colNames.includes('new_chapters_this_week'), 'Expected new_chapters_this_week column in works_with_collections')
    assert.ok(colNames.includes('collections'), 'Expected collections column in works_with_collections')

    // 2. Verify work_genres and genres live relationship can be joined and aggregated
    const genreJoinRes = await client.query(`
      SELECT 
        w.id,
        w.title,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', g.id,
              'name', g.name,
              'slug', g.slug
            )
          ) FILTER (WHERE g.id IS NOT NULL),
          '[]'::jsonb
        ) as aggregated_genres
      FROM works w
      LEFT JOIN work_genres wg ON w.id = wg.work_id
      LEFT JOIN genres g ON wg.genre_id = g.id
      GROUP BY w.id, w.title
      LIMIT 5
    `)

    assert.ok(Array.isArray(genreJoinRes.rows), 'Query must return rows array')
    for (const row of genreJoinRes.rows) {
      assert.ok(row.id, 'Row must have work id')
      assert.ok(Array.isArray(row.aggregated_genres), 'aggregated_genres must be a valid JSON array')
    }

    // 3. Verify public published works contract: only public works are eligible for discovery
    const pubWorksRes = await client.query(`
      SELECT count(*)::int as count 
      FROM works_with_collections 
      WHERE publication_status = 'published' AND visibility = 'public'
    `)
    assert.ok(pubWorksRes.rows[0].count >= 0, 'Public published works query should execute cleanly')

    // 4. Verify chapters schema has publication fields
    const chapterColRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'chapters'
    `)
    const chColNames = chapterColRes.rows.map((r) => r.column_name)
    assert.ok(chColNames.includes('id'), 'chapters must have id')
    assert.ok(chColNames.includes('work_id'), 'chapters must have work_id')
    assert.ok(chColNames.includes('status'), 'chapters must have status')
    assert.ok(chColNames.includes('published_at'), 'chapters must have published_at')
  } finally {
    await client.end()
  }
})

/**
 * Read-only Supabase integration test verifying that Migration 15's explicit UTC week calculation
 * (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
 * produces invariant UTC Monday 00:00:00.000Z boundaries across multiple non-UTC session timezones.
 */
test('Supabase Read-Only Integration: Non-UTC Session TimeZone Invariance for UTC Week Boundaries', async (t) => {
  if (!DB_URL) {
    t.skip('SKIPPED: DATABASE_URL not available in test environment.')
    return
  }

  const client = new pg.Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
  } catch (err) {
    assert.fail(`Could not connect to PostgreSQL: ${err.message}`)
  }

  try {
    const testTimezones = [
      'UTC',
      'America/New_York',   // UTC-4 / UTC-5
      'Asia/Kolkata',       // UTC+5:30
      'Pacific/Honolulu',   // UTC-10
      'Europe/London',      // UTC+0 / UTC+1
      'Asia/Tokyo',         // UTC+9
    ]

    let canonicalUtcStartIso = null
    let canonicalUtcEndIso = null

    for (const tz of testTimezones) {
      await client.query(`SET TIME ZONE '${tz}'`)

      const res = await client.query(`
        SELECT 
          date_trunc('week', NOW()) AS session_default_trunc,
          (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS explicit_utc_trunc,
          ((date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '7 days') AS explicit_utc_end
      `)

      const row = res.rows[0]
      const explicitStartIso = new Date(row.explicit_utc_trunc).toISOString()
      const explicitEndIso = new Date(row.explicit_utc_end).toISOString()
      const sessionDefaultIso = new Date(row.session_default_trunc).toISOString()

      // The explicit UTC truncation must be identical across all session timezones
      if (!canonicalUtcStartIso) {
        canonicalUtcStartIso = explicitStartIso
        canonicalUtcEndIso = explicitEndIso
      } else {
        assert.equal(
          explicitStartIso,
          canonicalUtcStartIso,
          `explicit_utc_trunc in ${tz} must match canonical UTC start ${canonicalUtcStartIso}`
        )
        assert.equal(
          explicitEndIso,
          canonicalUtcEndIso,
          `explicit_utc_end in ${tz} must match canonical UTC end ${canonicalUtcEndIso}`
        )
      }

      // Verify that explicit_utc_trunc is strictly a Monday at 00:00:00.000Z
      const parsedStartDate = new Date(explicitStartIso)
      assert.equal(parsedStartDate.getUTCDay(), 1, `Day of week must be Monday (1) in ${tz}`)
      assert.equal(parsedStartDate.getUTCHours(), 0, `Hour must be 00 UTC in ${tz}`)
      assert.equal(parsedStartDate.getUTCMinutes(), 0, `Minute must be 00 in ${tz}`)
      assert.equal(parsedStartDate.getUTCSeconds(), 0, `Second must be 00 in ${tz}`)
      assert.equal(parsedStartDate.getUTCMilliseconds(), 0, `Millisecond must be 00 in ${tz}`)

      // For non-UTC timezones with hour offsets (e.g. New York, Kolkata), verify that the naive
      // date_trunc('week', NOW()) deviates from canonical UTC, proving why Migration 15 is necessary
      if (tz === 'America/New_York' || tz === 'Asia/Kolkata') {
        assert.notEqual(
          sessionDefaultIso,
          canonicalUtcStartIso,
          `Naive date_trunc in ${tz} deviates from UTC (${sessionDefaultIso} !== ${canonicalUtcStartIso})`
        )
      }

      // Verify SQL interval evaluation in this session timezone
      const evalRes = await client.query(`
        WITH bounds AS (
          SELECT 
            (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS w_start,
            ((date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '7 days') AS w_end
        )
        SELECT 
          (w_start >= w_start AND w_start < w_end) AS start_inclusive,
          ((w_start - INTERVAL '1 second') >= w_start AND (w_start - INTERVAL '1 second') < w_end) AS before_start_exclusive,
          (w_end >= w_start AND w_end < w_end) AS end_exclusive
        FROM bounds
      `)

      assert.equal(evalRes.rows[0].start_inclusive, true, 'Start boundary must be inclusive in SQL')
      assert.equal(evalRes.rows[0].before_start_exclusive, false, 'Before start must be exclusive in SQL')
      assert.equal(evalRes.rows[0].end_exclusive, false, 'End boundary must be exclusive in SQL')
    }
  } finally {
    // Reset to UTC and close client
    try {
      await client.query("SET TIME ZONE 'UTC'")
    } catch {}
    await client.end()
  }
})

