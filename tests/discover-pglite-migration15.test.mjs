import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

/**
 * Isolated PostgreSQL test suite executing Migration 15's actual PL/pgSQL function
 * and dependent works_with_collections view inside a sandboxed PostgreSQL 16 engine (PGlite WASM).
 * Guarantees zero connection to production Supabase.
 */

async function setupIsolatedDatabase() {
  const db = new PGlite()

  // 1. Setup prerequisite Supabase roles, types, and tables
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE TYPE publication_status AS ENUM ('draft', 'published', 'scheduled', 'archived');
    CREATE TYPE work_status AS ENUM ('ongoing', 'completed', 'hiatus', 'cancelled');

    CREATE TABLE public.works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      status work_status NOT NULL DEFAULT 'ongoing',
      publication_status publication_status NOT NULL DEFAULT 'draft',
      view_count BIGINT NOT NULL DEFAULT 0,
      like_count BIGINT NOT NULL DEFAULT 0,
      save_count BIGINT NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ,
      last_published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      curated_collections TEXT[] DEFAULT ARRAY[]::TEXT[]
    );

    CREATE TABLE public.acts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status publication_status NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE public.chapters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status publication_status NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );
  `)

  return db
}

function parseStatements(sql) {
  // Strip comments and split by top-level semicolons outside of $$ blocks
  const statements = []
  let current = ''
  let inDollarQuote = false

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!inDollarQuote && trimmed.startsWith('--')) {
      continue
    }
    
    // Check for $$
    let i = 0
    while (i < line.length) {
      if (line.slice(i, i + 2) === '$$') {
        inDollarQuote = !inDollarQuote
        current += '$$'
        i += 2
        continue
      }
      if (!inDollarQuote && line[i] === ';') {
        current += ';'
        const stmt = current.trim()
        if (stmt) statements.push(stmt)
        current = ''
        i++
        continue
      }
      current += line[i]
      i++
    }
    current += '\n'
  }

  const remainder = current.trim()
  if (remainder) statements.push(remainder)
  return statements
}

test('PostgreSQL Isolated Execution: Migration 15 Idempotency and Rollback Lifecycle', async () => {
  const db = await setupIsolatedDatabase()

  // 1. Read and apply original Migration 13
  const mig13Sql = fs.readFileSync('supabase/migrations/20261008000013_collections_and_weekly_flags.sql', 'utf8')
  for (const stmt of parseStatements(mig13Sql)) {
    await db.exec(stmt)
  }

  // 2. Read and apply Migration 15
  const mig15Sql = fs.readFileSync('supabase/migrations/20261015000015_fix_compute_work_collections_published_at.sql', 'utf8')
  for (const stmt of parseStatements(mig15Sql)) {
    await db.exec(stmt)
  }

  // 3. Test Idempotency: Re-apply Migration 15 again to ensure it safely retries
  for (const stmt of parseStatements(mig15Sql)) {
    await db.exec(stmt)
  }

  // 4. Test Rollback Procedure: Can rollback to original function & view definition
  for (const stmt of parseStatements(mig13Sql)) {
    await db.exec(stmt)
  }

  // 5. Re-apply Migration 15 to leave database in target state
  for (const stmt of parseStatements(mig15Sql)) {
    await db.exec(stmt)
  }

  // Confirm function exists and is callable
  const res = await db.query("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'compute_work_collections';")
  assert.equal(res.rows.length, 1)
})

test('PostgreSQL Isolated Execution: Real Database Scenarios for compute_work_collections', async () => {
  const db = await setupIsolatedDatabase()

  // Apply Migration 15
  const mig15Sql = fs.readFileSync('supabase/migrations/20261015000015_fix_compute_work_collections_published_at.sql', 'utf8')
  for (const stmt of parseStatements(mig15Sql)) {
    await db.exec(stmt)
  }

  // Compute canonical current week Monday 00:00:00 UTC and Sunday 23:59:59 UTC
  const boundsRes = await db.query(`
    SELECT 
      (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS w_start,
      ((date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '7 days') AS w_end
  `)
  const wStart = new Date(boundsRes.rows[0].w_start)
  const wEnd = new Date(boundsRes.rows[0].w_end)

  // ----------------------------------------------------------------------------
  // Scenario 1: A draft created last week and published this week
  // ----------------------------------------------------------------------------
  const s1 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, view_count
    ) VALUES (
      'Draft Created Last Week Published This Week',
      'published',
      $1::timestamptz,
      $2::timestamptz,
      50
    ) RETURNING id;
  `, [new Date(wStart.getTime() - 7 * 86400 * 1000).toISOString(), new Date(wStart.getTime() + 3600 * 1000).toISOString()])
  
  const s1Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s1.rows[0].id])
  assert.equal(s1Res.rows[0].new_this_week, true, 'Draft created last week and published this week must have new_this_week = true')
  assert.equal(s1Res.rows[0].new_chapters_this_week, false)
  assert.ok(s1Res.rows[0].collections.includes('new_this_week'))

  // ----------------------------------------------------------------------------
  // Scenario 2: A story created and published this week
  // ----------------------------------------------------------------------------
  const s2 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at
    ) VALUES (
      'Story Created and Published This Week',
      'published',
      $1::timestamptz,
      $1::timestamptz
    ) RETURNING id;
  `, [new Date(wStart.getTime() + 7200 * 1000).toISOString()])

  const s2Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s2.rows[0].id])
  assert.equal(s2Res.rows[0].new_this_week, true)
  assert.ok(s2Res.rows[0].collections.includes('new_this_week'))

  // ----------------------------------------------------------------------------
  // Scenario 3: A story published before this week (no new chapters)
  // ----------------------------------------------------------------------------
  const s3 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at
    ) VALUES (
      'Old Published Story',
      'published',
      $1::timestamptz,
      $1::timestamptz
    ) RETURNING id;
  `, [new Date(wStart.getTime() - 30 * 86400 * 1000).toISOString()])

  const s3Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s3.rows[0].id])
  assert.equal(s3Res.rows[0].new_this_week, false)
  assert.equal(s3Res.rows[0].new_chapters_this_week, false)
  assert.ok(!s3Res.rows[0].collections.includes('new_this_week'))

  // ----------------------------------------------------------------------------
  // Scenario 4: A draft with no published_at
  // ----------------------------------------------------------------------------
  const s4 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at
    ) VALUES (
      'Ongoing Draft Work',
      'draft',
      NOW(),
      NULL
    ) RETURNING id;
  `)

  const s4Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s4.rows[0].id])
  assert.equal(s4Res.rows[0].new_this_week, false)
  assert.equal(s4Res.rows[0].new_chapters_this_week, false)
  assert.deepEqual(s4Res.rows[0].collections, [])

  // ----------------------------------------------------------------------------
  // Scenario 5: A published story with a NULL published_at (legacy row)
  // ----------------------------------------------------------------------------
  const s5 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, curated_collections
    ) VALUES (
      'Legacy Published Story With Null PublishedAt',
      'published',
      NOW(),
      NULL,
      ARRAY['editor_picks', 'spotlight']
    ) RETURNING id;
  `)

  const s5Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s5.rows[0].id])
  assert.equal(s5Res.rows[0].new_this_week, false, 'Must not qualify for new_this_week without published_at')
  assert.equal(s5Res.rows[0].new_chapters_this_week, false)
  // Must preserve curated editorial collections!
  assert.ok(s5Res.rows[0].collections.includes('editor_picks'), 'Must preserve editor_picks')
  assert.ok(s5Res.rows[0].collections.includes('spotlight'), 'Must preserve spotlight')

  // ----------------------------------------------------------------------------
  // Scenario 6: Story with existing Trending, Rising Stories, and editorial membership
  // ----------------------------------------------------------------------------
  const s6 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, view_count, curated_collections
    ) VALUES (
      'Trending and Curated Blockbuster',
      'published',
      $1::timestamptz,
      $1::timestamptz,
      1200,
      ARRAY['staff_favorites']
    ) RETURNING id;
  `, [new Date(wStart.getTime() - 14 * 86400 * 1000).toISOString()])

  const s6Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s6.rows[0].id])
  assert.equal(s6Res.rows[0].new_this_week, false)
  assert.ok(s6Res.rows[0].collections.includes('trending_now'), 'Must include trending_now (views >= 500)')
  assert.ok(s6Res.rows[0].collections.includes('staff_favorites'), 'Must include curated staff_favorites')

  // ----------------------------------------------------------------------------
  // Scenario 7: A republished story whose original published_at is preserved
  // ----------------------------------------------------------------------------
  const s7 = await db.query(`
    INSERT INTO public.works (
      title, publication_status, created_at, published_at, last_published_at
    ) VALUES (
      'Republished Classic',
      'published',
      $1::timestamptz,
      $1::timestamptz,
      NOW()
    ) RETURNING id;
  `, [new Date(wStart.getTime() - 60 * 86400 * 1000).toISOString()])

  const s7Res = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s7.rows[0].id])
  assert.equal(s7Res.rows[0].new_this_week, false, 'Republished story with past published_at must not be new_this_week')
  assert.ok(!s7Res.rows[0].collections.includes('new_this_week'))

  // ----------------------------------------------------------------------------
  // Scenario 8: Week boundaries around Sunday/Monday and UTC midnight
  // ----------------------------------------------------------------------------
  // 8a. Exact Monday 00:00:00.000 UTC start boundary (inclusive)
  const s8a = await db.query(`
    INSERT INTO public.works (
      title, publication_status, published_at
    ) VALUES (
      'Exact Start Boundary Work', 'published', $1::timestamptz
    ) RETURNING id;
  `, [wStart.toISOString()])
  const s8aRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s8a.rows[0].id])
  assert.equal(s8aRes.rows[0].new_this_week, true, 'Exact Monday 00:00:00 UTC boundary must qualify')

  // 8b. Sunday 23:59:59.000 UTC (1 second before start boundary -> exclusive)
  const s8b = await db.query(`
    INSERT INTO public.works (
      title, publication_status, published_at
    ) VALUES (
      'Sunday Before Boundary Work', 'published', $1::timestamptz
    ) RETURNING id;
  `, [new Date(wStart.getTime() - 1000).toISOString()])
  const s8bRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s8b.rows[0].id])
  assert.equal(s8bRes.rows[0].new_this_week, false, '1 second before Monday 00:00 must NOT qualify')

  // 8c. Next Monday 00:00:00.000 UTC (exact end boundary -> exclusive)
  const s8c = await db.query(`
    INSERT INTO public.works (
      title, publication_status, published_at
    ) VALUES (
      'Next Monday Boundary Work', 'published', $1::timestamptz
    ) RETURNING id;
  `, [wEnd.toISOString()])
  const s8cRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s8c.rows[0].id])
  assert.equal(s8cRes.rows[0].new_this_week, false, 'Next Monday 00:00:00 UTC must NOT qualify')

  // ----------------------------------------------------------------------------
  // Scenario 9: Execution under multiple PostgreSQL session timezones
  // ----------------------------------------------------------------------------
  const timezones = ['UTC', 'America/New_York', 'Asia/Kolkata', 'Pacific/Honolulu', 'Europe/Paris']
  for (const tz of timezones) {
    await db.query(`SET TIME ZONE '${tz}'`)
    const tzRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [s8a.rows[0].id])
    assert.equal(
      tzRes.rows[0].new_this_week,
      true,
      `Exact UTC start boundary must qualify under session timezone ${tz}`
    )
  }
  await db.query("SET TIME ZONE 'UTC'")

  // ----------------------------------------------------------------------------
  // Scenario 10: Empty results for nonexistent UUIDs & dependent view query
  // ----------------------------------------------------------------------------
  const nonExistentId = '00000000-0000-0000-0000-000000000000'
  const emptyRes = await db.query('SELECT * FROM public.compute_work_collections($1::uuid);', [nonExistentId])
  assert.equal(emptyRes.rows.length, 0, 'Non-existent UUID must return 0 rows')

  // Query via public.works_with_collections view with lateral join
  const viewRes = await db.query(`
    SELECT title, new_this_week, new_chapters_this_week, collections 
    FROM public.works_with_collections 
    ORDER BY title ASC;
  `)
  assert.ok(viewRes.rows.length >= 8, 'View must successfully return all joined works')
  const viewS1 = viewRes.rows.find((r) => r.title === 'Draft Created Last Week Published This Week')
  assert.equal(viewS1.new_this_week, true)
})
