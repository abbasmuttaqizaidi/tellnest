import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Code, BookOpen, Layers, Copy, Check, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react'
import { cn } from '../lib/utils'

export interface StoryCardProps {
  id: string
  title: string
  componentName: string
  category?: string
  badge?: string
  description?: string
  usageNotes?: {
    primaryLocation?: string
    workflow?: string
  }
  codeSnippet?: string
  controls?: React.ReactNode
  children: React.ReactNode
  defaultDocsOpen?: boolean
  viewMode?: 'canvas' | 'docs'
}

export function StoryCard({
  id,
  title,
  componentName,
  category = 'Studio Story',
  badge,
  description,
  usageNotes,
  codeSnippet,
  controls,
  children,
  defaultDocsOpen = false,
  viewMode = 'canvas'
}: StoryCardProps) {
  const [docsOpen, setDocsOpen] = useState(defaultDocsOpen)
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!codeSnippet) return
    navigator.clipboard.writeText(codeSnippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isDocsMode = viewMode === 'docs'

  return (
    <article
      id={id}
      className="scroll-mt-28 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all"
    >
      {/* Story Card Header */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
              {category}
            </span>
            <span className="text-[var(--ink-faint)]">•</span>
            <span className="font-mono text-[11px] font-semibold text-[var(--ink-primary)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded">
              &lt;{componentName} /&gt;
            </span>
            {badge && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]">
                {badge}
              </span>
            )}
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-semibold text-[var(--ink-primary)]">
            {title}
          </h3>
        </div>

        {/* Story Tab Bar & Specs Disclosure */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {codeSnippet && (
            <div className="flex items-center bg-[var(--bg-subtle)] rounded-lg p-0.5 border border-[var(--border-subtle)] text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all',
                  activeTab === 'preview'
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-medium shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                Canvas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all',
                  activeTab === 'code'
                    ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-medium shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                Snippet
              </button>
            </div>
          )}

          {usageNotes && (
            <button
              type="button"
              onClick={() => setDocsOpen(!docsOpen)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all',
                docsOpen || isDocsMode
                  ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              )}
            >
              <BookOpen className="h-3 w-3" />
              <span>Specs</span>
              {docsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Description row if provided */}
      {description && (
        <div className="px-5 py-2.5 bg-[var(--bg-canvas)]/40 border-b border-[var(--border-subtle)] text-xs text-[var(--ink-secondary)] leading-relaxed">
          {description}
        </div>
      )}

      {/* Specs / Usage Section (Accordion or Docs Mode) */}
      <AnimatePresence initial={false}>
        {(docsOpen || isDocsMode) && usageNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40"
          >
            <div className="p-5 space-y-3 font-sans text-xs">
              <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-primary)]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Architecture Usage & Deployment Guide</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usageNotes.primaryLocation && (
                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[var(--ink-faint)] font-medium">
                      Primary Location
                    </span>
                    <p className="font-mono text-xs text-[var(--ink-primary)] font-semibold">
                      {usageNotes.primaryLocation}
                    </p>
                  </div>
                )}
                {usageNotes.workflow && (
                  <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-1">
                    <span className="font-mono text-[10px] uppercase text-[var(--ink-faint)] font-medium">
                      Editorial & Literary Workflow
                    </span>
                    <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                      {usageNotes.workflow}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Canvas / Code Tab Content */}
      {activeTab === 'preview' ? (
        <div className="p-6 sm:p-8 bg-[var(--bg-canvas)] flex flex-col items-center justify-center min-h-[160px] relative">
          <div className="w-full flex justify-center">
            {children}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[var(--bg-canvas)] border-t border-[var(--border-subtle)] relative font-mono text-xs">
          <div className="flex items-center justify-between pb-2 text-[var(--ink-muted)] border-b border-[var(--border-subtle)] mb-3">
            <span>JSX Implementation Example</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] hover:text-[var(--ink-primary)] transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[11px] text-[var(--ink-primary)] leading-relaxed">
            {codeSnippet}
          </pre>
        </div>
      )}

      {/* Controls / State Feedback Bar */}
      {controls && (
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[var(--ink-muted)]">
          <div className="flex items-center gap-2">
            <span className="uppercase text-[10px] tracking-wider text-[var(--ink-faint)]">Story Props & Live State:</span>
          </div>
          <div className="flex items-center gap-4">
            {controls}
          </div>
        </div>
      )}
    </article>
  )
}
