import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { Modal } from '../design-system/Modal'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Users, BookOpen, Clock, Sparkles, ArrowRight, UserCheck, Search, X, ChevronDown, Check } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { RouteHeader } from '../components/RouteHeader'
import { AUTHORS } from '../data/mockData'

export const Route = createFileRoute('/following')({
  head: () =>
    generateMeta({
      title: 'Following Feed — Writer Dispatches',
      description: 'Activity feed and serialized chapters from creators you follow on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Writer Dispatches & Follows"
      description="Sign in to track releases, serialized chapters, and literary dispatches from authors you follow."
      featureBadge="Following Feed"
    >
      <FollowingPage />
    </ProtectedRoute>
  ),
})

function FollowingPage() {
  const { followedAuthorIds, toggleFollowAuthor, allWorks, isAuthorFollowed } = useApp()
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [manageModalOpen, setManageModalOpen] = useState(false)
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false)
  const [searchMobileOpen, setSearchMobileOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Followed authors: resolved dynamically from allWorks & platform authors based on followedAuthorIds
  const followedAuthors = useMemo(() => {
    const pool: any[] = []
    const seen = new Set<string>()

    for (const w of allWorks) {
      if (w.author && !seen.has(w.author.id) && !seen.has(w.author.handle.toLowerCase())) {
        seen.add(w.author.id)
        seen.add(w.author.handle.toLowerCase())
        pool.push(w.author)
      }
    }

    for (const a of AUTHORS) {
      if (!seen.has(a.id) && !seen.has(a.handle.toLowerCase())) {
        seen.add(a.id)
        seen.add(a.handle.toLowerCase())
        pool.push(a)
      }
    }

    return pool.filter((a) => isAuthorFollowed(a.id) || isAuthorFollowed(a.handle))
  }, [allWorks, isAuthorFollowed, followedAuthorIds])

  // Active author if filtered
  const activeAuthor = useMemo(() => {
    if (selectedAuthor === 'all') return null
    return followedAuthors.find(
      (a) => a.id === selectedAuthor || a.handle === selectedAuthor
    ) || null
  }, [selectedAuthor, followedAuthors])

  // Close author dropdown on outside click
  useEffect(() => {
    if (!authorDropdownOpen) return
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAuthorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [authorDropdownOpen])

  // Filter feed items for authors we follow based on actual DB works/chapters
  const feedItems = useMemo(() => {
    const items: any[] = []
    for (const author of followedAuthors) {
      const worksByAuthor = allWorks.filter(
        (w) => w.author?.id === author.id || w.author?.handle?.toLowerCase() === author.handle?.toLowerCase()
      )
      for (const w of worksByAuthor) {
        // Add new_work event
        items.push({
          id: `feed-work-${w.id}`,
          type: 'new_work',
          author: w.author,
          work: {
            id: w.id,
            title: w.title,
            cover: w.cover,
            category: w.category,
            genre: w.genre,
          },
          timestamp: w.publishedAt ? new Date(w.publishedAt).toLocaleDateString() : 'Recently',
          note: `${w.author.name} published serialized work: ${w.title}.`,
        })

        // Add chapter drops if available
        if (Array.isArray(w.chapters) && w.chapters.length > 0) {
          const latestChapters = w.chapters.slice(-2)
          for (const ch of latestChapters) {
            items.push({
              id: `feed-ch-${w.id}-${ch.id}`,
              type: 'chapter_release',
              author: w.author,
              work: {
                id: w.id,
                title: w.title,
                cover: w.cover,
                category: w.category,
                genre: w.genre,
              },
              chapter: {
                id: ch.id,
                number: ch.number,
                title: ch.title,
              },
              timestamp: (ch as any).publishedAt ? new Date((ch as any).publishedAt).toLocaleDateString() : 'Recently',
              note: `${w.author.name} published Chapter ${ch.number}: "${ch.title}" in ${w.title}.`,
            })
          }
        }
      }
    }

    return items.filter((event) => {
      if (selectedType !== 'all' && event.type !== selectedType) return false
      if (selectedAuthor !== 'all' && event.author.id !== selectedAuthor && event.author.handle !== selectedAuthor) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesAuthor = event.author.name.toLowerCase().includes(q)
        const matchesWork = event.work.title.toLowerCase().includes(q)
        const matchesNote = event.note.toLowerCase().includes(q)
        if (!matchesAuthor && !matchesWork && !matchesNote) return false
      }
      return true
    })
  }, [followedAuthors, allWorks, selectedType, selectedAuthor, searchQuery])

  const TYPE_TABS = [
    { id: 'all', label: 'All Updates' },
    { id: 'chapter_release', label: 'Chapter Drops' },
    { id: 'new_work', label: 'New Works' },
  ]

  return (
    <div className="min-h-screen pb-12 bg-[var(--bg-canvas)]">
      {/* Mobile RouteHeader */}
      <RouteHeader
        title="Following"
        subtitle="Writer dispatches & updates"
        rightExtra={
          followedAuthors.length > 0 && (
            <button
              type="button"
              onClick={() => setManageModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors shadow-xs cursor-pointer"
            >
              <Users className="h-3 w-3" />
              <span>{followedAuthors.length}</span>
            </button>
          )
        }
      />

      {/* Main Focused Container */}
      <div className="max-w-2xl sm:max-w-3xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-3 sm:space-y-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-xl font-bold tracking-tight text-[var(--ink-primary)]">
              Following Dispatches
            </h1>
            {followedAuthors.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                {followedAuthors.length} followed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setManageModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manage Writers</span>
            </button>
            <Link
              to="/discover"
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors no-underline"
            >
              <span>+ Discover</span>
            </Link>
          </div>
        </div>

        {/* Single Unified Control Bar (No Stacked Tabs!) */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
          {/* Left: Type Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {TYPE_TABS.map((tab) => {
              const active = selectedType === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                      : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Right: Author Filter Dropdown + Search Input in the SAME line */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Author Dropdown Selector */}
            {followedAuthors.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                {activeAuthor ? (
                  <div className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full text-xs bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs">
                    <img
                      src={activeAuthor.showAvatar !== false ? activeAuthor.avatar : '/unisex-avatar.svg'}
                      alt={activeAuthor.name}
                      className="h-4 w-4 rounded-full object-cover grayscale"
                    />
                    <span className="font-medium max-w-[90px] sm:max-w-[120px] truncate">
                      {activeAuthor.showName !== false ? activeAuthor.name : `@${activeAuthor.handle}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedAuthor('all')}
                      className="hover:opacity-75 p-0.5 cursor-pointer ml-0.5"
                      title="Clear author filter"
                      aria-label="Clear author filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthorDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
                  >
                    <Users className="h-3 w-3 text-[var(--ink-muted)]" />
                    <span className="hidden sm:inline">Author:</span>
                    <span>All ({followedAuthors.length})</span>
                    <ChevronDown className="h-3 w-3 text-[var(--ink-muted)]" />
                  </button>
                )}

                {/* Dropdown Menu */}
                {authorDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1 shadow-xl z-30 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold border-b border-[var(--border-subtle)] flex items-center justify-between">
                      <span>Filter by Writer</span>
                      <span className="text-[9px] text-[var(--ink-faint)]">{followedAuthors.length} followed</span>
                    </div>

                    <div className="max-h-56 overflow-y-auto py-1 divide-y divide-[var(--border-subtle)]/50">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAuthor('all')
                          setAuthorDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                          selectedAuthor === 'all'
                            ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                            : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-muted)]">
                            <Users className="h-3 w-3" />
                          </div>
                          <span>All Followed Writers</span>
                        </div>
                        {selectedAuthor === 'all' && <Check className="h-3.5 w-3.5 text-[var(--ink-primary)]" />}
                      </button>

                      {followedAuthors.map((author) => {
                        const isSelected = selectedAuthor === author.id || selectedAuthor === author.handle
                        const displayName = author.showName !== false ? author.name : `@${author.handle}`
                        const avatarSrc = author.showAvatar !== false ? author.avatar : '/unisex-avatar.svg'

                        return (
                          <button
                            key={author.id}
                            type="button"
                            onClick={() => {
                              setSelectedAuthor(author.id)
                              setAuthorDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                                : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]/60 hover:text-[var(--ink-primary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={avatarSrc}
                                alt={displayName}
                                className="h-5 w-5 rounded-full object-cover grayscale shrink-0 border border-[var(--border-subtle)]"
                              />
                              <div className="min-w-0">
                                <p className="truncate leading-tight font-medium">{displayName}</p>
                                <p className="text-[10px] text-[var(--ink-faint)] font-mono leading-none mt-0.5">
                                  {author.worksCount} works
                                </p>
                              </div>
                            </div>
                            {isSelected && <Check className="h-3.5 w-3.5 text-[var(--ink-primary)] shrink-0 ml-1.5" />}
                          </button>
                        )
                      })}
                    </div>

                    <div className="pt-1 border-t border-[var(--border-subtle)] px-2.5 py-1.5 flex items-center justify-between text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorDropdownOpen(false)
                          setManageModalOpen(true)
                        }}
                        className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] underline cursor-pointer"
                      >
                        Manage writers
                      </button>
                      <Link
                        to="/discover"
                        onClick={() => setAuthorDropdownOpen(false)}
                        className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] no-underline hover:underline"
                      >
                        + Discover
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Search */}
            <div className="hidden sm:flex items-center relative w-36 lg:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-faint)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-7 pl-7.5 pr-6 text-xs rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-faint)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink-primary)] cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              type="button"
              onClick={() => setSearchMobileOpen((prev) => !prev)}
              className="sm:hidden p-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              title="Search dispatches"
              aria-label="Search dispatches"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile Search Input when expanded */}
        {searchMobileOpen && (
          <div className="sm:hidden relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-faint)] pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Search dispatches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-faint)] focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchMobileOpen(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink-primary)] text-[10px] font-mono uppercase"
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* Feed List or Empty State */}
        {followedAuthors.length === 0 ? (
          <EmptyState
            type="no-following"
            actionLabel="Discover Writers to Follow"
            actionHref="/discover"
          />
        ) : feedItems.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <BookOpen className="h-5 w-5 text-[var(--ink-muted)]" />
            </div>
            <p className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              No matching dispatches
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              Try adjusting your type filter, author selection, or search query.
            </p>
            {(selectedType !== 'all' || selectedAuthor !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType('all')
                  setSelectedAuthor('all')
                  setSearchQuery('')
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] shadow-xs overflow-hidden">
            {feedItems.map((event) => {
              const isChapter = event.type === 'chapter_release' && event.chapter
              const targetUrl = isChapter
                ? `/read/${event.work.id}/${event.chapter!.id}`
                : `/works/${event.work.id}`

              return (
                <div
                  key={event.id}
                  className="group p-3 sm:p-3.5 hover:bg-[var(--bg-subtle)]/35 transition-colors flex items-start gap-3 sm:gap-3.5"
                >
                  {/* Book cover thumbnail */}
                  <Link
                    to={targetUrl as any}
                    className="shrink-0 relative rounded overflow-hidden border border-[var(--border-subtle)] shadow-2xs self-start"
                    title={`Read ${event.work.title}`}
                  >
                    <img
                      src={event.work.cover}
                      alt={event.work.title}
                      className="h-15 w-10.5 sm:h-17 sm:w-11.5 object-cover transition-transform group-hover:scale-105 duration-200"
                      loading="lazy"
                    />
                  </Link>

                  {/* Details */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {/* Metadata line */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to="/author/$authorId"
                        params={{ authorId: event.author.handle || event.author.id }}
                        className="inline-flex items-center gap-1.5 text-inherit no-underline hover:underline group/author"
                      >
                        <img
                          src={event.author.showAvatar !== false ? event.author.avatar : '/unisex-avatar.svg'}
                          alt={event.author.name}
                          className="h-4 w-4 rounded-full object-cover grayscale border border-[var(--border-subtle)]"
                        />
                        <span className="text-xs font-semibold text-[var(--ink-primary)] group-hover/author:text-[var(--accent-primary,var(--ink-primary))]">
                          {event.author.showName !== false ? event.author.name : `@${event.author.handle}`}
                        </span>
                      </Link>

                      <span className="text-[10px] text-[var(--ink-muted)]">•</span>

                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                        {isChapter ? 'Chapter' : 'Work'}
                      </span>

                      <span className="text-[10px] sm:text-[11px] font-mono text-[var(--ink-faint)] ml-auto shrink-0 pl-1">
                        {event.timestamp}
                      </span>
                    </div>

                    {/* Book title & Chapter */}
                    <Link
                      to={targetUrl as any}
                      className="block text-inherit no-underline pt-0.5"
                    >
                      <h3 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] group-hover:underline truncate">
                        {event.work.title}
                      </h3>
                      {isChapter ? (
                        <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate">
                          Ch. {event.chapter!.number}: {event.chapter!.title}
                        </p>
                      ) : (
                        <p className="text-[11px] text-[var(--ink-secondary)] font-sans truncate">
                          {event.work.category} · {event.work.genre}
                        </p>
                      )}
                    </Link>

                    {/* Note / snippet */}
                    <p className="text-[11px] sm:text-xs text-[var(--ink-secondary)] line-clamp-1 font-sans">
                      {event.note}
                    </p>
                  </div>

                  {/* Read link */}
                  <Link
                    to={targetUrl as any}
                    className="shrink-0 self-center hidden sm:inline-flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors no-underline ml-1"
                  >
                    <span>Read</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Manage Followed Writers Modal */}
      <Modal
        isOpen={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        title={`Writers Followed (${followedAuthors.length})`}
        description="Authors you follow for serialized dispatches and chapter updates."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link
              to="/discover"
              onClick={() => setManageModalOpen(false)}
              className="text-xs font-mono text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
            >
              <span>Find more authors</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={() => setManageModalOpen(false)}
              className="px-3 py-1 rounded-md text-xs font-medium border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] cursor-pointer"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="modal-scrollable-content max-h-80 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {followedAuthors.length === 0 ? (
            <p className="p-4 text-center text-xs text-[var(--ink-muted)]">
              You are not following any writers yet.
            </p>
          ) : (
            followedAuthors.map((author) => {
              const showAvatar = author.showAvatar !== false
              const showName = author.showName !== false
              const showUsername = author.showUsername !== false
              const authorDisplayName = showName
                ? author.name
                : showUsername
                  ? `@${author.handle}`
                  : 'Anonymous Author'
              const authorAvatar = showAvatar ? author.avatar : '/unisex-avatar.svg'

              return (
                <div key={author.id} className="flex items-center justify-between gap-3 p-3 hover:bg-[var(--bg-subtle)]/30">
                  <Link
                    to="/author/$authorId"
                    params={{ authorId: author.handle || author.id }}
                    onClick={() => setManageModalOpen(false)}
                    className="flex items-center gap-2.5 text-inherit no-underline min-w-0"
                  >
                    <img
                      src={authorAvatar}
                      alt={authorDisplayName}
                      className="h-8 w-8 rounded-full object-cover grayscale shrink-0 border border-[var(--border-subtle)]"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--ink-primary)] truncate hover:underline">
                        {authorDisplayName}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--ink-faint)]">
                        {author.worksCount} works · @{author.handle}
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleFollowAuthor(author.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border border-[var(--border-subtle)] hover:border-red-500 hover:text-red-500 text-[var(--ink-secondary)] transition-colors cursor-pointer"
                    title="Unfollow writer"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Following</span>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}
