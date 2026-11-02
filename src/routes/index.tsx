import { createFileRoute } from '@tanstack/react-router'
import React from 'react'
import { useUser, useClerk } from '@clerk/react'
import { generateMeta } from '../lib/seo'
import { getAuthUserServerFn } from '../server/auth'
import {
  getUserSessionBootstrapServerFn,
  type UserSessionBootstrap,
} from '../server/authors'
import {
  getUserRecommendationSignalsServerFn,
  type UserRecommendationSignals,
} from '../server/recommendations'
import { getPlatformWorksServerFn } from '../server/works'
import PublicHome from '../components/home/PublicHome'
import LoggedInHome, { type HomeLoaderData } from '../components/home/LoggedInHome'
import {
  hasActiveClientSession,
  markClientSessionActive,
  clearClientSession,
} from '../lib/authSession'

export const Route = createFileRoute('/')({
  // In-Memory SWR (Desktop & Mobile): Keeps data fresh in RAM for 30s; instant 0ms navigation
  staleTime: 30_000,
  // Retains cached in-memory response for 5 minutes before automatic garbage collection
  gcTime: 1000 * 60 * 5,
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as string) || undefined,
  }),
  loader: async ({ context }: { context?: { authUser?: any } }): Promise<HomeLoaderData> => {
    try {
      // Re-use authUser from root route context to eliminate redundant server calls
      const authUser = context?.authUser ?? (await getAuthUserServerFn())
      const isAuth = Boolean(authUser?.isAuthenticated && authUser?.userId)

      // Parallel server pre-fetch of user bootstrap, recommendation signals, and platform works.
      // Eliminates client waterfall while avoiding blocking the navigation on expensive non-essential queries.
      const [bootstrap, recSignals, platformWorks] = await Promise.all([
        isAuth
          ? getUserSessionBootstrapServerFn({ data: authUser!.userId! }).catch((err) => {
              console.warn('[Route Loader] Pre-fetch bootstrap failed:', err?.message || err)
              return null
            })
          : null,
        isAuth
          ? getUserRecommendationSignalsServerFn({ data: authUser!.userId! }).catch((err) => {
              console.warn('[Route Loader] Pre-fetch rec signals failed:', err?.message || err)
              return null
            })
          : null,
        getPlatformWorksServerFn().catch((err) => {
          console.warn('[Route Loader] Pre-fetch platform works failed:', err?.message || err)
          return null
        }),
      ])

      return {
        authUser: authUser || { userId: null, isAuthenticated: false },
        initialBootstrap: bootstrap,
        initialRecSignals: recSignals,
        initialWorks: platformWorks,
        initialTopShelf: null,
        catalogError: platformWorks === null,
      }
    } catch {
      return {
        authUser: { userId: null, isAuthenticated: false },
        initialBootstrap: null,
        initialRecSignals: null,
        initialWorks: null,
        initialTopShelf: null,
        catalogError: true,
      }
    }
  },
  head: () =>
    generateMeta({
      title: 'HatchPen — A Quieter Place for Bolder Stories',
      description:
        'Great writing deserves to be discovered, not buried by popularity. Explore original stories, discover emerging writers, and read beyond the hype on HatchPen.',
      canonicalUrl: 'https://hatchpen.com/',
      keywords: [
        'serialized fiction',
        'read novels online',
        'indie literature',
        'web novels',
        'stories by chapter',
        'free reading',
        'fiction community',
        'hatchpen',
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'HatchPen — A Quieter Place for Bolder Stories',
        url: 'https://hatchpen.com/',
        description:
          'Great writing deserves to be discovered, not buried by popularity. Explore original stories, discover emerging writers, and read beyond the hype on HatchPen.',
      },
    }),
  component: HomePage,
})

function HomePage() {
  const loaderData = Route.useLoaderData()
  const search = Route.useSearch()
  const clerk = useClerk()
  const { isSignedIn, isLoaded: isUserLoaded } = useUser()

  // Explicit query param override for testing / previewing
  if (search?.view === 'signed-in') {
    return <LoggedInHome forcedView="signed-in" loaderData={loaderData} />
  }
  if (search?.view === 'public') {
    return <PublicHome loaderData={loaderData} />
  }

  // Immediate optimistic logout tracker so HomePage instantly switches to PublicHome without skeleton
  const [isLoggedOut, setIsLoggedOut] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('hatchpen_just_logged_out') === 'true'
  })

  React.useEffect(() => {
    const handleLogout = () => setIsLoggedOut(true)
    window.addEventListener('hatchpen:logged-out', handleLogout)
    return () => window.removeEventListener('hatchpen:logged-out', handleLogout)
  }, [])

  // If user just initiated sign out or is explicitly logged out, render PublicHome immediately (0ms, zero skeleton)
  if (isLoggedOut || (typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_logged_out') === 'true')) {
    return <PublicHome loaderData={loaderData} />
  }

  // Check if server resolved authentication
  const isServerAuthenticated = Boolean(loaderData?.authUser?.isAuthenticated)

  // Check if client has active session markers (Clerk UAT, localStorage, etc.)
  const hasClientSession = hasActiveClientSession()

  // Real client-side Clerk JS load state
  // Notice: isUserLoaded can be true prematurely during SSR hydration when SSR emits user: null.
  // clerk.loaded is the true indicator that client-side ClerkJS has finished evaluation.
  const isClerkClientReady = Boolean(clerk?.loaded)

  // 1. If Clerk has definitively verified that the user is SIGNED IN:
  if (isUserLoaded && isSignedIn) {
    markClientSessionActive()
    return <LoggedInHome loaderData={loaderData} />
  }

  // 2. Grace period for client session verification:
  // If the server authenticated the user OR client has an active session indicator,
  // NEVER flash PublicHome while Clerk is still handshaking in the background.
  // Instead, render LoggedInHome immediately.
  const [sessionGraceExpired, setSessionGraceExpired] = React.useState(false)

  React.useEffect(() => {
    if (hasClientSession && !isServerAuthenticated && !isSignedIn) {
      // If an explicit OAuth return is in flight, allow up to 10s for slow mobile networks.
      // For general background verification, allow 5s.
      const isOAuthInFlight =
        typeof window !== 'undefined' &&
        (sessionStorage.getItem('hatchpen_oauth_in_flight') === 'true' ||
          sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true')
      const timeoutMs = isOAuthInFlight ? 10000 : 5000

      const timer = setTimeout(() => {
        if (!isSignedIn) {
          clearClientSession()
          setSessionGraceExpired(true)
        }
      }, timeoutMs)
      return () => clearTimeout(timer)
    }
  }, [hasClientSession, isServerAuthenticated, isSignedIn])

  if ((isServerAuthenticated || hasClientSession) && !sessionGraceExpired) {
    return <LoggedInHome loaderData={loaderData} />
  }

  // 3. True unauthenticated public visitor (no server session, no client indicators, or grace period expired)
  return <PublicHome loaderData={loaderData} />
}
