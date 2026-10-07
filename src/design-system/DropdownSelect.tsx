'use client'

import React, { useState, useRef, useEffect, useId, type FC } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../lib/utils'

export interface SelectOption {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface DropdownSelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string, option: SelectOption) => void
  placeholder?: string
  label?: string
  helperText?: string
  error?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const DropdownSelect: FC<DropdownSelectProps> = ({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select an option...',
  label,
  helperText,
  error,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue || options[0]?.id || ''
  )
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const uniqueId = useId()

  const isControlled = controlledValue !== undefined
  const activeValue = isControlled ? controlledValue : internalValue
  const selectedOption = options.find((opt) => opt.id === activeValue)

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

  const handleSelect = (option: SelectOption) => {
    if (option.disabled || disabled) return
    if (!isControlled) {
      setInternalValue(option.id)
    }
    onChange?.(option.id, option)
    setIsOpen(false)
  }

  // Keyboard navigation within menu
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen((prev) => !prev)
    }
  }

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) return
    const currentIndex = options.findIndex((opt) => opt.id === activeValue)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = (currentIndex + 1) % options.length
      handleSelect(options[nextIndex])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = (currentIndex - 1 + options.length) % options.length
      handleSelect(options[prevIndex])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs rounded-lg',
    md: 'px-3.5 py-2.5 text-sm rounded-xl',
    lg: 'px-4 py-3 text-base rounded-xl',
  }[size]

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

      {/* Trigger Button */}
      <div className="relative">
        <button
          id={uniqueId}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={handleTriggerKeyDown}
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
          <div className="flex items-center gap-2.5 truncate min-w-0">
            {selectedOption?.icon && (
              <span className="flex-shrink-0 text-[var(--ink-muted)]">
                {selectedOption.icon}
              </span>
            )}
            <span
              className={cn(
                'truncate font-medium',
                !selectedOption && 'text-[var(--ink-muted)]'
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[var(--ink-muted)] transition-transform duration-200',
              isOpen && 'rotate-180 text-[var(--ink-primary)]'
            )}
          />
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="listbox"
              tabIndex={-1}
              onKeyDown={handleListKeyDown}
              className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-xl focus:outline-none"
            >
              {options.length === 0 ? (
                <div className="p-3 text-center text-xs font-mono text-[var(--ink-muted)]">
                  No options available
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = option.id === activeValue
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer select-none',
                        isSelected
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
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
                          <span className="truncate">{option.label}</span>
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

export default DropdownSelect
