import { HeadContent, Scripts, createRootRoute, Link, useRouterState } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { ClerkSync } from '../components/ClerkSync'
import { InspectletTracker } from '../components/InspectletTracker'
import { AuthModal } from '../components/AuthModal'
import { PublicWriteModal } from '../components/PublicWriteModal'
import { UserOnboardingModal } from '../components/UserOnboardingModal'
import { MobileContestAnnouncementModal } from '../components/MobileContestAnnouncementModal'
import { AppProvider } from '../context/AppContext'
import { getAuthUserServerFn } from '../server/auth'

import appCss from '../styles.css?url'

const isProduction =
  (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD)) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production')

const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY || import.meta.env?.CLERK_PUBLISHABLE_KEY)) ||
  (typeof process !== 'undefined' && (process.env?.VITE_CLERK_PUBLISHABLE_KEY || process.env?.CLERK_PUBLISHABLE_KEY)) ||
  (isProduction ? '' : 'pk_test_aW52aXRpbmctYm9hLTg5NDIuY2xlcmsuYWNjb3VudHMuZGV2JA')

const GOOGLE_SITE_VERIFICATION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SITE_VERIFICATION) ||
  (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_SITE_VERIFICATION) ||
  ''

const BING_SITE_VERIFICATION =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BING_SITE_VERIFICATION) ||
  (typeof process !== 'undefined' && process.env?.VITE_BING_SITE_VERIFICATION) ||
  ''

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;var saved=window.localStorage.getItem('theme')||'light';if(saved==='sage'||saved==='linen'||saved==='theme-sage'||saved==='theme-linen'){saved='light';window.localStorage.setItem('theme','light');}var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=saved==='auto'?(prefersDark?'dark':'light'):saved;root.classList.remove('light','dark','theme-sepia','theme-linen','theme-sage','theme-paper');root.classList.add(resolved);if(resolved==='paper')root.classList.add('theme-paper');root.setAttribute('data-theme',resolved);root.style.colorScheme=resolved==='dark'?'dark':'light';}catch(e){}})();`

const GLOBAL_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://hatchpen.com/#organization',
      name: 'HatchPen',
      url: 'https://hatchpen.com',
      logo: 'https://hatchpen.com/icon-512.png',
      sameAs: [],
      description: 'A genuine serialized fiction platform and community-driven alternative to Wattpad. HatchPen connects emerging writers with a real, dedicated audience that values original storytelling over vanity view counts and algorithmic hype. Discover underrated stories, hidden gems, and free serialized web novels read chapter by chapter with zero paywalls.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://hatchpen.com/#website',
      url: 'https://hatchpen.com',
      name: 'HatchPen',
      alternateName: ['Hatchpen', 'Hatch Pen'],
      publisher: {
        '@id': 'https://hatchpen.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://hatchpen.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
      hasPart: [
        {
          '@type': 'WebPage',
          '@id': 'https://hatchpen.com/wattpad-alternative',
          name: 'Wattpad Alternative',
          url: 'https://hatchpen.com/wattpad-alternative',
        },
        {
          '@type': 'WebPage',
          '@id': 'https://hatchpen.com/hatchpen-hits',
          name: 'HatchPen Hits',
          url: 'https://hatchpen.com/hatchpen-hits',
        },
        {
          '@type': 'WebPage',
          '@id': 'https://hatchpen.com/writing-contests',
          name: 'Writing Contests',
          url: 'https://hatchpen.com/writing-contests',
        },
        {
          '@type': 'WebPage',
          '@id': 'https://hatchpen.com/discover',
          name: 'Discover Stories',
          url: 'https://hatchpen.com/discover',
        },
      ],
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://hatchpen.com/#nav-wattpad-alternative',
      name: 'Wattpad Alternative',
      description: 'The genuine indie Wattpad alternative for serialized fiction with zero coins, paywalls, or wait timers.',
      url: 'https://hatchpen.com/wattpad-alternative',
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://hatchpen.com/#nav-hits',
      name: 'HatchPen Hits',
      description: 'Explore the most popular, celebrated, and viral serialized web novels on HatchPen.',
      url: 'https://hatchpen.com/hatchpen-hits',
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://hatchpen.com/#nav-contests',
      name: 'Writing Contests',
      description: 'Monthly story writing contests with ₹2,000 cash prizes, verified reader likes, and free entry.',
      url: 'https://hatchpen.com/writing-contests',
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://hatchpen.com/#nav-discover',
      name: 'Discover Stories',
      description: 'Browse independent novels, serialized fiction, and curated reading shelves.',
      url: 'https://hatchpen.com/discover',
    },
    {
      '@type': 'SiteNavigationElement',
      '@id': 'https://hatchpen.com/#nav-studio',
      name: 'Writer Studio',
      description: 'Write, serialize, and publish original web novels with zero paywalls.',
      url: 'https://hatchpen.com/write',
    },
  ],
})

// In-memory client cache for root auth state to eliminate blocking 2-3s serverless roundtrips on route changes
let clientAuthUserCache: { user: any; timestamp: number } | null = null
const CLIENT_AUTH_CACHE_TTL_MS = 60_000 // 60 seconds

export function clearClientAuthUserCache() {
  clientAuthUserCache = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('hatchpen:logged-out', () => {
    clientAuthUserCache = { user: { userId: null, isAuthenticated: false }, timestamp: Date.now() }
  })
}

export const Route = createRootRoute({
  staleTime: 60_000,
  gcTime: 300_000,
  beforeLoad: async () => {
    try {
      if (typeof window !== 'undefined') {
        const now = Date.now()
        if (clientAuthUserCache && now - clientAuthUserCache.timestamp < CLIENT_AUTH_CACHE_TTL_MS) {
          return {
            authUser: clientAuthUserCache.user,
            isAuthenticated: Boolean(clientAuthUserCache.user?.isAuthenticated),
          }
        }
      }

      const authUser = await getAuthUserServerFn()

      if (typeof window !== 'undefined') {
        clientAuthUserCache = { user: authUser, timestamp: Date.now() }
      }

      return {
        authUser,
        isAuthenticated: Boolean(authUser?.isAuthenticated),
      }
    } catch {
      return {
        authUser: null,
        isAuthenticated: false,
      }
    }
  },
  loader: ({ context }) => {
    return {
      authUser: context?.authUser ?? null,
      isAuthenticated: Boolean(context?.isAuthenticated),
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      },
      {
        title: 'HatchPen — Writings. Beyond the Hype.',
      },
      {
        name: 'description',
        content:
          'Great writing deserves to be discovered, not buried by popularity. Explore original stories, discover emerging writers, and read beyond the hype on HatchPen.',
      },
      {
        name: 'keywords',
        content:
          'serialized fiction, novel writing, reading online, literature, indie authors, web novels, short stories, essays, poetry, digital publishing',
      },
      {
        name: 'theme-color',
        content: '#010611',
      },
      {
        name: 'author',
        content: 'HatchPen',
      },
      ...(GOOGLE_SITE_VERIFICATION ? [{ name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION }] : []),
      ...(BING_SITE_VERIFICATION ? [{ name: 'msvalidate.01', content: BING_SITE_VERIFICATION }] : []),
      {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
      // Open Graph
      {
        property: 'og:site_name',
        content: 'HatchPen',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'HatchPen — Writings. Beyond the Hype.',
      },
      {
        property: 'og:description',
        content:
          'Great writing deserves to be discovered, not buried by popularity. Explore original stories, discover emerging writers, and read beyond the hype on HatchPen.',
      },
      {
        property: 'og:image',
        content: '/og-image.png',
      },
      {
        property: 'og:image:alt',
        content: 'HatchPen Literary Publishing Platform',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'HatchPen — Writings. Beyond the Hype.',
      },
      {
        name: 'twitter:description',
        content:
          'Great writing deserves to be discovered, not buried by popularity. Explore original stories, discover emerging writers, and read beyond the hype on HatchPen.',
      },
      {
        name: 'twitter:image',
        content: '/og-image.png',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/site.webmanifest',
      },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: 'HatchPen Stories & Updates',
        href: 'https://hatchpen.com/rss.xml',
      },
      // Fast Auth & Backend Warmup: Preconnect critical endpoints to eliminate DNS/TLS latency
      {
        rel: 'preconnect',
        href: 'https://accounts.google.com',
      },
      {
        rel: 'dns-prefetch',
        href: 'https://accounts.google.com',
      },
      {
        rel: 'preconnect',
        href: 'https://clerk.com',
      },
      {
        rel: 'dns-prefetch',
        href: 'https://clerk.com',
      },
      {
        rel: 'preconnect',
        href: 'https://img.clerk.com',
      },
      {
        rel: 'preconnect',
        href: 'https://amplbczsaqtleoshttsb.supabase.co',
      },
      {
        rel: 'preconnect',
        href: 'https://res.cloudinary.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        as: 'style',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&family=Outfit:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@600&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&family=Outfit:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@600&display=swap',
        media: 'print',
        onLoad: "this.media='all'",
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
    scripts: [
      {
        children: THEME_INIT_SCRIPT,
      },
      {
        type: 'application/ld+json',
        children: GLOBAL_JSON_LD,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="py-24 px-4 max-w-xl mx-auto text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-10 w-10 rounded-full border border-[var(--border-strong)] flex items-center justify-center font-mono text-sm font-bold text-[var(--ink-primary)]">
          404
        </div>
      </div>
      <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">Folio Not Found</h2>
      <p className="text-xs text-[var(--ink-muted)]">The literary work, author archive, or page you requested could not be located.</p>
      <Link to="/" className="inline-block rounded-md border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline">
        Return to Reading Catalog
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="py-24 px-4 max-w-xl mx-auto text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-10 w-10 rounded-full border border-[var(--border-strong)] flex items-center justify-center font-mono text-sm font-bold text-[var(--ink-primary)]">
          !
        </div>
      </div>
      <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">Something Went Wrong</h2>
      <p className="text-xs text-[var(--ink-muted)] font-mono text-red-600 dark:text-red-400 break-words">
        {error instanceof Error ? error.message : 'An unexpected error occurred while rendering.'}
      </p>
      {error instanceof Error && error.stack && (
        <pre className="text-[10px] text-left overflow-auto max-h-48 p-3 rounded bg-[var(--bg-subtle)] font-mono text-[var(--ink-muted)]">
          {error.stack}
        </pre>
      )}
      <Link
        to="/"
        className="inline-block rounded-md border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity no-underline"
      >
        Return to Reading Catalog
      </Link>
    </div>
  ),
  shellComponent: RootDocument,
})

function NavigationProgressBar() {
  const isNavigating = useRouterState({ select: (s) => s.status === 'pending' })
  if (!isNavigating) return null

  return (
    <div
      role="progressbar"
      aria-label="Loading page..."
      className="fixed top-0 left-0 right-0 z-[2147483647] h-[2.5px] pointer-events-none overflow-hidden bg-black/5 dark:bg-white/5"
    >
      <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-[#B94F37] to-transparent shadow-[0_0_10px_#B94F37] animate-nav-progress" />
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState()
  const rootData = Route.useLoaderData()
  const pathname = routerState.location.pathname
  const isHomePage = pathname === '/' || pathname === ''

  // Seed client auth user cache synchronously upon initial hydration
  if (typeof window !== 'undefined' && rootData?.authUser && !clientAuthUserCache) {
    clientAuthUserCache = { user: rootData.authUser, timestamp: Date.now() }
  }

  const innerContent = (
    <AppProvider>
      <NavigationProgressBar />
      <ClerkSync />
      <InspectletTracker />
      <AuthModal />
      <PublicWriteModal />
      <UserOnboardingModal authUser={rootData?.authUser} />
      <MobileContestAnnouncementModal />
      <Header serverAuthenticated={Boolean(rootData?.isAuthenticated)} />
      <main className="flex-1 w-full max-w-full bg-[var(--bg-canvas)]">
        {children}
      </main>
      <Footer />
      <Toast />
    </AppProvider>
  )

  const bodyContent = CLERK_PUBLISHABLE_KEY ? (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignInUrl="/"
      afterSignUpUrl="/"
      signInUrl="/"
      signUpUrl="/"
      appearance={{
        variables: {
          colorPrimary: '#010611',
          colorText: '#010611',
          colorTextSecondary: '#64748B',
          colorBackground: '#FFFFFF',
          colorInputBackground: '#F8FAFC',
          colorInputText: '#010611',
          borderRadius: '0.5rem',
          fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        },
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
        elements: {
          modalBackdrop: '!flex !items-center !justify-center !p-4',
          modalContent: '!m-auto !my-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
          rootBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
          cardBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
          card: '!max-w-[380px] !w-full !m-auto',
          footer: 'hidden',
          footerAction: 'hidden',
          badge: 'hidden',
        },
      }}
    >
      {innerContent}
    </ClerkProvider>
  ) : (
    innerContent
  )

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased text-[var(--ink-secondary)] bg-[var(--bg-canvas)] overflow-x-clip w-full max-w-full">
        {bodyContent}
        <Scripts />
      </body>
    </html>
  )
}
