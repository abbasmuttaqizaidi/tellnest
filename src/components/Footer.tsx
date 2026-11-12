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

  const FEATURED_STORIES = [
    { slug: 'the-season-we-fell', title: 'The Season We Fell' },
    { slug: 'pleasure-after-dark', title: 'Pleasure After Dark' },
    { slug: 'apartment-407', title: 'Apartment 407' },
    { slug: 'the-night-with-my-best-friend-s-daddy', title: "The Night With My Best Friend's Daddy" },
    { slug: 'the-girl-who-saw', title: 'The Girl Who Saw' },
    { slug: 'the-apology-she-was-never-supposed-to-hear', title: 'The Apology She Was Never Supposed to Hear' },
    { slug: 'the-wedding-that-was-never-mine', title: 'The Wedding That Was Never Mine' },
    { slug: 'do-not-play-the-final-recording', title: 'Do Not Play the Final Recording' },
  ]

  const ACTIVE_CATEGORIES = [
    { slug: 'novels', name: 'Novels' },
    { slug: 'short-stories', name: 'Short Stories' },
    { slug: 'new-adult', name: 'New Adult' },
    { slug: 'fan-fiction', name: 'Fan Fiction' },
    { slug: 'serialized-fiction', name: 'Serialized Fiction' },
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

          {/* Top & Trending Stories (Distributes sitewide link equity directly to stories) */}
          <div className="col-span-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-1.5">
              Top Serials
            </h4>
            <ul className="space-y-0.5 sm:space-y-1 list-none p-0 m-0">
              {FEATURED_STORIES.map((story) => (
                <li key={story.slug}>
                  <Link
                    to="/works/$workId"
                    params={{ workId: story.slug }}
                    className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block line-clamp-1"
                    title={story.title}
                  >
                    {story.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Active Categories (Only categories with published works) */}
          <div className="col-span-1">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold mb-1.5">
              Categories
            </h4>
            <ul className="space-y-0.5 sm:space-y-1 list-none p-0 m-0">
              {ACTIVE_CATEGORIES.map((cat) => (
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
                  to="/wattpad-alternative"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block"
                >
                  Wattpad Alternative
                </Link>
              </li>
              <li>
                <Link
                  to="/hatchpen-hits"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block font-medium text-rose-600 dark:text-rose-400"
                >
                  HatchPen Hits (Top Serials)
                </Link>
              </li>
              <li>
                <Link
                  to="/writing-contests"
                  className="hover:text-[var(--ink-primary)] transition-colors no-underline text-inherit text-[11px] sm:text-xs py-0.5 inline-block font-medium text-amber-600 dark:text-amber-400"
                >
                  Writing Contests (₹2,000 Prize)
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

        {/* Curated Reading Hubs (Editorial & Intent Discovery) */}
        <div className="py-3 sm:py-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold m-0">
              Curated Shelves
            </h4>
          </div>
          <div className="flex flex-wrap gap-x-3.5 sm:gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
            <Link
              to="/discover"
              search={{ tab: 'trending' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Trending Serials
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'bingeable-reads' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Bingeable Reads
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'new-voices' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              New Voices Showcase
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'completed-stories' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Completed Stories
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'free-web-novels' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Free Web Novels
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'enemies-to-lovers' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Enemies to Lovers
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'slow-burn' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Slow Burn
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'progression-fantasy' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Progression Fantasy
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'dark-romance' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Dark Romance
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'billionaire-romance' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Billionaire Romance
            </Link>
            <Link
              to="/browse/$collection"
              params={{ collection: 'found-family' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              Found Family
            </Link>
          </div>
        </div>

        {/* Popular Narrative Tropes (High-Traffic Search Intent Equity) */}
        <div className="py-3 sm:py-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-primary)] font-semibold m-0">
              Popular Tropes
            </h4>
          </div>
          <div className="flex flex-wrap gap-x-3.5 sm:gap-x-4 gap-y-1.5 text-[11px] sm:text-xs">
            <Link
              to="/tag/$slug"
              params={{ slug: 'enemies-to-lovers' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Enemies to Lovers
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'slow-burn' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Slow-Burn
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'fake-dating' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Fake Dating
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'found-family' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Found Family
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'second-chance-romance' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Second Chance Romance
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'dark-romance' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Dark Romance
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'morally-gray' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Morally Gray
            </Link>
            <Link
              to="/tag/$slug"
              params={{ slug: 'progression-fantasy' }}
              className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline py-0.5"
            >
              #Progression Fantasy
            </Link>
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
