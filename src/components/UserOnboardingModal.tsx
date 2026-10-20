/**
 * ==============================================================================
 * LOCKED SPECIFICATION: User Onboarding Modal Flow (Canonical & Immutable)
 * Reference: Section 8 in rules.md
 * 
 * Rules:
 * 1. Strict Durability: Aborting midway keeps onboarding_completed = false.
 * 2. Step 1: Pen name + Unique username with exclamation tooltip rules + terms modal.
 * 3. Step 2: Empty defaults. Min 3, max 5 genres. Max 3 categories.
 * 4. Silent ceiling: No intrusive maximum error banners; dimmed chips.
 * 5. Mobile-first footer: w-full centered primary CTA, back button underneath.
 * 6. Option 1 Transition: 1.3s aesthetic personalization interstitial + router.invalidate.
 * 7. Background scroll locked on desktop (html + body + wheel) and mobile.
 * 
 * DO NOT MODIFY OR REFACTOR THIS FLOW WITHOUT EXPLICIT PERMISSION FROM USER.
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { motion } from 'motion/react'
import {
  Modal,
  Button,
  DropdownSelect,
  type SelectOption,
} from '../design-system'
import { saveUserOnboardingServerFn, getUserProfileServerFn } from '../server/authors'
import { Check, ArrowRight, ArrowLeft, ExternalLink, PenLine, Sparkles, BookOpen } from 'lucide-react'
import { GLOBAL_CATEGORIES, GLOBAL_GENRES } from '../lib/taxonomy'
import { calculateFiveMonthExpiration } from '../lib/recommendations/newVoices'

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

// Standard Genres from platform taxonomy
export const STANDARD_GENRES: Array<{ id: string; name: string }> = GLOBAL_GENRES.map((g) => ({
  id: g.slug,
  name: g.name,
}))

// Standard Categories from platform taxonomy
export const STANDARD_CATEGORIES: Array<{ id: string; name: string }> = GLOBAL_CATEGORIES.map((c) => ({
  id: c.slug,
  name: c.name,
}))

export function UserOnboardingModal() {
  const { user, isLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPersonalizing, setIsPersonalizing] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1 State:
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pronounOption, setPronounOption] = useState<SelectOption>(PRONOUN_OPTIONS[0])
  const [genderOption, setGenderOption] = useState<SelectOption>(GENDER_OPTIONS[0])
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Step 2 State (empty by default so user makes active choice):
  const [selectedGenres, setSelectedGenres] = useState<Array<{ id: string; name: string }>>([])
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>([])
  const [interestedInWriting, setInterestedInWriting] = useState(false)
  const [expirationText, setExpirationText] = useState<string | null>(null)
  const [showUsernameRules, setShowUsernameRules] = useState(false)
  const usernameRulesRef = useRef<HTMLDivElement>(null)

  // Close username rules tooltip when clicking outside or pressing Escape
  useEffect(() => {
    if (!showUsernameRules) return
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (usernameRulesRef.current && !usernameRulesRef.current.contains(event.target as Node)) {
        setShowUsernameRules(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUsernameRules(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showUsernameRules])

  // Check if onboarding is needed when a signed-in user loads
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      setIsOpen(false)
      return
    }

    const checkOnboardingStatus = async () => {
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

      // Check database directly
      try {
        const existingProfile = await getUserProfileServerFn({ data: user.id })
        if (existingProfile && existingProfile.onboarding_completed) {
          localStorage.setItem(key, 'true')
          return
        }
      } catch (dbErr) {
        console.warn('[UserOnboardingModal] Non-blocking warning checking Supabase onboarding status:', dbErr)
      }

      // Prepopulate username from Clerk or email prefix
      const defaultUser =
        user.username ||
        user.primaryEmailAddress?.emailAddress?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '')?.toLowerCase() ||
        ''
      setUsername((prev) => prev || defaultUser)

      const initialName =
        user.fullName ||
        user.firstName ||
        defaultUser ||
        'Reader'
      setDisplayName((prev) => prev || initialName)

      // Calculate 5-month expiration for New Voices invite
      if (user.createdAt) {
        try {
          const exp = calculateFiveMonthExpiration(user.createdAt)
          setExpirationText(
            exp.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          )
        } catch {}
      }

      // Open onboarding modal on Home route
      setIsOpen(true)
    }

    checkOnboardingStatus()
  }, [isLoaded, isSignedIn, user])

  // Validation for Step 1
  const isStep1Valid =
    username.trim().length >= 3 &&
    /^[a-z0-9_]{3,30}$/i.test(username.trim()) &&
    termsAccepted

  // Validation for Step 2: requires between 3 and 5 genres, and at most 3 categories
  const isStep2Valid =
    selectedGenres.length >= 3 &&
    selectedGenres.length <= 5 &&
    selectedCategories.length <= 3

  const handleProceedToStep2 = () => {
    if (!isStep1Valid) {
      if (!termsAccepted) {
        setErrorMessage('Please accept the Hatchpen Terms & Publishing Conditions to continue.')
      } else if (username.trim().length < 3) {
        setErrorMessage('Username must be at least 3 characters.')
      } else {
        setErrorMessage('Username may only contain letters, numbers, and underscores (3-30 chars).')
      }
      return
    }
    setErrorMessage(null)
    setStep(2)
  }

  const toggleGenre = (genre: { id: string; name: string }) => {
    setSelectedGenres((prev) => {
      const exists = prev.some((g) => g.id === genre.id)
      if (exists) {
        return prev.filter((g) => g.id !== genre.id)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, genre]
    })
  }

  const toggleCategory = (cat: { id: string; name: string }) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.id === cat.id)
      if (exists) {
        return prev.filter((c) => c.id !== cat.id)
      }
      if (prev.length >= 3) {
        return prev
      }
      return [...prev, cat]
    })
  }

  // Submission handler for Step 2
  const handleCompleteOnboarding = async () => {
    if (!user) return
    if (selectedGenres.length < 3) {
      setErrorMessage('Please select at least 3 genres to personalize your reading feed.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const finalDisplayName = displayName.trim() || username.trim()

      await saveUserOnboardingServerFn({
        data: {
          clerkUserId: user.id,
          username: username.trim().toLowerCase(),
          displayName: finalDisplayName,
          avatarUrl: user.imageUrl || '/unisex-avatar.svg',
          pronouns: pronounOption.label || pronounOption.id,
          gender: genderOption.label || genderOption.id,
          termsAccepted: true,
          interests: selectedGenres,
          genres: selectedGenres,
          categories: selectedCategories,
          interestedInWriting,
        },
      })

      // Update Clerk username if supported
      try {
        if (typeof (user as any).update === 'function') {
          await (user as any).update({
            username: username.trim().toLowerCase(),
          })
        }
      } catch {}

      // Mark onboarding completed in localStorage
      localStorage.setItem(`hatchpen_onboarding_completed_${user.id}`, 'true')

      // Dismiss the standalone New Voices modal permanently so it never pops up again!
      localStorage.setItem(`hatchpen_new_voices_popup_dismissed_${user.id}`, 'true')

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('hatchpen_just_signed_up_google')
        window.dispatchEvent(new CustomEvent('hatchpen:onboarding-completed'))
      }

      // Enter Option 1: Smooth 1.2s personalization transition screen
      setIsPersonalizing(true)

      // Invalidate background router queries so feed re-fetches cold-start signals
      try {
        await router.invalidate()
      } catch {}

      // Display personalizing screen for 1.3 seconds
      await new Promise((resolve) => setTimeout(resolve, 1300))

      setIsOpen(false)
      setIsPersonalizing(false)

      // If user indicated interest in writing, navigate to studio; else stay on home feed
      if (interestedInWriting) {
        navigate({ to: '/write' })
      } else {
        navigate({ to: '/' })
      }
    } catch (err: any) {
      console.error('[UserOnboardingModal] Failed to save onboarding:', err)
      setErrorMessage(err?.message || 'Failed to save onboarding details. Please try again.')
      setIsPersonalizing(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          // Strict onboarding modal: keep open until onboarding completes
        }}
        showCloseButton={false}
        closeOnBackdropClick={false}
        size="md"
        className="w-[84vw] max-w-[440px] max-h-[82vh]"
        title={
          isPersonalizing
            ? undefined
            : step === 1
              ? 'Welcome to Hatchpen'
              : 'Your Reading Taste'
        }
        description={
          isPersonalizing
            ? undefined
            : step === 1
              ? 'Set up your pen name and profile.'
              : 'Select what you love reading for your feed.'
        }
        footer={
          isPersonalizing ? null : step === 1 ? (
            <div className="w-full">
              <Button
                variant="primary"
                className="w-full py-2.5 text-sm font-medium"
                onClick={handleProceedToStep2}
                disabled={!isStep1Valid}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continue to Reading Feed
              </Button>
            </div>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row items-center gap-2 sm:gap-3 w-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto shrink-0 text-xs py-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                leftIcon={<ArrowLeft className="h-3.5 w-3.5 shrink-0" />}
              >
                Back to Profile
              </Button>

              <Button
                type="button"
                variant="primary"
                className="w-full sm:flex-1 py-2.5 text-xs sm:text-sm font-medium"
                isLoading={isSubmitting}
                disabled={!isStep2Valid}
                onClick={handleCompleteOnboarding}
                rightIcon={<Check className="h-4 w-4 shrink-0" />}
              >
                {isSubmitting ? 'Personalizing...' : 'Complete & Start Reading'}
              </Button>
            </div>
          )
        }
      >
        {isPersonalizing ? (
          <div className="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-lg">
                {interestedInWriting ? (
                  <PenLine className="h-6 w-6 animate-pulse" />
                ) : (
                  <Sparkles className="h-6 w-6 animate-pulse" />
                )}
              </div>
              <div className="absolute -inset-1 rounded-2xl border border-black/20 dark:border-white/20 animate-ping opacity-30 pointer-events-none" />
            </div>

            <div className="space-y-1.5 max-w-xs">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                {interestedInWriting
                  ? 'Setting Up Your Writer Studio...'
                  : 'Personalizing Your Reading Sanctuary...'}
              </h3>
              <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                {interestedInWriting
                  ? 'Preparing your draft desk and activating author tools.'
                  : selectedGenres.length > 0
                    ? `Curating stories tailored for ${selectedGenres.slice(0, 3).map((g) => g.name).join(', ')}${selectedGenres.length > 3 ? ` +${selectedGenres.length - 3} more` : ''}.`
                    : 'Personalizing your reading feed and discovery radar.'}
              </p>
            </div>

            {/* Smooth animated progress bar */}
            <div className="w-44 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden mt-3">
              <motion.div
                initial={{ width: '15%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="h-full bg-[var(--ink-primary)] rounded-full"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-0.5">
          {/* Compact Step Progress Bar */}
          <div className="flex items-center gap-1.5 pb-1">
            <div className={`h-1 flex-1 rounded-full transition-all ${step >= 1 ? 'bg-[var(--ink-primary)]' : 'bg-[var(--border-subtle)]'}`} />
            <div className={`h-1 flex-1 rounded-full transition-all ${step >= 2 ? 'bg-[var(--ink-primary)]' : 'bg-[var(--border-subtle)]'}`} />
            <span className="text-[10px] font-mono text-[var(--ink-muted)] shrink-0 pl-1">
              {step}/2
            </span>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* User Avatar & Google Welcome Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
                <img
                  src={user?.imageUrl || '/unisex-avatar.svg'}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover border border-[var(--border-strong)]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-[var(--ink-muted)] font-mono">Signed in as</div>
                  <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                    {user?.primaryEmailAddress?.emailAddress}
                  </div>
                </div>
              </div>

              {/* Display Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                  Display Name / Pen Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Julian Thorne"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-sm text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] transition-colors"
                />
              </div>

              {/* Username Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Unique Username <span className="text-rose-500">*</span>
                  </label>

                  {/* Exclamation badge with black background, white icon & responsive tooltip */}
                  <div className="relative" ref={usernameRulesRef}>
                    <button
                      type="button"
                      onClick={() => setShowUsernameRules((prev) => !prev)}
                      aria-label="Username rules and requirements"
                      aria-expanded={showUsernameRules}
                      className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center hover:bg-neutral-800 active:scale-95 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-black cursor-pointer"
                    >
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="13" />
                        <circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" />
                      </svg>
                    </button>

                    {showUsernameRules && (
                      <div
                        role="tooltip"
                        className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-3rem)] p-3.5 rounded-xl bg-white dark:bg-[#111722] border border-[var(--border-strong)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
                      >
                        {/* Caret pointing to the button */}
                        <div className="absolute -top-1.5 right-1.5 w-3 h-3 bg-white dark:bg-[#111722] border-t border-l border-[var(--border-strong)] rotate-45" />

                        <div className="relative z-10">
                          <div className="text-[11px] font-semibold text-[var(--ink-primary)] font-mono uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white inline-block"></span>
                            Username Requirements
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-[var(--ink-secondary)] leading-relaxed">
                            <li className="flex items-start gap-1.5">
                              <span className="text-[var(--ink-faint)] select-none font-mono">•</span>
                              <span><strong>3 to 30</strong> characters long</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-[var(--ink-faint)] select-none font-mono">•</span>
                              <span>Only letters (<code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[var(--ink-primary)] border border-[var(--border-subtle)] font-mono text-[10px]">a–z</code>), numbers (<code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[var(--ink-primary)] border border-[var(--border-subtle)] font-mono text-[10px]">0–9</code>), and underscores (<code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[var(--ink-primary)] border border-[var(--border-subtle)] font-mono text-[10px]">_</code>)</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-[var(--ink-faint)] select-none font-mono">•</span>
                              <span>No spaces or special characters</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <span className="text-[var(--ink-faint)] select-none font-mono">•</span>
                              <span className="text-[10px] text-[var(--ink-faint)]">Will be lowercase automatically</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Pronouns
                  </label>
                  <DropdownSelect
                    options={PRONOUN_OPTIONS}
                    value={pronounOption.id}
                    onChange={(val, opt) => setPronounOption(opt)}
                    size="md"
                    placeholder="Select pronouns..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Gender
                  </label>
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
              <div className="pt-1">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] transition-all cursor-pointer select-none">
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
                      I agree to the intellectual property guidelines and reader safety standards.{' '}
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
            </div>
          )}

          {/* STEP 2: READING PREFERENCES + NEW VOICES MERGED */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Genre Selection Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Favorite Genres <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-mono">
                    {selectedGenres.length < 3 ? (
                      <span className="text-[var(--ink-muted)]">
                        Select 3 to 5 ({selectedGenres.length}/5)
                      </span>
                    ) : selectedGenres.length === 5 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> 5/5 selected (max)
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> {selectedGenres.length}/5 selected
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {STANDARD_GENRES.map((g) => {
                    const isSelected = selectedGenres.some((item) => item.id === g.id)
                    const isMaxReached = selectedGenres.length >= 5 && !isSelected
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGenre(g)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 select-none ${
                          isSelected
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border border-[var(--ink-primary)] shadow-xs'
                            : isMaxReached
                              ? 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] opacity-60 border border-[var(--border-subtle)] hover:opacity-100'
                              : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                        {g.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preferred Categories Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-secondary)]">
                    Preferred Categories
                  </label>
                  <span className="text-[11px] font-mono text-[var(--ink-muted)]">
                    {selectedCategories.length}/3 selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {STANDARD_CATEGORIES.map((c) => {
                    const isSelected = selectedCategories.some((item) => item.id === c.id)
                    const isMaxReached = selectedCategories.length >= 3 && !isSelected
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 select-none ${
                          isSelected
                            ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] border border-[var(--ink-primary)] shadow-xs'
                            : isMaxReached
                              ? 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] opacity-60 border border-[var(--border-subtle)] hover:opacity-100'
                              : 'bg-[var(--bg-subtle)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Merged New Voices Showcase Writer Invite Card */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 p-3.5 space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] shrink-0 mt-0.5">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                        The New Voices Showcase
                      </h4>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--border-subtle)] text-[var(--ink-secondary)] font-medium">
                        5-Month Boost
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                      Original serialized stories you publish during your first five calendar months receive priority spotlight in the dedicated New Voices showcase for readers{expirationText ? ` (eligible through ${expirationText})` : ''}.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none border-t border-[var(--border-subtle)]/60">
                  <input
                    type="checkbox"
                    checked={interestedInWriting}
                    onChange={(e) => setInterestedInWriting(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--ink-primary)] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-[var(--ink-primary)]">
                    I want to publish my own serialized stories on Hatchpen
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
      </Modal>

      {/* Embedded Terms & Conditions Modal */}
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Hatchpen Terms & Publishing Conditions"
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
              All works submitted must be original creations or properly licensed adaptations. Plagiarism, unauthorized reproduction of copyrighted texts, and deceptive impersonation of existing authors are strictly prohibited.
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
              Constructive critique, respectful literary commentary, and thoughtful feedback are celebrated. Harassment, hate speech, and abusive interactions are strictly moderated.
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
