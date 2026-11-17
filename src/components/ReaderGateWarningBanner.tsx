import React, { useState, useEffect, useCallback } from 'react'
import { useRouterState, useNavigate } from '@tanstack/react-router'
import { useUser } from '@clerk/react'
import { AlertCircle } from 'lucide-react'
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
  const navigate = useNavigate()
  const pathname = routerState.location.pathname
  const { isLoaded, isSignedIn, user } = useUser()

  // 1. Route Exclusion: Strictly hide on all editor routes (/editor, /write/editor/*, /admin-work-editor/*) and onboarding
  const isExcludedRoute =
    pathname.includes('/editor') ||
    pathname.startsWith('/write/editor') ||
    pathname.startsWith('/admin-work-editor') ||
    pathname.startsWith('/onboarding')

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
        const isVerified = Boolean(p.is_username_verified ?? prefs.username_verified)
        const hasGenres = Array.isArray(prefs.genres) && prefs.genres.length > 0
        const isCompleted = Boolean(p.onboarding_completed)

        setDbProfile({
          signupSource: (prefs.signup_source as any) || (!isCompleted ? 'reader_gate' : 'standard'),
          isUsernameVerified: isVerified,
          hasSelectedGenres: hasGenres,
          onboardingCompleted: isCompleted,
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

  if (isExcludedRoute) {
    return null
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  const localSource =
    typeof window !== 'undefined'
      ? sessionStorage.getItem('hatchpen_signup_source') || localStorage.getItem('hatchpen_signup_source')
      : null

  const isUsernameVerified = Boolean(dbProfile?.isUsernameVerified ?? serverAuthUser?.isUsernameVerified)
  const hasSelectedGenres = Boolean(dbProfile?.hasSelectedGenres ?? serverAuthUser?.hasSelectedGenres)
  const onboardingCompleted = Boolean(dbProfile?.onboardingCompleted ?? serverAuthUser?.onboardingCompleted)

  const isReaderGate =
    dbProfile?.signupSource === 'reader_gate' ||
    serverAuthUser?.signupSource === 'reader_gate' ||
    localSource === 'reader_gate' ||
    (!onboardingCompleted && (!isUsernameVerified || !hasSelectedGenres))

  // If user is fully setup (verified username, selected genres, completed onboarding), do not show banner
  if (!isReaderGate || (isUsernameVerified && hasSelectedGenres && onboardingCompleted)) {
    return null
  }

  const handleOpenOnboarding = () => {
    navigate({
      to: '/onboarding',
      search: { step: isUsernameVerified ? 2 : 1 },
    })
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

        {/* Single Action Button: Complete Profile */}
        <div className="flex items-center shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleOpenOnboarding}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>Complete Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReaderGateWarningBanner
