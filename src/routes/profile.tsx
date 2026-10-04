import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import WorkCard from '../components/WorkCard'
import { useUser } from '@clerk/react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import {
  User,
  Settings,
  PenLine,
  Bookmark,
  BookOpen,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react'

export const Route = createFileRoute('/profile')({
  component: () => (
    <ProtectedRoute
      title="Personal Creator Profile"
      description="Sign in to view your published manuscripts, draft works, reading activity, and profile credentials."
      featureBadge="Creator Profile"
    >
      <UserProfilePage />
    </ProtectedRoute>
  ),
})

function UserProfilePage() {
  const { user } = useUser()
  const { writerWorks, savedWorkIds, allWorks, followedAuthorIds } = useApp()
  const [activeTab, setActiveTab] = useState<'works' | 'library'>('works')

  const mySavedWorks = allWorks.filter((w) => savedWorkIds.includes(w.id))

  const profileName = user?.fullName || user?.firstName || 'Tellnest Creator'
  const profileHandle = user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'creator'
  const profileAvatar = user?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Profile Header Box */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-10 mb-10 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-5">
            <img
              src={profileAvatar}
              alt={profileName}
              className="h-20 w-20 rounded-full object-cover border-2 border-[var(--border-strong)]"
            />
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
                {profileName}
              </h1>
              <p className="font-mono text-xs text-[var(--ink-muted)]">@{profileHandle}</p>
              <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--ink-faint)] mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> London / Remote
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Member since 2025
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--border-strong)] no-underline"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </Link>

            <Link
              to="/write"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 no-underline"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span>Writer Studio</span>
            </Link>
          </div>
        </div>

        {/* Bio */}
        <p className="pt-4 text-xs sm:text-sm leading-relaxed text-[var(--ink-secondary)] font-sans max-w-2xl">
          Writer, editor, and curious archivist. Currently crafting serialized fiction exploring cold environments, maritime history, and quiet psychological spaces.
        </p>

        {/* Stats */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-4 gap-4 font-mono text-center text-xs">
          <div>
            <p className="font-semibold text-lg text-[var(--ink-primary)]">{writerWorks.length}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Authored Works</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-[var(--ink-primary)]">140</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Followers</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-[var(--ink-primary)]">{followedAuthorIds.length}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Following</p>
          </div>
          <div>
            <p className="font-semibold text-lg text-[var(--ink-primary)]">{savedWorkIds.length}</p>
            <p className="text-[10px] text-[var(--ink-muted)] uppercase">Saved Works</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)] mb-8 text-xs font-mono">
        <button
          onClick={() => setActiveTab('works')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'works'
              ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <PenLine className="h-3 w-3" />
          <span>Authored Works ({writerWorks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'library'
              ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-medium'
              : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
          }`}
        >
          <Bookmark className="h-3 w-3" />
          <span>Saved to Library ({mySavedWorks.length})</span>
        </button>
      </div>

      {/* Works Display */}
      {activeTab === 'works' && (
        <div className="space-y-4">
          {writerWorks.map((work) => (
            <div
              key={work.id}
              className="flex items-center justify-between p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] transition-all"
            >
              <div className="flex items-center gap-4">
                <img
                  src={work.cover}
                  alt={work.title}
                  className="h-14 w-10 rounded object-cover grayscale"
                />
                <div>
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-faint)]">
                    {work.category} • {work.status}
                  </span>
                  <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    {work.title}
                  </h3>
                  <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                    {work.chaptersCount} Chapters • {work.totalReads} reads
                  </p>
                </div>
              </div>

              <Link
                to="/write/manage/$workId"
                params={{ workId: work.id }}
                className="rounded border border-[var(--border-strong)] px-3 py-1.5 text-xs font-mono text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] no-underline"
              >
                Manage
              </Link>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'library' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {mySavedWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      )}

    </div>
  )
}
