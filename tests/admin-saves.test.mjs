import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'

// ==============================================================================
// HatchPen Admin Library Saves Management Test Suite
// ==============================================================================

test('Admin Library Saves: Allows admin to directly update or adjust work saves', async () => {
  const db = new PGlite()

  // 1. Create works table with save_count
  await db.exec(`
    CREATE TABLE works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      save_count BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  // 2. Insert test story
  const workRes = await db.query(`
    INSERT INTO works (title, save_count) VALUES ('The Starless Sea', 42) RETURNING id, save_count;
  `)
  const workId = workRes.rows[0].id
  assert.equal(Number(workRes.rows[0].save_count), 42)

  // 3. Admin adjusts saves: +10 increment
  const delta = 10
  const curRes = await db.query(`SELECT save_count FROM works WHERE id = $1`, [workId])
  const newCount1 = Math.max(0, Number(curRes.rows[0].save_count) + delta)
  await db.query(`UPDATE works SET save_count = $1 WHERE id = $2`, [newCount1, workId])

  const check1 = await db.query(`SELECT save_count FROM works WHERE id = $1`, [workId])
  assert.equal(Number(check1.rows[0].save_count), 52)

  // 4. Admin adjusts saves: direct set to 1500
  const directSet = 1500
  const newCount2 = Math.max(0, Math.round(directSet))
  await db.query(`UPDATE works SET save_count = $1 WHERE id = $2`, [newCount2, workId])

  const check2 = await db.query(`SELECT save_count FROM works WHERE id = $1`, [workId])
  assert.equal(Number(check2.rows[0].save_count), 1500)

  // 5. Admin decrements beyond zero: enforces non-negative boundary
  const negativeSet = -25
  const newCount3 = Math.max(0, Math.round(negativeSet))
  await db.query(`UPDATE works SET save_count = $1 WHERE id = $2`, [newCount3, workId])

  const check3 = await db.query(`SELECT save_count FROM works WHERE id = $1`, [workId])
  assert.equal(Number(check3.rows[0].save_count), 0)
})
