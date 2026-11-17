import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'

const ROOT_FILE_PATH = 'src/routes/__root.tsx'
const SSO_CALLBACK_FILE_PATH = 'src/routes/sso-callback.tsx'
const ONBOARDING_MODAL_FILE_PATH = 'src/components/UserOnboardingModal.tsx'
const INDEX_FILE_PATH = 'src/routes/index.tsx'
const AUTH_MODAL_FILE_PATH = 'src/components/AuthModal.tsx'

test('Regression Invariant 1: __root.tsx mounts ReaderGateWarningBanner with client and server session resilience', () => {
  const content = fs.readFileSync(ROOT_FILE_PATH, 'utf-8')

  // Support client session (hasActiveClientSession) as well as server session
  assert.ok(
    content.includes('hasActiveClientSession'),
    '__root.tsx must support reactive client session detection via hasActiveClientSession'
  )

  // Must mount ReaderGateWarningBanner with serverAuthUser prop
  assert.ok(
    content.includes('<ReaderGateWarningBanner serverAuthUser={rootData?.authUser} />'),
    'ReaderGateWarningBanner must be rendered with serverAuthUser prop'
  )
})

test('Regression Invariant 2: ClerkProvider and sso-callback do NOT hardcode signUpForceRedirectUrl to "/"', () => {
  const rootContent = fs.readFileSync(ROOT_FILE_PATH, 'utf-8')
  const ssoContent = fs.readFileSync(SSO_CALLBACK_FILE_PATH, 'utf-8')

  // In __root.tsx, ClerkProvider must use fallback redirects, not forceRedirectUrl to "/"
  assert.ok(
    !rootContent.includes('signInForceRedirectUrl="/"'),
    'ClerkProvider must not hardcode signInForceRedirectUrl="/"'
  )
  assert.ok(
    !rootContent.includes('signUpForceRedirectUrl="/"'),
    'ClerkProvider must not hardcode signUpForceRedirectUrl="/"'
  )
  assert.ok(
    rootContent.includes('signInFallbackRedirectUrl="/"'),
    'ClerkProvider must provide signInFallbackRedirectUrl'
  )

  // In sso-callback.tsx, AuthenticateWithRedirectCallback must NOT force redirect signups to "/"
  assert.ok(
    !ssoContent.includes('signUpForceRedirectUrl="/"'),
    'AuthenticateWithRedirectCallback must not hardcode signUpForceRedirectUrl="/"'
  )
  assert.ok(
    ssoContent.includes('signUpFallbackRedirectUrl={getTargetDestination()}'),
    'AuthenticateWithRedirectCallback must use dynamic destination fallback for signups'
  )
})

test('Regression Invariant 3: UserOnboardingModal returns to story deep-link upon completion', () => {
  const content = fs.readFileSync(ONBOARDING_MODAL_FILE_PATH, 'utf-8')

  // Must check savedReturnUrl from hatchpen_auth_return_url or authReturnUrl
  assert.ok(
    content.includes("sessionStorage.getItem('hatchpen_auth_return_url')"),
    'Must check sessionStorage for deep-link story destination'
  )
  assert.ok(
    content.includes('savedReturnUrl && savedReturnUrl.startsWith'),
    'Must prioritize navigating to saved story deep-link over home page'
  )
  assert.ok(
    content.includes("navigate({ to: '/write' })"),
    'Must preserve /write navigation when writer intent is selected'
  )
  assert.ok(
    content.includes("navigate({ to: '/' })"),
    'Must preserve / fallback navigation when no story deep link is present'
  )
})

test('Regression Invariant 4: Homepage blocks premature recommendation feeds for un-onboarded users', () => {
  const content = fs.readFileSync(INDEX_FILE_PATH, 'utf-8')

  // isPendingOnboarding must evaluate directly for any signed-in user without multi-device completion
  assert.ok(
    content.includes('const isPendingOnboarding ='),
    'Homepage must compute isPendingOnboarding'
  )
  assert.ok(
    !content.includes("sessionStorage.getItem('hatchpen_onboarding_active') === 'true'"),
    'isPendingOnboarding must not depend on delayed sessionStorage flags'
  )
  assert.ok(
    content.includes('!isCompletedMultiDevice'),
    'isPendingOnboarding must be active whenever multi-device completion is missing'
  )
})

test('Regression Invariant 5: AuthModal immediately records story return URL into sessionStorage', () => {
  const content = fs.readFileSync(AUTH_MODAL_FILE_PATH, 'utf-8')

  assert.ok(
    content.includes("sessionStorage.setItem('hatchpen_auth_return_url', targetPath)"),
    'AuthModal must record targetPath on modal open'
  )
})

test('Regression Invariant 6: Option B suppresses UserOnboardingModal on /read/ routes for 0ms story unlock', () => {
  const content = fs.readFileSync(ONBOARDING_MODAL_FILE_PATH, 'utf-8')

  assert.ok(
    content.includes("pathname.startsWith('/read/')"),
    'UserOnboardingModal must detect /read/ route to suppress modal during reading'
  )
})

test('Regression Invariant 7: Reader page displays instant Chapter Unlocked toast upon authentication', () => {
  const readerPath = 'src/routes/read.$workId.$chapterId.tsx'
  const content = fs.readFileSync(readerPath, 'utf-8')

  assert.ok(
    content.includes("showToast('Chapter unlocked! Happy reading.')"),
    'Reader route must show instant unlock toast upon authenticating'
  )
})
