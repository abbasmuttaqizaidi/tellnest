import React, { useState, useEffect, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { Modal, AnimatedTabs, Button, type TabOption } from '../design-system'
import { BookOpen, ArrowRight, Edit3, Search, X } from 'lucide-react'
import type { StoryLoreEntity } from '../lib/lore/loreParser'
import { getStoryLoreBibleServerFn } from '../server/writer'
import {
  getClientLoreBibleCache,
  setClientLoreBibleCache,
  invalidateClientLoreBibleCache,
} from '../lib/lore/loreClientCache'
import { StoryLoreModal } from './studio/StoryLoreModal'

export interface StoryCodexReaderModalProps {
  isOpen: boolean
  onClose: () => void
  workId: string
  workSlug?: string
  chapters?: Array<{ id: string; number: number; title: string }>
  isAuthor?: boolean
  initialEntities?: StoryLoreEntity[]
  initialLoreTypes?: string[]
}

export function StoryCodexReaderModal({
  isOpen,
  onClose,
  workId,
  workSlug,
  chapters = [],
  isAuthor = false,
  initialEntities,
  initialLoreTypes,
}: StoryCodexReaderModalProps) {
  const [loreData, setLoreData] = useState<{
    entities: StoryLoreEntity[]
    loreTypes: string[]
  } | null>(() => {
    if (initialEntities) {
      return {
        entities: initialEntities,
        loreTypes: initialLoreTypes || ['CHARACTER', 'LOCATION', 'FACTION', 'ITEM', 'LORE'],
      }
    }
    if (workId) return getClientLoreBibleCache(workId)
    return null
  })

  const [selectedLoreEntity, setSelectedLoreEntity] = useState<StoryLoreEntity | null>(null)
  const [loreFilterType, setLoreFilterType] = useState<string>('all')
  const [loreSearchQuery, setLoreSearchQuery] = useState<string>('')
  const [isAuthorLoreModalOpen, setIsAuthorLoreModalOpen] = useState<boolean>(false)

  // Fetch or refresh lore data
  const refreshLore = async () => {
    if (!workId) return
    try {
      invalidateClientLoreBibleCache(workId)
      const fresh = await getStoryLoreBibleServerFn({ data: { workId } })
      if (fresh) {
        setLoreData(fresh)
        setClientLoreBibleCache(workId, fresh)
      }
    } catch (e) {
      console.warn('[StoryCodexReaderModal] Failed to refresh lore:', e)
    }
  }

  useEffect(() => {
    if (!isOpen || !workId) return
    const cached = getClientLoreBibleCache(workId)
    if (cached) {
      setLoreData(cached)
    } else {
      getStoryLoreBibleServerFn({ data: { workId } })
        .then((res) => {
          if (res) {
            setLoreData(res)
            setClientLoreBibleCache(workId, res)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, workId])

  const entities = loreData?.entities || initialEntities || []

  const handleClose = () => {
    setSelectedLoreEntity(null)
    setLoreSearchQuery('')
    onClose()
  }

  // Filtered Lore Entities for Codex Modal
  const filteredLoreEntities = useMemo(() => {
    return entities.filter((entity) => {
      const matchesType =
        loreFilterType === 'all' ||
        (entity.entityType || '').toLowerCase() === loreFilterType.toLowerCase()

      const q = loreSearchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        entity.name.toLowerCase().includes(q) ||
        (entity.description && entity.description.toLowerCase().includes(q)) ||
        (entity.aliases && entity.aliases.some((a) => a.toLowerCase().includes(q)))

      return matchesType && matchesSearch
    })
  }, [entities, loreFilterType, loreSearchQuery])

  // Lore Tab Options
  const loreTabOptions: TabOption[] = useMemo(() => {
    const defaultTypes = ['CHARACTER', 'LOCATION', 'FACTION', 'ITEM', 'LORE']
    const presentTypes = Array.from(
      new Set(
        entities
          .map((e) => (e.entityType || '').toUpperCase())
          .filter(Boolean)
      )
    )
    const combinedTypes = Array.from(new Set([...defaultTypes, ...presentTypes]))

    const tabs: TabOption[] = [
      { id: 'all', label: 'All', badge: entities.length > 0 ? entities.length : undefined },
    ]

    for (const t of combinedTypes) {
      const count = entities.filter((e) => (e.entityType || '').toUpperCase() === t).length
      if (count > 0 || ['CHARACTER', 'LOCATION'].includes(t)) {
        tabs.push({
          id: t.toLowerCase(),
          label: t.charAt(0) + t.slice(1).toLowerCase(),
          badge: count > 0 ? count : undefined,
        })
      }
    }

    return tabs
  }, [entities])

  // Chapters mentioning the selected entity
  const chaptersMentioningSelectedEntity = useMemo(() => {
    if (!selectedLoreEntity) return []
    const chapterIds = Array.isArray(selectedLoreEntity.chapterIds)
      ? selectedLoreEntity.chapterIds
      : []

    if (chapterIds.length === 0 || chapters.length === 0) return []
    return chapters.filter((ch) => chapterIds.includes(ch.id))
  }, [selectedLoreEntity, chapters])

  if (!isOpen) return null

  const targetWorkSlug = workSlug || workId

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        size="md"
        className="h-[560px] max-h-[90vh] flex flex-col"
        bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-4"
        title={
          selectedLoreEntity ? (
            <div className="flex items-center gap-2 truncate pr-6">
              <span className="truncate font-serif text-lg text-[var(--ink-primary)]">
                {selectedLoreEntity.name}
              </span>
            </div>
          ) : (
            <span className="font-serif text-lg text-[var(--ink-primary)]">
              Story Codex & Profiles
            </span>
          )
        }
        description={
          selectedLoreEntity
            ? undefined
            : 'Explore characters, factions, and world lore recorded for this story'
        }
        footer={
          <div className="flex items-center justify-between w-full pt-1">
            <div className="text-[11px] font-mono text-[var(--ink-muted)]">
              {selectedLoreEntity ? (
                <span>Profile details</span>
              ) : (
                <span>
                  {filteredLoreEntities.length} of {entities.length}{' '}
                  {entities.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isAuthor && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleClose()
                    setIsAuthorLoreModalOpen(true)
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Manage in Studio
                </Button>
              )}
              <Button size="sm" variant="primary" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        }
      >
        {selectedLoreEntity ? (
          /* DRILL-DOWN: ENTITY DETAIL VIEW */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Back navigation & Type header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLoreEntity(null)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3 h-3 rotate-180" />
                <span>Back to all entries</span>
              </button>
              <span className="rounded-full bg-black text-white dark:bg-white dark:text-black px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider shrink-0 select-none">
                {selectedLoreEntity.entityType || 'LORE'}
              </span>
            </div>

            {/* Scrollable Detail Body */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pt-3 pr-1 overscroll-contain">
              {/* Full Bio / Lore Description */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold mb-1.5">
                  Description & Notes
                </h4>
                <p className="text-sm leading-relaxed text-[var(--ink-primary)] font-serif whitespace-pre-line select-text">
                  {selectedLoreEntity.description || 'No detailed background notes provided for this entity yet.'}
                </p>
              </div>

              {/* Chapters where this entity appears */}
              {chaptersMentioningSelectedEntity.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
                    Featured in Chapters ({chaptersMentioningSelectedEntity.length})
                  </h4>
                  <div className="space-y-1.5">
                    {chaptersMentioningSelectedEntity.map((ch: any) => (
                      <Link
                        key={ch.id}
                        to="/read/$workId/$chapterId"
                        params={{ workId: targetWorkSlug, chapterId: ch.id }}
                        onClick={handleClose}
                        className="flex items-center justify-between p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] text-inherit no-underline transition-all group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                          <span className="text-xs font-medium text-[var(--ink-primary)] truncate group-hover:underline">
                            Ch. {ch.number}: {ch.title || `Chapter ${ch.number}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)] shrink-0 flex items-center gap-1">
                          <span>Read</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* LIST VIEW: TABS, SEARCH, AND COMPACT LISTING */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Header Controls: AnimatedTabs & Improved Search Field */}
            <div className="shrink-0 space-y-2.5 pb-3 border-b border-[var(--border-subtle)]">
              {loreTabOptions.length > 1 && (
                <div className="overflow-x-auto no-scrollbar">
                  <AnimatedTabs
                    id="codex-reader-modal-tabs"
                    tabs={loreTabOptions}
                    activeId={loreFilterType}
                    onChange={setLoreFilterType}
                    variant="pill"
                    size="xs"
                    className="shrink-0"
                  />
                </div>
              )}

              {/* Improved Sleek Search Bar */}
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or keyword..."
                  value={loreSearchQuery}
                  onChange={(e) => setLoreSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8.5 pr-8 text-xs rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-surface)] focus:bg-[var(--bg-surface)] text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)] transition-all font-sans"
                />
                {loreSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setLoreSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-0.5 rounded cursor-pointer transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Compact Vertical Listing */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-2.5 pr-1 overscroll-contain">
              {filteredLoreEntities.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-[var(--border-subtle)] rounded-xl">
                  <p className="text-xs font-mono text-[var(--ink-muted)]">No entities found matching your filter</p>
                  {(loreSearchQuery || loreFilterType !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLoreFilterType('all')
                        setLoreSearchQuery('')
                      }}
                      className="mt-2 text-xs font-mono text-[var(--ink-primary)] underline hover:opacity-80 cursor-pointer"
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredLoreEntities.map((entity) => (
                    <div
                      key={entity.id || entity.name}
                      onClick={() => setSelectedLoreEntity(entity)}
                      className="py-2 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[var(--ink-primary)] transition-all cursor-pointer group text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-serif font-medium text-sm text-[var(--ink-primary)] group-hover:underline truncate">
                          {entity.name}
                        </h4>
                        <span className="rounded-full bg-black text-white dark:bg-white dark:text-black px-2.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider shrink-0 select-none">
                          {entity.entityType || 'LORE'}
                        </span>
                      </div>

                      {entity.description && (
                        <p className="mt-1 text-xs text-[var(--ink-secondary)] line-clamp-1 leading-relaxed font-sans">
                          {entity.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* AUTHOR STUDIO LORE MODAL */}
      {isAuthorLoreModalOpen && (
        <StoryLoreModal
          isOpen={isAuthorLoreModalOpen}
          onClose={() => {
            setIsAuthorLoreModalOpen(false)
            refreshLore()
          }}
          workId={workId}
          initialTab="bible"
        />
      )}
    </>
  )
}
