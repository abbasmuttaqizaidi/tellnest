import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import { Modal, Button } from '../design-system'
import { PenLine } from 'lucide-react'
import { isNewVoiceEligible, calculateFiveMonthExpiration } from '../lib/recommendations/newVoices'

/**
 * Evaluates whether the New Voices Showcase modal should trigger for a user.
 * Guards against showing if:
 * 1. User is not loaded, not signed in, or missing id.
 * 2. User account is older than 5 calendar months.
 * 3. User has already dismissed this popup.
 * 4. User is currently undergoing onboarding (to prevent modal collision).
 */
export function shouldShowNewVoicesModal({
  user,
  isLoaded,
  isSignedIn,
}: {
  user: any
  isLoaded: boolean
  isSignedIn: boolean
}): boolean {
  if (!isLoaded || !isSignedIn || !user?.id) {
    return false
  }

  if (!isNewVoiceEligible(user.createdAt)) {
    return false
  }

  try {
    // 1. Check if already dismissed
    const storageKey = `hatchpen_new_voices_popup_dismissed_${user.id}`
    if (localStorage.getItem(storageKey)) {
      return false
    }

    // 2. Onboarding collision guard: If user just signed up or onboarding is pending, suppress
    if (typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true') {
      return false
    }

    const isGoogleUser = user.externalAccounts?.some(
      (acc: any) => acc.provider === 'google' || acc.provider === 'oauth_google'
    )
    if (isGoogleUser) {
      const onboardingKey = `hatchpen_onboarding_completed_${user.id}`
      const clerkMeta = (user.publicMetadata as any) || {}
      const hasCompletedOnboarding =
        localStorage.getItem(onboardingKey) === 'true' || clerkMeta.onboardingCompleted
      if (!hasCompletedOnboarding) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

export function NewVoicesOpportunityModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [expirationText, setExpirationText] = useState<string | null>(null)
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    const evaluateAndSchedule = () => {
      if (!shouldShowNewVoicesModal({ user, isLoaded, isSignedIn })) {
        setIsOpen(false)
        return
      }

      if (user?.createdAt) {
        const expiration = calculateFiveMonthExpiration(user.createdAt)
        setExpirationText(
          expiration.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        )
      }

      // Subtle 800ms delay so dashboard finishes settling before showing modal
      timer = setTimeout(() => {
        setIsOpen(true)
      }, 800)
    }

    evaluateAndSchedule()

    // Listen for onboarding completion event so modal can safely present after onboarding finishes
    const handleOnboardingComplete = () => {
      evaluateAndSchedule()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('hatchpen:onboarding-completed', handleOnboardingComplete)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('hatchpen:onboarding-completed', handleOnboardingComplete)
      }
    }
  }, [isLoaded, isSignedIn, user, user?.id, user?.createdAt])

  const handleDismiss = () => {
    try {
      if (user?.id) {
        localStorage.setItem(`hatchpen_new_voices_popup_dismissed_${user.id}`, 'true')
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
    setIsOpen(false)
  }

  const handleOpenStudio = () => {
    handleDismiss()
    navigate({ to: '/write' })
  }

  if (!isOpen) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title="The New Voices Showcase"
      description="Your first five months on Hatchpen."
      size="md"
    >
      <div className="space-y-4 pt-1">
        <p className="font-serif text-sm leading-relaxed text-[var(--ink-secondary)]">
          Original stories you publish during your first five calendar months are featured in the dedicated New Voices showcase for signed-in readers.
        </p>

        {expirationText && (
          <p className="text-xs font-mono text-[var(--ink-muted)]">
            Eligible through <span className="font-semibold text-[var(--ink-primary)]">{expirationText}</span>.
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
          >
            Not now
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenStudio}
            leftIcon={<PenLine className="h-4 w-4" />}
          >
            Start Writing
          </Button>
        </div>
      </div>
    </Modal>
  )
}
