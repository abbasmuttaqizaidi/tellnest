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
import type { HomeLoaderData } from '../components/home/LoggedInHome'
import { PublicHomeSkeleton, LoggedInHomeSkeleton } from '../components/home/HomeSkeletons'

const LoggedInHome = React.lazy(() => import('../components/home/LoggedInHome'))
import { getHeroImageSources } from '../config/hero'
import { getTopShelfWorks } from '../lib/recommendations/topShelf'
import { useApp } from '../context/AppContext'
import {
  hasActiveClientSession,
  markClientSessionActive,
  clearClientSession,
} from '../lib/authSession'

function HomePendingComponent() {
  if (typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search)
    const viewParam = searchParams.get('view')
    if (viewParam === 'signed-in') return <LoggedInHomeSkeleton />
    if (viewParam === 'public') return <PublicHomeSkeleton />
  }
  const isLoggedOut =
    typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_logged_out') === 'true'
  const isClientSession = !isLoggedOut && hasActiveClientSession()
  return isClientSession ? <LoggedInHomeSkeleton /> : <PublicHomeSkeleton />
}

export const Route = createFileRoute('/')({
  // In-Memory SWR (Desktop & Mobile): Keeps data fresh in RAM for 30s; instant 0ms navigation
  staleTime: 30_000,
  // Retains cached in-memory response for 5 minutes before automatic garbage collection
  gcTime: 1000 * 60 * 5,
  pendingMs: 0,
  pendingComponent: HomePendingComponent,
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
      // Note: Heavy catalog-wide getPlatformWorksServerFn is excluded from initial route loader to maximize TTFB
      const [
        bootstrap,
        recSignals,
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
        executeGetTopShelf({ limit: 10, currentUserId: authUser?.userId }).catch(() => null),
        executeGetTrendingWorks({ limit: 10 }).catch(() => null),
        executeGetBingeableWorks({ limit: 10, currentUserId: authUser?.userId }).catch(() => null),
        isAuth
          ? executeGetNewVoices({ excludeBingeable: true }).catch(() => null)
          : null,
      ])

      const initialTopShelf =
        Array.isArray(topShelfDirect) && topShelfDirect.length > 0
          ? topShelfDirect
          : null

      // Seed initialWorks from section items to give instant hero/top-shelf rendering without full table scan
      const initialWorks = [
        ...(Array.isArray(topShelfDirect) ? topShelfDirect : []),
        ...(Array.isArray(trendingDirect) ? trendingDirect : []),
        ...(Array.isArray(bingeableDirect) ? bingeableDirect : []),
      ]

      return {
        authUser: authUser || { userId: null, isAuthenticated: false },
        initialBootstrap: bootstrap,
        initialRecSignals: recSignals,
        initialWorks: initialWorks.length > 0 ? initialWorks : null,
        initialTopShelf,
        initialTrending: Array.isArray(trendingDirect) ? trendingDirect.slice(0, 10) : null,
        initialBingeable: Array.isArray(bingeableDirect) ? bingeableDirect.slice(0, 10) : null,
        initialNewVoices: Array.isArray(newVoicesDirect) ? newVoicesDirect.slice(0, 10) : null,
        catalogError: false,
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
  head: () => {
    const seo = generateMeta({
      title: 'HatchPen — A Quieter Place for Bolder Stories',
      description:
        'A genuine indie alternative to Wattpad. HatchPen connects new writers with real, engaged readers beyond vanity view counts—a home for underrated stories, hidden gems, and free serialized novels.',
      canonicalUrl: 'https://hatchpen.com/',
      keywords: [
        'wattpad alternative',
        'underrated stories',
        'serialized fiction',
        'read novels online',
        'indie literature',
        'emerging writers',
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
          'A genuine serialized fiction platform and community-driven alternative to Wattpad. HatchPen connects emerging writers with a real, dedicated audience that values original storytelling over vanity view counts and algorithmic hype. Discover underrated stories, hidden gems, and free serialized web novels read chapter by chapter with zero paywalls.',
      },
    })

    const { src: heroSrc, srcSet: heroSrcSet } = getHeroImageSources()

    return {
      meta: seo.meta,
      scripts: seo.scripts,
      links: [
        ...seo.links,
        {
          rel: 'preload',
          as: 'image',
          href: heroSrc,
          ...(heroSrcSet ? { imageSrcSet: heroSrcSet } : {}),
          imageSizes: '(min-width: 1024px) 58vw, 100vw',
          fetchPriority: 'high',
        },
      ],
    }
  },
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
    // If Clerk has verified user is signed out, immediately expire grace period and purge markers
    if (isUserLoaded && !isSignedIn && hasClientSession) {
      clearClientSession()
      setSessionGraceExpired(true)
      return
    }

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
  }, [hasClientSession, isServerAuthenticated, isSignedIn, isExplicitlyLoggedOut, isUserLoaded])

  // Hook 5: Ensure client session is marked active when user is signed in
  React.useEffect(() => {
    if (isUserLoaded && isSignedIn) {
      markClientSessionActive()
    }
  }, [isUserLoaded, isSignedIn])

  // Check if onboarding is currently in progress or required for this user across devices
  const isCompletedMultiDevice =
    (typeof window !== 'undefined' && user?.id && localStorage.getItem(`hatchpen_onboarding_completed_${user.id}`) === 'true') ||
    Boolean((user?.publicMetadata as any)?.onboardingCompleted) ||
    Boolean(loaderData?.authUser?.onboardingCompleted)

  const isPendingOnboarding =
    !isCompletedMultiDevice &&
    (isOnboardingActive ||
      (isUserLoaded &&
        isSignedIn &&
        sessionStorage.getItem('hatchpen_onboarding_active') === 'true'))

  // =========================================================================
  // ALL HOOKS HAVE BEEN EXECUTED. NOW EVALUATE VIEW BRANCHES SAFELY:
  // =========================================================================

  // 1. Explicit query param overrides (testing / previewing)
  if (search?.view === 'signed-in') {
    return (
      <React.Suspense fallback={<LoggedInHomeSkeleton />}>
        <LoggedInHome forcedView="signed-in" loaderData={loaderData} />
      </React.Suspense>
    )
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
    return (
      <React.Suspense fallback={<LoggedInHomeSkeleton />}>
        <LoggedInHome loaderData={loaderData} />
      </React.Suspense>
    )
  }

  // 5. Definitively signed out / unauthenticated by Clerk
  // When Clerk has completed client-side verification and confirms user is NOT signed in,
  // immediately render PublicHome! Never flash or linger on LoggedInHome!
  if (isUserLoaded && !isSignedIn) {
    return <PublicHome loaderData={loaderData} />
  }

  // 6. Pre-hydration / Clerk handshake in flight (!isUserLoaded):
  // If server indicated an authenticated session or client has an active session cookie,
  // show skeleton (never full LoggedInHome) while the handshake resolves.
  if (!isUserLoaded && (isServerAuthenticated || hasClientSession) && !sessionGraceExpired) {
    return <LoggedInHomeSkeleton />
  }

  // 7. True unauthenticated public visitor
  return <PublicHome loaderData={loaderData} />
}
