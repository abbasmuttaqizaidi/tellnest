import React from 'react'
import { Link } from '@tanstack/react-router'
import { Feather } from 'lucide-react'
import { Button } from '../../design-system'

interface AtelierHeaderProps {
  notifications?: any[]
}

export const AtelierHeader: React.FC<AtelierHeaderProps> = () => {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/80 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
        {/* Title */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-md bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
              <Feather className="h-3.5 w-3.5" />
            </span>
            <h1 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--ink-primary)]">
              Writer's Studio
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/library"
            className="no-underline"
            title="Open your personal reading shelf"
          >
            <Button variant="outline" size="sm">
              Reading Shelf
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
