import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Standard Sign-Up Flow — Strict live_instructions.md Compliance', () => {
  const headerTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Header.tsx'), 'utf8')
  const rootTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/__root.tsx'), 'utf8')
  const onboardingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.tsx'), 'utf8')
  const indexTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/index.tsx'), 'utf8')
  const authorsTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authors.ts'), 'utf8')

  it('ensures Header disables all navigation routes on /onboarding', () => {
    assert.ok(
      headerTsx.includes("const isOnboardingRoute = currentPath.startsWith('/onboarding')"),
      'Header must detect isOnboardingRoute'
    )
    assert.ok(
      headerTsx.includes("isOnboardingRoute ? 'pointer-events-none opacity-40 select-none' : ''"),
      'Header must disable nav links when on /onboarding'
    )
    assert.ok(
      headerTsx.includes("if (isOnboardingRoute) e.preventDefault()"),
      'Header must prevent logo click from escaping /onboarding'
    )
  })

  it('ensures Header disables search, studio, and mobile drawer on /onboarding', () => {
    assert.ok(
      headerTsx.includes('if (isOnboardingRoute) return') && headerTsx.includes("e.key === 'k'"),
      'Header must disable Cmd+K shortcut listener on /onboarding'
    )
    assert.ok(
      headerTsx.includes('disabled={isOnboardingRoute}'),
      'Header must disable mobile menu button on /onboarding'
    )
  })

  it('ensures root shell purges client auth cache on onboarding completion', () => {
    assert.ok(
      rootTsx.includes("window.addEventListener('hatchpen:onboarding-completed'"),
      'Root shell must listen to hatchpen:onboarding-completed'
    )
    assert.ok(
      rootTsx.includes('clientAuthUserCache = null'),
      'Root shell must reset clientAuthUserCache'
    )
    assert.ok(
      rootTsx.includes("sessionStorage.getItem('hatchpen_just_completed_onboarding') === 'true'"),
      'Root shell must bust stale cache when onboarding was just completed'
    )
  })

  it('ensures onboarding.tsx calls clearClientAuthUserCache and sets just_completed flag', () => {
    assert.ok(
      onboardingTsx.includes('clearClientAuthUserCache()'),
      'onboarding.tsx must invoke clearClientAuthUserCache() on completion'
    )
    assert.ok(
      onboardingTsx.includes("sessionStorage.setItem('hatchpen_just_completed_onboarding', 'true')"),
      'onboarding.tsx must set hatchpen_just_completed_onboarding'
    )
  })

  it('ensures index.tsx recognizes just_completed_onboarding to prevent redirect loops', () => {
    assert.ok(
      indexTsx.includes("sessionStorage.getItem('hatchpen_just_completed_onboarding') === 'true'"),
      'index.tsx must recognize hatchpen_just_completed_onboarding'
    )
  })

  it('ensures saveUserOnboardingServerFn maintains reader_gate_converted = false for standard signups', () => {
    assert.ok(
      authorsTs.includes("currentPrefs.signup_source === 'reader_gate' || currentPrefs.reader_gate_converted === true"),
      'authors.ts must only set reader_gate_converted = true if account originated from reader_gate'
    )
    assert.ok(
      authorsTs.includes('preferencesPayload.reader_gate_converted = isReaderGate ? true : Boolean(currentPrefs.reader_gate_converted)'),
      'authors.ts must strictly keep reader_gate_converted false for standard users'
    )
  })
})
