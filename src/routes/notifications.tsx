import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Bell, Check, CheckCheck, BookOpen, MessageSquare, Sparkles, Settings, ChevronRight } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { RouteHeader } from '../components/RouteHeader'

export const Route = createFileRoute('/notifications')({
  head: () =>
    generateMeta({
      title: 'Notifications',
      description: 'Your editorial updates, chapter releases, and discussion notifications.',
      noindex: true,
    }),
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
    unreadNotificationCount,
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

  const TABS: { id: 'all' | 'unread' | 'updates' | 'comments'; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadNotificationCount },
    { id: 'updates', label: 'Releases' },
    { id: 'comments', label: 'Comments' },
  ]

  return (
    <div className="min-h-screen pb-12 bg-[var(--bg-canvas)]">
      {/* Mobile RouteHeader */}
      <RouteHeader
        title="Notifications"
        subtitle="Activity feed & updates"
        rightExtra={
          unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--border-strong)] transition-colors shadow-xs cursor-pointer"
            >
              <CheckCheck className="h-3 w-3" />
              <span>Mark read</span>
            </button>
          )
        }
      />

      {/* Compact Main Feed Container */}
      <div className="max-w-2xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-3 sm:space-y-4">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-xl font-bold tracking-tight text-[var(--ink-primary)]">
              Notifications
            </h1>
            {unreadNotificationCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
                {unreadNotificationCount} unread
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <Link
              to="/settings"
              search={{ section: 'notifications' } as any}
              className="p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition-colors no-underline"
              title="Notification Settings"
              aria-label="Notification Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Compact Filter Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {TABS.map((tab) => {
              const active = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                      : 'bg-[var(--bg-surface)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1 rounded-full ${
                        active
                          ? 'bg-[var(--accent-contrast)]/20 text-inherit'
                          : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <Link
            to="/settings"
            search={{ section: 'notifications' } as any}
            className="md:hidden p-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors no-underline shrink-0"
            title="Notification Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Notification Feed List */}
        {filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              {filter === 'unread' ? (
                <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Bell className="h-5 w-5 text-[var(--ink-muted)]" />
              )}
            </div>
            <p className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              {filter === 'unread' ? "You're all caught up" : 'No notifications found'}
            </p>
            <p className="text-xs text-[var(--ink-muted)]">
              {filter === 'unread'
                ? 'No unread notifications right now.'
                : 'You have no notifications matching this criteria.'}
            </p>
          </div>
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
                <Link
                  key={notif.id}
                  to={notif.targetUrl as any}
                  onClick={() => {
                    if (!notif.isRead) {
                      markNotificationRead(notif.id)
                    }
                  }}
                  className={`group flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3 transition-colors no-underline cursor-pointer ${
                    notif.isRead
                      ? 'hover:bg-[var(--bg-subtle)]/40'
                      : 'bg-[var(--bg-subtle)]/35 hover:bg-[var(--bg-subtle)]/65'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Compact Avatar with Micro-Badge */}
                    <div className="relative shrink-0">
                      <img
                        src={notif.actorAvatar}
                        alt={notif.actorName}
                        className="h-8 w-8 rounded-full object-cover grayscale border border-[var(--border-subtle)]"
                        loading="lazy"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-2xs">
                        <Icon className="h-2 w-2" />
                      </span>
                    </div>

                    {/* Notification Copy */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!notif.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                        )}
                        <h4 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] sm:text-[11px] font-mono text-[var(--ink-faint)] ml-auto shrink-0 pl-1">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-secondary)] truncate font-sans mt-0.5">
                        {notif.description}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions & Navigation indicator */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          markNotificationRead(notif.id)
                        }}
                        title="Mark as read"
                        aria-label="Mark as read"
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-[var(--ink-faint)] hover:text-[var(--ink-primary)] transition-all cursor-pointer rounded"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--ink-faint)] group-hover:text-[var(--ink-primary)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
