import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { executeAdminReassignWork, generateAdminToken } from '../src/server/admin.ts'

// ==============================================================================
// Admin Reassign Work Ownership & Hierarchy Test Suite
// ==============================================================================

test('Admin Reassign Work: Rejects unauthorized requests without valid admin token', async () => {
  await assert.rejects(
    async () => {
      await executeAdminReassignWork({
        adminToken: 'invalid-key-xyz',
        workId: 'work-123',
        targetProfileId: 'author-456',
      })
    },
    {
      message: /Unauthorized/i,
    }
  )
})

test('Admin Reassign Work: Requires workId and targetProfileId', async () => {
  const { token: validToken } = generateAdminToken()

  await assert.rejects(
    async () => {
      await executeAdminReassignWork({
        adminToken: validToken,
        workId: '',
        targetProfileId: 'target-uuid',
      })
    },
    {
      message: /Work ID is required/i,
    }
  )

  await assert.rejects(
    async () => {
      await executeAdminReassignWork({
        adminToken: validToken,
        workId: 'work-uuid',
        targetProfileId: '',
      })
    },
    {
      message: /Target author Profile ID is required/i,
    }
  )
})

test('Admin Reassign Work: Reassigns manuscript ownership, acts, and chapters atomically', async () => {
  const { token: validToken } = generateAdminToken()
  const db = new PGlite()

  // 1. Setup tables
  await db.exec(`
    CREATE TABLE profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      display_name TEXT,
      avatar_path TEXT,
      is_mock BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ongoing',
      last_activity_at TIMESTAMPTZ,
      last_activity_type TEXT,
      last_activity_detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE acts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      act_number INT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE chapters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      act_id UUID REFERENCES acts(id) ON DELETE SET NULL,
      chapter_number INT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE reading_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      progress_pct INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE bookmarks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  // 2. Insert Author A (original author) and Author B (target new author)
  const aRes = await db.query(`
    INSERT INTO profiles (username, display_name, is_mock)
    VALUES ('author_a', 'Author Alpha', false)
    RETURNING id;
  `)
  const authorAId = aRes.rows[0].id

  const bRes = await db.query(`
    INSERT INTO profiles (username, display_name, is_mock)
    VALUES ('author_b', 'Author Beta', true)
    RETURNING id;
  `)
  const authorBId = bRes.rows[0].id

  // 3. Insert Work under Author A
  const wRes = await db.query(`
    INSERT INTO works (author_id, title, slug)
    VALUES ($1, 'Echoes of the Void', 'echoes-of-the-void')
    RETURNING id;
  `, [authorAId])
  const workId = wRes.rows[0].id

  // 4. Insert Act 1 and Chapter 1 for this work
  const actRes = await db.query(`
    INSERT INTO acts (work_id, act_number, title, slug)
    VALUES ($1, 1, 'Act I: Awakening', 'act-i')
    RETURNING id;
  `, [workId])
  const actId = actRes.rows[0].id

  await db.query(`
    INSERT INTO chapters (work_id, act_id, chapter_number, title, slug, content)
    VALUES ($1, $2, 1, 'Chapter 1: The Signal', 'ch-1', 'In the beginning...')
  `, [workId, actId])

  // 5. Insert prior reading progress and bookmark for Author B (target author previously read this book)
  await db.query(`
    INSERT INTO reading_progress (user_id, work_id, progress_pct)
    VALUES ($1, $2, 45);
  `, [authorBId, workId])

  await db.query(`
    INSERT INTO bookmarks (user_id, work_id)
    VALUES ($1, $2);
  `, [authorBId, workId])

  // 6. Create Supabase-compatible mock query builder adapter wrapping PGlite
  const mockAdminClient = {
    from: (table) => {
      let currentQuery = {
        table,
        action: 'select',
        selectFields: '*',
        filters: [],
        updateData: null,
      }

      const builder = {
        select: (fields) => {
          currentQuery.action = 'select'
          currentQuery.selectFields = fields || '*'
          return builder
        },
        update: (data) => {
          currentQuery.action = 'update'
          currentQuery.updateData = data
          return builder
        },
        delete: () => {
          currentQuery.action = 'delete'
          return builder
        },
        eq: (col, val) => {
          currentQuery.filters.push({ col, op: '=', val })
          return builder
        },
        or: (conditionStr) => {
          // e.g. "id.eq.val,slug.eq.val"
          const parts = conditionStr.split(',').map((p) => {
            const [c, o, v] = p.split('.')
            return { col: c, op: '=', val: v }
          })
          currentQuery.orFilters = parts
          return builder
        },
        maybeSingle: async () => {
          if (currentQuery.action === 'select') {
            let sql = `SELECT * FROM ${currentQuery.table} WHERE `
            const params = []
            if (currentQuery.orFilters) {
              const orClauses = currentQuery.orFilters.map((f, idx) => {
                params.push(f.val)
                return `${f.col} = $${params.length}`
              })
              sql += `(${orClauses.join(' OR ')})`
            } else if (currentQuery.filters.length > 0) {
              const clauses = currentQuery.filters.map((f, idx) => {
                params.push(f.val)
                return `${f.col} = $${params.length}`
              })
              sql += clauses.join(' AND ')
            } else {
              sql = `SELECT * FROM ${currentQuery.table}`
            }
            sql += ` LIMIT 1`

            const res = await db.query(sql, params)
            return { data: res.rows[0] || null, error: null }
          }
          return { data: null, error: null }
        },
        then: async (resolve) => {
          // Handles non-maybeSingle executions like .update().eq() or .delete().eq()
          if (currentQuery.action === 'update') {
            const setClauses = []
            const params = []
            for (const [key, val] of Object.entries(currentQuery.updateData)) {
              params.push(val)
              setClauses.push(`${key} = $${params.length}`)
            }
            const whereClauses = currentQuery.filters.map((f) => {
              params.push(f.val)
              return `${f.col} = $${params.length}`
            })
            const sql = `UPDATE ${currentQuery.table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`
            await db.query(sql, params)
            return resolve({ error: null })
          }
          if (currentQuery.action === 'delete') {
            const params = []
            const whereClauses = currentQuery.filters.map((f) => {
              params.push(f.val)
              return `${f.col} = $${params.length}`
            })
            const sql = `DELETE FROM ${currentQuery.table} WHERE ${whereClauses.join(' AND ')}`
            await db.query(sql, params)
            return resolve({ error: null })
          }
          return resolve({ error: null })
        },
      }
      return builder
    },
  }

  // 7. Execute Reassignment from Author A to Author B
  const result = await executeAdminReassignWork(
    {
      adminToken: validToken,
      workId,
      targetProfileId: authorBId,
      reason: 'Editorial transfer to mock persona',
    },
    mockAdminClient
  )

  assert.equal(result.success, true)
  assert.equal(result.alreadyAssigned, false)
  assert.equal(result.newAuthor.id, authorBId)
  assert.equal(result.previousAuthor.id, authorAId)

  // 8. Verify work record in DB is now owned by Author B
  const updatedWork = await db.query(`SELECT * FROM works WHERE id = $1`, [workId])
  assert.equal(updatedWork.rows[0].author_id, authorBId)
  assert.equal(updatedWork.rows[0].last_activity_type, 'work_metadata_updated')
  assert.equal(updatedWork.rows[0].last_activity_detail.action, 'work_reassigned')
  assert.equal(updatedWork.rows[0].last_activity_detail.previousAuthorId, authorAId)
  assert.equal(updatedWork.rows[0].last_activity_detail.newAuthorId, authorBId)

  // 9. Verify acts and chapters belong to the work that is now owned by Author B
  const actsAndChapters = await db.query(`
    SELECT c.title as ch_title, a.title as act_title, w.author_id
    FROM chapters c
    JOIN acts a ON c.act_id = a.id
    JOIN works w ON a.work_id = w.id
    WHERE w.id = $1
  `, [workId])
  assert.equal(actsAndChapters.rows.length, 1)
  assert.equal(actsAndChapters.rows[0].author_id, authorBId)
  assert.equal(actsAndChapters.rows[0].act_title, 'Act I: Awakening')
  assert.equal(actsAndChapters.rows[0].ch_title, 'Chapter 1: The Signal')

  // 10. Verify target author's old reading progress and bookmarks on this work were purged
  const progressCheck = await db.query(
    `SELECT * FROM reading_progress WHERE work_id = $1 AND user_id = $2`,
    [workId, authorBId]
  )
  assert.equal(progressCheck.rows.length, 0, 'Reading progress of new author on their own work must be cleared')

  const bookmarkCheck = await db.query(
    `SELECT * FROM bookmarks WHERE work_id = $1 AND user_id = $2`,
    [workId, authorBId]
  )
  assert.equal(bookmarkCheck.rows.length, 0, 'Bookmarks of new author on their own work must be cleared')

  // 11. Idempotency test: Re-running with Author B returns alreadyAssigned: true without error
  const rerun = await executeAdminReassignWork(
    {
      adminToken: validToken,
      workId,
      targetProfileId: authorBId,
    },
    mockAdminClient
  )
  assert.equal(rerun.success, true)
  assert.equal(rerun.alreadyAssigned, true)
})

test('Admin Reassign Work Safety: Preserves other readers progress, metrics, and content integrity', async () => {
  const { token: validToken } = generateAdminToken()
  const db = new PGlite()

  await db.exec(`
    CREATE TABLE profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL UNIQUE,
      display_name TEXT,
      avatar_path TEXT,
      is_mock BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE works (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      view_count BIGINT NOT NULL DEFAULT 14200,
      like_count BIGINT NOT NULL DEFAULT 890,
      save_count BIGINT NOT NULL DEFAULT 450,
      status TEXT NOT NULL DEFAULT 'ongoing',
      last_activity_at TIMESTAMPTZ,
      last_activity_type TEXT,
      last_activity_detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE chapters (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      chapter_number INT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE reading_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      progress_pct INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE bookmarks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  // Author 1, Author 2, and a 3rd party Reader
  const a1 = (await db.query(`INSERT INTO profiles (username) VALUES ('author_one') RETURNING id`)).rows[0].id
  const a2 = (await db.query(`INSERT INTO profiles (username) VALUES ('author_two') RETURNING id`)).rows[0].id
  const reader = (await db.query(`INSERT INTO profiles (username) VALUES ('loyal_reader') RETURNING id`)).rows[0].id

  // Work with metrics
  const wId = (await db.query(`
    INSERT INTO works (author_id, title, slug, view_count, like_count, save_count)
    VALUES ($1, 'The Obsidian Tower', 'the-obsidian-tower', 25000, 1500, 800)
    RETURNING id
  `, [a1])).rows[0].id

  // Chapters
  await db.query(`
    INSERT INTO chapters (work_id, chapter_number, title, slug, content)
    VALUES ($1, 1, 'Arrival', 'arrival', 'The tower stood silent in the rain.')
  `, [wId])

  // Loyal reader's progress (80%)
  await db.query(`
    INSERT INTO reading_progress (user_id, work_id, progress_pct)
    VALUES ($1, $2, 80)
  `, [reader, wId])

  // Mock client
  const mockClient = {
    from: (table) => {
      let state = { table, action: 'select', filters: [] }
      const b = {
        select: () => { state.action = 'select'; return b },
        update: (data) => { state.action = 'update'; state.updateData = data; return b },
        delete: () => { state.action = 'delete'; return b },
        eq: (col, val) => { state.filters.push({ col, val }); return b },
        or: (str) => {
          state.orFilters = str.split(',').map((p) => {
            const [c, , v] = p.split('.')
            return { col: c, val: v }
          })
          return b
        },
        maybeSingle: async () => {
          if (state.action === 'select') {
            let sql = `SELECT * FROM ${state.table} WHERE `
            const params = []
            if (state.orFilters) {
              const clauses = state.orFilters.map((f) => {
                params.push(f.val)
                return `${f.col} = $${params.length}`
              })
              sql += `(${clauses.join(' OR ')})`
            } else if (state.filters.length > 0) {
              const clauses = state.filters.map((f) => {
                params.push(f.val)
                return `${f.col} = $${params.length}`
              })
              sql += clauses.join(' AND ')
            }
            const res = await db.query(sql + ' LIMIT 1', params)
            return { data: res.rows[0] || null, error: null }
          }
          return { data: null, error: null }
        },
        then: async (res) => {
          if (state.action === 'update') {
            const setClauses = []
            const params = []
            for (const [k, v] of Object.entries(state.updateData)) {
              params.push(v)
              setClauses.push(`${k} = $${params.length}`)
            }
            const whereClauses = state.filters.map((f) => {
              params.push(f.val)
              return `${f.col} = $${params.length}`
            })
            await db.query(`UPDATE ${state.table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`, params)
            return res({ error: null })
          }
          if (state.action === 'delete') {
            const params = []
            const whereClauses = state.filters.map((f) => {
              params.push(f.val)
              return `${f.col} = $${params.length}`
            })
            await db.query(`DELETE FROM ${state.table} WHERE ${whereClauses.join(' AND ')}`, params)
            return res({ error: null })
          }
          return res({ error: null })
        },
      }
      return b
    },
  }

  // Reassign to author 2
  const outcome = await executeAdminReassignWork(
    {
      adminToken: validToken,
      workId: wId,
      targetProfileId: a2,
    },
    mockClient
  )

  assert.equal(outcome.success, true)

  // Verify Work metrics and slug are 100% preserved
  const workCheck = (await db.query(`SELECT * FROM works WHERE id = $1`, [wId])).rows[0]
  assert.equal(workCheck.author_id, a2)
  assert.equal(workCheck.slug, 'the-obsidian-tower')
  assert.equal(Number(workCheck.view_count), 25000, 'view_count must be preserved')
  assert.equal(Number(workCheck.like_count), 1500, 'like_count must be preserved')
  assert.equal(Number(workCheck.save_count), 800, 'save_count must be preserved')

  // Verify Chapter content is 100% preserved
  const chCheck = (await db.query(`SELECT * FROM chapters WHERE work_id = $1`, [wId])).rows[0]
  assert.equal(chCheck.title, 'Arrival')
  assert.equal(chCheck.content, 'The tower stood silent in the rain.')

  // Verify third-party reader's reading progress is 100% preserved
  const readerProgress = (await db.query(`SELECT * FROM reading_progress WHERE user_id = $1 AND work_id = $2`, [reader, wId])).rows[0]
  assert.equal(readerProgress.progress_pct, 80, 'Reader reading progress must never be disturbed')
})
