import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Reader Gate Warning Banner Approach', () => {
  const bannerTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/ReaderGateWarningBanner.tsx'), 'utf8')
  const rootRouteTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/__root.tsx'), 'utf8')
  const onboardingModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/UserOnboardingModal.tsx'), 'utf8')
  const authorsServerTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/authors.ts'), 'utf8')
  const settingsServerTs = fs.readFileSync(path.resolve(process.cwd(), 'src/server/settings.ts'), 'utf8')

  it('ensures ReaderGateWarningBanner strictly excludes editor and onboarding routes', () => {
    assert.ok(
      bannerTsx.includes("pathname.includes('/editor')"),
      'Banner must check pathname.includes("/editor")'
    )
    assert.ok(
      bannerTsx.includes("pathname.startsWith('/write/editor')"),
      'Banner must exclude /write/editor routes'
    )
    assert.ok(
      bannerTsx.includes("pathname.startsWith('/onboarding')"),
      'Banner must exclude /onboarding route'
    )
    assert.ok(
      bannerTsx.includes('if (isExcludedRoute)'),
      'Banner must return null on excluded routes'
    )
  })

  it('ensures ReaderGateWarningBanner contains NO sparkles icon and uses alert warning styling', () => {
    assert.ok(
      !bannerTsx.includes('Sparkles'),
      'ReaderGateWarningBanner must strictly NOT contain any Sparkles icon'
    )
    assert.ok(
      bannerTsx.includes('AlertCircle'),
      'ReaderGateWarningBanner must display AlertCircle warning icon'
    )
    assert.ok(
      bannerTsx.includes('Account setup incomplete'),
      'Banner must display clear account setup notice'
    )
  })

  it('ensures ReaderGateWarningBanner provides a single Complete Profile action button', () => {
    assert.ok(
      bannerTsx.includes('Complete Profile'),
      'Banner must contain single "Complete Profile" button'
    )
    assert.ok(
      bannerTsx.includes('handleOpenOnboarding'),
      'Banner must call handleOpenOnboarding'
    )
    assert.ok(
      bannerTsx.includes("to: '/onboarding'"),
      'handleOpenOnboarding must navigate to /onboarding'
    )
    assert.ok(
      bannerTsx.includes('search: { step: isUsernameVerified ? 2 : 1 }'),
      'handleOpenOnboarding must pass step 2 if handle is verified, else step 1'
    )
  })

  it('ensures __root.tsx mounts ReaderGateWarningBanner globally above main content', () => {
    assert.ok(
      rootRouteTsx.includes('ReaderGateWarningBanner'),
      '__root.tsx must import and mount ReaderGateWarningBanner'
    )
    assert.ok(
      rootRouteTsx.includes('<ReaderGateWarningBanner serverAuthUser={rootData?.authUser} />'),
      '__root.tsx must pass serverAuthUser to ReaderGateWarningBanner'
    )
  })

  it('ensures onboarding page dispatches reader-gate-cleared event upon completion', () => {
    const onboardingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.tsx'), 'utf8')
    assert.ok(
      onboardingTsx.includes('hatchpen:reader-gate-cleared'),
      'onboarding.tsx must dispatch hatchpen:reader-gate-cleared upon completion'
    )
    assert.ok(
      onboardingTsx.includes('hatchpen:onboarding-completed'),
      'onboarding.tsx must dispatch hatchpen:onboarding-completed upon completion'
    )
  })

  it('ensures backend transitions signup_source to standard upon onboarding completion', () => {
    assert.ok(
      authorsServerTs.includes("preferencesPayload.signup_source = 'standard'"),
      'saveUserOnboardingServerFn must set signup_source to standard'
    )
    assert.ok(
      settingsServerTs.includes("nextPrefs.signup_source = 'standard'"),
      'settings username update must set signup_source to standard when genres are present'
    )
    assert.ok(
      settingsServerTs.includes("signup_source: 'standard'"),
      'settings genres update must set signup_source to standard when handle is verified'
    )
  })
})
