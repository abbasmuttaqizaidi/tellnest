import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { UserPlus, UserCheck, BookOpen, ChevronDown, Award } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'
import { Button } from './Button'

export interface ProfileAuthor {
  id: string
  name: string
  handle: string
  avatar: string
  bio: string
  location?: string
  worksCount: number
  followersCount: number
  lifetimeReads: string
  tags?: string[]
}

export interface ExpandableProfileProps {
  author: ProfileAuthor
  isFollowed?: boolean
  onToggleFollow?: () => void
  onViewWorks?: () => void
  className?: string
}

export const ExpandableProfile: React.FC<ExpandableProfileProps> = ({
  author,
  isFollowed = false,
  onToggleFollow,
  onViewWorks,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      layout
      transition={SPRINGS.smooth}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-colors select-none font-sans',
        isExpanded ? 'border-[var(--border-strong)] shadow-md' : 'hover:border-[var(--border-strong)]',
        className
      )}
    >
      {/* Top Capsule */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={author.avatar}
              alt={author.name}
              className="h-12 w-12 rounded-full object-cover grayscale border border-[var(--border-strong)]"
            />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-[9px]">
              ✓
            </span>
          </div>

          <div>
            <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
              {author.name}
            </h4>
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              @{author.handle}
            </p>
          </div>
        </div>

        {/* Follow Button */}
        {onToggleFollow && (
          <Button
            size="sm"
            variant={isFollowed ? 'secondary' : 'primary'}
            onClick={onToggleFollow}
            leftIcon={
              isFollowed ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )
            }
          >
            {isFollowed ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      {/* Bio Snippet */}
      <p className="mt-3 text-xs leading-relaxed text-[var(--ink-secondary)]">
        {author.bio}
      </p>

      {/* Stats Counter Bar */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-[var(--border-subtle)] py-2.5 font-mono text-center text-xs">
        <div>
          <p className="font-semibold text-[var(--ink-primary)]">{author.worksCount}</p>
          <p className="text-[10px] text-[var(--ink-muted)] uppercase">Works</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink-primary)]">{author.followersCount.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--ink-muted)] uppercase">Readers</p>
        </div>
        <div>
          <p className="font-semibold text-[var(--ink-primary)]">{author.lifetimeReads}</p>
          <p className="text-[10px] text-[var(--ink-muted)] uppercase">Reads</p>
        </div>
      </div>

      {/* Expand Trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 flex w-full items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors focus-visible:outline-none"
      >
        <span>{isExpanded ? 'Hide Details' : 'View Author Dossier'}</span>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* Expandable Details Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={SPRINGS.smooth}
            className="overflow-hidden pt-3 space-y-3"
          >
            {author.tags && (
              <div className="flex flex-wrap gap-1">
                {author.tags.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[10px] rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[var(--ink-muted)]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {onViewWorks && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onViewWorks}
                rightIcon={<BookOpen className="h-3.5 w-3.5" />}
              >
                Explore Complete Catalog
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
