import React from 'react'
import { motion } from 'framer-motion'
import { TAPS } from './tokens'

export type SpotlightCardVariant =
  | 'default'
  | 'author'
  | 'reading-progress'
  | 'dispatch'
  | 'compact'
  | 'minimal'
  | 'banner'
  | 'stacked'
  | 'audio'

export interface SpotlightCardProps {
  /** Visual layout & typography variant */
  variant?: SpotlightCardVariant
  /** Uppercase eyebrow or category, e.g. "Featured this week", "Author in Residence" */
  eyebrow?: string
  /** Primary title of the featured work or story */
  title: string
  /** Subtitle, author attribution, or secondary descriptor */
  subtitle?: string
  /** Label inside the right-hand pill badge, e.g. "Installment 28", "Chapter 4 • 65%" */
  badgeLabel?: string
  /** Visual badge color tone */
  badgeVariant?: 'default' | 'accent' | 'success' | 'outline' | 'warning'
  /** Icon displayed in the square tile (ReactNode or Material Symbol string) */
  icon?: React.ReactNode
  /** Avatar image URL for the 'author' variant */
  avatarUrl?: string
  /** Banner or cover image URL for 'banner' variant */
  imageUrl?: string
  /** Numeric progress (0 - 100) for 'reading-progress' or 'audio' variant */
  progressPercent?: number
  /** Additional metadata or reading time footnote */
  meta?: string
  /** Optional click handler or navigation link trigger */
  onClick?: () => void
  /** Additional custom class names */
  className?: string
}

/**
 * SpotlightCard
 * Executive tactile editorial card engineered for featuring works, serialized installments, or dispatches.
 * Supports multiple tactile design variants:
 * - 'default': Classic featured work pill with square icon tile and installment pill badge
 * - 'compact': Slim single-line micro-bar with dot indicator and quick jump pill
 * - 'minimal': Clean, borderless ghost-style row with accent left notch
 * - 'banner': Visual editorial card with cover thumbnail backdrop or media block
 * - 'stacked': Vertical 2-tier card with large typography and elevated footer bar
 * - 'audio': Acoustic / narration listening pill with wave/play controls and duration
 * - 'author': Author showcase variant with circular avatar thumbnail, verified indicator
 * - 'reading-progress': Reader resume variant with micro-progress bar
 * - 'dispatch': Literary quote or reader dispatch variant with quotation marks
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  variant = 'default',
  eyebrow = 'Featured this week',
  title,
  subtitle,
  badgeLabel,
  badgeVariant = 'default',
  icon,
  avatarUrl,
  imageUrl,
  progressPercent,
  meta,
  onClick,
  className = '',
}) => {
  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'accent':
        return 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
      case 'warning':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
      case 'outline':
        return 'bg-transparent text-[var(--color-secondary)] border border-[var(--color-surface-container-high)]'
      default:
        return 'bg-[var(--color-surface-container-low)] text-[var(--color-secondary)]'
    }
  }

  // 1. Compact Variant (Ultra-slim micro-pill)
  if (variant === 'compact') {
    return (
      <motion.div
        whileTap={onClick ? { scale: TAPS.card } : undefined}
        onClick={onClick}
        className={`w-full max-w-xl px-3.5 py-2 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] flex items-center justify-between gap-2.5 transition-all group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2 h-2 rounded-full bg-[var(--ink-primary)] shrink-0 animate-pulse" />
          {eyebrow && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-secondary)] shrink-0 hidden sm:inline">
              {eyebrow} ·
            </span>
          )}
          <span className="text-[13px] font-medium text-[var(--color-on-surface)] truncate group-hover:underline">
            {title}
          </span>
          {subtitle && (
            <span className="text-[12px] text-[var(--color-on-surface-variant)] truncate hidden md:inline">
              {subtitle}
            </span>
          )}
        </div>
        {badgeLabel && (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium font-mono shrink-0 ${getBadgeStyle()}`}>
            {badgeLabel}
          </span>
        )}
      </motion.div>
    )
  }

  // 2. Minimal Variant (Clean editorial line with accent left marker)
  if (variant === 'minimal') {
    return (
      <motion.div
        whileTap={onClick ? { scale: TAPS.card } : undefined}
        onClick={onClick}
        className={`w-full max-w-xl px-4 py-2.5 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[9.5px] font-mono uppercase tracking-widest text-[var(--color-secondary)] mb-0.5">
                {eyebrow}
              </p>
            )}
            <p className="text-[13.5px] font-medium text-[var(--color-on-surface)] truncate group-hover:underline">
              {title}
              {subtitle && <span className="font-normal text-[var(--color-on-surface-variant)]"> {subtitle}</span>}
            </p>
          </div>
          {badgeLabel && (
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono shrink-0 ${getBadgeStyle()}`}>
              {badgeLabel}
            </span>
          )}
        </div>
      </motion.div>
    )
  }

  // 3. Banner Variant (With visual book cover / artwork thumbnail)
  if (variant === 'banner') {
    return (
      <motion.div
        whileTap={onClick ? { scale: TAPS.card } : undefined}
        onClick={onClick}
        className={`w-full max-w-xl p-2.5 sm:p-3 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] flex items-center gap-3.5 transition-all group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        {/* Cover Thumbnail */}
        <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-[var(--color-surface-container-low)] border border-[var(--border-subtle)] shadow-sm">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-secondary)]">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Text and Actions */}
        <div className="min-w-0 flex-1 flex flex-col justify-between h-14">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-secondary)] truncate">
                  {eyebrow}
                </p>
              )}
              <p className="text-[14px] sm:text-[15px] font-medium leading-snug text-[var(--color-on-surface)] truncate group-hover:underline">
                {title}
              </p>
            </div>
            {badgeLabel && (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-mono shrink-0 ${getBadgeStyle()}`}>
                {badgeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
            <span className="truncate">{subtitle || meta}</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform shrink-0">
              arrow_forward
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  // 4. Stacked Variant (Two-tier editorial layout with full-width bottom metadata bar)
  if (variant === 'stacked') {
    return (
      <motion.div
        whileTap={onClick ? { scale: TAPS.card } : undefined}
        onClick={onClick}
        className={`w-full max-w-xl p-3.5 sm:p-4 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] flex flex-col gap-3 transition-all group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0 flex-1">
            {eyebrow && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--color-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{eyebrow}</span>
              </div>
            )}
            <h4 className="text-[16px] font-semibold text-[var(--color-on-surface)] leading-tight group-hover:underline truncate">
              {title}
            </h4>
            {subtitle && (
              <p className="text-[13px] text-[var(--color-on-surface-variant)] line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-container-low)] flex items-center justify-center shrink-0 text-[var(--color-on-surface)]">
            {icon ? (
              typeof icon === 'string' ? <span className="material-symbols-outlined text-[18px]">{icon}</span> : icon
            ) : (
              <span className="material-symbols-outlined text-[18px]">bookmark</span>
            )}
          </div>
        </div>

        {/* Footer split bar */}
        <div className="pt-2 border-t border-[var(--border-subtle)]/40 flex items-center justify-between text-[11px] font-mono text-[var(--color-secondary)]">
          <span>{meta || 'Curated Folio'}</span>
          {badgeLabel && (
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] ${getBadgeStyle()}`}>
              {badgeLabel}
            </span>
          )}
        </div>
      </motion.div>
    )
  }

  // 5. Audio / Acoustic Listening Pill Variant
  if (variant === 'audio') {
    return (
      <motion.div
        whileTap={onClick ? { scale: TAPS.card } : undefined}
        onClick={onClick}
        className={`w-full max-w-xl px-4 py-2.5 sm:py-3 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] flex flex-col gap-2.5 transition-all group ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Play Button Icon */}
            <div className="w-8 h-8 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            </div>

            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="text-[10px] font-semibold uppercase text-[var(--color-secondary)] tracking-wider truncate font-mono">
                  {eyebrow}
                </p>
              )}
              <p className="text-[14px] sm:text-[15px] leading-snug text-[var(--color-on-surface)] truncate">
                <span className="font-medium group-hover:underline">{title}</span>
                {subtitle && <span className="text-[var(--color-on-surface-variant)] font-normal"> {subtitle}</span>}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            {badgeLabel && (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium font-mono ${getBadgeStyle()}`}>
                {badgeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Audio waveform / progress bar */}
        <div className="w-full flex items-center gap-2 pt-0.5 border-t border-[var(--border-subtle)]/40">
          <div className="flex-1 h-1 rounded-full bg-[var(--color-surface-container-low)] overflow-hidden">
            <div
              className="h-full bg-[var(--ink-primary)] rounded-full"
              style={{ width: `${progressPercent ?? 42}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--color-secondary)] shrink-0">
            {meta || '12:45 / 31:20'}
          </span>
        </div>
      </motion.div>
    )
  }

  // 6. Default, Author, Reading-Progress, Dispatch variants
  return (
    <motion.div
      whileTap={onClick ? { scale: TAPS.card } : undefined}
      onClick={onClick}
      className={`w-full max-w-xl px-4 py-2.5 sm:py-3 rounded-xl bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-sm border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] flex flex-col justify-between gap-2.5 transition-all group ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start sm:items-center justify-between gap-3 w-full">
        {/* Left Side: Tile or Avatar + Typography */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar or Icon container */}
          {variant === 'author' && avatarUrl ? (
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={title}
                className="w-8 h-8 rounded-full object-cover border border-[var(--color-surface-container-high)]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--color-surface-container-lowest)]" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-container-low)] flex items-center justify-center shrink-0 text-[var(--color-on-surface)]">
              {icon ? (
                typeof icon === 'string' ? (
                  <span className="material-symbols-outlined text-[18px]">{icon}</span>
                ) : (
                  icon
                )
              ) : variant === 'reading-progress' ? (
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
              ) : variant === 'dispatch' ? (
                <span className="material-symbols-outlined text-[18px]">format_quote</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">local_library</span>
              )}
            </div>
          )}

          {/* Text Details */}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase text-[var(--color-secondary)] tracking-wider truncate font-mono">
                {eyebrow}
              </p>
            )}
            <p className="text-[14px] sm:text-[15px] leading-snug text-[var(--color-on-surface)] truncate">
              <span className="font-medium group-hover:underline">{title}</span>
              {subtitle && (
                <span className="text-[var(--color-on-surface-variant)] font-normal"> {subtitle}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Badge Pill or Action trigger */}
        <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-center">
          {badgeLabel && (
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap font-mono transition-colors ${getBadgeStyle()}`}
            >
              {badgeLabel}
            </span>
          )}
          {variant === 'reading-progress' && (
            <span className="material-symbols-outlined text-[16px] text-[var(--color-secondary)] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar for 'reading-progress' variant */}
      {variant === 'reading-progress' && typeof progressPercent === 'number' && (
        <div className="w-full space-y-1 pt-0.5 border-t border-[var(--color-surface-container-high)]/40">
          <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--color-secondary)]">
            <span>{meta || 'Reading Progress'}</span>
            <span className="font-semibold text-[var(--color-on-surface)]">{Math.min(100, Math.max(0, progressPercent))}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-[var(--color-surface-container-low)] overflow-hidden">
            <div
              className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Footnote for 'dispatch' variant */}
      {variant === 'dispatch' && meta && (
        <div className="pt-1 border-t border-[var(--color-surface-container-high)]/40 flex items-center justify-between text-[10.5px] text-[var(--color-secondary)]">
          <span className="truncate">{meta}</span>
          <span className="font-mono text-[10px] text-[var(--color-outline-variant)] shrink-0">• Dispatch</span>
        </div>
      )}
    </motion.div>
  )
}

