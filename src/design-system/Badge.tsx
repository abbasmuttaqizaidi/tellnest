import React from 'react'
import { cn } from '../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'subtle' | 'completed' | 'ongoing' | 'draft'
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-mono font-medium uppercase tracking-wider rounded'

  const sizeStyles = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-[10px] px-2 py-0.5',
  }[size]

  const variantStyles = {
    default: 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]',
    outline: 'border border-[var(--border-subtle)] text-[var(--ink-secondary)] bg-[var(--bg-surface)]',
    subtle: 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)]',
    completed: 'bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-800/30',
    ongoing: 'bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-800/30',
    draft: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border border-stone-500/30',
  }[variant]

  return (
    <span className={cn(base, sizeStyles, variantStyles, className)} {...props}>
      {children}
    </span>
  )
}
