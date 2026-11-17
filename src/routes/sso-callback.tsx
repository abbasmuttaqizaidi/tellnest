import { useEffect, useState, useRef } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback, useUser } from '@clerk/react'
import { HatchpenLogo } from '../components/HatchpenLogo'
import { generateMeta } from '../lib/seo'
import { markClientSessionActive } from '../lib/authSession'
import { getUserOnboardingStatusServerFn } from '../server/authors'

export const Route = createFileRoute('/sso-callback')({
  head: () =>
    generateMeta({
      title: 'Preparing your reading desk — HatchPen',
      noindex: true,
    }),
  component: SSOCallbackPage,
})

export default function SSOCallbackPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const { isLoaded, isSignedIn, user } = useUser()
  const [progress, setProgress] = useState(25)
  const [statusText, setStatusText] = useState('Connecting to HatchPen...')

  const hadOAuthParamsOnMountRef = useRef<boolean>(false)

  // 1. Capture initial presence of OAuth params on mount and mark session active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasOAuthParams =
        window.location.search.length > 1 ||
        window.location.hash.length > 1 ||
        sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true' ||
        sessionStorage.getItem('hatchpen_oauth_in_flight') === 'true'

      if (hasOAuthParams) {
        hadOAuthParamsOnMountRef.current = true
        sessionStorage.setItem('hatchpen_oauth_in_flight', 'true')
        markClientSessionActive()
      }
    }
  }, [])

  // 2. Instant responsive feedback
  useEffect(() => {
    setProgress(85)
    const target = getTargetDestination()
    if (target.startsWith('/read/')) {
      setStatusText('Ready. Opening your chapter...')
    } else {
      setStatusText('Opening your stories...')
    }
  }, [])

  const hasRedirectedRef = useRef(false)

  const getTargetDestination = () => {
    if (typeof window === 'undefined') return '/'

    const signupSource =
      sessionStorage.getItem('hatchpen_signup_source') || localStorage.getItem('hatchpen_signup_source')
    const userId = user?.id
    const isCompleted =
      (userId && localStorage.getItem(`hatchpen_onboarding_completed_${userId}`) === 'true') ||
      Boolean((user?.publicMetadata as any)?.onboardingCompleted)

    // For standard un-onboarded sign-ups, redirect to /onboarding while preserving return destination
    if (signupSource === 'standard' && !isCompleted) {
      return '/onboarding'
    }

    const saved = sessionStorage.getItem('hatchpen_auth_return_url')
    if (saved && saved.startsWith('/') && !saved.startsWith('/sso-callback')) {
      return saved
    }
    return '/'
  }

  const safeRedirect = (dest?: string) => {
    if (typeof window === 'undefined' || hasRedirectedRef.current) return
    hasRedirectedRef.current = true
    const finalDest = dest || getTargetDestination()
    try {
      sessionStorage.removeItem('hatchpen_oauth_in_flight')
      sessionStorage.removeItem('hatchpen_just_signed_up_google')
    } catch {}
    navigate({ to: (finalDest || '/') as any, replace: true })
  }

  // 3. Direct visit safety: If someone visits /sso-callback directly without OAuth parameters, redirect immediately
  useEffect(() => {
    if (isLoaded && !hadOAuthParamsOnMountRef.current && !isSignedIn) {
      navigate({ to: '/', replace: true })
    }
  }, [isLoaded, isSignedIn, navigate])

  // 4. Complete progress and trigger immediate transition as soon as Clerk confirms session
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setProgress(100)
      setStatusText('Ready. Opening your reading desk...')

      markClientSessionActive()
      router.invalidate()

      // Resolve destination using DB ground-truth
      const resolveAndRedirect = async () => {
        try {
          const profile = await getUserOnboardingStatusServerFn({ data: user.id })
          if (profile?.onboarding_completed) {
            if (typeof window !== 'undefined') {
              localStorage.setItem(`hatchpen_onboarding_completed_${user.id}`, 'true')
            }
            // Existing completed user: proceed directly to destination
            const saved = typeof window !== 'undefined' ? sessionStorage.getItem('hatchpen_auth_return_url') : null
            const target = saved && saved.startsWith('/') && !saved.startsWith('/sso-callback') ? saved : '/'
            safeRedirect(target)
            return
          }

          // Incomplete profile:
          const prefs = (profile?.preferences as Record<string, any>) || {}
          const signupSource =
            (typeof window !== 'undefined'
              ? sessionStorage.getItem('hatchpen_signup_source') || localStorage.getItem('hatchpen_signup_source')
              : null) ||
            prefs.signup_source ||
            'standard'

          if (signupSource === 'reader_gate') {
            // Reader gate user gets to keep reading immediately
            const saved = typeof window !== 'undefined' ? sessionStorage.getItem('hatchpen_auth_return_url') : null
            const target = saved && saved.startsWith('/') && !saved.startsWith('/sso-callback') ? saved : '/'
            safeRedirect(target)
            return
          }

          // Standard incomplete user must complete onboarding
          safeRedirect('/onboarding')
        } catch {
          // Fallback if DB fetch fails
          safeRedirect()
        }
      }

      resolveAndRedirect()
    }
  }, [isLoaded, isSignedIn, user, router])

  // 5. Fallback guard: in case network or Clerk callback stalls, safely transition
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      safeRedirect('/')
    }, 8000)
    return () => clearTimeout(fallbackTimer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col items-center justify-center px-6 selection:bg-transparent">
      {/* ─── Literary Branded Transition ─── */}
      <div className="flex flex-col items-center space-y-6 text-center max-w-sm w-full">
        {/* Brand Logo */}
        <div className="relative">
          <HatchpenLogo size="lg" variant="full" />
        </div>

        {/* Quiet, Bookish Messaging */}
        <div className="flex flex-col items-center space-y-1.5">
          <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[var(--ink-primary)]">
            Preparing your reading desk...
          </h2>
          <p className="font-serif italic text-xs sm:text-sm text-[var(--ink-muted)] min-h-[20px] transition-all duration-300">
            {statusText}
          </p>
        </div>

        {/* Active Animated Progress Bar with Dynamic Progress & Shimmer */}
        <div className="w-full max-w-[220px] flex flex-col items-center space-y-2">
          <div className="w-full h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden relative">
            <div
              className="h-full rounded-full bg-[var(--ink-primary)] transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-[9px] text-[var(--ink-muted)] tracking-widest uppercase">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Headless Clerk Token Processing */}
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/"
        signUpFallbackRedirectUrl={getTargetDestination()}
        continueSignUpUrl={getTargetDestination()}
        signInUrl="/"
        signUpUrl="/"
      />
    </div>
  )
}
