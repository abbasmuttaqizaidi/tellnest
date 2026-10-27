import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart, X, ChevronDown, ChevronRight, Plus, Minus, Save, Check, RotateCcw, Sparkles } from 'lucide-react'
import { type Work, type Act, type Chapter } from '../data/mockData'
import { adminBatchSaveHeartsServerFn, getAdminWorkActsAnalyticsServerFn } from '../server/admin'

interface HeartsBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  work: Work
  adminToken?: string | null
  allowAdminAdjust?: boolean
  onHeartsUpdated?: (newTotalHearts: number, updatedChapters: Array<{ id: string; heartCount: number }>) => void
}

export const HeartsBreakdownModal: React.FC<HeartsBreakdownModalProps> = ({
  isOpen,
  onClose,
  work,
  adminToken,
  allowAdminAdjust = true,
  onHeartsUpdated,
}) => {
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoadingDb, setIsLoadingDb] = useState(false)

  // Local state for chapters and work hearts
  const [chapterHeartsMap, setChapterHeartsMap] = useState<Record<string, number>>({})
  const [totalWorkHearts, setTotalWorkHearts] = useState<number>(0)
  const [initialState, setInitialState] = useState<{
    workHearts: number
    chapterHearts: Record<string, number>
  }>({ workHearts: 0, chapterHearts: {} })

  // Initialize or fetch accurate DB counts when modal opens
  useEffect(() => {
    if (!isOpen || !work?.id) return

    const initialWorkHearts = Number(work.likeCount ?? (work as any)?.like_count ?? 0)
    const initialChMap: Record<string, number> = {}

    ;(work.chapters || []).forEach((ch) => {
      initialChMap[ch.id] = Number(ch.likeCount ?? (ch as any)?.like_count ?? 0)
    })

    setTotalWorkHearts(initialWorkHearts)
    setChapterHeartsMap(initialChMap)
    setInitialState({ workHearts: initialWorkHearts, chapterHearts: { ...initialChMap } })
    setHasChanges(false)
    setSaveSuccess(false)

    // Expand all acts by default
    const actExpandMap: Record<string, boolean> = {}
    ;(work.acts || []).forEach((a) => {
      actExpandMap[a.id] = true
    })
    setExpandedActs(actExpandMap)

    // Fetch live DB counts if adminToken is available
    if (adminToken && work.id) {
      setIsLoadingDb(true)
      getAdminWorkActsAnalyticsServerFn({
        data: { adminToken, workId: work.id },
      })
        .then((res) => {
          if (res) {
            const dbWorkHearts = Number(res.totalHearts ?? initialWorkHearts)
            const dbChMap: Record<string, number> = {}

            res.acts.forEach((a) => {
              actExpandMap[a.id] = true
              a.chapters.forEach((c) => {
                dbChMap[c.id] = Number(c.heartCount ?? 0)
              })
            })

            setTotalWorkHearts(dbWorkHearts)
            setChapterHeartsMap(dbChMap)
            setInitialState({ workHearts: dbWorkHearts, chapterHearts: { ...dbChMap } })
            setExpandedActs(actExpandMap)
          }
        })
        .catch((e) => console.warn('[HeartsBreakdownModal] DB load error:', e))
        .finally(() => setIsLoadingDb(false))
    }
  }, [isOpen, work?.id, adminToken])

  if (!isOpen) return null

  const toggleAct = (actId: string) => {
    setExpandedActs((prev) => ({ ...prev, [actId]: !prev[actId] }))
  }

  // Calculate sum of chapter hearts
  const sumOfChapterHearts = Object.values(chapterHeartsMap).reduce((a, b) => a + (b || 0), 0)

  // Adjust total work hearts
  const handleAdjustWorkHearts = (delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    setTotalWorkHearts((prev) => Math.max(0, prev + delta))
  }

  const handleSetDirectWorkHearts = (value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    setTotalWorkHearts(Math.max(0, isNaN(value) ? 0 : value))
  }

  // Adjust individual chapter hearts
  const handleAdjustChapterHearts = (chapterId: string, delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    setChapterHeartsMap((prev) => {
      const cur = prev[chapterId] || 0
      const next = Math.max(0, cur + delta)
      const diff = next - cur

      // Automatically adjust total work hearts by the same delta
      setTotalWorkHearts((wCur) => Math.max(0, wCur + diff))

      return { ...prev, [chapterId]: next }
    })
  }

  const handleSetDirectChapterHearts = (chapterId: string, value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    const next = Math.max(0, isNaN(value) ? 0 : value)
    setChapterHeartsMap((prev) => {
      const cur = prev[chapterId] || 0
      const diff = next - cur

      setTotalWorkHearts((wCur) => Math.max(0, wCur + diff))
      return { ...prev, [chapterId]: next }
    })
  }

  // Quick Batch Helpers
  const handleAddDeltaToAllChapters = (delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    setChapterHeartsMap((prev) => {
      const updated: Record<string, number> = {}
      let totalDiff = 0
      const chaptersList = work.chapters || []

      chaptersList.forEach((ch) => {
        const cur = prev[ch.id] || 0
        const next = Math.max(0, cur + delta)
        updated[ch.id] = next
        totalDiff += (next - cur)
      })

      setTotalWorkHearts((wCur) => Math.max(0, wCur + totalDiff))
      return { ...prev, ...updated }
    })
  }

  const handleReset = () => {
    setTotalWorkHearts(initialState.workHearts)
    setChapterHeartsMap({ ...initialState.chapterHearts })
    setHasChanges(false)
    setSaveSuccess(false)
  }

  // Save changes to database
  const handleSaveAll = async () => {
    if (!adminToken || !work?.id) return
    setIsSaving(true)

    try {
      const chapterHeartsList = Object.entries(chapterHeartsMap).map(([chapterId, count]) => ({
        chapterId,
        heartCount: count,
      }))

      const res = await adminBatchSaveHeartsServerFn({
        data: {
          adminToken,
          workId: work.id,
          workHearts: totalWorkHearts,
          chapterHearts: chapterHeartsList,
        },
      })

      if (res.success) {
        setHasChanges(false)
        setSaveSuccess(true)
        setInitialState({
          workHearts: totalWorkHearts,
          chapterHearts: { ...chapterHeartsMap },
        })

        onHeartsUpdated?.(
          totalWorkHearts,
          chapterHeartsList.map((c) => ({ id: c.chapterId, heartCount: c.heartCount }))
        )

        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err: any) {
      console.error('[HeartsBreakdownModal] Save error:', err)
      alert(`Failed to save hearts: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Map acts with chapters
  const rawActs = work.acts || []
  const chaptersList = work.chapters || []

  const actsList: Array<{
    id: string
    number: number
    title: string
    chapters: Chapter[]
  }> =
    rawActs.length > 0
      ? rawActs.map((act) => {
          const actChs = chaptersList.filter(
            (c) => c.actId === act.id || c.actNumber === act.number
          )
          return {
            id: act.id,
            number: act.number,
            title: act.title,
            chapters: actChs,
          }
        })
      : [
          {
            id: `act-1-${work.id}`,
            number: 1,
            title: 'Act I: Main Manuscript',
            chapters: chaptersList,
          },
        ]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-xl rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <Heart className="h-4 w-4 fill-current text-[var(--ink-primary)]" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                  <span>Adjust Hearts & Appreciation</span>
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

          {/* Body */}
          <div className="p-4 sm:p-5 max-h-[62vh] overflow-y-auto space-y-4">
            {/* Story-Level Total Hearts Card */}
            <div className="p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 fill-current text-[var(--ink-primary)]" />
                    <span>Total Story Hearts</span>
                  </h4>
                  <p className="text-[11px] font-mono text-[var(--ink-muted)]">
                    Sum of chapter hearts: {sumOfChapterHearts.toLocaleString()} • Catalog display: {totalWorkHearts.toLocaleString()}
                  </p>
                </div>

                {/* Primary Work Heart Editor */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={totalWorkHearts}
                    onChange={(e) => handleSetDirectWorkHearts(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-right font-mono text-xs font-bold text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                    title="Type total work hearts directly"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustWorkHearts(1)}
                      className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer"
                      title="+1 Heart"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustWorkHearts(-1)}
                      disabled={totalWorkHearts <= 0}
                      className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer disabled:opacity-40"
                      title="-1 Heart"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Adjustment Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)]">
                <span className="font-mono text-[10px] text-[var(--ink-muted)] mr-1">Quick Add:</span>
                {[5, 10, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAdjustWorkHearts(amt)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] transition cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
                <span className="font-mono text-[10px] text-[var(--ink-muted)] mx-1">|</span>
                <button
                  type="button"
                  onClick={() => handleAddDeltaToAllChapters(5)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition cursor-pointer"
                  title="Adds 5 hearts to every chapter"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>+5 to All Chapters</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer ml-auto"
                  title="Reset to original counts"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Acts & Chapters List */}
            <div className="space-y-2">
              <h5 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                Chapter Breakdown ({chaptersList.length} Chapters)
              </h5>

              {actsList.map((act) => {
                const isExpanded = expandedActs[act.id] !== false
                const actChs = act.chapters || []
                const actHearts = actChs.reduce(
                  (sum, c) => sum + (chapterHeartsMap[c.id] || 0),
                  0
                )

                return (
                  <div
                    key={act.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
                  >
                    {/* Act Header */}
                    <div
                      onClick={() => toggleAct(act.id)}
                      className="flex items-center justify-between px-3.5 py-2 cursor-pointer hover:bg-[var(--bg-subtle)] transition select-none"
                    >
                      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[var(--ink-primary)] truncate">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--ink-muted)] shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[var(--ink-muted)] shrink-0" />
                        )}
                        <span className="truncate">Act {act.number}: {act.title}</span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)] shrink-0">
                        <Heart className="h-3 w-3 fill-current text-[var(--ink-primary)]" />
                        <span>{actHearts.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Chapters under Act */}
                    {isExpanded && actChs.length > 0 && (
                      <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                        {actChs.map((ch) => {
                          const chHeartCount = chapterHeartsMap[ch.id] ?? 0

                          return (
                            <div
                              key={ch.id}
                              className="flex items-center justify-between px-3.5 py-2 pl-6 sm:pl-7 text-xs"
                            >
                              <span className="font-serif text-[var(--ink-secondary)] truncate pr-2">
                                {ch.number}. {ch.title}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  value={chHeartCount}
                                  onChange={(e) =>
                                    handleSetDirectChapterHearts(ch.id, parseInt(e.target.value) || 0)
                                  }
                                  className="w-16 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-right font-mono text-[11px] font-medium text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                                  title="Type chapter hearts directly"
                                />
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustChapterHearts(ch.id, 1)}
                                    className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer"
                                    title="+1 Heart"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustChapterHearts(ch.id, -1)}
                                    disabled={chHeartCount <= 0}
                                    className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer disabled:opacity-40"
                                    title="-1 Heart"
                                  >
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Footer with Save / Close */}
          <div className="px-5 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div className="text-[11px] font-mono text-[var(--ink-muted)]">
              {saveSuccess && (
                <span className="text-emerald-500 flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> Saved to Database!
                </span>
              )}
              {hasChanges && !saveSuccess && (
                <span className="text-amber-500 font-semibold">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] text-xs font-mono text-[var(--ink-primary)] transition cursor-pointer"
              >
                {hasChanges ? 'Cancel' : 'Close'}
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={isSaving || !hasChanges}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer shadow-xs ${
                  hasChanges
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] hover:opacity-90'
                    : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                }`}
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Hearts'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
