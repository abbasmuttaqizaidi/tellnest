import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Search,
  Plus,
  Trash2,
  Edit3,
  Link as LinkIcon,
  Unlink,
  Loader2,
  FileSpreadsheet,
  Check,
  BookOpen,
} from 'lucide-react'
import { StoryLoreCsvModal } from './StoryLoreCsvModal'
import {
  linkAllOccurrences,
  unlinkAllOccurrences,
  linkMultipleEntities,
  countEntityMentions,
  type StoryLoreEntity,
} from '../../lib/lore/loreParser'
import {
  getStoryLoreBibleServerFn,
  saveStoryLoreEntityServerFn,
  bulkLinkStoryLoreServerFn,
  bulkUnlinkStoryLoreServerFn,
  deleteStoryLoreEntityServerFn,
} from '../../server/writer'

export interface StoryLoreModalProps {
  isOpen: boolean
  onClose: () => void
  content?: string
  onUpdateContent?: (newMarkdown: string) => void | Promise<void>
  initialSelectedText?: string
  workId?: string
  chapterId?: string
  initialTab?: 'chapter' | 'bible'
}

type EntityType = 'Character' | 'Location' | 'Lore'

export function StoryLoreModal({
  isOpen,
  onClose,
  content = '',
  onUpdateContent,
  initialSelectedText = '',
  workId,
  chapterId,
}: StoryLoreModalProps) {
  const hasChapterContext = Boolean(onUpdateContent)

  // Bible entities state
  const [bibleEntities, setBibleEntities] = useState<StoryLoreEntity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | EntityType>('ALL')

  // Form states (Add-first approach: always ready at top)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [name, setName] = useState(initialSelectedText)
  const [entityType, setEntityType] = useState<EntityType>('Character')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // CSV modal & status feedback
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load lore entities from backend
  const loadEntities = useCallback(async () => {
    if (!workId) return
    setIsLoading(true)
    try {
      const res = await getStoryLoreBibleServerFn({ data: { workId } })
      if (res && Array.isArray(res.entities)) {
        setBibleEntities(res.entities)
      }
    } catch (err) {
      console.error('[StoryLoreModal] Failed to load lore entities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workId])

  // Reset & initialize
  useEffect(() => {
    if (isOpen) {
      setToastMessage(null)
      if (initialSelectedText) {
        setName(initialSelectedText.trim())
        setEditingName(null)
        setTimeout(() => descInputRef.current?.focus(), 100)
      } else {
        setName('')
        setDescription('')
        setEditingName(null)
        setTimeout(() => nameInputRef.current?.focus(), 100)
      }
      if (workId) {
        void loadEntities()
      }
    }
  }, [isOpen, initialSelectedText, workId, loadEntities])

  const resetForm = () => {
    setName('')
    setEntityType('Character')
    setDescription('')
    setEditingName(null)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const handleEditClick = (ent: StoryLoreEntity) => {
    setEditingName(ent.name)
    setName(ent.name)
    setEntityType((ent.type as EntityType) || 'Character')
    setDescription(ent.description)
    setTimeout(() => descInputRef.current?.focus(), 50)
  }

  // Save or update lore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName || !trimmedDesc || !workId) return

    setIsSaving(true)
    try {
      await saveStoryLoreEntityServerFn({
        data: {
          workId,
          entityName: trimmedName,
          entityType,
          entityDescription: trimmedDesc,
          linkToAllChapters: true,
        },
      })

      // Also link in current editor if editing a chapter
      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown, replacedCount } = linkAllOccurrences(
          content,
          trimmedName,
          entityType,
          trimmedDesc
        )
        if (replacedCount > 0) {
          await onUpdateContent(newMarkdown)
        }
      }

      await loadEntities()
      showToast(editingName ? `Updated "${trimmedName}"` : `Added "${trimmedName}" to lore`)
      resetForm()
    } catch (err: any) {
      showToast(err?.message || 'Failed to save lore note')
    } finally {
      setIsSaving(false)
    }
  }

  // Link everywhere (manuscript-wide + current chapter)
  const handleLinkAll = async (ent: StoryLoreEntity) => {
    if (!workId) return
    const key = `link-${ent.name}`
    setActionLoadingKey(key)
    try {
      const res = await bulkLinkStoryLoreServerFn({
        data: {
          workId,
          entityName: ent.name,
          entityType: ent.type,
          entityDescription: ent.description,
        },
      })

      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown } = linkAllOccurrences(
          content,
          ent.name,
          ent.type,
          ent.description
        )
        await onUpdateContent(newMarkdown)
      }

      showToast(`Linked across ${res.updatedChaptersCount} chapter(s)`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to link occurrences')
    } finally {
      setActionLoadingKey(null)
    }
  }

  // Unlink everywhere
  const handleUnlinkAll = async (entName: string) => {
    if (!workId) return
    const key = `unlink-${entName}`
    setActionLoadingKey(key)
    try {
      const res = await bulkUnlinkStoryLoreServerFn({
        data: {
          workId,
          entityName: entName,
        },
      })

      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown } = unlinkAllOccurrences(content, entName)
        await onUpdateContent(newMarkdown)
      }

      showToast(`Unlinked from ${res.updatedChaptersCount} chapter(s)`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to unlink occurrences')
    } finally {
      setActionLoadingKey(null)
    }
  }

  // Delete entity
  const handleDelete = async (entName: string) => {
    if (!workId) return
    if (!window.confirm(`Delete "${entName}" from lore notes? Mentions will be unlinked.`)) return

    const key = `delete-${entName}`
    setActionLoadingKey(key)
    try {
      await deleteStoryLoreEntityServerFn({
        data: {
          workId,
          entityName: entName,
        },
      })

      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown } = unlinkAllOccurrences(content, entName)
        await onUpdateContent(newMarkdown)
      }

      await loadEntities()
      if (editingName === entName) {
        resetForm()
      }
      showToast(`Deleted "${entName}"`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete lore entity')
    } finally {
      setActionLoadingKey(null)
    }
  }

  // Filtered list
  const filteredEntities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return bibleEntities.filter((ent) => {
      const matchesSearch =
        !q ||
        ent.name.toLowerCase().includes(q) ||
        ent.description.toLowerCase().includes(q)
      const matchesType =
        selectedTypeFilter === 'ALL' ||
        ent.type.toUpperCase() === selectedTypeFilter.toUpperCase()
      return matchesSearch && matchesType
    })
  }, [bibleEntities, searchQuery, selectedTypeFilter])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden text-[var(--ink-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Story Lore & Characters</h2>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Add world lore and characters — readers will see these tooltips on hover
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {workId && (
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition cursor-pointer"
                  title="Bulk import lore from CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import CSV</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toast feedback */}
          {toastMessage && (
            <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* 1. ADD-FIRST SECTION: Always ready at top */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-primary)]">
                  {editingName ? `Edit Lore Note: "${editingName}"` : 'Quick Add Lore'}
                </span>

                {/* Type Selection Pills */}
                <div className="flex items-center gap-1">
                  {(['Character', 'Location', 'Lore'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEntityType(t)}
                      className={`px-2.5 py-0.5 text-[11px] rounded-lg font-medium transition cursor-pointer ${
                        entityType === t
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                          : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] hover:border-zinc-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      Name
                    </label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="e.g. Navya, Solaria"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                      Tooltip Note (Reader Hover)
                    </label>
                    <input
                      ref={descInputRef}
                      type="text"
                      placeholder="e.g. Ancient guardian blade forged in dragonfire"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <p className="text-[11px] text-[var(--ink-muted)]">
                    Mentions in prose will automatically show this tooltip.
                  </p>

                  <div className="flex items-center gap-2">
                    {editingName && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3 py-1 text-xs rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSaving || !name.trim() || !description.trim()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{editingName ? 'Update Lore' : 'Add to Lore'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* 2. RECORDED LORE DIRECTORY: Reference & management below */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--ink-primary)]">
                    Recorded Lore ({bibleEntities.length})
                  </span>

                  {/* Filter Pills */}
                  <div className="inline-flex p-0.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)]">
                    {(['ALL', 'Character', 'Location', 'Lore'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTypeFilter(t)}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition cursor-pointer ${
                          selectedTypeFilter === t
                            ? 'bg-[var(--bg-canvas)] text-[var(--ink-primary)] shadow-2xs'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search in existing lore */}
                <div className="relative w-full sm:w-52">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search recorded lore..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 transition"
                  />
                </div>
              </div>

              {/* Lore Cards */}
              {isLoading ? (
                <div className="py-8 text-center text-[var(--ink-muted)] flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                  <span className="text-xs">Loading recorded lore...</span>
                </div>
              ) : filteredEntities.length === 0 ? (
                <div className="py-8 border border-dashed border-[var(--border-subtle)] rounded-xl text-center space-y-1">
                  <p className="text-xs text-[var(--ink-secondary)]">
                    {searchQuery || selectedTypeFilter !== 'ALL'
                      ? 'No lore notes match your filter.'
                      : 'No lore notes added yet. Use the form above to add your first character!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntities.map((ent) => {
                    const mentions = hasChapterContext && content ? countEntityMentions(content, ent.name) : null
                    const isBusy =
                      actionLoadingKey === `link-${ent.name}` ||
                      actionLoadingKey === `unlink-${ent.name}` ||
                      actionLoadingKey === `delete-${ent.name}`

                    return (
                      <div
                        key={ent.name}
                        className={`p-3 rounded-xl border transition flex items-start sm:items-center justify-between gap-3 ${
                          editingName === ent.name
                            ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/40'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        {/* Info */}
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-[var(--ink-primary)]">
                              {ent.name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md ${
                                ent.type === 'Character'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : ent.type === 'Location'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}
                            >
                              {ent.type}
                            </span>

                            {mentions && (
                              <span className="text-[10px] text-[var(--ink-muted)]">
                                {mentions.linked > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400 mr-1.5">
                                    ✓ {mentions.linked} linked in chapter
                                  </span>
                                )}
                                {mentions.unlinked > 0 && (
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    • {mentions.unlinked} unlinked
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                            {ent.description}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Auto-link button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleLinkAll(ent)}
                            title="Auto-link mentions across all chapters"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 bg-zinc-100/70 dark:bg-zinc-800/70 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingKey === `link-${ent.name}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <LinkIcon className="w-3 h-3" />
                            )}
                            <span>Link</span>
                          </button>

                          {/* Unlink button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUnlinkAll(ent.name)}
                            title="Unlink all mentions"
                            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-[var(--bg-subtle)] transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingKey === `unlink-${ent.name}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Unlink className="w-3 h-3" />
                            )}
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleEditClick(ent)}
                            title="Edit note"
                            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(ent.name)}
                            title="Delete note"
                            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingKey === `delete-${ent.name}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
            <span>
              {bibleEntities.length} {bibleEntities.length === 1 ? 'lore note' : 'lore notes'} recorded
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 rounded-lg font-medium border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      {workId && (
        <StoryLoreCsvModal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          workId={workId}
          onImportSuccess={async (res) => {
            await loadEntities()
            if (hasChapterContext && onUpdateContent && res.entities && res.entities.length > 0) {
              const { newMarkdown, totalLinked } = linkMultipleEntities(
                content,
                res.entities.map((e) => ({
                  name: e.name,
                  entityType: e.type,
                  description: e.tooltip,
                }))
              )
              if (totalLinked > 0) {
                await onUpdateContent(newMarkdown)
              }
            }
            showToast(
              `Imported ${res.importedCount} lore entities (${res.totalMentionsLinked} mentions linked across ${res.chaptersUpdated} chapters)`
            )
          }}
        />
      )}
    </>
  )
}
