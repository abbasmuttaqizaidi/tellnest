import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  bodyClassName?: string
  showCloseButton?: boolean
  closeOnBackdropClick?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
  bodyClassName,
  showCloseButton = true,
  closeOnBackdropClick = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && closeOnBackdropClick) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, closeOnBackdropClick])

  // Lock background scroll on both desktop (html + body + wheel) and mobile
  useEffect(() => {
    if (!isOpen) return

    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // Prevent background wheel and touch scrolling on desktop and mobile outside scrollable modal
    const preventBackdropScroll = (e: WheelEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('.modal-scrollable-content')) {
        return
      }
      e.preventDefault()
    }

    window.addEventListener('wheel', preventBackdropScroll, { passive: false })
    window.addEventListener('touchmove', preventBackdropScroll, { passive: false })

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      window.removeEventListener('wheel', preventBackdropScroll)
      window.removeEventListener('touchmove', preventBackdropScroll)
    }
  }, [isOpen])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[size]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={SPRINGS.smooth}
            className={cn(
              'relative w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl flex flex-col font-sans overflow-hidden',
              sizeClasses,
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact Header */}
            {(title || description) && (
              <div className="flex items-start justify-between px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-4 sm:pb-3 border-b border-[var(--border-subtle)] gap-3 shrink-0 bg-[var(--bg-surface)]">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h3 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)] leading-tight">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-[11px] sm:text-xs text-[var(--ink-muted)] mt-0.5 leading-snug">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded p-1 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content */}
            <div className={cn('flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5 custom-scrollbar overscroll-contain modal-scrollable-content', bodyClassName)}>
              {children}
            </div>

            {/* Sticky Footer */}
            {footer && (
              <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
