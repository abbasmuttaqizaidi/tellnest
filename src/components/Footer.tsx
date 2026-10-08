import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useApp } from '../context/AppContext'

import { HatchpenLogo } from './HatchpenLogo'

export default function Footer() {
  const routerState = useRouterState()
  const { categories } = useApp()
  const isReaderMode = routerState.location.pathname.startsWith('/read/')
  const isEditorMode = routerState.location.pathname.startsWith('/write/editor')

  if (isReaderMode || isEditorMode) {
    return null
  }

  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] pt-12 pb-16 text-xs text-[var(--ink-muted)] mb-14 md:mb-0 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-12 border-b border-[var(--border-subtle)]">
          {/* Brand Manifesto */}
          <div className="md:col-span-2 space-y-3">
            <Link to="/" className="no-underline text-inherit inline-block">
              <HatchpenLogo size="md" variant="full" />
            </Link>
            <p className="text-[13px] leading-relaxed text-[var(--ink-muted)] max-w-sm font-sans">
              An elegant publishing platform and digital library where original stories are incubated, crafted, and shared with readers across the world.
            </p>
          </div>

          {/* Explore Categories */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-3">
              Categories
            </h4>
            <ul className="space-y-1.5 list-none p-0 m-0">
              {categories.slice(0, 6).map(cat => (
                <li key={cat.slug}>
                  <Link
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-3">
              Formats
            </h4>
            <ul className="space-y-1.5 list-none p-0 m-0">
              {categories.slice(6, 12).map(cat => (
                <li key={cat.slug}>
                  <Link
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div>
            <h4 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-3">
              Relay Ecosystem
            </h4>
            <ul className="space-y-1.5 list-none p-0 m-0">
              <li>
                <Link to="/write" className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit">
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link to="/discover" className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit">
                  Digital Archives
                </Link>
              </li>
              <li>
                <a
                  href="https://relay.business"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit flex items-center gap-1.5"
                >
                  <span>Relay Insights</span>
                  <span className="text-[10px] font-mono text-[var(--ink-faint)]">↗</span>
                </a>
              </li>
              <li>
                <Link to="/settings" className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit">
                  Typography & Theme
                </Link>
              </li>
              <li>
                <Link to="/design-system" className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit font-semibold text-[var(--ink-primary)]">
                  Design System (UI)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[var(--ink-faint)] font-mono">
          <p>© {new Date().getFullYear()} Hatchpen Publishing. All literary works retain author copyright.</p>
          <div className="flex items-center gap-6">
            <span>DISCOVERY = CONTENT-RICH</span>
            <span>READING = MINIMAL</span>
            <span>WRITER = FOCUSED</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
