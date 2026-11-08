import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/react'
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
  ChevronDown,
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
  saveUserLoreTypeServerFn,
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

const DEFAULT_LORE_TYPES = ['Character', 'Location', 'Lore']

export function StoryLoreModal({
  isOpen,
  onClose,
  content = '',
  onUpdateContent,
  initialSelectedText = '',
  workId,
  chapterId,
}: StoryLoreModalProps) {
  const { user } = useUser()
  const hasChapterContext = Boolean(onUpdateContent)

  // Bible entities state
  const [bibleEntities, setBibleEntities] = useState<StoryLoreEntity[]>([])
  const [availableTypes, setAvailableTypes] = useState<string[]>(DEFAULT_LORE_TYPES)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')

  // Form states (Add-first approach: always ready at top)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [name, setName] = useState(initialSelectedText)
  const [entityType, setEntityType] = useState<string>('Character')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Combobox dropdown state
  const [isComboboxOpen, setIsComboboxOpen] = useState(false)
  const [comboboxInput, setComboboxInput] = useState('')
  const comboboxRef = useRef<HTMLDivElement>(null)

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

  // Load lore entities & available lore types from backend
  const loadEntities = useCallback(async () => {
    if (!workId) return
    setIsLoading(true)
    try {
      const res = await getStoryLoreBibleServerFn({ data: { workId } })
      if (res) {
        if (Array.isArray(res.entities)) {
          setBibleEntities(res.entities)
        }
        if (Array.isArray(res.loreTypes) && res.loreTypes.length > 0) {
          setAvailableTypes(res.loreTypes)
        }
      }
    } catch (err) {
      console.error('[StoryLoreModal] Failed to load lore entities:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workId])

  // Close combobox on click outside
  useEffect(() => {
    if (!isComboboxOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsComboboxOpen(false)
        setComboboxInput('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isComboboxOpen])

  // Reset & initialize
  useEffect(() => {
    if (isOpen) {
      setToastMessage(null)
      setIsComboboxOpen(false)
      setComboboxInput('')
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
    setIsComboboxOpen(false)
    setComboboxInput('')
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  const handleEditClick = (ent: StoryLoreEntity) => {
    const entName = ent.name || (ent as any).entityName || ''
    setEditingName(entName)
    setName(entName)
    setEntityType(ent.entityType || (ent as any).type || 'Character')
    setDescription(ent.description || (ent as any).entityDescription || '')
    setTimeout(() => descInputRef.current?.focus(), 50)
  }

  // Type selection & custom type creation
  const handleSelectType = (selected: string) => {
    setEntityType(selected)
    setIsComboboxOpen(false)
    setComboboxInput('')
  }

  const handleAddNewType = async (rawInput: string) => {
    const clean = rawInput.trim()
    if (!clean) return

    // Clean title casing (e.g. "villain" -> "Villain", "magic weapon" -> "Magic Weapon")
    const formatted = clean
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    const existingMatch = availableTypes.find(
      (t) => t.toLowerCase() === formatted.toLowerCase()
    )
    const finalType = existingMatch || formatted

    setEntityType(finalType)
    setIsComboboxOpen(false)
    setComboboxInput('')

    if (!existingMatch) {
      setAvailableTypes((prev) => [...prev, finalType])
      if (workId) {
        try {
          await saveUserLoreTypeServerFn({
            data: {
              workId,
              loreType: finalType,
              clerkUserId: user?.id,
            },
          })
          showToast(`Saved "${finalType}" to your lore types`)
        } catch (err) {
          console.warn('[StoryLoreModal] Failed to persist lore type:', err)
        }
      }
    }
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
          name: trimmedName,
          entityName: trimmedName,
          entityType,
          type: entityType,
          description: trimmedDesc,
          entityDescription: trimmedDesc,
          linkToAllChapters: true,
          applyToAllChapters: true,
          clerkUserId: user?.id,
        },
      })

      // Also link in current editor if editing a chapter
      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown, countReplaced } = linkAllOccurrences(content, {
          name: trimmedName,
          entityType,
          description: trimmedDesc,
        })
        if (countReplaced > 0) {
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
    const entName = ent.name || (ent as any).entityName || ''
    if (!entName) return
    const entType = ent.entityType || (ent as any).type || 'Character'
    const entDesc = ent.description || (ent as any).entityDescription || entName

    const key = `link-${entName}`
    setActionLoadingKey(key)
    try {
      const res = await bulkLinkStoryLoreServerFn({
        data: {
          workId,
          name: entName,
          entityName: entName,
          entityType: entType,
          type: entType,
          description: entDesc,
          entityDescription: entDesc,
          clerkUserId: user?.id,
        },
      })

      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown } = linkAllOccurrences(content, {
          name: entName,
          entityType: entType,
          description: entDesc,
        })
        await onUpdateContent(newMarkdown)
      }

      await loadEntities()
      showToast(`Linked across ${res.updatedChaptersCount} chapter(s)`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to link occurrences')
    } finally {
      setActionLoadingKey(null)
    }
  }

  // Unlink everywhere
  const handleUnlinkAll = async (entName: string) => {
    if (!workId || !entName) return
    const key = `unlink-${entName}`
    setActionLoadingKey(key)
    try {
      const res = await bulkUnlinkStoryLoreServerFn({
        data: {
          workId,
          name: entName,
          entityName: entName,
          clerkUserId: user?.id,
        },
      })

      if (hasChapterContext && onUpdateContent && content) {
        const { newMarkdown } = unlinkAllOccurrences(content, entName)
        await onUpdateContent(newMarkdown)
      }

      await loadEntities()
      showToast(`Unlinked from ${res.updatedChaptersCount} chapter(s)`)
    } catch (err: any) {
      showToast(err?.message || 'Failed to unlink occurrences')
    } finally {
      setActionLoadingKey(null)
    }
  }

  // Delete entity
  const handleDelete = async (entName: string) => {
    if (!workId || !entName) return
    if (!window.confirm(`Delete "${entName}" from lore notes? Mentions will be unlinked.`)) return

    const key = `delete-${entName}`
    setActionLoadingKey(key)
    try {
      await deleteStoryLoreEntityServerFn({
        data: {
          workId,
          name: entName,
          entityName: entName,
          clerkUserId: user?.id,
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

  // Filtered combobox suggestions
  const filteredComboboxTypes = useMemo(() => {
    const q = comboboxInput.trim().toLowerCase()
    if (!q) return availableTypes
    return availableTypes.filter((t) => t.toLowerCase().includes(q))
  }, [availableTypes, comboboxInput])

  // Filtered lore list
  const filteredEntities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return bibleEntities.filter((ent) => {
      const matchesSearch =
        !q ||
        ent.name.toLowerCase().includes(q) ||
        ent.description.toLowerCase().includes(q)
      const matchesType =
        selectedTypeFilter === 'ALL' ||
        (ent.entityType || (ent as any).type)?.toLowerCase() === selectedTypeFilter.toLowerCase()
      return matchesSearch && matchesType
    })
  }, [bibleEntities, searchQuery, selectedTypeFilter])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl w-full max-w-2xl h-[640px] max-h-[90vh] flex flex-col overflow-hidden text-[var(--ink-primary)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)] shrink-0">
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
            <div className="shrink-0 px-5 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-100">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {/* 1. ADD-FIRST SECTION: Always ready at top */}
            <div className="shrink-0 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-850/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ink-primary)]">
                  {editingName ? `Edit Lore Note: "${editingName}"` : 'Quick Add Lore'}
                </span>

                {/* Combobox: Type selector + custom type creation */}
                <div className="relative" ref={comboboxRef}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-[var(--ink-muted)]">Type:</span>
                    <button
                      type="button"
                      onClick={() => setIsComboboxOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 bg-[var(--bg-canvas)] text-[var(--ink-primary)] hover:border-zinc-400 dark:hover:border-zinc-500 transition shadow-2xs cursor-pointer"
                      title="Choose or type a new lore type"
                    >
                      <span className="font-semibold">{entityType}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
                    </button>
                  </div>

                  {/* Dropdown Menu */}
                  {isComboboxOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-[var(--bg-canvas)] shadow-xl z-30 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      {/* Search / Custom Type Input */}
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search or add type..."
                          value={comboboxInput}
                          onChange={(e) => setComboboxInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (comboboxInput.trim()) {
                                handleAddNewType(comboboxInput)
                              }
                            } else if (e.key === 'Escape') {
                              setIsComboboxOpen(false)
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      {/* Option to create new custom type if doesn't match existing */}
                      {comboboxInput.trim() &&
                        !availableTypes.some(
                          (t) => t.toLowerCase() === comboboxInput.trim().toLowerCase()
                        ) && (
                          <button
                            type="button"
                            onClick={() => handleAddNewType(comboboxInput)}
                            className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                            <span className="truncate">
                              Add <strong>"{comboboxInput.trim()}"</strong>
                            </span>
                          </button>
                        )}

                      {/* List of existing types */}
                      <div className="max-h-44 overflow-y-auto space-y-0.5 pt-0.5">
                        {filteredComboboxTypes.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleSelectType(t)}
                            className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg font-medium transition flex items-center justify-between cursor-pointer ${
                              entityType.toLowerCase() === t.toLowerCase()
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                : 'text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                            }`}
                          >
                            <span>{t}</span>
                            {entityType.toLowerCase() === t.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                  <span className="text-xs font-semibold text-[var(--ink-primary)] shrink-0">
                    Recorded Lore ({bibleEntities.length})
                  </span>

                  {/* Filter Pills with dynamic custom types */}
                  <div className="inline-flex p-0.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] overflow-x-auto">
                    {['ALL', ...availableTypes].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTypeFilter(t)}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition cursor-pointer whitespace-nowrap ${
                          selectedTypeFilter.toLowerCase() === t.toLowerCase()
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
                <div className="relative w-full sm:w-48 shrink-0">
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
                    const entName = ent.name || (ent as any).entityName || ''
                    const entType = ent.entityType || (ent as any).type || 'Character'
                    const entDesc = ent.description || (ent as any).entityDescription || ''

                    const mentions = hasChapterContext && content ? countEntityMentions(content, entName) : null
                    const isBusy =
                      actionLoadingKey === `link-${entName}` ||
                      actionLoadingKey === `unlink-${entName}` ||
                      actionLoadingKey === `delete-${entName}`

                    const isCharacter = entType.toLowerCase() === 'character'
                    const isLocation = entType.toLowerCase() === 'location'
                    const isLore = entType.toLowerCase() === 'lore'

                    const chaptersCount = ent.chaptersCount ?? ent.chapterCount ?? 0
                    const totalMentions = ent.totalOccurrencesInStory ?? ent.mentionCount ?? 0

                    return (
                      <div
                        key={entName}
                        className={`p-3 rounded-xl border transition flex items-start sm:items-center justify-between gap-3 ${
                          editingName === entName
                            ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100/50 dark:bg-zinc-800/40'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                      >
                        {/* Info */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-[var(--ink-primary)]">
                              {entName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-medium rounded-md ${
                                isCharacter
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : isLocation
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isLore
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              {entType}
                            </span>

                            {/* Manuscript Presence */}
                            <span className="text-[10px] text-[var(--ink-muted)]">
                              {chaptersCount > 0 ? (
                                <span>
                                  {chaptersCount} {chaptersCount === 1 ? 'chapter' : 'chapters'}
                                  {totalMentions > 0 && ` (${totalMentions} ${totalMentions === 1 ? 'mention' : 'mentions'})`}
                                </span>
                              ) : (
                                <span>0 chapters</span>
                              )}
                            </span>

                            {/* Current Chapter Status (shown when modal is open inside a chapter editor) */}
                            {hasChapterContext && mentions && (
                              <span className="text-[10px] flex items-center gap-1.5 font-medium">
                                {mentions.linkedCount > 0 && (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    ✓ {mentions.linkedCount} linked in this chapter
                                  </span>
                                )}
                                {mentions.unlinkedCount > 0 && (
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    • {mentions.unlinkedCount} unlinked in this chapter
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                            {entDesc}
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
                            {actionLoadingKey === `link-${entName}` ? (
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
                            onClick={() => handleUnlinkAll(entName)}
                            title="Unlink all mentions"
                            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-[var(--bg-subtle)] transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingKey === `unlink-${entName}` ? (
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
                            onClick={() => handleDelete(entName)}
                            title="Delete note"
                            className="p-1 rounded-lg text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoadingKey === `delete-${entName}` ? (
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
          <div className="px-5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-[11px] text-[var(--ink-muted)] shrink-0">
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
