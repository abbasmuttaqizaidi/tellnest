import { useEffect } from 'react'
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

  useEffect(() => {
    // Once Clerk completes session establishment, record session indicator
    if (isLoaded && isSignedIn) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('hatchpen_has_session', 'true')
          document.cookie = 'hatchpen_has_session=true; path=/; max-age=31536000; SameSite=Lax'
        } catch {}

        // Fallback safety: If there are no OAuth parameters in URL (already authenticated / direct visit),
        // navigate to home to prevent staying on sso-callback.
        const hasOAuthParams = window.location.search.length > 1 || window.location.hash.length > 1
        if (!hasOAuthParams) {
          navigate({ to: '/', replace: true })
        }
      }
    }
  }, [isLoaded, isSignedIn, navigate])

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col items-center justify-center px-6 selection:bg-transparent">
      {/* ─── Literary Branded Transition ─── */}
      <div className="flex flex-col items-center space-y-6 text-center max-w-sm">
        {/* Brand Logo */}
        <div className="relative">
          <HatchpenLogo size="lg" variant="full" />
        </div>

        {/* Quiet, Bookish Messaging */}
        <div className="flex flex-col items-center space-y-2">
          <h2 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-[var(--ink-primary)]">
            Preparing your reading desk...
          </h2>
          <p className="font-serif italic text-xs sm:text-sm text-[var(--ink-muted)]">
            Gathering your stories, bookmarks, and reading progress...
          </p>
        </div>

        {/* Elegant Minimalist Accent Line */}
        <div className="w-24 h-0.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div className="w-full h-full bg-[var(--ink-primary)] origin-left animate-pulse" />
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
