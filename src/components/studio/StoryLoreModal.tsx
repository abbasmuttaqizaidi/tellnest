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
  ChevronUp,
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

  // Form states (collapsible)
  const [isFormOpen, setIsFormOpen] = useState(false)
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
        setIsFormOpen(true)
        setTimeout(() => nameInputRef.current?.focus(), 100)
      } else {
        setIsFormOpen(false)
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
    setIsFormOpen(false)
  }

  const handleEditClick = (ent: StoryLoreEntity) => {
    setEditingName(ent.name)
    setName(ent.name)
    setEntityType((ent.type as EntityType) || 'Character')
    setDescription(ent.description)
    setIsFormOpen(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
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
      showToast(`Saved and linked "${trimmedName}"`)
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
          className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-[var(--ink-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Story Lore & Glossary</h2>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Reader tooltips appear when these terms are hovered or clicked
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {workId && (
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition"
                  title="Bulk import lore from CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import CSV</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feedback banner */}
          {toastMessage && (
            <div className="px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search lore notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 transition"
                />
              </div>

              {/* Filter Pills & Add Button */}
              <div className="flex items-center gap-2">
                <div className="inline-flex p-0.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
                  {(['ALL', 'Character', 'Location', 'Lore'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTypeFilter(t)}
                      className={`px-2 py-0.5 text-[11px] rounded-lg font-medium transition ${
                        selectedTypeFilter === t
                          ? 'bg-[var(--bg-canvas)] text-[var(--ink-primary)] shadow-xs'
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isFormOpen && !editingName) {
                      setIsFormOpen(false)
                    } else {
                      resetForm()
                      setIsFormOpen(true)
                      setTimeout(() => nameInputRef.current?.focus(), 50)
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-xl transition ${
                    isFormOpen
                      ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs'
                  }`}
                >
                  {isFormOpen ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Close</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Lore</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Form */}
            {isFormOpen && (
              <form
                onSubmit={handleSave}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850/60 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    {editingName ? `Edit "${editingName}"` : 'New Lore Note'}
                  </span>
                  {/* Type buttons */}
                  <div className="flex items-center gap-1">
                    {(['Character', 'Location', 'Lore'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEntityType(t)}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-semibold transition ${
                          entityType === t
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] hover:border-zinc-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <input
                      ref={nameInputRef}
                      type="text"
                      placeholder="Name (e.g. Aeloria)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Tooltip note (e.g. High Priestess of Sunspire)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-2.5 py-1 text-xs rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim() || !description.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition disabled:opacity-50"
                  >
                    {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{editingName ? 'Update' : 'Save & Link'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Lore Cards List */}
            {isLoading ? (
              <div className="py-12 text-center text-[var(--ink-muted)] flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                <span className="text-xs">Loading story lore...</span>
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="py-10 border border-dashed border-[var(--border-subtle)] rounded-xl text-center space-y-1.5">
                <BookOpen className="w-6 h-6 mx-auto text-[var(--ink-muted)]" />
                <p className="text-xs text-[var(--ink-secondary)]">
                  {searchQuery || selectedTypeFilter !== 'ALL'
                    ? 'No lore notes match your filter'
                    : 'No lore notes yet. Add your characters or world terms.'}
                </p>
                {!isFormOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm()
                      setIsFormOpen(true)
                      setTimeout(() => nameInputRef.current?.focus(), 50)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline hover:opacity-80"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create one now</span>
                  </button>
                )}
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
                      className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-zinc-300 dark:hover:border-zinc-600 transition flex items-start sm:items-center justify-between gap-3"
                    >
                      {/* Left: Info */}
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

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Auto-link button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleLinkAll(ent)}
                          title="Auto-link mentions across all chapters"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 bg-zinc-100/70 dark:bg-zinc-800/70 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition disabled:opacity-50"
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
                          className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-[var(--bg-subtle)] transition disabled:opacity-50"
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
                          className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(ent.name)}
                          title="Delete note"
                          className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50"
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

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
            <span>
              {bibleEntities.length} {bibleEntities.length === 1 ? 'lore note' : 'lore notes'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg font-medium border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] text-xs transition"
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
