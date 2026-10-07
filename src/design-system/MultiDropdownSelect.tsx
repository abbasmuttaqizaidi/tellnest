'use client'

import React, { useState, useRef, useEffect, useId, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '../lib/utils'

export interface MultiSelectOption {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface MultiDropdownSelectProps {
  options: MultiSelectOption[]
  selectedValues?: string[]
  defaultValues?: string[]
  onChange?: (selectedValues: string[], selectedOptions: MultiSelectOption[]) => void
  placeholder?: string
  label?: string
  helperText?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const MultiDropdownSelect: FC<MultiDropdownSelectProps> = ({
  options,
  selectedValues: controlledSelectedValues,
  defaultValues = [],
  onChange,
  placeholder = 'Select options...',
  label,
  helperText,
  error,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const [internalValues, setInternalValues] = useState<string[]>(defaultValues)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()

  const isControlled = controlledSelectedValues !== undefined
  const activeValues = isControlled ? controlledSelectedValues : internalValues
  const selectedOptions = options.filter((opt) => activeValues.includes(opt.id))

  // Close on outside click
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

  const toggleOption = (option: MultiSelectOption) => {
    if (option.disabled || disabled) return
    const isAlreadySelected = activeValues.includes(option.id)
    const newValues = isAlreadySelected
      ? activeValues.filter((id) => id !== option.id)
      : [...activeValues, option.id]

    if (!isControlled) {
      setInternalValues(newValues)
    }
    const newOptions = options.filter((opt) => newValues.includes(opt.id))
    onChange?.(newValues, newOptions)
  }

  const removeOption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValues = activeValues.filter((v) => v !== id)
    if (!isControlled) {
      setInternalValues(newValues)
    }
    const newOptions = options.filter((opt) => newValues.includes(opt.id))
    onChange?.(newValues, newOptions)
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 min-h-[36px] text-xs rounded-lg',
    md: 'px-3.5 py-2 min-h-[42px] text-sm rounded-xl',
    lg: 'px-4 py-2.5 min-h-[48px] text-base rounded-xl',
  }[size]

  return (
    <div ref={containerRef} className={cn('relative w-full space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={uniqueId}
            className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]"
          >
            {label}
          </label>
          <span className="text-[10px] font-mono text-[var(--ink-faint)]">
            {activeValues.length} selected
          </span>
        </div>
      )}

      {/* Trigger Area */}
      <div className="relative">
        <button
          id={uniqueId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'flex w-full items-center justify-between gap-2 border text-left font-sans transition-all duration-150 select-none cursor-pointer',
            sizeClasses,
            'bg-[var(--bg-canvas)] text-[var(--ink-primary)]',
            isOpen
              ? 'border-[var(--ink-primary)] ring-1 ring-[var(--ink-primary)]'
              : error
              ? 'border-rose-500'
              : 'border-[var(--border-strong)] hover:border-[var(--ink-primary)]',
            disabled && 'opacity-50 cursor-not-allowed bg-[var(--bg-subtle)]'
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-1">
            {selectedOptions.length === 0 ? (
              <span className="text-xs text-[var(--ink-muted)] truncate font-sans">
                {placeholder}
              </span>
            ) : (
              selectedOptions.map((opt) => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-[11px] font-mono leading-tight"
                >
                  <span className="truncate max-w-[120px]">{opt.label}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeOption(opt.id, e)}
                    className="hover:opacity-75 cursor-pointer ml-0.5 inline-flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))
            )}
          </div>

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform duration-200 ml-1',
              isOpen && 'rotate-180 text-[var(--ink-primary)]'
            )}
          />
        </button>

        {/* Multi-Select Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="listbox"
              tabIndex={-1}
              className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-xl focus:outline-none custom-scrollbar"
            >
              {options.length === 0 ? (
                <div className="p-3 text-center text-xs font-mono text-[var(--ink-muted)]">
                  No options available
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = activeValues.includes(option.id)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => toggleOption(option)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-medium'
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]',
                        option.disabled &&
                          'opacity-40 cursor-not-allowed hover:bg-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0">
                        {/* Checkbox box indicator */}
                        <div
                          className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-[var(--ink-primary)] border-[var(--ink-primary)] text-[var(--accent-contrast)]'
                              : 'border-[var(--border-strong)] bg-[var(--bg-canvas)]'
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{option.label}</span>
                          {option.description && (
                            <span className="text-[10px] text-[var(--ink-muted)] truncate">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>
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

export default MultiDropdownSelect
