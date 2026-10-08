import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { AUTHORS } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import EmptyState from '../components/EmptyState'
import { AnimatedTabs, FilterDisclosure, OmniSearch } from '../design-system'
import { 
  Search, 
  BookOpen, 
  User, 
  Hash, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  SlidersHorizontal, 
  X 
} from 'lucide-react'
import { cn } from '../lib/utils'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/search')({
  head: () =>
    generateMeta({
      title: 'Search Stories & Authors',
      description: 'Search manuscripts, serialized literature, and find reading recommendations.',
      canonicalUrl: 'https://hatchpen.com/search',
      noindex: true,
    }),
  component: SearchPage,
})

// Clean, monochrome questions matching shadcn/Watermelon UI style
interface QuestionnaireQuestion {
  id: string
  title: string
  subtitle: string
  type: 'single-select' | 'category' | 'genre'
  options?: {
    id: string
    title: string
    description?: string
    tag?: string
  }[]
}

const QUESTIONS_CONFIG: QuestionnaireQuestion[] = [
  {
    id: 'mood',
    title: 'How would you describe what you want to read right now?',
    subtitle: 'Select the mood that best captures your current mindset.',
    type: 'single-select',
    options: [
      {
        id: 'quiet',
        title: 'Reflective & Quiet',
        description: 'Thoughtful, slow, philosophical or poetic stillness.',
        tag: 'solitude'
      },
      {
        id: 'suspense',
        title: 'Thrilled & Suspenseful',
        description: 'Twists, secrets, high tension, and fast narrative pace.',
        tag: 'mystery'
      },
      {
        id: 'emotional',
        title: 'Bittersweet & Emotional',
        description: 'Deep feelings, romance, heartbreak, and tender moments.',
        tag: 'romance'
      },
      {
        id: 'comforting',
        title: 'Comforting & Light',
        description: 'Warm everyday encounters, gentle humor, and cozy vibes.',
        tag: 'comfort'
      },
      {
        id: 'curious',
        title: 'Intellectual & Big Ideas',
        description: 'Science, history, deep worldbuilding, and philosophy.',
        tag: 'ideas'
      }
    ]
  },
  {
    id: 'category',
    title: 'What format are you in the mood for?',
    subtitle: 'Choose a literary structure or leave it open to anything.',
    type: 'category'
  },
  {
    id: 'genre',
    title: 'Any specific genre you prefer?',
    subtitle: 'Select a primary genre from our canonical catalog.',
    type: 'genre'
  }
]

function SearchPage() {
  const { allWorks, categories, genres, showToast } = useApp()

  // Standard Search Params
  const [searchInput, setSearchInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('q') || ''
    }
    return ''
  })

  const [submittedQuery, setSubmittedQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q') || ''
      return q.trim().length >= 5 ? q.trim() : ''
    }
    return ''
  })

  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('genre') || 'all'
    }
    return 'all'
  })

  // Questionnaire Flow State
  const [isQuestionnaireOpen, setIsQuestionnaireOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [selectedMood, setSelectedMood] = useState<string>('quiet')
  const [selectedFormat, setSelectedFormat] = useState<string>('all')
  const [selectedReadingGenre, setSelectedReadingGenre] = useState<string>('all')
  const [isQuestionnaireSubmitted, setIsQuestionnaireSubmitted] = useState(false)

  // Sync if URL search param changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q') || ''
      const g = params.get('genre') || 'all'
      setSearchInput(q)
      if (q.trim().length >= 5) {
        setSubmittedQuery(q.trim())
        setSearchError(null)
      } else {
        setSubmittedQuery('')
        if (q.trim().length > 0) {
          setSearchError('Minimum 5 letters are required for searching.')
        }
      }
      setSelectedGenre(g)
    }
  }, [typeof window !== 'undefined' ? window.location.search : ''])

  const handleExecuteSearch = (val: string, genreToUse = selectedGenre) => {
    const trimmed = val.trim()
    if (!trimmed) {
      handleClear()
      return
    }
    if (trimmed.length < 5) {
      setSearchError('Minimum 5 letters are required for searching.')
      showToast('Please enter at least 5 letters to search.')
      return
    }
    setSearchError(null)
    setSubmittedQuery(trimmed)
    setIsQuestionnaireSubmitted(false)
    setIsQuestionnaireOpen(false)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('q', trimmed)
      if (genreToUse && genreToUse !== 'all') {
        url.searchParams.set('genre', genreToUse)
      } else {
        url.searchParams.delete('genre')
      }
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleClear = () => {
    setSearchInput('')
    setSubmittedQuery('')
    setSearchError(null)
    setIsQuestionnaireSubmitted(false)
    setIsQuestionnaireOpen(false)
    setCurrentStepIndex(0)
    setSelectedMood('quiet')
    setSelectedFormat('all')
    setSelectedReadingGenre('all')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('q')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const [activeTab, setActiveTab] = useState<'all' | 'works' | 'authors' | 'tags'>('all')

  // Search Results (Only calculated for submitted query with minimum 5 letters)
  const matchingWorks = useMemo(() => {
    if (!submittedQuery.trim() || submittedQuery.trim().length < 5) return []
    const q = submittedQuery.toLowerCase()
    return allWorks.filter((w) => {
      if (selectedCategory !== 'all' && w.categorySlug !== selectedCategory) return false
      if (
        selectedGenre !== 'all' &&
        w.genreSlug !== selectedGenre &&
        w.genre.toLowerCase() !== selectedGenre.toLowerCase()
      ) {
        return false
      }
      return (
        w.title.toLowerCase().includes(q) ||
        w.synopsis.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q) ||
        w.genre.toLowerCase().includes(q) ||
        w.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [allWorks, submittedQuery, selectedCategory, selectedGenre])

  const matchingAuthors = useMemo(() => {
    if (!submittedQuery.trim() || submittedQuery.trim().length < 5) return []
    const q = submittedQuery.toLowerCase()

    const authorMap = new Map<string, typeof AUTHORS[0]>()
    AUTHORS.forEach((a) => authorMap.set(a.id, a))
    allWorks.forEach((w) => {
      if (w.author && !authorMap.has(w.author.id)) {
        authorMap.set(w.author.id, w.author)
      }
    })

    return Array.from(authorMap.values()).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.handle.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q)
    )
  }, [allWorks, submittedQuery])

  const matchingTags = useMemo(() => {
    if (!submittedQuery.trim() || submittedQuery.trim().length < 5) return []
    const q = submittedQuery.toLowerCase()
    const allTags = Array.from(new Set(allWorks.flatMap((w) => w.tags)))
    return allTags.filter((t) => t.toLowerCase().includes(q))
  }, [allWorks, submittedQuery])

  const searchScopes = useMemo(() => [
    { id: 'all', label: 'All Genres' },
    ...genres.map((g) => ({ id: g.slug, label: g.name }))
  ], [genres])

  const totalResults = matchingWorks.length + matchingAuthors.length + matchingTags.length

  // Recommendations calculated based on questionnaire answers
  const recommendedWorks = useMemo(() => {
    if (!isQuestionnaireSubmitted) return []

    const moodOption = QUESTIONS_CONFIG[0].options?.find(o => o.id === selectedMood)
    const moodTag = moodOption?.tag || ''

    return allWorks
      .map(work => {
        let score = 0

        // Format/Category filter
        if (selectedFormat !== 'all') {
          if (work.categorySlug === selectedFormat) score += 30
        } else {
          score += 10
        }

        // Genre filter
        if (selectedReadingGenre !== 'all') {
          if (work.genreSlug === selectedReadingGenre) score += 35
        } else {
          score += 10
        }

        // Mood tag match
        if (moodTag && work.tags.some(t => t.toLowerCase().includes(moodTag) || moodTag.includes(t.toLowerCase()))) {
          score += 25
        }

        if (work.editorPick) score += 8
        if (work.featured) score += 5

        return { work, score }
      })
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score > 0)
      .slice(0, 8)
      .map(item => item.work)
  }, [isQuestionnaireSubmitted, selectedMood, selectedFormat, selectedReadingGenre, allWorks])

  // Pinch & Exit Animation Variants
  const modalPinchVariants = {
    initial: { opacity: 0, scale: 0.95, y: 15 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { 
      opacity: 0, 
      scale: 0.25, 
      rotateX: 20, 
      y: -30, 
      filter: 'blur(8px)',
      transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } 
    }
  }

  const resultsSlideUpVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.08,
        delayChildren: 0.15
      } 
    }
  }

  const cardItemVariants = {
    hidden: { opacity: 0, y: 25, scale: 0.96 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } 
    }
  }

  // Handle final questionnaire submit with pinch effect
  const handleFinalQuestionnaireSubmit = () => {
    setIsQuestionnaireOpen(false)
    setIsQuestionnaireSubmitted(true)
  }

  // --- MAIN RENDER WRAPPER WITH ANIMATEPRESENCE FOR SEAMLESS PINCH & REVEAL ---
  return (
    <AnimatePresence mode="wait">
      {/* 1. RECOMMENDATIONS RESULT SHELF (Slide up with stagger) */}
      {isQuestionnaireSubmitted && !submittedQuery ? (
        <motion.div
          key="questionnaire-results"
          variants={resultsSlideUpVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: 20 }}
          className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
          {/* Minimal Editorial Card Header */}
          <motion.div 
            variants={cardItemVariants}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 sm:p-8 mb-8 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                  Reading Recommendations
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold text-[var(--ink-primary)] mt-1">
                  {QUESTIONS_CONFIG[0].options?.find(o => o.id === selectedMood)?.title || 'Curated Mood'}
                </h1>
                <p className="text-sm text-[var(--ink-secondary)] mt-1">
                  Format: <span className="font-medium text-[var(--ink-primary)]">
                    {selectedFormat === 'all' ? 'All Formats' : categories.find(c => c.slug === selectedFormat)?.name || selectedFormat}
                  </span> • Genre: <span className="font-medium text-[var(--ink-primary)]">
                    {selectedReadingGenre === 'all' ? 'All Genres' : genres.find(g => g.slug === selectedReadingGenre)?.name || selectedReadingGenre}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuestionnaireSubmitted(false)
                    setIsQuestionnaireOpen(true)
                    setCurrentStepIndex(0)
                  }}
                  className="px-3.5 py-2 rounded-lg border border-[var(--border-subtle)] text-xs font-mono text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Change Answers
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3.5 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-xs font-mono hover:opacity-90 transition-opacity"
                >
                  Back to Search
                </button>
              </div>
            </div>
          </motion.div>

          {recommendedWorks.length === 0 ? (
            <EmptyState
              type="no-search"
              customTitle="No exact matches found"
              customDescription="Try choosing broader options to see more recommendations."
              actionLabel="Try Again"
              onAction={() => {
                setIsQuestionnaireSubmitted(false)
                setIsQuestionnaireOpen(true)
                setCurrentStepIndex(0)
              }}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-[var(--ink-primary)]">
                  Suggested Manuscripts ({recommendedWorks.length})
                </h2>
                <span className="text-xs font-mono text-[var(--ink-muted)]">
                  Filtered to your mindset
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedWorks.map(work => (
                  <motion.div key={work.id} variants={cardItemVariants}>
                    <WorkCard work={work} layout="portrait" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : isQuestionnaireOpen ? (
        /* 2. QUESTIONNAIRE MODAL (With Pinch-into-the-screen Exit) */
        <div 
          key="questionnaire-modal-wrapper"
          className="min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto w-full perspective-[1000px]"
        >
          <motion.div
            variants={modalPinchVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-lg overflow-hidden origin-center"
          >
            {/* Top Bar with Step Progress */}
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--ink-muted)]">
                  Step {currentStepIndex + 1} of {QUESTIONS_CONFIG.length}
                </span>
                <div className="flex gap-1 ml-2">
                  {QUESTIONS_CONFIG.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-4 h-1 rounded-full transition-colors",
                        idx === currentStepIndex
                          ? "bg-[var(--ink-primary)]"
                          : idx < currentStepIndex
                          ? "bg-[var(--border-strong)]"
                          : "bg-[var(--border-subtle)]"
                      )}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQuestionnaireOpen(false)}
                className="p-1 rounded-md text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question Body with Fixed Height matching Step 2 */}
            <div className="p-6 flex flex-col h-[380px]">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ink-primary)] tracking-tight">
                  {QUESTIONS_CONFIG[currentStepIndex].title}
                </h2>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  {QUESTIONS_CONFIG[currentStepIndex].subtitle}
                </p>
              </div>

              {/* Step 1: Mood Single Select */}
              {QUESTIONS_CONFIG[currentStepIndex].type === 'single-select' && (
                <div className="mt-5 space-y-2 flex-1 overflow-y-auto pr-1">
                  {QUESTIONS_CONFIG[currentStepIndex].options?.map((option) => {
                    const isSelected = selectedMood === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedMood(option.id)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-lg border transition-all flex items-start justify-between",
                          isSelected
                            ? "border-[var(--ink-primary)] bg-[var(--bg-subtle)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
                        )}
                      >
                        <div>
                          <div className="text-xs font-semibold text-[var(--ink-primary)]">
                            {option.title}
                          </div>
                          {option.description && (
                            <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                              {option.description}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          isSelected
                            ? "border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--bg-canvas)]"
                            : "border-[var(--border-strong)]"
                        )}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 2: Category Select */}
              {QUESTIONS_CONFIG[currentStepIndex].type === 'category' && (
                <div className="mt-5 grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('all')}
                    className={cn(
                      "p-3 rounded-lg border text-left text-xs transition-colors",
                      selectedFormat === 'all'
                        ? "border-[var(--ink-primary)] bg-[var(--bg-subtle)] font-medium"
                        : "border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                    )}
                  >
                    <div className="font-semibold text-[var(--ink-primary)]">Any Format</div>
                    <div className="text-[10px] text-[var(--ink-muted)]">Open to all</div>
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setSelectedFormat(c.slug)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs transition-colors",
                        selectedFormat === c.slug
                          ? "border-[var(--ink-primary)] bg-[var(--bg-subtle)] font-medium"
                          : "border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                      )}
                    >
                      <div className="font-semibold text-[var(--ink-primary)] truncate">{c.name}</div>
                      <div className="text-[10px] text-[var(--ink-muted)]">{c.worksCount} works</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Genre Select */}
              {QUESTIONS_CONFIG[currentStepIndex].type === 'genre' && (
                <div className="mt-5 grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedReadingGenre('all')}
                    className={cn(
                      "p-3 rounded-lg border text-left text-xs transition-colors",
                      selectedReadingGenre === 'all'
                        ? "border-[var(--ink-primary)] bg-[var(--bg-subtle)] font-medium"
                        : "border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                    )}
                  >
                    <div className="font-semibold text-[var(--ink-primary)]">Any Genre</div>
                    <div className="text-[10px] text-[var(--ink-muted)]">Surprise me</div>
                  </button>
                  {genres.map((g) => (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => setSelectedReadingGenre(g.slug)}
                      className={cn(
                        "p-3 rounded-lg border text-left text-xs transition-colors",
                        selectedReadingGenre === g.slug
                          ? "border-[var(--ink-primary)] bg-[var(--bg-subtle)] font-medium"
                          : "border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                      )}
                    >
                      <div className="font-semibold text-[var(--ink-primary)] truncate">{g.name}</div>
                      <div className="text-[10px] text-[var(--ink-muted)] truncate">{g.group}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 bg-[var(--bg-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-between">
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              {currentStepIndex < QUESTIONS_CONFIG.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalQuestionnaireSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[var(--ink-primary)] text-[var(--bg-canvas)] text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
                >
                  Show Recommendations <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      ) : !submittedQuery.trim() || submittedQuery.trim().length < 5 ? (
        /* 3. CLEAN CENTERED SEARCH SCREEN WITH EDITORIAL ILLUSTRATION */
        <motion.div
          key="centered-search-home"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="min-h-[calc(100vh-10rem)] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full"
        >
          <div className="w-full text-center flex flex-col items-center">
            
            {/* Elegant Literary Search Illustration */}
            <div className="relative mb-6 select-none pointer-events-none">
              {/* Soft Ambient Halo */}
              <div className="absolute inset-0 bg-amber-500/10 dark:bg-amber-400/5 blur-2xl rounded-full scale-150" />
              
              <svg
                width="140"
                height="100"
                viewBox="0 0 140 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10 text-[var(--ink-primary)] mx-auto"
              >
                {/* Floating Starlight / Sparkles */}
                <path
                  d="M24 24L26 18L28 24L34 26L28 28L26 34L24 28L18 26L24 24Z"
                  fill="currentColor"
                  className="text-amber-500/80 animate-pulse"
                />
                <circle cx="118" cy="22" r="2" fill="currentColor" className="text-amber-500/70" />
                <path
                  d="M112 40L113.5 35L115 40L120 41.5L115 43L113.5 48L112 43L107 41.5L112 40Z"
                  fill="currentColor"
                  className="text-amber-500/60"
                />

                {/* Back Open Book Pages Shadow */}
                <path
                  d="M32 74C44 71 58 72 70 76C82 72 96 71 108 74V48C96 45 82 46 70 50C58 46 44 45 32 48V74Z"
                  fill="var(--bg-subtle)"
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                {/* Front Manuscript Book Leaf */}
                <path
                  d="M30 70C43 67 57 68 70 72C83 68 97 67 110 70V44C97 41 83 42 70 46C57 42 43 41 30 44V70Z"
                  fill="var(--bg-surface)"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />

                {/* Book Spine Center Crease */}
                <path
                  d="M70 46V72"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* Left Page Text Lines */}
                <line x1="40" y1="52" x2="60" y2="50" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                <line x1="40" y1="58" x2="62" y2="56" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                <line x1="40" y1="64" x2="54" y2="62" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />

                {/* Right Page Text Lines */}
                <line x1="78" y1="50" x2="100" y2="52" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                <line x1="78" y1="56" x2="98" y2="58" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
                <line x1="78" y1="62" x2="92" y2="64" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />

                {/* Rising Quill Pen / Fountain Pen Nib */}
                <g transform="translate(68, 8) rotate(18)">
                  <path
                    d="M12 0L15 22L12 28L9 22L12 0Z"
                    fill="var(--bg-surface)"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <line x1="12" y1="12" x2="12" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="12" cy="18" r="1.2" fill="currentColor" />
                  <path d="M12 0L12 -8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </g>

                {/* Delicate Curved Ink Trail */}
                <path
                  d="M76 26C88 24 98 32 94 40"
                  stroke="var(--ink-muted)"
                  strokeWidth="1.2"
                  strokeDasharray="2 3"
                  strokeLinecap="round"
                  strokeOpacity="0.6"
                />
              </svg>
            </div>

            {/* Editorial Header */}
            <div className="mb-6">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink-primary)]">
                Discover Stories & Manuscripts
              </h1>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1.5 font-serif italic">
                Search through independent literature, serialized novels, essays & authors
              </p>
            </div>

            {/* Main Centered Search Input */}
            <OmniSearch
              expandMode="responsive"
              size="lg"
              value={searchInput}
              onChange={(val) => {
                setSearchInput(val)
                if (searchError && val.trim().length >= 5) {
                  setSearchError(null)
                }
                if (!val.trim() && submittedQuery) {
                  setSubmittedQuery('')
                  setSearchError(null)
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('q')
                    window.history.replaceState({}, '', url.toString())
                  }
                }
              }}
              onSubmit={(val, sc) => handleExecuteSearch(val, sc)}
              onClear={handleClear}
              scopes={searchScopes}
              activeScope={selectedGenre}
              onScopeChange={(newGenre) => {
                setSelectedGenre(newGenre)
                if (submittedQuery.trim().length >= 5) {
                  handleExecuteSearch(submittedQuery, newGenre)
                }
              }}
              defaultExpanded={true}
              isExpanded={true}
              collapseOnBlur={false}
              autoFocus
              shortcut="/"
              placeholders={[
                "Search manuscripts (min 5 letters)...",
                "Search 'A Winter in Kyoto'...",
                "Search 'Cold War telemetry'...",
                "Search by theme or author...",
              ]}
            />

            {/* Validation Feedback & Character Counter */}
            {searchError ? (
              <p className="text-xs text-rose-500 font-mono mt-3 transition-all">
                {searchError}
              </p>
            ) : searchInput.trim().length > 0 && searchInput.trim().length < 5 ? (
              <p className="text-xs text-[var(--ink-muted)] font-mono mt-3 transition-all">
                {5 - searchInput.trim().length} more {5 - searchInput.trim().length === 1 ? 'letter' : 'letters'} needed (min 5 letters)
              </p>
            ) : null}

            {/* Clean, Non-Colorful Questionnaire Prompt */}
            <div className="mt-8 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsQuestionnaireOpen(true)
                  setCurrentStepIndex(0)
                }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] text-xs text-[var(--ink-secondary)] transition-colors shadow-xs"
              >
                <span>Not sure what to read?</span>
                <span className="font-medium text-[var(--ink-primary)] flex items-center gap-1">
                  Answer 3 quick questions <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        /* 4. SUBMITTED KEYWORD SEARCH RESULTS (Standard) */
        <motion.div
          key="submitted-search-results"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
        >
          {/* Top Search Refinement Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <OmniSearch
              expandMode="responsive"
              size="md"
              value={searchInput}
              onChange={(val) => {
                setSearchInput(val)
                if (searchError && val.trim().length >= 5) {
                  setSearchError(null)
                }
                if (!val.trim()) {
                  handleClear()
                }
              }}
              onSubmit={(val, sc) => handleExecuteSearch(val, sc)}
              onClear={handleClear}
              scopes={searchScopes}
              activeScope={selectedGenre}
              onScopeChange={(newGenre) => {
                setSelectedGenre(newGenre)
                handleExecuteSearch(submittedQuery, newGenre)
              }}
              defaultExpanded={true}
              isExpanded={true}
              collapseOnBlur={false}
              resultsCount={totalResults}
            />
            {searchError && (
              <p className="text-xs text-rose-500 font-mono mt-2">
                {searchError}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            {/* Result Counts & Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border-subtle)]">
              <AnimatedTabs
                size="sm"
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as any)}
                tabs={[
                  { id: 'all', label: 'All Results', badge: totalResults },
                  { id: 'works', label: 'Works', icon: <BookOpen className="h-3.5 w-3.5" />, badge: matchingWorks.length },
                  { id: 'authors', label: 'Authors', icon: <User className="h-3.5 w-3.5" />, badge: matchingAuthors.length },
                  { id: 'tags', label: 'Tags & Themes', icon: <Hash className="h-3.5 w-3.5" />, badge: matchingTags.length },
                ]}
              />

              {/* Category and Genre Filters for Search Results */}
              <div className="flex flex-wrap items-center gap-2">
                <FilterDisclosure
                  label="Filter by Category"
                  activeId={selectedCategory}
                  onChange={setSelectedCategory}
                  items={[
                    { id: 'all', label: 'All Categories' },
                    ...categories.map((c) => ({ id: c.slug, label: c.name, badge: c.worksCount }))
                  ]}
                />

                <FilterDisclosure
                  label="Filter by Genre"
                  activeId={selectedGenre}
                  onChange={(g) => {
                    setSelectedGenre(g)
                    handleExecuteSearch(submittedQuery, g)
                  }}
                  items={[
                    { id: 'all', label: 'All Genres' },
                    ...genres.map((g) => ({ id: g.slug, label: g.name }))
                  ]}
                />
              </div>
            </div>

            {totalResults === 0 ? (
              <EmptyState
                type="no-search"
                customTitle={`No records found for "${submittedQuery}"`}
                customDescription="Try searching by a broader term like 'fiction', 'Kyoto', or 'Rostova'."
                actionLabel="Clear Search"
                onAction={handleClear}
              />
            ) : (
              <div className="space-y-12">
                {/* Works Results */}
                {(activeTab === 'all' || activeTab === 'works') && matchingWorks.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                      Manuscripts & Serials
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {matchingWorks.map((work) => (
                        <WorkCard key={work.id} work={work} layout="portrait" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Authors Results */}
                {(activeTab === 'all' || activeTab === 'authors') && matchingAuthors.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                      Writers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {matchingAuthors.map((author) => (
                        <AuthorCard key={author.id} author={author} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags Results */}
                {(activeTab === 'all' || activeTab === 'tags') && matchingTags.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] mb-4">
                      Literary Themes & Subjects
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {matchingTags.map((tag) => (
                        <Link
                          key={tag}
                          to="/discover"
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-mono text-[var(--ink-secondary)] hover:border-[var(--ink-primary)] transition-colors no-underline"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

