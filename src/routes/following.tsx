import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { FEED_EVENTS, AUTHORS } from '../data/mockData'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Users, BookOpen, Clock, Sparkles, ArrowRight, UserCheck } from 'lucide-react'
import { generateMeta } from '../lib/seo'

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
  const { followedAuthorIds, toggleFollowAuthor, allWorks } = useApp()
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Followed authors
  const followedAuthors = useMemo(() => {
    return AUTHORS.filter((a) => followedAuthorIds.includes(a.id))
  }, [followedAuthorIds])

  // Filter feed items for authors we follow
  const feedItems = useMemo(() => {
    return FEED_EVENTS.filter((event) => {
      if (!followedAuthorIds.includes(event.author.id)) return false
      if (selectedType !== 'all' && event.type !== selectedType) return false
      if (selectedAuthor !== 'all' && event.author.id !== selectedAuthor) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesAuthor = event.author.name.toLowerCase().includes(q)
        const matchesWork = event.work.title.toLowerCase().includes(q)
        const matchesNote = event.note.toLowerCase().includes(q)
        if (!matchesAuthor && !matchesWork && !matchesNote) return false
      }
      return true
    })
  }, [followedAuthorIds, selectedType, selectedAuthor, searchQuery])

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="pb-8 border-b border-[var(--border-subtle)] mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
          <Users className="h-3.5 w-3.5" />
          <span>Dispatches from Writers</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink-primary)]">
          Following Dispatches
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
          A calm, chronological record of new chapters and published manuscripts from writers you follow.
        </p>
      </div>

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
                      params={{ authorId: event.author.id }}
                      className="flex items-center gap-2.5 text-inherit no-underline group"
                    >
                      <img
                        src={event.author.avatar}
                        alt={event.author.name}
                        className="h-7 w-7 rounded-full object-cover grayscale"
                      />
                      <span className="text-xs font-semibold text-[var(--ink-primary)] group-hover:underline">
                        {event.author.name}
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
                {followedAuthors.map((author) => (
                  <div key={author.id} className="flex items-center justify-between gap-3">
                    <Link
                      to="/author/$authorId"
                      params={{ authorId: author.id }}
                      className="flex items-center gap-2.5 text-inherit no-underline min-w-0"
                    >
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="h-8 w-8 rounded-full object-cover grayscale flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--ink-primary)] truncate hover:underline">
                          {author.name}
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
                ))}
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
  )
}
