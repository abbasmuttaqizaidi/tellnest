import React, { useState, useMemo, type FC, type ChangeEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '../lib/utils'

export interface TactileSliderProps {
  value?: number
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  unit?: string
  label?: string
  onChange?: (value: number) => void
  className?: string
}

export const TactileSlider: FC<TactileSliderProps> = ({
  value: controlledValue,
  min = 12,
  max = 32,
  step = 1,
  defaultValue = 18,
  unit = 'px',
  label,
  onChange,
  className,
}) => {
  const [internalValue, setInternalValue] = useState<number>(defaultValue)
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const percentage = useMemo(() => {
    return Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100))
  }, [currentValue, min, max])

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (!isControlled) {
      setInternalValue(val)
    }
    onChange?.(val)
  }

  return (
    <div className={cn('w-full font-sans select-none space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
            {label}
          </span>
          <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
            {currentValue}
            {unit}
          </span>
        </div>
      )}

      <div
        className="relative flex h-8 w-full items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Track Background */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--border-subtle)]">
          {/* Active Fill Track */}
          <div
            className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Floating Bubble Tooltip */}
        <AnimatePresence>
          {(isHovered || isFocused) && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.9 }}
              animate={{ opacity: 1, y: -24, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded bg-[var(--ink-primary)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-contrast)] shadow-md"
              style={{ left: `${percentage}%` }}
            >
              {currentValue}
              {unit}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real Native Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleSliderChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        {/* Visible Tactile Thumb */}
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 h-4.5 w-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--ink-primary)] shadow-md transition-transform duration-100',
            isHovered || isFocused ? 'scale-125' : 'scale-100'
          )}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
