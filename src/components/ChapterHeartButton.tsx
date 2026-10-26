import React, { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { useUser, useClerk } from '@clerk/react'
import { useApp } from '../context/AppContext'
import {
  getChapterHeartStatusServerFn,
  toggleChapterHeartServerFn,
} from '../server/hearts'

interface ChapterHeartButtonProps {
  workId: string
  chapterId: string
  chapterTitle?: string
}

export function ChapterHeartButton({
  workId,
  chapterId,
  chapterTitle,
}: ChapterHeartButtonProps) {
  const { user } = useUser()
  const { openSignIn } = useClerk()
  const { showToast } = useApp()

  const [heartCount, setHeartCount] = useState<number>(0)
  const [userHearted, setUserHearted] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Load live heart status
  const loadHeartStatus = useCallback(async () => {
    if (!workId || !chapterId) return
    try {
      const res = await getChapterHeartStatusServerFn({
        data: {
          workId,
          chapterId,
          clerkUserId: user?.id || null,
        },
      })
      if (res.success) {
        setHeartCount(res.heartCount)
        setUserHearted(res.userHearted)
      }
    } catch (err: any) {
      console.warn('[ChapterHeartButton] Failed to load heart status:', err?.message)
    } finally {
      setIsLoading(false)
    }
  }, [workId, chapterId, user?.id])

  useEffect(() => {
    loadHeartStatus()
  }, [loadHeartStatus])

  // Toggle Heart
  const handleToggleHeart = async () => {
    if (!user) {
      showToast('Sign in to heart this chapter')
      openSignIn?.()
      return
    }

    if (isSubmitting) return

    // Optimistic UI update
    const previousHearted = userHearted
    const previousCount = heartCount
    const nextHearted = !previousHearted
    const nextCount = nextHearted ? previousCount + 1 : Math.max(0, previousCount - 1)

    setUserHearted(nextHearted)
    setHeartCount(nextCount)
    setIsSubmitting(true)

    if (nextHearted) {
      showToast('You hearted this chapter')
    }

    try {
      const res = await toggleChapterHeartServerFn({
        data: {
          clerkUserId: user.id,
          workId,
          chapterId,
        },
      })

      if (res.success) {
        setUserHearted(res.hearted)
        setHeartCount(res.heartCount)
      }
    } catch (err: any) {
      // Revert on failure
      setUserHearted(previousHearted)
      setHeartCount(previousCount)
      showToast(err?.message || 'Failed to update heart')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-xs">
      <div className="space-y-1 text-center sm:text-left">
        <h4 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
          Enjoyed this chapter?
        </h4>
        <p className="text-xs text-[var(--ink-muted)]">
          Leave a heart to support the author and help this chapter gain discovery.
        </p>
      </div>

      <button
        type="button"
        onClick={handleToggleHeart}
        className={`group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
          userHearted
            ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] border border-[var(--ink-primary)] hover:opacity-95'
            : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] text-[var(--ink-primary)] border border-[var(--border-strong)] hover:border-[var(--ink-primary)]'
        }`}
        title={userHearted ? 'Remove heart' : 'Heart this chapter'}
      >
        <Heart
          className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
            userHearted ? 'fill-current text-[var(--accent-contrast)] scale-105' : 'text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]'
          }`}
        />
        <span>{userHearted ? 'Hearted' : 'Heart Chapter'}</span>
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-mono ${
            userHearted
              ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
              : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)]'
          }`}
        >
          {heartCount.toLocaleString()}
        </span>
      </button>
    </div>
  )
}
