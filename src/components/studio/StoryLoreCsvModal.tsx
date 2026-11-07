import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useUser } from '@clerk/react'
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  HelpCircle,
  ArrowRight,
} from 'lucide-react'
import {
  parseLoreCsv,
  generateSampleLoreCsv,
  type CsvLoreRow,
  type CsvLoreParseResult,
} from '../../lib/lore/csvLoreParser'
import { importStoryLoreCsvServerFn } from '../../server/writer'

export interface StoryLoreCsvModalProps {
  isOpen: boolean
  onClose: () => void
  workId: string
  onImportSuccess?: (result: {
    importedCount: number
    chaptersUpdated: number
    totalMentionsLinked: number
    entities?: CsvLoreRow[]
  }) => void
}

export function StoryLoreCsvModal({
  isOpen,
  onClose,
  workId,
  onImportSuccess,
}: StoryLoreCsvModalProps) {
  const { user } = useUser()
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<CsvLoreParseResult | null>(null)
  const [editableRows, setEditableRows] = useState<CsvLoreRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [linkAllChapters, setLinkAllChapters] = useState(true)

  // Modals & status
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{
    importedCount: number
    chaptersUpdated: number
    totalMentionsLinked: number
    duplicateCount: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset internal states on modal close
  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setFile(null)
    setParseResult(null)
    setEditableRows([])
    setSearchQuery('')
    setShowConfirmModal(false)
    setErrorMessage(null)
    setSuccessResult(null)
    onClose()
  }, [isSubmitting, onClose])

  // Download Sample CSV
  const handleDownloadSample = () => {
    const csvContent = generateSampleLoreCsv()
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'story_lore_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Parse CSV text
  const processCsvText = (text: string) => {
    setErrorMessage(null)
    const res = parseLoreCsv(text)
    setParseResult(res)

    if (res.errors.length > 0 && res.rows.length === 0) {
      setErrorMessage(res.errors[0])
      setEditableRows([])
    } else {
      setEditableRows(res.rows)
    }
  }

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!selected.name.toLowerCase().endsWith('.csv') && selected.type !== 'text/csv') {
      setErrorMessage('Please select a valid .csv file.')
      return
    }

    setFile(selected)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      processCsvText(content || '')
    }
    reader.onerror = () => {
      setErrorMessage('Failed to read the file. Please try again.')
    }
    reader.readAsText(selected, 'UTF-8')
  }

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return

    if (!droppedFile.name.toLowerCase().endsWith('.csv') && droppedFile.type !== 'text/csv') {
      setErrorMessage('Please drop a valid .csv file.')
      return
    }

    setFile(droppedFile)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      processCsvText(content || '')
    }
    reader.readAsText(droppedFile, 'UTF-8')
  }

  // Remove row from preview table
  const handleRemoveRow = (index: number) => {
    setEditableRows((prev) => prev.filter((_, i) => i !== index))
  }

  // Filter preview rows
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return editableRows
    const q = searchQuery.toLowerCase().trim()
    return editableRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.tooltip.toLowerCase().includes(q)
    )
  }, [editableRows, searchQuery])

  // Execute import & linking
  const handleExecuteImport = async () => {
    if (!workId || editableRows.length === 0) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setShowConfirmModal(false)

    try {
      // Re-serialize the approved rows to CSV
      const approvedCsv = [
        'Name,Type,Tooltip',
        ...editableRows.map(
          (r) =>
            `"${r.name.replace(/"/g, '""')}","${(r.type || 'Character').replace(/"/g, '""')}","${r.tooltip.replace(/"/g, '""')}"`
        ),
      ].join('\n')

      const res = await importStoryLoreCsvServerFn({
        data: {
          workId,
          clerkUserId: user?.id,
          csvText: approvedCsv,
          linkAllChapters,
        },
      })

      if (res?.success) {
        setSuccessResult({
          importedCount: res.importedCount,
          chaptersUpdated: res.chaptersUpdated || 0,
          totalMentionsLinked: res.totalMentionsLinked || 0,
          duplicateCount: parseResult?.duplicateCount || 0,
        })
        if (onImportSuccess) {
          onImportSuccess({
            importedCount: res.importedCount,
            chaptersUpdated: res.chaptersUpdated || 0,
            totalMentionsLinked: res.totalMentionsLinked || 0,
            entities: editableRows,
          })
        }
      } else {
        setErrorMessage('Import could not be completed. Please check your data.')
      }
    } catch (err: any) {
      console.error('[StoryLoreCsvModal] Import failed:', err)
      setErrorMessage(err?.message || 'An error occurred during import.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 id="csv-modal-title" className="text-base font-semibold leading-tight">
                Import Story Lore Bible via CSV
              </h2>
              <p className="text-xs text-[var(--ink-muted)]">
                Bulk upload characters, places, and worldbuilding notes across all chapters
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Screen */}
          {successResult ? (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink-primary)]">
                  Lore Import Completed Successfully!
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-md mx-auto">
                  Your Story Bible has been updated and cross-chapter lore links were applied seamlessly.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-xl font-bold font-mono text-[var(--ink-primary)]">
                    {successResult.importedCount}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">Entities Added</div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {successResult.chaptersUpdated}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">Chapters Updated</div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {successResult.totalMentionsLinked}
                  </div>
                  <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">Mentions Linked</div>
                </div>
              </div>

              {successResult.duplicateCount > 0 && (
                <p className="text-[11px] text-[var(--ink-muted)]">
                  ({successResult.duplicateCount} duplicate identical row{successResult.duplicateCount > 1 ? 's were' : ' was'} safely ignored)
                </p>
              )}

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Done & Return to Story Bible
                </button>
              </div>
            </div>
          ) : !parseResult || editableRows.length === 0 ? (
            /* Upload / Dropzone Screen */
            <div className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-[var(--border-subtle)] hover:border-amber-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-[var(--bg-canvas)]/50 hover:bg-amber-500/[0.02]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] group-hover:scale-105 group-hover:border-amber-500/50 transition-all shadow-xs text-amber-600 dark:text-amber-400 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>

                <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                  Click to browse or drop your CSV file here
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm">
                  Upload a standard spreadsheet with columns <span className="font-mono font-medium text-[var(--ink-primary)]">Name</span>, <span className="font-mono font-medium text-[var(--ink-primary)]">Type</span>, and <span className="font-mono font-medium text-[var(--ink-primary)]">Tooltip</span>.
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--ink-secondary)]">
                    CSV format only (UTF-8)
                  </span>
                </div>
              </div>

              {/* Template Download & Format Guidance */}
              <div className="rounded-xl p-4 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)]">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Need a starting spreadsheet template?</span>
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)]">
                    Download our ready-made CSV template with example characters, locations, and lore.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--ink-primary)] transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              {/* Specification Notice */}
              <div className="space-y-2 text-xs text-[var(--ink-muted)] bg-[var(--bg-surface)] rounded-xl p-3.5 border border-[var(--border-subtle)]">
                <div className="font-medium text-[var(--ink-primary)] flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono">
                  <HelpCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span>Import Guidelines</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                  <li>
                    Headers must strictly be: <span className="font-mono font-medium text-[var(--ink-primary)]">Name,Type,Tooltip</span> (case-sensitive).
                  </li>
                  <li>
                    <span className="font-medium text-[var(--ink-primary)]">Type</span> is flexible: you can write <span className="font-mono">Character</span>, <span className="font-mono">Location</span>, <span className="font-mono">Lore</span>, <span className="font-mono">Protagonist</span>, or any custom label.
                  </li>
                  <li>
                    A row is only ignored as duplicate if <span className="font-medium text-[var(--ink-primary)]">all three</span> columns (Name, Type, Tooltip) match identically.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Interactive Preview Screen */
            <div className="space-y-4">
              {/* Summary Badges & Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/20 font-mono">
                    {editableRows.length} Valid to Import
                  </span>

                  {file?.name && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[var(--bg-canvas)] text-[var(--ink-muted)] border border-[var(--border-subtle)] text-[11px] font-mono truncate max-w-[160px]" title={file.name}>
                      {file.name}
                    </span>
                  )}

                  {parseResult && parseResult.duplicateCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] text-[var(--ink-muted)] border border-[var(--border-subtle)] text-[11px]">
                      {parseResult.duplicateCount} Duplicate{parseResult.duplicateCount > 1 ? 's' : ''} Skipped
                    </span>
                  )}

                  {parseResult && parseResult.errors.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]">
                      {parseResult.errors.length} Format Warning{parseResult.errors.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Search in preview */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--ink-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter preview entries..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] focus:border-amber-500 focus:outline-none text-[var(--ink-primary)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-canvas)]">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider font-mono">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3 w-40">Name</th>
                        <th className="py-2.5 px-3 w-28">Type</th>
                        <th className="py-2.5 px-3">Tooltip</th>
                        <th className="py-2.5 px-3 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-[var(--ink-muted)]">
                            No matching entities found.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, idx) => (
                          <tr
                            key={`${row.name}-${idx}`}
                            className="hover:bg-[var(--bg-surface)] transition-colors group"
                          >
                            <td className="py-2.5 px-3 text-center text-[11px] font-mono text-[var(--ink-muted)]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[var(--ink-primary)]">
                              {row.name}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--ink-secondary)]">
                                {row.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[var(--ink-secondary)] truncate max-w-xs" title={row.tooltip}>
                              {row.tooltip}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(idx)}
                                title="Remove from import"
                                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Options */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-xs text-[var(--ink-primary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkAllChapters}
                    onChange={(e) => setLinkAllChapters(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-subtle)] text-amber-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="font-medium">Link occurrences across all manuscript chapters</span>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      Automatically hyperlinking mentions in prose with rich hover tooltips
                    </p>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setParseResult(null)
                    setEditableRows([])
                    setFile(null)
                  }}
                  className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline cursor-pointer shrink-0"
                >
                  Upload different file
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!successResult && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {parseResult && editableRows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isSubmitting || editableRows.length === 0}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <span>Review & Import {editableRows.length} Entities</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Sub-Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-100"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-[var(--ink-primary)]">
                Confirm Lore Import
              </h3>
            </div>

            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              You are about to import{' '}
              <strong className="text-[var(--ink-primary)] font-semibold font-mono">
                {editableRows.length} entities
              </strong>{' '}
              into your manuscript Story Bible.
              {linkAllChapters
                ? ' All manuscript chapters will be scanned and hyperlinked with interactive tooltips.'
                : ' Entities will be added to the Story Bible without modifying chapter text.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                Back to Preview
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Yes, Import & Link</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
