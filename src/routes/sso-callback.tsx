import { useEffect, useState, useRef } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback, useUser } from '@clerk/react'
import { HatchpenLogo } from '../components/HatchpenLogo'
import { generateMeta } from '../lib/seo'
import { markClientSessionActive } from '../lib/authSession'

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
  const { isLoaded, isSignedIn } = useUser()
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
    setStatusText('Opening your stories...')
  }, [])

  const hasRedirectedRef = useRef(false)

  const getTargetDestination = () => {
    if (typeof window === 'undefined') return '/'
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
      sessionStorage.removeItem('hatchpen_auth_return_url')
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
    if (isLoaded && isSignedIn) {
      setProgress(100)
      setStatusText('Ready. Opening your reading desk...')

      markClientSessionActive()
      safeRedirect()
    }
  }, [isLoaded, isSignedIn])

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
        signUpForceRedirectUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        continueSignUpUrl="/"
        signInUrl="/"
        signUpUrl="/"
      />
    </div>
  )
}
