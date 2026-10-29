import { createFileRoute } from '@tanstack/react-router'
import React, { Suspense, lazy } from 'react'
import { useUser } from '@clerk/react'
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
import { getPlatformWorksServerFn, getTopShelfServerFn } from '../server/works'
import {
  LoggedInHomeSkeleton,
  PublicHomeSkeleton,
} from '../components/home/HomeSkeletons'
import type { HomeLoaderData } from '../components/home/LoggedInHome'

// Optimization 3: Lazy code-split Public and Logged-In components
// Visitors only download PublicHome; Authenticated readers only download LoggedInHome
const PublicHome = lazy(() => import('../components/home/PublicHome'))
const LoggedInHome = lazy(() => import('../components/home/LoggedInHome'))

export const Route = createFileRoute('/')({
  // In-Memory SWR (Desktop & Mobile): Keeps data fresh in RAM for 30s; instant 0ms navigation
  staleTime: 30_000,
  // Retains cached in-memory response for 5 minutes before automatic garbage collection
  gcTime: 1000 * 60 * 5,
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as string) || undefined,
  }),
  loader: async (): Promise<HomeLoaderData> => {
    try {
      const authUser = await getAuthUserServerFn()
      const isAuth = Boolean(authUser?.isAuthenticated && authUser?.userId)

      // Parallel server pre-fetch of user bootstrap, recommendation signals, platform works, and top shelf
      // Eliminates the client waterfall and ensures real DB works are ready on frame 1
      const [bootstrap, recSignals, platformWorks, topShelfWorks] = await Promise.all([
        isAuth
          ? getUserSessionBootstrapServerFn({ data: authUser!.userId! }).catch((err) => {
              console.warn('[Route Loader] Pre-fetch bootstrap failed:', err?.message || err)
              return null
            })
          : null,
        isAuth
          ? getUserRecommendationSignalsServerFn().catch((err) => {
              console.warn('[Route Loader] Pre-fetch rec signals failed:', err?.message || err)
              return null
            })
          : null,
        getPlatformWorksServerFn().catch((err) => {
          console.warn('[Route Loader] Pre-fetch platform works failed:', err?.message || err)
          return null
        }),
        getTopShelfServerFn({ data: { limit: 10 } }).catch((err) => {
          console.warn('[Route Loader] Pre-fetch top shelf failed:', err?.message || err)
          return null
        }),
      ])

      return {
        authUser: authUser || { userId: null, isAuthenticated: false },
        initialBootstrap: bootstrap,
        initialRecSignals: recSignals,
        initialWorks: platformWorks,
        initialTopShelf: topShelfWorks,
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
  const { isSignedIn, isLoaded } = useUser()

  // Explicit query param override for testing / previewing
  if (search?.view === 'signed-in') {
    return (
      <Suspense fallback={<LoggedInHomeSkeleton />}>
        <LoggedInHome forcedView="signed-in" loaderData={loaderData} />
      </Suspense>
    )
  }
  if (search?.view === 'public') {
    return (
      <Suspense fallback={<PublicHomeSkeleton />}>
        <PublicHome loaderData={loaderData} />
      </Suspense>
    )
  }

  // 1. Definite auth state from Clerk (Single Source of Truth)
  if (isLoaded) {
    if (isSignedIn) {
      return (
        <Suspense fallback={<LoggedInHomeSkeleton />}>
          <LoggedInHome loaderData={loaderData} />
        </Suspense>
      )
    } else {
      // Definitively unauthenticated: clean up session indicators
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('hatchpen_has_session')
          localStorage.removeItem('hatchpen_cached_bookmarks')
          document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
        } catch {}
      }
      return (
        <Suspense fallback={<PublicHomeSkeleton />}>
          <PublicHome loaderData={loaderData} />
        </Suspense>
      )
    }
  }

  // 2. While Clerk is hydrating on client (isLoaded === false):
  // Check server-rendered auth OR client-side session indicators
  const isServerAuthenticated = Boolean(loaderData?.authUser?.isAuthenticated)
  const isExplicitlyLoggedOut =
    typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_logged_out') === 'true'
  const hasClientSession =
    !isExplicitlyLoggedOut &&
    typeof window !== 'undefined' &&
    (window.localStorage.getItem('hatchpen_has_session') === 'true' ||
      document.cookie.includes('hatchpen_has_session=true') ||
      document.cookie.includes('__session'))

  if (!isExplicitlyLoggedOut && (isServerAuthenticated || hasClientSession)) {
    return (
      <Suspense fallback={<LoggedInHomeSkeleton />}>
        <LoggedInHome loaderData={loaderData} />
      </Suspense>
    )
  }

  // 3. Default for unauthenticated visitors
  return (
    <Suspense fallback={<PublicHomeSkeleton />}>
      <PublicHome loaderData={loaderData} />
    </Suspense>
  )
}
