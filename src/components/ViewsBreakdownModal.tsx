import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, X, ChevronDown, ChevronRight, Plus, Minus, Save, Check } from 'lucide-react'
import { type Work, type Act, type Chapter } from '../data/mockData'
import { adminBatchSaveViewsServerFn } from '../server/admin'

interface ViewsBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  work: Work
  adminToken?: string | null
  allowAdminAdjust?: boolean
  onViewsUpdated?: (updatedWork: Work) => void
}

export const ViewsBreakdownModal: React.FC<ViewsBreakdownModalProps> = ({
  isOpen,
  onClose,
  work,
  adminToken,
  allowAdminAdjust = false,
  onViewsUpdated,
}) => {
  // Acts expanded by default
  const [expandedActs, setExpandedActs] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    ;(work.acts || []).forEach((a) => {
      init[a.id] = true
    })
    return init
  })

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [localWork, setLocalWork] = useState<Work>(work)

  React.useEffect(() => {
    setLocalWork(work)
    setHasChanges(false)
    setSaveSuccess(false)
  }, [work, isOpen])

  if (!isOpen) return null

  const toggleAct = (actId: string) => {
    setExpandedActs((prev) => ({ ...prev, [actId]: !prev[actId] }))
  }

  // Adjust in memory instantly (+1 / -1)
  const handleAdjust = (targetType: 'work' | 'chapter', targetId: string, delta: number) => {
    setHasChanges(true)
    setSaveSuccess(false)

    setLocalWork((prev) => {
      if (targetType === 'work') {
        const current = Number(prev.totalReads || 0)
        const updated = Math.max(0, current + delta)
        return { ...prev, totalReads: String(updated) }
      } else {
        const updatedChapters = (prev.chapters || []).map((ch) => {
          if (ch.id !== targetId) return ch
          const cur = Number(ch.viewCount || 0)
          return { ...ch, viewCount: Math.max(0, cur + delta) }
        })
        const updatedActs = (prev.acts || []).map((act) => {
          const actChs = updatedChapters.filter((c) => c.actId === act.id)
          const sum = actChs.reduce((s, c) => s + (c.viewCount || 0), 0)
          return { ...act, viewCount: sum }
        })
        return { ...prev, chapters: updatedChapters, acts: updatedActs }
      }
    })
  }

  // Set count directly from manual typing in numeric input
  const handleSetDirect = (targetType: 'work' | 'chapter', targetId: string, value: number) => {
    setHasChanges(true)
    setSaveSuccess(false)
    const valid = Math.max(0, isNaN(value) ? 0 : value)

    setLocalWork((prev) => {
      if (targetType === 'work') {
        return { ...prev, totalReads: String(valid) }
      } else {
        const updatedChapters = (prev.chapters || []).map((ch) => {
          if (ch.id !== targetId) return ch
          return { ...ch, viewCount: valid }
        })
        const updatedActs = (prev.acts || []).map((act) => {
          const actChs = updatedChapters.filter((c) => c.actId === act.id)
          const sum = actChs.reduce((s, c) => s + (c.viewCount || 0), 0)
          return { ...act, viewCount: sum }
        })
        return { ...prev, chapters: updatedChapters, acts: updatedActs }
      }
    })
  }

  // Save all modified view counts to database
  const handleSaveAll = async () => {
    if (!adminToken) return
    setIsSaving(true)

    try {
      const chapterViewsList = (localWork.chapters || []).map((ch) => ({
        chapterId: ch.id,
        viewCount: Number(ch.viewCount || 0),
      }))

      const res = await adminBatchSaveViewsServerFn({
        data: {
          adminToken,
          workId: localWork.id,
          workViews: Number(localWork.totalReads || 0),
          chapterViews: chapterViewsList,
        },
      })

      if (res.success) {
        setHasChanges(false)
        setSaveSuccess(true)
        onViewsUpdated?.(localWork)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch (err: any) {
      console.error('[ViewsBreakdownModal] Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const bookViews = Number(localWork.totalReads || 0)

  // Map acts with chapters
  const actsList: Act[] = (localWork.acts && localWork.acts.length > 0)
    ? localWork.acts.map((act) => {
        const actChapters = (localWork.chapters || []).filter(
          (c) => c.actId === act.id || c.actNumber === act.number
        )
        const actViewCount = actChapters.reduce((sum, c) => sum + (c.viewCount || 0), 0)
        return {
          ...act,
          chapters: actChapters,
          viewCount: actViewCount,
        }
      })
    : [
        {
          id: `act-default-${localWork.id}`,
          workId: localWork.id,
          number: 1,
          title: 'Act I',
          slug: 'act-1',
          chapters: localWork.chapters || [],
          viewCount: (localWork.chapters || []).reduce((sum, c) => sum + (c.viewCount || 0), 0),
        },
      ]

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-100"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[var(--ink-muted)]" />
              <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Views Breakdown
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Book Total View Row */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-subtle)]/40">
            <div>
              <div className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate max-w-[220px]">
                {localWork.title}
              </div>
              <div className="text-[11px] font-mono text-[var(--ink-muted)]">
                Total Book Readers
              </div>
            </div>

            <div className="flex items-center gap-2">
              {allowAdminAdjust && adminToken ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={bookViews}
                    onChange={(e) => handleSetDirect('work', localWork.id, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-right font-mono text-sm font-bold text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                    title="Type count directly"
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleAdjust('work', localWork.id, 1)}
                      className="p-1 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)] text-[var(--ink-muted)] border border-[var(--border-subtle)] transition cursor-pointer"
                      title="+1 View"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjust('work', localWork.id, -1)}
                      disabled={bookViews <= 0}
                      className="p-1 rounded hover:bg-rose-500 hover:text-white text-[var(--ink-muted)] border border-[var(--border-subtle)] transition cursor-pointer"
                      title="-1 View"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <span className="font-mono text-base font-bold text-[var(--ink-primary)]">
                  {bookViews.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Acts and Chapters List */}
          <div className="p-3 max-h-[55vh] overflow-y-auto space-y-2 text-xs">
            {actsList.map((act) => {
              const isExpanded = expandedActs[act.id] !== false
              return (
                <div
                  key={act.id}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
                >
                  {/* Act Header */}
                  <div
                    onClick={() => toggleAct(act.id)}
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--bg-subtle)] transition select-none"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-[var(--ink-primary)] truncate">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-[var(--ink-muted)] shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-[var(--ink-muted)] shrink-0" />
                      )}
                      <span className="truncate">Act {act.number}: {act.title}</span>
                    </div>

                    <span className="font-mono text-[11px] font-semibold text-[var(--ink-muted)] shrink-0">
                      {(act.viewCount || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Chapters under Act */}
                  {isExpanded && act.chapters && act.chapters.length > 0 && (
                    <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                      {act.chapters.map((ch) => (
                        <div
                          key={ch.id}
                          className="flex items-center justify-between px-3 py-1.5 pl-6 text-[11px]"
                        >
                          <span className="font-serif text-[var(--ink-secondary)] truncate pr-2">
                            {ch.number}. {ch.title}
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            {allowAdminAdjust && adminToken ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  value={ch.viewCount || 0}
                                  onChange={(e) => handleSetDirect('chapter', ch.id, parseInt(e.target.value) || 0)}
                                  className="w-16 px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-right font-mono text-[11px] font-medium text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
                                  title="Type chapter views directly"
                                />
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAdjust('chapter', ch.id, 1)}
                                    className="p-0.5 rounded hover:bg-[var(--ink-primary)] hover:text-[var(--bg-canvas)] text-[var(--ink-muted)] transition cursor-pointer"
                                    title="+1 View"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjust('chapter', ch.id, -1)}
                                    disabled={(ch.viewCount || 0) <= 0}
                                    className="p-0.5 rounded hover:bg-rose-500 hover:text-white text-[var(--ink-muted)] transition cursor-pointer"
                                    title="-1 View"
                                  >
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="font-mono text-[11px] text-[var(--ink-primary)] font-medium">
                                {(ch.viewCount || 0).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Simple Footer with Save Changes Button for Admin */}
          <div className="px-4 py-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] flex items-center justify-between">
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
                onClick={onClose}
                className="px-3 py-1 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-xs font-mono text-[var(--ink-primary)] transition cursor-pointer"
              >
                {hasChanges ? 'Cancel' : 'Close'}
              </button>

              {allowAdminAdjust && adminToken && (
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving || !hasChanges}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition cursor-pointer shadow-xs ${
                    hasChanges
                      ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] hover:opacity-90'
                      : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)] cursor-not-allowed'
                  }`}
                >
                  <Save className="h-3 w-3" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
