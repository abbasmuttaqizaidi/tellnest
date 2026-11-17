import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Second Sign-Up Flow (Reader-Gate / Deferred Onboarding) Audit & Hardening', () => {
  const authSessionTs = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/authSession.ts'), 'utf8')
  const ssoCallbackTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/sso-callback.tsx'), 'utf8')
  const loginTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/login.tsx'), 'utf8')
  const authModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AuthModal.tsx'), 'utf8')
  const indexTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/index.tsx'), 'utf8')
  const userOnboardingModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/UserOnboardingModal.tsx'), 'utf8')
  const onboardingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.tsx'), 'utf8')
  const warningBannerTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ReaderGateWarningBanner.tsx'), 'utf8')
  const settingsTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/settings.tsx'), 'utf8')
  const readerTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/read.$workId.$chapterId.tsx'), 'utf8')

  it('ensures clearClientSession purges hatchpen_signup_source from both storage media', () => {
    assert.ok(
      authSessionTs.includes("localStorage.removeItem('hatchpen_signup_source')"),
      'clearClientSession must purge hatchpen_signup_source from localStorage'
    )
    assert.ok(
      authSessionTs.includes("sessionStorage.removeItem('hatchpen_signup_source')"),
      'clearClientSession must purge hatchpen_signup_source from sessionStorage'
    )
  })

  it('ensures sso-callback prioritizes DB prefs.signup_source before browser storage', () => {
    const prefsIndex = ssoCallbackTsx.indexOf('prefs.signup_source')
    const sessionIndex = ssoCallbackTsx.indexOf("sessionStorage.getItem('hatchpen_signup_source')")
    assert.ok(prefsIndex !== -1 && sessionIndex !== -1, 'Both must be referenced')
    assert.ok(
      prefsIndex < sessionIndex,
      'sso-callback must check prefs.signup_source before falling back to sessionStorage'
    )
  })

  it('ensures login.tsx prioritizes DB prefs.signup_source before browser storage', () => {
    const prefsIndex = loginTsx.indexOf('prefs.signup_source')
    const sessionIndex = loginTsx.indexOf("sessionStorage.getItem('hatchpen_signup_source')")
    assert.ok(prefsIndex !== -1 && sessionIndex !== -1, 'Both must be referenced')
    assert.ok(
      prefsIndex < sessionIndex,
      'login.tsx must check prefs.signup_source before falling back to sessionStorage'
    )
  })

  it('ensures AuthModal.tsx prioritizes DB prefs.signup_source before browser storage', () => {
    const prefsIndex = authModalTsx.indexOf('prefs.signup_source')
    const sessionIndex = authModalTsx.indexOf("sessionStorage.getItem('hatchpen_signup_source')")
    assert.ok(prefsIndex !== -1 && sessionIndex !== -1, 'Both must be referenced')
    assert.ok(
      prefsIndex < sessionIndex,
      'AuthModal must check prefs.signup_source before falling back to sessionStorage'
    )
  })

  it('ensures index.tsx checks both sessionStorage and localStorage for reader_gate immunity', () => {
    assert.ok(
      indexTsx.includes("localStorage.getItem('hatchpen_signup_source') === 'reader_gate'"),
      'index.tsx must check localStorage for reader_gate signup source in new tabs'
    )
    assert.ok(
      indexTsx.includes("sessionStorage.getItem('hatchpen_signup_source') === 'reader_gate'"),
      'index.tsx must check sessionStorage for reader_gate signup source'
    )
  })

  it('ensures UserOnboardingModal checks localStorage and requires explicit DB handle verification', () => {
    assert.ok(
      userOnboardingModalTsx.includes("localStorage.getItem('hatchpen_signup_source') === 'reader_gate'"),
      'UserOnboardingModal must check localStorage for reader_gate'
    )
    assert.ok(
      userOnboardingModalTsx.includes('existingProfile.preferences?.username_verified &&'),
      'UserOnboardingModal must require preferences.username_verified'
    )
  })

  it('ensures onboarding.tsx intercepts unverified direct navigation to Step 2', () => {
    assert.ok(
      onboardingTsx.includes('search.step === 2'),
      'onboarding.tsx must check search.step === 2'
    )
    assert.ok(
      onboardingTsx.includes("navigate({ to: '/onboarding', search: { step: 1 }, replace: true })"),
      'onboarding.tsx must force user to Step 1 if handle is unverified'
    )
    assert.ok(
      onboardingTsx.includes('Please verify your pen name on Step 1 before completing your profile.'),
      'handleCompleteOnboarding must fail-closed if pen name is not verified'
    )
  })

  it('ensures ReaderGateWarningBanner preserves query string in return URL', () => {
    assert.ok(
      warningBannerTsx.includes('routerState.location.searchStr'),
      'Warning banner must preserve router search string in return URL'
    )
  })

  it('ensures settings.tsx dispatches reader-gate-cleared and purges flags on conversion', () => {
    assert.ok(
      settingsTsx.includes("window.dispatchEvent(new CustomEvent('hatchpen:reader-gate-cleared'))"),
      'settings.tsx must dispatch hatchpen:reader-gate-cleared'
    )
    assert.ok(
      settingsTsx.includes("localStorage.removeItem('hatchpen_signup_source')"),
      'settings.tsx must clean up hatchpen_signup_source upon conversion'
    )
  })

  it('ensures chapter reader unlocks cleanly and triggers welcome toast', () => {
    assert.ok(
      readerTsx.includes("showToast('Chapter unlocked! Happy reading.')"),
      'reader must trigger Chapter unlocked toast upon sign in'
    )
  })
})
