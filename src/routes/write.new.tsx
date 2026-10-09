import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/mockData'
import { GLOBAL_GENRES, GENRE_GROUPS, SUGGESTED_TAGS } from '../lib/taxonomy'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { ArrowLeft, BookOpen, Upload, Sparkles, CheckCircle2 } from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { CloudinaryImageUpload } from '../components/CloudinaryImageUpload'

export const Route = createFileRoute('/write/new')({
  head: () =>
    generateMeta({
      title: 'Create New Manuscript',
      description: 'Start publishing a new serialized literary work, novel, or essay series on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Create New Manuscript"
      description="Sign in to register your new literary folio, configure genre taxonomies, and begin publishing chapters."
      featureBadge="Author Creation"
    >
      <CreateWorkPage />
    </ProtectedRoute>
  ),
})

const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80'
]

function CreateWorkPage() {
  const { addWriterWork, categories, genres } = useApp()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0]?.name || 'Novels')
  const [genre, setGenre] = useState(genres[0]?.name || 'Literary Fiction')
  const [cover, setCover] = useState(SAMPLE_COVERS[0])
  const [tags, setTags] = useState('Isolation, Memory')
  const [language, setLanguage] = useState('English')
  const [status, setStatus] = useState<'Ongoing' | 'Completed'>('Ongoing')
  const [visibility, setVisibility] = useState<'Public' | 'Unlisted' | 'Draft'>('Public')
  const [isMature, setIsMature] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const parsedTags: string[] = tags
      ? tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : []

    const newId = addWriterWork({
      title: title.trim(),
      cover,
      status: 'Published',
      chaptersCount: 1,
      category,
      genre,
      tags: parsedTags,
    })

    // Navigate to chapter management or editor
    navigate({
      to: '/write/manage/$workId',
      params: { workId: newId }
    })
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Back button */}
      <Link
        to="/write"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] mb-6 no-underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Writer Studio</span>
      </Link>

      <div className="border-b border-[var(--border-subtle)] pb-6 mb-8">
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
          Create New Manuscript
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
          Set the foundational metadata, cover art, and publication parameters for your work.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-8">
        
        {/* Title & Subtitle */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Work Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. A Winter in Kyoto"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 font-serif text-lg text-[var(--ink-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ink-primary)] placeholder-[var(--ink-faint)]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Subtitle or Tagline (Optional)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. A Novel of Atmospheric Reconnaissance"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-serif italic text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--border-strong)] placeholder-[var(--ink-faint)]"
            />
          </div>
        </div>

        {/* Synopsis / Description */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Synopsis / Overview
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A compelling synopsis for readers browsing the library..."
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--ink-primary)] leading-relaxed focus:outline-none focus:border-[var(--border-strong)] placeholder-[var(--ink-faint)]"
          />
        </div>

        {/* Category & Genre */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
            >
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Primary Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
            >
              {GENRE_GROUPS.map((groupName) => {
                const groupGenres = genres.filter((g) => g.group === groupName)
                if (groupGenres.length === 0) return null
                return (
                  <optgroup key={groupName} label={groupName}>
                    {groupGenres.map((g) => (
                      <option key={g.slug} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>
        </div>

        {/* Cover Art Selector (Cloudinary Curated Gallery + Custom Upload) */}
        <div>
          <CloudinaryImageUpload
            label="Cover Artwork"
            currentImageUrl={cover}
            onImageUploaded={(url) => setCover(url)}
            onImageRemoved={() => setCover('')}
            folder="covers"
            recommendedDimensions="600 × 900 px"
            aspectRatioHint="Portrait (2:3)"
            maxSizeMb={10}
            allowPlatformPicker={true}
          />

          <div className="mt-2.5">
            <input
              type="text"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="Or paste external image URL..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-mono text-[var(--ink-muted)] focus:outline-none focus:border-[var(--border-strong)]"
            />
          </div>
        </div>

        {/* Tags & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Tags (Optional, comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Isolation, Memory, Urban, Slow‑Burn"
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
            />
            <p className="mt-1 text-[10px] text-[var(--ink-faint)] font-mono">
              Suggested: Isolation, Memory, Urban, Slow‑Burn, Dark, Identity
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
              Manuscript Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--border-strong)]"
            >
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="German">German</option>
              <option value="Japanese">Japanese</option>
              <option value="Spanish">Spanish</option>
            </select>
          </div>
        </div>

        {/* Status, Visibility, & Mature Toggle */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none"
              >
                <option value="Ongoing">Ongoing (Serialized Release)</option>
                <option value="Completed">Completed Work</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none"
              >
                <option value="Public">Public (Searchable in Discovery)</option>
                <option value="Unlisted">Unlisted (Direct Link Only)</option>
                <option value="Draft">Private Draft</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--ink-primary)]">Mature Content (18+)</p>
              <p className="text-[11px] text-[var(--ink-muted)]">Flag if work contains adult themes or explicit violence.</p>
            </div>
            <input
              type="checkbox"
              checked={isMature}
              onChange={(e) => setIsMature(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-strong)] accent-black"
            />
          </div>
        </div>

        {/* Form Action CTA */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <Link
            to="/write"
            className="rounded border border-[var(--border-subtle)] px-4 py-2.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors no-underline"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity shadow-xs"
          >
            <span>Create Work & Begin Writing</span>
          </button>
        </div>

      </form>

      {/* Right Column: Live Manuscript Preview */}
      <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-6">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] font-semibold">
              Live Card Preview
            </span>
            <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              {status}
            </span>
          </div>

          <div className="relative aspect-[3/4] w-full max-w-[220px] mx-auto overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] shadow-sm">
            <img
              src={cover}
              alt="Manuscript Cover"
              className="h-full w-full object-cover grayscale"
            />
          </div>

          <div className="text-center space-y-1">
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] line-clamp-2">
              {title || 'Untitled Manuscript'}
            </h3>
            {subtitle && (
              <p className="font-serif text-xs text-[var(--ink-muted)] italic line-clamp-1">
                {subtitle}
              </p>
            )}
            <p className="font-mono text-xs text-[var(--ink-faint)]">
              {category} • {genre}
            </p>
          </div>

          <p className="text-xs text-[var(--ink-muted)] line-clamp-3 text-center italic">
            {description || 'No synopsis added yet...'}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50 p-5 space-y-2.5 text-xs">
          <h4 className="font-serif font-semibold text-[var(--ink-primary)]">Publishing Checklist</h4>
          <ul className="space-y-1.5 text-[var(--ink-muted)] list-disc pl-4">
            <li>Title must be unique and descriptive</li>
            <li>High-resolution grayscale cover recommended</li>
            <li>First chapter draft created right after save</li>
          </ul>
        </div>
      </aside>

      </div>
    </div>
  )
}
