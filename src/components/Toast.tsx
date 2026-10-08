import React from 'react'
import { useApp } from '../context/AppContext'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { SPRINGS } from '../design-system/tokens'

export default function Toast() {
  const { toastMessage } = useApp()

  const isWarning = Boolean(
    toastMessage &&
      (toastMessage.toLowerCase().includes('please') ||
        toastMessage.toLowerCase().includes('minimum') ||
        toastMessage.toLowerCase().includes('error') ||
        toastMessage.toLowerCase().includes('required'))
  )

  return (
    <div className="fixed top-5 left-5 z-[100] pointer-events-none">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, x: -12, scale: 0.95 }}
            transition={SPRINGS.snappy}
            className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--ink-primary)] px-4 py-2.5 text-xs font-medium text-[var(--accent-contrast)] shadow-2xl backdrop-blur-md"
          >
            {isWarning ? (
              <AlertCircle className="h-4 w-4 text-amber-300 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" />
            )}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
