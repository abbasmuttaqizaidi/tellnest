import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown,
  Globe,
  MapPin,
  Users,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  Flame,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface TactileProfileData {
  name: string
  handle: string
  avatar: string
  bio: string
  location?: string
  website?: string
  readsScore: number
  followersCount: string
  worksCount: number
  categories: string[]
  collaborators?: { name: string; avatar: string }[]
}

export interface TactileProfileCardProps {
  profile: TactileProfileData
  className?: string
  onFollow?: () => void
  isFollowing?: boolean
}

export const TactileProfileCard: React.FC<TactileProfileCardProps> = ({
  profile,
  className,
  onFollow,
  isFollowing = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn('w-full max-w-sm select-none font-sans', className)}>
      <motion.div
        layout
        transition={SPRINGS.smooth}
        className={cn(
          'overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs transition-colors',
          isExpanded ? 'border-[var(--border-strong)]' : 'hover:border-[var(--border-strong)]'
        )}
      >
        {/* Header Section */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex cursor-pointer items-center justify-between p-4 sm:p-5 transition-colors hover:bg-[var(--bg-subtle)]/30"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="relative">
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-12 w-12 rounded-full object-cover grayscale border border-[var(--border-strong)]"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-[9px] font-bold">
                ✓
              </span>
            </div>

            <div className="min-w-0">
              <h4 className="truncate font-serif text-base font-semibold text-[var(--ink-primary)] leading-snug">
                {profile.name}
              </h4>
              <p className="truncate font-mono text-xs text-[var(--ink-muted)]">
                @{profile.handle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Sparkline activity graph */}
            <div className="w-14 sm:w-16">
              <svg viewBox="0 0 80 20" fill="none" className="h-auto w-full">
                <path
                  d="M2 16C15 13 25 4 45 7C65 10 70 2 78 2"
                  stroke="currentColor"
                  className="text-[var(--ink-primary)] stroke-2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={SPRINGS.snappy}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]"
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </div>
        </div>

        {/* Expandable Stats Drawer */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRINGS.smooth}
              className="border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-5 space-y-4"
            >
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                {profile.bio}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 border-y border-[var(--border-subtle)] text-center font-mono">
                <div>
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Reads Score</span>
                  <span className="font-serif text-base font-bold text-[var(--ink-primary)] flex items-center justify-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber-500 fill-current" />
                    {profile.readsScore}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Followers</span>
                  <span className="font-serif text-base font-bold text-[var(--ink-primary)]">
                    {profile.followersCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase block">Works</span>
                  <span className="font-serif text-base font-bold text-[var(--ink-primary)]">
                    {profile.worksCount}
                  </span>
                </div>
              </div>

              {/* Tags & Metadata */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {(profile.categories || []).map((c) => (
                    <span
                      key={c}
                      className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] font-mono pt-1">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <span className="flex items-center gap-1 hover:underline">
                      <Globe className="h-3 w-3" />
                      {profile.website}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onFollow}
                  className={cn(
                    'w-full rounded-lg border py-2 text-xs font-semibold transition-all',
                    isFollowing
                      ? 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]'
                      : 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
                  )}
                >
                  {isFollowing ? 'Following Author' : 'Follow Author'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
