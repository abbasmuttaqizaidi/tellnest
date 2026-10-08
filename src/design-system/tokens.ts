/**
 * HatchPen Design System Tokens
 * Spring Physics, Transitions & Monochrome Surface Standards
 */

export const SPRINGS = {
  // Snappy spring for tabs, pills, and small controls
  snappy: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 32,
    mass: 0.8,
  },
  // Gentle, elegant spring for cards, dialogs, and large surfaces
  smooth: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 1,
  },
  // Bouncy spring for disclosures and accordions
  bouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 36,
  },
}

export const TAPS = {
  button: { scale: 0.97 },
  card: { scale: 0.985 },
  subtle: { scale: 0.99 },
}

/**
 * Standard Unified Card Tokens
 * Enforces uniform borders, shadows, backgrounds, and hover interactions across all cards.
 */
export const CARD_TOKENS = {
  // Border standard
  border: 'border border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
  borderDefault: 'border border-[var(--border-subtle)]',
  borderHover: 'hover:border-[var(--border-strong)]',
  
  // Shadow standard
  shadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]',
  shadowDefault: 'shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
  shadowHover: 'hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]',
  
  // Standard card container utility class
  base: 'border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all',
}

