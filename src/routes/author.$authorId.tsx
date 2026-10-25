import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import UnisexAvatar from '../components/UnisexAvatar'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import {
  UserPlus,
  UserCheck,
  BookOpen,
  MapPin,
  Quote,
  Eye,
  CheckCircle2,
  Edit3,
  Lock,
  Shield,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { getPublicAuthorServerFn } from '../server/works'
import { formatViewCount, parseTotalReads } from '../lib/utils'

export const Route = createFileRoute('/author/$authorId')({
  staleTime: 0,
  gcTime: 5 * 60 * 1000,
  loader: async ({ params }) => {
    try {
      const dbAuthor = await getPublicAuthorServerFn({ data: params.authorId })
      if (dbAuthor) return { author: dbAuthor }
    } catch (e) {
      console.warn('[Route /author/$authorId] Loader lookup error:', e)
    }

    return { author: null }
  },
  head: ({ params, loaderData }) => {
    let author = loaderData?.author
    if (!author && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
          const list = JSON.parse(stored)
          const matched = list.find(
            (w: any) =>
              w.author?.id === params.authorId ||
              w.author?.handle?.toLowerCase() === params.authorId.toLowerCase()
          )
          if (matched) author = matched.author
        }
      } catch (e) {}
    }

    if (!author) {
      return generateMeta({
        title: 'Author Archive',
        noindex: true,
      })
    }

    const showMetaName = author.showName !== false
    const showMetaUsername = author.showUsername !== false
    const metaAuthorName = showMetaName
      ? author.name
      : showMetaUsername
        ? `@${author.handle}`
        : 'Author'

    return generateMeta({
      title: `${metaAuthorName}${showMetaUsername && showMetaName ? ` (@${author.handle})` : ''} — Author Archive`,
      description: author.bio || `Read serialized fiction and literary works by ${metaAuthorName} on Hatchpen.`,
      canonicalUrl: `https://hatchpen.com/author/${author.handle || author.id}`,
      ogType: 'profile',
      ogImage: author.showAvatar !== false ? author.avatar : undefined,
      ogImageAlt: `${metaAuthorName} avatar`,
      keywords: [
        metaAuthorName,
        author.handle,
        'author archive',
        'indie author',
        'serialized novelist',
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: metaAuthorName,
          alternateName: showMetaUsername ? `@${author.handle}` : undefined,
          description: author.bio,
          image: author.showAvatar !== false ? author.avatar : undefined,
          url: `https://hatchpen.com/author/${author.handle || author.id}`,
        },
      },
    })
  },
  component: AuthorProfilePage,
})

function AuthorProfilePage() {
  const { authorId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const { isSignedIn, isLoaded, user } = useUser()
  const {
    openAuthModal,
    getAuthorById,
    allWorks,
    isAuthorFollowed,
    toggleFollowAuthor,
  } = useApp()

  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated' | 'title'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // 1. Requirement: Public users cannot view profile. Open login/signup modal popup.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      openAuthModal(`/author/${authorId}`)
    }
  }, [isLoaded, isSignedIn, authorId, openAuthModal])

  const author = loaderData?.author || getAuthorById(authorId)

  // Find works written by this author
  const authorWorks = useMemo(() => {
    if (!author) return []
    return allWorks.filter(
      (w) =>
        w.author.id === author.id ||
        w.author.handle.toLowerCase() === author.handle.toLowerCase() ||
        w.author.id === authorId ||
        w.author.handle.toLowerCase() === authorId.toLowerCase()
    )
  }, [allWorks, author, authorId])

  const filteredWorks = useMemo(() => {
    let works = authorWorks
    if (activeTab === 'ongoing') works = works.filter((w) => w.status === 'Ongoing')
    if (activeTab === 'completed') works = works.filter((w) => w.status === 'Completed')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      works = works.filter(
        (w) =>
          w.title.toLowerCase().includes(q) ||
          w.genre.toLowerCase().includes(q) ||
          w.synopsis.toLowerCase().includes(q)
      )
    }

    return [...works].sort((a, b) => {
      if (sortBy === 'updated') return a.updatedAt.localeCompare(b.updatedAt)
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return parseTotalReads(b.totalReads) - parseTotalReads(a.totalReads)
    })
  }, [authorWorks, activeTab, sortBy, searchQuery])

  // Public / Unauthenticated User Gate
  if (isLoaded && !isSignedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center max-w-5xl mx-auto">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-strong)] flex items-center justify-center mx-auto text-[var(--ink-primary)]">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
            Sign In to View Profile
          </h2>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
            HatchPen author profiles, serial manuscripts, and literary archives are reserved for registered community members.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal(`/author/${authorId}`)}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            Sign In or Create Account
          </button>
        </div>
      </div>
    )
  }

  if (!author) {
    return (
      <div className="py-20 px-4 max-w-xl mx-auto">
        <EmptyState
          type="no-following"
          customTitle="Author Not Located"
          customDescription="This writer's profile does not exist in the HatchPen catalog."
          actionLabel="Return to Catalog"
          actionHref="/discover"
        />
      </div>
    )
  }

  const followed = isAuthorFollowed(author.id) || isAuthorFollowed(author.handle)
  const isSelf = Boolean(
    user && (
      author.id === user.id ||
      (user.username && author.handle && author.handle.toLowerCase() === user.username.toLowerCase())
    )
  )

  // 2. Requirement: By default profile is private. If private & not self, hide profile.
  const isProfilePublic = author.isPublic ?? false
  if (!isProfilePublic && !isSelf) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12 text-center max-w-5xl mx-auto">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-strong)] flex items-center justify-center mx-auto text-[var(--ink-secondary)]">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
            This Profile is Private
          </h2>
          <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
            @{author.handle} has set their profile to private. Only the author can view their catalog and literary statistics.
          </p>
          <Link
            to="/discover"
            className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-lg border border-[var(--border-strong)] text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
          >
            Explore Discover
          </Link>
        </div>
      </div>
    )
  }

  // Track initial follow baseline to avoid double-counting if author was already followed on initial load
  const [initialFollowState] = useState(() => followed)
  const currentFollowersCount = Math.max(
    0,
    author.followersCount + (followed ? 1 : 0) - (initialFollowState ? 1 : 0)
  )

  // Granular visibility: strictly follows what the user selected in privacy settings
  const showWorksCount = Boolean(author.showWorksCount)
  const showFollowers = Boolean(author.showFollowers)
  const showReads = Boolean(author.showReads)
  const showReadingHistory = Boolean(author.showReadingHistory)
  const hasAnyStats = showWorksCount || showFollowers || showReads || showReadingHistory

  const showAvatar = author.showAvatar !== false
  const showName = author.showName !== false
  const showUsername = author.showUsername !== false

  const displayName = isSelf
    ? author.name
    : showName
      ? author.name
      : showUsername
        ? `@${author.handle}`
        : 'Anonymous Author'

  const isWorksCatalogHidden = author.worksVisibility === 'hidden'

  return (
    <div className="min-h-screen py-4 sm:py-6 px-3.5 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Informative Banner for Author when Profile is Private */}
      {!isProfilePublic && isSelf && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Your Profile is Private:</strong> Only you can see this page. Other members cannot view your profile or works until you make it public.
            </span>
          </div>
          <Link
            to="/settings"
            className="font-semibold underline shrink-0 hover:opacity-80 text-amber-950 dark:text-amber-100"
          >
            Manage Privacy
          </Link>
        </div>
      )}

      {/* Author Header Card - Compact on Desktop & Mobile */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 mb-5 shadow-xs">
        <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <UnisexAvatar
              size="lg"
              avatarPath={showAvatar ? author.avatar : undefined}
              forceUnisex={!showAvatar}
              seed={showName ? author.name : (showUsername ? author.handle : 'anonymous')}
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border border-[var(--border-strong)] shrink-0"
            />
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-serif text-lg sm:text-2xl font-semibold text-[var(--ink-primary)] truncate">
                  {displayName}
                </h1>
                {author.verified && (isSelf || showName) && (
                  <span className="rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] p-0.5 shrink-0" title="Verified Author">
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                )}
                {isSelf && author.showName === false && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Name Hidden
                  </span>
                )}
                {isSelf && author.showAvatar === false && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    DP Hidden
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[var(--ink-muted)] font-mono">
                {(isSelf || showUsername) && <span>@{author.handle}</span>}
                {isSelf && author.showUsername === false && (
                  <span className="text-[10px] text-amber-700 dark:text-amber-400">
                    (@handle hidden to public)
                  </span>
                )}
                {author.location && (
                  <span className="flex items-center gap-1 text-[var(--ink-faint)]">
                    <MapPin className="h-3 w-3" />
                    <span>{author.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            {isSelf ? (
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-muted)] transition-all no-underline"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <button
                onClick={() => toggleFollowAuthor(author.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold transition-all ${
                  followed
                    ? 'border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                    : 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
                }`}
              >
                {followed ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bio & Literary Quote */}
        {(author.bio || author.featuredQuote) && (
          <div className="pt-3 space-y-2">
            {author.bio && (
              <p className="text-xs sm:text-[13px] leading-relaxed text-[var(--ink-secondary)] font-sans">
                {author.bio}
              </p>
            )}
            {author.featuredQuote && (
              <div className="border-l-2 border-[var(--border-strong)] pl-2.5 py-0.5">
                <p className="font-serif text-xs italic text-[var(--ink-muted)]">
                  "{author.featuredQuote}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Author Quantitative Footprint (Granular Privacy Respected) */}
        {hasAnyStats && (
          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-xs">
            {showWorksCount && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{author.worksCount}</span>
                <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Works</span>
              </div>
            )}
            {showFollowers && (
              <div className="flex items-baseline gap-1.5">
                <span className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{currentFollowersCount.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Followers</span>
              </div>
            )}
            {showReads && (
              <div className="flex items-baseline gap-1.5" title={`${formatViewCount(author.totalReads, false)} Lifetime Reads`}>
                <span className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{formatViewCount(author.totalReads, true)}</span>
                <span className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Reads</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Published Works Section */}
      {isWorksCatalogHidden ? (
        <div className="p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-center space-y-2">
          <BookOpen className="w-6 h-6 mx-auto text-[var(--ink-muted)]" />
          <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
            Works Catalog Hidden
          </h3>
          <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
            {isSelf
              ? 'You have set your manuscripts catalog to hidden. Readers cannot see your stories on this profile.'
              : 'This author has chosen to keep their published works catalog private.'}
          </p>
          {isSelf && (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg border border-[var(--border-strong)] text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] no-underline"
            >
              <span>Manage in Settings</span>
            </Link>
          )}
        </div>
      ) : (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] mb-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <FilterDisclosure
                label="Catalog Filter"
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as any)}
                items={[
                  { id: 'all', label: `All Works (${authorWorks.length})` },
                  { id: 'ongoing', label: 'Ongoing' },
                  { id: 'completed', label: 'Completed' },
                ]}
              />

              <FilterDisclosure
                label="Sort Order"
                activeId={sortBy}
                onChange={(id) => setSortBy(id as any)}
                items={[
                  { id: 'popularity', label: 'Most Reads' },
                  { id: 'updated', label: 'Recently Updated' },
                  { id: 'title', label: 'Title (A-Z)' },
                ]}
              />

              {isSelf && author.worksVisibility === 'hidden' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Catalog Hidden from Public
                </span>
              )}
            </div>

            <AnimatedSearch
              variant="expandable"
              placeholder={`Search works...`}
              value={searchQuery}
              onChange={setSearchQuery}
              shortcut="/"
            />
          </div>

          {filteredWorks.length === 0 ? (
            <EmptyState
              type="no-works"
              customTitle="No Works In This Category"
              customDescription="The author has not cataloged works matching this specific filter."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredWorks.map((work) => (
                <WorkCard key={work.id} work={work} layout="portrait" />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
