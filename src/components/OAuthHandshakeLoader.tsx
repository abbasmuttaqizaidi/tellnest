import { useEffect, useState } from 'react'
import { useUser } from '@clerk/react'
import { TellnestLoader } from './TellnestLoader'

/**
 * OAuthHandshakeLoader Component
 * Intercepts third-party OAuth redirects (such as Google Sign-in callback).
 * Replaces Clerk's raw default interstitial and development-mode screen with
 * Tellnest's branded full-page literary loader.
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
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, isHandshake, isSignedIn])

  if (!isHandshake) return null

  return (
    <div
      className={`fixed inset-0 z-[2147483647] bg-[var(--bg-canvas)] transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <TellnestLoader
        variant="fullscreen"
        message="Authenticating literary folio..."
        submessage="Completing secure Google session verification"
      />
    </div>
  )
}

export default OAuthHandshakeLoader
