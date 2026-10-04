import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { Home, Compass, Bookmark, Users, PenLine } from 'lucide-react'

export default function MobileNav() {
  const routerState = useRouterState()
  const { isSignedIn } = useUser()
  const currentPath = routerState.location.pathname

  // Hide bottom nav in reader mode or editor mode so reading and writing are 100% distraction-free
  if (currentPath.startsWith('/read/') || currentPath.startsWith('/write/editor')) {
    return null
  }

  const navItems = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/discover', label: 'Discover', icon: Compass, exact: false },
    ...(isSignedIn
      ? [
          { to: '/write', label: 'Write', icon: PenLine, isWrite: true },
          { to: '/library', label: 'Library', icon: Bookmark, exact: false },
          { to: '/following', label: 'Following', icon: Users, exact: false },
        ]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 px-2 transition-colors">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? currentPath === item.to
            : currentPath.startsWith(item.to)

          if (item.isWrite) {
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className="flex flex-col items-center gap-0.5 text-[10px] font-medium text-[var(--ink-primary)] active:scale-95 transition-transform no-underline px-2 py-1"
                aria-label="Write a story"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs">
                  <PenLine className="h-4 w-4" />
                </div>
                <span className="font-semibold text-[9px] uppercase tracking-wider">Write</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.to}
              to={item.to as any}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 gap-1 text-[10px] font-medium transition-colors no-underline ${
                isActive
                  ? 'text-[var(--ink-primary)] font-semibold'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--ink-primary)]" />
                )}
              </div>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
