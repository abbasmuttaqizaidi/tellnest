import React, { useState, useEffect } from 'react'
import { useSignIn, useSignUp, useUser, useClerk, SignIn } from '@clerk/react'
import { X, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authReturnUrl } = useApp()
  const { isSignedIn } = useUser()
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  // Reset loading state when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setIsGoogleLoading(false)
    }
  }, [isAuthModalOpen])

  // Automatically close modal when user successfully signs in
  useEffect(() => {
    if (isSignedIn && isAuthModalOpen) {
      closeAuthModal()
    }
  }, [isSignedIn, isAuthModalOpen, closeAuthModal])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal()
      }
    }
    if (isAuthModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAuthModalOpen, closeAuthModal])

  if (!isAuthModalOpen) return null

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const targetUrl = authReturnUrl || '/'

    try {
      // 1. Wait briefly for Clerk to finish loading if needed
      if (!clerk.loaded) {
        let attempts = 0
        while (!clerk.loaded && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 150))
          attempts++
        }
      }

      // 2. Try the modern Signal API (signIn.sso)
      if (signIn && typeof (signIn as any).sso === 'function') {
        const res = await (signIn as any).sso({
          strategy: 'oauth_google',
          redirectUrl: targetUrl,
          redirectCallbackUrl: '/sso-callback',
          oidcPrompt: 'select_account',
        })
        if (!res?.error) return
        console.warn('signIn.sso reported error, trying signUp.sso fallback:', res.error)
      }

      // 3. Try signUp.sso if signIn.sso returned an error or is unavailable
      if (signUp && typeof (signUp as any).sso === 'function') {
        const res = await (signUp as any).sso({
          strategy: 'oauth_google',
          redirectUrl: targetUrl,
          redirectCallbackUrl: '/sso-callback',
          oidcPrompt: 'select_account',
        })
        if (!res?.error) return
        console.warn('signUp.sso reported error:', res.error)
      }

      // 4. Try classic Clerk client authenticateWithRedirect (clerk.client.signIn)
      const clientSignIn = clerk.client?.signIn || (typeof window !== 'undefined' ? (window as any).Clerk?.client?.signIn : null)
      if (clientSignIn && typeof clientSignIn.authenticateWithRedirect === 'function') {
        await clientSignIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: targetUrl,
          oidcPrompt: 'select_account',
        })
        return
      }

      // 5. Try classic Clerk client authenticateWithRedirect (clerk.client.signUp)
      const clientSignUp = clerk.client?.signUp || (typeof window !== 'undefined' ? (window as any).Clerk?.client?.signUp : null)
      if (clientSignUp && typeof clientSignUp.authenticateWithRedirect === 'function') {
        await clientSignUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: '/sso-callback',
          redirectUrlComplete: targetUrl,
          oidcPrompt: 'select_account',
        })
        return
      }

      // 6. Graceful fallback to openSignIn
      clerk.openSignIn({
        fallbackRedirectUrl: '/sso-callback',
        forceRedirectUrl: '/sso-callback',
      })
    } catch (err: any) {
      console.error('All OAuth redirect attempts failed:', err)
      try {
        clerk.openSignIn({
          fallbackRedirectUrl: '/sso-callback',
          forceRedirectUrl: '/sso-callback',
        })
      } catch (e) {}
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close modal"
          className="absolute top-4 right-4 rounded-full p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <div className="absolute -inset-2 bg-slate-900/5 dark:bg-white/5 rounded-full blur-md animate-pulse" />
            <img
              src="/hatchpen-logo-transparent.png"
              alt="Hatchpen"
              className="relative h-10 w-auto object-contain dark:invert"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                if (!target.src.includes('favicon.svg')) {
                  target.src = '/favicon.svg'
                }
              }}
            />
          </div>
          <h2 className="font-serif text-xl font-bold tracking-tight text-[var(--ink-primary)]">
            Sign In to Hatchpen
          </h2>
          <p className="mt-1 text-xs text-[var(--ink-muted)] max-w-xs">
            Where stories hatch and take flight. Serialized fiction, essays, and modern letters.
          </p>
        </div>

        {/* Primary Action: Direct Google Sign-In */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] font-medium text-xs hover:bg-[var(--bg-subtle)] hover:border-[var(--ink-primary)] transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
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

          {/* Toggle for Email Sign In */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <button
                type="button"
                onClick={() => setShowEmailForm(!showEmailForm)}
                className="bg-[var(--bg-surface)] px-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                {showEmailForm ? 'Hide email options' : 'or continue with email'}
              </button>
            </div>
          </div>

          {/* Collapsible Clerk Email Authentication Form */}
          {showEmailForm && (
            <div className="pt-1 animate-in fade-in duration-200">
              <SignIn
                routing="virtual"
                fallbackRedirectUrl={authReturnUrl || '/'}
                forceRedirectUrl={authReturnUrl || '/'}
                signUpFallbackRedirectUrl={authReturnUrl || '/'}
                signUpForceRedirectUrl={authReturnUrl || '/'}
                appearance={{
                  layout: {
                    unsafe_disableDevelopmentModeWarnings: true,
                  },
                  elements: {
                    header: 'hidden',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    footer: 'hidden',
                    footerAction: 'hidden',
                    socialButtonsBlockButton: 'hidden',
                    socialButtons: 'hidden',
                    dividerRow: 'hidden',
                    badge: 'hidden',
                    rootBox: '!w-full !max-w-none !bg-transparent !shadow-none',
                    cardBox: '!w-full !max-w-none !bg-transparent !shadow-none',
                    card: '!w-full !max-w-none !bg-transparent !shadow-none !border-none !p-0',
                    formButtonPrimary:
                      '!bg-[var(--ink-primary)] !text-[var(--accent-contrast)] hover:!opacity-90 !text-xs !font-semibold !rounded-lg !py-2.5',
                    formFieldInput:
                      '!rounded-lg !border-[var(--border-strong)] !bg-[var(--bg-canvas)] !text-xs !text-[var(--ink-primary)]',
                    formFieldLabel: '!text-xs !text-[var(--ink-secondary)] !font-medium',
                    identityPreviewText: '!text-xs !text-[var(--ink-secondary)]',
                    formResendCodeLink: '!text-xs !text-[var(--ink-primary)] hover:!underline',
                  },
                }}
              />
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-5 text-center text-[10px] text-[var(--ink-faint)]">
          By signing in, you agree to Hatchpen's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

export default AuthModal
