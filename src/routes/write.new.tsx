import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useUser } from '@clerk/react'
import { ALL_SUGGESTED_TAGS } from '../lib/taxonomy'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'
import { CloudinaryImageUpload } from '../components/CloudinaryImageUpload'
import defaultBookCover from '../assets/default-book-cover.webp'
import { MobileScreenSuggestionBanner } from '../components/studio'
import { createWriterWorkServerFn } from '../server/writer'
import {
  Button,
  DropdownSelect,
  Combobox,
  type SelectOption,
  type ComboboxOption,
} from '../design-system'
import { ArrowLeft, X } from 'lucide-react'

export const Route = createFileRoute('/write/new')({
  head: () =>
    generateMeta({
      title: 'Bind New Manuscript — Writer Studio',
      description: 'Register and bind a new serialized literary work, novel, or essay series on Hatchpen.',
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

const LANGUAGE_OPTIONS: SelectOption[] = [
  { id: 'English', label: 'English' },
  { id: 'French', label: 'French' },
  { id: 'German', label: 'German' },
  { id: 'Japanese', label: 'Japanese' },
  { id: 'Spanish', label: 'Spanish' },
  { id: 'Italian', label: 'Italian' },
  { id: 'Portuguese', label: 'Portuguese' },
]

const STATUS_OPTIONS: SelectOption[] = [
  { id: 'Ongoing', label: 'Ongoing (Serialized)' },
  { id: 'Completed', label: 'Completed Work' },
]

const VISIBILITY_OPTIONS: SelectOption[] = [
  { id: 'Draft', label: 'Private Draft' },
  { id: 'Public', label: 'Public Discovery' },
  { id: 'Unlisted', label: 'Unlisted' },
]

const POPULAR_SUGGESTIONS = [
  'Isolation',
  'Memory',
  'Urban',
  'Slow-Burn',
  'Dystopian',
  'Philosophy',
  'Mythology',
  'Psychological',
  'Noir',
]

function CreateWorkPage() {
  const { categories, genres, reloadWriterWorksFromDb, reloadWorksFromDb, showToast } = useApp()
  const { user } = useUser()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(categories[0]?.name || 'Novels')
  const [genre, setGenre] = useState(genres[0]?.name || 'Literary Fiction')
  const [cover, setCover] = useState<string>(defaultBookCover)
  const [selectedTags, setSelectedTags] = useState<string[]>(['Isolation', 'Memory'])
  const [tagInput, setTagInput] = useState('')
  const [language, setLanguage] = useState('English')
  const [status, setStatus] = useState<'Ongoing' | 'Completed'>('Ongoing')
  const [visibility, setVisibility] = useState<'Public' | 'Unlisted' | 'Draft'>('Draft')
  const [isMature, setIsMature] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Map categories to Combobox options (sorted alphabetically)
  const categoryOptions: ComboboxOption[] = useMemo(() => {
    return [...categories]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cat) => ({
        id: cat.name,
        label: cat.name,
        description: cat.description,
      }))
  }, [categories])

  // Map genres to Combobox options (sorted alphabetically)
  const genreOptions: ComboboxOption[] = useMemo(() => {
    return [...genres]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((g) => ({
        id: g.name,
        label: g.name,
        description: g.group ? `${g.group}` : undefined,
        badge: g.group || undefined,
      }))
  }, [genres])

  // Synchronize Religion & Spirituality with Faith & Spirituality bidirectionally
  const handleCategoryChange = (val: string) => {
    setCategory(val)
    if (val.toLowerCase().includes('religion')) {
      const match = genres.find(
        (g) => g.name.toLowerCase().includes('faith') || g.slug === 'faith-spirituality'
      )
      if (match) {
        setGenre(match.name)
      } else {
        setGenre('Faith & Spirituality')
      }
    }
  }

  const handleGenreChange = (val: string) => {
    setGenre(val)
    if (val.toLowerCase().includes('faith')) {
      const match = categories.find(
        (c) => c.name.toLowerCase().includes('religion') || c.slug === 'religion-spirituality'
      )
      if (match) {
        setCategory(match.name)
      } else {
        setCategory('Religion & Spirituality')
      }
    }
  }

  // Handle adding a tag
  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^[#,\s]+|[,\s]+$/g, '')
    if (clean && !selectedTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setSelectedTags([...selectedTags, clean])
    }
    setTagInput('')
  }

  // Handle removing a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Please enter a manuscript title')
      return
    }
    if (!user) {
      showToast('Please sign in to register a manuscript')
      return
    }

    try {
      setIsSubmitting(true)
      const isDefaultCover = !cover || cover === defaultBookCover || cover.includes('default-book-cover')
      const res = await createWriterWorkServerFn({
        data: {
          clerkUserId: user.id,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          description: description.trim() || undefined,
          categoryName: category,
          genreName: genre,
          cover: isDefaultCover ? undefined : cover.trim(),
          tags: selectedTags,
          language,
          status,
          visibility,
          includeInitialAct: false,
        },
      })

      showToast('Manuscript successfully registered!')

      // Sync writer works and global platform works
      await Promise.all([
        reloadWriterWorksFromDb(),
        reloadWorksFromDb(),
      ])

      // Navigate to manuscript manage page
      navigate({
        to: '/write/manage/$workId',
        params: { workId: res.workId },
      })
    } catch (err: any) {
      console.error('[CreateWorkPage] Manuscript creation error:', err)
      showToast(err?.message || 'Failed to create manuscript')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] pb-16">
      {/* Mobile Route Header */}
      <RouteHeader
        title="Bind Manuscript"
        subtitle="Register and configure your new work"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        {/* Mobile Advisory Banner for Larger Screens */}
        <MobileScreenSuggestionBanner
          className="mb-6"
          storageKey="hatchpen_dismiss_new_work_desktop_banner"
          title="Best Experienced on Desktop"
          message="Manuscript binding, cover formatting, and synopsis drafting are designed for wider displays. Consider switching to a desktop or laptop for the smoothest experience."
        />

        {/* Desktop Breadcrumbs & Header */}
        <div className="hidden sm:block pb-6 border-b border-[var(--border-subtle)] mb-8">
          <Link
            to="/write"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors mb-3 no-underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Writer's Studio</span>
          </Link>

          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
            Bind a New Manuscript
          </h1>
          <p className="font-serif italic text-xs sm:text-sm text-[var(--ink-muted)] mt-1">
            Establish the title, cover artwork, and literary taxonomy for your serialized folio.
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Manuscript Identity, Taxonomy, Parameters (7-8 cols) */}
            <div className="order-1 lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Section 1: Premise & Identity */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="pb-3 border-b border-[var(--border-subtle)]">
                  <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    Manuscript Identity
                  </h2>
                  <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-0.5">
                    The primary title and premise of your work
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. A Winter in Kyoto"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2.5 font-serif text-base sm:text-lg text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] placeholder-[var(--ink-faint)] transition-colors"
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
                    placeholder="e.g. A serialized study of atmospheric silence"
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-2 font-serif italic text-xs sm:text-sm text-[var(--ink-secondary)] focus:outline-none focus:border-[var(--ink-primary)] placeholder-[var(--ink-faint)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Synopsis / Overview
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A compelling synopsis for readers browsing your folio..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-3 text-xs text-[var(--ink-primary)] leading-relaxed focus:outline-none focus:border-[var(--ink-primary)] placeholder-[var(--ink-faint)] transition-colors resize-y"
                  />
                </div>
              </div>

              {/* Section 2: Taxonomy & Classification */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="pb-3 border-b border-[var(--border-subtle)]">
                  <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    Literary Taxonomy
                  </h2>
                  <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-0.5">
                    Classify your work to help readers discover it in the catalog
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                      Category
                    </label>
                    <Combobox
                      options={categoryOptions}
                      value={category}
                      onChange={handleCategoryChange}
                      placeholder="Search or select category..."
                      size="md"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                      Primary Genre
                    </label>
                    <Combobox
                      options={genreOptions}
                      value={genre}
                      onChange={handleGenreChange}
                      placeholder="Search or select genre..."
                      size="md"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                    Manuscript Language
                  </label>
                  <div className="sm:w-1/2">
                    <DropdownSelect
                      options={LANGUAGE_OPTIONS}
                      value={language}
                      onChange={(val) => setLanguage(val)}
                      size="md"
                    />
                  </div>
                </div>

                {/* Tags Selector */}
                <div className="pt-2 space-y-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                    Thematic Tags
                  </label>

                  {/* Selected Tags Pills */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      {selectedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)] select-none"
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tag Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDownTag}
                      placeholder="Type a tag and press Enter..."
                      className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] placeholder-[var(--ink-faint)]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTag(tagInput)}
                      disabled={!tagInput.trim()}
                    >
                      Add Tag
                    </Button>
                  </div>

                  {/* Popular Suggested Tags */}
                  <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px] font-mono text-[var(--ink-muted)]">
                    <span className="text-[10px] text-[var(--ink-faint)] mr-1">Suggestions:</span>
                    {POPULAR_SUGGESTIONS.map((sug) => {
                      const isAdded = selectedTags.some((t) => t.toLowerCase() === sug.toLowerCase())
                      return (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => handleAddTag(sug)}
                          disabled={isAdded}
                          className={`rounded px-1.5 py-0.5 transition-colors cursor-pointer text-[10px] ${
                            isAdded
                              ? 'opacity-40 cursor-default'
                              : 'bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--ink-secondary)]'
                          }`}
                        >
                          +{sug}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Section 3: Serialization Parameters */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-5 shadow-2xs">
                <div className="pb-3 border-b border-[var(--border-subtle)]">
                  <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    Serialization Parameters
                  </h2>
                  <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-0.5">
                    Choose how your manuscript will be released to readers
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Publication Status Dropdown */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                      Publication Status
                    </label>
                    <DropdownSelect
                      options={STATUS_OPTIONS}
                      value={status}
                      onChange={(val) => setStatus(val as any)}
                      size="md"
                    />
                  </div>

                  {/* Catalog Visibility Dropdown */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
                      Catalog Visibility
                    </label>
                    <DropdownSelect
                      options={VISIBILITY_OPTIONS}
                      value={visibility}
                      onChange={(val) => setVisibility(val as any)}
                      size="md"
                    />
                  </div>
                </div>

                {/* Mature Content Switch */}
                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[var(--ink-primary)]">Mature Content (18+)</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">Flag if work contains adult themes or explicit violence.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMature}
                    onChange={(e) => setIsMature(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-black cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Cover Artwork (4-5 cols) */}
            <aside className="order-2 lg:col-span-5 xl:col-span-4 sticky top-20 space-y-6">
              {/* Cover Artwork Card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 space-y-4 shadow-2xs">
                <div className="pb-3 border-b border-[var(--border-subtle)]">
                  <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                    Cover Artwork
                  </h2>
                  <p className="font-serif italic text-xs text-[var(--ink-muted)] mt-0.5">
                    Default editorial cover active. Upload custom artwork or keep the default.
                  </p>
                </div>

                <CloudinaryImageUpload
                  label="Cover Artwork"
                  currentImageUrl={cover}
                  onImageUploaded={(url) => setCover(url)}
                  onImageRemoved={() => setCover(defaultBookCover)}
                  folder="covers"
                  recommendedDimensions="600 × 900 px"
                  aspectRatioHint="Portrait (2:3)"
                  maxSizeMb={10}
                  allowPlatformPicker={true}
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] pt-1">
                  {cover === defaultBookCover || cover.includes('default-book-cover') ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Default editorial cover active
                    </span>
                  ) : (
                    <span>Custom artwork selected</span>
                  )}
                  {cover !== defaultBookCover && !cover.includes('default-book-cover') && (
                    <button
                      type="button"
                      onClick={() => setCover(defaultBookCover)}
                      className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline cursor-pointer"
                    >
                      Reset to Default Cover
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1">
                    Or External Image URL
                  </label>
                  <input
                    type="text"
                    value={cover === defaultBookCover ? '' : cover}
                    onChange={(e) => setCover(e.target.value || defaultBookCover)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3 py-1.5 text-xs font-mono text-[var(--ink-muted)] focus:outline-none focus:border-[var(--ink-primary)]"
                  />
                </div>
              </div>
            </aside>

            {/* Form CTA Actions */}
            <div className="order-3 lg:col-span-7 xl:col-span-8 pt-6 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <Link to="/write" className="no-underline">
                <Button variant="outline" size="md" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </Link>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                disabled={!title.trim() || isSubmitting}
                className="w-full sm:w-auto"
              >
                Bind Manuscript & Begin Chapter 1
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
