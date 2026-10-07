import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/react'
import { useNavigate } from '@tanstack/react-router'
import {
  Modal,
  Button,
  OptionPicker,
  DropdownSelect,
  MultiDropdownSelect,
  Tags,
  Badge,
  type Option,
  type SelectOption,
  type MultiSelectOption,
  type Tag,
} from '../design-system'
import { saveUserOnboardingServerFn } from '../server/authors'
import { Check, Sparkles, BookOpen, User, Layers, ArrowRight, ShieldCheck, ExternalLink, HelpCircle } from 'lucide-react'

// Standard Pronouns List
const PRONOUN_OPTIONS: SelectOption[] = [
  { id: 'she_her', label: 'She / Her' },
  { id: 'he_him', label: 'He / Him' },
  { id: 'they_them', label: 'They / Them' },
  { id: 'any_all', label: 'Any / All Pronouns' },
  { id: 'prefer_not_say', label: 'Prefer not to say' },
  { id: 'other', label: 'Other' },
]

// Standard Gender List
const GENDER_OPTIONS: SelectOption[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'non_binary', label: 'Non-binary' },
  { id: 'genderqueer', label: 'Genderqueer' },
  { id: 'prefer_not_say', label: 'I prefer not to say' },
  { id: 'other', label: 'Other' },
]

// Standard Interests (Array of objects)
export const STANDARD_INTERESTS: Array<{ id: string; name: string }> = [
  { id: 'fiction', name: 'Fiction' },
  { id: 'romance', name: 'Romance' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'scifi', name: 'Science Fiction' },
  { id: 'historical', name: 'Historical Fiction' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'essays', name: 'Essays' },
  { id: 'memoir', name: 'Memoir & Creative Non-Fiction' },
  { id: 'literary_journalism', name: 'Literary Journalism' },
  { id: 'world_literature', name: 'World Literature' },
]

// Standard Genres (Array of objects from database taxonomy)
export const STANDARD_GENRES: Array<{ id: string; name: string }> = [
  { id: 'romance', name: 'Romance' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'mystery', name: 'Mystery' },
  { id: 'horror', name: 'Horror' },
  { id: 'science-fiction', name: 'Science Fiction' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'historical', name: 'Historical' },
  { id: 'adventure', name: 'Adventure' },
  { id: 'drama', name: 'Drama' },
  { id: 'comedy', name: 'Comedy' },
]

// Standard Categories (Array of objects from database taxonomy)
export const STANDARD_CATEGORIES: Array<{ id: string; name: string }> = [
  { id: 'fiction', name: 'Fiction' },
  { id: 'novels', name: 'Novels' },
  { id: 'short-stories', name: 'Short Stories' },
  { id: 'poetry', name: 'Poetry' },
  { id: 'essays', name: 'Essays' },
  { id: 'creative-non-fiction', name: 'Creative Non-Fiction' },
  { id: 'personal-narratives', name: 'Personal Narratives' },
  { id: 'childrens-stories', name: "Children's Stories" },
  { id: 'scripts', name: 'Scripts' },
  { id: 'fan-fiction', name: 'Fan Fiction' },
  { id: 'serialized-stories', name: 'Serialized Stories' },
]

export function UserOnboardingModal() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1 State:
  // - Username (string)
  // - Pronouns (dropdown)
  // - Gender (dropdown)
  // - Terms and conditions (checkbox)
  const [username, setUsername] = useState('')
  const [pronounOption, setPronounOption] = useState<SelectOption>(PRONOUN_OPTIONS[0])
  const [genderOption, setGenderOption] = useState<SelectOption>(GENDER_OPTIONS[0])
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Step 2 State:
  // - Interests (array of objects)
  // - Genres (array of objects)
  // - Categories (array of objects)
  const [selectedInterests, setSelectedInterests] = useState<Array<{ id: string; name: string }>>([
    { id: 'fiction', name: 'Fiction' },
    { id: 'romance', name: 'Romance' },
  ])
  const [selectedGenres, setSelectedGenres] = useState<Array<{ id: string; name: string }>>([
    { id: 'romance', name: 'Romance' },
    { id: 'fantasy', name: 'Fantasy' },
  ])
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>([
    { id: 'novels', name: 'Novels' },
    { id: 'short-stories', name: 'Short Stories' },
  ])

  // Check if onboarding is needed when a signed-in user loads
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      setIsOpen(false)
      return
    }

    const checkOnboardingStatus = () => {
      // Must have signed up / authenticated via Google
      const isGoogleUser =
        user.externalAccounts?.some((acc: any) =>
          acc.provider === 'google' || acc.verification?.strategy === 'oauth_google'
        ) ||
        (typeof window !== 'undefined' && sessionStorage.getItem('hatchpen_just_signed_up_google') === 'true')

      if (!isGoogleUser) {
        return
      }

      // Check local storage flag first
      const key = `hatchpen_onboarding_completed_${user.id}`
      const localCompleted = localStorage.getItem(key)
      if (localCompleted === 'true') {
        return
      }

      // Check Clerk user public metadata
      const clerkMeta = (user.publicMetadata as any) || {}
      if (clerkMeta.onboardingCompleted) {
        localStorage.setItem(key, 'true')
        return
      }

      // Prepopulate username from Clerk
      const defaultUser =
        user.username ||
        user.primaryEmailAddress?.emailAddress?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '')?.toLowerCase() ||
        ''
      setUsername((prev) => prev || defaultUser)

      // Open onboarding modal for new Google sign up user
      setIsOpen(true)
    }

    checkOnboardingStatus()
  }, [isLoaded, isSignedIn, user])

  // Validation for Step 1
  const isStep1Valid =
    username.trim().length >= 3 &&
    /^[a-z0-9_]{3,30}$/i.test(username.trim()) &&
    termsAccepted

  // Handlers for Step 1 -> Step 2
  const handleProceedToStep2 = () => {
    if (!isStep1Valid) {
      if (!termsAccepted) {
        setErrorMessage('Please accept the Hatchpen Terms & Conditions to proceed.')
      } else if (username.trim().length < 3) {
        setErrorMessage('Username must be at least 3 characters.')
      } else {
        setErrorMessage('Username may only contain letters, numbers, and underscores.')
      }
      return
    }
    setErrorMessage(null)
    setStep(2)
  }

  // Submission handler for Step 2
  const handleCompleteOnboarding = async () => {
    if (!user) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // 1. Save onboarding details into DB via TanStack Start Server Function
      const displayName =
        user.fullName ||
        user.firstName ||
        username.trim() ||
        'Hatchpen Author'

      await saveUserOnboardingServerFn({
        data: {
          clerkUserId: user.id,
          username: username.trim().toLowerCase(),
          displayName,
          avatarUrl: user.imageUrl || '/unisex-avatar.svg',
          pronouns: pronounOption.label || pronounOption.id,
          gender: genderOption.label || genderOption.id,
          termsAccepted: true,
          interests: selectedInterests,
          genres: selectedGenres,
          categories: selectedCategories,
        },
      })

      // 2. Mark completed in Clerk user public metadata if possible
      try {
        if (typeof (user as any).update === 'function') {
          await (user as any).update({
            username: username.trim().toLowerCase(),
          })
        }
      } catch (clerkErr) {
        // Clerk username might conflict or be immutable in some OAuth configs
      }

      // 3. Mark completed in localStorage for instantaneous UX
      localStorage.setItem(`hatchpen_onboarding_completed_${user.id}`, 'true')
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hatchpen_just_signed_up_google')
      }
      localStorage.setItem(
        `hatchpen_user_profile_data_${user.id}`,
        JSON.stringify({
          username: username.trim().toLowerCase(),
          pronouns: pronounOption.label || pronounOption.id,
          gender: genderOption.label || genderOption.id,
          interests: selectedInterests,
          genres: selectedGenres,
          categories: selectedCategories,
        })
      )

      // 4. Close modal and redirect to /profile
      setIsOpen(false)
      navigate({ to: '/profile' })
    } catch (err: any) {
      console.error('[UserOnboardingModal] Failed to save onboarding:', err)
      setErrorMessage(err?.message || 'Failed to save onboarding details. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          // Strict onboarding modal: keep open until step 2 completes
        }}
        size="lg"
        title={step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
        description={
          step === 1
            ? 'Set your username and pronouns to get started on Hatchpen.'
            : 'Personalize your reading and writing preferences.'
        }
      >
        <div className="space-y-6 pt-1">

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Username Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Username / Pen Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-[var(--ink-faint)]">Letters, numbers, underscores (3-30 chars)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[var(--ink-faint)]">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      setErrorMessage(null)
                    }}
                    placeholder="julian_thorne"
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-sm font-mono text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                  />
                </div>
              </div>

              {/* Pronouns and Gender row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pronouns Dropdown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                      Pronouns <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <DropdownSelect
                    options={PRONOUN_OPTIONS}
                    value={pronounOption.id}
                    onChange={(val, opt) => setPronounOption(opt)}
                    size="md"
                    placeholder="Select pronouns..."
                  />
                </div>

                {/* Gender Dropdown */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <DropdownSelect
                    options={GENDER_OPTIONS}
                    value={genderOption.id}
                    onChange={(val, opt) => setGenderOption(opt)}
                    size="md"
                    placeholder="Select gender..."
                  />
                </div>
              </div>

              {/* Terms and Conditions Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked)
                      setErrorMessage(null)
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-0 cursor-pointer"
                  />
                  <div className="text-xs text-[var(--ink-secondary)] leading-relaxed space-y-0.5">
                    <span className="font-semibold text-[var(--ink-primary)]">
                      I accept the Hatchpen Terms & Publishing Conditions
                    </span>
                    <p className="text-[11px] text-[var(--ink-muted)]">
                      I agree to the intellectual property guidelines, serialized publishing ethics, and reader safety standards.{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowTermsModal(true)
                        }}
                        className="underline text-[var(--ink-primary)] hover:opacity-80 font-medium inline-flex items-center gap-0.5"
                      >
                        Read terms <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  onClick={handleProceedToStep2}
                  disabled={!isStep1Valid}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Continue to Step 2
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Interests Dropdown */}
              <div className="space-y-1.5">
                <MultiDropdownSelect
                  label="Interests"
                  options={STANDARD_INTERESTS.map((i) => ({ id: i.id, label: i.name }))}
                  selectedValues={selectedInterests.map((i) => i.id)}
                  onChange={(vals, opts) =>
                    setSelectedInterests(opts.map((o) => ({ id: o.id, name: o.label })))
                  }
                  placeholder="Select literary interests..."
                  size="md"
                />
              </div>

              {/* Genres Dropdown */}
              <div className="space-y-1.5">
                <MultiDropdownSelect
                  label="Genres"
                  options={STANDARD_GENRES.map((g) => ({ id: g.id, label: g.name }))}
                  selectedValues={selectedGenres.map((g) => g.id)}
                  onChange={(vals, opts) =>
                    setSelectedGenres(opts.map((o) => ({ id: o.id, name: o.label })))
                  }
                  placeholder="Select preferred genres..."
                  size="md"
                />
              </div>

              {/* Categories Dropdown */}
              <div className="space-y-1.5">
                <MultiDropdownSelect
                  label="Categories"
                  options={STANDARD_CATEGORIES.map((c) => ({ id: c.id, label: c.name }))}
                  selectedValues={selectedCategories.map((c) => c.id)}
                  onChange={(vals, opts) =>
                    setSelectedCategories(opts.map((o) => ({ id: o.id, name: o.label })))
                  }
                  placeholder="Select reading categories..."
                  size="md"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  ← Back to Step 1
                </Button>

                <Button
                  variant="primary"
                  isLoading={isSubmitting}
                  onClick={handleCompleteOnboarding}
                  rightIcon={<Check className="h-4 w-4" />}
                >
                  {isSubmitting ? 'Saving to Database...' : 'Complete & Open Profile'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Embedded Terms & Conditions Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Hatchpen Literary Terms & Publishing Conditions"
        description="Version 2.4 — Updated October 2026"
        size="lg"
      >
        <div className="space-y-4 text-xs text-[var(--ink-secondary)] leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section className="space-y-1">
            <h4 className="font-serif font-semibold text-sm text-[var(--ink-primary)]">1. Intellectual Property & Author Rights</h4>
            <p>
              Authors retain 100% full copyright ownership over their serialized novels, poetry folios, short stories, and manuscripts published on Hatchpen. You grant Hatchpen a non-exclusive license to format, distribute, and display your work to readers across our digital library.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-serif font-semibold text-sm text-[var(--ink-primary)]">2. Originality & Editorial Integrity</h4>
            <p>
              All works submitted must be original creations or properly licensed adaptations. Plagiarism, unauthorized reproduction of copyrighted texts, and deceptive impersonation of existing authors are strictly prohibited and will result in immediate folio suspension.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-serif font-semibold text-sm text-[var(--ink-primary)]">3. Content Moderation & Content Ratings</h4>
            <p>
              Works exploring mature, intense, or graphic themes must be appropriately rated (General, Teen, or Mature) and tagged with corresponding content warnings prior to publication.
            </p>
          </section>

          <section className="space-y-1">
            <h4 className="font-serif font-semibold text-sm text-[var(--ink-primary)]">4. Reader Community Conduct</h4>
            <p>
              Constructive critique, respectful literary commentary, and thoughtful feedback are celebrated. Harassment, hate speech, and abusive interactions in chapter margins or book clubs are subject to moderation.
            </p>
          </section>

          <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setTermsAccepted(true)
                setShowTermsModal(false)
              }}
            >
              I Understand & Accept
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default UserOnboardingModal
