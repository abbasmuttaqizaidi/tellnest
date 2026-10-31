import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AuthenticateWithRedirectCallback, useUser } from '@clerk/react'
import { HatchpenLogo } from '../components/HatchpenLogo'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/sso-callback')({
  head: () =>
    generateMeta({
      title: 'Preparing your reading desk — HatchPen',
      noindex: true,
    }),
  component: SSOCallbackPage,
})

export default function SSOCallbackPage() {
  const navigate = useNavigate()
  const { isLoaded, isSignedIn } = useUser()
  const [progress, setProgress] = useState(18)
  const [statusText, setStatusText] = useState('Connecting to HatchPen...')

  // 1. Progressive stage feedback so the loader never looks static or hung
  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(45)
      setStatusText('Validating credentials...')
    }, 350)

    const t2 = setTimeout(() => {
      setProgress(72)
      setStatusText('Setting up your reading desk...')
    }, 850)

    const t3 = setTimeout(() => {
      setProgress(88)
      setStatusText('Gathering your stories and reading progress...')
    }, 1600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  // 2. Direct visit safety: If someone visits /sso-callback without OAuth parameters
  useEffect(() => {
    if (isLoaded) {
      if (typeof window !== 'undefined') {
        const hasOAuthParams = window.location.search.length > 1 || window.location.hash.length > 1
        if (!hasOAuthParams && !isSignedIn) {
          const timeout = setTimeout(() => {
            navigate({ to: '/', replace: true })
          }, 2500)
          return () => clearTimeout(timeout)
        }
      }
    }
  }, [isLoaded, isSignedIn, navigate])

  // 3. Complete progress and trigger immediate transition as soon as Clerk confirms session
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setProgress(100)
      setStatusText('Ready. Opening your reading desk...')

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('hatchpen_has_session', 'true')
          document.cookie = 'hatchpen_has_session=true; path=/; max-age=31536000; SameSite=Lax'
        } catch {}
      }

      // Fast immediate transition without waiting for redundant idle delay
      const timer = setTimeout(() => {
        navigate({ to: '/', replace: true })
      }, 180)

      return () => clearTimeout(timer)
    }
  }, [isLoaded, isSignedIn, navigate])

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
