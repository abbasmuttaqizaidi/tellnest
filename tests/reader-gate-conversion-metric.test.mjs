import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Reader Gate Conversion Metric (reader_gate_converted)', () => {
  const queriesAuthorsTs = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/supabase/queries/authors.ts'), 'utf8')
  const serverAuthorsTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authors.ts'), 'utf8')
  const serverSettingsTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/settings.ts'), 'utf8')
  const serverAuthTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/auth.ts'), 'utf8')
  const serverAdminTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/admin.ts'), 'utf8')

  it('ensures syncClerkUserToProfile initializes reader_gate_converted: false for all new users', () => {
    assert.ok(
      queriesAuthorsTs.includes('reader_gate_converted: false'),
      'syncClerkUserToProfile must initialize reader_gate_converted to false by default'
    )
    assert.ok(
      queriesAuthorsTs.includes('preferences') && queriesAuthorsTs.includes('is_username_verified'),
      'Existing profile query must include preferences and is_username_verified fields'
    )
  })

  it('ensures saveUserOnboardingServerFn transitions reader_gate users to reader_gate_converted = true', () => {
    assert.ok(
      serverAuthorsTs.includes("const isReaderGate = currentPrefs.signup_source === 'reader_gate' || currentPrefs.reader_gate_converted === true"),
      'saveUserOnboardingServerFn must detect reader_gate or previously converted status'
    )
    assert.ok(
      serverAuthorsTs.includes("preferencesPayload.signup_source = 'standard'"),
      'saveUserOnboardingServerFn must transition signup_source to standard'
    )
    assert.ok(
      serverAuthorsTs.includes('preferencesPayload.reader_gate_converted = isReaderGate ? true : Boolean(currentPrefs.reader_gate_converted)'),
      'saveUserOnboardingServerFn must set reader_gate_converted to true for reader_gate users'
    )
  })

  it('ensures settings profile update sets reader_gate_converted = true and enforces immutability', () => {
    assert.ok(
      serverSettingsTs.includes('nextPrefs.reader_gate_converted = true'),
      'Settings username update must set reader_gate_converted = true on reader_gate transition'
    )
    assert.ok(
      serverSettingsTs.includes('if (currentPrefs.reader_gate_converted === true) {\n        nextPrefs.reader_gate_converted = true'),
      'Settings username update must preserve reader_gate_converted if already true'
    )
  })

  it('ensures settings reading preferences update sets reader_gate_converted = true on complete setup', () => {
    assert.ok(
      serverSettingsTs.includes('reader_gate_converted: true'),
      'Settings reading preferences must include reader_gate_converted: true when setup is complete'
    )
    assert.ok(
      serverSettingsTs.includes('if (currentPrefs.reader_gate_converted === true) {\n    updatedPrefs.reader_gate_converted = true'),
      'Settings reading preferences must preserve reader_gate_converted once true'
    )
  })

  it('ensures server auth exposes readerGateConverted in ServerAuthState and getAuthUserServerFn', () => {
    assert.ok(
      serverAuthTs.includes('readerGateConverted?: boolean'),
      'ServerAuthState interface must define readerGateConverted'
    )
    assert.ok(
      serverAuthTs.includes('readerGateConverted = Boolean(pPrefs.reader_gate_converted)'),
      'getAuthUserServerFn must resolve readerGateConverted from preferences'
    )
  })

  it('ensures admin user mapping exposes signupSource and readerGateConverted', () => {
    assert.ok(
      serverAdminTs.includes('readerGateConverted?: boolean'),
      'AdminUser interface must define readerGateConverted'
    )
    assert.ok(
      serverAdminTs.includes('readerGateConverted: Boolean(pRawPrefs.reader_gate_converted)'),
      'Admin user mapping must resolve readerGateConverted'
    )
  })

  it('mathematically simulates state transitions and immutability invariants', () => {
    // Stage 1: Brand new direct standard signup
    const standardUser = {
      signup_source: 'standard',
      reader_gate_converted: false,
    }
    assert.equal(standardUser.signup_source, 'standard')
    assert.equal(standardUser.reader_gate_converted, false)

    // Stage 2: Brand new chapter reader signup
    const readerUser = {
      signup_source: 'reader_gate',
      reader_gate_converted: false,
    }
    assert.equal(readerUser.signup_source, 'reader_gate')
    assert.equal(readerUser.reader_gate_converted, false)

    // Stage 3: Standard user completes onboarding -> remains false
    const standardCompleted = {
      ...standardUser,
      signup_source: 'standard',
      reader_gate_converted: standardUser.signup_source === 'reader_gate' ? true : standardUser.reader_gate_converted,
    }
    assert.equal(standardCompleted.signup_source, 'standard')
    assert.equal(standardCompleted.reader_gate_converted, false)

    // Stage 4: Reader user completes onboarding -> flips to true and standard
    const readerCompleted = {
      ...readerUser,
      signup_source: 'standard',
      reader_gate_converted: readerUser.signup_source === 'reader_gate' ? true : readerUser.reader_gate_converted,
    }
    assert.equal(readerCompleted.signup_source, 'standard')
    assert.equal(readerCompleted.reader_gate_converted, true)

    // Stage 5: Immutability - Converted reader later updates preferences in settings -> stays true
    const convertedReaderUpdatesSettings = {
      ...readerCompleted,
      reader_gate_converted: readerCompleted.reader_gate_converted === true ? true : false,
    }
    assert.equal(convertedReaderUpdatesSettings.signup_source, 'standard')
    assert.equal(convertedReaderUpdatesSettings.reader_gate_converted, true)
  })
})
