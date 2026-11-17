import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Standard Sign-Up & Sign-In Flow Invariants', () => {
  const ssoCallbackTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/sso-callback.tsx'), 'utf8')
  const headerTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/Header.tsx'), 'utf8')
  const loginTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/login.tsx'), 'utf8')
  const onboardingTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.tsx'), 'utf8')
  const authModalTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AuthModal.tsx'), 'utf8')

  it('ensures sso-callback redirects standard un-onboarded users to /onboarding while preserving return destination', () => {
    assert.ok(
      ssoCallbackTsx.includes("if (signupSource === 'standard' && !isCompleted)"),
      'sso-callback must check if standard user has not completed onboarding'
    )
    assert.ok(
      ssoCallbackTsx.includes("return '/onboarding'"),
      'sso-callback must redirect un-onboarded standard users to /onboarding'
    )
    assert.ok(
      ssoCallbackTsx.includes("sessionStorage.getItem('hatchpen_auth_return_url')"),
      'sso-callback must preserve return URL for post-onboarding'
    )
  })

  it('ensures Header Join button launches AuthModal with explicit Sign-Up title and reason', () => {
    assert.ok(
      headerTsx.includes("title: 'Create your HatchPen account'"),
      'Header Join button must provide distinct account creation title'
    )
    assert.ok(
      headerTsx.includes('Join our community of bold storytellers and avid readers.'),
      'Header Join button must provide distinct account creation reason'
    )
  })

  it('ensures login.tsx provides both Google OAuth and Email SignIn components', () => {
    assert.ok(
      loginTsx.includes('import { useSignIn, useSignUp, useUser, useClerk, SignIn } from \'@clerk/react\''),
      'login.tsx must import SignIn component from Clerk'
    )
    assert.ok(
      loginTsx.includes('setShowEmailForm(!showEmailForm)'),
      'login.tsx must provide a toggle for email sign in options'
    )
    assert.ok(
      loginTsx.includes('<SignIn'),
      'login.tsx must render Clerk SignIn component for email authentication'
    )
  })

  it('ensures onboarding.tsx restores saved return URL upon successful profile completion', () => {
    assert.ok(
      onboardingTsx.includes("sessionStorage.getItem('hatchpen_auth_return_url')"),
      'onboarding.tsx must check for saved auth return URL'
    )
    assert.ok(
      onboardingTsx.includes("sessionStorage.removeItem('hatchpen_auth_return_url')"),
      'onboarding.tsx must clean up return URL once restored'
    )
    assert.ok(
      onboardingTsx.includes('navigate({ to: returnUrl as any, replace: true })'),
      'onboarding.tsx must navigate to return URL when available'
    )
  })
})
