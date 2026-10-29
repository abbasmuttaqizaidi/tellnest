import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart, X, ChevronDown, ChevronRight, Plus, Minus, Save, Check, RotateCcw, Sparkles, Equal, Calculator } from 'lucide-react'
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

  // Local state: Chapter hearts map and Story-level hearts
  const [chapterHeartsMap, setChapterHeartsMap] = useState<Record<string, number>>({})
  const [storyHearts, setStoryHearts] = useState<number>(0)
  const [initialState, setInitialState] = useState<{
    storyHearts: number
    chapterHearts: Record<string, number>
  }>({ storyHearts: 0, chapterHearts: {} })

  // Derived: Sum of all chapter hearts
  const sumOfChapterHearts = useMemo(() => {
    return Object.values(chapterHeartsMap).reduce((acc, val) => acc + (val || 0), 0)
  }, [chapterHeartsMap])

  // Derived: Total work hearts = Story Hearts + Sum of Chapter Hearts
  const totalWorkHearts = useMemo(() => {
    return storyHearts + sumOfChapterHearts
  }, [storyHearts, sumOfChapterHearts])

  // Initialize or fetch accurate DB counts when modal opens
  useEffect(() => {
    if (!isOpen || !work?.id) return

    const initialWorkHearts = Math.max(0, Number(work.likeCount ?? (work as any)?.like_count ?? 0))
    const initialChMap: Record<string, number> = {}

    ;(work.chapters || []).forEach((ch) => {
      initialChMap[ch.id] = Math.max(0, Number(ch.likeCount ?? (ch as any)?.like_count ?? 0))
    })

    const initialChaptersSum = Object.values(initialChMap).reduce((a, b) => a + (b || 0), 0)
    const initialStory = Math.max(0, initialWorkHearts - initialChaptersSum)

    setChapterHeartsMap(initialChMap)
    setStoryHearts(initialStory)
    setInitialState({
      storyHearts: initialStory,
      chapterHearts: { ...initialChMap },
    })
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
            const dbWorkHearts = Math.max(0, Number(res.totalHearts ?? initialWorkHearts))
            const dbChMap: Record<string, number> = {}

            res.acts.forEach((a) => {
              actExpandMap[a.id] = true
              a.chapters.forEach((c) => {
                dbChMap[c.id] = Math.max(0, Number(c.heartCount ?? 0))
              })
            })

            const dbChaptersSum = Object.values(dbChMap).reduce((a, b) => a + (b || 0), 0)
            const dbStory = Math.max(0, dbWorkHearts - dbChaptersSum)

            setChapterHeartsMap(dbChMap)
            setStoryHearts(dbStory)
            setInitialState({
              storyHearts: dbStory,
              chapterHearts: { ...dbChMap },
            })
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

  // Story-level hearts adjustments
  const handleAdjustStoryHearts = (delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    setStoryHearts((prev) => Math.max(0, prev + delta))
  }

  const handleSetDirectStoryHearts = (value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    setStoryHearts(Math.max(0, isNaN(value) ? 0 : value))
  }

  // Adjust total directly (automatically rebalances story hearts)
  const handleAdjustTotalHearts = (delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    setStoryHearts((prev) => Math.max(0, prev + delta))
  }

  const handleSetDirectTotalHearts = (value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    const targetTotal = Math.max(0, isNaN(value) ? 0 : value)
    // Story hearts takes the remainder (clamped to 0)
    const rebalancedStory = Math.max(0, targetTotal - sumOfChapterHearts)
    setStoryHearts(rebalancedStory)
  }

  // Chapter-level hearts adjustments
  const handleAdjustChapterHearts = (chapterId: string, delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    setChapterHeartsMap((prev) => {
      const cur = prev[chapterId] || 0
      const next = Math.max(0, cur + delta)
      return { ...prev, [chapterId]: next }
    })
  }

  const handleSetDirectChapterHearts = (chapterId: string, value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    const next = Math.max(0, isNaN(value) ? 0 : value)
    setChapterHeartsMap((prev) => ({ ...prev, [chapterId]: next }))
  }

  // Batch helper: Add delta to every chapter
  const handleAddDeltaToAllChapters = (delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    setChapterHeartsMap((prev) => {
      const updated: Record<string, number> = {}
      const chaptersList = work.chapters || []

      chaptersList.forEach((ch) => {
        const cur = prev[ch.id] || 0
        updated[ch.id] = Math.max(0, cur + delta)
      })

      return { ...prev, ...updated }
    })
  }

  const handleReset = () => {
    setStoryHearts(initialState.storyHearts)
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
        heartCount: Math.max(0, Math.round(count)),
      }))

      // Total work hearts is guaranteed to be storyHearts + sumOfChapterHearts
      const finalWorkHearts = storyHearts + sumOfChapterHearts

      const res = await adminBatchSaveHeartsServerFn({
        data: {
          adminToken,
          workId: work.id,
          workHearts: finalWorkHearts,
          chapterHearts: chapterHeartsList,
        },
      })

      if (res.success) {
        setHasChanges(false)
        setSaveSuccess(true)
        setInitialState({
          storyHearts,
          chapterHearts: { ...chapterHeartsMap },
        })

        onHeartsUpdated?.(
          finalWorkHearts,
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
            (c) => c.actId === act.id
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
          <div className="p-4 sm:p-5 max-h-[65vh] overflow-y-auto space-y-4">
            {/* Calculation Formula Banner */}
            <div className="p-3.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[var(--ink-secondary)]">
                  <Calculator className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                  <span>Calculation Formula: Total = Story Hearts + Chapter Hearts</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  Verified Math
                </span>
              </div>

              {/* Three-Box Calculation Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center">
                {/* 1. Story-Level Hearts (Direct Book Appreciation) */}
                <div className="sm:col-span-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-semibold text-[var(--ink-primary)]">
                      Story Hearts
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                      Direct Book
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <input
                      type="number"
                      min={0}
                      value={storyHearts}
                      onChange={(e) => handleSetDirectStoryHearts(parseInt(e.target.value) || 0)}
                      className="w-18 px-1.5 py-0.5 rounded border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-right font-mono text-xs font-bold text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                      title="Direct story appreciation hearts"
                    />
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleAdjustStoryHearts(1)}
                        className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer"
                        title="+1 Story Heart"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustStoryHearts(-1)}
                        disabled={storyHearts <= 0}
                        className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer disabled:opacity-40"
                        title="-1 Story Heart"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Operator Plus */}
                <div className="hidden sm:flex justify-center text-[var(--ink-muted)] font-mono text-sm">
                  +
                </div>

                {/* 2. Sum of Chapter Hearts */}
                <div className="sm:col-span-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-semibold text-[var(--ink-primary)]">
                      Chapters Sum
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-muted)]">
                      {chaptersList.length} chs
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-xs font-bold text-[var(--ink-primary)] pl-1">
                      {sumOfChapterHearts.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-muted)] italic">
                      (auto-summed)
                    </span>
                  </div>
                </div>
              </div>

              {/* Equals Total Work Hearts */}
              <div className="p-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
                    <Equal className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-[var(--ink-primary)] flex items-center gap-1.5">
                      <span>Total Work Hearts (Catalog / /works)</span>
                    </h4>
                    <p className="text-[10px] font-mono text-[var(--ink-muted)]">
                      {storyHearts} (Story) + {sumOfChapterHearts} (Chapters) = {totalWorkHearts} Total
                    </p>
                  </div>
                </div>

                {/* Direct Total Input */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <input
                    type="number"
                    min={sumOfChapterHearts}
                    value={totalWorkHearts}
                    onChange={(e) => handleSetDirectTotalHearts(parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] text-right font-mono text-xs font-bold text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                    title="Type total work hearts directly (rebalances Story Hearts)"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjustTotalHearts(1)}
                      className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer"
                      title="+1 Total Heart"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustTotalHearts(-1)}
                      disabled={storyHearts <= 0}
                      className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition cursor-pointer disabled:opacity-40"
                      title="-1 Total Heart"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
                <span className="font-mono text-[10px] text-[var(--ink-muted)] mr-1">Quick Add:</span>
                {[5, 10, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleAdjustStoryHearts(amt)}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:bg-[var(--bg-canvas)] hover:border-[var(--ink-primary)] transition cursor-pointer"
                    title={`Add +${amt} to Story Hearts`}
                  >
                    +{amt} Story
                  </button>
                ))}
                <span className="font-mono text-[10px] text-[var(--ink-muted)] mx-0.5">|</span>
                <button
                  type="button"
                  onClick={() => handleAddDeltaToAllChapters(5)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition cursor-pointer"
                  title="Adds 5 hearts to every chapter"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>+5 All Chs</span>
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
              <div className="flex items-center justify-between">
                <h5 className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                  Chapter Hearts Breakdown ({chaptersList.length} Chapters)
                </h5>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  Total Chapters: <strong className="text-[var(--ink-primary)]">{sumOfChapterHearts.toLocaleString()}</strong>
                </span>
              </div>

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
