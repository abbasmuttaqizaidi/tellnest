import React, { useState, useEffect, useCallback } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { AlertCircle, Check, ArrowRight } from 'lucide-react'
import { getUserOnboardingStatusServerFn } from '../server/authors'

export interface ReaderGateWarningBannerProps {
  serverAuthUser?: {
    userId?: string | null
    isAuthenticated?: boolean
    signupSource?: 'reader_gate' | 'standard' | null
    isUsernameVerified?: boolean
    hasSelectedGenres?: boolean
    onboardingCompleted?: boolean
  } | null
}

export function ReaderGateWarningBanner({ serverAuthUser }: ReaderGateWarningBannerProps) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const { isLoaded, isSignedIn, user } = useUser()

  // 1. Route Exclusion: Strictly hide on all editor routes (/editor, /write/editor/*, /admin-work-editor/*)
  const isEditorRoute =
    pathname.includes('/editor') ||
    pathname.startsWith('/write/editor') ||
    pathname.startsWith('/admin-work-editor')

  const [dbProfile, setDbProfile] = useState<{
    signupSource: 'reader_gate' | 'standard' | null
    isUsernameVerified: boolean
    hasSelectedGenres: boolean
    onboardingCompleted: boolean
  } | null>(() => {
    if (serverAuthUser?.userId) {
      return {
        signupSource: serverAuthUser.signupSource || null,
        isUsernameVerified: Boolean(serverAuthUser.isUsernameVerified),
        hasSelectedGenres: Boolean(serverAuthUser.hasSelectedGenres),
        onboardingCompleted: Boolean(serverAuthUser.onboardingCompleted),
      }
    }
    return null
  })

  const refreshStatus = useCallback(async () => {
    if (!user?.id) return
    try {
      const p = await getUserOnboardingStatusServerFn({ data: user.id })
      if (p) {
        const prefs = (p.preferences as Record<string, any>) || {}
        setDbProfile({
          signupSource: (prefs.signup_source as any) || (p.is_username_verified ? 'standard' : null),
          isUsernameVerified: Boolean(p.is_username_verified ?? prefs.username_verified),
          hasSelectedGenres: Array.isArray(prefs.genres) && prefs.genres.length > 0,
          onboardingCompleted: Boolean(p.onboarding_completed),
        })
      }
    } catch {}
  }, [user?.id])

  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      refreshStatus()
    }
  }, [isLoaded, isSignedIn, user?.id, refreshStatus])

  // Listen for real-time events when onboarding completes or profile changes
  useEffect(() => {
    const handleUpdate = () => {
      refreshStatus()
    }
    window.addEventListener('hatchpen:onboarding-completed', handleUpdate)
    window.addEventListener('hatchpen:reader-gate-cleared', handleUpdate)
    window.addEventListener('hatchpen:profile-updated', handleUpdate)
    return () => {
      window.removeEventListener('hatchpen:onboarding-completed', handleUpdate)
      window.removeEventListener('hatchpen:reader-gate-cleared', handleUpdate)
      window.removeEventListener('hatchpen:profile-updated', handleUpdate)
    }
  }, [refreshStatus])

  if (isEditorRoute) {
    return null
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const signupSource =
    dbProfile?.signupSource ??
    serverAuthUser?.signupSource ??
    (typeof window !== 'undefined' ? (sessionStorage.getItem('hatchpen_signup_source') as any) : null)

  const isReaderGate = signupSource === 'reader_gate'
  const isUsernameVerified = Boolean(dbProfile?.isUsernameVerified ?? serverAuthUser?.isUsernameVerified)
  const hasSelectedGenres = Boolean(dbProfile?.hasSelectedGenres ?? serverAuthUser?.hasSelectedGenres)
  const onboardingCompleted = Boolean(dbProfile?.onboardingCompleted ?? serverAuthUser?.onboardingCompleted)

  // If user is standard or has finished both requirements, do not show banner
  if (!isReaderGate || (isUsernameVerified && hasSelectedGenres && onboardingCompleted)) {
    return null
  }

  const handleOpenStep = (stepNumber: 1 | 2) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hatchpen:open-onboarding', {
          detail: { step: stepNumber },
        })
      )
    }
  }

  return (
    <div
      role="region"
      aria-label="Account setup notice"
      className="w-full bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/25 px-4 py-2.5 sm:py-2 transition-colors z-40 relative"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Warning Icon & Message (Strictly NO sparkles) */}
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs sm:text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-tight">
            <span className="font-semibold text-amber-700 dark:text-amber-300">Account setup incomplete:</span>{' '}
            Set your official pen name and select your reading genres to personalize your experience.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
          {/* Button 1: Verify Username */}
          <button
            type="button"
            onClick={() => handleOpenStep(1)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isUsernameVerified
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
            }`}
          >
            {isUsernameVerified ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Handle Verified</span>
              </>
            ) : (
              <>
                <span>Verify Username</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>

          {/* Button 2: Select Genres */}
          <button
            type="button"
            onClick={() => handleOpenStep(2)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              hasSelectedGenres
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-default'
                : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm'
            }`}
          >
            {hasSelectedGenres ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Genres Selected</span>
              </>
            ) : (
              <>
                <span>Select Genres</span>
                <ArrowRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReaderGateWarningBanner
