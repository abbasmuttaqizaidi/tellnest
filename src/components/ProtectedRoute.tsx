import React from 'react'
import { useUser, useClerk } from '@clerk/react'
import { Link } from '@tanstack/react-router'
import { Button, Badge } from '../design-system'
import { Lock, ShieldCheck, ArrowRight, BookOpen, Sparkles } from 'lucide-react'
import { TellnestLoader } from './TellnestLoader'
import { startAuthTransition } from './ClerkAuthOverlay'

interface ProtectedRouteProps {
  children: React.ReactNode
  title?: string
  description?: string
  featureBadge?: string
}

const CLERK_MODAL_APPEARANCE = {
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
  },
  elements: {
    modalBackdrop: '!flex !items-center !justify-center !p-4',
    modalContent: '!m-auto !my-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    rootBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    cardBox: '!m-auto !max-w-[380px] !w-full !bg-transparent !shadow-none !border-none',
    card: '!max-w-[380px] !w-full !m-auto',
    footer: 'hidden',
    footerAction: 'hidden',
    badge: 'hidden',
  },
}

/**
 * ProtectedRoute Component
 * Guards private Tellnest / Relay routes (Library, Following, Notifications, Profile, Settings, Writer Studio).
 * If unauthenticated, displays an elegant Monochrome Executive access portal with Clerk authentication.
 */
export function ProtectedRoute({
  children,
  title = 'Private Creator & Reader Folio',
  description = 'Authentication is required to access your personal reading library, writer studio, drafts, and account notifications.',
  featureBadge = 'Private Route',
}: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useUser()
  const { openSignIn } = useClerk()

  // 1. Tellnest Branded Loader while Clerk hydrates session
  if (!isLoaded) {
    return (
      <TellnestLoader
        variant="page"
        message="Verifying literary credentials..."
        submessage="Tellnest Private Folio"
      />
    )
  }

  // 2. Unauthenticated Gate
  if (!isSignedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 shadow-xs text-center space-y-6">
          
          {/* Lock Icon Emblem */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--ink-primary)]">
                <Lock className="h-7 w-7 stroke-[1.75]" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>

          {/* Heading & Badge */}
          <div className="space-y-2">
            <div className="flex justify-center">
              <Badge variant="subtle" size="sm" className="font-mono text-[10px]">
                {featureBadge}
              </Badge>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Value Props Strip */}
          <div className="grid grid-cols-2 gap-3 text-left font-mono text-[11px] border-t border-b border-[var(--border-subtle)] py-4 my-2">
            <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] space-y-1">
              <div className="font-semibold text-[var(--ink-primary)]">Personal Sync</div>
              <div className="text-[var(--ink-muted)]">Saved reading progress & library across all devices.</div>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] space-y-1">
              <div className="font-semibold text-[var(--ink-primary)]">Writer Studio</div>
              <div className="text-[var(--ink-muted)]">Encrypted chapter drafting, analytics & publication.</div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => {
                startAuthTransition()
                openSignIn({ appearance: CLERK_MODAL_APPEARANCE })
              }}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Sign In to Continue
            </Button>

            <Link
              to="/discover"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Or explore public catalog</span>
            </Link>
          </div>

        </div>
      </div>
    )
  }

  // 3. Authenticated: Render Child Route
  return <>{children}</>
}
