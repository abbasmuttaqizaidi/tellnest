import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useSignIn, useSignUp, useUser, useClerk } from '@clerk/react'
import { Loader2, ArrowRight, BookOpen, PenTool, CheckCircle2, LogOut } from 'lucide-react'
import { HatchpenLogo } from '../components/HatchpenLogo'
import { generateMeta } from '../lib/seo'

interface LoginSearch {
  redirect_url?: string
  returnUrl?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect_url: (search.redirect_url as string) || (search.returnUrl as string) || undefined,
  }),
  head: () =>
    generateMeta({
      title: 'Sign In to HatchPen',
      description:
        'Sign in to your HatchPen account to read serialized fiction, bookmark manuscripts, and manage your writer desk.',
      canonicalUrl: 'https://hatchpen.com/login',
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Sign In to HatchPen',
        url: 'https://hatchpen.com/login',
        description:
          'Sign in to your HatchPen account to read serialized fiction, bookmark manuscripts, and manage your writer desk.',
      },
    }),
  component: LoginPage,
})

export default function LoginPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { isSignedIn, isLoaded, user } = useUser()
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sanitizeTargetPath = (url?: string | null): string => {
    if (!url) return '/'
    const trimmed = url.trim()
    if (
      !trimmed ||
      trimmed === 'sign-in' ||
      trimmed === 'sign-up' ||
      trimmed === '/sign-in' ||
      trimmed === '/sign-up' ||
      trimmed === '/login' ||
      trimmed.startsWith('/sign-in') ||
      trimmed.startsWith('/sign-up') ||
      trimmed.startsWith('/login') ||
      trimmed.startsWith('/sso-callback')
    ) {
      return '/'
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  const targetPath = sanitizeTargetPath(search.redirect_url || search.returnUrl)

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setErrorMessage(null)
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hatchpen.com'
    const redirectUrl = new URL('/sso-callback', origin).toString()
    const redirectUrlComplete = new URL(targetPath, origin).toString()

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hatchpen_just_signed_up_google', 'true')
      }

      // Ensure Clerk is loaded
      const clerkObj = typeof window !== 'undefined' ? (window as any).Clerk : null
      if (!clerk.loaded && !clerkObj?.loaded) {
        let attempts = 0
        while (!clerk.loaded && !clerkObj?.loaded && attempts < 25) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }
      }

      const client = clerk.client || (typeof window !== 'undefined' ? (window as any).Clerk?.client : null)

      if (signIn && typeof signIn.authenticateWithRedirect === 'function') {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        })
        return
      }

      if (client?.signIn && typeof client.signIn.authenticateWithRedirect === 'function') {
        await client.signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        })
        return
      }

      if (signUp && typeof signUp.authenticateWithRedirect === 'function') {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        })
        return
      }

      if (client?.signUp && typeof client.signUp.authenticateWithRedirect === 'function') {
        await client.signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl,
          redirectUrlComplete,
        })
        return
      }

      throw new Error('Sign-in provider is unavailable. Please try again.')
    } catch (err: any) {
      console.error('[Login] Google redirect failed:', err)
      setErrorMessage(err?.message || 'Unable to connect with Google. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('hatchpen_has_session')
        document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch {}
    }
    await clerk.signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[var(--bg-canvas)]">
      <div className="w-full max-w-md space-y-8 bg-[var(--bg-surface)] p-8 sm:p-10 rounded-2xl border border-[var(--border-subtle)] shadow-xl transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="inline-block mb-4 no-underline">
            <HatchpenLogo size="lg" variant="full" />
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
            Sign In to HatchPen
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] max-w-sm">
            Access your serialized library, bookmarked chapters, and creator desk.
          </p>
        </div>

        {/* State A: User is already signed in */}
        {isLoaded && isSignedIn && user ? (
          <div className="space-y-6 pt-2">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-semibold text-[var(--ink-primary)]">
                  You are currently signed in
                </p>
                <p className="text-[var(--ink-muted)] mt-0.5 truncate">
                  {user.fullName || user.username || user.primaryEmailAddress?.emailAddress || 'HatchPen Member'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {targetPath && targetPath !== '/' ? (
                <Link
                  to={targetPath as any}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs sm:text-sm font-medium hover:opacity-90 transition-all shadow-xs no-underline"
                >
                  <span>Continue to destination</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}

              <Link
                to="/discover"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs sm:text-sm font-medium hover:opacity-90 transition-all shadow-xs no-underline"
              >
                <BookOpen className="h-4 w-4" />
                <span>Explore Stories</span>
              </Link>

              <Link
                to="/write"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] text-xs sm:text-sm font-medium transition-all no-underline"
              >
                <PenTool className="h-4 w-4" />
                <span>Creator Studio</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* State B: Visitor sign-in form */
          <div className="space-y-6 pt-2">
            {errorMessage ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 text-xs text-red-700 dark:text-red-300 text-center">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="button"
              disabled={isGoogleLoading}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] font-medium text-xs sm:text-sm hover:bg-[var(--bg-subtle)] hover:border-[var(--ink-primary)] transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[var(--ink-primary)]" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.42l4.02-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              )}
              <span className="font-medium">
                {isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>

            <div className="pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--ink-muted)] space-y-2">
              <p>
                By signing in, you agree to HatchPen's literary publishing guidelines and community standards.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px]">
                <Link to="/discover" className="hover:text-[var(--ink-primary)] underline underline-offset-4">
                  Browse Stories
                </Link>
                <span>•</span>
                <Link to="/pricing" className="hover:text-[var(--ink-primary)] underline underline-offset-4">
                  Free Platform Access
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
