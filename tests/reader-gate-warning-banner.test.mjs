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

  it('ensures ReaderGateWarningBanner strictly excludes all editor routes', () => {
    assert.ok(
      bannerTsx.includes("pathname.includes('/editor')"),
      'Banner must check pathname.includes("/editor")'
    )
    assert.ok(
      bannerTsx.includes("pathname.startsWith('/write/editor')"),
      'Banner must exclude /write/editor routes'
    )
    assert.ok(
      bannerTsx.includes('if (isEditorRoute)'),
      'Banner must return null on editor routes'
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

  it('ensures ReaderGateWarningBanner provides two action buttons for username and genres', () => {
    assert.ok(
      bannerTsx.includes('Verify Username') || bannerTsx.includes('Handle Verified'),
      'Banner must contain Verify Username button'
    )
    assert.ok(
      bannerTsx.includes('Select Genres') || bannerTsx.includes('Genres Selected'),
      'Banner must contain Select Genres button'
    )
    assert.ok(
      bannerTsx.includes("handleOpenStep(1)"),
      'Verify Username button must invoke handleOpenStep(1)'
    )
    assert.ok(
      bannerTsx.includes("handleOpenStep(2)"),
      'Select Genres button must invoke handleOpenStep(2)'
    )
    assert.ok(
      bannerTsx.includes("detail: { step: stepNumber }"),
      'handleOpenStep must dispatch step detail in event'
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

  it('ensures UserOnboardingModal does NOT auto-popup for reader_gate users and listens to open event', () => {
    assert.ok(
      onboardingModalTsx.includes('if (isReaderSource)'),
      'UserOnboardingModal must detect isReaderSource'
    )
    assert.ok(
      onboardingModalTsx.includes("window.addEventListener('hatchpen:open-onboarding'"),
      'UserOnboardingModal must listen for hatchpen:open-onboarding'
    )
    assert.ok(
      onboardingModalTsx.includes('hatchpen:reader-gate-cleared'),
      'UserOnboardingModal must dispatch hatchpen:reader-gate-cleared upon completion'
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
