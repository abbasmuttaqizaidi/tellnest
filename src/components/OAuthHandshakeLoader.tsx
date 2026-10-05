import { useEffect, useState } from 'react'
import { useUser } from '@clerk/react'
import { Loader2 } from 'lucide-react'

/**
 * OAuthHandshakeLoader Component
 * Intercepts third-party OAuth redirects (such as Google Sign-in callback).
 * Replaces Clerk's raw default interstitial and development-mode screen with
 * Tellnest's branded full-page literary loader matching LIVE_INSTRUCTIONS.md.
 */
export function OAuthHandshakeLoader() {
  const { isLoaded, isSignedIn } = useUser()
  const [isHandshake, setIsHandshake] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const search = window.location.search || ''
    const hash = window.location.hash || ''
    const hasClerkParam =
      search.includes('__clerk') ||
      hash.includes('__clerk') ||
      search.includes('created_session') ||
      search.includes('status=complete') ||
      search.includes('handshake')

    if (hasClerkParam) {
      setIsHandshake(true)
      document.documentElement.classList.add('clerk-handshake-active')

      const initialShell = document.getElementById('tellnest-handshake-overlay')
      if (initialShell) {
        initialShell.style.display = 'flex'
      }
    }
  }, [])

  useEffect(() => {
    if (!isHandshake) return

    // When Clerk has completed the handshake and resolved the user session
    if (isLoaded) {
      setFadingOut(true)
      const timer = setTimeout(() => {
        setIsHandshake(false)
        setFadingOut(false)
        document.documentElement.classList.remove('clerk-handshake-active')
        const initialShell = document.getElementById('tellnest-handshake-overlay')
        if (initialShell) {
          initialShell.style.display = 'none'
        }
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, isHandshake, isSignedIn])

  if (!isHandshake) return null

  return (
    <div
      className={`fixed inset-0 z-[2147483647] bg-white dark:bg-[#090D14] flex flex-col items-center justify-center px-6 transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-5 text-center">
        {/* Brand Logo */}
        <div className="relative">
          <div className="absolute -inset-4 bg-slate-900/5 dark:bg-white/5 rounded-full blur-xl animate-pulse" />
          <img
            src="/logo.png"
            alt="Tellnest"
            className="relative h-14 w-auto object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              if (target.src.indexOf('favicon.svg') === -1) {
                target.src = '/favicon.svg'
              }
            }}
          />
        </div>

        {/* Spinner & Message */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--ink-primary)]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--ink-primary)] font-semibold">
              Authenticating Session
            </span>
          </div>
          <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-widest animate-pulse">
            Verifying credentials & establishing secure session...
          </span>
        </div>
      </div>
    </div>
  )
}

export default OAuthHandshakeLoader
