import React from 'react'
import { Link } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import type { Author } from '../data/mockData'
import { useApp } from '../context/AppContext'
import { UserPlus, UserCheck, BookOpen } from 'lucide-react'
import UnisexAvatar from './UnisexAvatar'
import { formatViewCount } from '../lib/utils'

interface AuthorCardProps {
  author: Author
}

export default function AuthorCard({ author }: AuthorCardProps) {
  const { isAuthorFollowed, toggleFollowAuthor, isSignedIn, openAuthModal } = useApp()
  const { user } = useUser()
  const followed = isAuthorFollowed(author.id) || isAuthorFollowed(author.handle)
  const authorSlug = author.handle || author.id

  const isSelf = Boolean(
    user && (
      author.id === user.id ||
      (user.username && author.handle && author.handle.toLowerCase() === user.username.toLowerCase())
    )
  )

  const showAvatar = author.showAvatar !== false
  const showName = author.showName !== false
  const showUsername = author.showUsername !== false
  const displayName = showName
    ? author.name
    : showUsername
      ? `@${author.handle}`
      : 'Anonymous Author'

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/author/$authorId"
            params={{ authorId: authorSlug }}
            preload="intent"
            className="flex items-center gap-3 no-underline text-inherit"
          >
            <UnisexAvatar
              size="lg"
              avatarPath={showAvatar ? author.avatar : undefined}
              forceUnisex={!showAvatar}
              seed={showName ? author.name : (showUsername ? author.handle : 'anonymous')}
              className="h-12 w-12 rounded-full border border-[var(--border-subtle)] shrink-0"
            />
            <div>
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)] hover:underline leading-snug">
                {displayName}
              </h4>
              {showUsername && <p className="font-mono text-xs text-[var(--ink-muted)]">@{author.handle}</p>}
            </div>
          </Link>

          {!isSelf && (
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
          )}
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
        <span title={`${formatViewCount(author.totalReads, false)} Reads`}>
          {formatViewCount(author.totalReads, true)} Reads
        </span>
      </div>
    </div>
  )
}
