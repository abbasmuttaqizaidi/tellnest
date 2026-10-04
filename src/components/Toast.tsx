import React from 'react'
import { useApp } from '../context/AppContext'
import { CheckCircle2 } from 'lucide-react'

export default function Toast() {
  const { toastMessage } = useApp()

  if (!toastMessage) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--ink-secondary)] px-4 py-2.5 text-xs font-medium text-[var(--accent-contrast)] shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-[var(--accent-contrast)]" />
        <span>{toastMessage}</span>
      </div>
    </div>
  )
}
