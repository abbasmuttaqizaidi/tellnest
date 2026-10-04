import { createFileRoute, Link } from '@tanstack/react-router'
import { useApp } from '../context/AppContext'
import {
  ArrowLeft,
  Users,
  Eye,
  Bookmark,
  TrendingUp,
  BarChart2,
  Calendar,
  Clock
} from 'lucide-react'
import { ProtectedRoute } from '../components/ProtectedRoute'

export const Route = createFileRoute('/write/analytics/$workId')({
  component: () => (
    <ProtectedRoute
      title="Writer Folio Analytics"
      description="Sign in to view reader retention curves, chapter completion rates, and demographic engagement metrics."
      featureBadge="Writer Analytics"
    >
      <WorkAnalyticsPage />
    </ProtectedRoute>
  ),
})

function WorkAnalyticsPage() {
  const { workId } = Route.useParams()
  const { getWorkById, allWorks } = useApp()

  const work = getWorkById(workId) || allWorks[0]

  // Chapter drop-off / completion statistics
  const chapterPerformance = [
    { number: 1, title: 'The Concrete Meridian', reads: 142000, completionRate: 94 },
    { number: 2, title: 'Signal in the Static', reads: 128500, completionRate: 91 },
    { number: 3, title: 'The Subterranean Vaults', reads: 112000, completionRate: 88 },
    { number: 4, title: 'The Perimeter Line', reads: 99500, completionRate: 85 }
  ]

  // Weekly readership trend mockup
  const weeklyTrends = [
    { day: 'Mon', reads: 4200 },
    { day: 'Tue', reads: 5800 },
    { day: 'Wed', reads: 7100 },
    { day: 'Thu', reads: 6400 },
    { day: 'Fri', reads: 8900 },
    { day: 'Sat', reads: 12400 },
    { day: 'Sun', reads: 10800 }
  ]

  const maxReads = Math.max(...weeklyTrends.map(t => t.reads))

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Back to Work Management */}
      <Link
        to="/write/manage/$workId"
        params={{ workId: work.id }}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] mb-6 no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to {work.title} Management</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-8 border-b border-[var(--border-subtle)] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            <BarChart2 className="h-3.5 w-3.5" />
            <span>Readership Dynamics</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
            Analytics for {work.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
            Creator-focused metrics detailing reader retention, chapter engagement, and discovery.
          </p>
        </div>

        <span className="font-mono text-xs text-[var(--ink-faint)]">
          Last 30 Days Activity
        </span>
      </div>

      {/* 4 Top Level Creator Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between text-[var(--ink-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Total Chapter Reads</span>
            <Eye className="h-4 w-4" />
          </div>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">{work.totalReads}</p>
          <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">+18.4% vs last cycle</p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between text-[var(--ink-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Unique Readers</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">68,240</p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)] mt-1">Across 42 regions</p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between text-[var(--ink-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Library Saves</span>
            <Bookmark className="h-4 w-4" />
          </div>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">{work.totalSaves.toLocaleString()}</p>
          <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">+420 this week</p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
          <div className="flex items-center justify-between text-[var(--ink-muted)] mb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider">Followers Gained</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">+890</p>
          <p className="font-mono text-[11px] text-[var(--ink-faint)] mt-1">From this manuscript</p>
        </div>
      </div>

      {/* Weekly Readership Bar Chart (Clean monochrome minimalist chart) */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 mb-8">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-6">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              Daily Reading Cadence
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">Readership volume over the past 7 days</p>
          </div>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Peak on Saturdays</span>
        </div>

        <div className="h-48 flex items-end justify-between gap-3 pt-4">
          {weeklyTrends.map((trend) => {
            const heightPercent = (trend.reads / maxReads) * 100
            return (
              <div key={trend.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                  {(trend.reads / 1000).toFixed(1)}k
                </span>
                <div
                  className="w-full max-w-[42px] bg-[var(--ink-primary)] rounded-t transition-all duration-300 hover:opacity-80"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="font-mono text-xs text-[var(--ink-faint)]">{trend.day}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chapter Retention & Drop-Off Performance */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
        <div className="pb-4 border-b border-[var(--border-subtle)] mb-6">
          <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
            Chapter Retention & Flow
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            Examine how readers progress from opening chapters into later installments.
          </p>
        </div>

        <div className="space-y-4">
          {chapterPerformance.map((chap) => (
            <div key={chap.number} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-serif text-sm font-medium text-[var(--ink-primary)]">
                  Ch. {String(chap.number).padStart(2, '0')}: {chap.title}
                </span>
                <span className="text-[var(--ink-muted)]">
                  {chap.reads.toLocaleString()} reads • <strong>{chap.completionRate}% completion</strong>
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                <div
                  className="h-full bg-[var(--ink-primary)] rounded-full"
                  style={{ width: `${chap.completionRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
