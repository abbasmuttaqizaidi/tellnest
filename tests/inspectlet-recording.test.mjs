import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isUserExcluded } from '../src/lib/inspectlet.ts'
import {
  executeGetInspectletClientConfig,
  executeAdminToggleInspectletExclusion,
  executeAdminGetInspectletSettings,
  executeAdminUpdateInspectletConfig,
} from '../src/server/inspectlet.ts'
import { generateAdminToken } from '../src/server/admin.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

test('Inspectlet Protection 1: isUserExcluded matches by Clerk ID, Email, and Username (case-insensitive)', () => {
  const excludedList = ['user_2blocked123', 'admin@hatchpen.com', 'blocked_writer']

  // 1. Matches by Clerk ID (exact & case-insensitive)
  assert.equal(
    isUserExcluded(
      { id: 'user_2blocked123', username: 'other', primaryEmailAddress: { emailAddress: 'other@test.com' } },
      excludedList
    ),
    true,
    'Should exclude by Clerk user ID'
  )
  assert.equal(
    isUserExcluded(
      { id: 'USER_2BLOCKED123', username: 'other', primaryEmailAddress: { emailAddress: 'other@test.com' } },
      excludedList
    ),
    true,
    'Should match Clerk ID case-insensitively'
  )

  // 2. Matches by Email
  assert.equal(
    isUserExcluded(
      { id: 'user_active999', username: 'tester', primaryEmailAddress: { emailAddress: 'admin@hatchpen.com' } },
      excludedList
    ),
    true,
    'Should exclude by primary email'
  )
  assert.equal(
    isUserExcluded(
      { id: 'user_active999', username: 'tester', primaryEmailAddress: { emailAddress: 'ADMIN@HATCHPEN.COM' } },
      excludedList
    ),
    true,
    'Should match email case-insensitively'
  )

  // 3. Matches by Username
  assert.equal(
    isUserExcluded(
      { id: 'user_active888', username: 'blocked_writer', primaryEmailAddress: { emailAddress: 'writer@test.com' } },
      excludedList
    ),
    true,
    'Should exclude by username'
  )
  assert.equal(
    isUserExcluded(
      { id: 'user_active888', username: 'BLOCKED_WRITER', primaryEmailAddress: { emailAddress: 'writer@test.com' } },
      excludedList
    ),
    true,
    'Should match username case-insensitively'
  )

  // 4. Non-matching user is NOT excluded
  assert.equal(
    isUserExcluded(
      { id: 'user_normal777', username: 'reader_jane', primaryEmailAddress: { emailAddress: 'jane@gmail.com' } },
      excludedList
    ),
    false,
    'Normal user should not be excluded'
  )

  // 5. Empty exclusion list
  assert.equal(
    isUserExcluded(
      { id: 'user_normal777', username: 'reader_jane', primaryEmailAddress: { emailAddress: 'jane@gmail.com' } },
      []
    ),
    false,
    'Should handle empty exclusion list without error'
  )
})

test('Inspectlet Protection 2: executeGetInspectletClientConfig returns valid config object', async () => {
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { value: { wid: '99887766', enabled: true } },
            error: null,
          }),
        }),
      }),
    }),
  }

  const config = await executeGetInspectletClientConfig({
    supabaseClient: mockSupabase,
    skipCache: true,
  })

  assert.ok(config, 'Config must be defined')
  assert.equal(typeof config.enabled, 'boolean', 'Config must have boolean enabled status')
  assert.ok(Array.isArray(config.excludedIdentifiers), 'excludedIdentifiers must be an array')
})

test('Inspectlet Security 3: Admin endpoints strictly reject unauthorized requests fail-closed', async () => {
  // Rejects invalid token for get settings
  await assert.rejects(
    async () => {
      await executeAdminGetInspectletSettings('invalid-token')
    },
    /Unauthorized/,
    'Must reject invalid admin token'
  )

  // Rejects invalid token for toggle exclusion
  await assert.rejects(
    async () => {
      await executeAdminToggleInspectletExclusion('invalid-token', 'user_123', true)
    },
    /Unauthorized/,
    'Must reject invalid admin token'
  )

  // Rejects invalid token for config update
  await assert.rejects(
    async () => {
      await executeAdminUpdateInspectletConfig('invalid-token', { wid: '123' })
    },
    /Unauthorized/,
    'Must reject invalid admin token'
  )
})

test('Inspectlet Architecture 4: Root document mounts InspectletTracker and Admin Panel has Inspectlet Controls', () => {
  // 1. __root.tsx mounts InspectletTracker
  const rootCode = fs.readFileSync(path.join(rootDir, 'src/routes/__root.tsx'), 'utf-8')
  assert.ok(rootCode.includes('InspectletTracker'), '__root.tsx must import and mount InspectletTracker')
  assert.ok(rootCode.includes('<InspectletTracker />'), '__root.tsx must render <InspectletTracker />')

  // 2. secret-adminpanel.tsx provides Inspectlet Controls tab and exclusion toggle
  const adminCode = fs.readFileSync(path.join(rootDir, 'src/routes/secret-adminpanel.tsx'), 'utf-8')
  assert.ok(adminCode.includes("activeAdminSection === 'inspectlet'"), 'Admin panel must have inspectlet section')
  assert.ok(adminCode.includes('handleToggleInspectletExclusion'), 'Admin panel must provide handleToggleInspectletExclusion')
  assert.ok(adminCode.includes('handleSaveInspectletConfig'), 'Admin panel must provide handleSaveInspectletConfig')
  assert.ok(adminCode.includes('Exclude Recording'), 'User cards must have Exclude Recording button')

  // 3. InspectletTracker.tsx & lib/inspectlet.ts have Localhost guard
  const trackerCode = fs.readFileSync(path.join(rootDir, 'src/components/InspectletTracker.tsx'), 'utf-8')
  const libCode = fs.readFileSync(path.join(rootDir, 'src/lib/inspectlet.ts'), 'utf-8')
  assert.ok(trackerCode.includes('isLocalhostEnvironment'), 'Tracker must have localhost check')
  assert.ok(libCode.includes('localhost'), 'Lib must check for localhost')
  assert.ok(libCode.includes('127.0.0.1'), 'Lib must check for 127.0.0.1')
  assert.ok(trackerCode.includes('inspscr'), 'Tracker must use official Inspectlet script ID')
})
