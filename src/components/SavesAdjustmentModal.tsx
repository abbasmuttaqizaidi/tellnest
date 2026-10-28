import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, X, Plus, Minus, Save, Check, RotateCcw, Sparkles } from 'lucide-react'
import { adminUpdateWorkSavesServerFn, getAdminWorkSavesServerFn } from '../server/admin'

interface SavesAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  work: {
    id: string
    title: string
    cover?: string | null
    author?: {
      name?: string
      handle?: string
    }
    totalSaves?: number
    saveCount?: number
    save_count?: number
  } | null
  adminToken?: string | null
  onSavesUpdated?: (newTotalSaves: number) => void
}

export const SavesAdjustmentModal: React.FC<SavesAdjustmentModalProps> = ({
  isOpen,
  onClose,
  work,
  adminToken,
  onSavesUpdated,
}) => {
  const [saveCount, setSaveCount] = useState<number>(0)
  const [initialCount, setInitialCount] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoadingDb, setIsLoadingDb] = useState(false)

  // Initialize count when modal opens or work changes
  useEffect(() => {
    if (!isOpen || !work?.id) return

    const initial = Math.max(
      0,
      Number(work.saveCount ?? work.totalSaves ?? work.save_count ?? 0)
    )
    setSaveCount(initial)
    setInitialCount(initial)
    setSaveSuccess(false)

    // Fetch live DB saves if adminToken is available
    if (adminToken && work.id) {
      setIsLoadingDb(true)
      getAdminWorkSavesServerFn({
        data: { adminToken, workId: work.id },
      })
        .then((res) => {
          if (res?.success) {
            setSaveCount(res.saveCount)
            setInitialCount(res.saveCount)
          }
        })
        .catch((err) => {
          console.warn('[SavesAdjustmentModal] Live DB fetch error:', err)
        })
        .finally(() => {
          setIsLoadingDb(false)
        })
    }
  }, [isOpen, work?.id, adminToken])

  if (!isOpen || !work) return null

  const hasChanges = saveCount !== initialCount
  const delta = saveCount - initialCount

  const handleAdjust = (amount: number) => {
    setSaveCount((prev) => Math.max(0, prev + amount))
  }

  const handleSetDirect = (value: number) => {
    if (isNaN(value)) return
    setSaveCount(Math.max(0, value))
  }

  const handleReset = () => {
    setSaveCount(initialCount)
  }

  const handleSave = async () => {
    if (!adminToken || !work.id || !hasChanges) return

    setIsSaving(true)
    try {
      const res = await adminUpdateWorkSavesServerFn({
        data: {
          adminToken,
          workId: work.id,
          saveCount,
        },
      })

      if (res?.success) {
        setSaveSuccess(true)
        setInitialCount(res.newSaveCount)
        onSavesUpdated?.(res.newSaveCount)
        setTimeout(() => {
          setSaveSuccess(false)
          onClose()
        }, 800)
      }
    } catch (err) {
      console.error('[SavesAdjustmentModal] Save error:', err)
      alert(err instanceof Error ? err.message : 'Failed to update library saves')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-lg rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Bookmark className="h-4 w-4 fill-current text-[var(--ink-primary)]" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                  <span>Adjust Library Saves</span>
                  {isLoadingDb && (
                    <span className="font-mono text-[10px] text-[var(--ink-muted)] font-normal animate-pulse">
                      (Syncing DB...)
                    </span>
                  )}
                </h3>
                <p className="font-serif text-xs text-[var(--ink-muted)] truncate max-w-sm sm:max-w-md">
                  {work.title}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-5 space-y-5">
            {/* Story Summary Card */}
            <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {work.cover ? (
                  <img
                    src={work.cover}
                    alt={work.title}
                    className="h-12 w-9 rounded object-cover border border-[var(--border-subtle)] shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="h-12 w-9 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-muted)] shrink-0">
                    <Bookmark className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-[var(--ink-primary)] truncate font-serif">
                    {work.title}
                  </h4>
                  {work.author?.name && (
                    <p className="text-[11px] text-[var(--ink-muted)] font-mono truncate">
                      By {work.author.name} {work.author.handle ? `(@${work.author.handle})` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Delta Pill */}
              <div className="text-right shrink-0">
                {delta !== 0 ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      delta > 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {delta > 0 ? `+${delta.toLocaleString()}` : delta.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[var(--ink-faint)]">
                    No change
                  </span>
                )}
              </div>
            </div>

            {/* Main Interactive Counter Box */}
            <div className="p-5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-center space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)]">
                Live Library Saves
              </span>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleAdjust(-1)}
                  disabled={saveCount <= 0}
                  className="h-9 w-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] flex items-center justify-center text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Minus 1 save"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={saveCount}
                    onChange={(e) => handleSetDirect(parseInt(e.target.value) || 0)}
                    className="w-36 text-center text-3xl font-mono font-bold text-[var(--ink-primary)] bg-transparent border-b-2 border-[var(--border-strong)] focus:border-[var(--ink-primary)] focus:outline-none transition py-1"
                  />
                  <div className="text-[10px] font-mono text-[var(--ink-muted)] mt-1">
                    Direct Type or Click Buttons
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjust(1)}
                  className="h-9 w-9 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] flex items-center justify-center text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition cursor-pointer"
                  title="Plus 1 save"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Adjustment Increment/Decrement Pills */}
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <div className="text-[11px] font-mono text-[var(--ink-muted)] mb-2 flex items-center justify-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Quick Increments / Decrements:</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {[-50, -10, -5, +5, +10, +50, +100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleAdjust(step)}
                      disabled={step < 0 && saveCount + step < 0}
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] text-[var(--ink-primary)] transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {step > 0 ? `+${step}` : step}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanatory Note */}
            <div className="text-[11px] font-mono text-[var(--ink-muted)] bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
              <p>
                <strong>Database Sync:</strong> Updating this metric directly sets{' '}
                <code className="text-[10px] bg-[var(--bg-canvas)] px-1 py-0.5 rounded">works.save_count</code> in Supabase.
                It represents readers who have bookmarked and saved this manuscript to their personal library.
              </p>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="inline-flex items-center gap-1 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-mono font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white'
                    : hasChanges
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90 shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
