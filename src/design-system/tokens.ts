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
