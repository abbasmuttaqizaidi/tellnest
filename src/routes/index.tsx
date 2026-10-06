import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES, GENRES, AUTHORS } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import { OptimizedImage } from '../components/OptimizedImage'
import {
  AnimatedSearch,
  Button,
  Badge,
  AnimatedTabs,
  MetricProgressCard,
  FilterDisclosure,
  BottomSheet,
} from '../design-system'
import { useUser } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Compass,
  PenLine,
  Feather,
  Flame,
  Users,
  Compass as CompassIcon,
  ChevronRight,
  ChevronLeft,
  Library as LibraryIcon,
  Search,
  Layers,
  BookText,
  Filter,
  SlidersHorizontal,
  X,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isSignedIn, isLoaded, user } = useUser()

  // Synchronously initialize auth state from pre-render signals (cookie & localStorage)
  const [cachedAuth, setCachedAuth] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return (
        window.localStorage.getItem('hatchpen_has_session') === 'true' ||
        document.documentElement.classList.contains('has-auth-session') ||
        document.cookie.includes('__session=') ||
        /__client_uat=[1-9]/.test(document.cookie)
      )
    } catch {
      return false
    }
  })

  // Synchronize cache whenever Clerk finishes hydration or auth state changes
  useEffect(() => {
    if (isLoaded) {
      setCachedAuth(!!isSignedIn)
      try {
        localStorage.setItem('hatchpen_has_session', isSignedIn ? 'true' : 'false')
        if (isSignedIn) {
          document.documentElement.classList.add('has-auth-session')
          const name = user?.firstName || user?.username
          if (name) {
            localStorage.setItem('hatchpen_user_name', name)
          }
        } else {
          document.documentElement.classList.remove('has-auth-session')
          localStorage.removeItem('hatchpen_user_name')
        }
      } catch {}
    }
  }, [isLoaded, isSignedIn, user])

  // While Clerk hydrates (!isLoaded), use cachedAuth to prevent the public home flash
  const showSignedIn = isLoaded ? isSignedIn : cachedAuth

  if (showSignedIn) {
    return <SignedInHome />
  }

  return <PublicHome />
}

/* ==========================================================================
   PUBLIC HOME PAGE — Curated Atmospheric Literary Salon & Bookstore
   ========================================================================== */
function PublicHome() {
  const { allWorks, openAuthModal } = useApp()
  const navigate = useNavigate()
  const [homeQuery, setHomeQuery] = useState('')

  // Multi-story Hero Carousel state (5 manuscripts)
  const heroWorks = useMemo(() => {
    return allWorks.slice(0, 5)
  }, [allWorks])

  const [activeHeroIndex, setActiveHeroIndex] = useState(0)
  const activeHeroWork = heroWorks[activeHeroIndex] || allWorks[0]

  const [heroViewMode, setHeroViewMode] = useState<'overview' | 'taste'>('overview')
  const [mobileSheetTasteOpen, setMobileSheetTasteOpen] = useState(false)
  const [mobileSheetHeight, setMobileSheetHeight] = useState<'default' | 'expanded'>('default')

  const handleOpenSample = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSheetHeight('default')
      setMobileSheetTasteOpen(true)
    } else {
      setHeroViewMode('taste')
    }
  }

  const activeHeroChapter = activeHeroWork?.chapters?.[0]
  const activeTasteParagraphs = useMemo(() => {
    if (!activeHeroChapter?.content) return []
    return activeHeroChapter.content
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 3)
  }, [activeHeroChapter])

  const catalogDisplayWorks = useMemo(() => {
    return allWorks.slice(0, 6)
  }, [allWorks])

  const trendingWorks = allWorks.filter((w) => w.trending || w.featured).slice(0, 4)
  const completedWorks = allWorks.filter((w) => w.status === 'Completed').slice(0, 3)

  return (
    <div className="public-home-container min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12 sm:space-y-16">
      
      {/* =========================================================================
          HERO CAROUSEL WITH INLINE "READ A TASTE"
          ========================================================================= */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-8 lg:p-10 shadow-sm relative overflow-visible lg:overflow-hidden flex flex-col justify-center lg:h-[540px]">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center flex-1">
          
          {/* Main Selected Manuscript Content */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-center items-center text-center lg:items-start lg:text-left w-full">
            <div className="w-full space-y-3.5 sm:space-y-4">
              
              {/* Badges, Reading Info & Discrete Carousel Controls (Desktop only; on mobile genre is on the card and controls are swipe dots) */}
              <div className="hidden lg:flex items-center justify-between gap-2.5 w-full">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center lg:justify-start">
                  <Badge variant="outline" size="sm">
                    {activeHeroWork.category}
                  </Badge>
                  <Badge variant="secondary" size="sm">
                    {activeHeroWork.genre}
                  </Badge>
                  <span className="text-xs text-[var(--ink-muted)] font-mono hidden sm:inline">
                    {activeHeroWork.status}
                  </span>
                  <span className="text-xs text-[var(--ink-faint)] font-mono hidden sm:inline">•</span>
                  <span className="text-[11px] sm:text-xs text-[var(--ink-muted)] font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3 inline" />
                    {activeHeroWork.chapters?.[0]?.readTimeMinutes || 12}m
                  </span>
                </div>

                {/* Compact Carousel Nav */}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-xs text-[var(--ink-faint)] mr-1">
                    {String(activeHeroIndex + 1).padStart(2, '0')}/{String(heroWorks.length).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveHeroIndex((prev) => (prev > 0 ? prev - 1 : heroWorks.length - 1))}
                    className="p-1 sm:p-1.5 rounded-md border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] active:scale-95 text-[var(--ink-primary)] transition cursor-pointer"
                    title="Previous Manuscript"
                    aria-label="Previous Manuscript"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHeroIndex((prev) => (prev < heroWorks.length - 1 ? prev + 1 : 0))}
                    className="p-1 sm:p-1.5 rounded-md border border-[var(--border-subtle)] hover:border-[var(--ink-primary)] active:scale-95 text-[var(--ink-primary)] transition cursor-pointer"
                    title="Next Manuscript"
                    aria-label="Next Manuscript"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h2 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--ink-primary)] leading-[1.15]">
                  {activeHeroWork.title}
                </h2>
                {activeHeroWork.subtitle && (
                  <p className="mt-1 font-serif text-xs sm:text-base text-[var(--ink-muted)] italic truncate">
                    {activeHeroWork.subtitle}
                  </p>
                )}
              </div>

              {/* Responsive viewing window */}
              <div className="relative w-full sm:h-[270px] sm:overflow-hidden">
                <AnimatePresence mode="wait">
                  {heroViewMode === 'overview' ? (
                    <motion.div
                      key="overview-content"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col justify-between items-center lg:items-start w-full sm:absolute sm:inset-0 space-y-3 sm:space-y-0"
                    >
                      <p className="text-xs sm:text-base leading-relaxed text-[var(--ink-secondary)] max-w-2xl font-serif line-clamp-3 sm:line-clamp-4">
                        {activeHeroWork.synopsis}
                      </p>

                      {/* Author Attribution */}
                      <div className="flex items-center gap-2.5 py-1">
                        <Link
                          to="/author/$authorId"
                          params={{ authorId: activeHeroWork.author.id }}
                          className="flex items-center gap-2.5 text-inherit no-underline group"
                        >
                          <OptimizedImage
                            src={activeHeroWork.author.avatar}
                            alt={activeHeroWork.author.name}
                            width={40}
                            height={40}
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover grayscale border border-[var(--border-strong)]"
                          />
                          <div className="text-left">
                            <p className="text-xs font-semibold text-[var(--ink-primary)] group-hover:underline">
                              {activeHeroWork.author.name}
                            </p>
                            <p className="text-[10px] sm:text-[11px] font-mono text-[var(--ink-muted)]">
                              @{activeHeroWork.author.handle} • {activeHeroWork.author.location}
                            </p>
                          </div>
                        </Link>
                      </div>

                      {/* Action buttons (desktop only; on mobile they are overlaid vertically directly on the active cover) */}
                      <div className="hidden lg:flex flex-row items-center justify-start gap-3 pt-2 w-full">
                        <Link
                          to="/read/$workId/$chapterId"
                          params={{
                            workId: activeHeroWork.id,
                            chapterId: activeHeroWork.chapters[0]?.id || 'ch-1',
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 active:scale-[0.99] transition no-underline shadow-xs"
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>Begin Chapter 1</span>
                        </Link>

                        <button
                          type="button"
                          onClick={handleOpenSample}
                          className="inline-flex items-center justify-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.99] transition cursor-pointer"
                        >
                          <Feather className="h-3.5 w-3.5" />
                          <span>Sample Opening Lines</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAuthModal()}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>Save to Library</span>
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="taste-content"
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col justify-between text-left h-full sm:absolute sm:inset-0 space-y-3 sm:space-y-0"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-dashed border-[var(--border-subtle)] text-[11px] sm:text-xs font-mono text-[var(--ink-muted)]">
                        <span className="flex items-center gap-1.5 font-medium text-[var(--ink-primary)] truncate">
                          <Feather className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">Sample • {activeHeroChapter?.title || 'Chapter 1'}</span>
                        </span>
                        <span className="shrink-0">{activeHeroChapter?.readTimeMinutes || 12}m read</span>
                      </div>

                      {/* Typeset Prose with Literary Drop Cap & Scrollable viewport */}
                      <div className="space-y-2.5 sm:space-y-3.5 max-h-[170px] sm:max-h-[160px] overflow-y-auto pr-2 scrollbar-thin my-1">
                        {activeTasteParagraphs.map((paragraph, index) => {
                          if (index === 0) {
                            const firstChar = paragraph.charAt(0)
                            const restOfParagraph = paragraph.slice(1)
                            return (
                              <p key={index} className="font-serif text-xs sm:text-sm leading-relaxed text-[var(--ink-primary)]">
                                <span className="float-left text-2xl sm:text-3xl font-serif font-bold text-[var(--ink-primary)] leading-none mr-2 mt-0.5 border-b-2 border-[var(--ink-primary)] pb-0.5">
                                  {firstChar}
                                </span>
                                {restOfParagraph}
                              </p>
                            )
                          }
                          return (
                            <p key={index} className="font-serif text-xs sm:text-sm leading-relaxed text-[var(--ink-secondary)]">
                              {paragraph}
                            </p>
                          )
                        })}
                      </div>

                      {/* Action buttons inside Taste Mode */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2 border-t border-[var(--border-subtle)]">
                        <button
                          type="button"
                          onClick={() => setHeroViewMode('overview')}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-2.5 sm:py-2 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 active:scale-[0.99] transition cursor-pointer shadow-xs"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                          <span>Back to Synopsis</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAuthModal()}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded border border-[var(--border-subtle)] text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition cursor-pointer"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>Save Manuscript</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Physical Book Jacket Presentation
              - Mobile View: 3D Stacked Depth Carousel (Front card is taller, 4 background cards are tucked behind with smaller heights and scales)
              - Desktop View: Classic elegant book jacket with bottom overlapping thumbnails dock
          */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col items-center justify-center w-full">
            
            {/* 1. MOBILE-ONLY STACKED DEPTH CAROUSEL (strict block lg:hidden) */}
            <div className="block lg:hidden w-full max-w-[360px] mx-auto py-2">
              <div className="relative h-[470px] w-full flex items-center justify-center select-none touch-pan-y">
                {heroWorks.map((work, idx) => {
                  // Calculate distance from active index in a cyclical 5-item carousel (-2, -1, 0, 1, 2)
                  const count = heroWorks.length
                  let offset = (idx - activeHeroIndex) % count
                  if (offset > 2) offset -= count
                  if (offset < -2) offset += count

                  const isFront = offset === 0
                  const isVisible = Math.abs(offset) <= 2
                  if (!isVisible) return null

                  // Depth styling parameters:
                  // Front card: taller (h-[420px], scale 1.0, z-30, w: 260px)
                  // Offset +/- 1: tucked behind with smaller height (h-[350px], scale 0.90, z-20)
                  // Offset +/- 2: tucked even further behind (h-[295px], scale 0.82, z-10)
                  const zIndex = 30 - Math.abs(offset) * 10
                  const xTranslate = offset * 34 // horizontal peek offset
                  const scale = 1 - Math.abs(offset) * 0.08
                  const height = isFront ? 420 : Math.abs(offset) === 1 ? 350 : 295
                  const opacity = isFront ? 1 : Math.abs(offset) === 1 ? 0.78 : 0.55

                  return (
                    <motion.div
                      key={work.id}
                      animate={{
                        x: xTranslate,
                        scale: scale,
                        opacity: opacity,
                        zIndex: zIndex,
                        height: height,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 28,
                        mass: 0.6,
                      }}
                      drag={isFront ? 'x' : false}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.15}
                      onDragEnd={(_e, info) => {
                        if (info.offset.x < -35 || info.velocity.x < -200) {
                          // Swipe left -> Next
                          setActiveHeroIndex((prev) => (prev < heroWorks.length - 1 ? prev + 1 : 0))
                        } else if (info.offset.x > 35 || info.velocity.x > 200) {
                          // Swipe right -> Prev
                          setActiveHeroIndex((prev) => (prev > 0 ? prev - 1 : heroWorks.length - 1))
                        }
                      }}
                      onClick={() => {
                        if (!isFront) {
                          setActiveHeroIndex(idx)
                        }
                      }}
                      style={{
                        width: '260px',
                        transformOrigin: 'center center',
                        willChange: 'transform, opacity',
                        transform: 'translateZ(0)',
                      }}
                      className={`absolute rounded-xl overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-subtle)] transform-gpu select-none cursor-pointer ${
                        isFront
                          ? 'ring-2 ring-[var(--ink-primary)] shadow-2xl cursor-grab active:cursor-grabbing'
                          : 'shadow-md cursor-pointer hover:opacity-90'
                      }`}
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        priority={isFront}
                        width={420}
                        height={630}
                        draggable={false}
                        containerClassName="h-full w-full"
                        className="h-full w-full object-cover pointer-events-none select-none"
                      />

                      {/* Spine depth shadow */}
                      <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 to-transparent pointer-events-none z-10" />

                      {/* Front Card Badge */}
                      {isFront && (
                        <div className="absolute top-2.5 right-2.5 rounded bg-black/80 px-2 py-0.5 text-[9px] font-mono font-medium text-white shadow-xs backdrop-blur-xs z-20">
                          {work.publishedChaptersCount} Chs
                        </div>
                      )}

                      {/* Genre Tag Indicator (replaces 01/02 numbering, same font size & pill design) */}
                      {work.genre && (
                        <div className="absolute top-2.5 left-2.5 rounded bg-black/70 px-1.5 py-0.5 text-[8px] font-mono text-white/90 backdrop-blur-2xs z-20 uppercase tracking-wider">
                          {work.genre}
                        </div>
                      )}

                      {/* Overlaid Vertical Action Buttons on Front Card */}
                      {isFront && (
                        <div
                          className="absolute inset-x-0 bottom-0 pt-12 pb-3.5 px-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-2 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            to="/read/$workId/$chapterId"
                            params={{
                              workId: work.id,
                              chapterId: work.chapters[0]?.id || 'ch-1',
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black py-2.5 px-3 text-xs font-semibold hover:bg-neutral-100 active:scale-[0.98] transition shadow-md no-underline"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Begin Chapter 1</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenSample()
                            }}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-black/60 border border-white/25 text-white backdrop-blur-md py-2 px-3 text-xs font-medium hover:bg-black/80 active:scale-[0.98] transition cursor-pointer"
                          >
                            <Feather className="h-3.5 w-3.5" />
                            <span>Sample Opening Lines</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Mobile Swipe Indicators & Tap Nav */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {heroWorks.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    onClick={() => setActiveHeroIndex(dotIdx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      dotIdx === activeHeroIndex
                        ? 'w-6 bg-[var(--ink-primary)]'
                        : 'w-1.5 bg-[var(--border-strong)] hover:bg-[var(--ink-muted)]'
                    }`}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* 2. DESKTOP-ONLY CLASSIC SHOWCASE (strict hidden lg:block) */}
            <div className="hidden lg:block relative group w-full max-w-[310px]">
              {/* Main Physical Book Cover */}
              <div className="aspect-[2/3] w-full overflow-hidden rounded-lg border border-[var(--border-strong)] shadow-xl bg-[var(--bg-subtle)] relative touch-pan-y select-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeHeroWork.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="absolute inset-0"
                  >
                    <OptimizedImage
                      src={activeHeroWork.cover}
                      alt={activeHeroWork.title}
                      priority={true}
                      width={600}
                      height={900}
                      sizes="310px"
                      draggable={false}
                      containerClassName="h-full w-full"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102 pointer-events-none select-none"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Left/Right Quick Tap Arrows for desktop */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveHeroIndex((prev) => (prev > 0 ? prev - 1 : heroWorks.length - 1))
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  aria-label="Previous Cover"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveHeroIndex((prev) => (prev < heroWorks.length - 1 ? prev + 1 : 0))
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs transition cursor-pointer z-10 opacity-0 group-hover:opacity-100"
                  aria-label="Next Cover"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Spine depth shadow */}
                <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/30 to-transparent pointer-events-none z-10" />
                {/* Soft bottom vignette so overlapping thumbnails sit cleanly */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none z-10" />
              </div>

              {/* Available chapters badge positioned at top right */}
              <div className="absolute -top-3 -right-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-md z-20 pointer-events-none">
                <span className="font-mono text-[10px] text-[var(--ink-secondary)] font-medium">
                  {activeHeroWork.publishedChaptersCount} Chs Available
                </span>
              </div>

              {/* Elegant Overlapping Thumbnail Carousel Dock at bottom */}
              <div className="absolute -bottom-5 inset-x-3 z-20">
                <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 backdrop-blur-md p-1.5 shadow-xl flex items-center justify-between gap-1.5">
                  {heroWorks.map((work, idx) => {
                    const isActive = idx === activeHeroIndex
                    return (
                      <button
                        key={work.id}
                        type="button"
                        onClick={() => setActiveHeroIndex(idx)}
                        className={`group/thumb relative flex-1 flex flex-col items-center p-1 rounded-lg transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--bg-subtle)] ring-1.5 ring-[var(--ink-primary)] shadow-xs scale-102'
                            : 'hover:bg-[var(--bg-subtle)] opacity-70 hover:opacity-100'
                        }`}
                        title={work.title}
                        aria-label={`Select ${work.title}`}
                      >
                        <div className="aspect-[2/3] w-full rounded overflow-hidden border border-[var(--border-subtle)] shadow-xs">
                          <OptimizedImage
                            src={work.cover}
                            alt={work.title}
                            width={100}
                            height={150}
                            containerClassName="h-full w-full"
                            className={`h-full w-full object-cover transition-all ${
                              isActive ? '' : 'grayscale group-hover/thumb:grayscale-0'
                            }`}
                          />
                        </div>
                        <span className="font-mono text-[9px] text-[var(--ink-primary)] mt-1 truncate w-full text-center font-medium block">
                          0{idx + 1}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          MOBILE-ONLY SAMPLE TASTE BOTTOM SHEET (Using Design System BottomSheet)
          ========================================================================= */}
      <div className="lg:hidden">
        <BottomSheet
          isOpen={mobileSheetTasteOpen}
          onClose={() => setMobileSheetTasteOpen(false)}
          defaultHeightPercent={80}
          expandedHeightPercent={96}
          icon={<Feather className="h-3.5 w-3.5 text-[var(--ink-primary)]" />}
          title={activeHeroWork.title}
          subtitle={`Sample • ${activeHeroChapter?.title || 'Chapter 1'} (${activeHeroChapter?.readTimeMinutes || 12}m read)`}
          footer={
            <div className="flex items-center gap-2.5">
              <Link
                to="/read/$workId/$chapterId"
                params={{
                  workId: activeHeroWork.id,
                  chapterId: activeHeroWork.chapters[0]?.id || 'ch-1',
                }}
                onClick={() => setMobileSheetTasteOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-5 py-3 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 active:scale-[0.99] transition no-underline shadow-xs"
              >
                <BookOpen className="h-4 w-4" />
                <span>Continue Full Chapter 1</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMobileSheetTasteOpen(false)
                  openAuthModal()
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border border-[var(--border-strong)] text-xs text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                <Bookmark className="h-4 w-4" />
                <span>Save</span>
              </button>
            </div>
          }
        >
          {/* Metadata banner */}
          <div className="pb-2 border-b border-dashed border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5 text-[var(--ink-primary)] font-medium">
              <span>By {activeHeroWork.author.name}</span>
            </span>
            <span>{activeHeroWork.publishedChaptersCount} Chapters Available</span>
          </div>

          {/* Typeset Prose with Literary Drop Cap */}
          {activeTasteParagraphs.map((paragraph, index) => {
            if (index === 0) {
              const firstChar = paragraph.charAt(0)
              const restOfParagraph = paragraph.slice(1)
              return (
                <p key={index} className="text-base leading-relaxed text-[var(--ink-primary)]">
                  <span className="float-left text-4xl font-serif font-bold text-[var(--ink-primary)] leading-none mr-2.5 mt-1 border-b-2 border-[var(--ink-primary)] pb-0.5">
                    {firstChar}
                  </span>
                  {restOfParagraph}
                </p>
              )
            }
            return (
              <p key={index} className="text-base leading-relaxed text-[var(--ink-secondary)]">
                {paragraph}
              </p>
            )
          })}

          <div className="pt-6 pb-2 text-center border-t border-[var(--border-subtle)]">
            <p className="font-mono text-xs text-[var(--ink-muted)] italic">
              — End of sample folio preview —
            </p>
          </div>
        </BottomSheet>
      </div>


      {/* =========================================================================
          4. REIMAGINED: THE BOOKSTORE LIBRARY CATALOG & ARCHIVE SHELVES
          ========================================================================= */}
      <section className="space-y-6 pt-2">
        {/* Catalog Header with Search and Stats */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
                <BookText className="h-3.5 w-3.5" />
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)] font-medium">
                The Hatchpen Stacks • {allWorks.length} Cataloged Manuscripts
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
              Browse The Catalog
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1 font-serif">
              Explore serialized novels, meditative essays, and speculative archives arranged by shelf.
            </p>
          </div>

          {/* Interactive Search Bar & All Works Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-80">
              <AnimatedSearch
                variant="typewriter"
                size="sm"
                value={homeQuery}
                onChange={setHomeQuery}
                onSubmit={(val) => {
                  if (val.trim()) {
                    navigate({ to: '/search' })
                  }
                }}
                shortcut="/"
                placeholders={[
                  "Search 'The Silent Meridian'...",
                  "Search 'An Inventory of Baltic Fog'...",
                  "Search 'Elena Rostova'...",
                  "Search 'Station Nine cold war'...",
                  "Search 'A Winter in Kyoto'...",
                ]}
              />
            </div>

            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-mono font-medium text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline whitespace-nowrap"
            >
              <span>Full Archive</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Clean Bookstore Stacks Display */}

        {/* Live Filtered Shelf Grid (Clean bookstore spine cards with cover, author & chapter counts) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-1">
          {catalogDisplayWorks.map((work) => (
            <Link
              key={work.id}
              to="/works/$workId"
              params={{ workId: work.id }}
              className="group flex flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--ink-primary)] transition-all no-underline text-inherit shadow-2xs hover:shadow-sm"
            >
              {/* Book Jacket Aspect with subtle spine */}
              <div className="aspect-[2/3] w-full rounded overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-subtle)] relative mb-2.5">
                <OptimizedImage
                  src={work.cover}
                  alt={work.title}
                  width={240}
                  height={360}
                  sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"
                  containerClassName="h-full w-full"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-104 grayscale-25 group-hover:grayscale-0"
                />
                <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-mono text-white backdrop-blur-2xs">
                  {work.chaptersCount} ch
                </div>
              </div>

              {/* Typography Details */}
              <div className="flex flex-col flex-1 justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase block truncate">
                    {work.category} • {work.genre}
                  </span>
                  <h4 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] leading-snug line-clamp-2 mt-0.5 group-hover:underline">
                    {work.title}
                  </h4>
                </div>

                <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                  <span className="truncate">By {work.author.name}</span>
                  <ArrowRight className="h-3 w-3 text-[var(--ink-faint)] group-hover:text-[var(--ink-primary)] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================================
          5. TRENDING ACROSS READERS
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="h-4 w-4 text-[var(--ink-primary)]" />
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
                Trending on the Salon Floor
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Manuscripts commanding sustained reader engagement and discourse
              </p>
            </div>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
          >
            Explore Trending <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trendingWorks.map((work) => (
            <WorkCard key={work.id} work={work} layout="portrait" />
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. SPLIT CURATION: COMPLETED MASTERPIECES & GENRE ALCOVES
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left: Completed Works (Ready to Binge End-to-End) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--ink-primary)]" />
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                  Completed Serials
                </h3>
              </div>
              <span className="font-mono text-xs text-[var(--ink-muted)]">Read End-to-End</span>
            </div>

            <div className="space-y-3">
              {completedWorks.map((work) => (
                <Link
                  key={work.id}
                  to="/works/$workId"
                  params={{ workId: work.id }}
                  className="group flex items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 hover:border-[var(--border-strong)] transition-all no-underline text-inherit shadow-2xs"
                >
                  <img
                    src={work.cover}
                    alt={work.title}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-12 rounded object-cover grayscale flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-faint)]">
                      <span>{work.category}</span>
                      <span>•</span>
                      <span>{work.chaptersCount} Chapters</span>
                    </div>
                    <h4 className="font-serif text-sm font-semibold text-[var(--ink-primary)] truncate group-hover:underline">
                      {work.title}
                    </h4>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {work.author.name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--ink-faint)] group-hover:text-[var(--ink-primary)] transition-colors mr-2" />
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Literary Genres Alcoves */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                Literary Genres
              </h3>
              <span className="font-mono text-xs text-[var(--ink-faint)]">{GENRES.length} Shelves</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {GENRES.map((genre) => (
                <Link
                  key={genre.slug}
                  to="/genre/$slug"
                  params={{ slug: genre.slug }}
                  className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 hover:border-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-all no-underline text-inherit shadow-2xs"
                >
                  <p className="font-serif text-xs font-semibold text-[var(--ink-primary)]">
                    {genre.name}
                  </p>
                  <p className="font-mono text-[10px] text-[var(--ink-faint)] mt-0.5">
                    {genre.worksCount} cataloged
                  </p>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. WRITERS IN RESIDENCE WITH FEATURED QUOTES
          ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Writers in Residence
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Authors publishing ongoing serials, essays, and meditations on Hatchpen
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
          >
            Explore All Authors <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          8. PUBLIC INVITATION / MEMBERSHIP CALL TO ACTION
          ========================================================================= */}
      <section className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 sm:p-14 text-center space-y-6 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)] shadow-2xs">
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
            A quiet typographic sanctuary for modern letters.
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed text-[var(--ink-muted)]">
            Discover original serialized fiction, essays, and meditations. Create an account to customize your typography, bookmark manuscripts, and follow authors.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="inline-flex items-center gap-2 rounded border border-[var(--ink-primary)] bg-[var(--ink-primary)] px-6 py-2.5 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <span>Join The Hatchpen Reading Room</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <Link
            to="/discover"
            className="inline-flex items-center gap-2 rounded border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-2.5 text-xs font-medium text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] transition-colors no-underline"
          >
            <span>Explore Library Catalog</span>
          </Link>
        </div>
      </section>

    </div>
  )
}

/* ==========================================================================
   SIGNED-IN HOME PAGE — Personalized Reader Dashboard & Studio Hub
   ========================================================================== */
function SignedInHome() {
  const { user } = useUser()
  const {
    allWorks,
    savedWorkIds,
    readingProgress,
    followedAuthorIds,
  } = useApp()
  const [activeTab, setActiveTab] = useState('for-you')

  // Identify active reading progress item
  const progressEntries = Object.entries(readingProgress)
  const latestReadEntry = progressEntries.length > 0 ? progressEntries[0] : null
  const latestReadWork = latestReadEntry
    ? allWorks.find((w) => w.id === latestReadEntry[0])
    : null
  const latestProgressData = latestReadEntry ? latestReadEntry[1] : null

  // Tabbed collections
  const forYouWorks = useMemo(() => {
    return allWorks.filter((w) => w.trending || w.rising).slice(0, 6)
  }, [allWorks])

  const followedWorks = useMemo(() => {
    return allWorks.filter((w) => followedAuthorIds.includes(w.author.id))
  }, [allWorks, followedAuthorIds])

  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  const trendingWorks = useMemo(() => {
    return allWorks.filter((w) => w.trending).slice(0, 6)
  }, [allWorks])

  const cachedName = typeof window !== 'undefined' ? localStorage.getItem('hatchpen_user_name') : null
  const displayName =
    user?.firstName || user?.username || cachedName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Author'

  const dashboardTabs = [
    { id: 'for-you', label: 'Curated For You', icon: <Sparkles className="h-3.5 w-3.5" /> },
    {
      id: 'following',
      label: 'From Followed',
      icon: <Users className="h-3.5 w-3.5" />,
      badge: followedWorks.length > 0 ? followedWorks.length : undefined,
    },
    {
      id: 'saved',
      label: 'Your Library',
      icon: <Bookmark className="h-3.5 w-3.5" />,
      badge: savedWorks.length > 0 ? savedWorks.length : undefined,
    },
    { id: 'trending', label: 'Trending', icon: <Flame className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* PERSONALIZED SALUTATION & QUICK COMMAND BAR */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
              <span>Hatchpen Author Folio</span>
              <span>•</span>
              <span className="text-[var(--ink-primary)] font-semibold">Active Session</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-[var(--ink-primary)]">
              Welcome back, {displayName}.
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
              Pick up your reading queue or draft a new serialized manuscript.
            </p>
          </div>

          {/* Quick Action Shortcuts (Including Writer Studio access) */}
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PenLine className="h-3.5 w-3.5 shrink-0" />}
              >
                Write Story
              </Button>
            </Link>

            <Link to="/library" className="no-underline">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Bookmark className="h-3.5 w-3.5 shrink-0" />}
              >
                My Library ({savedWorkIds.length})
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* DUAL WIDGET: CONTINUE READING & READING QUOTA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Active Reading Card (7 cols) */}
        <div className="lg:col-span-7">
          {latestReadWork && latestProgressData ? (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[var(--ink-primary)]" />
                  <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                    Continue Reading
                  </h3>
                </div>
                <Link
                  to="/library"
                  className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
                >
                  View All in Queue <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                <div className="relative aspect-[3/4] w-24 sm:w-28 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <img
                    src={latestReadWork.cover}
                    alt={latestReadWork.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{latestReadWork.category}</span>
                      <span>•</span>
                      <span>Chapter {latestProgressData.chapterNumber}</span>
                    </div>
                    <h4 className="font-serif text-xl font-semibold text-[var(--ink-primary)] truncate mt-0.5">
                      {latestReadWork.title}
                    </h4>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {latestReadWork.author.name}
                    </p>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                      <span>Reading Progress</span>
                      <span className="font-semibold text-[var(--ink-primary)]">
                        {latestProgressData.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--ink-primary)] transition-all duration-300"
                        style={{ width: `${latestProgressData.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      to="/read/$workId/$chapterId"
                      params={{
                        workId: latestReadWork.id,
                        chapterId: latestProgressData.chapterId,
                      }}
                      className="no-underline"
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<BookOpen className="h-3.5 w-3.5 shrink-0" />}
                      >
                        Resume Chapter {latestProgressData.chapterNumber}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs space-y-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                  Begin Your Personal Reading Queue
                </h3>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                  You do not have any active manuscripts in progress yet. Browse the curated feed below or explore genres to bookmark your first folio.
                </p>
              </div>
              <Link to="/discover" className="inline-block no-underline pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CompassIcon className="h-3.5 w-3.5 shrink-0" />}
                >
                  Discover Manuscripts
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Right: Metric Progress Card (5 cols) */}
        <div className="lg:col-span-5">
          <MetricProgressCard
            usedPercent={savedWorkIds.length > 0 ? Math.min(100, savedWorkIds.length * 20) : 45}
            currentLabel={`${savedWorkIds.length} Saved in Library`}
            limitLabel="10 Recommended Goal"
            title="Literary Reading Activity"
            subtitle="Paced reading across serialized chapters"
            className="w-full"
          />
        </div>

      </div>

      {/* INTERACTIVE MEMBER FEED TABS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Your Reading Stream
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Personalized works, followed authors, and active bookmarks
            </p>
          </div>

          <AnimatedTabs
            tabs={dashboardTabs}
            activeId={activeTab}
            onChange={setActiveTab}
            size="sm"
            variant="pill"
          />
        </div>

        {/* Tab Content 1: Curated For You */}
        {activeTab === 'for-you' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {forYouWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}

        {/* Tab Content 2: From Followed Authors */}
        {activeTab === 'following' && (
          <div>
            {followedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {followedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-12 text-center space-y-3">
                <Users className="h-8 w-8 mx-auto text-[var(--ink-faint)]" />
                <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  No Followed Authors Yet
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Follow authors below or in the Writers directory to receive their newly published chapters in this feed.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-2">
                  <Button variant="outline" size="sm">
                    Discover Authors
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Saved Library Queue */}
        {activeTab === 'saved' && (
          <div>
            {savedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-12 text-center space-y-3">
                <Bookmark className="h-8 w-8 mx-auto text-[var(--ink-faint)]" />
                <h4 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                  Your Library is Empty
                </h4>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Click the bookmark icon on any manuscript to add it to your private reading queue.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-2">
                  <Button variant="outline" size="sm">
                    Browse Manuscripts
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 4: Trending */}
        {activeTab === 'trending' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}
      </section>

      {/* AUTHORS RESIDENCE RECOMMENDATIONS */}
      <section className="space-y-6 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Authors You Might Enjoy
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Acclaimed serialized writers and essayists on The Relay
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
          >
            Explore All Authors <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* WRITER STUDIO JUMP CARD */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 sm:p-10 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)]">
                <Feather className="h-4 w-4" />
              </span>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
                Writer Studio
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              Have a story or serialized manuscript to release? Draft chapters in a distraction-free environment, organize table of contents, and track reader metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/write" className="no-underline">
              <Button variant="outline" size="sm">
                Open Studio
              </Button>
            </Link>
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PenLine className="h-3.5 w-3.5 shrink-0" />}
              >
                New Manuscript
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
