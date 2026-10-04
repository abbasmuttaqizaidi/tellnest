import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Settings, User, Eye, Bell, Lock, ShieldCheck, Sun, Moon, Coffee } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: () => (
    <ProtectedRoute
      title="User Preferences & Folio Settings"
      description="Sign in to customize your editorial reading modes, notification dispatches, and privacy settings."
      featureBadge="Account Settings"
    >
      <SettingsPage />
    </ProtectedRoute>
  ),
})

function SettingsPage() {
  const {
    siteTheme,
    setSiteTheme,
    readerSettings,
    updateReaderSettings,
    showToast
  } = useApp()

  const [activeTab, setActiveTab] = useState<'profile' | 'reading' | 'notifications' | 'privacy'>('reading')

  // Local state for profile form
  const [displayName, setDisplayName] = useState('Syed Abbas')
  const [handle, setHandle] = useState('syedabbas')
  const [bio, setBio] = useState('Writer, editor, and curious archivist.')

  // Notifications preferences
  const [emailNewChapter, setEmailNewChapter] = useState(true)
  const [emailReplies, setEmailReplies] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    showToast('Profile updated successfully')
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="pb-6 border-b border-[var(--border-subtle)] mb-8">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
          <Settings className="h-3.5 w-3.5" />
          <span>System & Experience Preferences</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
          Preferences & Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
          Configure reader typography, notification channels, account information, and privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full">
        
        {/* Navigation Sidebar */}
        <aside className="md:col-span-4 lg:col-span-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0 min-w-0 max-w-full">
          {[
            { id: 'reading', label: 'Reading Experience', icon: Eye },
            { id: 'profile', label: 'Author & Account', icon: User },
            { id: 'notifications', label: 'Notification Rules', icon: Bell },
            { id: 'privacy', label: 'Privacy & Security', icon: Lock }
          ].map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left whitespace-nowrap flex-shrink-0 md:flex-shrink md:w-full ${
                  active
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Content Panel */}
        <div className="md:col-span-8 lg:col-span-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8">
          
          {/* TAB 1: READING EXPERIENCE PREFERENCES */}
          {activeTab === 'reading' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Default Reading Environment
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Configure default typography and aesthetic settings for when you open chapters.
                </p>
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Reader Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => updateReaderSettings({ theme: 'light' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium transition-all ${
                      readerSettings.theme === 'light'
                        ? 'border-[var(--ink-primary)] ring-1 ring-[var(--ink-primary)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] font-semibold'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    <span>Light Canvas</span>
                  </button>

                  <button
                    onClick={() => updateReaderSettings({ theme: 'sepia' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium ${
                      readerSettings.theme === 'sepia'
                        ? 'border-[#8C7A6B] ring-1 ring-[#8C7A6B] bg-[#F6F1EA] text-[#2C2219]'
                        : 'border-[var(--border-subtle)] bg-[#EDE5DA]/50 text-[#6B5E52]'
                    }`}
                  >
                    <Coffee className="h-4 w-4" />
                    <span>Warm Sepia</span>
                  </button>

                  <button
                    onClick={() => updateReaderSettings({ theme: 'dark' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium ${
                      readerSettings.theme === 'dark'
                        ? 'border-white ring-1 ring-white bg-[#090D14] text-white'
                        : 'border-[var(--border-subtle)] bg-[#111722] text-[#94A3B8]'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    <span>Deep Dark</span>
                  </button>
                </div>
              </div>

              {/* Typeface Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Default Typeface
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['serif', 'sans', 'mono'] as const).map((fam) => (
                    <button
                      key={fam}
                      onClick={() => updateReaderSettings({ fontFamily: fam })}
                      className={`rounded-lg border py-2 text-xs capitalize ${
                        readerSettings.fontFamily === fam
                          ? 'border-[var(--ink-primary)] font-semibold bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {fam === 'serif' ? 'Newsreader Serif' : fam === 'sans' ? 'Inter Sans' : 'Monospace'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reading Width */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                  Page Reading Width
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['narrow', 'medium', 'wide'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => updateReaderSettings({ readingWidth: w })}
                      className={`rounded-lg border py-2 text-xs capitalize ${
                        readerSettings.readingWidth === w
                          ? 'border-[var(--ink-primary)] font-semibold bg-[var(--bg-subtle)] text-[var(--ink-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--ink-muted)]'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                <button
                  onClick={() => showToast('Reading preferences saved')}
                  className="rounded bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]"
                >
                  Save Reading Defaults
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & ACCOUNT */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Public Profile
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  How you appear to readers across serialized chapters and comments.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Handle
                </label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-2 text-xs font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                  Biographical Note
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-end">
                <button
                  type="submit"
                  className="rounded bg-[var(--ink-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)]"
                >
                  Update Profile
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Notification Delivery
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Decide what updates prompt emails or in-app alerts.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <label className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[var(--ink-primary)]">Followed Writer New Chapter</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Instant notification when followed authors publish new installments.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNewChapter}
                    onChange={(e) => setEmailNewChapter(e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[var(--ink-primary)]">Replies to Reflections</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">When an author or fellow reader answers your chapter notes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailReplies}
                    onChange={(e) => setEmailReplies(e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] cursor-pointer">
                  <div>
                    <p className="font-semibold text-[var(--ink-primary)]">Weekly Folio Digest</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Summary of top trending essays and recommended fiction.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailDigest}
                    onChange={(e) => setEmailDigest(e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Privacy & Data Sovereignty
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Manage your data footprint and reading visibility.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] space-y-2 text-xs">
                <p className="font-semibold text-[var(--ink-primary)]">Private Reading Activity</p>
                <p className="text-[11px] text-[var(--ink-muted)] leading-relaxed">
                  Your reading history and scroll progress are strictly private and never sold or shared with third parties.
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="font-mono text-[var(--ink-muted)]">Export Manuscript Archive (.zip)</span>
                <button
                  onClick={() => showToast('Exporting manuscripts...')}
                  className="rounded border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  Export Data
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
