import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { CATEGORIES, GENRES, AUTHORS, getWorkSlug } from '../data/mockData'
import WorkCard from '../components/WorkCard'
import AuthorCard from '../components/AuthorCard'
import { OptimizedImage } from '../components/OptimizedImage'
import {
  Button,
  Badge,
  AnimatedTabs,
  DiscreteTabs,
  MetricProgressCard,
  FilterDisclosure,
  BottomSheet,
  SpotlightCard,
  SPRINGS,
} from '../design-system'
import { UnisexAvatar } from '../components/UnisexAvatar'
import { TellnestLoader } from '../components/TellnestLoader'
import { useUser } from '@clerk/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Play,
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
  Star,
  Eye,
  Shield,
  Send,
  Sprout,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { formatViewCount } from '../lib/utils'
import { getAuthUserServerFn } from '../server/auth'
import { getUserRecommendationSignalsServerFn, type UserRecommendationSignals } from '../server/recommendations'
import { calculateForYouRecommendations } from '../lib/recommendations/engine'
import { filterAndOrderNewVoicesStories } from '../lib/recommendations/newVoices'
import { NewVoicesOpportunityModal } from '../components/NewVoicesOpportunityModal'
import { PublicMobileStories } from '../components/PublicMobileStories'
import {
  HERO_IMAGE_URL,
  getHeroImageSources,
  HERO_LOCAL_FALLBACK,
} from '../config/hero'

import principle1Img from '../assets/principles/card1_photo.png'
import principle2Img from '../assets/principles/card2_photo.png'
import principle3Img from '../assets/principles/card3_photo.png'

import calmMoodImg from '../assets/moods/Calm.webp'
import thoughtfulMoodImg from '../assets/moods/thoughtful.webp'
import intenseMoodImg from '../assets/moods/intense.webp'
import romanticMoodImg from '../assets/moods/romantic.webp'
import adventurousMoodImg from '../assets/moods/adventurous.webp'
import mysteriousMoodImg from '../assets/moods/Mysterious.webp'
import melancholicMoodImg from '../assets/moods/melancholic.webp'
import upliftingMoodImg from '../assets/moods/Uplifting.webp'
import whimsicalMoodImg from '../assets/moods/whimsical.webp'
import eerieMoodImg from '../assets/moods/Eerie.webp'
import wittyMoodImg from '../assets/moods/witty.webp'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: (search.view as string) || undefined,
  }),
  loader: async () => {
    const authUser = await getAuthUserServerFn()
    return {
      authUser,
      isAuthenticated: Boolean(authUser?.isAuthenticated),
    }
  },
  head: () =>
    generateMeta({
      title: 'HatchPen — A Quieter Place for Bolder Stories',
      description:
        'Discover fresh voices, unexpected worlds, and stories that stay with you on HatchPen.',
      canonicalUrl: 'https://hatchpen.com/',
      keywords: [
        'serialized fiction',
        'read novels online',
        'indie literature',
        'web novels',
        'stories by chapter',
        'free reading',
        'fiction community',
        'hatchpen',
      ],
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'HatchPen — A Quieter Place for Bolder Stories',
        url: 'https://hatchpen.com/',
        description:
          'Discover fresh voices, unexpected worlds, and stories that stay with you on HatchPen.',
      },
    }),
  component: HomePage,
})

function HomePage() {
  const loaderData = Route.useLoaderData()
  const search = Route.useSearch()
  const { isSignedIn, isLoaded } = useUser()
  const [explicitlyLoggedOut, setExplicitlyLoggedOut] = useState(false)
  const hadSignedInRef = useRef(false)

  useEffect(() => {
    if (isSignedIn) {
      hadSignedInRef.current = true
    } else if (hadSignedInRef.current && isLoaded && !isSignedIn) {
      // User was signed in during this client session, but just signed out
      setExplicitlyLoggedOut(true)
    }
  }, [isSignedIn, isLoaded])

  // Explicit query param override for testing / previewing
  if (search?.view === 'signed-in') {
    return <LoggedInHome />
  }
  if (search?.view === 'public') {
    return <PublicHome />
  }

  // 1. If user explicitly signed out in this session, render PublicHome
  if (explicitlyLoggedOut) {
    return <PublicHome />
  }

  // 2. If server determined authenticated session, render LoggedInHome immediately.
  if (loaderData?.isAuthenticated || loaderData?.authUser?.isAuthenticated) {
    return <LoggedInHome />
  }

  // 3. If server was unauthenticated, but user signed in dynamically on client
  if (isLoaded && isSignedIn) {
    return <LoggedInHome />
  }

  // 4. Check for cached session indicator if present
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem('hatchpen_has_session') === 'true' && !explicitlyLoggedOut) {
        return <LoggedInHome />
      }
    } catch {}
  }

  // 5. Default for unauthenticated visitors
  return <PublicHome />
}

/* ==========================================================================
   NEW HATCHPEN EDITORIAL DESIGN — "A Quieter Place for Bolder Stories"
   ========================================================================== */

function ArrowCurvedDownLeft() {
  return (
    <svg width="38" height="32" viewBox="0 0 38 32" fill="none" className="text-[#6B6B70] dark:text-[#A1A1AA] stroke-current shrink-0">
      <path
        d="M34 3 C 24 2, 8 7, 4 25"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 18 L 4 25 L 11 22"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function ArrowCurvedUpLeft() {
  return (
    <svg width="38" height="32" viewBox="0 0 38 32" fill="none" className="text-[#6B6B70] dark:text-[#A1A1AA] stroke-current shrink-0">
      <path
        d="M34 29 C 24 28, 8 23, 4 7"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 10 L 4 7 L 2 14"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

const MOOD_DATA = [
  {
    id: 'calm',
    title: 'Calm',
    description: 'Quiet prose for unhurried minds.',
    tags: ['Comforting', 'Slice of life', 'Healing'],
    image: calmMoodImg,
    link: '/discover?genre=slice-of-life',
  },
  {
    id: 'thoughtful',
    title: 'Thoughtful',
    description: 'Deep, philosophical reflections.',
    tags: ['Literary', 'Philosophical', 'Character-driven'],
    image: thoughtfulMoodImg,
    link: '/discover?category=essays',
  },
  {
    id: 'intense',
    title: 'Intense',
    description: 'High stakes and psychological grit.',
    tags: ['Psychological', 'Dark fiction', 'High tension'],
    image: intenseMoodImg,
    link: '/discover?genre=thriller',
  },
  {
    id: 'romantic',
    title: 'Romantic',
    description: 'Tender, bittersweet connections.',
    tags: ['Emotional', 'Slow burn', 'Heartfelt'],
    image: romanticMoodImg,
    link: '/discover?genre=romance',
  },
  {
    id: 'adventurous',
    title: 'Adventurous',
    description: 'Expansive journeys and uncharted worlds.',
    tags: ['Discovery', 'Wild frontiers', 'New worlds'],
    image: adventurousMoodImg,
    link: '/discover?genre=fantasy',
  },
  {
    id: 'mysterious',
    title: 'Mysterious',
    description: 'Nocturnal tension, secrets, and urban shadows.',
    tags: ['Noir', 'Suspense', 'Secrets'],
    image: mysteriousMoodImg,
    link: '/discover?genre=crime',
  },
  {
    id: 'nostalgic',
    title: 'Nostalgic',
    description: 'Poetic longing, quiet rain, and bittersweet memories.',
    tags: ['Bittersweet', 'Nostalgia', 'Quiet grief'],
    image: melancholicMoodImg,
    link: '/discover?genre=literary-fiction',
  },
  {
    id: 'uplifting',
    title: 'Uplifting',
    description: 'Luminous tales of quiet resilience and hope.',
    tags: ['Uplifting', 'New beginnings', 'Comfort'],
    image: upliftingMoodImg,
    link: '/discover?genre=contemporary',
  },
  {
    id: 'whimsical',
    title: 'Whimsical',
    description: 'Surreal edges, playful wonder, and magical realism.',
    tags: ['Surreal', 'Magical realism', 'Wonder'],
    image: whimsicalMoodImg,
    link: '/discover?genre=magical-realism',
  },
  {
    id: 'eerie',
    title: 'Eerie',
    description: 'Chilling atmosphere and creeping secrets.',
    tags: ['Suspense', 'Paranoid', 'Unsettling'],
    image: eerieMoodImg,
    link: '/discover?genre=mystery',
  },
  {
    id: 'witty',
    title: 'Witty',
    description: 'Sharp humor and acute human observation.',
    tags: ['Humor', 'Sharp dialogue', 'Social satire'],
    image: wittyMoodImg,
    link: '/discover?genre=satire',
  },
]

const CARD_ROTATIONS = [
  'rotate-[0deg]',
  'rotate-[1.2deg] translate-y-1',
  '-rotate-[1deg] -translate-y-1',
  'rotate-[1.4deg] translate-y-0.5',
  '-rotate-[1.2deg] -translate-y-0.5',
  'rotate-[0.8deg] translate-y-1',
  '-rotate-[1.5deg] -translate-y-1',
  'rotate-[1.1deg] translate-y-0.5',
  '-rotate-[0.9deg] -translate-y-0.5',
  'rotate-[1.3deg] translate-y-1',
]

const TESTIMONIALS_DATA = [
  {
    id: 'writer',
    badge: "A WRITER'S STORY",
    quote:
      "I'm a new writer. On HatchPen, my work didn't disappear into the feed—it was pushed to readers who actually stayed. For the first time, my writing found an audience.",
    authorName: 'A new writer',
    authorSub: 'on HatchPen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'reader',
    badge: "A READER'S STORY",
    quote:
      "I stopped chasing algorithmic bestsellers. On HatchPen, I found stories no one's talking about—but they're as good as the classics. Great writing, zero noise.",
    authorName: 'A reader',
    authorSub: 'on HatchPen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  },
]

function PublicHome() {
  const { openAuthModal, openPublicWriteModal } = useApp()
  const { isSignedIn } = useUser()

  // Single-source hero photograph configuration (src/config/hero.ts)
  const [heroImageFailed, setHeroImageFailed] = useState(false)
  const { src: heroSrc, srcSet: heroSrcSet, fallback: heroFallback } = useMemo(() => {
    return getHeroImageSources()
  }, [])

  // Carousel refs & state for Mood discovery
  const [activeMoodIndex, setActiveMoodIndex] = useState(0)
  const moodScrollRef = useRef<HTMLDivElement>(null)

  const scrollToMoodIndex = useCallback((index: number) => {
    if (!moodScrollRef.current) return
    const container = moodScrollRef.current
    const cardElement = container.children[index] as HTMLElement
    if (cardElement) {
      const cardLeft = cardElement.offsetLeft
      container.scrollTo({
        left: Math.max(0, cardLeft - 12),
        behavior: 'smooth',
      })
    }
  }, [])

  const handleMoodStep = useCallback((step: number) => {
    setActiveMoodIndex((prev) => {
      const total = MOOD_DATA.length
      const nextIndex = (prev + step + total) % total
      scrollToMoodIndex(nextIndex)
      return nextIndex
    })
  }, [scrollToMoodIndex])

  const handleMoodScroll = useCallback(() => {
    if (!moodScrollRef.current) return
    const container = moodScrollRef.current
    const scrollLeft = container.scrollLeft
    const firstChild = container.children[0] as HTMLElement
    if (!firstChild) return
    const cardStep = firstChild.offsetWidth + 14
    const newIndex = Math.min(
      MOOD_DATA.length - 1,
      Math.max(0, Math.round(scrollLeft / cardStep))
    )
    setActiveMoodIndex(newIndex)
  }, [])

  // Testimonials carousel
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0)

  return (
    <>
      <PublicMobileStories
        onOpenAuth={openAuthModal}
        onOpenWriteModal={openPublicWriteModal}
      />
      <div className="hidden md:block w-full min-h-screen bg-[#FAF7F2] dark:bg-[#0E0F12] text-[#18181B] dark:text-[#F4F4F5] selection:bg-[#C85A32]/20 selection:text-[#C85A32]">
      
      {/* =========================================================================
          1. HERO SECTION — Premium Editorial Composition (Full-Bleed Asymmetric)
          ========================================================================= */}
      <section className="relative w-full overflow-hidden bg-[#F2EDE3] dark:bg-[#121316] text-[#201F1D] dark:text-[#F4F4F5] min-h-[580px] lg:min-h-[620px] xl:min-h-[660px] flex flex-col justify-between">
        
        {/* DESKTOP FULL-BLEED RIGHT VISUAL SCENE — CLEAN SINGLE ALPHA MASK */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[58%] xl:w-[60%] h-full z-0 overflow-hidden pointer-events-none select-none">
          <img
            src={heroImageFailed ? heroFallback : heroSrc}
            srcSet={heroImageFailed ? undefined : heroSrcSet}
            sizes="(min-width: 1280px) 60vw, (min-width: 1024px) 58vw, 100vw"
            alt="Atmospheric literary writing desk with notebook, brass lamp and warm afternoon sunlight"
            width={1672}
            height={941}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => {
              if (!heroImageFailed) setHeroImageFailed(true)
            }}
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 4%, rgba(0, 0, 0, 0.25) 10%, rgba(0, 0, 0, 0.70) 18%, #000 25%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.05) 4%, rgba(0, 0, 0, 0.25) 10%, rgba(0, 0, 0, 0.70) 18%, #000 25%)',
            }}
            className="w-full h-full object-cover object-[center_35%]"
          />
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-10 lg:pb-14 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Content Region (38-42% desktop width) */}
            <div className="lg:col-span-5 flex flex-col items-start pr-0 xl:pr-4">
              {/* Eyebrow with burnt-orange accent rule */}
              <div className="flex items-center gap-2.5 mb-4 sm:mb-5">
                <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#201F1D] dark:text-[#E4E4E7]">
                  WRITINGS. BEYOND THE HYPE
                </span>
                <div className="w-7 h-[2px] bg-[#B94F37] rounded-full" />
              </div>

              {/* Main Display Headline */}
              <h1 className="text-[46px] sm:text-[62px] lg:text-[68px] xl:text-[78px] font-black uppercase tracking-[-0.035em] leading-[0.92] text-[#201F1D] dark:text-[#F4F4F5] mb-5 sm:mb-6">
                A QUIETER<br />
                PLACE FOR<br />
                <span className="text-[#B94F37]">BOLDER</span><br />
                STORIES.
              </h1>

              {/* Supporting Copy */}
              <p className="text-[16px] sm:text-[17.5px] leading-[1.58] text-[#5A544C] dark:text-[#A1A1AA] max-w-[350px] mb-8 font-normal">
                Discover fresh voices, unexpected worlds, and stories that stay with you.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  to="/discover"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#201F1D] text-[#F2EDE3] text-[14px] font-medium hover:bg-[#151513] transition-all duration-200 shadow-sm group no-underline focus:outline-none focus:ring-2 focus:ring-[#B94F37] focus:ring-offset-2"
                >
                  <span>Explore stories</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>

                <Link
                  to={isSignedIn ? '/write' : '#'}
                  onClick={(e) => {
                    if (!isSignedIn) {
                      e.preventDefault()
                      openPublicWriteModal()
                    }
                  }}
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full border border-[#201F1D]/30 hover:border-[#201F1D] bg-transparent hover:bg-[#EAE4D8]/60 dark:hover:bg-neutral-800 text-[#201F1D] dark:text-[#F4F4F5] text-[14px] font-medium transition-all duration-200 no-underline focus:outline-none focus:ring-2 focus:ring-[#B94F37] focus:ring-offset-2"
                >
                  Start writing
                </Link>
              </div>

              {/* Community Metrics from Editorial Reference */}
              <div className="flex items-center gap-7 mt-8 pt-1">
                <div>
                  <div className="text-[20px] font-black tracking-tight text-[#201F1D] dark:text-[#F4F4F5]">50K+</div>
                  <div className="text-[12px] text-[#71695F] dark:text-[#A1A1AA] font-normal">Stories</div>
                </div>
                <div>
                  <div className="text-[20px] font-black tracking-tight text-[#201F1D] dark:text-[#F4F4F5]">12K+</div>
                  <div className="text-[12px] text-[#71695F] dark:text-[#A1A1AA] font-normal">Writers</div>
                </div>
                <div>
                  <div className="text-[20px] font-black tracking-tight text-[#201F1D] dark:text-[#F4F4F5]">1M+</div>
                  <div className="text-[12px] text-[#71695F] dark:text-[#A1A1AA] font-normal">Reads</div>
                </div>
              </div>
            </div>

            {/* Right Visual & Testimonial Cards Region (58-62% desktop width) */}
            <div className="lg:col-span-7 relative flex flex-col items-center lg:items-end justify-center">
              
              {/* MOBILE & TABLET INLINE VISUAL SCENE */}
              <div className="block lg:hidden w-full mb-8 relative rounded-3xl overflow-hidden shadow-xl border border-[#D7CFC3] dark:border-neutral-800 aspect-[16/10] sm:aspect-[2/1]">
                <img
                  src={heroImageFailed ? heroFallback : heroSrc}
                  srcSet={heroImageFailed ? undefined : heroSrcSet}
                  sizes="(min-width: 640px) 90vw, 100vw"
                  alt="Atmospheric literary writing desk with notebook, brass lamp and warm afternoon sunlight"
                  width={1672}
                  height={941}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onError={() => {
                    if (!heroImageFailed) setHeroImageFailed(true)
                  }}
                  className="w-full h-full object-cover object-center"
                />
                {/* Clean vignette for contrast and depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* SIGNATURE ELEMENT: TWO OVERLAPPING TESTIMONIAL CARDS */}
              <div className="w-full max-w-md sm:max-w-lg lg:max-w-[420px] xl:max-w-[450px] flex flex-col relative space-y-4 lg:space-y-3">
                
                {/* Card A — New Writer Testimonial */}
                <div
                  className="relative lg:mr-6 xl:mr-10 bg-[#FDFBF7] text-[#201F1D] rounded-2xl p-5 sm:p-5.5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] border border-[#D7CFC3] lg:-rotate-[1.5deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 group select-none"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F8ECE8] text-[#B94F37] text-[10px] font-bold uppercase tracking-wider">
                      A WRITER&apos;S STORY
                    </span>
                    <Send className="w-3.5 h-3.5 text-[#B94F37] rotate-12 opacity-80" />
                  </div>

                  <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-[#201F1D]/90 font-normal mb-3.5">
                    &ldquo;I&apos;m a new writer. On HatchPen, my work didn&apos;t disappear into the feed—it was pushed to readers who actually stayed. For the first time, my writing found an audience.&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE3D6] text-[11px] text-[#71695F]">
                    <span className="font-medium text-[#201F1D]">A new writer · on HatchPen</span>
                  </div>

                  {/* Handwritten callout (Editorial annotation) */}
                  <div className="hidden sm:flex absolute -top-7 -right-6 lg:-right-10 items-center gap-1.5 pointer-events-none select-none">
                    <span className="font-['Caveat',cursive] text-[18px] text-[#5A544C] dark:text-[#D4D4D8] -rotate-6 whitespace-nowrap">
                      New writers<br />get discovered.
                    </span>
                    <ArrowCurvedDownLeft />
                  </div>
                </div>

                {/* Card B — Underrated Stories Testimonial */}
                <div
                  className="relative lg:ml-6 xl:ml-8 bg-[#18191C] text-[#F2EDE3] rounded-2xl p-5 sm:p-5.5 shadow-[0_22px_45px_rgba(0,0,0,0.32)] border border-[#333230] lg:rotate-[1.5deg] hover:rotate-0 hover:-translate-y-1 transition-all duration-300 group select-none"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#27272A] text-[#E4E4E7] text-[10px] font-bold uppercase tracking-wider">
                      A READER&apos;S STORY
                    </span>
                    <Send className="w-3.5 h-3.5 text-[#B94F37] rotate-12 opacity-80" />
                  </div>

                  <p className="text-[12.5px] sm:text-[13px] leading-relaxed text-[#F2EDE3]/90 font-normal mb-3.5">
                    &ldquo;I stopped chasing algorithmic bestsellers. On HatchPen, I found stories no one&apos;s talking about—but they&apos;re as good as the classics. Great writing, zero noise.&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-2.5 border-t border-neutral-800 text-[11px] text-neutral-400">
                    <span className="font-medium text-[#F2EDE3]">A reader · on HatchPen</span>
                  </div>

                  {/* Handwritten callout (Editorial annotation) */}
                  <div className="hidden sm:flex absolute -bottom-7 -right-4 lg:-right-8 items-center gap-1.5 pointer-events-none select-none">
                    <ArrowCurvedUpLeft />
                    <span className="font-['Caveat',cursive] text-[17px] text-[#5A544C] dark:text-[#D4D4D8] rotate-3 whitespace-nowrap">
                      Underrated<br />stories deserve<br />readers too.
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>

      </section>

      {/* =========================================================================
          2. MOOD DISCOVERY CAROUSEL — Cinematic Near-Black Editorial Canvas
          ========================================================================= */}
      <section className="relative w-full bg-[#0B0C0E] text-white py-10 sm:py-12 lg:py-14 overflow-hidden border-t border-neutral-900 select-none">
        {/* Subtle cinematic atmosphere grain & ground spotlight */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(200,90,50,0.06),rgba(0,0,0,0))] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(200,90,50,0.08),rgba(0,0,0,0))] pointer-events-none" />

        <div className="w-full pl-5 sm:pl-8 lg:pl-10 xl:pl-14 pr-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-6 xl:gap-8">
            
            {/* Left Editorial Text Column (approx 24–28% desktop width) */}
            <div className="w-full lg:w-[275px] xl:w-[305px] shrink-0 flex flex-col justify-between z-10 pr-4 lg:pr-0">
              <div>
                <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.22em] uppercase text-[#C85A32] mb-2 sm:mb-3 block">
                  DISCOVER BY FEELING
                </span>

                <h2 className="text-[32px] sm:text-[36px] lg:text-[40px] xl:text-[44px] font-extrabold tracking-[-0.035em] leading-[1.04] text-white mb-3 sm:mb-4">
                  Stories for<br className="hidden sm:inline" />
                  {' '}every <span className="text-[#C85A32]">mood.</span>
                </h2>

                <p className="text-[13.5px] sm:text-[14px] leading-relaxed text-[#A1A1AA] max-w-xs font-normal mb-6 sm:mb-7">
                  Not just genres. Explore stories that match how you feel right now.
                </p>

                <Link
                  to="/discover"
                  className="inline-flex items-center justify-between w-full max-w-[220px] sm:max-w-[240px] px-6 py-2.5 sm:py-3 rounded-full bg-[#F5F2EB] hover:bg-white text-[#0B0C0E] text-[13px] sm:text-[14px] font-semibold transition-all duration-200 shadow-md group no-underline focus:outline-none focus:ring-2 focus:ring-[#C85A32]"
                >
                  <span>Explore by mood</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Counter and Progress Track below CTA */}
              <div className="flex items-center gap-3.5 mt-6 sm:mt-8 pt-0.5">
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-white text-[14px] sm:text-[15px] font-bold tracking-tight">
                    {String(activeMoodIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="text-neutral-500 text-xs font-light">/</span>
                  <span className="text-neutral-500 text-xs font-light">
                    {String(MOOD_DATA.length).padStart(2, '0')}
                  </span>
                </div>

                <div className="w-24 sm:w-32 h-[2px] bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C85A32] transition-all duration-300 ease-out"
                    style={{
                      width: `${((activeMoodIndex + 1) / MOOD_DATA.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Mood Carousel Viewport (extends toward right edge, shows 6+ cards) */}
            <div className="relative w-full lg:flex-1 min-w-0 overflow-hidden">
              
              {/* Circular Outlined Prev Arrow */}
              <button
                type="button"
                onClick={() => handleMoodStep(-1)}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/20 bg-[#0B0C0E]/80 hover:bg-[#0B0C0E]/95 hover:border-white/60 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl active:scale-95 z-30 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#C85A32]"
                aria-label="Previous mood"
              >
                <ChevronLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[1.75]" />
              </button>

              {/* Circular Outlined Next Arrow */}
              <button
                type="button"
                onClick={() => handleMoodStep(1)}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/20 bg-[#0B0C0E]/80 hover:bg-[#0B0C0E]/95 hover:border-white/60 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xl active:scale-95 z-30 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-[#C85A32]"
                aria-label="Next mood"
              >
                <ChevronRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[1.75]" />
              </button>

              {/* Horizontal Scroll Track without scrollbar */}
              <div
                ref={moodScrollRef}
                onScroll={handleMoodScroll}
                className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth py-4 sm:py-5 pr-10 sm:pr-16 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {MOOD_DATA.map((mood, idx) => {
                  const isActive = idx === activeMoodIndex
                  const rotationClass = CARD_ROTATIONS[idx % CARD_ROTATIONS.length]

                  return (
                    <div
                      key={mood.id}
                      onClick={() => {
                        if (!isActive) {
                          setActiveMoodIndex(idx)
                          scrollToMoodIndex(idx)
                        }
                      }}
                      style={{ scrollSnapAlign: 'start' }}
                      className={`relative shrink-0 w-[145px] sm:w-[155px] xl:w-[165px] h-[260px] sm:h-[280px] xl:h-[295px] rounded-[16px] sm:rounded-[18px] overflow-hidden transition-all duration-500 ease-out flex flex-col justify-end group ${
                        isActive
                          ? 'border-2 border-white/40 shadow-[0_20px_40px_rgba(0,0,0,0.9)] scale-[1.02] z-20'
                          : 'border border-white/15 opacity-85 hover:opacity-100 hover:scale-[1.0] z-10 cursor-pointer'
                      } ${rotationClass}`}
                    >
                      {/* Photographic Artwork */}
                      <img
                        src={mood.image}
                        alt={mood.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Dark gradient for legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 via-45% to-transparent pointer-events-none" />

                      {/* Bottom Editorial Content */}
                      <div className="relative z-10 p-3 sm:p-3.5 flex flex-col justify-end">
                        <h3 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-white leading-tight mb-1">
                          {mood.title}
                        </h3>

                        <p className="text-[11px] sm:text-[11.5px] text-neutral-300 font-normal leading-snug line-clamp-2 mb-2">
                          {mood.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-1 text-[9.5px] sm:text-[10px] font-mono text-neutral-400">
                          {mood.tags.slice(0, 2).map((tag, tIdx) => (
                            <span key={tag} className="inline-flex items-center">
                              {tIdx > 0 && <span className="mx-1 text-neutral-600">•</span>}
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Link overlay */}
                      <Link
                        to={mood.link as any}
                        className="absolute inset-0 z-20 focus:outline-none"
                        aria-label={`Explore ${mood.title} mood`}
                      />
                    </div>
                  )
                })}
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          3. OUR PRINCIPLES — Light Warm Editorial Canvas (#FAF7F2)
             Compact Upward-Looking Architectural Perspective Cards
          ========================================================================= */}
      <section className="relative w-full bg-[#FAF7F2] dark:bg-[#121316] text-[#18181B] dark:text-[#F4F4F5] py-10 sm:py-12 lg:py-14 border-b border-[#EAE4D8] dark:border-neutral-800 overflow-hidden select-none">
        {/* Subtle decorative curved ambient contour lines */}
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 1440 500" fill="none" preserveAspectRatio="none">
            <path
              d="M-80 380 C 250 120, 580 440, 950 200 C 1150 80, 1380 280, 1600 160"
              stroke="#D4CEBF"
              strokeWidth="1.2"
              strokeDasharray="4 6"
              className="dark:stroke-neutral-800"
            />
            <path
              d="M100 480 C 420 220, 780 500, 1180 240 C 1320 160, 1460 260, 1620 210"
              stroke="#E2DBD0"
              strokeWidth="0.8"
              className="dark:stroke-neutral-800/60"
            />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Left Editorial Header Column (approx 30–33% desktop width) */}
            <div className="lg:col-span-4 flex flex-col justify-between items-start pr-0 lg:pr-2">
              <div>
                <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.22em] uppercase text-[#C85A32] mb-2 sm:mb-2.5 block">
                  OUR PRINCIPLES
                </span>

                <h2 className="text-[32px] sm:text-[38px] lg:text-[40px] xl:text-[44px] font-black tracking-[-0.035em] leading-[1.04] text-[#18181B] dark:text-[#F4F4F5] mb-3 sm:mb-4">
                  A better place<br className="hidden sm:inline" />
                  {' '}for every <span className="text-[#C85A32]">writer.</span>
                </h2>

                <p className="text-[13.5px] sm:text-[14.5px] leading-[1.58] text-[#5A544C] dark:text-[#A1A1AA] max-w-[320px] mb-6 sm:mb-7 font-normal">
                  Fair discovery, a reading experience that feels effortless, and the tools to grow. That&apos;s what HatchPen is built for.
                </p>

                <Link
                  to="/discover"
                  className="inline-flex items-center justify-between w-full max-w-[240px] h-[46px] sm:h-[48px] px-6 rounded-full bg-[#18181B] hover:bg-[#2B2C31] dark:bg-white dark:hover:bg-neutral-200 text-[#FAF7F2] dark:text-[#18181B] text-[13.5px] font-semibold transition-all duration-200 shadow-lg group no-underline focus:outline-none focus:ring-2 focus:ring-[#C85A32] focus:ring-offset-2"
                >
                  <span>Explore how it works</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Bottom Brand Values Ticker */}
              <div className="mt-8 sm:mt-10 text-[10.5px] sm:text-[11px] font-mono tracking-[0.24em] text-[#8E887E] dark:text-neutral-500 uppercase flex items-center gap-1.5 select-none">
                <span>DISCOVER</span>
                <span className="opacity-40">/</span>
                <span>READ</span>
                <span className="opacity-40">/</span>
                <span>GROW</span>
                <span className="opacity-40">/</span>
                <span>TOGETHER</span>
              </div>
            </div>

            {/* Right 3-Card Principle Grid (Dark Obsidian Cinematic Cards matching reference, on light background) */}
            <div className="lg:col-span-8 relative py-1 sm:py-2">
              {/* Vintage Manuscript Sheets Peeking Out Behind the Cards (Matching Reference Image) */}
              <div
                className="absolute -left-4 sm:-left-6 top-6 sm:top-10 w-28 sm:w-36 h-48 sm:h-60 bg-[#EADFCE] border border-[#D6C7AE] rounded-xl -rotate-12 pointer-events-none shadow-lg opacity-80 overflow-hidden z-0 hidden md:block"
                style={{ transform: 'rotate(-9deg) translateY(6px)' }}
              >
                <div className="p-3.5 space-y-2.5 opacity-30 select-none">
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-3/4" />
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-5/6" />
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-2/3" />
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-4/5" />
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-1/2" />
                  <div className="h-1.5 bg-[#7D6B5A] rounded w-3/4" />
                </div>
              </div>

              <div
                className="absolute -right-4 sm:-right-6 top-8 sm:top-12 w-30 sm:w-40 h-50 sm:h-64 bg-[#E8DCB7] border border-[#CEBD8E] rounded-xl rotate-12 pointer-events-none shadow-lg opacity-80 overflow-hidden z-0 hidden md:block"
                style={{ transform: 'rotate(8deg) translateY(10px)' }}
              >
                <div className="p-3.5 space-y-2.5 opacity-35 select-none">
                  <div className="h-1.5 bg-[#6D5A46] rounded w-4/5" />
                  <div className="h-1.5 bg-[#6D5A46] rounded w-full" />
                  <div className="h-1.5 bg-[#6D5A46] rounded w-3/4" />
                  <div className="h-1.5 bg-[#6D5A46] rounded w-5/6" />
                  <div className="h-1.5 bg-[#6D5A46] rounded w-2/3" />
                  <div className="h-1.5 bg-[#6D5A46] rounded w-3/4" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-4.5 lg:gap-4.5 relative z-10 [perspective:900px]">
                
                {/* Card 1: Fair Discovery (Top expanded, bottom narrower, subtle tilt) */}
                <div
                  style={{
                    transform: 'perspective(800px) rotateX(-5deg) rotateY(2deg) rotateZ(-1deg)',
                    transformOrigin: '50% 0%',
                    transformStyle: 'preserve-3d',
                  }}
                  className="group relative h-[385px] sm:h-[405px] rounded-[20px] sm:rounded-[24px] bg-[#0E0F12] border border-white/[0.12] hover:border-white/[0.25] shadow-[0_16px_36px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.18)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo Artwork with subtle bottom fade into dark card */}
                  <div className="relative w-full h-[165px] sm:h-[180px] overflow-hidden bg-[#15161A] shrink-0">
                    <img
                      src={principle1Img}
                      alt="Atmospheric sunbeams through a rustic window on stacked books with circular discovery badge"
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Seamless bottom fade into obsidian body */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/40 via-20% to-transparent pointer-events-none" />
                  </div>

                  {/* Card Content Column */}
                  <div className="p-4 sm:p-4.5 pt-1 flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <h3 className="text-[19px] sm:text-[21px] font-black tracking-tight leading-[1.08] mb-1.5">
                        <span className="text-[#FAF7F2] block">Fair</span>
                        <span className="text-[#E06338] block">Discovery</span>
                      </h3>

                      <p className="text-[11.5px] sm:text-[12px] leading-[1.48] text-[#A1A1AA] font-normal mb-2">
                        Great stories shouldn&apos;t need to be popular to be found. We give new and lesser-known writers a real chance.
                      </p>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold text-[#E06338] border-b border-[#E06338]/60 pb-0.5 group-hover:border-[#E06338] group-hover:text-[#F37B53] transition-colors">
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/discover"
                    className="absolute inset-0 z-20 focus:outline-none"
                    aria-label="Learn more about Fair Discovery"
                  />
                </div>

                {/* Card 2: Better Reading (Normal, zero tilt) */}
                <div
                  style={{
                    transform: 'none',
                  }}
                  className="group relative h-[385px] sm:h-[405px] rounded-[20px] sm:rounded-[24px] bg-[#0E0F12] border border-white/[0.12] hover:border-white/[0.25] shadow-[0_16px_36px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.18)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo Artwork with subtle bottom fade into dark card */}
                  <div className="relative w-full h-[165px] sm:h-[180px] overflow-hidden bg-[#15161A] shrink-0">
                    <img
                      src={principle2Img}
                      alt="Cozy reading nook with open book and warm coffee mug on knit blanket with circular book badge"
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Seamless bottom fade into obsidian body */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/40 via-20% to-transparent pointer-events-none" />
                  </div>

                  {/* Card Content Column */}
                  <div className="p-4 sm:p-4.5 pt-1 flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <h3 className="text-[19px] sm:text-[21px] font-black tracking-tight leading-[1.08] mb-1.5">
                        <span className="text-[#FAF7F2] block">Better</span>
                        <span className="text-[#E06338] block">Reading</span>
                      </h3>

                      <p className="text-[11.5px] sm:text-[12px] leading-[1.48] text-[#A1A1AA] font-normal mb-2">
                        A clean, immersive reading experience that helps you stay in the story, without unnecessary distractions.
                      </p>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold text-[#E06338] border-b border-[#E06338]/60 pb-0.5 group-hover:border-[#E06338] group-hover:text-[#F37B53] transition-colors">
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/discover"
                    className="absolute inset-0 z-20 focus:outline-none"
                    aria-label="Learn more about Better Reading"
                  />
                </div>

                {/* Card 3: Writer Growth (Top expanded, bottom narrower, subtle tilt) */}
                <div
                  style={{
                    transform: 'perspective(800px) rotateX(-5deg) rotateY(-2deg) rotateZ(1deg)',
                    transformOrigin: '50% 0%',
                    transformStyle: 'preserve-3d',
                  }}
                  className="group relative h-[385px] sm:h-[405px] rounded-[20px] sm:rounded-[24px] bg-[#0E0F12] border border-white/[0.12] hover:border-white/[0.25] shadow-[0_16px_36px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.18)] hover:shadow-[0_24px_50px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo Artwork with subtle bottom fade into dark card */}
                  <div className="relative w-full h-[165px] sm:h-[180px] overflow-hidden bg-[#15161A] shrink-0">
                    <img
                      src={principle3Img}
                      alt="Writer sitting at desk in warm golden hour sunset by window with circular sprout badge"
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Seamless bottom fade into obsidian body */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F12] via-[#0E0F12]/40 via-20% to-transparent pointer-events-none" />
                  </div>

                  {/* Card Content Column */}
                  <div className="p-4 sm:p-4.5 pt-1 flex-1 flex flex-col justify-between relative z-10">
                    <div>
                      <h3 className="text-[19px] sm:text-[21px] font-black tracking-tight leading-[1.08] mb-1.5">
                        <span className="text-[#FAF7F2] block">Writer</span>
                        <span className="text-[#E06338] block">Growth</span>
                      </h3>

                      <p className="text-[11.5px] sm:text-[12px] leading-[1.48] text-[#A1A1AA] font-normal mb-2">
                        Publishing is just the beginning. Get meaningful insights, helpful feedback, and a supportive community as you grow.
                      </p>
                    </div>

                    <div>
                      <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[12.5px] font-semibold text-[#E06338] border-b border-[#E06338]/60 pb-0.5 group-hover:border-[#E06338] group-hover:text-[#F37B53] transition-colors">
                        <span>Learn more</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>

                  <Link
                    to={isSignedIn ? '/write' : '#'}
                    onClick={(e) => {
                      if (!isSignedIn) {
                        e.preventDefault()
                        openPublicWriteModal()
                      }
                    }}
                    className="absolute inset-0 z-20 focus:outline-none"
                    aria-label="Learn more about Writer Growth"
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          4. BEYOND THE HYPE — Dark Obsidian Theme (#111215)
          ========================================================================= */}
      <section className="relative w-full bg-[#111215] text-white py-16 sm:py-24 border-b border-neutral-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Row: Headline & Testimonial Carousel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Header */}
            <div className="lg:col-span-5 flex flex-col items-start pr-0 lg:pr-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D97746]">
                  BEYOND THE HYPE
                </span>
                <div className="w-10 h-[1px] bg-neutral-800" />
              </div>

              <h2 className="text-[36px] sm:text-[48px] font-bold tracking-tight leading-[1.08] text-white mb-4">
                Writings.<br />
                <span className="text-[#D97746]">Beyond</span> the hype.
              </h2>

              <p className="text-[15px] sm:text-[16px] leading-relaxed text-[#A1A1AA] mb-6 max-w-sm">
                A place for underrated stories and underrepresented voices.
              </p>

              <Link
                to="/discover"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#111215] text-[13px] font-semibold hover:bg-neutral-200 transition-all shadow-sm no-underline group"
              >
                <span>See real stories</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Right Testimonial Quote Cards */}
            <div className="lg:col-span-7 relative flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveTestimonialIndex((prev) =>
                    prev === 0 ? TESTIMONIALS_DATA.length - 1 : prev - 1
                  )
                }
                className="w-10 h-10 rounded-full border border-neutral-700 hover:border-white hover:bg-neutral-800 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                aria-label="Previous quote"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TESTIMONIALS_DATA.map((t, idx) => (
                  <div
                    key={t.id}
                    className="bg-[#18191C] rounded-2xl p-5 border border-neutral-800 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="text-[36px] leading-none font-serif text-[#71717A] mb-2 select-none">
                        &ldquo;
                      </div>
                      <p className="text-[13px] leading-relaxed text-[#D4D4D8] font-normal mb-4">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={t.avatar}
                          alt={t.authorName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="text-left">
                          <div className="text-[11.5px] font-semibold text-white leading-tight">
                            {t.authorName}
                          </div>
                          <div className="text-[10px] text-[#A1A1AA]">{t.authorSub}</div>
                        </div>
                      </div>
                      <Send className="w-3.5 h-3.5 text-[#D97746] rotate-12" />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveTestimonialIndex((prev) =>
                    prev === TESTIMONIALS_DATA.length - 1 ? 0 : prev + 1
                  )
                }
                className="w-10 h-10 rounded-full border border-neutral-700 hover:border-white hover:bg-neutral-800 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                aria-label="Next quote"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Bottom 3-Column Value Props Row */}
          <div className="mt-16 pt-12 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
            {/* Prop 1 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#D97746] shrink-0">
                <Feather className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white leading-tight mb-1">
                  New writers get real exposure
                </h4>
                <p className="text-[13px] text-[#A1A1AA]">
                  Quality stories over popularity
                </p>
              </div>
            </div>

            {/* Prop 2 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#D97746] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white leading-tight mb-1">
                  A community that values writing
                </h4>
                <p className="text-[13px] text-[#A1A1AA]">
                  Readers who actually stay
                </p>
              </div>
            </div>

            {/* Prop 3 */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[#D97746] shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-white leading-tight mb-1">
                  Stories worth finding
                </h4>
                <p className="text-[13px] text-[#A1A1AA]">
                  Hidden gems, not just bestsellers
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          5. STUDIO / FINAL CTA — Warm Cream Split Layout
          ========================================================================= */}
      <section id="about" className="relative w-full bg-[#FAF7F2] dark:bg-[#151619] text-[#18181B] dark:text-[#F4F4F5] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Photographic Studio Visual */}
            <div className="lg:col-span-6 relative">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border border-[#EAE5DA] dark:border-neutral-800">
                <img
                  src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85"
                  alt="Fountain pen on open journal with glasses and coffee"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Content & Feature List */}
            <div className="lg:col-span-6 flex flex-col items-start pl-0 lg:pl-6">
              
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#71717A] dark:text-[#A1A1AA]">
                  WRITE FREELY
                </span>
                <div className="w-10 h-[1px] bg-[#D4CEBF] dark:bg-neutral-700" />
              </div>

              <h2 className="text-[36px] sm:text-[46px] font-bold tracking-tight leading-[1.08] text-[#18181B] dark:text-[#F4F4F5] mb-4">
                Your story<br />
                belongs <span className="text-[#C85A32]">here.</span>
              </h2>

              <p className="text-[15px] sm:text-[16px] leading-relaxed text-[#52525B] dark:text-[#A1A1AA] mb-6 max-w-lg">
                Whether it&apos;s a short story, a poem, or a whole new world — HatchPen is your space to write, share, and grow.
              </p>

              <Link
                to={isSignedIn ? '/write' : '#'}
                onClick={(e) => {
                  if (!isSignedIn) {
                    e.preventDefault()
                    openPublicWriteModal()
                  }
                }}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-[14px] font-medium hover:opacity-90 transition-all shadow-sm group no-underline mb-10"
              >
                <span>Start writing</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Feature Checklist List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full pt-6 border-t border-[#EAE5DA] dark:border-neutral-800">
                {/* Feature 1 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] dark:bg-neutral-800 flex items-center justify-center text-[#18181B] dark:text-white shrink-0 mt-0.5">
                    <PenLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#18181B] dark:text-white leading-tight">
                      Write freely
                    </h4>
                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                      Your stories, your voice.
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] dark:bg-neutral-800 flex items-center justify-center text-[#18181B] dark:text-white shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#18181B] dark:text-white leading-tight">
                      Find your readers
                    </h4>
                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                      A community that cares.
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] dark:bg-neutral-800 flex items-center justify-center text-[#18181B] dark:text-white shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#18181B] dark:text-white leading-tight">
                      Grow together
                    </h4>
                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                      New opportunities, real support.
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F3EFE6] dark:bg-neutral-800 flex items-center justify-center text-[#18181B] dark:text-white shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#18181B] dark:text-white leading-tight">
                      A healthier space
                    </h4>
                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                      Respectful. Creative. Built for writers.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

    </div>
    </>
  )
}

/* ==========================================================================
   SIGNED-IN HOME PAGE — Editorial Reading Desk & Member Dashboard
   ========================================================================== */
function SignedInHome() {
  const { user } = useUser()
  const {
    allWorks,
    savedWorkIds,
    readingProgress,
    followedAuthorIds,
    customAvatarUrl,
    isOwnWork,
  } = useApp()
  const [activeTab, setActiveTab] = useState('for-you')

  // Identify active reading progress item
  const progressEntries = Object.entries(readingProgress).filter(([wId]) => !isOwnWork(wId))
  const latestReadEntry = progressEntries.length > 0 ? progressEntries[0] : null
  const latestReadWork = latestReadEntry
    ? allWorks.find((w) => w.id === latestReadEntry[0])
    : null
  const latestProgressData = latestReadEntry ? latestReadEntry[1] : null

  // Recommended fallback manuscript when queue is empty
  const recommendedWork = allWorks.find((w) => w.featured || w.editorPick) || allWorks[0]

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
    user?.firstName || user?.username || cachedName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Reader'

  // Time-of-day dynamic greeting
  const hour = typeof window !== 'undefined' ? new Date().getHours() : 12
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const todayDate = typeof window !== 'undefined'
    ? new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'Desk Edition'

  const dashboardTabs = [
    { id: 'for-you', label: 'For You', icon: <Sparkles className="h-3.5 w-3.5" /> },
    {
      id: 'following',
      label: `From Followed${followedWorks.length > 0 ? ` (${followedWorks.length})` : ''}`,
      icon: <Users className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
    {
      id: 'saved',
      label: `Your Library${savedWorks.length > 0 ? ` (${savedWorks.length})` : ''}`,
      icon: <Bookmark className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
    {
      id: 'trending',
      label: 'Trending',
      icon: <Flame className="h-3.5 w-3.5" />,
      activeColor: 'text-[var(--ink-primary)]',
    },
  ]

  const activeAvatar = customAvatarUrl || user?.imageUrl

  return (
    <div className="min-h-screen py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      
      {/* 1. EDITORIAL SALUTATION HEADER */}
      <section className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full border border-[var(--border-subtle)] shadow-xs overflow-hidden bg-[var(--ink-primary)] flex items-center justify-center">
              <UnisexAvatar
                src={activeAvatar}
                hasImage={user?.hasImage}
                name={displayName}
                size="lg"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-muted)]">
                <span>{todayDate}</span>
                <span>•</span>
                <span className="text-[var(--ink-primary)] font-medium">Editorial Desk</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-[var(--ink-primary)]">
                {greeting}, {displayName}.
              </h1>
              <p className="text-xs text-[var(--ink-secondary)]">
                Pick up where you left off or explore newly serialized folios.
              </p>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/write/new" className="no-underline">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<PenLine className="h-3.5 w-3.5 shrink-0" />}
              >
                + New Story
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

            <Link to="/discover" className="no-underline">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<CompassIcon className="h-3.5 w-3.5 shrink-0" />}
              >
                Catalog
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. DUAL PRIORITY GRID: CONTINUE READING SHELF & READING PULSE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Left: Active Reading Card / Next Pick (7 cols) */}
        <div className="lg:col-span-7">
          {latestReadWork && latestProgressData ? (
            <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                    Continue Reading
                  </h2>
                </div>
                <Link
                  to="/library"
                  className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
                >
                  View Queue ({progressEntries.length}) <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
                <div className="relative aspect-[16/10] sm:aspect-[3/4] w-full sm:w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  <img
                    src={latestReadWork.cover}
                    alt={latestReadWork.title}
                    className="h-full w-full object-cover transition hover:scale-105 duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex-1 space-y-2.5 min-w-0 w-full">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{latestReadWork.category}</span>
                      <span>•</span>
                      <span>{latestReadWork.genre}</span>
                      <span>•</span>
                      <span>Part {latestProgressData.chapterNumber}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] truncate mt-0.5">
                      {latestReadWork.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-muted)] truncate">
                      By {latestReadWork.author.name}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-[var(--ink-muted)]">
                      <span>Chapter Completion</span>
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
                      className="no-underline inline-block"
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
            <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                    Editor's Desk Selection
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  Start Your Queue
                </span>
              </div>

              {recommendedWork && (
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
                  <div className="relative aspect-[16/10] sm:aspect-[3/4] w-full sm:w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <img
                      src={recommendedWork.cover}
                      alt={recommendedWork.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
                      <span>{recommendedWork.category}</span>
                      <span>•</span>
                      <span>{recommendedWork.genre}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)] truncate">
                      {recommendedWork.title}
                    </h3>
                    <p className="text-xs text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                      {recommendedWork.synopsis}
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/works/$workId"
                        params={{ workId: recommendedWork.id }}
                        className="no-underline inline-block"
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<BookOpen className="h-3.5 w-3.5 shrink-0" />}
                        >
                          Begin Chapter 1
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Daily Reading Pulse & Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Daily Reading Pulse
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                Active Streak
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {progressEntries.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">In Progress</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {savedWorkIds.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">Saved</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2">
                <p className="font-mono text-base font-semibold text-[var(--ink-primary)]">
                  {followedAuthorIds.length}
                </p>
                <p className="text-[10px] uppercase font-mono text-[var(--ink-muted)]">Following</p>
              </div>
            </div>

            <MetricProgressCard
              usedPercent={savedWorkIds.length > 0 ? Math.min(100, savedWorkIds.length * 20) : 40}
              currentLabel={`${savedWorkIds.length} Manuscripts`}
              limitLabel="10 Goal"
              title="Reading Cadence"
              subtitle="Paced weekly serialization goal"
              className="w-full border-0 p-0 shadow-none bg-transparent"
            />
          </div>
        </div>

      </div>

      {/* 3. MEMBER FEED STREAMS (DiscreteTabs Navigation) */}
      <section className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-primary)]">
              Your Reading Stream
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Personalized recommendations, updates from followed authors, and saved library queue.
            </p>
          </div>

          <DiscreteTabs
            defaultTab={activeTab}
            size="sm"
            onTabChange={(tabId) => setActiveTab(tabId)}
            tabs={dashboardTabs}
          />
        </div>

        {/* Tab 1: Curated For You */}
        {activeTab === 'for-you' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {forYouWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}

        {/* Tab 2: From Followed Authors */}
        {activeTab === 'following' && (
          <div>
            {followedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {followedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-10 text-center space-y-3 bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
                <Users className="h-6 w-6 mx-auto text-[var(--ink-faint)]" />
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  No Followed Authors Yet
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Follow authors to receive notifications when they publish new serialized chapters.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-1">
                  <Button variant="outline" size="sm">
                    Discover Authors
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Library */}
        {activeTab === 'saved' && (
          <div>
            {savedWorks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {savedWorks.map((work) => (
                  <WorkCard key={work.id} work={work} layout="portrait" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] p-10 text-center space-y-3 bg-[var(--bg-surface)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
                <Bookmark className="h-6 w-6 mx-auto text-[var(--ink-faint)]" />
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Your Library is Empty
                </h3>
                <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto">
                  Bookmark stories while browsing to build your offline queue and saved folios.
                </p>
                <Link to="/discover" className="inline-block no-underline pt-1">
                  <Button variant="outline" size="sm">
                    Browse Manuscripts
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Trending */}
        {activeTab === 'trending' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trendingWorks.map((work) => (
              <WorkCard key={work.id} work={work} layout="portrait" />
            ))}
          </div>
        )}
      </section>

      {/* 4. AUTHORS IN RESIDENCE (RECOMMENDATIONS) */}
      <section className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-semibold text-[var(--ink-primary)]">
              Writers & Voices to Follow
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Acclaimed serialized novelists, essayists, and poets on Hatchpen
            </p>
          </div>
          <Link
            to="/discover"
            className="text-xs font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
          >
            All Writers <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUTHORS.slice(0, 3).map((author) => (
            <AuthorCard key={author.id} author={author} />
          ))}
        </div>
      </section>

      {/* 5. WRITER STUDIO QUICK LAUNCH */}
      <section className="rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                Writer Studio
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--ink-secondary)] leading-relaxed">
              Have a serial manuscript or story to release? Draft chapters in a clean, distraction-free environment and distribute to readers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
                + New Manuscript
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}

/* ==========================================================================
   LOGGED IN HOME SKELETON — Localized Authenticated Layout Skeleton
   ========================================================================== */
function LoggedInHomeSkeleton() {
  return (
    <div className="logged-in-home-container min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-pulse">
      {/* 1. WELCOME BANNER SKELETON */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="h-7 sm:h-9 w-64 bg-[var(--bg-subtle)] rounded-md" />
          <div className="h-3.5 w-40 bg-[var(--bg-subtle)]/70 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-[var(--bg-subtle)] rounded-md" />
      </header>

      {/* 2. READING DESK SKELETON */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row gap-3.5 lg:gap-5 items-stretch">
          <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 space-y-3 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-2.5 md:pb-0 md:pr-3.5 lg:pr-4">
            <div className="h-3 w-28 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3">
              <div className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-[var(--bg-subtle)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--bg-subtle)] rounded" />
                <div className="h-2 w-full bg-[var(--bg-subtle)] rounded" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FRESH DROPS SKELETON */}
      <section className="space-y-3 pt-1">
        <div className="h-6 w-48 bg-[var(--bg-subtle)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-[var(--bg-subtle)] rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  )
}

/* ==========================================================================
   LOGGED IN HOME PAGE — Personalized Reader Dashboard & Shelf Experience
   Layout based on live_instructions.md using design-system components and theme tokens
   ========================================================================== */
/* ==========================================================================
   LOGGED IN HOME PAGE — Personalized Reader Dashboard & Shelf Experience
   Layout based on live_instructions.md using design-system components and theme tokens
   Enhanced with Quick Book Switcher, Real Chapter Highlights, Adaptive Writer Atelier & Shelf Fallbacks
   ========================================================================== */
function LoggedInHome() {
  const searchParams = Route.useSearch()
  const forcedView = (searchParams as any)?.view
  const { user, isLoaded: isUserLoaded } = useUser()
  const {
    allWorks,
    recentWorks,
    readingProgress,
    savedWorkIds,
    toggleSaveWork,
    isWorkSaved,
    genres,
    writerWorks,
    isOwnWork,
  } = useApp()

  const [selectedHeroWorkId, setSelectedHeroWorkId] = useState<string | null>(null)
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false)
  const [recommendationSignals, setRecommendationSignals] = useState<UserRecommendationSignals | null>(null)
  const [isLoadingSignals, setIsLoadingSignals] = useState(true)
  const forYouCarouselRef = useRef<HTMLDivElement>(null)

  const scrollForYou = (direction: 'left' | 'right') => {
    if (forYouCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380
      forYouCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    let isMounted = true
    getUserRecommendationSignalsServerFn()
      .then((signals) => {
        if (isMounted) {
          setRecommendationSignals(signals)
          setIsLoadingSignals(false)
        }
      })
      .catch((err) => {
        console.warn('[ForYou] Failed to load recommendation signals:', err?.message || err)
        if (isMounted) {
          setRecommendationSignals(null)
          setIsLoadingSignals(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [user?.id])

  const mergedBookmarkedWorkIds = useMemo(() => {
    const set = new Set<string>()
    for (const id of savedWorkIds) set.add(id)
    for (const id of (recommendationSignals?.bookmarkedWorkIds || [])) set.add(id)
    return Array.from(set)
  }, [savedWorkIds, recommendationSignals?.bookmarkedWorkIds])

  const forYouRecommendations = useMemo(() => {
    if (!recommendationSignals || !user?.id) {
      return []
    }
    return calculateForYouRecommendations({
      candidateWorks: allWorks.filter((w) => !isOwnWork(w.id)),
      readingHistory: recommendationSignals?.readingHistory || [],
      userPreferences: recommendationSignals?.preferences || null,
      bookmarkedWorkIds: mergedBookmarkedWorkIds,
      currentUserId: user?.id,
      currentUserProfileId: recommendationSignals?.profileId,
    })
  }, [allWorks, recommendationSignals, mergedBookmarkedWorkIds, user?.id, isOwnWork])

  // Dedicated New Voices: original qualifying stories from writers in first 5 calendar months
  const newVoicesWorks = useMemo(() => {
    return filterAndOrderNewVoicesStories(allWorks, user?.id)
  }, [allWorks, user?.id])

  // Books currently in-progress
  const inProgressList = useMemo(() => {
    return Object.values(readingProgress)
      .map((prog) => {
        const work = allWorks.find((w) => w.id === prog.workId)
        if (!work || isOwnWork(work.id)) return null
        const currentChapter = work.chapters?.find((c) => c.id === prog.chapterId) || work.chapters?.[0]
        return { work, progress: prog, currentChapter }
      })
      .filter(Boolean) as {
        work: (typeof allWorks)[0]
        progress: (typeof readingProgress)[string]
        currentChapter: (typeof allWorks)[0]['chapters'][0] | undefined
      }
  }, [allWorks, readingProgress, isOwnWork])

  // Focal book resolution: allows dynamic switching between user's active in-progress books
  const activeEntry = useMemo(() => {
    if (selectedHeroWorkId) {
      const match = inProgressList.find((item) => item.work.id === selectedHeroWorkId)
      if (match) return match
      const fallbackWork = allWorks.find((w) => w.id === selectedHeroWorkId)
      if (fallbackWork) {
        return {
          work: fallbackWork,
          progress: readingProgress[fallbackWork.id] || { progressPercent: 0, chapterNumber: 1, chapterId: fallbackWork.chapters?.[0]?.id || 'ch-1' },
          currentChapter: fallbackWork.chapters?.[0],
        }
      }
    }
    return inProgressList[0] || null
  }, [selectedHeroWorkId, inProgressList, allWorks, readingProgress])

  const hasReadingHistory = inProgressList.length > 0
  const activeWork = activeEntry?.work || allWorks.find((w) => w.featured) || allWorks[0]
  const activeProgress = activeEntry?.progress || null
  const activeChapter = activeEntry?.currentChapter || activeWork?.chapters?.[0]
  const progressPercent = activeProgress ? activeProgress.progressPercent : 0

  // Extract authentic excerpt or teaser quote from chapter content
  const activeQuoteExcerpt = useMemo(() => {
    if (activeChapter?.content) {
      const paragraphs = activeChapter.content.split(/\r?\n\s*\r?\n/).filter(Boolean)
      const found = paragraphs.find((p) => p.length > 50 && p.length < 240)
      if (found) return found.trim()
      if (paragraphs[0]) return paragraphs[0].slice(0, 180).trim() + '...'
    }
    return activeWork?.synopsis || '“Under the condensation of the lower panes, the third specimen had finally uncoiled its rusted petals.”'
  }, [activeChapter, activeWork])

  // Saved manuscripts from shelf
  const savedWorks = useMemo(() => {
    return allWorks.filter((w) => savedWorkIds.includes(w.id))
  }, [allWorks, savedWorkIds])

  const [activeLeaderboardGenre, setActiveLeaderboardGenre] = useState<string>('all')

  // Trending & community ranked serials
  const trendingSerials = useMemo(() => {
    let list = allWorks.filter((w) => w.trending || w.featured || w.totalReads > 50000)
    if (activeLeaderboardGenre !== 'all') {
      list = list.filter((w) => w.genre?.toLowerCase().includes(activeLeaderboardGenre.toLowerCase()))
    }
    return list.slice(0, 3)
  }, [allWorks, activeLeaderboardGenre])

  // Writer atelier adaptive states
  const isAuthor = writerWorks && writerWorks.length > 0
  const activeDraft = isAuthor ? writerWorks[0] : null

  // Show localized dashboard skeleton while Clerk loads user profile
  if (!isUserLoaded && !forcedView) {
    return <LoggedInHomeSkeleton />
  }

  const activeWorkSlug = activeWork ? getWorkSlug(activeWork) : ''

  return (
    <div className="logged-in-home-container min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-12">
      {/* 5-Month In-App Opportunity Modal */}
      <NewVoicesOpportunityModal />



      {/* =========================================================================
          SECTION 2: PICK UP WHERE YOU LEFT OFF (ASYMMETRIC PRIMARY HERO CARD)
          ========================================================================= */}
      {hasReadingHistory && activeWork ? (
        <section id="active-novel" className="w-full space-y-3">
          {/* Section Header with live status */}
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--ink-primary)] animate-pulse" />
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)] tracking-tight">
                Currently Reading
              </h3>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-mono text-[var(--ink-muted)]">
              {inProgressList.length > 1 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSwitchMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-mono text-[11px] font-semibold cursor-pointer shadow-2xs transition-all"
                  >
                    <Clock className="h-3 w-3 text-[var(--ink-muted)]" />
                    <span>Switch Book ({inProgressList.length})</span>
                    <ChevronRight className={`h-2.5 w-2.5 transition-transform ${isSwitchMenuOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {isSwitchMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-xl p-1.5 z-50 space-y-1">
                      <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-muted)]">
                        Active Queue Folios
                      </div>
                      {inProgressList.map((item) => (
                        <button
                          key={item.work.id}
                          type="button"
                          onClick={() => {
                            setSelectedHeroWorkId(item.work.id)
                            setIsSwitchMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                            item.work.id === activeWork.id
                              ? 'bg-[var(--bg-subtle)] font-semibold text-[var(--ink-primary)]'
                              : 'hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)]'
                          }`}
                        >
                          <img src={item.work.cover} alt={item.work.title} className="w-7 h-9 object-cover rounded shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-serif text-xs">{item.work.title}</p>
                            <p className="font-mono text-[9.5px] text-[var(--ink-muted)]">
                              Ch. {item.currentChapter?.number || 1} • {item.progress.progressPercent}%
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className="inline-flex items-center gap-1 text-[var(--ink-primary)] font-semibold text-[11px] bg-[var(--bg-surface)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                Active Session
              </span>
            </div>
          </div>

          {/* Compact Card Layout */}
          <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
              
              {/* Thumbnail Cover */}
              <Link
                to="/read/$workId/$chapterId"
                params={{
                  workId: activeWorkSlug,
                  chapterId: activeChapter?.id || 'ch-1',
                }}
                className="relative w-20 sm:w-24 aspect-[2/3] rounded-lg overflow-hidden shadow-xs group no-underline border border-[var(--border-subtle)] bg-[var(--bg-subtle)] shrink-0"
              >
                <img
                  src={activeWork.cover}
                  alt={activeWork.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>

              {/* Middle Details & Progress */}
              <div className="flex-1 min-w-0 space-y-2 w-full">
                {/* Badges + Author row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="subtle" size="sm">
                    {activeWork.genre}
                  </Badge>
                  <span className="text-[var(--ink-muted)] font-serif text-xs">
                    by <strong className="text-[var(--ink-primary)] font-medium">{activeWork.author.name}</strong>
                  </span>
                  <span className="text-[var(--ink-faint)] hidden md:inline">•</span>
                  <span className="text-[var(--ink-muted)] font-mono text-[11px] hidden md:inline">
                    Ch. {activeChapter?.number || 1} of {activeWork.chaptersCount}
                  </span>
                </div>

                {/* Title */}
                <Link
                  to="/works/$workId"
                  params={{ workId: activeWorkSlug }}
                  className="block no-underline text-inherit group"
                >
                  <h4 className="font-serif text-lg sm:text-xl font-bold text-[var(--ink-primary)] tracking-tight truncate group-hover:underline">
                    {activeWork.title}
                  </h4>
                </Link>

                {/* Progress Bar + Stats Row */}
                <div className="space-y-1.5 max-w-lg">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
                    <span className="font-medium text-[var(--ink-primary)] truncate max-w-[200px] sm:max-w-xs">
                      {activeChapter?.title ? `Ch. ${activeChapter.number}: ${activeChapter.title}` : `Chapter ${activeChapter?.number || 1}`}
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--ink-primary)]">
                      {progressPercent}% read
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className="h-full bg-[var(--ink-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Right Column */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]">
                <Link
                  to="/read/$workId/$chapterId"
                  params={{
                    workId: activeWorkSlug,
                    chapterId: activeChapter?.id || 'ch-1',
                  }}
                  className="flex-1 sm:flex-initial no-underline w-full sm:w-auto"
                >
                  <button
                    type="button"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-semibold hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
                  >
                    <Play className="h-3 w-3 fill-current shrink-0" />
                    <span>Resume Ch. {activeChapter?.number || 1}</span>
                  </button>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to="/works/$workId"
                    params={{ workId: activeWorkSlug }}
                    className="no-underline"
                  >
                    <button
                      type="button"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] text-xs font-mono transition-colors cursor-pointer"
                    >
                      <span>Chapters</span>
                    </button>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toggleSaveWork(activeWork.id)}
                    className={`inline-flex items-center justify-center p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                      isWorkSaved(activeWork.id)
                        ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                    }`}
                    title={isWorkSaved(activeWork.id) ? 'Saved in library' : 'Save to library'}
                    aria-label="Bookmark story"
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${isWorkSaved(activeWork.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>
      ) : (
        /* Compact First-Time Reader Onboarding Banner */
        <section id="active-novel" className="w-full">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 text-[var(--ink-primary)]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-sm sm:text-base font-semibold text-[var(--ink-primary)] tracking-tight">
                      Read Your First Story
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-faint)] uppercase tracking-wider hidden sm:inline-block">
                      • Empty Shelf
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[var(--ink-secondary)]">
                    Explore original serials below. When you open any chapter, your progress and reading session will appear here.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Link
                  to="/discover"
                  className="no-underline"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Compass className="h-3.5 w-3.5 shrink-0" />}
                  >
                    Browse Stories
                  </Button>
                </Link>

                <a
                  href="#trending-serials"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] font-mono text-[11px] font-medium cursor-pointer shadow-2xs transition-colors no-underline"
                >
                  <Flame className="h-3 w-3 text-amber-500" />
                  <span>Trending ↓</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION: FOR YOU RECOMMENDATIONS (PERSONALIZED ADAPTIVE DISCOVERY)
          ========================================================================= */}
      <section id="for-you" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              Recommended For You
            </h3>
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              Personalized based on your reading sessions and literary interests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollForYou('left')}
              className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              aria-label="Previous recommendations"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollForYou('right')}
              className="w-8 h-8 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
              aria-label="Next recommendations"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              to="/discover"
              className="hidden sm:inline-flex font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline items-center gap-1 no-underline ml-2"
            >
              <span>Explore All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {isLoadingSignals ? (
          <div className="flex items-stretch gap-3 sm:gap-3.5 overflow-hidden py-1">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`foryou-skeleton-${idx}`}
                className="w-[145px] sm:w-[160px] md:w-[170px] aspect-[2/3] shrink-0 rounded-xl bg-[var(--bg-subtle)] animate-pulse border border-[var(--border-subtle)]"
              />
            ))}
          </div>
        ) : forYouRecommendations.length > 0 ? (
          <div
            ref={forYouCarouselRef}
            className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto scroll-smooth py-1 px-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {forYouRecommendations.map(({ work }) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              return (
                <div
                  key={work.id}
                  style={{ scrollSnapAlign: 'start' }}
                  className="w-[145px] sm:w-[160px] md:w-[170px] shrink-0 flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden group"
                >
                  {/* Cover with badge */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[var(--bg-subtle)]">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      className="block w-full h-full no-underline"
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={200}
                        height={300}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* Bookmark Pill Button */}
                    <button
                      type="button"
                      onClick={() => toggleSaveWork(work.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                      title={saved ? 'Remove Bookmark' : 'Save to Shelf'}
                    >
                      <Bookmark className={`h-3 w-3 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Chapter count */}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/75 text-white font-mono text-[8px] px-1.5 py-0.5 rounded backdrop-blur-2xs">
                      {work.chaptersCount} Ch
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <Link
                        to="/works/$workId"
                        params={{ workId: wSlug }}
                        className="block no-underline text-inherit group-hover:underline"
                      >
                        <h4 className="font-serif text-xs sm:text-[13px] font-bold text-[var(--ink-primary)] leading-tight line-clamp-1">
                          {work.title}
                        </h4>
                      </Link>

                      <div className="flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
                        <span className="truncate">{work.author.name}</span>
                        <span className="shrink-0 text-[9px] text-[var(--ink-faint)]">
                          {work.genre}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[9px] text-[var(--ink-faint)]">
                        {formatViewCount(work.totalReads, true)} reads
                      </span>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6 text-center space-y-2">
            <p className="font-serif text-sm text-[var(--ink-secondary)]">
              No new recommendations available at the moment. All eligible candidates have either been saved or completed.
            </p>
            <Link
              to="/discover"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline no-underline"
            >
              Browse Full Catalog →
            </Link>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION: NEW VOICES (AUTHENTICATED FIVE-MONTH DISCOVERY SHOWCASE)
          ========================================================================= */}
      <section id="new-voices" className="w-full space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              New Voices Showcase
            </h3>
            <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)]">
              Fresh original stories published by writers in their first five calendar months on Hatchpen.
            </p>
          </div>

          <Link
            to="/write"
            className="font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1 no-underline"
          >
            <span>Start Your Story</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {newVoicesWorks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {newVoicesWorks.map((work) => {
              const wSlug = getWorkSlug(work)
              const saved = isWorkSaved(work.id)
              const pubDate = work.publishedAt
              return (
                <div
                  key={work.id}
                  className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Cover with badge */}
                  <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-subtle)]">
                    <Link
                      to="/works/$workId"
                      params={{ workId: wSlug }}
                      className="block w-full h-full no-underline"
                    >
                      <OptimizedImage
                        src={work.cover}
                        alt={work.title}
                        width={260}
                        height={390}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </Link>

                    {/* Bookmark Pill Button */}
                    <button
                      type="button"
                      onClick={() => toggleSaveWork(work.id)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer z-10"
                      title={saved ? 'Remove Bookmark' : 'Save to Shelf'}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Chapter count */}
                    <div className="absolute bottom-2 left-2 bg-black/75 text-white font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-2xs">
                      {work.chaptersCount} Ch
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <Link
                        to="/works/$workId"
                        params={{ workId: wSlug }}
                        className="block no-underline text-inherit group-hover:underline"
                      >
                        <h4 className="font-serif text-sm font-bold text-[var(--ink-primary)] leading-snug line-clamp-1">
                          {work.title}
                        </h4>
                      </Link>

                      <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-muted)]">
                        <span className="truncate">{work.author.name}</span>
                        <span className="shrink-0 text-[10px] text-[var(--ink-faint)]">
                          {work.genre}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[var(--ink-faint)] truncate">
                        {pubDate ? new Date(pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Debut'}
                      </span>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read Ch 1 →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-8 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--bg-subtle)] text-black dark:text-white flex items-center justify-center">
              <Feather className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                No Debuts Currently Active
              </h4>
              <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] max-w-lg mx-auto">
                Writers in their first five calendar months on Hatchpen can publish original manuscripts to be showcased here. Ready to release your first chapter?
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/write"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-mono text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
              >
                <PenLine className="h-3.5 w-3.5" />
                <span>Draft a Story in Studio</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 3: TRENDING & COMMUNITY RANKINGS (LEADERBOARDS BENTO GRID)
          ========================================================================= */}
      <section id="trending-serials" className="w-full space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] tracking-tight">
              Trending Serials Today
            </h3>
          </div>

          {/* Genre Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none font-mono text-xs">
            {[
              { id: 'all', label: 'All Genres' },
              { id: 'romance', label: 'Romance' },
              { id: 'speculative', label: 'Speculative' },
              { id: 'historical', label: 'Historical' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveLeaderboardGenre(tab.id)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap text-xs font-mono ${
                  activeLeaderboardGenre === tab.id
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-semibold shadow-xs'
                    : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Bento Grid: 3 Rich Serials */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingSerials.map((work, idx) => {
            const wSlug = getWorkSlug(work)
            const saved = isWorkSaved(work.id)
            return (
              <div
                key={work.id}
                className="rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Visual Cover Header */}
                <div className="relative h-60 sm:h-64 overflow-hidden bg-[var(--bg-subtle)]">
                  <img
                    src={work.cover}
                    alt={work.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                  {/* Rank Pill */}
                  <div className="absolute top-3 left-3 bg-black/75 text-white backdrop-blur-md px-2.5 py-1 rounded font-mono text-[11px] uppercase tracking-wider flex items-center gap-1 border border-white/20 shadow-xs">
                    <span className="font-bold text-amber-400">#{idx + 1}</span>
                    <span>in {work.genre}</span>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={() => toggleSaveWork(work.id)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
                    title={saved ? 'Remove Bookmark' : 'Save to Library'}
                  >
                    <Bookmark className={`h-4 w-4 ${saved ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>

                  {/* Title & Season Info */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <span className="font-mono text-[10px] tracking-wider uppercase text-white/80">
                      Season 1 • {work.chaptersCount} Chapters
                    </span>
                    <h4 className="font-serif text-lg font-bold text-white leading-snug line-clamp-1 mt-0.5">
                      {work.title}
                    </h4>
                  </div>
                </div>

                {/* Card Content & Metrics */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <p className="font-serif text-xs sm:text-sm text-[var(--ink-secondary)] line-clamp-2 leading-relaxed">
                    {work.synopsis}
                  </p>

                  <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
                    {/* Metrics Bar */}
                    <div className="flex items-center justify-between text-[var(--ink-muted)] font-mono text-[11px] bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-[var(--ink-faint)]" />
                        {formatViewCount(work.totalReads, true)} Reads
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark className="h-3 w-3 text-red-500" />
                        {Math.round(work.totalReads * 0.08).toLocaleString()} Saves
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[var(--ink-primary)]">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        4.94
                      </span>
                    </div>

                    {/* Author & Action */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                          <UnisexAvatar
                            src={work.author.avatar}
                            name={work.author.name}
                            size="sm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="font-mono text-xs text-[var(--ink-primary)] font-medium">
                          {work.author.name}
                        </span>
                      </div>

                      <Link
                        to="/read/$workId/$chapterId"
                        params={{
                          workId: wSlug,
                          chapterId: work.chapters?.[0]?.id || 'ch-1',
                        }}
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase font-semibold text-[var(--ink-primary)] hover:underline no-underline"
                      >
                        Read Part 1 →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>


      <section id="saved-shelf" className="w-full space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Your Reading Shelf
            </h3>
          </div>

          <Link
            to="/library"
            className="font-mono text-xs font-semibold text-[var(--ink-primary)] hover:underline flex items-center gap-1 no-underline"
          >
            <span>Open Full Atelier Library</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Dynamic & Aesthetic Reading Shelf Grid */}
        {savedWorks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {savedWorks.map((work) => {
              const wSlug = getWorkSlug(work)
              return (
                <Link
                  key={work.id}
                  to="/works/$workId"
                  params={{ workId: wSlug }}
                  className="group block cursor-pointer no-underline text-inherit"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-xs group-hover:shadow-md transition-all duration-300 mb-2 border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                    <OptimizedImage
                      src={work.cover}
                      alt={work.title}
                      width={200}
                      height={300}
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-black/75 text-white font-mono text-[9px] px-1.5 py-0.5 rounded backdrop-blur-2xs">
                      {work.chaptersCount} Ch
                    </div>
                  </div>
                  <h5 className="font-serif text-xs sm:text-sm font-semibold text-[var(--ink-primary)] leading-snug line-clamp-1 group-hover:underline">
                    {work.title}
                  </h5>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] block mt-0.5 truncate">
                    {work.author.name}
                  </span>
                </Link>
              )
            })}

            {/* Aesthetic Empty Shelf Slots to complete exact 7 cards row */}
            {savedWorks.length < 6 &&
              Array.from({ length: Math.max(0, 6 - savedWorks.length) }).map((_, idx) => (
                <Link
                  key={`empty-slot-${idx}`}
                  to="/discover"
                  className="hidden xl:flex aspect-[2/3] rounded-xl border border-dashed border-[var(--border-subtle)]/70 bg-[var(--bg-surface)]/30 hover:bg-[var(--bg-surface)]/70 hover:border-[var(--border-subtle)] transition-all flex-col items-center justify-center text-center p-3 cursor-pointer group no-underline text-inherit"
                >
                  <div className="w-8 h-8 rounded-full border border-dashed border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] mb-1.5 transition-colors">
                    <span className="text-base font-light">+</span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--ink-faint)] group-hover:text-[var(--ink-muted)] transition-colors">
                    Add Book
                  </span>
                </Link>
              ))}

            {/* Action Card to Discover More - Positioned at right side */}
            <Link
              to="/discover"
              className="aspect-[2/3] rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-dashed border-[var(--border-strong)] flex flex-col items-center justify-center text-center p-3 transition-colors cursor-pointer group no-underline text-inherit"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--ink-primary)] mb-2 shadow-2xs group-hover:scale-110 transition-transform">
                <Search className="h-4 w-4" />
              </div>
              <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
                Browse More
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)] mt-0.5">
                Explore Catalog
              </span>
            </Link>
          </div>
        ) : (
          /* Honest, Authentic Empty State connected to Database */
          <div className="rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 p-6 sm:p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-black dark:text-white">
              <Bookmark className="h-4 w-4" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="font-serif text-base sm:text-lg font-semibold text-[var(--ink-primary)]">
                No stories saved to your shelf yet
              </h4>
              <p className="font-serif text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                Bookmark any story while browsing or reading. Your saved stories are stored directly in your account database and will appear right here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/discover"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-mono text-xs font-semibold hover:opacity-90 transition-opacity no-underline shadow-xs"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Explore Stories to Save</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 5: WRITER'S ATELIER / PUBLISH YOUR NOVEL SPOTLIGHT (ADAPTIVE BANNER)
          ========================================================================= */}
      <section id="author-atelier" className="w-full pb-8">
        <div className="bg-[var(--ink-primary)] text-[var(--bg-canvas)] rounded-2xl p-6 sm:p-8 lg:p-10 shadow-lg relative overflow-hidden">
          {/* Ambient Decorative Watermark */}
          <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none transform translate-x-10 translate-y-10">
            <Feather className="w-96 h-96 text-current" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full font-mono text-[10px] uppercase tracking-wider text-amber-200">
                <PenLine className="h-3 w-3" />
                <span>
                  {isAuthor ? "Author Atelier • Your Writing Desk" : "Writer's Atelier • Serial Publishing Studio"}
                </span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                {isAuthor && activeDraft
                  ? `Ready to continue writing “${activeDraft.title}”?`
                  : 'Have a world to craft? Over 3.2M readers are looking for fresh chapters.'}
              </h3>

              <p className="font-serif text-xs sm:text-sm text-white/80 max-w-2xl leading-relaxed">
                {isAuthor
                  ? 'Access your serial editor, publish scheduled drops, review comments, and analyze reader retention metrics.'
                  : 'Publish serialized chapters on your schedule, build loyal subscriber circles, and access granular reader retention graphs chapter by chapter.'}
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 font-mono text-xs text-white/90">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-300" />
                  <span>
                    {isAuthor && activeDraft ? (
                      <>Active Manuscript: <strong className="text-white font-semibold">{activeDraft.title}</strong> ({activeDraft.chaptersCount} Ch.)</>
                    ) : (
                      <>Draft in Progress: <strong className="text-white font-semibold">“The Pale Cartography”</strong></>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-300" />
                  <span>
                    {isAuthor ? (
                      <>Active Readers: <strong className="text-white font-semibold">{formatViewCount(activeDraft?.totalReads || 0, true)} Reads</strong></>
                    ) : (
                      <>Active Atelier Audience: <strong className="text-white font-semibold">14,240 Followers</strong></>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-3">
              <Link to={isAuthor && activeDraft ? `/write/manage/${activeDraft.id}` : "/write/new"} className="no-underline">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto bg-white text-black hover:bg-neutral-200 border-white font-mono text-xs font-semibold"
                  leftIcon={<PenLine className="h-4 w-4 shrink-0" />}
                >
                  {isAuthor ? 'Open Studio Workspace' : 'Open Writing Studio'}
                </Button>
              </Link>

              <Link
                to="/write"
                className="inline-flex items-center justify-center gap-1.5 text-white/80 hover:text-white font-mono text-xs py-1 transition-colors no-underline text-center"
              >
                <span>View Author Studio &amp; Analytics</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

