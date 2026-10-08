import React, { useState, useEffect, useRef, useId, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, ChevronDown, Check, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface SearchScope {
  id: string
  label: string
  icon?: React.ReactNode
}

export interface OmniSearchProps {
  id?: string
  /**
   * Expansion width mode:
   * - 'fixed': Expands to a predetermined width (default `w-72 sm:w-80` or `expandedWidth`)
   * - 'responsive': Expands to fill available width (`w-full flex-1`)
   */
  expandMode?: 'fixed' | 'responsive'
  /** Custom width classes when expanded (applicable for 'fixed' mode or custom responsive caps) */
  expandedWidth?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Controlled query value */
  value?: string
  /** Default uncontrolled query */
  defaultValue?: string
  /** Triggered on text input change */
  onChange?: (val: string) => void
  /** Triggered on Enter keypress */
  onSubmit?: (val: string, scope?: string) => void
  /** Triggered when cleared */
  onClear?: () => void
  /** Triggered when collapsed back to simple icon */
  onCollapse?: () => void
  /** Triggered when expanded */
  onExpand?: () => void
  /** Controlled expansion state */
  isExpanded?: boolean
  /** Default expansion state */
  defaultExpanded?: boolean
  /** Collapse automatically when clicking outside if input is empty (default true) */
  collapseOnBlur?: boolean
  /** Optional compound scope list (as in split-pill) */
  scopes?: SearchScope[]
  /** Controlled active scope */
  activeScope?: string
  /** Default scope if uncontrolled */
  defaultScope?: string
  /** Triggered when scope dropdown selection changes */
  onScopeChange?: (scopeId: string) => void
  /** Typewriter ghost phrases */
  placeholders?: string[]
  /** Keyboard shortcut key (e.g. '/' or 'k') */
  shortcut?: string
  /** Live results count badge */
  resultsCount?: number
  /** Loading spinner */
  isLoading?: boolean
  /** Container custom class name */
  className?: string
  /** Auto-focus on expansion */
  autoFocus?: boolean
  /** Custom class for the simple icon button state */
  iconButtonClassName?: string
  /** Custom class for the expanded container */
  expandedClassName?: string
}

export const OmniSearch: FC<OmniSearchProps> = ({
  id: customId,
  expandMode = 'fixed',
  expandedWidth = 'w-72 sm:w-84',
  size = 'md',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSubmit,
  onClear,
  onCollapse,
  onExpand,
  isExpanded: controlledExpanded,
  defaultExpanded = false,
  collapseOnBlur = true,
  scopes,
  activeScope: controlledScope,
  defaultScope,
  onScopeChange,
  placeholders = [
    "Search 'The Silent Meridian'...",
    "Search 'Baltic Fog telemetry'...",
    "Search 'Elena Rostova'...",
    "Search 'Winter in Kyoto'...",
    "Search by title, author, motif...",
  ],
  shortcut = '/',
  resultsCount,
  isLoading = false,
  className,
  autoFocus = false,
  iconButtonClassName,
  expandedClassName,
}) => {
  const generatedId = useId()
  const instanceId = customId || `omni-${generatedId.replace(/:/g, '')}`

  // Controlled vs Uncontrolled Value
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const query = isControlled ? controlledValue : internalValue

  // Controlled vs Uncontrolled Expansion
  const isExpansionControlled = controlledExpanded !== undefined
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded || Boolean(query) || autoFocus)
  const expanded = isExpansionControlled ? controlledExpanded : internalExpanded

  // Scope State
  const hasScopes = Boolean(scopes && scopes.length > 0)
  const isScopeControlled = controlledScope !== undefined
  const fallbackScope = scopes && scopes.length > 0 ? scopes[0].id : 'all'
  const [internalScope, setInternalScope] = useState(defaultScope || fallbackScope)
  const currentScope = isScopeControlled ? controlledScope : internalScope

  const [isFocused, setIsFocused] = useState(false)
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)

  // Typewriter Ghost Cycle State
  const [typewriterText, setTypewriterText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sizing definitions
  const sizeMap = {
    sm: {
      button: 'h-8 w-8',
      bar: 'h-8 px-2 text-xs',
      icon: 'h-3.5 w-3.5',
      scopeBtn: 'px-2 py-0.5 text-[11px]',
      input: 'text-xs',
      badge: 'text-[9px] px-1.5 py-0.5',
    },
    md: {
      button: 'h-10 w-10',
      bar: 'h-10 px-2.5 text-xs sm:text-sm',
      icon: 'h-4 w-4',
      scopeBtn: 'px-2.5 py-1 text-xs',
      input: 'text-xs sm:text-sm',
      badge: 'text-[10px] px-2 py-0.5',
    },
    lg: {
      button: 'h-12 w-12',
      bar: 'h-12 px-3 text-sm sm:text-base',
      icon: 'h-4.5 w-4.5',
      scopeBtn: 'px-3 py-1.5 text-xs sm:text-sm',
      input: 'text-sm sm:text-base',
      badge: 'text-xs px-2 py-0.5',
    },
  }[size]

  // Expand action
  const handleOpen = () => {
    if (!isExpansionControlled) {
      setInternalExpanded(true)
    }
    onExpand?.()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Collapse action
  const handleClose = () => {
    if (!isExpansionControlled) {
      setInternalExpanded(false)
    }
    setIsFocused(false)
    setScopeDropdownOpen(false)
    onCollapse?.()
    inputRef.current?.blur()
  }

  // Handle global shortcut key (e.g. '/' or 'k')
  useEffect(() => {
    if (!shortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const matchShortcut =
        (shortcut === '/' && e.key === '/') ||
        (shortcut.toLowerCase() === 'k' &&
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === 'k')

      if (matchShortcut) {
        e.preventDefault()
        handleOpen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])

  // Handle outside click dismissal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setScopeDropdownOpen(false)
        if (collapseOnBlur && !query) {
          handleClose()
        }
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [collapseOnBlur, query])

  // Typewriter Ghost Cycle Engine
  useEffect(() => {
    if (!expanded || query) return

    const currentPhrase = placeholders[phraseIndex % placeholders.length]
    const typingSpeed = isDeleting ? 25 : 60
    let pauseTimer: ReturnType<typeof setTimeout> | null = null

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentPhrase.length) {
          setTypewriterText(currentPhrase.slice(0, charIndex + 1))
          setCharIndex((prev) => prev + 1)
        } else {
          // Pause at phrase completion
          pauseTimer = setTimeout(() => setIsDeleting(true), 2200)
        }
      } else {
        if (charIndex > 0) {
          setTypewriterText(currentPhrase.slice(0, charIndex - 1))
          setCharIndex((prev) => prev - 1)
        } else {
          setIsDeleting(false)
          setPhraseIndex((prev) => (prev + 1) % placeholders.length)
        }
      }
    }, typingSpeed)

    return () => {
      clearTimeout(timer)
      if (pauseTimer) clearTimeout(pauseTimer)
    }
  }, [expanded, query, charIndex, isDeleting, phraseIndex, placeholders])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!isControlled) {
      setInternalValue(val)
    }
    onChange?.(val)
  }

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('')
    }
    onChange?.('')
    onClear?.()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit?.(query, hasScopes ? currentScope : undefined)
    } else if (e.key === 'Escape') {
      if (query) {
        handleClear()
      } else {
        handleClose()
      }
    }
  }

  const handleScopeSelect = (scopeId: string) => {
    if (!isScopeControlled) {
      setInternalScope(scopeId)
    }
    onScopeChange?.(scopeId)
    setScopeDropdownOpen(false)
    inputRef.current?.focus()
  }

  const activeScopeObject = scopes?.find((s) => s.id === currentScope) || scopes?.[0]

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-block align-middle select-none',
        expandMode === 'responsive' && expanded && 'w-full flex-1 min-w-0',
        scopeDropdownOpen && 'z-50',
        className
      )}
    >
      <motion.div
        layout
        transition={SPRINGS.snappy}
        className={cn(
          'relative flex items-center rounded-full border transition-colors duration-150',
          !expanded ? 'overflow-hidden' : 'overflow-visible',
          scopeDropdownOpen && 'z-50',
          !expanded
            ? cn(
                sizeMap.button,
                'justify-center border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] hover:shadow-xs cursor-pointer',
                iconButtonClassName
              )
            : cn(
                sizeMap.bar,
                expandMode === 'responsive' ? 'w-full' : expandedWidth,
                isFocused
                  ? 'border-[var(--ink-primary)] bg-[var(--bg-canvas)] shadow-md ring-2 ring-[var(--ink-primary)]/10'
                  : 'border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:border-[var(--ink-primary)]',
                expandedClassName
              )
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {/* COLLAPSED STATE: Simple Icon Trigger */}
          {!expanded ? (
            <motion.button
              key="collapsed-icon-btn"
              type="button"
              onClick={handleOpen}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex h-full w-full items-center justify-center outline-none cursor-pointer rounded-full"
              title={shortcut ? `Search (${shortcut})` : 'Search'}
              aria-label="Open search input"
            >
              <Search className={cn(sizeMap.icon, 'text-current transition-transform active:scale-90')} />
            </motion.button>
          ) : (
            /* EXPANDED STATE: Full Search with Optional Scopes & Typewriter Ghost */
            <motion.div
              key="expanded-bar-content"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center w-full min-w-0 h-full gap-2"
            >
            
            {/* OPTIONAL SCOPE DROPDOWN (Split-Pill compound partition) */}
            {hasScopes && scopes && scopes.length > 0 ? (
              <div ref={scopeRef} className={cn('relative flex items-center flex-shrink-0', scopeDropdownOpen && 'z-50')}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setScopeDropdownOpen((prev) => !prev)
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded-full font-mono font-medium transition-all cursor-pointer outline-none',
                    sizeMap.scopeBtn,
                    scopeDropdownOpen
                      ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                  )}
                  title="Search scope"
                >
                  {activeScopeObject?.icon && (
                    <span className="flex-shrink-0">{activeScopeObject.icon}</span>
                  )}
                  <span className="truncate max-w-[80px] sm:max-w-[110px]">
                    {activeScopeObject?.label || 'All'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 opacity-60 transition-transform duration-150',
                      scopeDropdownOpen && 'rotate-180 opacity-100'
                    )}
                  />
                </button>

                {/* Hairline Divider */}
                <div className="h-4 w-px bg-[var(--border-subtle)] mx-1" />

                {/* Scope Floating Dropdown Menu */}
                <AnimatePresence>
                  {scopeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={SPRINGS.snappy}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-2 z-50 min-w-52 max-w-64 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-2xl ring-1 ring-black/5 select-none"
                    >
                      <div className="px-2.5 py-1 mb-1 border-b border-[var(--border-subtle)] text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                        Select Inquire Scope
                      </div>
                      <div className="space-y-0.5 max-h-64 sm:max-h-80 overflow-y-auto overscroll-contain pr-1">
                        {scopes.map((s) => {
                          const isScopeActive = s.id === currentScope
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleScopeSelect(s.id)
                              }}
                              className={cn(
                                'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left cursor-pointer',
                                isScopeActive
                                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {s.icon && <span>{s.icon}</span>}
                                <span className="truncate">{s.label}</span>
                              </div>
                              {isScopeActive && (
                                <Check className="h-3 w-3 flex-shrink-0 ml-2" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              /* Leading Search Icon when no scopes are provided */
              <div className="flex-shrink-0 flex items-center text-[var(--ink-muted)] pl-0.5">
                <Search className={sizeMap.icon} />
              </div>
            )}

            {/* INPUT + TYPEWRITER GHOST CYCLE CONTAINER */}
            <div className="relative flex-1 min-w-0 h-full flex items-center">
              {/* Typewriter Ghost Placeholder Layer */}
              {!query && (
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none pr-2 font-serif italic transition-opacity duration-150',
                    isFocused ? 'opacity-40 text-[var(--ink-muted)]' : 'opacity-70 text-[var(--ink-muted)]',
                    sizeMap.input
                  )}
                >
                  <span className="truncate">{typewriterText}</span>
                  <span className="font-mono text-xs font-bold text-[var(--ink-primary)] animate-pulse ml-0.5">
                    |
                  </span>
                </div>
              )}

              {/* Functional Search Input */}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                enterKeyHint="search"
                className={cn(
                  'w-full h-full bg-transparent border-none outline-none font-sans text-[var(--ink-primary)] placeholder-transparent',
                  sizeMap.input
                )}
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {/* TRAILING CONTROLS: Results Badge / Loading / Clear & Collapse Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              
              {/* Loading Spinner */}
              {isLoading && (
                <Loader2 className={cn(sizeMap.icon, 'animate-spin text-[var(--ink-muted)]')} />
              )}

              {/* Results Count Badge */}
              {resultsCount !== undefined && resultsCount > 0 && (
                <span
                  className={cn(
                    'rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono text-[var(--ink-secondary)] font-medium leading-none',
                    sizeMap.badge
                  )}
                >
                  {resultsCount}
                </span>
              )}

              {/* Shortcut Kbd Badge (visible when empty and unfocused) */}
              {shortcut && !query && !isFocused && (
                <kbd className="hidden sm:inline-flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--ink-faint)]">
                  {shortcut}
                </kbd>
              )}

              {/* Clear / Collapse Action Button */}
              {query ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSubmit?.(query, hasScopes ? currentScope : undefined)}
                    className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    title="Search (Enter)"
                    aria-label="Submit search"
                  >
                    <ArrowRight className={sizeMap.icon} />
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    title="Clear inquiry"
                    aria-label="Clear search input"
                  >
                    <X className={sizeMap.icon} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  title="Collapse search"
                  aria-label="Collapse search to icon"
                >
                  <X className={sizeMap.icon} />
                </button>
              )}
            </div>

          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
export default OmniSearch
