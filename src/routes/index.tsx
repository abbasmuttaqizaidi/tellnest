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
import {
  getPlatformWorksServerFn,
  executeGetTopShelf,
  executeGetTrendingWorks,
  executeGetBingeableWorks,
  executeGetNewVoices,
} from '../server/works'
import PublicHome from '../components/home/PublicHome'
import LoggedInHome, { type HomeLoaderData, LoggedInHomeSkeleton } from '../components/home/LoggedInHome'
import { getTopShelfWorks } from '../lib/recommendations/topShelf'
import { useApp } from '../context/AppContext'
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
      const isOnboarded = Boolean(authUser?.onboardingCompleted)

      // Parallel server pre-fetch of section data (strictly capped at 10 items per section with memory cache!)
      const [
        bootstrap,
        recSignals,
        platformWorks,
        topShelfDirect,
        trendingDirect,
        bingeableDirect,
        newVoicesDirect,
      ] = await Promise.all([
        isAuth && isOnboarded
          ? getUserSessionBootstrapServerFn({ data: authUser!.userId! }).catch((err) => {
              console.warn('[Route Loader] Pre-fetch bootstrap failed:', err?.message || err)
              return null
            })
          : null,
        isAuth && isOnboarded
          ? getUserRecommendationSignalsServerFn({ data: authUser!.userId! }).catch((err) => {
              console.warn('[Route Loader] Pre-fetch rec signals failed:', err?.message || err)
              return null
            })
          : null,
        getPlatformWorksServerFn().catch((err) => {
          console.warn('[Route Loader] Pre-fetch platform works failed:', err?.message || err)
          return null
        }),
        executeGetTopShelf({ limit: 10, currentUserId: authUser?.userId }).catch(() => null),
        executeGetTrendingWorks({ limit: 10 }).catch(() => null),
        executeGetBingeableWorks({ limit: 10, currentUserId: authUser?.userId }).catch(() => null),
        isAuth
          ? executeGetNewVoices({ excludeBingeable: true }).catch(() => null)
          : null,
      ])

      const initialTopShelf =
        (Array.isArray(topShelfDirect) && topShelfDirect.length > 0)
          ? topShelfDirect
          : (Array.isArray(platformWorks) && platformWorks.length > 0
              ? getTopShelfWorks(platformWorks, {
                  limit: 10,
                  currentUserId: authUser?.userId,
                })
              : null)

      return {
        authUser: authUser || { userId: null, isAuthenticated: false },
        initialBootstrap: bootstrap,
        initialRecSignals: recSignals,
        initialWorks: platformWorks,
        initialTopShelf,
        initialTrending: Array.isArray(trendingDirect) ? trendingDirect.slice(0, 10) : null,
        initialBingeable: Array.isArray(bingeableDirect) ? bingeableDirect.slice(0, 10) : null,
        initialNewVoices: Array.isArray(newVoicesDirect) ? newVoicesDirect.slice(0, 10) : null,
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
  const { isSignedIn, isLoaded: isUserLoaded, user } = useUser()
  const { isOnboardingActive } = useApp()

  // Hook 1: Immediate optimistic logout tracker so HomePage instantly switches to PublicHome without skeleton
  const [isLoggedOut, setIsLoggedOut] = React.useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_logged_out') === 'true'
  })

  // Hook 2: Logout event listener
  React.useEffect(() => {
    const handleLogout = () => setIsLoggedOut(true)
    window.addEventListener('hatchpen:logged-out', handleLogout)
    return () => window.removeEventListener('hatchpen:logged-out', handleLogout)
  }, [])

  // Hook 3: Session grace period expiration state
  const [sessionGraceExpired, setSessionGraceExpired] = React.useState(false)

  // Derived state & markers (strictly synchronous computations, NO hooks)
  const isExplicitlyLoggedOut =
    isLoggedOut || (typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_logged_out') === 'true')
  const isServerAuthenticated = Boolean(loaderData?.authUser?.isAuthenticated)
  const hasClientSession = hasActiveClientSession()

  // Hook 4: Active session verification grace timer
  React.useEffect(() => {
    if (hasClientSession && !isServerAuthenticated && !isSignedIn && !isExplicitlyLoggedOut) {
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
  }, [hasClientSession, isServerAuthenticated, isSignedIn, isExplicitlyLoggedOut])

  // Hook 5: Ensure client session is marked active when user is signed in
  React.useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      markClientSessionActive()
    }
  }, [isUserLoaded, isSignedIn])

  // Check if onboarding is currently in progress or required for this user
  const isPendingOnboarding =
    isOnboardingActive ||
    (isUserLoaded &&
      isSignedIn &&
      typeof window !== 'undefined' &&
      user?.id &&
      localStorage.getItem(`hatchpen_onboarding_completed_${user.id}`) !== 'true' &&
      sessionStorage.getItem('hatchpen_onboarding_active') === 'true')

  // =========================================================================
  // ALL HOOKS HAVE BEEN EXECUTED. NOW EVALUATE VIEW BRANCHES SAFELY:
  // =========================================================================

  // 1. Explicit query param overrides (testing / previewing)
  if (search?.view === 'signed-in') {
    return <LoggedInHome forcedView="signed-in" loaderData={loaderData} />
  }
  if (search?.view === 'public') {
    return <PublicHome loaderData={loaderData} />
  }

  // 2. Explicit user logout (0ms instant switch, zero skeleton)
  if (isExplicitlyLoggedOut) {
    return <PublicHome loaderData={loaderData} />
  }

  // 3. User is actively completing onboarding modal:
  // Render lightweight skeleton backdrop with ZERO background recommendation API calls!
  if (isUserLoaded && isSignedIn && isPendingOnboarding) {
    return <LoggedInHomeSkeleton />
  }

  // 4. Definitively signed in by Clerk
  if (isUserLoaded && isSignedIn) {
    return <LoggedInHome loaderData={loaderData} />
  }

  // 5. Server authenticated or client session indicator active within grace window
  if ((isServerAuthenticated || hasClientSession) && !sessionGraceExpired) {
    return <LoggedInHome loaderData={loaderData} />
  }

  // 6. True unauthenticated public visitor
  return <PublicHome loaderData={loaderData} />
}
