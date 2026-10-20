import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { Home, Compass, Search, Bookmark, PenLine, User } from 'lucide-react'

export default function MobileNav() {
  const routerState = useRouterState()
  const { isSignedIn, isLoaded } = useUser()
  const currentPath = routerState.location.pathname

  const search = (routerState.location.search || {}) as Record<string, any>
  const searchView = search?.view || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : undefined)

  const pathname =
    routerState.location.pathname ||
    (typeof window !== 'undefined' ? window.location.pathname : '/')

  // 1. Strictly remove bottom docked nav for unauthenticated/public users or public preview
  if (!isLoaded || !isSignedIn || searchView === 'public') {
    return null
  }

  // 2. Remove bottom docked nav only in distraction-free reader and full-screen editor
  if (pathname.startsWith('/read/') || pathname.startsWith('/write/editor')) {
    return null
  }

  const navItems = [
    {
      label: 'Home',
      to: '/',
      icon: Home,
      isActive: currentPath === '/',
    },
    {
      label: 'Discover',
      to: '/discover',
      icon: Compass,
      isActive:
        currentPath.startsWith('/discover') ||
        currentPath.startsWith('/genre') ||
        currentPath.startsWith('/category'),
    },
    {
      label: 'Search',
      to: '/search',
      icon: Search,
      isActive: currentPath.startsWith('/search'),
    },
    {
      label: 'Write',
      to: '/write',
      icon: PenLine,
      isActive: currentPath.startsWith('/write'),
    },
    {
      label: 'Library',
      to: '/library',
      icon: Bookmark,
      isActive: currentPath.startsWith('/library'),
    },
    {
      label: 'Profile',
      to: '/profile',
      icon: User,
      isActive:
        currentPath.startsWith('/profile') || currentPath.startsWith('/settings'),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 px-0.5 transition-colors">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const IconComponent = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              preload="render"
              className={`flex flex-col items-center justify-center min-w-[44px] py-0.5 gap-0.5 font-medium transition-colors no-underline ${
                item.isActive
                  ? 'text-black dark:text-white font-semibold'
                  : 'text-[var(--ink-muted)] hover:text-black dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <IconComponent
                  className="h-4 w-4"
                  strokeWidth={item.isActive ? 2.4 : 1.8}
                />
                {item.isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-0.5 rounded-full bg-black dark:bg-white" />
                )}
              </div>
              <span className="text-[9px] leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
