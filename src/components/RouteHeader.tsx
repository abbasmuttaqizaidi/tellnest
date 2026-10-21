import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import {
  Plus,
  ChevronDown,
  LayoutGrid,
  PenLine,
  Sparkles,
  Home,
  Compass,
  Search,
  Bookmark,
  User,
  Settings,
  Users,
  Check,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
export interface RouteHeaderProps {
  title: string
  subtitle?: string
  rightExtra?: React.ReactNode
  className?: string
}

export function RouteHeader({ title, subtitle, rightExtra, className = '' }: RouteHeaderProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState?.location?.pathname || '/'
  const { isSignedIn } = useUser()
  const {
    openPublicWriteModal,
    siteTheme,
    setSiteTheme,
    setMobileDrawerOpen,
  } = useApp()

  // Eagerly preload navigation routes in background so route changes are instant (< 50ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      routeOptions.forEach((r) => {
        router.preloadRoute({ to: r.path as any }).catch(() => {})
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [router])

  // Scroll listener for sticky header and navbar handoff experiment
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0
      setIsScrolled((prev) => {
        if (!prev && top > 55) return true
        if (prev && top < 25) return false
        return prev
      })
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', handleScroll, { capture: true })
  }, [])

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [routeMenuOpen, setRouteMenuOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const routeMenuRef = useRef<HTMLDivElement>(null)

  // Navigation destinations
  const routeOptions = [
    { name: 'Home', path: '/', icon: Home, description: 'Daily curated stories & feed' },
    { name: 'Discover', path: '/discover', icon: Compass, description: 'Catalog & editorial collections' },
    { name: 'Following', path: '/following', icon: Users, description: 'Updates from followed writers' },
    { name: 'Search', path: '/search', icon: Search, description: 'Search manuscripts & authors' },
    { name: 'Library', path: '/library', icon: Bookmark, description: 'Reading shelf & history' },
    { name: 'Settings', path: '/settings', icon: Settings, description: 'Preferences, account & reading' },
    { name: 'Studio', path: '/write', icon: PenLine, description: 'Author workspace & analytics' },
  ]

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    if (!dropdownOpen && !routeMenuOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false)
      }
      if (routeMenuRef.current && !routeMenuRef.current.contains(target)) {
        setRouteMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false)
        setRouteMenuOpen(false)
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
  }, [dropdownOpen, routeMenuOpen])

  const handleActionClick = (e: React.MouseEvent, _destination: string) => {
    setDropdownOpen(false)
    if (!isSignedIn) {
      e.preventDefault()
      openPublicWriteModal()
    }
  }

  return (
    <div
      className={`sticky top-0 z-40 w-full md:hidden bg-[var(--bg-subtle)]/95 dark:bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-strong)] shadow-xs py-2 transition-colors duration-200 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex items-center justify-between gap-3 h-9">
        {/* Left: Pure Route Name with Switcher Dropdown (Hatchpen logo appears when scrolled) */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Link
            to="/"
            preload="render"
            preloadDelay={0}
            className={`flex items-center text-inherit no-underline shrink-0 transition-all duration-300 ease-out overflow-hidden ${
              isScrolled
                ? 'opacity-100 max-w-9 pointer-events-auto mr-1 scale-100'
                : 'opacity-0 max-w-0 pointer-events-none mr-0 scale-90'
            }`}
            title="HatchPen Home"
            aria-label="HatchPen Home"
          >
            <div className="h-7 w-7 flex items-center justify-center shrink-0 select-none">
              <img
                src="/hatchpen-logo-kit/svg/hatchpen-icon.svg"
                alt="Hatchpen"
                className="h-6 w-6 object-contain dark:hidden"
                loading="eager"
              />
              <img
                src="/hatchpen-logo-kit/svg/hatchpen-icon-reversed.svg"
                alt="Hatchpen"
                className="h-6 w-6 object-contain hidden dark:inline"
                loading="eager"
              />
            </div>
          </Link>

          <div className="relative min-w-0" ref={routeMenuRef}>
            <button
              type="button"
              data-testid="route-header-switcher-btn"
              onClick={() => {
                setRouteMenuOpen((prev) => !prev)
                setDropdownOpen(false)
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 -ml-1 rounded-lg text-sm sm:text-base font-serif font-bold text-[var(--ink-primary)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-strong)] border border-transparent transition-all cursor-pointer select-none group ${
                routeMenuOpen ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] shadow-2xs' : 'hover:shadow-2xs'
              }`}
              aria-expanded={routeMenuOpen}
              aria-haspopup="true"
              title="Click to switch route"
            >
              <h1 className="inline font-inherit text-inherit leading-none tracking-tight">
                {title}
              </h1>
              <ChevronDown
                className={`h-3.5 w-3.5 text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] transition-transform duration-200 ${
                  routeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Route Navigation Dropdown */}
            {routeMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1.5 shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold flex items-center gap-1.5">
                    <Compass className="h-3 w-3 text-[var(--ink-primary)]" />
                    <span>Switch Route</span>
                  </p>
                  <span className="text-[9px] font-mono text-[var(--ink-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                    Navigation
                  </span>
                </div>

                <div className="py-1">
                  {routeOptions.map((r) => {
                    const IconComponent = r.icon
                    const isActive =
                      r.path === '/'
                        ? currentPath === '/'
                        : currentPath.startsWith(r.path)

                    return (
                      <Link
                        key={r.name}
                        to={r.path}
                        preload="render"
                        preloadDelay={0}
                        onClick={() => setRouteMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 transition-colors no-underline cursor-pointer ${
                          isActive
                            ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                            : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              isActive
                                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] border-[var(--ink-primary)]'
                                : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border-[var(--border-subtle)]'
                            }`}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-tight">{r.name}</p>
                            <p className="text-[10px] text-[var(--ink-muted)] font-normal truncate mt-0.5">
                              {r.description}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <Check className="h-4 w-4 text-[var(--ink-primary)] shrink-0 ml-2" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: [ 🔍 ] [ 🌙 ] [ ☰ ] to the LEFT of [+ New] in a single horizontal row */}
        <div className="relative shrink-0 flex items-center gap-2" ref={dropdownRef}>
          {/* 3 Quick Action Buttons: Search, Theme, Menu (smoothly transitions in to the left of New button when scrolled) */}
          <div
            className={`flex items-center gap-1.5 transition-all duration-200 ease-out overflow-hidden ${
              isScrolled
                ? 'opacity-100 max-w-xs pointer-events-auto mr-0.5'
                : 'opacity-0 max-w-0 pointer-events-none mr-0'
            }`}
          >
            {/* 1. Search */}
            <button
              type="button"
              onClick={() => navigate({ to: '/search' as any })}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
              title="Search"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-black dark:text-white stroke-[2.2]" />
            </button>

            {/* 2. Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={() => setSiteTheme(siteTheme === 'dark' ? 'light' : 'dark')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
              title={siteTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {siteTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-white stroke-[2.2]" />
              ) : (
                <Moon className="h-4 w-4 text-black stroke-[2.2]" />
              )}
            </button>

            {/* 3. Hamburger Navigation Menu */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
              title="Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-4 w-4 text-black dark:text-white stroke-[2.2]" />
            </button>
          </div>

          {rightExtra}

          {/* Action Button: + New (NO Chevron Down icon!) */}
          <button
            type="button"
            data-testid="route-header-new-btn"
            onClick={() => {
              setDropdownOpen((prev) => !prev)
              setRouteMenuOpen(false)
            }}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs select-none h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>

          {/* Dropdown for Creator Workspace */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1.5 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 pt-1.5 pb-1 border-b border-[var(--border-subtle)]">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-[var(--ink-primary)]" />
                  <span>Creator Workspace</span>
                </p>
              </div>

              <div className="py-1">
                <Link
                  to="/write"
                  preload="render"
                  preloadDelay={0}
                  onClick={(e) => handleActionClick(e, '/write')}
                  className="flex items-start gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline cursor-pointer group"
                >
                  <div className="mt-0.5 h-6 w-6 rounded-md bg-[var(--bg-subtle)] group-hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <PenLine className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink-primary)] leading-tight">
                      Studio Dashboard
                    </p>
                    <p className="text-[10px] text-[var(--ink-muted)] mt-0.5 leading-tight">
                      Manage manuscripts & stats
                    </p>
                  </div>
                </Link>

                <Link
                  to="/write/new"
                  preload="render"
                  preloadDelay={0}
                  onClick={(e) => handleActionClick(e, '/write/new')}
                  className="flex items-start gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline cursor-pointer group"
                >
                  <div className="mt-0.5 h-6 w-6 rounded-md bg-[var(--bg-subtle)] group-hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5 text-[var(--ink-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--ink-primary)] leading-tight">
                      Create New Work
                    </p>
                    <p className="text-[10px] text-[var(--ink-muted)] mt-0.5 leading-tight">
                      Draft a fresh manuscript
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RouteHeader
