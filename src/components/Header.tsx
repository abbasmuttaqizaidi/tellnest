import React, { useState } from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  PenLine,
  Search,
  Bookmark,
  Compass,
  Bell,
  Sun,
  Moon,
  Coffee,
  Menu,
  X,
  User,
  Settings,
  BookOpen,
  LogOut,
  Building2
} from 'lucide-react'
import { SignInButton, useUser, useClerk } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { PaletteSearch, OmniSearch } from '../design-system'

const CLERK_MODAL_APPEARANCE = {
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
}

export default function Header() {
  const navigate = useNavigate()
  const { user, isSignedIn } = useUser()
  const { signOut, openSignIn } = useClerk()
  const {
    unreadNotificationCount,
    siteTheme,
    setSiteTheme
  } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [isNavSearchOpen, setIsNavSearchOpen] = useState(false)

  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  // Global Cmd+K shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Don't show regular header in focused reading mode or focused chapter editor mode
  const isReaderMode = currentPath.startsWith('/read/')
  const isEditorMode = currentPath.startsWith('/write/editor')

  if (isReaderMode || isEditorMode) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/95 backdrop-blur-md transition-colors duration-150">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2 sm:gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0">
          <Link to="/" className="group flex items-center gap-2.5 text-inherit no-underline flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] transition-transform group-hover:scale-105">
              <span className="font-mono text-xs font-bold tracking-tighter">R</span>
            </div>
            <div className={`flex flex-col ${isNavSearchOpen ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans text-xs font-extrabold tracking-widest text-[var(--ink-primary)] uppercase">RELAY</span>
                <span className="font-serif text-sm tracking-tight text-[var(--ink-secondary)] italic">Stories</span>
              </div>
              <span className="text-[9px] font-mono tracking-wider text-[var(--ink-faint)] uppercase">Folio Edition</span>
            </div>
          </Link>

          {/* Primary Desktop Navigation */}
          {!isReaderMode && (
            <nav className={`hidden ${isNavSearchOpen ? 'lg:flex' : 'md:flex'} items-center gap-1 text-[13px] font-medium text-[var(--ink-muted)]`}>
              <Link
                to="/"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath === '/' ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Home
              </Link>
              <Link
                to="/discover"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/discover') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Discover
              </Link>
              <Link
                to="/library"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/library') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Library
              </Link>
              <Link
                to="/following"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/following') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Following
              </Link>
              <Link
                to="/association"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/association') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Association
              </Link>
            </nav>
          )}
        </div>

        {/* Right Actions & Responsive Expansion Search */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end min-w-0">
          
          {/* Responsive Expansion OmniSearch on Nav Menu */}
          <div className={isNavSearchOpen ? 'flex-1 max-w-xs sm:max-w-sm md:max-w-md w-full min-w-0' : ''}>
            <OmniSearch
              expandMode="responsive"
              size="sm"
              value={navSearchQuery}
              onChange={setNavSearchQuery}
              isExpanded={isNavSearchOpen}
              onExpand={() => setIsNavSearchOpen(true)}
              onCollapse={() => setIsNavSearchOpen(false)}
              onSubmit={(q) => {
                if (q.trim()) {
                  navigate({
                    to: '/search',
                    search: { q: q.trim() } as any,
                  })
                  setIsNavSearchOpen(false)
                }
              }}
              scopes={[
                { id: 'all', label: 'All' },
                { id: 'works', label: 'Works' },
                { id: 'authors', label: 'Authors' },
                { id: 'essays', label: 'Essays' },
              ]}
              shortcut="/"
              placeholders={[
                "Search manuscripts...",
                "Search 'The Cold Perimeter'...",
                "Search 'Elena Vance'...",
                "Search by theme or tag...",
              ]}
            />
          </div>

          {/* Prominent Write CTA (Only when signed in) */}
          {isSignedIn && (
            <Link
              to="/write"
              className={`${isNavSearchOpen ? 'hidden xl:inline-flex' : 'hidden sm:inline-flex'} items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity flex-shrink-0`}
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="font-sans font-semibold tracking-wide">Write</span>
            </Link>
          )}

          {/* Notifications Link (Only when signed in) */}
          {isSignedIn && (
            <Link
              to="/notifications"
              className={`${isNavSearchOpen ? 'hidden md:flex' : 'hidden sm:flex'} relative h-8 w-8 items-center justify-center rounded border border-transparent text-[var(--ink-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--ink-primary)] transition-colors flex-shrink-0`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--ink-primary)] ring-2 ring-[var(--bg-canvas)]" />
              )}
            </Link>
          )}

          {/* Theme Quick Toggle */}
          <button
            onClick={() => setSiteTheme(siteTheme === 'dark' ? 'light' : 'dark')}
            className={`${isNavSearchOpen ? 'hidden lg:flex' : 'hidden sm:flex'} h-8 w-8 items-center justify-center rounded border border-transparent text-[var(--ink-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--ink-primary)] transition-colors flex-shrink-0`}
            title="Toggle color theme"
          >
            {siteTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Clerk Authentication & User Profile */}
          {isSignedIn ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden focus:outline-none hover:border-[var(--border-strong)] transition-colors"
                title="Account Menu"
              >
                <img
                  src={user?.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                  alt={user?.fullName || "Profile"}
                  className="h-full w-full object-cover"
                />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 shadow-xl z-50 text-xs animate-in fade-in duration-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                    <p className="font-semibold text-[var(--ink-primary)] truncate">
                      {user?.fullName || user?.firstName || 'Tellnest User'}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)] font-mono truncate">
                      @{user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'reader'}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    Your Profile
                  </Link>
                  <Link
                    to="/library"
                    className="flex items-center gap-2 px-3 py-2 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Bookmark className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    Reading Library
                  </Link>
                  <Link
                    to="/write"
                    className="flex items-center gap-2 px-3 py-2 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <PenLine className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    Writer Studio
                  </Link>
                  <Link
                    to="/association"
                    className="flex items-center gap-2 px-3 py-2 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    Business Association
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    Preferences & Settings
                  </Link>
                  <div className="my-1 border-t border-[var(--border-subtle)]" />
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openSignIn({ appearance: CLERK_MODAL_APPEARANCE })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* Mobile Navigation Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--ink-secondary)]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 space-y-2 text-sm font-medium">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            Home
          </Link>
          <Link
            to="/discover"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            Discover
          </Link>
          <Link
            to="/library"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            Library
          </Link>
          <Link
            to="/following"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            Following
          </Link>
          <Link
            to="/association"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            Business Association
          </Link>
          {isSignedIn && (
            <>
              <Link
                to="/write"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                Writer Dashboard
              </Link>
              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                Notifications
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              >
                Settings
              </Link>
            </>
          )}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            {!isSignedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  openSignIn({ appearance: CLERK_MODAL_APPEARANCE })
                }}
                className="w-full text-left py-1.5 font-semibold text-[var(--ink-primary)] hover:opacity-80 transition-opacity"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="w-full text-left py-1.5 font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Command Search Palette */}
      <PaletteSearch
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </header>
  )
}
