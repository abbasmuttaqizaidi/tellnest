import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Users, BookOpen, Clock, Sparkles, ArrowRight, UserCheck } from 'lucide-react'
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

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <RouteHeader
        title="Following Dispatches"
        subtitle="Updates from followed writers"
      />

      <div className="px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-3 sm:pt-6 space-y-3 sm:space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)] text-xs">
            <h2 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
              Recent Editorial Updates
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <FilterDisclosure
                label="Update Type"
                activeId={selectedType}
                onChange={setSelectedType}
                items={[
                  { id: 'all', label: 'All Dispatches' },
                  { id: 'chapter_release', label: 'Chapter Drops' },
                  { id: 'new_work', label: 'New Manuscripts' },
                  { id: 'milestone', label: 'Milestones' },
                ]}
              />

              {followedAuthors.length > 0 && (
                <FilterDisclosure
                  label="Author"
                  activeId={selectedAuthor}
                  onChange={setSelectedAuthor}
                  items={[
                    { id: 'all', label: 'All Followed Writers' },
                    ...followedAuthors.map((a) => ({ id: a.id, label: a.name })),
                  ]}
                />
              )}

              <AnimatedSearch
                variant="expandable"
                placeholder="Filter dispatches..."
                value={searchQuery}
                onChange={setSearchQuery}
                shortcut="/"
              />
            </div>
          </div>

          {feedItems.length === 0 ? (
            <EmptyState
              type="no-following"
              actionLabel="Discover Writers to Follow"
              actionHref="/discover"
            />
          ) : (
            <div className="space-y-4">
              {feedItems.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 hover:border-[var(--border-strong)] transition-all"
                >
                  {/* Top Author Metadata */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                    <Link
                      to="/author/$authorId"
                      params={{ authorId: event.author.handle || event.author.id }}
                      className="flex items-center gap-2.5 text-inherit no-underline group"
                    >
                      <img
                        src={event.author.showAvatar !== false ? event.author.avatar : '/unisex-avatar.svg'}
                        alt={event.author.showName !== false ? event.author.name : (event.author.showUsername !== false ? `@${event.author.handle}` : 'Author')}
                        className="h-7 w-7 rounded-full object-cover grayscale"
                      />
                      <span className="text-xs font-semibold text-[var(--ink-primary)] group-hover:underline">
                        {event.author.showName !== false
                          ? event.author.name
                          : event.author.showUsername !== false
                            ? `@${event.author.handle}`
                            : 'Author'}
                      </span>
                    </Link>
                    <span className="font-mono text-[11px] text-[var(--ink-faint)]">
                      {event.timestamp}
                    </span>
                  </div>

                  {/* Event Note */}
                  <p className="mt-3 text-xs text-[var(--ink-secondary)] font-sans">
                    {event.note}
                  </p>

                  {/* Attached Work / Chapter Card */}
                  <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={event.work.cover}
                        alt={event.work.title}
                        className="h-12 w-9 rounded object-cover grayscale flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] uppercase text-[var(--ink-faint)]">
                          {event.work.category}
                        </span>
                        <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate">
                          {event.work.title}
                        </h4>
                        {event.chapter && (
                          <p className="text-xs text-[var(--ink-muted)] font-serif italic truncate">
                            Ch. {event.chapter.number}: {event.chapter.title}
                          </p>
                        )}
                      </div>
                    </div>

                    <Link
                      to={
                        event.chapter
                          ? ('/read/$workId/$chapterId' as any)
                          : ('/works/$workId' as any)
                      }
                      params={
                        event.chapter
                          ? { workId: event.work.id, chapterId: event.chapter.id }
                          : { workId: event.work.id }
                      }
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 no-underline"
                    >
                      <span>Read Now</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Writers You Follow */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[var(--ink-primary)] font-semibold pb-3 border-b border-[var(--border-subtle)] mb-4">
              Writers Followed ({followedAuthors.length})
            </h3>

            {followedAuthors.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">
                You are not currently following any writers.
              </p>
            ) : (
              <div className="space-y-3.5">
                {followedAuthors.map((author) => {
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
                    <div key={author.id} className="flex items-center justify-between gap-3">
                      <Link
                        to="/author/$authorId"
                        params={{ authorId: author.handle || author.id }}
                        className="flex items-center gap-2.5 text-inherit no-underline min-w-0"
                      >
                        <img
                          src={authorAvatar}
                          alt={authorDisplayName}
                          className="h-8 w-8 rounded-full object-cover grayscale flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--ink-primary)] truncate hover:underline">
                            {authorDisplayName}
                          </p>
                          <p className="text-[10px] font-mono text-[var(--ink-faint)]">
                            {author.worksCount} works
                          </p>
                        </div>
                      </Link>

                      <button
                        onClick={() => toggleFollowAuthor(author.id)}
                        className="p-1 text-[var(--ink-muted)] hover:text-red-500 transition-colors"
                        title="Unfollow"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
              <Link
                to="/discover"
                className="text-xs font-mono text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
              >
                Find more authors <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

      </div>
      </div>
    </div>
  )
}
