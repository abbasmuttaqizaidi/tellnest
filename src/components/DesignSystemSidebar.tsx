import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Layers,
  Compass,
  Search,
  Layout,
  Sparkles,
  ChevronRight,
  ArrowUp,
  X,
  CreditCard,
  Sliders,
  SlidersHorizontal,
  Bookmark,
  Hash,
  ListOrdered
} from 'lucide-react'

export interface NavSubItem {
  id: string
  title: string
  badge?: string
}

export interface NavItem {
  id: string
  title: string
  badge?: string
  subItems?: NavSubItem[]
}

export interface NavCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

export const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    id: 'cat-foundations',
    title: 'Foundations & Primitives',
    icon: Layers,
    items: [
      { id: 'sec-buttons', title: 'Buttons & Taps', badge: 'Core' },
      { id: 'sec-badges', title: 'Badges & Status Chips', badge: 'Core' },
      { id: 'sec-brand', title: 'Hatchpen Brand Mark', badge: 'Brand' },
      { id: 'sec-avatar', title: 'Unisex Avatar & Icon', badge: 'Asset' }
    ]
  },
  {
    id: 'cat-navigation',
    title: 'Navigation & Disclosure',
    icon: Compass,
    items: [
      { id: 'sec-tabs', title: 'Animated Tabs', badge: 'Continuous' },
      { id: 'sec-accordion', title: 'Card Accordion', badge: 'Split' },
      { id: 'sec-filter', title: 'Filter Disclosure', badge: 'Fluid' }
    ]
  },
  {
    id: 'cat-inputs',
    title: 'Inputs & Search',
    icon: Search,
    items: [
      { id: 'sec-omnisearch', title: 'OmniSearch System', badge: 'New' },
      { id: 'sec-search-variants', title: 'Search Variants (4x)', badge: 'Compound' },
      { id: 'sec-command', title: 'Command Search', badge: 'Cmd+K' },
      { id: 'sec-sliders', title: 'Tactile Sliders', badge: 'Adaptive' }
    ]
  },
  {
    id: 'cat-overlays',
    title: 'Modals & Dossiers',
    icon: Layout,
    items: [
      { id: 'sec-overlays', title: 'Modals & Drawers', badge: 'Portal' },
      { id: 'sec-author-dossier', title: 'Expandable Dossier', badge: 'Editorial' }
    ]
  },
  {
    id: 'cat-cards',
    title: 'Watermelon Card Suite',
    icon: CreditCard,
    items: [
      { id: 'sec-cards-suite', title: 'Watermelon Card Suite', badge: '9 Cards' }
    ]
  },
  {
    id: 'cat-new-suite',
    title: 'Interactive Studio Suite',
    icon: Sparkles,
    items: [
      { id: 'sec-ai-bar', title: 'Contextual AI Bar', badge: 'AI' },
      { id: 'sec-feedback', title: 'Feedback Widget', badge: 'Rating' },
      { id: 'sec-expandable-profile', title: 'Expandable Profile Card', badge: 'FLIP' },
      { id: 'sec-option-picker', title: 'Quick Option Picker', badge: 'Choice' },
      { id: 'sec-switcher', title: 'Quick Switcher', badge: 'Mode' },
      { id: 'sec-tags', title: 'Interactive Tags', badge: 'Pill' },
      { id: 'sec-task-widget', title: 'Task Widget Disclosure', badge: 'Checklist' },
      { id: 'sec-pagination', title: 'Continuous Pagination', badge: 'Paging' },
      { id: 'sec-create-community', title: 'Create Community', badge: 'Social' },
      { id: 'sec-create-disclosure', title: 'Create New Disclosure', badge: 'Action' },
      { id: 'sec-discrete-tabs', title: 'Discrete Tabs', badge: 'Sliding' },
      { id: 'sec-dock', title: 'Dock Component', badge: 'macOS' },
      { id: 'sec-edit-profile', title: 'Edit Profile Card', badge: 'Account' },
      { id: 'sec-event-reminders', title: 'Event Reminders', badge: 'Alerts' },
      { id: 'sec-extended-toolbar', title: 'Extended Toolbar', badge: 'Mobile' },
      { id: 'sec-frequency', title: 'Frequency Selector', badge: 'Cadence' },
      { id: 'sec-tour', title: 'Feature Tour', badge: 'Spotlight' },
      { id: 'sec-list-stack', title: 'List Stack', badge: 'Deck' }
    ]
  }
]

interface DesignSystemSidebarProps {
  className?: string
  onSelect?: () => void
  layoutIdPrefix?: string
}

export default function DesignSystemSidebar({
  className = '',
  onSelect,
  layoutIdPrefix = 'desktop'
}: DesignSystemSidebarProps) {
  const [activeId, setActiveId] = useState<string>('sec-buttons')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCards, setExpandedCards] = useState(true)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Collect all section and subitem IDs to observe
  const allTargetIds = useMemo(() => {
    const ids: string[] = []
    NAVIGATION_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        ids.push(item.id)
        if (item.subItems) {
          item.subItems.forEach((sub) => ids.push(sub.id))
        }
      })
    })
    return ids
  }, [])

  // Count total components
  const totalCount = useMemo(() => {
    let count = 0
    NAVIGATION_CATEGORIES.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.subItems) {
          count += item.subItems.length
        } else {
          count += 1
        }
      })
    })
    return count
  }, [])

  // ScrollSpy with IntersectionObserver
  useEffect(() => {
    if (typeof window === 'undefined') return

    const observerCallback: IntersectionObserverCallback = (entries) => {
      if (isUserScrollingRef.current) return

      // Find visible entries
      const visibleEntries = entries.filter((e) => e.isIntersecting)
      if (visibleEntries.length > 0) {
        // Pick the one closest to the top of viewport
        visibleEntries.sort(
          (a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top)
        )
        const matchedId = visibleEntries[0].target.id
        if (matchedId) {
          setActiveId(matchedId)
        }
      }
    }

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-80px 0px -55% 0px',
      threshold: [0, 0.2, 0.5]
    })

    allTargetIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    const handleWindowScroll = () => {
      if (isUserScrollingRef.current) return
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 70
      ) {
        setActiveId('card-deployment')
      }
    }
    window.addEventListener('scroll', handleWindowScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleWindowScroll)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [allTargetIds])

  // Smooth scroll handler
  const handleScrollTo = (id: string) => {
    setActiveId(id)
    isUserScrollingRef.current = true

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false
    }, 800)

    const el = document.getElementById(id)
    if (el) {
      const headerOffset = 84
      const elementPosition = el.getBoundingClientRect().top
      const currentScroll = window.scrollY !== undefined ? window.scrollY : window.pageYOffset
      const offsetPosition = elementPosition + currentScroll - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }

    if (onSelect) {
      onSelect()
    }
  }

  // Filtered categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return NAVIGATION_CATEGORIES
    const q = searchQuery.toLowerCase().trim()

    return NAVIGATION_CATEGORIES.map((cat) => {
      const matchingItems = cat.items
        .map((item) => {
          const itemMatches =
            item.title.toLowerCase().includes(q) ||
            item.badge?.toLowerCase().includes(q)

          const matchingSubItems = item.subItems?.filter(
            (sub) =>
              sub.title.toLowerCase().includes(q) ||
              sub.badge?.toLowerCase().includes(q)
          )

          if (itemMatches || (matchingSubItems && matchingSubItems.length > 0)) {
            return {
              ...item,
              subItems: matchingSubItems || item.subItems
            }
          }
          return null
        })
        .filter(Boolean) as NavItem[]

      return {
        ...cat,
        items: matchingItems
      }
    }).filter((cat) => cat.items.length > 0)
  }, [searchQuery])

  return (
    <nav
      aria-label="Design System Navigation"
      className={`flex flex-col bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-4 shadow-sm ${className}`}
    >
      {/* Sidebar Header */}
      <div className="pb-3 border-b border-[var(--border-subtle)] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />
            <span className="font-serif text-sm font-semibold tracking-tight text-[var(--ink-primary)]">
              Architecture Index
            </span>
          </div>
          <span className="font-mono text-[10px] tracking-wide px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]">
            {totalCount} Primitives
          </span>
        </div>

        {/* Search / Filter Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-faint)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter components..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] hover:text-[var(--ink-primary)] p-0.5"
              aria-label="Clear filter"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-5 custom-scrollbar pr-1 max-h-[calc(100vh-16rem)]">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--ink-muted)]">
            No matching primitives found for &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          filteredCategories.map((category) => {
            const Icon = category.icon
            return (
              <div key={category.id} className="space-y-1.5">
                {/* Category Header */}
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
                  <span>{category.title}</span>
                </div>

                {/* Category Items */}
                <div className="space-y-0.5">
                  {category.items.map((item) => {
                    const isDirectActive = activeId === item.id
                    const isSubActive = item.subItems?.some((sub) => activeId === sub.id)
                    const isActive = isDirectActive || isSubActive

                    return (
                      <div key={item.id} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleScrollTo(item.id)}
                          className={`group relative w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? 'text-[var(--ink-primary)] font-medium bg-[var(--bg-subtle)]'
                              : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]/60'
                          }`}
                        >
                          {/* Active Indicator Left Bar */}
                          {isActive && (
                            <motion.span
                              layoutId={`active-nav-indicator-${layoutIdPrefix}`}
                              className="absolute left-0 top-1 bottom-1 w-1 bg-[var(--ink-primary)] rounded-r-full"
                              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                            />
                          )}

                          <span className="truncate pr-1">{item.title}</span>

                          {item.badge && (
                            <span
                              className={`ml-auto font-mono text-[9px] px-1.5 py-0.2 rounded border transition-colors ${
                                isActive
                                  ? 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)]'
                                  : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Sub-items (e.g. Card Suite details) */}
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="pl-3.5 ml-2 border-l border-[var(--border-subtle)] space-y-0.5 mt-1 pt-0.5">
                            {item.subItems.map((sub) => {
                              const isSubItemActive = activeId === sub.id
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => handleScrollTo(sub.id)}
                                  className={`group flex items-center justify-between w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                                    isSubItemActive
                                      ? 'text-[var(--ink-primary)] font-medium bg-[var(--bg-subtle)]'
                                      : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]/50'
                                  }`}
                                >
                                  <span className="truncate">{sub.title}</span>
                                  {sub.badge && (
                                    <span className="font-mono text-[8.5px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)]">
                                      {sub.badge}
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Sidebar Footer Actions */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' })
            setActiveId('sec-buttons')
          }}
          className="flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors py-1 px-1.5 rounded"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px]">Back to Top</span>
        </button>

        <span className="font-mono text-[10px] text-[var(--ink-faint)]">
          Monochrome v2.4
        </span>
      </div>
    </nav>
  )
}
