import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { Home, Compass, Bookmark, PenLine } from 'lucide-react'
import { UnisexAvatar } from './UnisexAvatar'
import { useApp } from '../context/AppContext'

export default function MobileNav() {
  const routerState = useRouterState()
  const { isSignedIn, user } = useUser()
  const { openAuthModal } = useApp()
  const currentPath = routerState.location.pathname

  // Hide bottom nav in reader mode or editor mode so reading and writing are 100% distraction-free
  if (currentPath.startsWith('/read/') || currentPath.startsWith('/write/editor')) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 px-2 transition-colors">
      <div className="flex items-center justify-around">
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium transition-colors no-underline ${
            currentPath === '/'
              ? 'text-[var(--ink-primary)] font-semibold'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <div className="relative">
            <Home className="h-4 w-4" />
            {currentPath === '/' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--ink-primary)]" />
            )}
          </div>
          <span className="text-[10px] leading-tight">Home</span>
        </Link>

        {/* Discover */}
        <Link
          to="/discover"
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium transition-colors no-underline ${
            currentPath.startsWith('/discover')
              ? 'text-[var(--ink-primary)] font-semibold'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <div className="relative">
            <Compass className="h-4 w-4" />
            {currentPath.startsWith('/discover') && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--ink-primary)]" />
            )}
          </div>
          <span className="text-[10px] leading-tight">Discover</span>
        </Link>

        {/* Write */}
        <Link
          to="/write"
          className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-[var(--ink-primary)] active:scale-95 transition-transform no-underline px-2 py-1"
          aria-label="Write a story"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs">
            <PenLine className="h-4 w-4" />
          </div>
          <span className="font-semibold text-[9px] uppercase tracking-wider">Write</span>
        </Link>

        {/* Library */}
        <Link
          to="/library"
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium transition-colors no-underline ${
            currentPath.startsWith('/library')
              ? 'text-[var(--ink-primary)] font-semibold'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <div className="relative">
            <Bookmark className="h-4 w-4" />
            {currentPath.startsWith('/library') && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--ink-primary)]" />
            )}
          </div>
          <span className="text-[10px] leading-tight">Library</span>
        </Link>

        {/* Profile / Account with UnisexAvatar */}
        {isSignedIn ? (
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium transition-colors no-underline ${
              currentPath.startsWith('/profile')
                ? 'text-[var(--ink-primary)] font-semibold'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <div className="relative">
              <div
                className={`rounded-full transition-all ${
                  currentPath.startsWith('/profile')
                    ? 'ring-2 ring-[var(--ink-primary)] ring-offset-1 ring-offset-[var(--bg-surface)]'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <UnisexAvatar
                  src={user?.imageUrl}
                  hasImage={user?.hasImage}
                  name={user?.fullName || user?.firstName}
                  size="xs"
                />
              </div>
              {currentPath.startsWith('/profile') && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--ink-primary)]" />
              )}
            </div>
            <span className="text-[10px] leading-tight">Profile</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          >
            <div className="h-5 w-5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
              <UnisexAvatar size="xs" />
            </div>
            <span className="text-[10px] leading-tight">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  )
}
