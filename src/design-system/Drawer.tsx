import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  bodyClassName?: string
  headerClassName?: string
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  side = 'right',
  title,
  children,
  className,
  bodyClassName,
  headerClassName,
}) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow
      const originalHtmlOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
      }
    }
  }, [isOpen])

  const initialAnimation = {
    right: { x: '100%' },
    left: { x: '-100%' },
    bottom: { y: '100%' },
  }[side]

  const sideClasses = {
    right: 'inset-y-0 right-0 w-full max-w-md border-l rounded-l-2xl sm:rounded-l-3xl overflow-hidden',
    left: 'inset-y-0 left-0 w-full max-w-md border-r rounded-r-2xl sm:rounded-r-3xl overflow-hidden',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl sm:rounded-t-3xl border-t overflow-hidden',
  }[side]

  const drawerContent = (
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
            <div className={cn('flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--border-subtle)]', headerClassName)}>
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
                className="rounded-full p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className={cn('flex-1 overflow-y-auto p-3.5 sm:p-4', bodyClassName)}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  if (!mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(drawerContent, document.body)
}
