import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/react'
import { TellnestLoader } from './TellnestLoader'

const AUTH_STORAGE_KEY = 'tellnest_auth_in_progress'

/**
 * Triggered by any auth CTA to flag that an authentication flow is starting
 */
export function startAuthTransition() {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
    } catch {
      // Storage unavailable in private browsing mode
    }
  }
}

/**
 * ClerkAuthOverlay Component
 * Intercepts Clerk's authentication handshake, token exchange, and session hydration.
 * Replaces Clerk's generic default spinner with Tellnest's literary branded loader.
 */
export function ClerkAuthOverlay() {
  const { isLoaded, isSignedIn } = useUser()
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const search = window.location.search || ''
    const hash = window.location.hash || ''
    const isClerkExchange =
      search.includes('__clerk') ||
      hash.includes('__clerk') ||
      search.includes('redirect_url')

    const hasStoredFlag = sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true'

    if ((isClerkExchange || hasStoredFlag) && !isLoaded) {
      setShouldShow(true)
    }

    if (isLoaded) {
      // Session has resolved
      setShouldShow(false)
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [isLoaded, isSignedIn])

  if (!shouldShow) return null

  return (
    <TellnestLoader
      variant="fullscreen"
      message="Authenticating literary folio..."
      submessage="Synchronizing Tellnest author & reader profile"
    />
  )
}

export default ClerkAuthOverlay
