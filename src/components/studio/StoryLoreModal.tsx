import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  X,
  Sparkles,
  User,
  MapPin,
  BookOpen,
  Plus,
  Check,
  Link as LinkIcon,
  Unlink,
  Trash2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Globe,
  Search,
  Loader2,
  Filter,
} from 'lucide-react'
import {
  extractLoreEntities,
  countEntityMentions,
  linkAllOccurrences,
  linkSingleOccurrence,
  unlinkAllOccurrences,
  type LoreEntity,
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

const ENTITY_TYPES = [
  { value: 'Character', label: 'Character', icon: User },
  { value: 'Location', label: 'Location', icon: MapPin },
  { value: 'Lore', label: 'Lore', icon: BookOpen },
] as const

export function StoryLoreModal({
  isOpen,
  onClose,
  content = '',
  onUpdateContent,
  initialSelectedText = '',
  workId,
  chapterId,
  initialTab,
}: StoryLoreModalProps) {
  const hasChapterContext = Boolean(onUpdateContent)

  // Tab State: 'chapter' or 'bible'
  const [activeTab, setActiveTab] = useState<'chapter' | 'bible'>(
    initialTab || (hasChapterContext ? 'chapter' : 'bible')
  )

  // Form states
  const [name, setName] = useState(initialSelectedText)
  const [entityType, setEntityType] = useState<'Character' | 'Location' | 'Lore'>('Character')
  const [description, setDescription] = useState('')
  const [applyToChapter, setApplyToChapter] = useState(true)
  const [applyToAllChapters, setApplyToAllChapters] = useState(!hasChapterContext)
  const [isSaving, setIsSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Story Bible states
  const [bibleEntities, setBibleEntities] = useState<StoryLoreEntity[]>([])
  const [isLoadingBible, setIsLoadingBible] = useState(false)
  const [bibleSearchQuery, setBibleSearchQuery] = useState('')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'Character' | 'Location' | 'Lore'>('ALL')
  const [actionLoadingEntity, setActionLoadingEntity] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load Bible Entities when workId is provided
  const loadBibleEntities = useCallback(async () => {
    if (!workId) return
    setIsLoadingBible(true)
    try {
      const res = await getStoryLoreBibleServerFn({ data: { workId } })
      if (res && Array.isArray(res.entities)) {
        setBibleEntities(res.entities)
      }
    } catch (err: any) {
      console.error('[StoryLoreModal] Failed to load bible entities:', err)
    } finally {
      setIsLoadingBible(false)
    }
  }, [workId])

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedText) {
        setName(initialSelectedText.trim())
      }
      setToastMessage(null)
      setIsTypeDropdownOpen(false)
      setActiveTab(initialTab || (hasChapterContext ? 'chapter' : 'bible'))
      setApplyToAllChapters(!hasChapterContext)
      if (workId) {
        void loadBibleEntities()
      }
    }
  }, [isOpen, initialSelectedText, initialTab, hasChapterContext, workId, loadBibleEntities])

  // Close type dropdown on click outside
  useEffect(() => {
    if (!isTypeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isTypeDropdownOpen])

  // Chapter-level entities (if in chapter context)
  const chapterEntities = useMemo(() => {
    if (!content) return []
    return extractLoreEntities(content)
  }, [content])

  // Chapter stats per entity
  const chapterEntitiesWithStats = useMemo(() => {
    if (!content) return []
    return chapterEntities.map((ent) => {
      const stats = countEntityMentions(content, ent.name)
      return {
        ...ent,
        ...stats,
      }
    })
  }, [chapterEntities, content])

  // Total unlinked mentions in this chapter
  const totalUnlinkedInChapter = useMemo(() => {
    return chapterEntitiesWithStats.reduce((sum, e) => sum + e.unlinkedCount, 0)
  }, [chapterEntitiesWithStats])

  // Filtered Story Bible entities
  const filteredBibleEntities = useMemo(() => {
    let list = bibleEntities
    if (selectedTypeFilter !== 'ALL') {
      list = list.filter((e) => e.entityType === selectedTypeFilter)
    }
    if (bibleSearchQuery.trim()) {
      const q = bibleSearchQuery.toLowerCase().trim()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.entityType.toLowerCase().includes(q)
      )
    }
    return list
  }, [bibleEntities, selectedTypeFilter, bibleSearchQuery])

  // Handle Save / Link single entity
  const handleSaveEntity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    // Strip accidental square brackets to preserve markdown link integrity
    const trimmedName = name.replace(/[\[\]]/g, '').trim()
    const trimmedDesc = description.trim()
    if (!trimmedName || !trimmedDesc || isSaving) return

    setIsSaving(true)
    try {
      const newEntity: LoreEntity = {
        name: trimmedName,
        entityType,
        description: trimmedDesc,
      }

      let storyLinkedCount = 0
      let storyChaptersCount = 0

      // 1. If workId is present, persist to database and optionally link across story
      if (workId) {
        const shouldApplyStoryWide = hasChapterContext ? applyToAllChapters : true
        const saveRes = await saveStoryLoreEntityServerFn({
          data: {
            workId,
            name: trimmedName,
            entityType,
            description: trimmedDesc,
            applyToAllChapters: shouldApplyStoryWide,
            currentChapterId: chapterId,
          },
        })
        if (saveRes) {
          storyLinkedCount = saveRes.totalLinked || 0
          storyChaptersCount = saveRes.chaptersUpdated || 0
        }
        await loadBibleEntities()
      }

      // 2. If in chapter editor context, update current chapter content
      if (hasChapterContext && onUpdateContent) {
        const { newMarkdown, countReplaced } = applyToChapter
          ? linkAllOccurrences(content, newEntity)
          : linkSingleOccurrence(content, newEntity)

        if (countReplaced > 0) {
          await onUpdateContent(newMarkdown)
          if (applyToAllChapters && storyChaptersCount > 1) {
            showToast(`Saved "${trimmedName}" & linked in ${storyChaptersCount} chapters (${storyLinkedCount} mentions)`)
          } else {
            showToast(`Linked ${countReplaced} occurrence${countReplaced > 1 ? 's' : ''} of "${trimmedName}"`)
          }
        } else {
          if (applyToAllChapters && storyLinkedCount > 0) {
            showToast(`Saved "${trimmedName}" & linked ${storyLinkedCount} mentions across ${storyChaptersCount} chapters`)
          } else {
            showToast(`Saved "${trimmedName}" to Story Bible. (Not found in current chapter prose)`)
          }
        }
      } else {
        if (storyLinkedCount > 0) {
          showToast(`Saved "${trimmedName}" & linked ${storyLinkedCount} mentions across ${storyChaptersCount} chapters`)
        } else {
          showToast(`Saved "${trimmedName}" to Story Bible`)
        }
      }

      setName('')
      setDescription('')
      if (initialSelectedText) {
        onClose()
      }
    } catch (err: any) {
      console.error('[handleSaveEntity] Error:', err)
      showToast(`Error: ${err?.message || 'Failed to save lore note'}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle Footer Action (Done / Save & Link)
  const handleFooterAction = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (trimmedName && trimmedDesc) {
      void handleSaveEntity()
    } else {
      onClose()
    }
  }

  // Handle Link All for a specific entity in this chapter
  const handleLinkSpecificInChapter = async (ent: LoreEntity) => {
    if (!onUpdateContent) return
    const { newMarkdown, countReplaced } = linkAllOccurrences(content, ent)
    if (countReplaced > 0) {
      await onUpdateContent(newMarkdown)
      showToast(`Linked ${countReplaced} new mention${countReplaced > 1 ? 's' : ''} of "${ent.name}"`)
    } else {
      showToast(`All occurrences of "${ent.name}" are already linked.`)
    }
  }

  // Handle Link All across chapter for ALL defined entities
  const handleLinkAllThroughoutChapter = async () => {
    if (!onUpdateContent || chapterEntities.length === 0) return

    let current = content
    let totalLinked = 0

    // Sort descending by name length so longer multi-word entities (e.g. "Arthur Pendragon")
    // link before shorter sub-entities (e.g. "Arthur") without partial link corruption
    const sortedEntities = [...chapterEntities].sort((a, b) => b.name.length - a.name.length)

    for (const ent of sortedEntities) {
      const { newMarkdown, countReplaced } = linkAllOccurrences(current, ent)
      current = newMarkdown
      totalLinked += countReplaced
    }

    await onUpdateContent(current)
    showToast(`Linked ${totalLinked} mention${totalLinked !== 1 ? 's' : ''} throughout chapter!`)
  }

  // Handle Unlink an entity in this chapter
  const handleUnlinkInChapter = async (entName: string) => {
    if (!onUpdateContent) return
    const { newMarkdown, countUnlinked } = unlinkAllOccurrences(content, entName)
    await onUpdateContent(newMarkdown)
    showToast(`Unlinked ${countUnlinked} mention${countUnlinked !== 1 ? 's' : ''} of "${entName}".`)
  }

  // Story-Wide: Bulk Link Across All Chapters
  const handleBulkLinkAllChapters = async (ent: LoreEntity) => {
    if (!workId) return
    const actionKey = `link-all-${ent.name}`
    setActionLoadingEntity(actionKey)
    try {
      const res = await bulkLinkStoryLoreServerFn({
        data: { workId, entityName: ent.name },
      })
      if (hasChapterContext && onUpdateContent) {
        const { newMarkdown } = linkAllOccurrences(content, ent)
        await onUpdateContent(newMarkdown)
      }
      showToast(
        `Linked ${res.totalLinked} mention${res.totalLinked !== 1 ? 's' : ''} of "${ent.name}" across ${res.chaptersUpdated} chapter${res.chaptersUpdated !== 1 ? 's' : ''}`
      )
      await loadBibleEntities()
    } catch (err: any) {
      console.error('[handleBulkLinkAllChapters] Error:', err)
      showToast(`Error: ${err?.message || 'Failed to link across chapters'}`)
    } finally {
      setActionLoadingEntity(null)
    }
  }

  // Story-Wide: Bulk Unlink Across All Chapters
  const handleBulkUnlinkAllChapters = async (entName: string) => {
    if (!workId) return
    const actionKey = `unlink-all-${entName}`
    setActionLoadingEntity(actionKey)
    try {
      const res = await bulkUnlinkStoryLoreServerFn({
        data: { workId, entityName: entName },
      })
      if (hasChapterContext && onUpdateContent) {
        const { newMarkdown } = unlinkAllOccurrences(content, entName)
        await onUpdateContent(newMarkdown)
      }
      showToast(
        `Unlinked ${res.totalUnlinked} mention${res.totalUnlinked !== 1 ? 's' : ''} of "${entName}" across story`
      )
      await loadBibleEntities()
    } catch (err: any) {
      console.error('[handleBulkUnlinkAllChapters] Error:', err)
      showToast(`Error: ${err?.message || 'Failed to unlink across chapters'}`)
    } finally {
      setActionLoadingEntity(null)
    }
  }

  // Story-Wide: Delete from Story Bible
  const handleDeleteBibleEntity = async (entName: string) => {
    if (!workId) return
    const actionKey = `delete-${entName}`
    setActionLoadingEntity(actionKey)
    try {
      const res = await deleteStoryLoreEntityServerFn({
        data: { workId, entityName: entName, unlinkEverywhere: true },
      })
      if (hasChapterContext && onUpdateContent) {
        const { newMarkdown } = unlinkAllOccurrences(content, entName)
        await onUpdateContent(newMarkdown)
      }
      showToast(
        `Deleted "${entName}" from Story Bible${res.unlinkedCount ? ` & unlinked ${res.unlinkedCount} mentions` : ''}`
      )
      await loadBibleEntities()
    } catch (err: any) {
      console.error('[handleDeleteBibleEntity] Error:', err)
      showToast(`Error: ${err?.message || 'Failed to delete entity'}`)
    } finally {
      setActionLoadingEntity(null)
    }
  }

  // Populate form with existing entity
  const handleSelectToEdit = (ent: LoreEntity) => {
    setName(ent.name)
    setEntityType(ent.entityType)
    setDescription(ent.description)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[var(--bg-surface)] text-[var(--ink-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold tracking-tight text-[var(--ink-primary)] flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span>Story Lore & Characters</span>
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Manuscript-wide lore bible and interactive footnotes for characters, places, and terms.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Tabs (when in chapter editor and workId is present) */}
          {hasChapterContext && workId && (
            <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] -mb-4 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('chapter')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'chapter'
                    ? 'border-amber-600 dark:border-amber-400 text-[var(--ink-primary)]'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <span>This Chapter</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] font-mono text-[var(--ink-muted)]">
                  {chapterEntitiesWithStats.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bible')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'bible'
                    ? 'border-amber-600 dark:border-amber-400 text-[var(--ink-primary)]'
                    : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Story Bible</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] font-mono text-[var(--ink-muted)]">
                  {bibleEntities.length}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span className="flex-1">{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Add / Tag Form */}
          <form
            onSubmit={handleSaveEntity}
            className="space-y-3.5 rounded-xl bg-[var(--bg-canvas)] p-4 border border-[var(--border-subtle)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                {name ? `Annotate "${name}"` : 'Add New Lore Note'}
              </span>

              {/* Entity Type Dropdown */}
              <div className="relative" ref={typeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  aria-haspopup="listbox"
                  aria-expanded={isTypeDropdownOpen}
                >
                  {entityType === 'Character' && <User className="h-3.5 w-3.5 text-[var(--ink-muted)]" />}
                  {entityType === 'Location' && <MapPin className="h-3.5 w-3.5 text-[var(--ink-muted)]" />}
                  {entityType === 'Lore' && <BookOpen className="h-3.5 w-3.5 text-[var(--ink-muted)]" />}
                  <span>{entityType}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-[var(--ink-muted)] transition-transform duration-150 ${
                      isTypeDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isTypeDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-36 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                    role="listbox"
                  >
                    {ENTITY_TYPES.map((t) => {
                      const Icon = t.icon
                      const isSelected = entityType === t.value
                      return (
                        <button
                          key={t.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setEntityType(t.value)
                            setIsTypeDropdownOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--bg-canvas)] font-semibold text-[var(--ink-primary)]'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)]" />
                          <span className="flex-1">{t.label}</span>
                          {isSelected && <Check className="h-3 w-3 text-[var(--ink-primary)] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                  Entity Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arthur Pendragon"
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-amber-500 focus:outline-none text-[var(--ink-primary)]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--ink-muted)] mb-1">
                  Tooltip Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Legendary King of Camelot"
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-amber-500 focus:outline-none text-[var(--ink-primary)]"
                  required
                />
              </div>
            </div>

            {/* Scope checkboxes & Submit */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
              <div className="space-y-1">
                {hasChapterContext && (
                  <label className="flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToChapter}
                      onChange={(e) => setApplyToChapter(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] text-amber-600 focus:ring-0"
                    />
                    <span>Link all occurrences in current chapter</span>
                  </label>
                )}

                {workId && (
                  <label className="flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToAllChapters}
                      onChange={(e) => setApplyToAllChapters(e.target.checked)}
                      className="rounded border-[var(--border-subtle)] text-amber-600 focus:ring-0"
                    />
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                      <Globe className="h-3 w-3" />
                      <span>Apply & link across all chapters in story</span>
                    </span>
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !description.trim() || isSaving}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0 self-end sm:self-center"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>{hasChapterContext ? 'Save & Link' : 'Save to Bible'}</span>
              </button>
            </div>
          </form>

          {/* VIEW 1: Chapter-level Entities */}
          {activeTab === 'chapter' && hasChapterContext && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    Defined in this Chapter ({chapterEntitiesWithStats.length})
                  </h4>
                  {totalUnlinkedInChapter > 0 && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      {totalUnlinkedInChapter} unlinked mention{totalUnlinkedInChapter !== 1 ? 's' : ''} found in chapter prose
                    </p>
                  )}
                </div>

                {chapterEntitiesWithStats.length > 0 && totalUnlinkedInChapter > 0 && (
                  <button
                    type="button"
                    onClick={handleLinkAllThroughoutChapter}
                    className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold border border-amber-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Link All Throughout ({totalUnlinkedInChapter})</span>
                  </button>
                )}
              </div>

              {chapterEntitiesWithStats.length === 0 ? (
                <div className="py-6 text-center rounded-lg border border-dashed border-[var(--border-subtle)] p-3 bg-[var(--bg-canvas)]/30">
                  <p className="text-xs text-[var(--ink-muted)]">
                    No characters or lore defined in this chapter yet
                  </p>
                  <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                    Highlight any word in your story or use the form above to define notes.
                  </p>
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {chapterEntitiesWithStats.map((ent) => (
                    <div
                      key={ent.name.toLowerCase()}
                      className="py-2 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors space-y-1"
                    >
                      {/* Top Row: Name, Type Badge, and Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                          onClick={() => handleSelectToEdit(ent)}
                          title="Click to edit in form above"
                        >
                          <span className="font-serif font-bold text-xs text-[var(--ink-primary)] truncate hover:underline">
                            {ent.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase font-semibold px-1 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] shrink-0">
                            {ent.entityType}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                            {ent.linkedCount} linked
                            {ent.unlinkedCount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                • {ent.unlinkedCount} unlinked
                              </span>
                            )}
                          </span>

                          {ent.unlinkedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleLinkSpecificInChapter(ent)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center gap-1"
                              title="Link all occurrences in this chapter"
                            >
                              <LinkIcon className="h-2.5 w-2.5" />
                              <span>Link</span>
                            </button>
                          )}

                          {workId && (
                            <button
                              type="button"
                              onClick={() => handleBulkLinkAllChapters(ent)}
                              disabled={actionLoadingEntity === `link-all-${ent.name}`}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              title="Link this entity across all chapters in story"
                            >
                              {actionLoadingEntity === `link-all-${ent.name}` ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Globe className="h-2.5 w-2.5" />
                              )}
                              <span>Link Story</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleUnlinkInChapter(ent.name)}
                            className="p-1 rounded text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Unlink all mentions in this chapter"
                          >
                            <Unlink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tooltip Description */}
                      <p className="text-[11px] text-[var(--ink-secondary)] leading-snug break-words">
                        {ent.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Story Lore Bible */}
          {activeTab === 'bible' && (
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              {/* Header + Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    Manuscript Lore Bible ({bibleEntities.length})
                  </h4>
                  <p className="text-[10px] text-[var(--ink-muted)]">
                    All characters, locations, and world-building notes across your story.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                  {(['ALL', 'Character', 'Location', 'Lore'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTypeFilter(t)}
                      className={`px-2 py-0.5 text-[10px] rounded-md font-medium transition-colors cursor-pointer shrink-0 ${
                        selectedTypeFilter === t
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {t === 'ALL' ? 'All' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--ink-muted)]" />
                <input
                  type="text"
                  value={bibleSearchQuery}
                  onChange={(e) => setBibleSearchQuery(e.target.value)}
                  placeholder="Search lore notes by name or description..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] focus:border-amber-500 focus:outline-none text-[var(--ink-primary)] placeholder:text-[var(--ink-faint)]"
                />
              </div>

              {/* Entities List */}
              {isLoadingBible ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--ink-muted)]">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  <span className="text-xs">Loading story lore bible...</span>
                </div>
              ) : filteredBibleEntities.length === 0 ? (
                <div className="py-6 text-center rounded-lg border border-dashed border-[var(--border-subtle)] p-3 bg-[var(--bg-canvas)]/30">
                  <p className="text-xs text-[var(--ink-muted)]">
                    {bibleSearchQuery ? 'No matching lore notes found' : 'No story lore notes defined yet'}
                  </p>
                  <p className="text-[11px] text-[var(--ink-faint)] mt-0.5">
                    {bibleSearchQuery
                      ? 'Try adjusting your search query or filter'
                      : 'Use the form above to add your story characters, kingdoms, and terms.'}
                  </p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {filteredBibleEntities.map((ent) => {
                    const isLinking = actionLoadingEntity === `link-all-${ent.name}`
                    const isUnlinking = actionLoadingEntity === `unlink-all-${ent.name}`
                    const isDeleting = actionLoadingEntity === `delete-${ent.name}`

                    // Check if entity has unlinked occurrences in current chapter text
                    const chapterStats = hasChapterContext && content
                      ? countEntityMentions(content, ent.name)
                      : null

                    return (
                      <div
                        key={ent.name.toLowerCase()}
                        className="py-2 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors space-y-1"
                      >
                        {/* Top Line */}
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                            onClick={() => handleSelectToEdit(ent)}
                            title="Click to edit description in form"
                          >
                            <span className="font-serif font-bold text-xs text-[var(--ink-primary)] truncate hover:underline">
                              {ent.name}
                            </span>
                            <span className="text-[9px] font-mono uppercase font-semibold px-1 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] shrink-0">
                              {ent.entityType}
                            </span>
                          </div>

                          {/* Stats and Story Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Mentions badge */}
                            <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                              {ent.chapterCount && ent.chapterCount > 0 ? (
                                <span>
                                  {ent.chapterCount} ch • {ent.mentionCount} mentions
                                </span>
                              ) : (
                                <span className="text-[var(--ink-faint)]">Not yet linked</span>
                              )}
                            </span>

                            {/* Quick Link in Current Chapter (if in editor and unlinked mentions exist) */}
                            {chapterStats && chapterStats.unlinkedCount > 0 && (
                              <button
                                type="button"
                                onClick={() => handleLinkSpecificInChapter(ent)}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center gap-1"
                                title="Link occurrences in current chapter"
                              >
                                <LinkIcon className="h-2.5 w-2.5" />
                                <span>Link in Ch ({chapterStats.unlinkedCount})</span>
                              </button>
                            )}

                            {/* Link All Chapters */}
                            {workId && (
                              <button
                                type="button"
                                onClick={() => handleBulkLinkAllChapters(ent)}
                                disabled={Boolean(actionLoadingEntity)}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title="Scan and link all occurrences across entire story"
                              >
                                {isLinking ? (
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  <Globe className="h-2.5 w-2.5" />
                                )}
                                <span>Link All</span>
                              </button>
                            )}

                            {/* Unlink All Chapters */}
                            {workId && (
                              <button
                                type="button"
                                onClick={() => handleBulkUnlinkAllChapters(ent.name)}
                                disabled={Boolean(actionLoadingEntity)}
                                className="p-1 rounded text-[var(--ink-muted)] hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                title="Unlink across all chapters"
                              >
                                {isUnlinking ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Unlink className="h-3 w-3" />
                                )}
                              </button>
                            )}

                            {/* Delete Entity from Bible */}
                            {workId && (
                              <button
                                type="button"
                                onClick={() => handleDeleteBibleEntity(ent.name)}
                                disabled={Boolean(actionLoadingEntity)}
                                className="p-1 rounded text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                title="Delete from Story Bible and unlink occurrences"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-[11px] text-[var(--ink-secondary)] leading-snug break-words">
                          {ent.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Format: <code className="font-mono text-[10px] bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-subtle)]">[Name](lore:Type|Desc)</code></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleFooterAction}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              <span>{name.trim() && description.trim() ? (hasChapterContext ? 'Save & Link' : 'Save to Bible') : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
