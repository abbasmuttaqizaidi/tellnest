import React from 'react'
import { Link } from '@tanstack/react-router'
import type { Author } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { UserPlus, UserCheck, BookOpen } from 'lucide-react'
import { OptimizedImage } from './OptimizedImage'

interface AuthorCardProps {
  author: Author
}

export default function AuthorCard({ author }: AuthorCardProps) {
  const { isAuthorFollowed, toggleFollowAuthor } = useApp()
  const followed = isAuthorFollowed(author.id)

  return (
    <div className="flex flex-col justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 hover:border-[var(--border-strong)] transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/author/$authorId"
            params={{ authorId: author.id }}
            className="flex items-center gap-3 no-underline text-inherit"
          >
            <OptimizedImage
              src={author.avatar}
              alt={author.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover grayscale border border-[var(--border-subtle)]"
            />
            <div>
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)] hover:underline leading-snug">
                {author.name}
              </h4>
              <p className="font-mono text-xs text-[var(--ink-muted)]">@{author.handle}</p>
            </div>
          </Link>

          <button
            onClick={() => toggleFollowAuthor(author.id)}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
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
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--ink-muted)] line-clamp-2">
          {author.bio}
        </p>

        {author.featuredQuote && (
          <blockquote className="mt-3 border-l border-[var(--border-strong)] pl-2.5 font-serif text-[11px] italic text-[var(--ink-muted)] line-clamp-2">
            "{author.featuredQuote}"
          </blockquote>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--ink-faint)]">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {author.worksCount} Works
        </span>
        <span>{author.followersCount.toLocaleString()} Followers</span>
        <span>{author.totalReads} Reads</span>
      </div>
    </div>
  )
}
