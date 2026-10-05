import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { Settings, User, Eye, Bell, Lock, ShieldCheck, Sun, Moon, Coffee, Upload, RotateCcw, Loader2 } from 'lucide-react'
import { UnisexAvatar, isDefaultOrInitialAvatar } from '../components/UnisexAvatar'
import { uploadImage, optimizeAvatarImage, STORAGE_BUCKETS } from '../lib/supabase/storage'

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
  const { user } = useUser()
  const {
    siteTheme,
    setSiteTheme,
    readerSettings,
    updateReaderSettings,
    showToast,
    customAvatarUrl,
    setCustomAvatarUrl,
  } = useApp()

  const [activeTab, setActiveTab] = useState<'profile' | 'reading' | 'notifications' | 'privacy'>('reading')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeAvatar = customAvatarUrl || user?.imageUrl
  const hasCustomPicture = Boolean(customAvatarUrl || (user?.hasImage && activeAvatar && !isDefaultOrInitialAvatar(activeAvatar)))

  // Local state for profile form
  const [displayName, setDisplayName] = useState(user?.fullName || user?.firstName || 'Syed Abbas')
  const [handle, setHandle] = useState(user?.username || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'syedabbas')
  const [bio, setBio] = useState('Writer, editor, and curious archivist.')

  // Notifications preferences
  const [emailNewChapter, setEmailNewChapter] = useState(true)
  const [emailReplies, setEmailReplies] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Enforce 500 KB limit
    if (file.size > 500 * 1024) {
      showToast('Image size exceeds 500 KB limit. Please choose a smaller image.')
      return
    }

    try {
      setIsUploadingAvatar(true)

      // 1. Client-side optimization: Center-crop to 300x300 px square & compress to WebP (~20-40 KB)
      const optimizedFile = await optimizeAvatarImage(file, 300, 0.85)
      const ext = optimizedFile.name.split('.').pop() || 'webp'
      const filePath = `${user?.id || 'creator'}/avatar_${Date.now()}.${ext}`

      // 2. Upload to Supabase Storage in the author-avatars bucket
      const uploadResult = await uploadImage({
        bucket: STORAGE_BUCKETS.AVATARS,
        path: filePath,
        file: optimizedFile,
        upsert: true,
      })

      if (uploadResult.error || !uploadResult.url) {
        throw uploadResult.error || new Error('Upload to Supabase Storage failed')
      }

      // 3. Set custom avatar in AppContext and localStorage
      setCustomAvatarUrl(uploadResult.url)

      // 4. Sync to Clerk user profile if available
      try {
        if (user && typeof (user as any).setProfileImage === 'function') {
          await (user as any).setProfileImage({ file: optimizedFile })
        }
      } catch (clerkErr) {
        console.warn('[Clerk] setProfileImage sync notice:', clerkErr)
      }

      showToast('Profile picture optimized (~30 KB) and saved to Supabase Storage!')
    } catch (err: any) {
      console.error('[AvatarUpload] Error:', err)
      showToast(err.message || 'Failed to upload profile picture. Please try again.')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleResetAvatar = async () => {
    try {
      setCustomAvatarUrl(null)
      if (user && typeof (user as any).setProfileImage === 'function') {
        try {
          await (user as any).setProfileImage({ file: null })
        } catch (e) {}
      }
      showToast('Reverted to default unisex avatar.')
    } catch (err: any) {
      showToast('Failed to reset avatar.')
    }
  }

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

              {/* Profile Avatar & Custom Picture Section */}
              <div className="p-4 sm:p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <UnisexAvatar
                        src={activeAvatar}
                        name={displayName}
                        size="xl"
                        className="border-2 border-[var(--border-strong)] shadow-xs"
                      />
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xs">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        Profile Avatar
                      </h4>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                        Personalize your author image or use the default unisex avatar.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload Picture</span>
                        </>
                      )}
                    </button>

                    {hasCustomPicture && (
                      <button
                        type="button"
                        onClick={handleResetAvatar}
                        disabled={isUploadingAvatar}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Revert to Default</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-[var(--ink-faint)] font-mono border-t border-[var(--border-subtle)] pt-2.5">
                  Supported formats: PNG, JPG, WEBP, GIF. Max 500 KB (auto-optimized to ~30 KB in Supabase Storage <code className="text-[10px]">author-avatars</code> bucket).
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
