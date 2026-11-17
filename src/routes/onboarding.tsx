import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import React, { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import { DropdownSelect, type SelectOption } from '../design-system'
import { saveUserOnboardingServerFn, getUserOnboardingStatusServerFn } from '../server/authors'
import { verifyUsernameAvailabilityServerFn } from '../server/settings'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy'
import { generateMeta } from '../lib/seo'

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

// Standard Genres from platform taxonomy (alphabetically sorted)
export const STANDARD_GENRES: Array<{ id: string; name: string }> = GLOBAL_GENRES.map((g) => ({
  id: g.slug,
  name: g.name,
})).sort((a, b) => a.name.localeCompare(b.name))

// Standard Categories from platform taxonomy (alphabetically sorted)
export const STANDARD_CATEGORIES: Array<{ id: string; name: string }> = GLOBAL_CATEGORIES.map((c) => ({
  id: c.slug,
  name: c.name,
})).sort((a, b) => a.name.localeCompare(b.name))

interface OnboardingSearch {
  step?: number
}

export const Route = createFileRoute('/onboarding')({
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => ({
    step: typeof search.step === 'number' ? search.step : Number(search.step) || undefined,
  }),
  head: () =>
    generateMeta({
      title: 'Complete Your Profile — HatchPen',
      description: 'Set up your pen name and personalize your reading preferences on HatchPen.',
      noindex: true,
    }),
  component: OnboardingPage,
})

export default function OnboardingPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const { user, isLoaded, isSignedIn } = useUser()

  const [step, setStep] = useState<1 | 2>(() => (search.step === 2 ? 2 : 1))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1 State:
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pronounOption, setPronounOption] = useState<SelectOption>(PRONOUN_OPTIONS[0])
  const [genderOption, setGenderOption] = useState<SelectOption>(GENDER_OPTIONS[0])
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isVerifyingUsername, setIsVerifyingUsername] = useState(false)
  const [usernameVerification, setUsernameVerification] = useState<{
    available: boolean
    message: string
    verifiedHandle?: string
  } | null>(null)

  // Step 2 State (empty by default):
  const [selectedGenres, setSelectedGenres] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>([])
  const [interestedInWriting, setInterestedInWriting] = useState(false)

  // Hydrate profile data from DB
  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user) {
      navigate({ to: '/login', search: { returnUrl: '/onboarding' }, replace: true })
      return
    }

    const loadProfile = async () => {
      try {
        const existingProfile = await getUserOnboardingStatusServerFn({ data: user.id })
        
        // If already completed and user did not explicitly request step 2
        if (existingProfile?.onboarding_completed && !search.step) {
          navigate({ to: '/', replace: true })
          return
        }

        const defaultUser =
          existingProfile?.username ||
          user.username ||
          user.primaryEmailAddress?.emailAddress?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '')?.toLowerCase() ||
          ''
        setUsername(defaultUser)

        const initialName =
          user.fullName ||
          user.firstName ||
          defaultUser ||
          'Reader'
        setDisplayName(initialName)

        // Restore verified status directly from DB if previously verified
        if (
          existingProfile &&
          (existingProfile.is_username_verified || existingProfile.preferences?.username_verified)
        ) {
          const verifiedHandle = existingProfile.preferences?.verified_username || defaultUser || existingProfile.username
          if (verifiedHandle) {
            setUsername(verifiedHandle)
            setUsernameVerification({
              available: true,
              message: `@${verifiedHandle} is verified!`,
              verifiedHandle,
            })
          }
        }

        // Restore saved genres
        if (Array.isArray(existingProfile?.preferences?.genres) && existingProfile.preferences.genres.length > 0) {
          const existingGenres = existingProfile.preferences.genres.map((g: any) =>
            typeof g === 'string' ? { id: g, name: g } : g
          )
          setSelectedGenres(existingGenres)
        }
      } catch (err) {
        console.warn('[OnboardingPage] Failed to load profile:', err)
      }
    }

    loadProfile()
  }, [isLoaded, isSignedIn, user, search.step, navigate])

  // Sync step from search param
  useEffect(() => {
    if (search.step === 2) {
      setStep(2)
    } else if (search.step === 1) {
      setStep(1)
    }
  }, [search.step])

  // Username validation helper (3-30 letters, numbers, underscores)
  const validateUsernameFormat = (value: string): boolean => {
    return /^[a-z0-9_]{3,30}$/i.test(value)
  }

  // Handle Pen Name / Username Input Change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(val)
    setUsernameVerification(null)
    setErrorMessage(null)
  }

  // Handle Verify Username Availability
  const handleVerifyUsername = async () => {
    if (!username) {
      setErrorMessage('Please enter a pen name.')
      return
    }

    if (!validateUsernameFormat(username)) {
      setErrorMessage('Pen name must be 3-30 characters with letters, numbers, and underscores only.')
      return
    }

    setIsVerifyingUsername(true)
    setErrorMessage(null)

    try {
      const res = await verifyUsernameAvailabilityServerFn({
        data: {
          username: username.trim(),
          currentUserId: user?.id,
        },
      })

      if (res?.available) {
        setUsernameVerification({
          available: true,
          message: `@${username} is available!`,
          verifiedHandle: username,
        })
      } else {
        setUsernameVerification({
          available: false,
          message: res?.message || `@${username} is already taken. Try another name.`,
        })
      }
    } catch {
      setUsernameVerification({
        available: false,
        message: 'Could not verify availability. Please try again.',
      })
    } finally {
      setIsVerifyingUsername(false)
    }
  }

  // Step 1: Proceed to Step 2
  const handleContinueToStep2 = () => {
    if (!username.trim()) {
      setErrorMessage('Please enter an official pen name.')
      return
    }

    if (!validateUsernameFormat(username)) {
      setErrorMessage('Pen name must be 3-30 characters with letters, numbers, and underscores only.')
      return
    }

    if (!usernameVerification?.available || usernameVerification.verifiedHandle !== username) {
      setErrorMessage('Please verify your pen name availability before continuing.')
      return
    }

    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.')
      return
    }

    setErrorMessage(null)
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Step 2: Toggle Genre
  const handleToggleGenre = (genre: { id: string; name: string }) => {
    const exists = selectedGenres.some((g) => g.id === genre.id)
    if (exists) {
      setSelectedGenres(selectedGenres.filter((g) => g.id !== genre.id))
      setErrorMessage(null)
      return
    }

    if (selectedGenres.length >= 5) {
      return // Silent ceiling
    }

    setSelectedGenres([...selectedGenres, genre])
    setErrorMessage(null)
  }

  // Step 2: Complete Onboarding Submission
  const handleCompleteOnboarding = async () => {
    if (!user || isSubmitting) return

    if (selectedGenres.length === 0) {
      setErrorMessage('Please select at least 1 reading genre to personalize your reading feed.')
      return
    }

    if (selectedGenres.length > 5) {
      setErrorMessage('You may select a maximum of 5 genres.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const email = user.primaryEmailAddress?.emailAddress || ''
      const profile = await saveUserOnboardingServerFn({
        data: {
          clerkUserId: user.id,
          username: (usernameVerification?.verifiedHandle || username).toLowerCase().trim(),
          displayName: displayName.trim() || username,
          avatarUrl: user.imageUrl || '/unisex-avatar.svg',
          email,
          pronouns: pronounOption.label || pronounOption.id,
          gender: genderOption.label || genderOption.id,
          termsAccepted: true,
          genres: selectedGenres,
          interests: selectedGenres,
          categories: selectedCategories,
          interestedInWriting,
        },
      })

      if (!profile || !profile.id) {
        throw new Error('Failed to complete profile setup. Please try again.')
      }

      // Update Clerk username if supported
      try {
        if (typeof (user as any).update === 'function') {
          await (user as any).update({
            username: (usernameVerification?.verifiedHandle || username).toLowerCase().trim(),
          })
        }
      } catch {}

      if (typeof window !== 'undefined') {
        localStorage.setItem(`hatchpen_onboarding_completed_${user.id}`, 'true')
        localStorage.setItem(`hatchpen_new_voices_popup_dismissed_${user.id}`, 'true')
        sessionStorage.removeItem('hatchpen_signup_source')
        localStorage.removeItem('hatchpen_signup_source')
        window.dispatchEvent(new CustomEvent('hatchpen:onboarding-completed', { detail: { userId: user.id } }))
        window.dispatchEvent(new CustomEvent('hatchpen:reader-gate-cleared'))
      }

      await router.invalidate()

      if (interestedInWriting) {
        navigate({ to: '/write', replace: true })
      } else {
        let returnUrl: string | null = null
        if (typeof window !== 'undefined') {
          const saved = sessionStorage.getItem('hatchpen_auth_return_url')
          if (saved && saved.startsWith('/') && !saved.startsWith('/onboarding') && !saved.startsWith('/sso-callback') && saved !== '/') {
            sessionStorage.removeItem('hatchpen_auth_return_url')
            returnUrl = saved
          }
        }
        if (returnUrl) {
          navigate({ to: returnUrl as any, replace: true })
        } else {
          navigate({ to: '/', replace: true })
        }
      }
    } catch (err: any) {
      console.error('[OnboardingPage] Failed to save onboarding:', err)
      setErrorMessage(err?.message || 'Something went wrong while saving your preferences. Please try again.')
      setIsSubmitting(false)
    }
  }

  const isStep1Valid =
    Boolean(username.trim()) &&
    validateUsernameFormat(username) &&
    Boolean(usernameVerification?.available && usernameVerification.verifiedHandle === username) &&
    termsAccepted

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-8 sm:py-16 bg-[var(--bg-canvas)]">
      {/* Centered Form Container (Standard Card Width) */}
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#111722] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xs transition-colors">
        {/* Step Indicator */}
        <div className="text-center mb-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
            Step {step} of 2
          </span>
        </div>

        {/* STEP 1: Personal Details */}
        {step === 1 && (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100 text-center mb-1.5">
              Personal Details
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6 leading-relaxed">
              Choose your official pen name and display name to set up your profile.
            </p>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              {/* Pen Name / Official Handle */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Official Pen Name (Username)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={handleUsernameChange}
                      placeholder="pen_name"
                      maxLength={30}
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyUsername}
                    disabled={isVerifyingUsername || !username.trim()}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifyingUsername ? 'Checking...' : 'Check'}
                  </button>
                </div>

                {usernameVerification && (
                  <p
                    className={`mt-1.5 text-xs font-medium ${
                      usernameVerification.available
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {usernameVerification.message}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  3–30 characters. Letters, numbers, and underscores only. Locked for 32 days after setup.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name or Pen Title"
                  maxLength={50}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-colors"
                />
              </div>

              {/* Pronouns & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Pronouns
                  </label>
                  <DropdownSelect
                    options={PRONOUN_OPTIONS}
                    value={pronounOption}
                    onChange={setPronounOption}
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Gender (Optional)
                  </label>
                  <DropdownSelect
                    options={GENDER_OPTIONS}
                    value={genderOption}
                    onChange={setGenderOption}
                    size="sm"
                  />
                </div>
              </div>

              {/* Terms and Privacy Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 leading-tight">
                    I agree to the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-neutral-900 dark:text-neutral-100 font-medium"
                    >
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-neutral-900 dark:text-neutral-100 font-medium"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </div>

              {/* Full Width Container Button (Matches Container Width) */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleContinueToStep2}
                  disabled={!isStep1Valid}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Reading Preferences */}
        {step === 2 && (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 dark:text-neutral-100 text-center mb-1.5">
              Reading Preferences
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6 leading-relaxed">
              Select the genres you enjoy reading to personalize your stories feed (select 1 to 5).
            </p>

            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Genre Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {STANDARD_GENRES.map((genre) => {
                const isSelected = selectedGenres.some((g) => g.id === genre.id)
                const isCeilingReached = selectedGenres.length >= 5 && !isSelected

                return (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => handleToggleGenre(genre)}
                    disabled={isCeilingReached}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : isCeilingReached
                        ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-300 dark:text-neutral-700 cursor-not-allowed border border-transparent'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent'
                    }`}
                  >
                    {genre.name}
                  </button>
                )
              })}
            </div>

            {/* Writer Intent Checkbox */}
            <div className="mb-6 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={interestedInWriting}
                  onChange={(e) => setInterestedInWriting(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-neutral-900"
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                  I am interested in writing and publishing stories on HatchPen
                </span>
              </label>
            </div>

            {/* Action Buttons: Container-width Submit & Back */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={isSubmitting || selectedGenres.length === 0}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Saving Profile...' : 'Complete Profile'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setErrorMessage(null)
                }}
                disabled={isSubmitting}
                className="w-full py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Back to Personal Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
