import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Two Separate Sign-Up Flows & Reader Username Flexibility', () => {
  const settingsTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/settings.ts'), 'utf8')
  const authModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AuthModal.tsx'), 'utf8')
  const authorsQueryTs = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/supabase/queries/authors.ts'), 'utf8')
  const rootRouteTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/__root.tsx'), 'utf8')
  const onboardingModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/UserOnboardingModal.tsx'), 'utf8')

  it('ensures AuthModal detects and separates reader_gate vs standard signup sources', () => {
    assert.ok(
      authModalTsx.includes("sessionStorage.setItem('hatchpen_signup_source', 'reader_gate')"),
      'AuthModal should record reader_gate signup source for /read/ paths'
    )
    assert.ok(
      authModalTsx.includes("sessionStorage.setItem('hatchpen_signup_source', 'standard')"),
      'AuthModal should record standard signup source for non-reader paths'
    )
  })

  it('ensures syncClerkUserToProfile preserves unverified username status for reader_gate signups', () => {
    assert.ok(
      authorsQueryTs.includes("const isReaderGate = params.signupSource === 'reader_gate'"),
      'syncClerkUserToProfile should inspect signupSource'
    )
    assert.ok(
      authorsQueryTs.includes('is_username_verified: !isReaderGate'),
      'is_username_verified should be false for reader_gate to allow username customization'
    )
  })

  it('ensures settings username lock calculation exempts unverified reader_gate accounts', () => {
    assert.ok(
      settingsTs.includes("pJson.signup_source === 'reader_gate'"),
      'executeGetUserSettings should identify unverified reader_gate accounts'
    )
    assert.ok(
      settingsTs.includes('if (isUsernameVerified && !isReaderGate && verifiedAtStr)'),
      '32-day lock should only apply to verified intentional usernames'
    )
  })

  it('ensures executeUpdateProfile allows unverified reader_gate users to change their username', () => {
    assert.ok(
      settingsTs.includes("pJson.signup_source === 'reader_gate'"),
      'executeUpdateProfile should identify unverified reader_gate users'
    )
    assert.ok(
      settingsTs.includes('if (isVerified && !isReaderGate)'),
      '32-day lock check in executeUpdateProfile must exempt unverified reader_gate users'
    )
    assert.ok(
      settingsTs.includes('updates.is_username_verified = true'),
      'Updating username should mark it as verified'
    )
  })

  it('ensures __root.tsx mounts UserOnboardingModal with client session resilience and code splitting', () => {
    assert.ok(
      rootRouteTsx.includes('hasActiveClientSession'),
      '__root.tsx should check hasActiveClientSession for client hydration'
    )
    assert.ok(
      rootRouteTsx.includes('<UserOnboardingModal authUser={rootData?.authUser} />'),
      '__root.tsx should mount UserOnboardingModal in Suspense'
    )
  })

  it('ensures UserOnboardingModal listens to pageshow and popstate for mobile back-button navigation', () => {
    assert.ok(
      onboardingModalTsx.includes("window.addEventListener('pageshow', handlePageShow)"),
      'UserOnboardingModal should listen to pageshow'
    )
    assert.ok(
      onboardingModalTsx.includes("window.addEventListener('popstate', handlePageShow)"),
      'UserOnboardingModal should listen to popstate'
    )
    assert.ok(
      onboardingModalTsx.includes('isReaderSignup'),
      'UserOnboardingModal should track reader signup state'
    )
  })

  it('simulates 32-day lock exemption logic mathematically', () => {
    const checkCanChangeUsername = (profile) => {
      const pJson = profile.preferences || {}
      const isVerified = Boolean(
        profile.is_username_verified ??
        pJson.username_verified ??
        (pJson.username_verified_at && pJson.signup_source !== 'reader_gate')
      )
      const isReaderGate = pJson.signup_source === 'reader_gate' && !profile.is_username_verified && !pJson.username_verified

      if (isVerified && !isReaderGate) {
        const verifiedAtStr = pJson.username_verified_at || pJson.username_last_changed_at || null
        if (verifiedAtStr) {
          const verifiedDate = new Date(verifiedAtStr).getTime()
          if (!isNaN(verifiedDate)) {
            const elapsedDays = Math.floor((Date.now() - verifiedDate) / (1000 * 60 * 60 * 24))
            if (elapsedDays < 32) {
              return { allowed: false, daysRemaining: 32 - elapsedDays }
            }
          }
        }
      }
      return { allowed: true, daysRemaining: 0 }
    }

    // Case 1: Type 2 Reader Signup (auto-assigned handle, not yet verified)
    const readerGateProfile = {
      username: 'user_temp_1234',
      is_username_verified: false,
      preferences: {
        signup_source: 'reader_gate',
        username_verified_at: new Date().toISOString(), // even if timestamp was set, not verified
      },
    }
    const resultReader = checkCanChangeUsername(readerGateProfile)
    assert.equal(resultReader.allowed, true, 'Reader-gate user MUST be allowed to change auto-assigned username')
    assert.equal(resultReader.daysRemaining, 0)

    // Case 2: Type 1 Standard Signup (intentionally chosen username, verified 5 days ago)
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const standardProfile = {
      username: 'custom_pen_name',
      is_username_verified: true,
      preferences: {
        signup_source: 'standard',
        username_verified: true,
        username_verified_at: fiveDaysAgo,
      },
    }
    const resultStandard = checkCanChangeUsername(standardProfile)
    assert.equal(resultStandard.allowed, false, 'Standard user should be locked for 32 days')
    assert.equal(resultStandard.daysRemaining, 27)
  })
})
