import { useEffect, useState } from 'react'
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

  // 1. Eagerly preload homepage and mark session indicator if OAuth parameters are present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasOAuthParams = window.location.search.length > 1 || window.location.hash.length > 1
      if (hasOAuthParams) {
        markClientSessionActive()
      }
    }
    router.preloadRoute({ to: '/' }).catch(() => {})
  }, [router])

  // 2. Snappy progressive feedback (fast, responsive milestones)
  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(60)
      setStatusText('Setting up your reading desk...')
    }, 120)

    const t2 = setTimeout(() => {
      setProgress(88)
      setStatusText('Opening your stories...')
    }, 280)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  // 3. Direct visit safety: If someone visits /sso-callback directly without OAuth parameters, redirect immediately
  useEffect(() => {
    if (isLoaded) {
      if (typeof window !== 'undefined') {
        const hasOAuthParams = window.location.search.length > 1 || window.location.hash.length > 1
        if (!hasOAuthParams) {
          navigate({ to: '/', replace: true })
        }
      }
    }
  }, [isLoaded, navigate])

  // 4. Complete progress and trigger immediate transition as soon as Clerk confirms session
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setProgress(100)
      setStatusText('Ready. Opening your reading desk...')

      markClientSessionActive()

      // Invalidate router so authenticated user context loads immediately on destination
      router.invalidate()

      // Fast immediate transition
      navigate({ to: '/', replace: true })
    }
  }, [isLoaded, isSignedIn, navigate, router])

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
