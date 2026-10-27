import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import type { Author, Work } from '../data/mockData'
import { UnisexAvatar } from './UnisexAvatar'
import { formatViewCount } from '../lib/utils'
import { OptimizedImage } from './OptimizedImage'
import {
  X,
  UserCheck,
  UserPlus,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export interface AuthorProfileModalProps {
  isOpen: boolean
  onClose: () => void
  author?: Author | null
  authorWorks?: Work[]
}

export function AuthorProfileModal({
  isOpen,
  onClose,
  author,
  authorWorks,
}: AuthorProfileModalProps) {
  const { allWorks, followedAuthorIds, isAuthorFollowed, toggleFollowAuthor, user, openAuthModal } = useApp()
  const trackRef = useRef<HTMLDivElement>(null)

  // Track responsive screen size (Mobile vs Desktop)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640
    }
    return false
  })

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scrolling while modal/drawer is open
  useEffect(() => {
    if (!isOpen) return
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
    }
  }, [isOpen])

  const isFollowing = useMemo(() => {
    if (!author?.id) return false
    if (typeof isAuthorFollowed === 'function') {
      return Boolean(isAuthorFollowed(author.id) || (author.handle && isAuthorFollowed(author.handle)))
    }
    if (Array.isArray(followedAuthorIds)) {
      return Boolean(followedAuthorIds.includes(author.id) || (author.handle && followedAuthorIds.includes(author.handle)))
    }
    return false
  }, [author?.id, author?.handle, isAuthorFollowed, followedAuthorIds])

  const isSelf = Boolean(
    author &&
      (user?.id === author.id ||
        (author.handle && user?.username && author.handle.toLowerCase() === user.username.toLowerCase()))
  )

  // Dynamic followers count
  const [initialFollowState] = useState(() => isFollowing)
  const currentFollowersCount = Math.max(
    0,
    ((author?.followersCount) || 0) + (isFollowing ? 1 : 0) - (initialFollowState ? 1 : 0)
  )

  // Author published works
  const works = useMemo(() => {
    if (authorWorks && authorWorks.length > 0) return authorWorks
    if (!author) return []
    return (allWorks || []).filter(
      (w) =>
        (w.author?.id === author.id ||
          (author.handle && w.author?.handle?.toLowerCase() === author.handle.toLowerCase())) &&
        w.visibility !== 'draft' &&
        w.visibility !== 'private'
    )
  }, [authorWorks, allWorks, author])

  const isWorksCatalogHidden = author?.worksVisibility === 'hidden'

  const scrollTrack = (direction: 'left' | 'right') => {
    if (!trackRef.current) return
    const offset = direction === 'left' ? -220 : 220
    trackRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!author?.id) return
    if (!user) {
      openAuthModal(`/author/${author.handle || author.id}`)
      return
    }
    toggleFollowAuthor(author.id)
  }

  if (!isOpen || !author) return null

  const showAvatar = author.showAvatar !== false
  const showName = author.showName !== false
  const showUsername = author.showUsername !== false

  const displayName = isSelf
    ? author.name
    : showName
      ? author.name
      : showUsername
        ? `@${author.handle}`
        : 'Author'

  const content = (
    <>
      {/* Top Bar: Label & Close Button */}
      <div className="flex items-center justify-between pb-3 shrink-0">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
          Author Profile
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Header Profile Identity */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <UnisexAvatar
            size="md"
            avatarPath={showAvatar ? author.avatar : undefined}
            forceUnisex={!showAvatar}
            seed={showName ? author.name : (showUsername ? author.handle : 'author')}
            className="h-12 w-12 rounded-full object-cover grayscale border border-[var(--border-strong)] shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[var(--ink-primary)] truncate leading-tight">
              {displayName}
            </h3>
            {(isSelf || showUsername) && (
              <p className="font-mono text-xs text-[var(--ink-muted)] truncate">
                @{author.handle}
              </p>
            )}
          </div>
        </div>

        {/* Follow Button */}
        {!isSelf && (
          <button
            type="button"
            onClick={handleToggleFollow}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer shrink-0 ${
              isFollowing
                ? 'border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                : 'border border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 shadow-xs'
            }`}
          >
            {isFollowing ? (
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

      {/* Bio */}
      {author.bio && (
        <p className="text-xs text-[var(--ink-secondary)] leading-relaxed italic line-clamp-3 mt-2.5 shrink-0">
          "{author.bio}"
        </p>
      )}

      {/* Author Stats Row */}
      <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[var(--border-subtle)] my-3 text-center shrink-0">
        <div>
          <p className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)]">
            {formatViewCount(author.totalReads || 0, true)}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
            Reads
          </p>
        </div>
        <div>
          <p className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)]">
            {currentFollowersCount.toLocaleString()}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
            Followers
          </p>
        </div>
        <div>
          <p className="font-serif text-sm sm:text-base font-bold text-[var(--ink-primary)]">
            {works.length}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
            Stories
          </p>
        </div>
      </div>

      {/* Works Section: Slides if not hidden */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isWorksCatalogHidden ? (
          <div className="py-6 px-4 rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 text-center space-y-1.5 my-2">
            <Lock className="w-4 h-4 mx-auto text-[var(--ink-muted)]" />
            <p className="text-xs font-serif font-semibold text-[var(--ink-primary)]">
              Works Catalog Private
            </p>
            <p className="text-[11px] text-[var(--ink-muted)]">
              This author has chosen to keep their published manuscripts hidden.
            </p>
          </div>
        ) : works.length > 0 ? (
          <div className="space-y-2 pt-1 pb-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Published Stories ({works.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollTrack('left')}
                  className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  aria-label="Scroll left"
                  title="Previous story"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTrack('right')}
                  className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  aria-label="Scroll right"
                  title="Next story"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Horizontal Scroll Slides */}
            <div
              ref={trackRef}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-1 no-scrollbar scroll-smooth"
            >
              {works.map((w) => {
                const coverUrl =
                  w.cover ||
                  (w as any).coverImage ||
                  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'

                return (
                  <Link
                    key={w.id}
                    to="/works/$workId"
                    params={{ workId: w.id }}
                    onClick={onClose}
                    className="w-[125px] sm:w-[140px] shrink-0 snap-start group no-underline text-inherit"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] group-hover:border-[var(--ink-primary)] transition-all shadow-2xs">
                      <OptimizedImage
                        src={coverUrl}
                        alt={w.title}
                        width={280}
                        height={420}
                        fallbackSrc="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"
                        containerClassName="h-full w-full"
                        className="h-full w-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
                      />
                      {w.isStaffPick && (
                        <span className="absolute top-1 left-1 rounded bg-[var(--ink-primary)] px-1 py-0.2 font-mono text-[8px] font-bold text-[var(--accent-contrast)] uppercase">
                          Featured
                        </span>
                      )}
                    </div>
                    <h5 className="font-serif text-xs font-semibold text-[var(--ink-primary)] truncate mt-1.5 group-hover:underline">
                      {w.title}
                    </h5>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)] mt-0.5">
                      <span className="truncate max-w-[70px]">{w.genre || w.category}</span>
                      <span className="shrink-0 flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {formatViewCount(w.totalReads, true)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs font-mono text-[var(--ink-muted)] border border-dashed border-[var(--border-subtle)] rounded-xl my-2">
            No published stories available.
          </div>
        )}
      </div>
    </>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {isMobile ? (
            /* =====================================================================
               MOBILE BOTTOM DRAWER (Patterned after Slide 03 "Choose a mood" Drawer)
               - Spring animation: damping: 28, stiffness: 280
               - Drag-to-dismiss gesture with dragConstraints and velocity check
               - Pull handle indicator
               - Smooth background backdrop blur
               ===================================================================== */
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                aria-label="Close sheet overlay"
              />

              {/* Bottom Sheet Modal */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.15}
                onDragEnd={(_e, info) => {
                  if (info.offset.y > 80 || info.velocity.y > 400) {
                    onClose()
                  }
                }}
                className="relative z-50 w-full max-w-md max-h-[85vh] bg-[var(--bg-surface)] text-[var(--ink-primary)] rounded-t-[32px] shadow-[0_-16px_48px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden border-t border-[var(--border-subtle)] px-4 pb-5 pt-0"
              >
                {/* Pull handle indicator */}
                <div className="pt-3 pb-2 flex justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none">
                  <div className="w-12 h-1.5 bg-[var(--border-strong)] rounded-full" />
                </div>

                {content}
              </motion.div>
            </div>
          ) : (
            /* =====================================================================
               DESKTOP POPUP CARD MODAL
               - Centered viewport modal
               - Smooth scale/fade in and out
               ===================================================================== */
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
                aria-label="Close modal overlay"
              />

              {/* Dialog Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-50 w-full max-w-md md:max-w-lg max-h-[85vh] bg-[var(--bg-surface)] text-[var(--ink-primary)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--border-strong)] p-6"
              >
                {content}
              </motion.div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}
