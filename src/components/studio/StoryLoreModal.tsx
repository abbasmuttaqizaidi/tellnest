import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import {
  extractLoreEntities,
  countEntityMentions,
  linkAllOccurrences,
  linkSingleOccurrence,
  unlinkAllOccurrences,
  type LoreEntity,
} from '../../lib/lore/loreParser'

export interface StoryLoreModalProps {
  isOpen: boolean
  onClose: () => void
  content: string
  onUpdateContent: (newMarkdown: string) => void
  initialSelectedText?: string
}

export function StoryLoreModal({
  isOpen,
  onClose,
  content,
  onUpdateContent,
  initialSelectedText = '',
}: StoryLoreModalProps) {
  // Form states
  const [name, setName] = useState(initialSelectedText)
  const [entityType, setEntityType] = useState<'Character' | 'Location' | 'Lore'>('Character')
  const [description, setDescription] = useState('')
  const [applyToAll, setApplyToAll] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Sync initialSelectedText when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialSelectedText) {
        setName(initialSelectedText.trim())
      }
      setToastMessage(null)
    }
  }, [isOpen, initialSelectedText])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Extract all currently defined entities in this chapter
  const definedEntities = useMemo(() => {
    return extractLoreEntities(content)
  }, [content])

  // Compute mentions per entity
  const entitiesWithStats = useMemo(() => {
    return definedEntities.map((ent) => {
      const stats = countEntityMentions(content, ent.name)
      return {
        ...ent,
        ...stats,
      }
    })
  }, [definedEntities, content])

  // Total unlinked mentions across all defined entities
  const totalUnlinked = useMemo(() => {
    return entitiesWithStats.reduce((sum, e) => sum + e.unlinkedCount, 0)
  }, [entitiesWithStats])

  // Handle Save / Link single entity
  const handleSaveEntity = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (!trimmedName || !trimmedDesc) return

    const newEntity: LoreEntity = {
      name: trimmedName,
      entityType,
      description: trimmedDesc,
    }

    // Link occurrences in content (apply to all occurrences or single occurrence based on checkbox)
    const { newMarkdown, countReplaced } = applyToAll
      ? linkAllOccurrences(content, newEntity)
      : linkSingleOccurrence(content, newEntity)

    if (countReplaced > 0) {
      onUpdateContent(newMarkdown)
      showToast(`Linked ${countReplaced} occurrence${countReplaced > 1 ? 's' : ''} of "${trimmedName}"`)
      setName('')
      setDescription('')
      onClose()
    } else {
      // Clear feedback when word is not found in chapter prose
      showToast(`"${trimmedName}" chapter text mein nahi mila. Pehle ise chapter text mein likhein.`)
    }
  }

  // Handle Footer Action (Done / Save & Link)
  const handleFooterAction = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = name.trim()
    const trimmedDesc = description.trim()
    if (trimmedName && trimmedDesc) {
      handleSaveEntity()
    } else {
      onClose()
    }
  }

  // Handle Link All for a specific entity
  const handleLinkSpecific = (ent: LoreEntity) => {
    const { newMarkdown, countReplaced } = linkAllOccurrences(content, ent)
    if (countReplaced > 0) {
      onUpdateContent(newMarkdown)
      showToast(`Linked ${countReplaced} new mention${countReplaced > 1 ? 's' : ''} of "${ent.name}"`)
    } else {
      showToast(`All occurrences of "${ent.name}" are already linked.`)
    }
  }

  // Handle Link All across chapter for ALL defined entities
  const handleLinkAllThroughout = () => {
    if (definedEntities.length === 0) return

    let current = content
    let totalLinked = 0

    for (const ent of definedEntities) {
      const { newMarkdown, countReplaced } = linkAllOccurrences(current, ent)
      current = newMarkdown
      totalLinked += countReplaced
    }

    onUpdateContent(current)
    showToast(`Linked ${totalLinked} mention${totalLinked !== 1 ? 's' : ''} throughout the chapter!`)
  }

  // Handle Unlink an entity
  const handleUnlink = (entName: string) => {
    const { newMarkdown, countUnlinked } = unlinkAllOccurrences(content, entName)
    onUpdateContent(newMarkdown)
    showToast(`Unlinked ${countUnlinked} mention${countUnlinked !== 1 ? 's' : ''} of "${entName}".`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[var(--bg-surface)] text-[var(--ink-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50">
          <div className="flex items-center gap-2.5">
            <div>
              <h3 className="font-serif text-lg font-bold tracking-tight text-[var(--ink-primary)]">
                Characters & Story Lore
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                Interactive footnotes for characters, places, and terms.
              </p>
            </div>
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

        {/* Toast feedback */}
        {toastMessage && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Add / Tag Form */}
          <form onSubmit={handleSaveEntity} className="space-y-3.5 rounded-xl bg-[var(--bg-canvas)] p-4 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                {name ? `Annotate "${name}"` : 'Add New Lore Note'}
              </span>
              <div className="flex items-center gap-1">
                {(['Character', 'Location', 'Lore'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEntityType(t)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      entityType === t
                        ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--bg-surface)]'
                    }`}
                  >
                    {t === 'Character' && <User className="h-3 w-3" />}
                    {t === 'Location' && <MapPin className="h-3 w-3" />}
                    {t === 'Lore' && <BookOpen className="h-3 w-3" />}
                    {t}
                  </button>
                ))}
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
                  placeholder="e.g. Male, 23 — protagonist"
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] focus:border-amber-500 focus:outline-none text-[var(--ink-primary)]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="rounded border-[var(--border-subtle)] text-amber-600 focus:ring-0"
                />
                <span>Automatically link all occurrences across chapter</span>
              </label>

              <button
                type="submit"
                disabled={!name.trim() || !description.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save & Link</span>
              </button>
            </div>
          </form>

          {/* Defined Entities Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                  Defined in this Chapter ({entitiesWithStats.length})
                </h4>
                {totalUnlinked > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {totalUnlinked} unlinked mention{totalUnlinked !== 1 ? 's' : ''} found in your text
                  </p>
                )}
              </div>

              {entitiesWithStats.length > 0 && totalUnlinked > 0 && (
                <button
                  type="button"
                  onClick={handleLinkAllThroughout}
                  className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Link All Throughout ({totalUnlinked})</span>
                </button>
              )}
            </div>

            {entitiesWithStats.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-[var(--border-subtle)] p-6 bg-[var(--bg-canvas)]/30">
                <BookOpen className="h-8 w-8 text-[var(--ink-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium text-[var(--ink-primary)]">
                  No characters or lore defined yet
                </p>
                <p className="text-xs text-[var(--ink-muted)] mt-1 max-w-sm mx-auto">
                  Highlight any word in your story to add a lore note, or use the form above to define your characters once and link them all.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {entitiesWithStats.map((ent) => (
                  <div
                    key={ent.name.toLowerCase()}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-start justify-between gap-3 hover:border-[var(--border-strong)] transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[var(--ink-primary)] truncate">
                          {ent.name}
                        </span>
                        <span className="text-[9px] font-mono uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)]">
                          {ent.entityType}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-secondary)] leading-relaxed break-words">
                        {ent.description}
                      </p>
                      <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                        {ent.linkedCount} linked
                        {ent.unlinkedCount > 0 && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1.5">
                            • {ent.unlinkedCount} unlinked
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {ent.unlinkedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => handleLinkSpecific(ent)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center gap-1"
                          title="Link all occurrences"
                        >
                          <LinkIcon className="h-3 w-3" />
                          <span>Link ({ent.unlinkedCount})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleUnlink(ent.name)}
                        className="p-1.5 rounded-md text-[var(--ink-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Unlink all mentions in this chapter"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
          <div className="flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Format: <code className="font-mono text-[10px] bg-[var(--bg-surface)] px-1 py-0.5 rounded border border-[var(--border-subtle)]">[Name](lore:Type|Desc)</code></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFooterAction}
              className="px-4 py-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{name.trim() && description.trim() ? 'Save & Link' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
