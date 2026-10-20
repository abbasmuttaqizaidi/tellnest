import React, { useState, useRef, useEffect } from 'react'
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
  Plus,
  Users,
  ArrowRight,
  Home,
} from 'lucide-react'
import { useUser, useClerk } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { PaletteSearch, OmniSearch, Drawer } from '../design-system'
import { UnisexAvatar, UnisexAvatarIcon } from './UnisexAvatar'
import { HatchpenLogo } from './HatchpenLogo'

export interface HeaderProps {
  serverAuthenticated?: boolean
}

export default function Header({ serverAuthenticated }: HeaderProps = {}) {
  const navigate = useNavigate()
  const { user, isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const {
    unreadNotificationCount,
    siteTheme,
    setSiteTheme,
    openAuthModal,
    openPublicWriteModal,
    customAvatarUrl,
    genres,
    showToast,
    savedWorkIds,
  } = useApp()
  const activeAvatar = customAvatarUrl || user?.imageUrl
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close desktop user avatar menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!userMenuOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navSearchQuery, setNavSearchQuery] = useState('')
  const [isNavSearchOpen, setIsNavSearchOpen] = useState(false)

  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

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

  const isHomePage = currentPath === '/'
  const search = (routerState.location.search || {}) as Record<string, any>
  const searchView = search?.view || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : undefined)

  const isPublicHome = React.useMemo(() => {
    if (currentPath !== '/') return false
    if (searchView === 'public') return true
    if (searchView === 'signed-in') return false
    if (serverAuthenticated) return false
    if (isSignedIn) return false
    if (typeof window !== 'undefined' && window.localStorage.getItem('hatchpen_has_session') === 'true') {
      return false
    }
    return true
  }, [currentPath, searchView, serverAuthenticated, isSignedIn])

  const [hasScrolled, setHasScrolled] = useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 15)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (isReaderMode || isEditorMode) {
    return null
  }

  // Dual navigation styling:
  // 1. Public Home: Atmospheric ivory hero background with transparent top and frosted ivory/dark glass on scroll
  // 2. Logged-in / App: Clean monochrome black & white palette. Sticky top-0 in document flow (never overlaps content).
  //    - Top state: crisp white/black background with subtle border
  //    - Scrolled state: frosted white/black glass (bg-white/95 dark:bg-black/95) with subtle elevation shadow
  const headerClasses = isPublicHome
    ? hasScrolled
      ? 'hidden md:block fixed top-0 left-0 right-0 z-40 w-full border-b border-[#D7CFC3]/50 dark:border-neutral-800 bg-[#F2EDE3]/90 dark:bg-[#121316]/90 backdrop-blur-md shadow-xs transition-all duration-200'
      : 'hidden md:block absolute top-0 left-0 right-0 z-40 w-full border-b border-transparent bg-transparent transition-all duration-200'
    : hasScrolled
      ? 'sticky top-0 z-40 w-full border-b border-neutral-200/90 dark:border-neutral-800 bg-white/95 dark:bg-black/95 backdrop-blur-md shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.4)] transition-all duration-200'
      : 'sticky top-0 z-40 w-full border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/90 dark:bg-black/90 backdrop-blur-sm transition-all duration-200'

  return (
    <>
      <header className={headerClasses}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2 sm:gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0">
          <Link to="/" className="group flex items-center text-inherit no-underline flex-shrink-0">
            <HatchpenLogo
              size="sm"
              variant="full"
              className={isNavSearchOpen ? 'hidden md:inline-flex' : 'inline-flex'}
            />
          </Link>

          {/* Primary Desktop Navigation */}
          {!isReaderMode && (
            <nav className={`hidden ${isNavSearchOpen ? 'lg:flex' : 'md:flex'} items-center gap-1 text-[13px] font-medium text-[var(--ink-muted)]`}>
              {isSignedIn && (
                <Link
                  to="/"
                  className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                    isHomePage ? 'text-[var(--ink-primary)] font-semibold' : ''
                  }`}
                >
                  Home
                </Link>
              )}
              <Link
                to="/discover"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/discover') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Discover
              </Link>
              <Link
                to={isSignedIn ? "/write" : "#"}
                onClick={(e) => {
                  if (!isSignedIn) {
                    e.preventDefault()
                    openPublicWriteModal()
                  }
                }}
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/write') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Write
              </Link>

              {isSignedIn && (
                <>
                  <Link
                    to="/library"
                    className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] inline-flex items-center gap-1.5 ${
                      currentPath.startsWith('/library') ? 'text-[var(--ink-primary)] font-semibold' : ''
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Library</span>
                    {savedWorkIds.length > 0 && (
                      <span className="rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-mono leading-none">
                        {savedWorkIds.length}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/following"
                    className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                      currentPath.startsWith('/following') ? 'text-[var(--ink-primary)] font-semibold' : ''
                    }`}
                  >
                    Following
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right Actions & Responsive Expansion Search */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end min-w-0">
          
          {/* Responsive Expansion OmniSearch on Nav Menu (Hidden on public homepage) */}
          {!isPublicHome && (
            <div className={isNavSearchOpen ? 'flex-1 max-w-xs sm:max-w-sm md:max-w-md w-full min-w-0' : ''}>
              <OmniSearch
                expandMode="responsive"
                size="sm"
                iconButtonClassName="bg-white text-black border border-neutral-200/80 shadow-xs hover:bg-neutral-100 hover:text-black"
                value={navSearchQuery}
                onChange={setNavSearchQuery}
                isExpanded={isNavSearchOpen}
                onExpand={() => setIsNavSearchOpen(true)}
                onCollapse={() => setIsNavSearchOpen(false)}
                onSubmit={(q) => {
                  const trimmed = q.trim()
                  if (!trimmed) return
                  if (trimmed.length < 5) {
                    showToast('Please enter at least 5 letters to search.')
                    return
                  }
                  navigate({
                    to: '/search',
                    search: {
                      q: trimmed,
                    } as any,
                  })
                  setIsNavSearchOpen(false)
                }}
                shortcut={false}
                showShortcut={false}
                placeholders={[
                  "Search manuscripts...",
                  "Search 'A Winter in Kyoto'...",
                  "Search 'Elena Vance'...",
                  "Search by theme or tag...",
                ]}
              />
            </div>
          )}

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


          {/* Dark Mode Quick Toggle (Hidden on public homepage) */}
          {!isPublicHome && (
            <button
              onClick={() => setSiteTheme(siteTheme === 'dark' ? 'light' : 'dark')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black dark:bg-neutral-900 dark:text-white border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex-shrink-0 cursor-pointer"
              title={mounted && siteTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {mounted && siteTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-white stroke-[2.2]" />
              ) : (
                <Moon className="h-4 w-4 text-black stroke-[2.2]" />
              )}
            </button>
          )}
          {!isLoaded ? (
            <div className="hidden md:block h-8 w-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] animate-pulse shrink-0" />
          ) : isSignedIn ? (
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden focus:outline-none hover:ring-2 hover:ring-[var(--border-strong)] transition-all cursor-pointer border border-[var(--border-subtle)]"
                title="Account Menu"
              >
                <UnisexAvatar
                  src={activeAvatar}
                  name={user?.fullName || user?.firstName}
                  size="sm"
                />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 shadow-xl z-50 text-xs animate-in fade-in duration-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="flex items-center gap-2.5 px-3 py-2 border-b border-[var(--border-subtle)]">
                    <UnisexAvatar
                      src={activeAvatar}
                      name={user?.fullName || user?.firstName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--ink-primary)] truncate">
                        {user?.fullName || user?.firstName || 'Hatchpen Member'}
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] font-mono truncate">
                        @{user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'reader'}
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Creator Workspace (Hidden on mobile screen, moved to Nav Menu) */}
                  <div className="hidden md:block py-1">
                    <p className="px-3 pt-1.5 pb-0.5 text-[9.5px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                      Creator Workspace
                    </p>
                    <Link
                      to="/write"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <PenLine className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Studio Dashboard</span>
                    </Link>
                    <Link
                      to="/write/new"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Create New Work</span>
                    </Link>
                  </div>

                  <div className="hidden md:block border-t border-[var(--border-subtle)]" />

                  {/* Section 2: Reader Shelf */}
                  <div className="py-1">
                    <p className="px-3 pt-1.5 pb-0.5 text-[9.5px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                      Your Reading
                    </p>
                    <Link
                      to="/library"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>My Library (Saved & History)</span>
                    </Link>
                    <Link
                      to="/following"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Users className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Author Dispatches</span>
                    </Link>
                  </div>

                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Section 3: Profile & Settings */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <div className="h-3.5 w-3.5 rounded-full overflow-hidden shrink-0">
                        <UnisexAvatarIcon />
                      </div>
                      <span>Author Profile</span>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Preferences & Settings</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('relay_auth_hint')
                        }
                        setUserMenuOpen(false)
                        signOut()
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="inline-flex items-center justify-center rounded-full bg-white text-[#18181B] border border-neutral-200/80 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium hover:bg-neutral-100 transition-all shadow-xs cursor-pointer"
              >
                <span>Log in</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                <span>Join HatchPen</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Navigation Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Right Navigation Drawer */}
    <Drawer
      isOpen={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      side="right"
      title="Navigation"
      className="w-[85vw] max-w-[320px]"
    >
        <div className="flex flex-col h-full space-y-3 text-[13px] font-medium">
          {isSignedIn && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <UnisexAvatar
                src={activeAvatar}
                name={user?.fullName || user?.firstName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-[var(--ink-primary)] truncate">
                  {user?.fullName || user?.firstName || 'HatchPen Reader'}
                </p>
                <p className="text-[10px] text-[var(--ink-muted)] font-mono truncate">
                  @{user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'reader'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            {!isSignedIn && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  openPublicWriteModal()
                }}
                className="flex items-center gap-2 w-full text-left py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
              >
                <PenLine className="h-4 w-4" />
                <span>Write</span>
              </button>
            )}

            {isSignedIn && (
              <>
                <Link
                  to="/following"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>Following</span>
                </Link>

                <Link
                  to="/notifications"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  <span className="flex-1">Notifications</span>
                  {unreadNotificationCount > 0 && (
                    <span className="text-[10px] font-mono font-semibold bg-rose-500 text-white px-1.5 py-0.5 rounded-full">
                      {unreadNotificationCount}
                    </span>
                  )}
                </Link>
              </>
            )}
          </div>

          {/* Section: Creator Workspace (Mobile Nav Menu) */}
          {isSignedIn && (
            <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-0.5">
              <p className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Creator Workspace
              </p>
              <Link
                to="/write"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <PenLine className="h-4 w-4 text-[var(--ink-muted)]" />
                <span>Studio Dashboard</span>
              </Link>
              <Link
                to="/write/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <Plus className="h-4 w-4 text-[var(--ink-muted)]" />
                <span>Create New Work</span>
              </Link>
            </div>
          )}

          {/* Mobile Theme Toggle (Hidden on public homepage) */}
          {!isPublicHome && (
            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--ink-secondary)]">Theme Appearance</span>
              <button
                type="button"
                onClick={() => setSiteTheme(siteTheme === 'dark' ? 'light' : 'dark')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-black border border-neutral-200 text-xs font-mono shadow-xs cursor-pointer hover:bg-neutral-100 transition-colors"
              >
                {siteTheme === 'dark' ? <Sun className="h-3.5 w-3.5 text-black stroke-[2.2]" /> : <Moon className="h-3.5 w-3.5 text-black stroke-[2.2]" />}
                <span className="text-black font-semibold">{siteTheme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            </div>
          )}

          {/* Auth Button */}
          <div className="pt-2.5 border-t border-[var(--border-subtle)] mt-auto">
            {!isSignedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  openAuthModal()
                }}
                className="w-full text-left py-1.5 px-2.5 font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors cursor-pointer"
              >
                Sign In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('relay_auth_hint')
                  }
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="w-full text-left py-1.5 px-2.5 font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </Drawer>

      {/* Global Command Search Palette */}
      <PaletteSearch
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  )
}
