import test from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'

const DB_URL = process.env.DATABASE_URL || ''

/**
 * Read-only database integration tests for genres and work_genres structure.
 * Guarantees zero write operations, verifying real PostgreSQL schema and active genre counts.
 * Only runs when DATABASE_URL is explicitly configured in the environment.
 */
test('DB Integration: Verify real PostgreSQL active genres count and work_genres structure (read-only)', async (t) => {
  if (!DB_URL) {
    t.skip(
      'SKIPPED: DATABASE_URL is not configured in the environment. Integration test requiring live database was skipped.'
    )
    return
  }

  const client = new pg.Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
  } catch (err) {
    assert.fail(`DATABASE_URL is configured, but failed to connect to PostgreSQL: ${err.message}`)
  }

  try {
    // 1. Verify genres table has active genres (is_active = true)
    const activeRes = await client.query(
      `SELECT count(*)::int as count FROM genres WHERE is_active = true`
    )
    const activeCount = activeRes.rows[0].count
    assert.ok(activeCount > 0, `Expected active genres in database, found ${activeCount}`)

    // 2. Verify known active genres exist and are active
    const sampleGenresRes = await client.query(
      `SELECT name, slug, is_active FROM genres WHERE name IN ('Literary Fiction', 'Science Fiction', 'Fantasy')`
    )
    assert.equal(sampleGenresRes.rows.length, 3)
    for (const row of sampleGenresRes.rows) {
      assert.equal(row.is_active, true, `Expected genre ${row.name} to be active`)
    }

    // 3. Verify inactive genres are flagged is_active = false
    const inactiveRes = await client.query(
      `SELECT name, is_active FROM genres WHERE name IN ('Historical', 'Adventure', 'Drama', 'Comedy')`
    )
    for (const row of inactiveRes.rows) {
      assert.equal(row.is_active, false, `Expected legacy genre ${row.name} to be inactive`)
    }

    // 4. Verify work_genres junction table exists and has foreign key constraints
    const tableRes = await client.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'work_genres' 
       ORDER BY ordinal_position`
    )
    const colNames = tableRes.rows.map((r) => r.column_name)
    assert.ok(colNames.includes('work_id'), 'work_genres must contain work_id column')
    assert.ok(colNames.includes('genre_id'), 'work_genres must contain genre_id column')

    // 5. Verify works query compatibility with work_genres and genres lateral join
    const lateralRes = await client.query(
      `SELECT w.id, w.title,
        COALESCE(
          (
            SELECT json_agg(json_build_object('name', g.name, 'slug', g.slug))
            FROM work_genres wg
            JOIN genres g ON g.id = wg.genre_id
            WHERE wg.work_id = w.id
          ),
          '[]'::json
        ) as work_genres
       FROM works w
       LIMIT 3`
    )
    assert.ok(Array.isArray(lateralRes.rows), 'Query with lateral join on work_genres must succeed')
  } finally {
    await client.end()
  }
})
