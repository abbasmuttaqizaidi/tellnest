import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

// ==============================================================================
// HatchPen Unique Story Impressions Test Suite
// ==============================================================================

test('Unique Story Impressions: Schema enforces 1 impression per viewer per work', async () => {
  const db = new PGlite()

  // 1. Create works table
  await db.query(`
    CREATE TABLE works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      impression_count BIGINT NOT NULL DEFAULT 0
    );
  `)

  // 2. Create unique_impressions table
  await db.exec(`
    CREATE TABLE unique_impressions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      viewer_key TEXT NOT NULL,
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX uq_unique_impressions_viewer_work 
      ON unique_impressions(viewer_key, work_id);
  `)

  // 3. Insert a test story
  const workRes = await db.query(`
    INSERT INTO works (title) VALUES ('The Cold Perimeter') RETURNING id;
  `)
  const workId = workRes.rows[0].id

  // 4. User visits on Laptop (viewerKey = u-user123)
  const laptopViewer = 'u-user123'
  let isNewImpressionLaptop = false

  try {
    await db.query(`
      INSERT INTO unique_impressions (viewer_key, work_id) 
      VALUES ($1, $2);
    `, [laptopViewer, workId])
    isNewImpressionLaptop = true
    await db.query(`
      UPDATE works SET impression_count = impression_count + 1 WHERE id = $1;
    `, [workId])
  } catch (err) {
    if (err.code === '23505') isNewImpressionLaptop = false
  }

  assert.equal(isNewImpressionLaptop, true, 'First visit on laptop must increment impression')

  // Check count in DB
  const countAfterLaptop = await db.query(`SELECT impression_count FROM works WHERE id = $1;`, [workId])
  assert.equal(Number(countAfterLaptop.rows[0].impression_count), 1, 'Impression count should be 1')

  // 5. Same User visits on Mobile (same viewerKey = u-user123)
  const mobileViewer = 'u-user123' // Same user logged in on mobile
  let isNewImpressionMobile = false

  try {
    await db.query(`
      INSERT INTO unique_impressions (viewer_key, work_id) 
      VALUES ($1, $2);
    `, [mobileViewer, workId])
    isNewImpressionMobile = true
    await db.query(`
      UPDATE works SET impression_count = impression_count + 1 WHERE id = $1;
    `, [workId])
  } catch (err) {
    // Unique violation caught
    if (err.code === '23505' || String(err).includes('unique constraint') || String(err).includes('duplicate key')) {
      isNewImpressionMobile = false
    }
  }

  assert.equal(isNewImpressionMobile, false, 'Second visit from mobile by same user must be blocked by duplicate key')

  // Check count in DB - MUST STILL BE 1
  const countAfterMobile = await db.query(`SELECT impression_count FROM works WHERE id = $1;`, [workId])
  assert.equal(Number(countAfterMobile.rows[0].impression_count), 1, 'Impression count must NOT increase on mobile visit')

  // 6. User reloads laptop page 10 times
  for (let i = 0; i < 10; i++) {
    try {
      await db.query(`
        INSERT INTO unique_impressions (viewer_key, work_id) 
        VALUES ($1, $2);
      `, [laptopViewer, workId])
      await db.query(`
        UPDATE works SET impression_count = impression_count + 1 WHERE id = $1;
      `, [workId])
    } catch {}
  }

  const countAfterReloads = await db.query(`SELECT impression_count FROM works WHERE id = $1;`, [workId])
  assert.equal(Number(countAfterReloads.rows[0].impression_count), 1, 'Impression count must NOT increase on repeated reloads')

  // 7. A Different User visits (viewerKey = u-user456)
  const secondUser = 'u-user456'
  await db.query(`
    INSERT INTO unique_impressions (viewer_key, work_id) 
    VALUES ($1, $2);
  `, [secondUser, workId])
  await db.query(`
    UPDATE works SET impression_count = impression_count + 1 WHERE id = $1;
  `, [workId])

  const countAfterSecondUser = await db.query(`SELECT impression_count FROM works WHERE id = $1;`, [workId])
  assert.equal(Number(countAfterSecondUser.rows[0].impression_count), 2, 'Impression count must increase to 2 for distinct user')
})
