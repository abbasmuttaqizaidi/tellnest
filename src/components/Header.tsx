import React, { useState, useRef, useEffect } from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import {
  PenTool,
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
import { SPRINGS } from '../design-system/tokens'
import { motion, AnimatePresence } from 'motion/react'
import { UnisexAvatar, UnisexAvatarIcon } from './UnisexAvatar'
import { HatchpenLogo } from './HatchpenLogo'

export interface HeaderProps {
  serverAuthenticated?: boolean
}

export default function Header({ serverAuthenticated }: HeaderProps = {}) {
  const navigate = useNavigate()
  const { user, isSignedIn: rawIsSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()

  // Immediate optimistic logout tracker so buttons never disappear during async signOut network wait
  const [optimisticLoggedOut, setOptimisticLoggedOut] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('hatchpen_just_logged_out') === 'true'
    }
    return false
  })

  // When Clerk finishes hydrating and confirms unauthenticated, clean up the temporary flag
  useEffect(() => {
    if (isLoaded) {
      if (!rawIsSignedIn) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('hatchpen_just_logged_out')
        }
        setOptimisticLoggedOut(false)
      } else {
        setOptimisticLoggedOut(false)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('hatchpen_just_logged_out')
        }
      }
    }
  }, [isLoaded, rawIsSignedIn])

  const hasSessionIndicator =
    !optimisticLoggedOut &&
    (Boolean(serverAuthenticated) ||
      (typeof window !== 'undefined' &&
        (localStorage.getItem('hatchpen_has_session') === 'true' ||
          document.cookie.includes('hatchpen_has_session=true') ||
          document.cookie.includes('__session'))))

  const isAuthResolving = !isLoaded && hasSessionIndicator
  const isSignedIn = !optimisticLoggedOut && isLoaded && Boolean(rawIsSignedIn)

  const handleSignOut = async () => {
    setOptimisticLoggedOut(true)
    setUserMenuOpen(false)
    setMobileDrawerOpen(false)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('hatchpen_just_logged_out', 'true')
        localStorage.removeItem('relay_auth_hint')
        localStorage.removeItem('hatchpen_has_session')
        localStorage.removeItem('hatchpen_cached_bookmarks')
        localStorage.removeItem('hatchpen_custom_avatar')
        localStorage.removeItem('tellnest_custom_avatar')
        sessionStorage.removeItem('hatchpen_cached_rec_signals')
        if (user?.id) {
          sessionStorage.removeItem(`hatchpen_cached_rec_signals_${user.id}`)
        }
        document.cookie = 'hatchpen_has_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch {}
    }
    try {
      await signOut({ redirectUrl: '/' })
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }
  const {
    unreadNotificationCount,
    siteTheme,
    setSiteTheme,
    openAuthModal,
    openPublicWriteModal,
    userDisplayName,
    userProfileUsername,
    customAvatarUrl,
    genres,
    showToast,
    savedWorkIds,
    isHeaderScrolled,
    mobileDrawerOpen,
    setMobileDrawerOpen,
  } = useApp()
  const isAvatarRemoved = customAvatarUrl === 'none'
  const activeAvatar = isAvatarRemoved ? null : (customAvatarUrl || user?.imageUrl || null)
  // Strictly prioritize user's profile display name set in Hatchpen Settings / Profile
  const profileDisplayName = userDisplayName || userProfileUsername || 'Hatchpen Member'
  const profileHandle = userProfileUsername || (user?.username ? user.username : (user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'reader'))
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
        if (!isSignedIn) {
          openAuthModal(undefined, {
            canClose: true,
            title: 'Sign In to Search',
            reason: 'Create a free account or sign in to search across all Hatchpen manuscripts and authors.',
          })
          return
        }
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSignedIn, openAuthModal])

  // Don't show regular header in focused reading mode or focused chapter editor mode
  const isReaderMode = currentPath.startsWith('/read/')
  const isEditorMode = currentPath.startsWith('/write/editor')
  const isWorksRoute = currentPath.startsWith('/works')

  const isHomePage = currentPath === '/'
  const search = (routerState.location.search || {}) as Record<string, any>
  const searchView = search?.view || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : undefined)

  const isPublicHome = React.useMemo(() => {
    if (currentPath !== '/') return false
    if (searchView === 'public') return true
    if (searchView === 'signed-in') return false
    if (isLoaded ? isSignedIn : serverAuthenticated) return false
    if (typeof window !== 'undefined' && window.localStorage.getItem('hatchpen_has_session') === 'true') {
      return false
    }
    return true
  }, [currentPath, searchView, serverAuthenticated, isSignedIn, isLoaded])

  const [hasScrolled, setHasScrolled] = useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0
      setHasScrolled((prev) => {
        if (!prev && top > 35) return true
        if (prev && top < 15) return false
        return prev
      })
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', handleScroll, { capture: true })
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
      ? 'hidden md:block fixed top-0 left-0 right-0 z-40 w-full border-b border-[#D7CFC3]/50 dark:border-neutral-800 bg-[#F2EDE3]/90 dark:bg-[#121316]/90 backdrop-blur-md shadow-xs transition-all duration-300'
      : 'hidden md:block absolute top-0 left-0 right-0 z-40 w-full border-b border-transparent bg-transparent transition-all duration-300'
    : 'relative md:sticky top-0 z-30 w-full border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/95 dark:bg-black/95 backdrop-blur-md shadow-xs'

  return (
    <>
      <header className={headerClasses}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-2 sm:gap-4">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0">
          <Link to="/" preload="intent" className="group flex items-center text-inherit no-underline flex-shrink-0 select-none">
            {/* Desktop: Constant Full Wordmark */}
            <div className="hidden md:inline-flex items-center">
              <HatchpenLogo size="sm" variant="full" />
            </div>

            {/* Mobile: Ultra-smooth GPU-accelerated Logo Morph (Zero-lag, pre-decoded in DOM) */}
            <div
              className={`relative md:hidden flex items-center h-8 overflow-hidden transition-[width] duration-160 ease-[cubic-bezier(0.2,0,0,1)] transform-gpu ${
                isNavSearchOpen ? 'w-8' : 'w-[144px]'
              }`}
            >
              {/* Full Wordmark Layer */}
              <div
                className={`absolute left-0 flex items-center transition-all duration-160 ease-[cubic-bezier(0.2,0,0,1)] transform-gpu will-change-[transform,opacity] ${
                  isNavSearchOpen
                    ? 'opacity-0 -translate-x-2 scale-95 pointer-events-none'
                    : 'opacity-100 translate-x-0 scale-100 pointer-events-auto'
                }`}
              >
                <HatchpenLogo size="sm" variant="full" />
              </div>

              {/* Icon Emblem Layer */}
              <div
                className={`flex items-center justify-center h-8 w-8 transition-all duration-160 ease-[cubic-bezier(0.2,0,0,1)] transform-gpu will-change-[transform,opacity] ${
                  isNavSearchOpen
                    ? 'opacity-100 scale-100 translate-x-0 pointer-events-auto'
                    : 'opacity-0 scale-80 -translate-x-1 pointer-events-none'
                }`}
              >
                <HatchpenLogo size="sm" variant="icon" />
              </div>
            </div>
          </Link>

          {/* Primary Desktop Navigation */}
          {!isReaderMode && (
            <nav className={`hidden ${isNavSearchOpen ? 'lg:flex' : 'md:flex'} items-center gap-1 text-[13px] font-medium text-[var(--ink-muted)]`}>
              {isSignedIn && (
                <Link
                  to="/"
                  preload="intent"
                  className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                    isHomePage ? 'text-[var(--ink-primary)] font-semibold' : ''
                  }`}
                >
                  Home
                </Link>
              )}
              <Link
                to="/discover"
                preload="intent"
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/discover') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Discover
              </Link>
              <Link
                to="/search"
                preload="intent"
                onClick={(e) => {
                  if (!isSignedIn) {
                    e.preventDefault()
                    openAuthModal(undefined, {
                      canClose: true,
                      title: 'Sign In to Search',
                      reason: 'Create a free account or sign in to search across all Hatchpen manuscripts and authors.',
                    })
                  }
                }}
                className={`px-3 py-1.5 rounded transition-colors hover:text-[var(--ink-primary)] ${
                  currentPath.startsWith('/search') ? 'text-[var(--ink-primary)] font-semibold' : ''
                }`}
              >
                Search
              </Link>

              {isSignedIn && (
                <>
                  <Link
                    to="/library"
                    preload="intent"
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
                    preload="intent"
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
            <div
              onClickCapture={(e) => {
                if (!isSignedIn) {
                  e.preventDefault()
                  e.stopPropagation()
                  openAuthModal(undefined, {
                    canClose: true,
                    title: 'Sign In to Search',
                    reason: 'Create a free account or sign in to search across all Hatchpen manuscripts and authors.',
                  })
                }
              }}
              className={`transition-[flex-grow,max-width] duration-160 ease-[cubic-bezier(0.2,0,0,1)] min-w-0 ${
                isNavSearchOpen
                  ? 'flex-1 max-w-xs sm:max-w-sm md:max-w-md w-full'
                  : 'flex-initial'
              }`}
            >
              <OmniSearch
                expandMode="responsive"
                size="sm"
                iconButtonClassName="bg-white text-black border border-neutral-200/80 shadow-xs hover:bg-neutral-100 hover:text-black"
                value={navSearchQuery}
                onChange={setNavSearchQuery}
                isExpanded={isNavSearchOpen}
                onExpand={() => {
                  if (!isSignedIn) {
                    openAuthModal(undefined, {
                      canClose: true,
                      title: 'Sign In to Search',
                      reason: 'Create a free account or sign in to search across all Hatchpen manuscripts and authors.',
                    })
                    return
                  }
                  setIsNavSearchOpen(true)
                }}
                onCollapse={() => setIsNavSearchOpen(false)}
                onSubmit={(q) => {
                  if (!isSignedIn) {
                    openAuthModal(undefined, {
                      canClose: true,
                      title: 'Sign In to Search',
                      reason: 'Create a free account or sign in to search across all Hatchpen manuscripts and authors.',
                    })
                    return
                  }
                  const trimmed = q.trim()
                  if (!trimmed) return
                  if (trimmed.length < 2) {
                    showToast('Please enter at least 2 letters to search.')
                    return
                  }
                  navigate({
                    to: '/search',
                    search: {
                      q: trimmed,
                      type: 'stories',
                    } as any,
                  })
                  setIsNavSearchOpen(false)
                }}
                shortcut={false}
                showShortcut={false}
                placeholders={[
                  "Search stories & manuscripts...",
                  "Search 'A Winter in Kyoto'...",
                  "Search 'The Cold Perimeter'...",
                  "Search by title or premise...",
                ]}
              />
            </div>
          )}

          {/* Prominent Studio CTA (Only when signed in) */}
          {isSignedIn && (
            <Link
              to="/write"
              preload="intent"
              className={`${isNavSearchOpen ? 'hidden xl:inline-flex' : 'hidden sm:inline-flex'} items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity flex-shrink-0`}
            >
              <PenTool className="h-3.5 w-3.5" />
              <span className="font-sans font-semibold tracking-wide">Studio</span>
            </Link>
          )}

          {/* Notifications Link (Only when signed in) */}
          {isSignedIn && (
            <Link
              to="/notifications"
              preload="intent"
              className={`${isNavSearchOpen ? 'hidden md:flex' : 'hidden sm:flex'} relative h-8 w-8 items-center justify-center rounded border border-transparent text-[var(--ink-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--ink-primary)] transition-colors flex-shrink-0`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--ink-primary)] ring-2 ring-[var(--bg-canvas)]" />
              )}
            </Link>
          )}


          {/* Dark Mode Quick Toggle (Hidden on public homepage and on mobile screen) */}
          {!isPublicHome && (
            <button
              onClick={() => setSiteTheme(siteTheme === 'dark' ? 'light' : 'dark')}
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white text-black dark:bg-neutral-900 dark:text-white border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex-shrink-0 cursor-pointer"
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
          {isAuthResolving ? (
            <div className="hidden md:block h-8 w-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] animate-pulse shrink-0" />
          ) : isSignedIn ? (
            <div className="hidden md:block relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden focus:outline-none hover:ring-2 hover:ring-[var(--border-strong)] transition-all cursor-pointer border border-[var(--border-subtle)]"
                title={profileDisplayName}
              >
                <UnisexAvatar
                  src={activeAvatar}
                  forceUnisex={isAvatarRemoved}
                  name={profileDisplayName}
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
                      forceUnisex={isAvatarRemoved}
                      name={profileDisplayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--ink-primary)] truncate">
                        {profileDisplayName}
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] font-mono truncate">
                        @{profileHandle}
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
                      preload="intent"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <PenTool className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Studio Dashboard</span>
                    </Link>
                    <Link
                      to="/write/new"
                      preload="intent"
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
                      preload="intent"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>My Library (Saved & History)</span>
                    </Link>
                    <Link
                      to="/following"
                      preload="intent"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Users className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Author Dispatches</span>
                    </Link>
                  </div>

                  <div className="border-t border-[var(--border-subtle)]" />

                  {/* Section 3: Settings & Sign Out */}
                  <div className="py-1">
                    <Link
                      to="/settings"
                      preload="intent"
                      onClick={() => setUserMenuOpen(false)}
                      className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Settings</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
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
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center rounded-full bg-white text-[#18181B] border border-neutral-200/80 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium hover:bg-neutral-100 transition-all shadow-xs no-underline cursor-pointer"
              >
                <span>Log in</span>
              </Link>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium hover:opacity-90 transition-all shadow-xs cursor-pointer"
              >
                {isWorksRoute ? (
                  <>
                    <span className="sm:hidden">Join</span>
                    <span className="hidden sm:inline">Join HatchPen</span>
                  </>
                ) : (
                  <span>Join HatchPen</span>
                )}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Navigation Hamburger */}
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileDrawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Right Navigation Drawer */}
    <Drawer
      isOpen={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      side="right"
      title="Navigation"
      className="w-[85vw] max-w-[320px]"
    >
        <div className="flex flex-col h-full space-y-3 text-[13px] font-medium">
          {isSignedIn && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <UnisexAvatar
                src={activeAvatar}
                forceUnisex={isAvatarRemoved}
                name={profileDisplayName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs text-[var(--ink-primary)] truncate">
                  {profileDisplayName}
                </p>
                <p className="text-[10px] text-[var(--ink-muted)] font-mono truncate">
                  @{profileHandle}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            <Link
              to="/"
              preload="intent"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>

            <Link
              to="/discover"
              preload="intent"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Compass className="h-4 w-4" />
              <span>Discover</span>
            </Link>

            {isSignedIn && (
              <Link
                to="/following"
                preload="intent"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <Users className="h-4 w-4" />
                <span>Following</span>
              </Link>
            )}

            <Link
              to="/library"
              preload="intent"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Bookmark className="h-4 w-4" />
              <span>Library</span>
            </Link>

            {isSignedIn && (
              <Link
                to="/notifications"
                preload="intent"
                onClick={() => setMobileDrawerOpen(false)}
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
            )}

            <Link
              to="/settings"
              preload="intent"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors font-medium"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            {!isSignedIn && (
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false)
                  openPublicWriteModal()
                }}
                className="flex items-center gap-2 w-full text-left py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
              >
                <PenTool className="h-4 w-4" />
                <span>Studio</span>
              </button>
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
                preload="intent"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <PenTool className="h-4 w-4 text-[var(--ink-muted)]" />
                <span>Studio Dashboard</span>
              </Link>
              <Link
                to="/write/new"
                preload="intent"
                onClick={() => setMobileDrawerOpen(false)}
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
              <Link
                to="/login"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full block text-left py-1.5 px-2.5 font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors no-underline"
              >
                Sign In
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
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
