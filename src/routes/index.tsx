import { createFileRoute, useRouter, useNavigate } from '@tanstack/react-router'
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
import { getHomePageDataServerFn } from '../server/home'
import PublicHome from '../components/home/PublicHome'
import type { HomeLoaderData } from '../components/home/LoggedInHome'
import { PublicHomeSkeleton, LoggedInHomeSkeleton } from '../components/home/HomeSkeletons'

const LoggedInHome = React.lazy(() => import('../components/home/LoggedInHome'))
import { getHeroImageSources } from '../config/hero'
import { useApp } from '../context/AppContext'
import {
  hasActiveClientSession,
  markClientSessionActive,
  clearClientSession,
} from '../lib/authSession'
import { isReligiousWork } from '../lib/discover/filters'

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
      const authUser = context?.authUser ?? (await getAuthUserServerFn())
      const currentUserId = authUser?.userId || null
      const data = await getHomePageDataServerFn({ data: { currentUserId } })

      // Double-check religious works exclusion on home page feeds
      const sanitizeFeed = (list: any[] | null | undefined) =>
        Array.isArray(list) ? list.filter((w) => !isReligiousWork(w)) : null

      return {
        ...data,
        authUser: authUser || data.authUser,
        initialTopShelf: sanitizeFeed(data.initialTopShelf),
        initialTrending: sanitizeFeed(data.initialTrending),
        initialBingeable: sanitizeFeed(data.initialBingeable),
        initialNewVoices: sanitizeFeed(data.initialNewVoices),
      }
    } catch (err) {
      console.warn('[Route Loader] getHomePageDataServerFn failed:', err)
      return {
        authUser: { userId: null, isAuthenticated: false },
        initialBootstrap: null,
        initialRecSignals: null,
        initialWorks: null,
        initialTopShelf: null,
        initialTrending: null,
        initialBingeable: null,
        initialNewVoices: null,
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
      const timeoutMs = isOAuthInFlight ? 10000 : 1500

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

  // Hook 6: Self-healing synchronization for stale loaderData on home route transitions
  const router = useRouter()
  const navigate = useNavigate()
  React.useEffect(() => {
    if (isUserLoaded && isSignedIn && !loaderData?.authUser?.isAuthenticated) {
      router.invalidate()
    } else if (isUserLoaded && !isSignedIn && loaderData?.authUser?.isAuthenticated) {
      router.invalidate()
    }
  }, [isUserLoaded, isSignedIn, loaderData?.authUser?.isAuthenticated, router])

  // Check if onboarding is currently in progress or required for this user across devices
  const isCompletedMultiDevice =
    (typeof window !== 'undefined' && user?.id && localStorage.getItem(`hatchpen_onboarding_completed_${user.id}`) === 'true') ||
    Boolean((user?.publicMetadata as any)?.onboardingCompleted) ||
    Boolean(loaderData?.authUser?.onboardingCompleted)

  const isPendingOnboarding =
    !isCompletedMultiDevice &&
    Boolean(isUserLoaded && isSignedIn)

  // Hook 7: Standard un-onboarded user redirection to /onboarding full-page
  React.useEffect(() => {
    if (isUserLoaded && isSignedIn && isPendingOnboarding) {
      const isReader =
        loaderData?.authUser?.signupSource === 'reader_gate' ||
        (typeof window !== 'undefined' &&
          (sessionStorage.getItem('hatchpen_signup_source') === 'reader_gate' ||
           localStorage.getItem('hatchpen_signup_source') === 'reader_gate'))
      if (!isReader) {
        navigate({ to: '/onboarding', replace: true })
      }
    }
  }, [isUserLoaded, isSignedIn, isPendingOnboarding, loaderData?.authUser?.signupSource, navigate])

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

  // 3. User is actively completing onboarding:
  // For standard signups with pending onboarding, render skeleton while redirecting to /onboarding
  if (isUserLoaded && isSignedIn && isPendingOnboarding) {
    const isReader =
      loaderData?.authUser?.signupSource === 'reader_gate' ||
      (typeof window !== 'undefined' &&
        (sessionStorage.getItem('hatchpen_signup_source') === 'reader_gate' ||
         localStorage.getItem('hatchpen_signup_source') === 'reader_gate'))
    if (!isReader) {
      return <LoggedInHomeSkeleton />
    }
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
