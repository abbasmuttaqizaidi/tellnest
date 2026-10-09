import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import WorkCard from '../components/WorkCard'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure, AnimatedSearch } from '../design-system'
import {
  UserPlus,
  UserCheck,
  BookOpen,
  MapPin,
  Quote,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import { AUTHORS } from '../data/mockData'
import { generateMeta } from '../lib/seo'
import { getPublicAuthorServerFn } from '../server/works'
import { formatViewCount } from '../lib/utils'

export const Route = createFileRoute('/author/$authorId')({
  loader: async ({ params }) => {
    const raw = (params.authorId || '').trim().toLowerCase()
    const staticAuthor = AUTHORS.find((a) => a.id === params.authorId || a.handle.toLowerCase() === raw)
    if (staticAuthor) return { author: staticAuthor }

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
    if (!author) {
      author = AUTHORS.find((a) => a.id === params.authorId || a.handle.toLowerCase() === params.authorId.toLowerCase())
    }
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

    return generateMeta({
      title: `${author.name} (@${author.handle}) — Author Archive`,
      description: author.bio || `Read serialized fiction and literary works by ${author.name} on Hatchpen.`,
      canonicalUrl: `https://hatchpen.com/author/${author.id}`,
      ogType: 'profile',
      ogImage: author.avatar,
      ogImageAlt: `${author.name} avatar`,
      keywords: [
        author.name,
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
          name: author.name,
          alternateName: `@${author.handle}`,
          description: author.bio,
          image: author.avatar,
          url: `https://hatchpen.com/author/${author.id}`,
        },
      },
    })
  },
  component: AuthorProfilePage,
})

function AuthorProfilePage() {
  const { authorId } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const {
    getAuthorById,
    allWorks,
    isAuthorFollowed,
    toggleFollowAuthor
  } = useApp()

  const [activeTab, setActiveTab] = useState<'all' | 'ongoing' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'updated' | 'title'>('popularity')
  const [searchQuery, setSearchQuery] = useState<string>('')

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
      return parseInt(b.totalReads) - parseInt(a.totalReads)
    })
  }, [authorWorks, activeTab, sortBy, searchQuery])

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

  const followed = isAuthorFollowed(author.id)

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Author Header Card */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-12 mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <img
              src={author.avatar}
              alt={author.name}
              loading="lazy"
              decoding="async"
              className="h-20 w-20 rounded-full object-cover grayscale border-2 border-[var(--border-strong)] shadow-sm"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
                  {author.name}
                </h1>
                {author.verified && (
                  <span className="rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] p-0.5" title="Verified Author">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-[var(--ink-muted)]">@{author.handle}</p>
              {author.location && (
                <p className="flex items-center gap-1 text-xs text-[var(--ink-faint)] font-mono">
                  <MapPin className="h-3 w-3" />
                  <span>{author.location}</span>
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => toggleFollowAuthor(author.id)}
            className={`inline-flex items-center gap-2 rounded px-5 py-2.5 text-xs font-semibold transition-all ${
              followed
                ? 'border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                : 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
            }`}
          >
            {followed ? (
              <>
                <UserCheck className="h-4 w-4" />
                <span>Following</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Follow Author</span>
              </>
            )}
          </button>
        </div>

        {/* Bio & Literary Quote */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7 space-y-2">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
              Author Biography
            </h3>
            <p className="text-sm leading-relaxed text-[var(--ink-secondary)] font-sans">
              {author.bio}
            </p>
          </div>

          {author.featuredQuote && (
            <div className="md:col-span-5 border-l border-[var(--border-strong)] pl-5 space-y-1">
              <Quote className="h-4 w-4 text-[var(--ink-muted)]" />
              <p className="font-serif text-xs italic leading-relaxed text-[var(--ink-muted)]">
                "{author.featuredQuote}"
              </p>
            </div>
          )}
        </div>

        {/* Author Quantitative Footprint */}
        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-4 font-mono text-center">
          <div>
            <p className="text-xl font-semibold text-[var(--ink-primary)]">{author.worksCount}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Works Cataloged</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--ink-primary)]">{author.followersCount.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Followers</p>
          </div>
          <div title={`${formatViewCount(author.totalReads, false)} Lifetime Reads`}>
            <p className="text-xl font-semibold text-[var(--ink-primary)]">{formatViewCount(author.totalReads, true)}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">Lifetime Reads</p>
          </div>
        </div>
      </div>

      {/* Published Works Section */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)] mb-8 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <FilterDisclosure
              label="Catalog Filter"
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as any)}
              items={[
                { id: 'all', label: `All Works (${authorWorks.length})` },
                { id: 'ongoing', label: 'Ongoing Serials' },
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
          </div>

          <AnimatedSearch
            variant="expandable"
            placeholder={`Search ${author?.name}'s works...`}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
