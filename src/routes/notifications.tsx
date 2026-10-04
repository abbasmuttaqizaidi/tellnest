import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import EmptyState from '../components/EmptyState'
import { FilterDisclosure } from '../design-system'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Bell, Check, CheckCheck, BookOpen, MessageSquare, Sparkles, Clock } from 'lucide-react'

export const Route = createFileRoute('/notifications')({
  component: () => (
    <ProtectedRoute
      title="Folio Notifications"
      description="Sign in to view comment replies, editorial updates, author announcements, and new chapter dispatches."
      featureBadge="Private Inbox"
    >
      <NotificationsPage />
    </ProtectedRoute>
  ),
})

function NotificationsPage() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationCount
  } = useApp()

  const [filter, setFilter] = useState<'all' | 'unread' | 'updates' | 'comments'>('all')

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.isRead
      if (filter === 'updates') return n.type === 'update' || n.type === 'publish'
      if (filter === 'comments') return n.type === 'comment'
      return true
    })
  }, [notifications, filter])

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--border-subtle)] gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            <Bell className="h-3.5 w-3.5" />
            <span>Activity Ledger</span>
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
            Notifications
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
            Updates from followed writers, responses to your reflections, and publishing notices.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            onClick={markAllNotificationsRead}
            className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors self-start sm:self-auto shadow-xs"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Filter Disclosure */}
          <div className="pb-4 border-b border-[var(--border-subtle)] text-xs">
            <FilterDisclosure
              label="Activity Filter"
              activeId={filter}
              onChange={(id) => setFilter(id as any)}
              items={[
                { id: 'all', label: `All Activity (${notifications.length})` },
                { id: 'unread', label: `Unread (${unreadNotificationCount})` },
                { id: 'updates', label: 'Chapter Releases & Works' },
                { id: 'comments', label: 'Discussion & Comments' },
              ]}
            />
          </div>

          {/* Notifications List */}
          {filteredNotifications.length === 0 ? (
            <EmptyState
              type="no-notifications"
              customTitle="No notifications found"
              customDescription="You have no notifications matching this criteria."
            />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] overflow-hidden shadow-xs">
              {filteredNotifications.map((notif) => {
                const Icon =
                  notif.type === 'comment'
                    ? MessageSquare
                    : notif.type === 'milestone'
                    ? Sparkles
                    : BookOpen

                return (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer ${
                      notif.isRead
                        ? 'hover:bg-[var(--bg-canvas)]'
                        : 'bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)]/70'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative">
                        <img
                          src={notif.actorAvatar}
                          alt={notif.actorName}
                          className="h-10 w-10 rounded-full object-cover grayscale border border-[var(--border-subtle)]"
                        />
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
                          <Icon className="h-2.5 w-2.5" />
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ink-primary)]" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--ink-secondary)] mt-0.5 font-sans">
                          {notif.description}
                        </p>
                        <span className="font-mono text-[10px] text-[var(--ink-faint)] mt-1.5 block">
                          {notif.timestamp}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={notif.targetUrl as any}
                      className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors flex-shrink-0 no-underline"
                    >
                      View
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Ledger Summary & Preferences */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Activity Overview
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--ink-muted)]">Unread Dispatches</span>
                <span className="font-bold text-[var(--ink-primary)]">{unreadNotificationCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--ink-muted)]">Total Ledger Entries</span>
                <span className="text-[var(--ink-secondary)]">{notifications.length}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[var(--ink-muted)]">Delivery Status</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Real-time Active</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/settings"
                className="w-full inline-flex items-center justify-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] transition-colors no-underline"
              >
                <span>Configure Notification Rules</span>
              </Link>
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
