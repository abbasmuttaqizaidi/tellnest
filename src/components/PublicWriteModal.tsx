import React, { useEffect, useState } from 'react'
import { useSignIn, useSignUp, useClerk, useUser } from '@clerk/react'
import { X, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

export function PublicWriteModal() {
  const { isPublicWriteModalOpen, closePublicWriteModal } = useApp()
  const { isSignedIn } = useUser()
  const { isLoaded, signIn, signUp } = useSignIn()
  const clerk = useClerk()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Auto-close if already signed in
  useEffect(() => {
    if (isSignedIn && isPublicWriteModalOpen) {
      closePublicWriteModal()
    }
  }, [isSignedIn, isPublicWriteModalOpen, closePublicWriteModal])

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPublicWriteModalOpen) {
        closePublicWriteModal()
      }
    }
    if (isPublicWriteModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPublicWriteModalOpen, closePublicWriteModal])

  if (!isPublicWriteModalOpen) return null

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    const targetPath = '/write'
    const redirectUrl = new URL('/sso-callback', origin).toString()
    const redirectUrlComplete = new URL(targetPath, origin).toString()

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hatchpen_just_signed_up_google', 'true')
      }

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

      throw new Error('Clerk OAuth redirect handler is unavailable.')
    } catch (err: any) {
      console.error('[Google OAuth] Direct redirect failed, attempting signUp fallback:', err)
      try {
        const client = clerk.client || (typeof window !== 'undefined' ? (window as any).Clerk?.client : null)
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
      } catch (fallbackErr) {
        console.error('[Google OAuth] Fallback signUp redirect also failed:', fallbackErr)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePublicWriteModal()
      }}
    >
      <div
        className="relative w-full max-w-[360px] rounded-2xl bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 p-5 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="write-modal-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={closePublicWriteModal}
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Headline */}
        <h3
          id="write-modal-title"
          className="font-serif text-[20px] font-bold text-[#18181B] dark:text-white tracking-tight pr-6 leading-snug"
        >
          Time to shine ✨
        </h3>

        {/* Subtext */}
        <p className="text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed mt-1.5">
          Write your first story and find a dedicated audience. HatchPen gives new voices direct visibility with real readers.
        </p>

        {/* Single-Click Google OAuth CTA */}
        <button
          type="button"
          disabled={isGoogleLoading}
          onClick={handleGoogleLogin}
          className="w-full mt-4 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] font-medium text-[13px] hover:opacity-90 active:scale-[0.99] transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
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
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.98 0 12c0 2.02.46 3.84 1.26 5.43l4.02-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Continue with Google to Write</span>
            </>
          )}
        </button>

        {/* Micro footer hint */}
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center mt-2.5 font-normal">
          Free to write · No fees · Takes 10 seconds
        </p>
      </div>
    </div>
  )
}

export default PublicWriteModal
