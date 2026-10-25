import React, { useMemo } from 'react'
import {
  GitCompare,
  X,
  CheckCircle2,
  Save,
  Plus,
  Minus,
  FileText,
  RotateCcw,
} from 'lucide-react'
import {
  computeLineDiff,
  computeWordTokens,
  revertDiffLine,
  type DiffLine,
  type WordToken,
} from '../../lib/diff'

export interface ChapterDiffViewerProps {
  savedTitle: string
  currentTitle: string
  savedSubtitle: string
  currentSubtitle: string
  savedContent: string
  currentContent: string
  autosaveStatus: 'saved' | 'saving' | 'dirty'
  onManualSave: () => void
  onClose: () => void
  onRevertTitle?: () => void
  onRevertSubtitle?: () => void
  onRevertContent?: (newContent: string) => void
}

export function ChapterDiffViewer({
  savedTitle,
  currentTitle,
  savedSubtitle,
  currentSubtitle,
  savedContent,
  currentContent,
  autosaveStatus,
  onManualSave,
  onClose,
  onRevertTitle,
  onRevertSubtitle,
  onRevertContent,
}: ChapterDiffViewerProps) {
  // Title & Subtitle diff status
  const titleChanged = (savedTitle || '').trim() !== (currentTitle || '').trim()
  const subtitleChanged = (savedSubtitle || '').trim() !== (currentSubtitle || '').trim()

  // Compute Word count delta
  const savedWords = useMemo(() => {
    return (savedContent || '').trim().split(/\s+/).filter(Boolean).length
  }, [savedContent])

  const currentWords = useMemo(() => {
    return (currentContent || '').trim().split(/\s+/).filter(Boolean).length
  }, [currentContent])

  const wordDelta = currentWords - savedWords

  // Compute Content Line Diff
  const diffLines = useMemo(() => {
    return computeLineDiff(savedContent || '', currentContent || '')
  }, [savedContent, currentContent])

  const stats = useMemo(() => {
    let additions = 0
    let deletions = 0
    for (const line of diffLines) {
      if (line.type === 'added') additions++
      if (line.type === 'deleted') deletions++
    }
    return { additions, deletions }
  }, [diffLines])

  const hasChanges =
    titleChanged ||
    subtitleChanged ||
    stats.additions > 0 ||
    stats.deletions > 0

  const handleRevertLine = (idx: number) => {
    if (onRevertContent) {
      const reverted = revertDiffLine(diffLines, idx, currentContent, savedContent)
      onRevertContent(reverted)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] text-[var(--ink-primary)] select-text">
      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-[var(--ink-primary)]" />
          <h3 className="font-serif font-bold text-sm text-[var(--ink-primary)]">
            Changes
          </h3>
          <span className="text-[11px] font-mono text-[var(--ink-muted)]">
            vs. Last Saved
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          title="Close Changes Panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Stats summary bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] font-mono text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
            <Plus className="h-3 w-3" />
            {stats.additions} {stats.additions === 1 ? 'line' : 'lines'}
          </span>
          <span className="text-[var(--ink-faint)]">•</span>
          <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-400 font-semibold">
            <Minus className="h-3 w-3" />
            {stats.deletions} {stats.deletions === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="text-[11px] text-[var(--ink-muted)]">
          Net Words:{' '}
          <span
            className={`font-semibold ${
              wordDelta > 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : wordDelta < 0
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-[var(--ink-muted)]'
            }`}
          >
            {wordDelta > 0 ? `+${wordDelta}` : wordDelta}
          </span>
        </div>
      </div>

      {/* 3. Main Diff Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {/* If no changes anywhere */}
        {!hasChanges && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-sans font-medium text-sm text-[var(--ink-primary)]">
                No unsaved changes
              </p>
              <p className="font-sans text-xs text-[var(--ink-muted)] max-w-xs">
                Your draft is currently in sync with the saved version in the database.
              </p>
            </div>
          </div>
        )}

        {/* Title or Subtitle changed */}
        {(titleChanged || subtitleChanged) && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-subtle)]/60 text-[10px] uppercase font-bold text-[var(--ink-muted)] border-b border-[var(--border-subtle)]">
              <FileText className="h-3 w-3" />
              <span>Chapter Header Changes</span>
            </div>

            <div className="p-2 space-y-2">
              {titleChanged && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--ink-faint)] uppercase">Title</span>
                    {onRevertTitle && (
                      <button
                        type="button"
                        onClick={onRevertTitle}
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                        title="Revert title back to saved"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Revert</span>
                      </button>
                    )}
                  </div>
                  <div className="rounded bg-rose-500/10 border-l-2 border-rose-500 px-2 py-1 text-rose-700 dark:text-rose-300">
                    <span className="font-bold select-none mr-1.5">-</span>
                    <span className="line-through">{savedTitle || '(Untitled Chapter)'}</span>
                  </div>
                  <div className="rounded bg-emerald-500/10 border-l-2 border-emerald-500 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                    <span className="font-bold select-none mr-1.5">+</span>
                    <span>{currentTitle || '(Untitled Chapter)'}</span>
                  </div>
                </div>
              )}

              {subtitleChanged && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[var(--ink-faint)] uppercase">Subtitle</span>
                    {onRevertSubtitle && (
                      <button
                        type="button"
                        onClick={onRevertSubtitle}
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--ink-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                        title="Revert subtitle back to saved"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Revert</span>
                      </button>
                    )}
                  </div>
                  <div className="rounded bg-rose-500/10 border-l-2 border-rose-500 px-2 py-1 text-rose-700 dark:text-rose-300">
                    <span className="font-bold select-none mr-1.5">-</span>
                    <span className="line-through">{savedSubtitle || '(empty)'}</span>
                  </div>
                  <div className="rounded bg-emerald-500/10 border-l-2 border-emerald-500 px-2 py-1 text-emerald-700 dark:text-emerald-300">
                    <span className="font-bold select-none mr-1.5">+</span>
                    <span>{currentSubtitle || '(empty)'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Unified Line Diff */}
        {hasChanges && diffLines.length > 0 && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-subtle)]/60 text-[10px] uppercase font-bold text-[var(--ink-muted)] border-b border-[var(--border-subtle)]">
              <span>Prose Diff (Unified)</span>
              <span className="font-normal lowercase text-[var(--ink-faint)]">
                {diffLines.length} lines total
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]/40 overflow-x-auto text-[11px] leading-relaxed">
              {diffLines.map((line, idx) => {
                const isAdded = line.type === 'added'
                const isDeleted = line.type === 'deleted'
                const isUnchanged = line.type === 'unchanged'

                // Pair adjacent deleted and added lines for word-level highlighting
                let wordTokens: { oldTokens: WordToken[]; newTokens: WordToken[] } | null = null
                if (isDeleted && diffLines[idx + 1]?.type === 'added') {
                  wordTokens = computeWordTokens(line.text, diffLines[idx + 1].text)
                }

                return (
                  <div
                    key={idx}
                    className={`group relative flex items-start transition-colors ${
                      isAdded
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : isDeleted
                        ? 'bg-rose-500/10 border-l-2 border-rose-500 text-rose-900 dark:text-rose-200'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)]/40'
                    }`}
                  >
                    {/* Line Number / Gutter */}
                    <div className="w-12 shrink-0 select-none py-1 px-1.5 text-right font-mono text-[9px] text-[var(--ink-faint)] border-r border-[var(--border-subtle)]/60 bg-[var(--bg-surface)]/30">
                      {isDeleted && line.oldLineNumber}
                      {isAdded && line.newLineNumber}
                      {isUnchanged && (line.newLineNumber || line.oldLineNumber)}
                    </div>

                    {/* Diff Marker (+ / - / space) */}
                    <div
                      className={`w-6 shrink-0 select-none py-1 text-center font-bold font-mono ${
                        isAdded
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDeleted
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-[var(--ink-faint)]'
                      }`}
                    >
                      {isAdded ? '+' : isDeleted ? '-' : ' '}
                    </div>

                    {/* Line Content */}
                    <div className="flex-1 py-1 pr-2 break-words whitespace-pre-wrap">
                      {isDeleted ? (
                        wordTokens ? (
                          <span>
                            {wordTokens.oldTokens.map((tok, tIdx) => (
                              <span
                                key={tIdx}
                                className={
                                  tok.type === 'deleted'
                                    ? 'bg-rose-500/25 dark:bg-rose-500/40 text-rose-950 dark:text-rose-100 font-semibold px-0.5 rounded-xs'
                                    : ''
                                }
                              >
                                {tok.text}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span>{line.text || <span className="opacity-40 italic">empty line</span>}</span>
                        )
                      ) : isAdded ? (
                        diffLines[idx - 1]?.type === 'deleted' ? (
                          (() => {
                            const pairTokens = computeWordTokens(diffLines[idx - 1].text, line.text)
                            return (
                              <span>
                                {pairTokens.newTokens.map((tok, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={
                                      tok.type === 'added'
                                        ? 'bg-emerald-500/25 dark:bg-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-semibold px-0.5 rounded-xs'
                                        : ''
                                    }
                                  >
                                    {tok.text}
                                  </span>
                                ))}
                              </span>
                            )
                          })()
                        ) : (
                          <span>{line.text || <span className="opacity-40 italic">empty line</span>}</span>
                        )
                      ) : (
                        <span>{line.text || ' '}</span>
                      )}
                    </div>

                    {/* Revert icon button on changed line (recycle/revert icon) */}
                    {(isAdded || isDeleted) && onRevertContent && (
                      <button
                        type="button"
                        onClick={() => handleRevertLine(idx)}
                        className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 mr-1.5 my-0.5 rounded text-[var(--ink-muted)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/15 transition-all cursor-pointer shrink-0"
                        title={isAdded ? "Revert: Remove this added line" : "Revert: Restore this deleted line"}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer Action */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          Close Panel
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={onManualSave}
            disabled={autosaveStatus === 'saving'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {autosaveStatus === 'saving' ? (
              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
            ) : (
              <Save className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{autosaveStatus === 'saving' ? 'Saving...' : 'Save Changes'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
