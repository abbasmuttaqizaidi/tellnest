import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  side?: 'left' | 'right' | 'bottom'
  title?: string
  children: React.ReactNode
  className?: string
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  side = 'right',
  title,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const initialAnimation = {
    right: { x: '100%' },
    left: { x: '-100%' },
    bottom: { y: '100%' },
  }[side]

  const sideClasses = {
    right: 'inset-y-0 right-0 w-full max-w-md border-l',
    left: 'inset-y-0 left-0 w-full max-w-md border-r',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t',
  }[side]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={initialAnimation}
            animate={{ x: 0, y: 0 }}
            exit={initialAnimation}
            transition={SPRINGS.smooth}
            className={cn(
              'fixed flex flex-col bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-2xl font-sans',
              sideClasses,
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
              {title ? (
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  {title}
                </h3>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
