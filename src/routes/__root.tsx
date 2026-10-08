import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { ClerkSync } from '../components/ClerkSync'
import { AuthModal } from '../components/AuthModal'
import { UserOnboardingModal } from '../components/UserOnboardingModal'
import { AppProvider } from '../context/AppContext'

import appCss from '../styles.css?url'

const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  'pk_test_aW52aXRpbmctYm9hLTg5NDIuY2xlcmsuYWNjb3VudHMuZGV2JA'

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;var saved=window.localStorage.getItem('theme')||'light';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=saved==='auto'?(prefersDark?'dark':'light'):saved;root.classList.remove('light','dark','theme-sepia');root.classList.add(resolved);root.setAttribute('data-theme',resolved);root.style.colorScheme=resolved;}catch(e){}})();`

const GLOBAL_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://hatchpen.com/#organization',
      name: 'Hatchpen',
      url: 'https://hatchpen.com',
      logo: 'https://hatchpen.com/hatchpen-app-icon.png',
      sameAs: [],
      description: 'Digital literary publishing and reader platform for serialized fiction, long-form literature, essays, and poetry.',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://hatchpen.com/#website',
      url: 'https://hatchpen.com',
      name: 'Hatchpen',
      publisher: {
        '@id': 'https://hatchpen.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://hatchpen.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
})

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Hatchpen — Writings. Beyond the Hype.',
      },
      {
        name: 'description',
        content:
          'Hatchpen is a digital literary publishing and reader platform for original fiction, serialized novels, essays, and poetry.',
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
        content: 'Hatchpen',
      },
      {
        name: 'robots',
        content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
      // Open Graph
      {
        property: 'og:site_name',
        content: 'Hatchpen',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'Hatchpen — Writings. Beyond the Hype.',
      },
      {
        property: 'og:description',
        content:
          'Digital literary publishing and reader platform for original fiction, serialized novels, essays, and poetry.',
      },
      {
        property: 'og:image',
        content: '/hatchpen-brand-board.png',
      },
      {
        property: 'og:image:alt',
        content: 'Hatchpen Literary Publishing Platform',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Hatchpen — Writings. Beyond the Hype.',
      },
      {
        name: 'twitter:description',
        content:
          'Digital literary publishing and reader platform for original fiction, serialized novels, essays, and poetry.',
      },
      {
        name: 'twitter:image',
        content: '/hatchpen-brand-board.png',
      },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
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
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
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
      <p className="text-xs text-[var(--ink-muted)] font-mono">
        {error instanceof Error ? error.message : 'An unexpected error occurred while rendering.'}
      </p>
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

function RootDocument({ children }: { children: React.ReactNode }) {
  const innerContent = (
    <AppProvider>
      <ClerkSync />
      <AuthModal />
      <UserOnboardingModal />
      <Header />
      <main className="flex-1 w-full max-w-full overflow-x-hidden pb-16 md:pb-0 bg-[var(--bg-canvas)]">
        {children}
      </main>
      <Footer />
      <MobileNav />
      <Toast />
    </AppProvider>
  )

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col font-sans antialiased text-[var(--ink-secondary)] bg-[var(--bg-canvas)] transition-colors duration-150 overflow-x-hidden w-full max-w-full">
        {CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider
            publishableKey={CLERK_PUBLISHABLE_KEY}
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
        )}
        <Scripts />
      </body>
    </html>
  )
}
