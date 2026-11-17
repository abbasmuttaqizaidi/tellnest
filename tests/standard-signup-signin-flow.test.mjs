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

  it('ensures sso-callback resolves onboarding status from database ground truth to prevent false-positive bounces', () => {
    assert.ok(
      ssoCallbackTsx.includes('getUserOnboardingStatusServerFn'),
      'sso-callback must query database onboarding status for the authenticated user'
    )
    assert.ok(
      ssoCallbackTsx.includes('profile?.onboarding_completed'),
      'sso-callback must inspect profile.onboarding_completed from database'
    )
    assert.ok(
      ssoCallbackTsx.includes("localStorage.setItem(`hatchpen_onboarding_completed_${user.id}`, 'true')"),
      'sso-callback must cache verified completed status in localStorage'
    )
    assert.ok(
      ssoCallbackTsx.includes("safeRedirect('/onboarding')"),
      'sso-callback must route standard un-onboarded users to /onboarding'
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

  it('ensures login.tsx prevents dead-end redirect trap and resets signup source to standard', () => {
    assert.ok(
      loginTsx.includes('hasExplicitDestination || isFormSubmittedRef.current'),
      'login.tsx must only auto-redirect if explicit return destination exists or active submission completed'
    )
    assert.ok(
      loginTsx.includes("sessionStorage.setItem('hatchpen_signup_source', 'standard')"),
      'login.tsx must initialize sessionStorage signup_source to standard'
    )
    assert.ok(
      loginTsx.includes("localStorage.setItem('hatchpen_signup_source', 'standard')"),
      'login.tsx must initialize localStorage signup_source to standard'
    )
  })

  it('ensures onboarding.tsx restores saved return URL upon successful profile completion or early exit', () => {
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
