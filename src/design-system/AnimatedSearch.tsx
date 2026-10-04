import React, { useState, useRef, useEffect, useId, type FC } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import {
  Search,
  X,
  Loader2,
  ChevronDown,
  Sparkles,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export type AnimatedSearchVariant =
  | 'expandable'
  | 'spotlight'
  | 'pill'
  | 'minimal'
  | 'split-pill'
  | 'typewriter'
  | 'curtain-reveal'

export type AnimatedSearchSize = 'sm' | 'md' | 'lg'

export interface SearchScope {
  id: string
  label: string
}

export interface AnimatedSearchProps {
  variant?: AnimatedSearchVariant
  size?: AnimatedSearchSize
  value?: string
  defaultValue?: string
  onChange?: (val: string) => void
  onSubmit?: (val: string) => void
  onClear?: () => void
  placeholder?: string
  shortcut?: string // e.g. '/' or 'k' for Cmd+K
  resultsCount?: number
  isLoading?: boolean
  className?: string
  autoFocus?: boolean
  expandedWidth?: string
  badge?: string | React.ReactNode

  // Split-pill variant props
  scopes?: SearchScope[]
  activeScope?: string
  defaultScope?: string
  onScopeChange?: (scopeId: string) => void

  // Typewriter variant props
  placeholders?: string[]

  // Curtain-reveal variant props
  suggestions?: string[]
  onSelectSuggestion?: (suggestion: string) => void
}

export const AnimatedSearch: FC<AnimatedSearchProps> = ({
  variant = 'pill',
  size = 'md',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search manuscripts, essays, authors...',
  shortcut = '/',
  resultsCount,
  isLoading = false,
  className,
  autoFocus = false,
  expandedWidth = 'w-72 sm:w-80',
  badge,
  scopes = [
    { id: 'all', label: 'All Catalog' },
    { id: 'novels', label: 'Novels' },
    { id: 'essays', label: 'Essays' },
    { id: 'authors', label: 'Writers' },
  ],
  activeScope: controlledScope,
  defaultScope = 'all',
  onScopeChange,
  placeholders = [
    "Search 'The Silent Meridian'...",
    "Search 'An Inventory of Baltic Fog'...",
    "Search 'Elena Rostova'...",
    "Search 'Cold War telemetry'...",
    "Search 'A Winter in Kyoto'...",
  ],
  suggestions = [
    '✨ Editor’s Picks',
    '📖 Serialized Novels',
    '✍️ Elena Rostova',
    '☕ 15-Min Reads',
    '🏔️ Nordic Noir',
  ],
  onSelectSuggestion,
}) => {
  const isControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const query = isControlled ? controlledValue : internalValue

  const isScopeControlled = controlledScope !== undefined
  const [internalScope, setInternalScope] = useState(defaultScope)
  const currentScope = isScopeControlled ? controlledScope : internalScope

  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(Boolean(query) || autoFocus)
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()

  // Typewriter State Machine
  const [typewriterText, setTypewriterText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

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
        setIsExpanded(true)
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcut])

  // Handle outside click dismissal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setScopeDropdownOpen(false)
        if (variant === 'expandable' && !query) {
          setIsExpanded(false)
          setIsFocused(false)
          inputRef.current?.blur()
        }
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [variant, query])

  // Typewriter effect ticker
  useEffect(() => {
    if (variant !== 'typewriter' || isFocused || query) return

    const currentPhrase = placeholders[phraseIndex % placeholders.length]
    const typingSpeed = isDeleting ? 30 : 65
    let pauseTimer: ReturnType<typeof setTimeout> | null = null

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentPhrase.length) {
          setTypewriterText(currentPhrase.slice(0, charIndex + 1))
          setCharIndex((prev) => prev + 1)
        } else {
          // Pause at end of word
          pauseTimer = setTimeout(() => setIsDeleting(true), 1800)
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
  }, [variant, isFocused, query, charIndex, isDeleting, phraseIndex, placeholders])

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
      onSubmit?.(query)
    } else if (e.key === 'Escape') {
      if (query) {
        handleClear()
      } else {
        inputRef.current?.blur()
        setIsFocused(false)
        setScopeDropdownOpen(false)
        if (variant === 'expandable') {
          setIsExpanded(false)
        }
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

  const handleSuggestionClick = (text: string) => {
    const cleanText = text.replace(/^[^\w\s]+/, '').trim()
    if (!isControlled) {
      setInternalValue(cleanText)
    }
    onChange?.(cleanText)
    onSelectSuggestion?.(cleanText)
    inputRef.current?.focus()
  }

  // Size styles
  const sizeStyles = {
    sm: {
      height: 'h-8',
      text: 'text-xs',
      iconSize: 'h-3.5 w-3.5',
      padding: 'px-2.5 py-1',
      badge: 'text-[9px] px-1 py-0.2',
    },
    md: {
      height: 'h-9.5',
      text: 'text-xs sm:text-sm',
      iconSize: 'h-4 w-4',
      padding: 'px-3.5 py-1.5',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    lg: {
      height: 'h-12',
      text: 'text-sm sm:text-base',
      iconSize: 'h-5 w-5',
      padding: 'px-4.5 py-2.5',
      badge: 'text-xs px-2 py-0.5',
    },
  }[size]

  // ==========================================
  // VARIANT 1: EXPANDABLE MORPHING PILL
  // ==========================================
  if (variant === 'expandable') {
    const isExpandedNow = isExpanded || Boolean(query)

    return (
      <MotionConfig transition={SPRINGS.snappy}>
        <motion.div
          ref={containerRef}
          layout
          onClick={() => {
            if (!isExpandedNow) {
              setIsExpanded(true)
              inputRef.current?.focus()
            }
          }}
          className={cn(
            'relative flex items-center rounded-full border bg-[var(--bg-surface)] overflow-hidden transition-colors cursor-pointer select-none',
            isFocused || isExpandedNow
              ? 'border-[var(--ink-primary)] shadow-sm'
              : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
            isExpandedNow ? expandedWidth : 'w-28 sm:w-36',
            sizeStyles.height,
            className
          )}
        >
          <span className="pl-3 pr-1 flex items-center justify-center text-[var(--ink-muted)] flex-shrink-0">
            {isLoading ? (
              <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin text-[var(--ink-muted)]')} />
            ) : (
              <Search className={cn(sizeStyles.iconSize, isFocused && 'text-[var(--ink-primary)]')} />
            )}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              setIsFocused(true)
              setIsExpanded(true)
            }}
            onBlur={() => {
              setIsFocused(false)
              if (!query) setIsExpanded(false)
            }}
            onKeyDown={handleKeyDown}
            placeholder={isExpandedNow ? placeholder : 'Search...'}
            className={cn(
              'w-full bg-transparent px-2 text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none font-sans',
              sizeStyles.text,
              !isExpandedNow && 'cursor-pointer'
            )}
          />

          <div className="pr-2.5 flex items-center gap-1.5 flex-shrink-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {query ? (
                <motion.button
                  key="clear-btn"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              ) : isExpandedNow ? (
                <motion.kbd
                  key="esc-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsExpanded(false)
                    inputRef.current?.blur()
                  }}
                  className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 cursor-pointer"
                >
                  Esc
                </motion.kbd>
              ) : shortcut ? (
                <motion.kbd
                  key="shortcut-badge"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden sm:inline-flex items-center font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5"
                >
                  {shortcut}
                </motion.kbd>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    )
  }

  // ==========================================
  // VARIANT 5: SPLIT-PILL (COMPOUND SCOPED SEARCH)
  // ==========================================
  if (variant === 'split-pill') {
    const activeScopeItem = scopes.find((s) => s.id === currentScope) || scopes[0]

    return (
      <MotionConfig transition={SPRINGS.snappy}>
        <div ref={containerRef} className={cn('relative inline-flex items-center font-sans', className)}>
          <div
            className={cn(
              'relative flex items-center rounded-full border bg-[var(--bg-surface)] transition-all',
              isFocused
                ? 'border-[var(--ink-primary)] shadow-sm'
                : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
              sizeStyles.height
            )}
          >
            {/* Left Search Segment */}
            <div className="flex items-center pl-3.5 pr-2 flex-1 min-w-[12rem] sm:min-w-[15rem]">
              <span className="text-[var(--ink-muted)] mr-2 flex-shrink-0">
                {isLoading ? (
                  <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin')} />
                ) : (
                  <Search className={cn(sizeStyles.iconSize, isFocused && 'text-[var(--ink-primary)]')} />
                )}
              </span>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn(
                  'w-full bg-transparent text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none font-sans',
                  sizeStyles.text
                )}
              />

              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Split Divider */}
            <div className="h-4 w-[1px] bg-[var(--border-subtle)] flex-shrink-0" />

            {/* Right Scope Selector Segment */}
            <div ref={scopeRef} className="relative pr-1.5 pl-1 flex-shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setScopeDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] px-2.5 py-1 text-[11px] font-mono font-medium text-[var(--ink-secondary)] transition-colors cursor-pointer select-none"
              >
                <span>{activeScopeItem?.label}</span>
                <ChevronDown className={cn('h-3 w-3 transition-transform', scopeDropdownOpen && 'rotate-180')} />
              </motion.button>

              {/* Scope Dropdown Menu */}
              <AnimatePresence>
                {scopeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    className="absolute right-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-xl text-xs font-mono"
                  >
                    {scopes.map((s) => {
                      const isSelected = s.id === currentScope
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleScopeSelect(s.id)}
                          className={cn(
                            'w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between',
                            isSelected
                              ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                          )}
                        >
                          <span>{s.label}</span>
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-contrast)]" />}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </MotionConfig>
    )
  }

  // ==========================================
  // VARIANT 6: TYPEWRITER (LITERARY GHOST CYCLE)
  // ==========================================
  if (variant === 'typewriter') {
    return (
      <MotionConfig transition={SPRINGS.smooth}>
        <motion.div
          ref={containerRef}
          animate={{
            scale: isFocused ? 1.01 : 1,
            boxShadow: isFocused
              ? '0 0 0 3px rgba(1, 6, 17, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
              : '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
          className={cn(
            'relative flex items-center rounded-full border bg-[var(--bg-surface)] transition-all',
            isFocused
              ? 'border-[var(--ink-primary)]'
              : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
            sizeStyles.height,
            className
          )}
        >
          <span className="pl-3.5 pr-2 flex items-center justify-center text-[var(--ink-muted)] flex-shrink-0">
            {isLoading ? (
              <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin')} />
            ) : (
              <Search className={cn(sizeStyles.iconSize, isFocused && 'text-[var(--ink-primary)]')} />
            )}
          </span>

          <div className="relative flex-1 flex items-center min-w-0">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full bg-transparent text-[var(--ink-primary)] focus:outline-none font-sans z-10',
                sizeStyles.text
              )}
            />

            {/* Typewriter Ghost Placeholder & Monospace Blinking Caret */}
            {!query && (
              <div
                onClick={() => inputRef.current?.focus()}
                className={cn(
                  'absolute inset-0 flex items-center pointer-events-none select-none text-[var(--ink-muted)] font-serif italic',
                  sizeStyles.text
                )}
              >
                {isFocused ? (
                  <span className="text-[var(--ink-faint)]">{placeholder}</span>
                ) : (
                  <div className="flex items-center">
                    <span>{typewriterText}</span>
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      className="inline-block w-[1.5px] h-3.5 bg-[var(--ink-primary)] ml-0.5"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pr-3 flex items-center gap-1.5 flex-shrink-0">
            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              shortcut && (
                <kbd className="hidden sm:inline-flex items-center font-mono text-[9px] text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                  {shortcut}
                </kbd>
              )
            )}
          </div>
        </motion.div>
      </MotionConfig>
    )
  }

  // ==========================================
  // VARIANT 7: CURTAIN-REVEAL (QUICK JUMP CHIPS)
  // ==========================================
  if (variant === 'curtain-reveal') {
    return (
      <MotionConfig transition={SPRINGS.smooth}>
        <div ref={containerRef} className={cn('relative flex flex-col font-sans', className)}>
          <motion.div
            animate={{
              boxShadow: isFocused
                ? '0 8px 24px -4px rgba(0, 0, 0, 0.08)'
                : '0 1px 2px rgba(0, 0, 0, 0.04)',
            }}
            className={cn(
              'relative flex items-center rounded-2xl border bg-[var(--bg-surface)] transition-all',
              isFocused ? 'border-[var(--ink-primary)]' : 'border-[var(--border-subtle)]',
              sizeStyles.height
            )}
          >
            <span className="pl-3.5 pr-2 flex items-center justify-center text-[var(--ink-muted)] flex-shrink-0">
              {isLoading ? (
                <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin')} />
              ) : (
                <Search className={cn(sizeStyles.iconSize, isFocused && 'text-[var(--ink-primary)]')} />
              )}
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'w-full bg-transparent px-1 text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none font-sans',
                sizeStyles.text
              )}
            />

            <div className="pr-3 flex items-center gap-1.5 flex-shrink-0">
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Curtain Reveal Suggestions */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -4 }}
                transition={SPRINGS.snappy}
                className="overflow-hidden pt-2"
              >
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs">
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)] mr-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Quick Query:
                  </span>
                  {suggestions.map((suggestion) => (
                    <motion.button
                      key={suggestion}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--ink-primary)] hover:text-[var(--accent-contrast)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      {suggestion}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    )
  }

  // ==========================================
  // VARIANT 2: SPOTLIGHT ISLAND (ELEVATED)
  // ==========================================
  if (variant === 'spotlight') {
    return (
      <MotionConfig transition={SPRINGS.smooth}>
        <motion.div
          ref={containerRef}
          animate={{
            scale: isFocused ? 1.01 : 1,
            boxShadow: isFocused
              ? '0 12px 32px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.08)'
              : '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
          className={cn(
            'relative flex items-center rounded-2xl border transition-colors bg-[var(--bg-surface)] backdrop-blur-md',
            isFocused ? 'border-[var(--ink-primary)]' : 'border-[var(--border-subtle)]',
            sizeStyles.height,
            className
          )}
        >
          <div className="pl-3.5 pr-1 flex items-center gap-2 flex-shrink-0">
            {isLoading ? (
              <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin text-[var(--ink-muted)]')} />
            ) : (
              <Search className={cn(sizeStyles.iconSize, isFocused ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]')} />
            )}

            {badge && (
              <span className="hidden sm:inline-flex items-center font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]">
                {badge}
              </span>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              'w-full bg-transparent px-2 text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none font-sans',
              sizeStyles.text
            )}
          />

          <div className="pr-3 flex items-center gap-2 flex-shrink-0">
            {resultsCount !== undefined && query && (
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('font-mono font-medium rounded-full bg-[var(--bg-subtle)] text-[var(--ink-muted)]', sizeStyles.badge)}
              >
                {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
              </motion.span>
            )}

            {query ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              shortcut && (
                <kbd className="hidden sm:inline-flex items-center font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5">
                  {shortcut}
                </kbd>
              )
            )}
          </div>
        </motion.div>
      </MotionConfig>
    )
  }

  // ==========================================
  // VARIANT 3: MINIMAL (EDITORIAL UNDERLINE)
  // ==========================================
  if (variant === 'minimal') {
    return (
      <div ref={containerRef} className={cn('relative flex flex-col font-sans', className)}>
        <div className={cn('flex items-center gap-2.5 pb-2 text-[var(--ink-primary)]', sizeStyles.text)}>
          <Search className={cn(sizeStyles.iconSize, isFocused ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]')} />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="w-full bg-transparent placeholder-[var(--ink-muted)] focus:outline-none font-serif text-base sm:text-lg italic"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {shortcut && !query && (
            <kbd className="font-mono text-[10px] text-[var(--ink-muted)]">
              [{shortcut}]
            </kbd>
          )}
        </div>

        <div className="relative h-[1.5px] w-full bg-[var(--border-subtle)] overflow-hidden">
          <motion.div
            initial={false}
            animate={{
              scaleX: isFocused ? 1 : 0,
              opacity: isFocused ? 1 : 0,
            }}
            transition={SPRINGS.smooth}
            className="absolute inset-0 bg-[var(--ink-primary)] origin-center"
          />
        </div>
      </div>
    )
  }

  // ==========================================
  // VARIANT 4: PILL (DEFAULT DOCKED CAPSULE)
  // ==========================================
  return (
    <MotionConfig transition={SPRINGS.snappy}>
      <motion.div
        ref={containerRef}
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        className={cn(
          'relative flex items-center rounded-full border transition-all bg-[var(--bg-surface)]',
          isFocused
            ? 'border-[var(--ink-primary)] shadow-sm'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
          sizeStyles.height,
          className
        )}
      >
        <span className="pl-3.5 pr-1 flex items-center justify-center text-[var(--ink-muted)] flex-shrink-0">
          {isLoading ? (
            <Loader2 className={cn(sizeStyles.iconSize, 'animate-spin text-[var(--ink-muted)]')} />
          ) : (
            <Search className={cn(sizeStyles.iconSize, isFocused && 'text-[var(--ink-primary)]')} />
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full bg-transparent px-2.5 text-[var(--ink-primary)] placeholder-[var(--ink-muted)] focus:outline-none font-sans',
            sizeStyles.text
          )}
        />

        <div className="pr-2.5 flex items-center gap-1.5 flex-shrink-0">
          {resultsCount !== undefined && query && (
            <span className={cn('font-mono rounded-full bg-[var(--bg-subtle)] text-[var(--ink-muted)]', sizeStyles.badge)}>
              {resultsCount}
            </span>
          )}

          {query ? (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-[var(--ink-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </motion.button>
          ) : (
            shortcut && (
              <kbd className="hidden sm:inline-flex items-center font-mono text-[9px] text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 select-none">
                {shortcut}
              </kbd>
            )
          )}
        </div>
      </motion.div>
    </MotionConfig>
  )
}
