import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import { Modal, Button } from '../design-system'
import { PenLine } from 'lucide-react'
import { isNewVoiceEligible, calculateFiveMonthExpiration } from '../lib/recommendations/newVoices'

export function NewVoicesOpportunityModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [expirationText, setExpirationText] = useState<string | null>(null)
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      return
    }

    if (!isNewVoiceEligible(user.createdAt)) {
      return
    }

    try {
      const storageKey = `hatchpen_new_voices_popup_dismissed_${user.id}`
      if (localStorage.getItem(storageKey)) {
        return
      }

      if (user.createdAt) {
        const expiration = calculateFiveMonthExpiration(user.createdAt)
        setExpirationText(
          expiration.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        )
      }

      setIsOpen(true)
    } catch {
      // Graceful fallback if localStorage is blocked
    }
  }, [isLoaded, isSignedIn, user?.id, user?.createdAt])

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
