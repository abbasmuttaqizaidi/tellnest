'use client'

import React, { useState, useRef, useEffect, useId, useMemo, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '../lib/utils'

export interface ComboboxOption {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
  badge?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string, option?: ComboboxOption) => void
  placeholder?: string
  label?: string
  helperText?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  clearable?: boolean
  autoHighlightFirst?: boolean
  icon?: React.ReactNode
}

/**
 * HatchPen Combobox Component
 * Elegant single-select combobox with inline search, keyboard navigation,
 * and zero chips/tags. Seamlessly integrates with the Hatchpen literary theme.
 */
export const Combobox: FC<ComboboxProps> = ({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select or search...',
  label,
  helperText,
  error,
  disabled = false,
  className = '',
  size = 'md',
  clearable = false,
  autoHighlightFirst = true,
  icon,
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue || options[0]?.id || ''
  )
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()

  const isControlled = controlledValue !== undefined
  const activeValue = isControlled ? controlledValue : internalValue

  // Currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === activeValue || opt.label === activeValue),
    [options, activeValue]
  )

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    )
  }, [options, searchQuery])

  // Sync input text when selectedOption changes or dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setHighlightedIndex(-1)
    } else {
      // Find initial highlighted index matching active selection
      const activeIdx = filteredOptions.findIndex(
        (opt) => opt.id === activeValue || opt.label === activeValue
      )
      setHighlightedIndex(activeIdx >= 0 ? activeIdx : autoHighlightFirst ? 0 : -1)
    }
  }, [isOpen, activeValue, autoHighlightFirst, filteredOptions])

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', handleClickOutside, true)
    document.addEventListener('touchstart', handleClickOutside, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]')
      const target = items[highlightedIndex] as HTMLElement
      if (target) {
        target.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (option: ComboboxOption) => {
    if (option.disabled || disabled) return
    if (!isControlled) {
      setInternalValue(option.id)
    }
    onChange?.(option.id, option)
    setIsOpen(false)
    setSearchQuery('')
    inputRef.current?.blur()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isControlled) {
      setInternalValue('')
    }
    onChange?.('', undefined)
    setSearchQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredOptions.length === 0) return
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filteredOptions.length === 0) return
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (
        isOpen &&
        highlightedIndex >= 0 &&
        highlightedIndex < filteredOptions.length
      ) {
        handleSelect(filteredOptions[highlightedIndex])
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg',
    md: 'px-3.5 py-2.5 text-sm rounded-xl',
    lg: 'px-4 py-3 text-base rounded-xl',
  }[size]

  const displayInputValue = isOpen
    ? searchQuery
    : selectedOption?.label || ''

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={uniqueId}
          className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]"
        >
          {label}
        </label>
      )}

      {/* Input container */}
      <div
        className={cn(
          'relative flex items-center border transition-all duration-150',
          sizeClasses,
          'bg-[var(--bg-canvas)] text-[var(--ink-primary)]',
          isOpen
            ? 'border-[var(--ink-primary)] ring-1 ring-[var(--ink-primary)]'
            : error
            ? 'border-rose-500'
            : 'border-[var(--border-strong)] hover:border-[var(--ink-primary)]',
          disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-subtle)]'
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true)
            inputRef.current?.focus()
          }
        }}
      >
        {/* Leading Icon / Search Icon */}
        <div className="mr-2 flex shrink-0 items-center text-[var(--ink-muted)]">
          {icon || <Search className="h-3.5 w-3.5 stroke-[1.75]" />}
        </div>

        {/* Text Input */}
        <input
          id={uniqueId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayInputValue}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            if (!disabled) setIsOpen(true)
          }}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
            setHighlightedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          className="w-full bg-transparent p-0 text-inherit font-sans placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-0 truncate"
        />

        {/* Action icons: Clear button & Chevron */}
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] rounded transition-colors"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform duration-200 pointer-events-none',
              isOpen && 'rotate-180 text-[var(--ink-primary)]'
            )}
          />
        </div>

        {/* Dropdown Options Popover */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={listRef}
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="listbox"
              tabIndex={-1}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-xl focus:outline-none"
            >
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs font-mono text-[var(--ink-muted)]">
                  {searchQuery ? `No matching options for "${searchQuery}"` : 'No options available'}
                </div>
              ) : (
                filteredOptions.map((option, idx) => {
                  const isSelected =
                    option.id === activeValue || option.label === activeValue
                  const isHighlighted = idx === highlightedIndex

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(option)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
                          : isHighlighted
                          ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]',
                        option.disabled &&
                          'opacity-40 cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {option.icon && (
                          <span
                            className={cn(
                              'flex-shrink-0',
                              isSelected
                                ? 'text-[var(--accent-contrast)]'
                                : 'text-[var(--ink-muted)]'
                            )}
                          >
                            {option.icon}
                          </span>
                        )}
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{option.label}</span>
                            {option.badge && (
                              <span
                                className={cn(
                                  'font-mono text-[9px] uppercase px-1.5 py-0.5 rounded',
                                  isSelected
                                    ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                                    : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)]'
                                )}
                              >
                                {option.badge}
                              </span>
                            )}
                          </div>
                          {option.description && (
                            <span
                              className={cn(
                                'text-[10px] truncate',
                                isSelected
                                  ? 'text-[var(--accent-contrast)]/80'
                                  : 'text-[var(--ink-muted)]'
                              )}
                            >
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                      )}
                    </button>
                  )
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {helperText && !error && (
        <p className="text-[11px] font-mono text-[var(--ink-muted)]">
          {helperText}
        </p>
      )}

      {error && (
        <p className="text-[11px] font-mono text-rose-500">{error}</p>
      )}
    </div>
  )
}

export default Combobox
