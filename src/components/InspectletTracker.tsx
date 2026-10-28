'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@clerk/tanstack-react-start'
import { useRouterState } from '@tanstack/react-router'
import { getInspectletClientConfigServerFn, type InspectletClientConfig } from '../server/inspectlet.ts'
import { isLocalhostEnvironment, isUserExcluded } from '../lib/inspectlet.ts'

export { isLocalhostEnvironment, isUserExcluded } from '../lib/inspectlet.ts'

let isInspectletInitialized = false

/**
 * Inspectlet Session Recording Tracker
 *
 * Rules:
 * 1. ZERO recording on localhost / local IP addresses.
 * 2. ZERO recording on /secret-adminpanel.
 * 3. ZERO recording for any user account excluded by Administrator.
 * 4. Asynchronously loads Inspectlet only when all policy checks pass.
 */
export function InspectletTracker() {
  const { user, isLoaded } = useUser()
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const [config, setConfig] = useState<InspectletClientConfig | null>(null)

  // 1. Fetch live Inspectlet configuration
  useEffect(() => {
    let isMounted = true

    // Skip network request entirely on localhost
    if (isLocalhostEnvironment()) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Inspectlet] Session recording is disabled on localhost.')
      }
      return
    }

    getInspectletClientConfigServerFn()
      .then((cfg) => {
        if (isMounted && cfg) {
          setConfig(cfg)
        }
      })
      .catch((err) => {
        console.warn('[Inspectlet] Could not retrieve recording configuration:', err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // 2. Evaluate eligibility & initialize / teardown Inspectlet
  useEffect(() => {
    // Check 1: Localhost guard
    if (isLocalhostEnvironment()) return

    // Check 2: Wait until config and auth are resolved
    if (!config || !isLoaded) return

    // Check 3: Globally enabled check & WID check
    if (!config.enabled || !config.wid) {
      teardownInspectlet()
      return
    }

    // Check 4: Secret admin panel guard
    if (pathname.startsWith('/secret-adminpanel')) {
      teardownInspectlet()
      return
    }

    // Check 5: Excluded user accounts check
    if (user && isUserExcluded(user, config.excludedIdentifiers)) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Inspectlet] Session recording excluded for user account:', user.id)
      }
      teardownInspectlet()
      return
    }

    // All checks passed -> Initialize Inspectlet
    initializeInspectlet(config.wid)

    // Tag / Identify authenticated user
    if (user && typeof window !== 'undefined' && window.__insp) {
      window.__insp.push(['identify', user.id])
      const meta: Record<string, string> = {}
      if (user.username) meta.username = user.username
      const email = user.primaryEmailAddress?.emailAddress
      if (email) meta.email = email
      if (Object.keys(meta).length > 0) {
        window.__insp.push(['tagSession', meta])
      }
    }
  }, [config, isLoaded, user, pathname])

  // 3. Track SPA route navigation transitions
  useEffect(() => {
    if (isLocalhostEnvironment()) return
    if (!isInspectletInitialized) return
    if (pathname.startsWith('/secret-adminpanel')) return

    if (typeof window !== 'undefined' && window.__insp) {
      // Notify Inspectlet of SPA page view change
      window.__insp.push(['virtualPage'])
    }
  }, [pathname])

  return null
}

/**
 * Injects the Inspectlet asynchronous script tag.
 */
function initializeInspectlet(wid: string) {
  if (typeof window === 'undefined') return
  if (document.getElementById('inspsync') || document.getElementById('inspscr')) {
    isInspectletInitialized = true
    return
  }

  window.__insp = window.__insp || []
  window.__insp.push(['wid', wid])

  const insp = document.createElement('script')
  insp.type = 'text/javascript'
  insp.async = true
  insp.id = 'inspsync'
  insp.src =
    (document.location.protocol === 'https:' ? 'https' : 'http') +
    '://cdn.inspectlet.com/inspectlet.js?wid=' +
    encodeURIComponent(wid) +
    '&r=' +
    Math.floor(Date.now() / 3600000)

  const firstScript = document.getElementsByTagName('script')[0]
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(insp, firstScript)
  } else {
    document.head.appendChild(insp)
  }

  isInspectletInitialized = true
}

/**
 * Removes Inspectlet script and clears session state if user becomes excluded.
 */
function teardownInspectlet() {
  if (typeof window === 'undefined') return
  const script = document.getElementById('inspsync') || document.getElementById('inspscr')
  if (script && script.parentNode) {
    script.parentNode.removeChild(script)
  }
  isInspectletInitialized = false
}

export default InspectletTracker
