import React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useApp } from '../context/AppContext'
import { HatchpenLogo } from './HatchpenLogo'

export default function Footer() {
  const routerState = useRouterState()
  const { categories } = useApp()
  const currentPath = routerState?.location?.pathname || '/'
  const isReaderMode = currentPath.startsWith('/read/')
  const isEditorMode = currentPath.startsWith('/write/editor')

  // Do not render footer on distraction-free reader canvas or studio manuscript editor
  if (isReaderMode || isEditorMode) {
    return null
  }

  const CURATED_GENRES = [
    { slug: 'literary-fiction', name: 'Literary Fiction' },
    { slug: 'contemporary-fiction', name: 'Contemporary Fiction' },
    { slug: 'thriller', name: 'Thriller' },
    { slug: 'mystery', name: 'Mystery' },
    { slug: 'psychological-thriller', name: 'Psychological Thriller' },
    { slug: 'crime', name: 'Crime' },
    { slug: 'science-fiction', name: 'Science Fiction' },
    { slug: 'dystopian', name: 'Dystopian' },
    { slug: 'fantasy', name: 'Fantasy' },
    { slug: 'dark-fantasy', name: 'Dark Fantasy' },
    { slug: 'magical-realism', name: 'Magical Realism' },
    { slug: 'horror', name: 'Horror' },
    { slug: 'romance', name: 'Romance' },
    { slug: 'dark-romance', name: 'Dark Romance' },
    { slug: 'historical-fiction', name: 'Historical Fiction' },
    { slug: 'young-adult-ya', name: 'Young Adult (YA)' },
    { slug: 'slice-of-life', name: 'Slice of Life' },
    { slug: 'philosophical-fiction', name: 'Philosophical Fiction' },
  ]

  return (
    <footer className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] pt-5 pb-6 sm:pt-10 sm:pb-12 text-xs text-[var(--ink-muted)] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid: Ultra-compact on mobile, 5-column on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-5 sm:gap-x-8 gap-y-4 sm:gap-y-6 pb-5 sm:pb-8 border-b border-[var(--border-subtle)]">
          {/* Brand Manifesto */}
          <div className="col-span-2 md:col-span-2 space-y-1.5 sm:space-y-2">
            <Link to="/" className="no-underline text-inherit inline-block">
              <HatchpenLogo size="sm" variant="full" />
            </Link>
            <p className="text-[11px] sm:text-xs leading-normal sm:leading-relaxed text-[var(--ink-muted)] max-w-sm font-sans line-clamp-2 sm:line-clamp-none">
              Digital literary publishing & reader platform for original fiction, serialized novels, and poetry.
            </p>
          </div>

          {/* Explore Categories */}
          <div className="col-span-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-1.5">
              Categories
            </h4>
            <ul className="space-y-0.5 sm:space-y-1 list-none p-0 m-0">
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Formats */}
          <div className="col-span-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-1.5">
              Formats
            </h4>
            <ul className="space-y-0.5 sm:space-y-1 list-none p-0 m-0">
              {categories.slice(4, 8).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-1.5">
              Platform & Studio
            </h4>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 md:block md:space-y-1 list-none p-0 m-0">
              <li>
                <Link
                  to="/discover"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Discover Stories
                </Link>
              </li>
              <li>
                <Link
                  to="/write"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Creator Studio
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Pricing & Access
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block font-medium"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Settings
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Curated Literary Genre Hub (Distributes internal PageRank & eliminates genre orphan URLs) */}
        <div className="py-4 sm:py-5 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold m-0">
              Literary Genres
            </h4>
            <Link
              to="/discover"
              className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline inline-flex items-center gap-1 font-mono"
            >
              All 33 Genres &amp; Tags <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-3.5 sm:gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
            {CURATED_GENRES.map((genre) => (
              <Link
                key={genre.slug}
                to="/genre/$slug"
                params={{ slug: genre.slug }}
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal & Platform Invariants */}
        <div className="pt-3 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] sm:text-[11px] text-[var(--ink-faint)] font-mono text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 sm:gap-x-3 gap-y-1">
            <p className="m-0 leading-tight">
              © {new Date().getFullYear()} HatchPen Publishing. All rights reserved.
            </p>
            <span className="opacity-30 hidden sm:inline">•</span>
            <Link
              to="/privacy"
              className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit"
            >
              Privacy
            </Link>
            <span className="opacity-30">•</span>
            <Link
              to="/terms"
              className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit"
            >
              Terms
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-2 sm:gap-x-3 gap-y-0.5 text-[9px] sm:text-[10px]">
            <span>DISCOVERY</span>
            <span className="opacity-30">•</span>
            <span>READING</span>
            <span className="opacity-30">•</span>
            <span>WRITER</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
