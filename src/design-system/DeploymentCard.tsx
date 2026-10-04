import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  CheckCircle2,
  Clock,
  GitBranch,
  Terminal,
  ExternalLink,
  ChevronDown,
  Sparkles,
  BookOpen,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { SPRINGS } from './tokens'

export interface PipelineStage {
  name: string
  status: 'completed' | 'in_progress' | 'queued'
  duration?: string
}

export interface DeploymentCardProps {
  folioTitle?: string
  version?: string
  branch?: string
  environment?: string
  stages?: PipelineStage[]
  className?: string
  onInspect?: () => void
}

const DEFAULT_STAGES: PipelineStage[] = [
  { name: 'Typography & Layout Validation', status: 'completed', duration: '140ms' },
  { name: 'Editorial Chapter Linting', status: 'completed', duration: '320ms' },
  { name: 'Static Folio Distribution', status: 'completed', duration: '410ms' },
]

export const DeploymentCard: React.FC<DeploymentCardProps> = ({
  folioTitle = 'The Silent Meridian — Vol. 2',
  version = 'rev-7b3f91a',
  branch = 'release/autumn-monograph',
  environment = 'Production Folio',
  stages = DEFAULT_STAGES,
  className,
  onInspect,
}) => {
  const [showLogs, setShowLogs] = useState(false)

  return (
    <div className={cn('w-full max-w-md select-none font-sans', className)}>
      <motion.div
        layout
        transition={SPRINGS.smooth}
        className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xs transition-colors hover:border-[var(--border-strong)]"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
              Published & Synchronized
            </span>
          </div>

          <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
            {environment}
          </span>
        </div>

        <div className="mt-3.5 space-y-1">
          <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
            {folioTitle}
          </h4>
          <div className="flex items-center gap-3 font-mono text-xs text-[var(--ink-muted)]">
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {branch}
            </span>
            <span>•</span>
            <span>{version}</span>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
          {stages.map((stage, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[var(--ink-secondary)]">{stage.name}</span>
              </div>
              <span className="text-[var(--ink-faint)] text-[10px]">{stage.duration}</span>
            </div>
          ))}
        </div>

        {/* Expandable Logs Button */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>{showLogs ? 'Hide pipeline logs' : 'View release logs'}</span>
            <motion.div animate={{ rotate: showLogs ? 180 : 0 }}>
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </button>

          <button
            type="button"
            onClick={onInspect}
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[var(--ink-primary)] hover:underline"
          >
            <span>Folio Manifest</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRINGS.smooth}
              className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 font-mono text-[10px] text-[var(--ink-muted)] space-y-1 overflow-hidden"
            >
              <p className="text-emerald-600 dark:text-emerald-400">[00:00:14] Validation checks passed (100%)</p>
              <p>[00:00:32] Generated 14 serialized chapter bundles</p>
              <p>[00:00:41] Deployed to global edge distribution network</p>
              <p className="text-[var(--ink-primary)] font-semibold">[00:00:43] Live at /works/the-silent-meridian</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
