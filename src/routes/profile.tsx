import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import {
  Eye,
  MapPin,
  Link2,
  Pencil,
  Check,
  User,
  BookOpen,
  PenTool,
  Sliders,
  Heart,
  ExternalLink,
} from 'lucide-react'
import { useUser } from '@clerk/react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useApp } from '../context/AppContext'
import { UnisexAvatar } from '../components/UnisexAvatar'
import { Modal, DiscreteTabs } from '../design-system'
import { getUserProfileServerFn, updateUserProfileServerFn } from '../server/authors'
import { GENRES } from '../data/mockData'

export const Route = createFileRoute('/profile')({
  head: () => ({
    meta: [
      { title: 'Your profile — Hatchpen' },
      {
        name: 'description',
        content: 'Manage your Hatchpen profile, followers, writings, reading and writing settings and interests.',
      },
    ],
  }),
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

type ProfileSettings = {
  name: string
  handle: string
  bio: string
  location: string
  website: string
  pronouns: string
  showFollowers: boolean
  showReadingList: boolean
  allowMessages: boolean
  reading: {
    theme: 'Light' | 'Sepia' | 'Dark'
    fontSize: number
    lineSpacing: 'Compact' | 'Comfortable' | 'Airy'
    font: 'Sans' | 'Serif'
    autoNext: boolean
    hideMature: boolean
  }
  writing: {
    autosave: boolean
    focusMode: boolean
    dailyGoal: number
    showWordCount: boolean
    defaultAudience: string
  }
  personal: {
    email: string
    language: string
    timezone: string
    emailNotifs: boolean
    commentNotifs: boolean
    followNotifs: boolean
  }
  interests: string[]
}

const initialSettings: ProfileSettings = {
  name: 'Tellnest Creator',
  handle: 'creator',
  bio: 'Writing quiet stories about loud feelings. Tea, rain and lighthouses.',
  location: 'Remote',
  website: '',
  pronouns: 'they/them',
  showFollowers: true,
  showReadingList: true,
  allowMessages: false,
  reading: {
    theme: 'Light',
    fontSize: 18,
    lineSpacing: 'Comfortable',
    font: 'Serif',
    autoNext: true,
    hideMature: false,
  },
  writing: {
    autosave: true,
    focusMode: false,
    dailyGoal: 500,
    showWordCount: true,
    defaultAudience: 'Everyone',
  },
  personal: {
    email: '',
    language: 'English',
    timezone: 'UTC',
    emailNotifs: true,
    commentNotifs: true,
    followNotifs: false,
  },
  interests: ['Fantasy', 'Romance', 'Mystery'],
}

const SETTINGS_KEY = 'hatchpen_tidewrite_profile_settings'

const SETTINGS_TABS = [
  { id: 'Public profile', label: 'Public profile', icon: <User className="h-3.5 w-3.5" /> },
  { id: 'Reading', label: 'Reading', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'Writing', label: 'Writing', icon: <PenTool className="h-3.5 w-3.5" /> },
  { id: 'Personal', label: 'Personal', icon: <Sliders className="h-3.5 w-3.5" /> },
  { id: 'Interests', label: 'Interests', icon: <Heart className="h-3.5 w-3.5" /> },
] as const

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id']

function UserProfilePage() {
  const { user } = useUser()
  const {
    writerWorks: mockWriterWorks,
    allWorks,
    followedAuthorIds,
    customAvatarUrl,
    showToast,
  } = useApp()

  const [dbProfile, setDbProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Settings Draft & Committed States (from Live_instructions.md)
  const [p, setP] = useState<ProfileSettings>(initialSettings)
  const [draft, setDraft] = useState<ProfileSettings>(initialSettings)
  const [tab, setTab] = useState<SettingsTabId>('Public profile')
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  // Fetch live user profile dynamically from Supabase
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }
    let isCancelled = false
    setIsLoading(true)

    getUserProfileServerFn({ data: user.id })
      .then((profile) => {
        if (!isCancelled && profile) {
          setDbProfile(profile)

          // 1. Display Name
          const resolvedName =
            profile.display_name || user.fullName || user.firstName || initialSettings.name

          // 2. Username / Handle
          const resolvedHandle =
            profile.username ||
            user.username ||
            user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
            initialSettings.handle

          // 3. Bio
          const resolvedBio =
            typeof profile.bio === 'string' && !profile.bio.startsWith('{')
              ? profile.bio
              : profile.bio === null && profile.id
              ? ''
              : initialSettings.bio

          // 4. Location
          const resolvedLocation =
            profile.location ?? (profile.id ? '' : initialSettings.location)

          // 5. Website
          const resolvedWebsite =
            profile.website_url ?? (profile.id ? '' : initialSettings.website)

          // 6. Pronouns
          const resolvedPronouns =
            profile.pronouns ?? (profile.id ? '' : initialSettings.pronouns)

          // 7. Show followers count (Visibility)
          const resolvedShowFollowers =
            typeof profile.preferences?.visibility?.showFollowers === 'boolean'
              ? profile.preferences.visibility.showFollowers
              : typeof profile.preferences?.showFollowers === 'boolean'
              ? profile.preferences.showFollowers
              : initialSettings.showFollowers

          // 8. Show reading list (Visibility)
          const resolvedShowReadingList =
            typeof profile.preferences?.visibility?.showReadingList === 'boolean'
              ? profile.preferences.visibility.showReadingList
              : typeof profile.preferences?.showReadingList === 'boolean'
              ? profile.preferences.showReadingList
              : initialSettings.showReadingList

          // 9. Allow direct messages (Visibility)
          const resolvedAllowMessages =
            typeof profile.preferences?.visibility?.allowMessages === 'boolean'
              ? profile.preferences.visibility.allowMessages
              : typeof profile.preferences?.allowMessages === 'boolean'
              ? profile.preferences.allowMessages
              : initialSettings.allowMessages

          // Interests
          const prefInterests =
            profile.preferences?.interests?.map((i: any) => i.name || i) ||
            initialSettings.interests

          // Reading preferences
          const prefReading = profile.preferences?.reading
            ? { ...initialSettings.reading, ...profile.preferences.reading }
            : initialSettings.reading

          // Writing preferences
          const prefWriting = profile.preferences?.writing
            ? { ...initialSettings.writing, ...profile.preferences.writing }
            : initialSettings.writing

          // Personal settings
          const prefPersonal = profile.preferences?.personal
            ? {
                ...initialSettings.personal,
                email: user.primaryEmailAddress?.emailAddress || profile.preferences.personal.email || '',
                ...profile.preferences.personal,
              }
            : {
                ...initialSettings.personal,
                email: user.primaryEmailAddress?.emailAddress || '',
              }

          const merged: ProfileSettings = {
            ...initialSettings,
            name: resolvedName,
            handle: resolvedHandle,
            bio: resolvedBio,
            location: resolvedLocation,
            website: resolvedWebsite,
            pronouns: resolvedPronouns,
            showFollowers: resolvedShowFollowers,
            showReadingList: resolvedShowReadingList,
            allowMessages: resolvedAllowMessages,
            reading: prefReading,
            writing: prefWriting,
            personal: prefPersonal,
            interests: prefInterests,
          }

          setP(merged)
          setDraft(merged)

          // Keep localStorage cache aligned with DB state
          try {
            localStorage.setItem(`${SETTINGS_KEY}_${user.id}`, JSON.stringify(merged))
          } catch {}
        }
      })
      .catch((err) => {
        console.error('[UserProfilePage] Error fetching user profile:', err)
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [user?.id])

  const dirty = JSON.stringify(p) !== JSON.stringify(draft)

  const save = async () => {
    if (!user?.id) return

    try {
      // Persist all Public Profile fields + Visibility + Preferences directly to Supabase
      const result = await updateUserProfileServerFn({
        data: {
          clerkUserId: user.id,
          username: draft.handle,
          displayName: draft.name,
          bio: draft.bio,
          location: draft.location,
          websiteUrl: draft.website,
          pronouns: draft.pronouns,
          preferences: {
            visibility: {
              showFollowers: draft.showFollowers,
              showReadingList: draft.showReadingList,
              allowMessages: draft.allowMessages,
            },
            showFollowers: draft.showFollowers,
            showReadingList: draft.showReadingList,
            allowMessages: draft.allowMessages,
            reading: draft.reading,
            writing: draft.writing,
            personal: draft.personal,
            interests: draft.interests,
          },
        },
      })

      if (result) {
        setDbProfile((prev: any) => ({
          ...prev,
          ...result,
          display_name: result.display_name,
          username: result.username,
          bio: result.bio,
          location: result.location,
          website_url: result.website_url,
          pronouns: result.pronouns,
          preferences: result.preferences,
        }))
      }

      setP(draft)

      try {
        localStorage.setItem(`${SETTINGS_KEY}_${user.id}`, JSON.stringify(draft))
      } catch {}

      setSaved(true)
      showToast?.('Profile changes saved successfully')
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      console.error('[save] Error persisting to Supabase:', err)
      showToast?.(err.message || 'Failed to save changes. Please try again.')
    }
  }

  const set = <K extends keyof ProfileSettings>(k: K, v: ProfileSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const sub = <K extends 'reading' | 'writing' | 'personal'>(
    k: K,
    v: Partial<ProfileSettings[K]>
  ) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...v } }))

  // Database-backed writings and metrics
  const myWorks = dbProfile?.authoredWorks ?? mockWriterWorks.slice(0, 3)
  const authoredCount = dbProfile?.stats?.authoredWorksCount ?? myWorks.length
  const followersCount = dbProfile?.stats?.followersCount ?? '0'
  const followingCount = dbProfile?.stats?.followingCount ?? followedAuthorIds.length
  const readsCount = dbProfile?.stats?.readsCount ?? '0'

  const activeAvatar = customAvatarUrl || dbProfile?.avatar_path || user?.imageUrl

  if (isLoading) {
    return <ProfileSkeleton />
  }

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* SECTION 1: Profile Hero Header Card (Compact & Refined Typography) */}
        <section className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] font-sans">
          <div className="h-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]" />
          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="-mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
              {/* Avatar */}
              <div className="h-16 w-16 shrink-0 rounded-full border-2 border-[var(--bg-surface)] shadow-sm overflow-hidden bg-[var(--ink-primary)] flex items-center justify-center">
                <UnisexAvatar
                  src={activeAvatar}
                  hasImage={user?.hasImage}
                  name={p.name}
                  size="xl"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTab('Public profile')
                    const el = document.getElementById('settings-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                  Edit profile
                </button>
                <button
                  onClick={() => setOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--ink-primary)] px-3 py-1 text-xs font-medium text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Eye className="h-3 w-3" />
                  View public profile
                </button>
              </div>
            </div>

            <h1 className="mt-2 text-lg sm:text-xl font-semibold font-serif tracking-tight text-[var(--ink-primary)]">
              {p.name}
            </h1>
            <p className="font-mono text-[11px] text-[var(--ink-muted)] mt-0.5">
              @{p.handle}
              {p.pronouns && ` · ${p.pronouns}`}
            </p>
            <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--ink-secondary)] font-sans">
              {p.bio}
            </p>

            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[var(--ink-muted)] font-sans">
              {p.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[var(--ink-faint)]" />
                  {p.location}
                </span>
              )}
              {p.website && (
                <a
                  href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:underline no-underline"
                >
                  <Link2 className="h-3 w-3 text-[var(--ink-faint)]" />
                  {p.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Metrics */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [String(followersCount), 'Followers'],
                [String(followingCount), 'Following'],
                [String(authoredCount), 'Writings'],
                [String(readsCount), 'Total reads'],
              ].map(([n, l]) => (
                <div
                  key={l}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1.5 text-center sm:text-left"
                >
                  <p className="font-mono text-sm sm:text-base font-semibold text-[var(--ink-primary)]">{n}</p>
                  <p className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 2: Your Writings */}
        <section className="py-6 sm:py-7">
          <div className="flex items-baseline justify-between mb-3.5">
            <h2 className="text-base sm:text-lg font-semibold font-serif text-[var(--ink-primary)]">Your writings</h2>
            <Link
              to="/write/new"
              className="text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] underline-offset-4 hover:underline no-underline"
            >
              + New story
            </Link>
          </div>

          {myWorks.length === 0 ? (
            <div className="p-6 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-surface)] text-center">
              <p className="text-xs text-[var(--ink-muted)]">No published writings yet.</p>
              <Link
                to="/write/new"
                className="mt-2.5 inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] no-underline"
              >
                Create your first manuscript
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {myWorks.map((s: any) => {
                const coverImg = s.cover || s.cover_image_path || '/covers/coastal-ruins.jpg'
                const genreName = s.genre?.name || s.genre || s.category?.name || s.category || 'Literary'
                const chaptersTotal = s.chaptersCount ?? s.chapter_count ?? 1
                const readsTotal = s.totalReads ?? (s.view_count !== undefined ? `${s.view_count}` : '0')

                return (
                  <Link
                    key={s.id}
                    to="/works/$workId"
                    params={{ workId: s.id }}
                    className="group overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition hover:-translate-y-0.5 hover:shadow-sm no-underline"
                  >
                    <img
                      src={coverImg}
                      alt={s.title}
                      loading="lazy"
                      style={{ filter: 'grayscale(1)' }}
                      className="aspect-[16/10] w-full object-cover transition group-hover:scale-102"
                    />
                    <div className="p-3">
                      <p className="truncate font-serif font-semibold text-xs sm:text-sm text-[var(--ink-primary)]">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-[var(--ink-muted)] mt-0.5 font-mono">
                        {genreName} · {chaptersTotal} parts · {readsTotal} reads
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: Settings (with DiscreteTabs as requested) */}
        <section id="settings-section" className="border-t border-[var(--border-subtle)] pt-6 sm:pt-7">
          {/* DiscreteTabs Header for Section 3 */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5 mb-5">
            <DiscreteTabs
              defaultTab={tab}
              size="xs"
              className="mx-0"
              onTabChange={(tabId) => setTab(tabId as SettingsTabId)}
              tabs={SETTINGS_TABS.map((t) => ({
                id: t.id,
                label: t.label,
                icon: t.icon,
                activeColor: 'text-[var(--ink-primary)]',
              }))}
            />
            <span className="hidden sm:inline font-mono text-[11px] text-[var(--ink-faint)]">
              Preferences & Configuration
            </span>
          </div>

          <div className="space-y-4">
            {tab === 'Public profile' && (
              <>
                <Group title="Public profile" desc="This is what other readers see.">
                  <Text label="Display name" value={draft.name} onChange={(v) => set('name', v)} />
                  <Text
                    label="Username"
                    value={draft.handle}
                    onChange={(v) => set('handle', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  />
                  <Text label="Pronouns" value={draft.pronouns} onChange={(v) => set('pronouns', v)} />
                  <Field label="Bio">
                    <textarea
                      rows={3}
                      maxLength={200}
                      value={draft.bio}
                      onChange={(e) => set('bio', e.target.value)}
                      className={inputStyle}
                    />
                  </Field>
                  <Text label="Location" value={draft.location} onChange={(v) => set('location', v)} />
                  <Text label="Website" value={draft.website} onChange={(v) => set('website', v)} />
                </Group>
                <Group title="Visibility">
                  <Toggle
                    label="Show followers count"
                    checked={draft.showFollowers}
                    onChange={(v) => set('showFollowers', v)}
                  />
                  <Toggle
                    label="Show my reading list"
                    checked={draft.showReadingList}
                    onChange={(v) => set('showReadingList', v)}
                  />
                  <Toggle
                    label="Allow direct messages"
                    checked={draft.allowMessages}
                    onChange={(v) => set('allowMessages', v)}
                  />
                </Group>
              </>
            )}

            {tab === 'Reading' && (
              <Group title="Reading environment" desc="How stories look when you read.">
                <Choice
                  label="Theme"
                  options={['Light', 'Sepia', 'Dark']}
                  value={draft.reading.theme}
                  onChange={(v) => sub('reading', { theme: v as ProfileSettings['reading']['theme'] })}
                />
                <Choice
                  label="Font"
                  options={['Sans', 'Serif']}
                  value={draft.reading.font}
                  onChange={(v) => sub('reading', { font: v as 'Sans' | 'Serif' })}
                />
                <Field label={`Text size · ${draft.reading.fontSize}px`}>
                  <input
                    type="range"
                    min={14}
                    max={26}
                    value={draft.reading.fontSize}
                    onChange={(e) => sub('reading', { fontSize: +e.target.value })}
                    className="w-full accent-[var(--ink-primary)] cursor-pointer"
                  />
                </Field>
                <Choice
                  label="Line spacing"
                  options={['Compact', 'Comfortable', 'Airy']}
                  value={draft.reading.lineSpacing}
                  onChange={(v) =>
                    sub('reading', { lineSpacing: v as ProfileSettings['reading']['lineSpacing'] })
                  }
                />
                <div
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-[var(--ink-primary)]"
                  style={{
                    fontSize: draft.reading.fontSize,
                    lineHeight:
                      { Compact: 1.5, Comfortable: 1.8, Airy: 2.1 }[draft.reading.lineSpacing],
                    fontFamily:
                      draft.reading.font === 'Serif' ? 'Outfit, Georgia, serif' : 'Inter, sans-serif',
                  }}
                >
                  The wind came off the water in long, cold breaths, carrying the smell of salt.
                </div>
                <Toggle
                  label="Go to the next part automatically"
                  checked={draft.reading.autoNext}
                  onChange={(v) => sub('reading', { autoNext: v })}
                />
                <Toggle
                  label="Hide mature stories"
                  checked={draft.reading.hideMature}
                  onChange={(v) => sub('reading', { hideMature: v })}
                />
              </Group>
            )}

            {tab === 'Writing' && (
              <Group title="Writing environment" desc="Your setup in the writing studio.">
                <Toggle
                  label="Autosave drafts"
                  checked={draft.writing.autosave}
                  onChange={(v) => sub('writing', { autosave: v })}
                />
                <Toggle
                  label="Focus mode (hide distractions)"
                  checked={draft.writing.focusMode}
                  onChange={(v) => sub('writing', { focusMode: v })}
                />
                <Toggle
                  label="Show word count"
                  checked={draft.writing.showWordCount}
                  onChange={(v) => sub('writing', { showWordCount: v })}
                />
                <Field label="Daily word goal">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={draft.writing.dailyGoal}
                    onChange={(e) => sub('writing', { dailyGoal: Math.max(0, +e.target.value) })}
                    className={inputStyle}
                  />
                </Field>
                <Choice
                  label="Default audience"
                  options={['Everyone', 'Teen (13+)', 'Mature (18+)']}
                  value={draft.writing.defaultAudience}
                  onChange={(v) => sub('writing', { defaultAudience: v })}
                />
              </Group>
            )}

            {tab === 'Personal' && (
              <>
                <Group title="Personal details" desc="Private — only you can see this.">
                  <Text
                    label="Email"
                    value={draft.personal.email}
                    onChange={(v) => sub('personal', { email: v })}
                  />
                  <Field label="Language">
                    <select
                      value={draft.personal.language}
                      onChange={(e) => sub('personal', { language: e.target.value })}
                      className={inputStyle}
                    >
                      {['English', 'Español', 'Français', 'Deutsch', 'Português', 'हिन्दी'].map(
                        (l) => (
                          <option key={l}>{l}</option>
                        )
                      )}
                    </select>
                  </Field>
                  <Text
                    label="Time zone"
                    value={draft.personal.timezone}
                    onChange={(v) => sub('personal', { timezone: v })}
                  />
                </Group>
                <Group title="Notifications">
                  <Toggle
                    label="Email updates"
                    checked={draft.personal.emailNotifs}
                    onChange={(v) => sub('personal', { emailNotifs: v })}
                  />
                  <Toggle
                    label="Comments on my stories"
                    checked={draft.personal.commentNotifs}
                    onChange={(v) => sub('personal', { commentNotifs: v })}
                  />
                  <Toggle
                    label="New followers"
                    checked={draft.personal.followNotifs}
                    onChange={(v) => sub('personal', { followNotifs: v })}
                  />
                </Group>
              </>
            )}

            {tab === 'Interests' && (
              <Group title="Interests" desc="Pick what you love — we'll use it to suggest stories.">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    ...GENRES.map((g) => g.name),
                    'Slow burn',
                    'Found family',
                    'Dragons',
                    'Detective',
                    'Coming-of-age',
                    'Short reads',
                  ].map((g) => {
                    const on = draft.interests.includes(g)
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          set(
                            'interests',
                            on ? draft.interests.filter((x) => x !== g) : [...draft.interests, g]
                          )
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                          on
                            ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:border-[var(--ink-primary)]'
                        }`}
                      >
                        {on && <Check className="h-3 w-3" />}
                        {g}
                      </button>
                    )
                  })}
                </div>
              </Group>
            )}

            {/* Sticky Save / Discard Bar */}
            <div className="sticky bottom-4 z-20 flex items-center justify-end gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 p-1.5 pl-4 backdrop-blur shadow-sm">
              <span className="mr-auto text-xs text-[var(--ink-muted)]">
                {saved
                  ? 'Saved'
                  : dirty
                  ? 'You have unsaved changes'
                  : 'All changes saved'}
              </span>
              <button
                type="button"
                disabled={!dirty}
                onClick={() => setDraft(p)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-40 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={!dirty}
                onClick={save}
                className="rounded-full bg-[var(--ink-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                Save changes
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Public Profile Preview Modal */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        size="lg"
        className="max-w-lg p-0 overflow-hidden"
      >
        <div className="h-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)]" />
        <div className="-mt-10 px-5 pb-5">
          <div className="h-16 w-16 rounded-full border-2 border-[var(--bg-surface)] shadow-sm overflow-hidden bg-[var(--ink-primary)] flex items-center justify-center">
            <UnisexAvatar
              src={activeAvatar}
              hasImage={user?.hasImage}
              name={p.name}
              size="xl"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-2.5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold font-serif text-[var(--ink-primary)]">{p.name}</h2>
              <p className="font-mono text-xs text-[var(--ink-muted)]">
                @{p.handle}
                {p.pronouns && ` · ${p.pronouns}`}
              </p>
            </div>
            <button className="rounded-full bg-[var(--ink-primary)] px-3.5 py-1 text-xs font-semibold text-[var(--accent-contrast)]">
              Follow
            </button>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-secondary)]">{p.bio}</p>

          <div className="mt-2.5 flex flex-wrap gap-3 text-xs text-[var(--ink-muted)] font-sans">
            {p.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {p.location}
              </span>
            )}
            {p.website && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                {p.website}
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-5 border-y border-[var(--border-subtle)] py-3 font-mono text-xs">
            {p.showFollowers && (
              <>
                <div>
                  <p className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{followersCount}</p>
                  <p className="text-[10px] text-[var(--ink-muted)] uppercase">Followers</p>
                </div>
                <div>
                  <p className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{followingCount}</p>
                  <p className="text-[10px] text-[var(--ink-muted)] uppercase">Following</p>
                </div>
              </>
            )}
            <div>
              <p className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{authoredCount}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase">Writings</p>
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base text-[var(--ink-primary)]">{readsCount}</p>
              <p className="text-[10px] text-[var(--ink-muted)] uppercase">Reads</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            Stories
          </p>
          <ul className="mt-2.5 space-y-2">
            {myWorks.map((s: any) => (
              <li
                key={s.id}
                className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]"
              >
                <img
                  src={s.cover || s.cover_image_path || '/covers/coastal-ruins.jpg'}
                  alt={s.title}
                  style={{ filter: 'grayscale(1)' }}
                  className="h-10 w-7 rounded object-cover"
                />
                <span className="text-xs font-semibold text-[var(--ink-primary)] font-serif">
                  {s.title}
                </span>
                <span className="ml-auto text-[11px] font-mono text-[var(--ink-muted)]">
                  {s.totalReads ?? s.view_count ?? '0'} reads
                </span>
              </li>
            ))}
          </ul>

          {p.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-secondary)]"
                >
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

const inputStyle =
  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] outline-none focus:border-[var(--ink-primary)] transition-colors'

function Group({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <h3 className="text-sm sm:text-base font-semibold font-serif text-[var(--ink-primary)]">{title}</h3>
      {desc && <p className="text-xs text-[var(--ink-muted)] mt-0.5">{desc}</p>}
      <div className="mt-3.5 space-y-3.5">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--ink-secondary)]">{label}</span>
      {children}
    </label>
  )
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputStyle}
      />
    </Field>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-xs font-medium text-[var(--ink-primary)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-[var(--ink-primary)]' : 'bg-[var(--border-strong)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--accent-contrast)] shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-[var(--ink-secondary)]">{label}</span>
      <div className="inline-flex flex-wrap rounded-full bg-[var(--bg-subtle)] p-0.5 border border-[var(--border-subtle)]">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
              o === value
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen py-6 sm:py-8 animate-pulse">
      <main className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Section 1 Skeleton */}
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] font-sans">
          <div className="h-20 bg-[var(--bg-subtle)]" />
          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="-mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
              <div className="h-16 w-16 rounded-full bg-[var(--bg-subtle)] border-2 border-[var(--bg-surface)]" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded-full bg-[var(--bg-subtle)]" />
                <div className="h-7 w-28 rounded-full bg-[var(--bg-subtle)]" />
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-5 w-40 rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-24 rounded bg-[var(--bg-subtle)]" />
              <div className="h-3 w-4/5 rounded bg-[var(--bg-subtle)]" />
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[var(--bg-subtle)]" />
              ))}
            </div>
          </div>
        </div>

        {/* Section 2 Skeleton */}
        <div className="py-6 sm:py-7 space-y-3.5">
          <div className="h-5 w-32 rounded bg-[var(--bg-subtle)]" />
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-[var(--bg-subtle)]" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
