import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/react'
import Header from '../components/Header'
import MobileNav from '../components/MobileNav'
import Footer from '../components/Footer'
import Toast from '../components/Toast'
import { ClerkSync } from '../components/ClerkSync'
import { AppProvider } from '../context/AppContext'

import appCss from '../styles.css?url'

const CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_CLERK_PUBLISHABLE_KEY) ||
  'pk_test_aW52aXRpbmctYm9hLTg5NDIuY2xlcmsuYWNjb3VudHMuZGV2JA'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='sepia'||stored==='auto')?stored:'light';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark','theme-sepia');if(resolved==='sepia'){root.classList.add('theme-sepia');}else{root.classList.add(resolved);}root.setAttribute('data-theme',resolved);root.style.colorScheme=(resolved==='dark'?'dark':'light');}catch(e){}})();`

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
        title: 'Relay Stories — An Elegant Digital Library & Publishing Platform',
      },
      {
        name: 'description',
        content: 'A dedicated publishing and discovery platform for original fiction, essays, serialized novels, poetry, and creative non-fiction.',
      }
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
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
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap',
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
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const innerContent = (
    <AppProvider>
      <ClerkSync />
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
