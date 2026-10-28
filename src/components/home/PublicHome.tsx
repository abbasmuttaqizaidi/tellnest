import { Link } from '@tanstack/react-router'
import { useState, useMemo, useRef, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { useUser } from '@clerk/react'
import {
  ArrowRight,
  Send,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Sprout,
  Users,
} from 'lucide-react'
import { PublicMobileStories } from '../PublicMobileStories'
import { TopShelfSection } from './TopShelfSection'
import type { HomeLoaderData } from './LoggedInHome'
import {
  getHeroImageSources,
} from '../../config/hero'

import principle1Img from '../../assets/principles/card1_photo.png'
import principle2Img from '../../assets/principles/card2_photo.png'
import principle3Img from '../../assets/principles/card3_photo.png'

import calmMoodImg from '../../assets/moods/Calm.webp'
import thoughtfulMoodImg from '../../assets/moods/thoughtful.webp'
import intenseMoodImg from '../../assets/moods/intense.webp'
import romanticMoodImg from '../../assets/moods/romantic.webp'
import adventurousMoodImg from '../../assets/moods/adventurous.webp'
import mysteriousMoodImg from '../../assets/moods/Mysterious.webp'
import melancholicMoodImg from '../../assets/moods/melancholic.webp'
import upliftingMoodImg from '../../assets/moods/Uplifting.webp'
import whimsicalMoodImg from '../../assets/moods/whimsical.webp'
import eerieMoodImg from '../../assets/moods/Eerie.webp'
import wittyMoodImg from '../../assets/moods/witty.webp'

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

import { PublicHomeSkeleton } from './HomeSkeletons'
export { PublicHomeSkeleton }

interface PublicHomeProps {
  loaderData?: HomeLoaderData
}

export default function PublicHome({ loaderData }: PublicHomeProps = {}) {
  const { openAuthModal, openPublicWriteModal, allWorks } = useApp()
  const { isSignedIn } = useUser()

  // Merge initialWorks from loaderData if available to ensure instant DB stories hydration
  const works = useMemo(() => {
    if (loaderData?.initialWorks && Array.isArray(loaderData.initialWorks) && loaderData.initialWorks.length > 0) {
      const mergedMap = new Map<string, any>()
      for (const w of loaderData.initialWorks) mergedMap.set(w.id, w)
      for (const w of allWorks) {
        if (!mergedMap.has(w.id)) mergedMap.set(w.id, w)
      }
      return Array.from(mergedMap.values())
    }
    return allWorks
  }, [allWorks, loaderData?.initialWorks])

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

  // Testimonials tab state
  const [activeTestimonialTab, setActiveTestimonialTab] = useState<'writer' | 'reader'>('writer')
  const currentTestimonial = TESTIMONIALS_DATA.find((t) => t.id === activeTestimonialTab) || TESTIMONIALS_DATA[0]

  return (
    <>
      {/* Mobile-First Dedicated Public Experience (Hero slide, mood explorer, surprise book, top shelf) */}
      <PublicMobileStories
        onOpenAuth={openAuthModal}
        onOpenWriteModal={openPublicWriteModal}
        works={works}
      />

      {/* Desktop Editorial Homepage (md and above) */}
      <div className="hidden md:block min-h-screen bg-[#FDFBF7] dark:bg-[#121316] text-[#201F1D] dark:text-[#F4F4F5] selection:bg-[#B94F37] selection:text-white transition-colors duration-200">
      
      {/* =========================================================================
          1. HERO REGION — The HatchPen Editorial Manifest
          ========================================================================= */}
      <section className="relative w-full pt-10 sm:pt-14 lg:pt-20 pb-16 lg:pb-24 overflow-hidden">
        
        {/* Atmosphere background photograph with ultra-soft editorial veil (Desktop) */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none select-none z-0">
          <div className="absolute right-0 top-0 w-[58%] h-full overflow-hidden opacity-90">
            <img
              src={heroImageFailed ? heroFallback : heroSrc}
              srcSet={heroImageFailed ? undefined : heroSrcSet}
              sizes="(min-width: 1024px) 58vw, 100vw"
              alt="Atmospheric literary writing desk with notebook, brass lamp and warm afternoon sunlight"
              width={1672}
              height={941}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={() => {
                if (!heroImageFailed) setHeroImageFailed(true)
              }}
              className="w-full h-full object-cover object-center filter saturate-[0.88] contrast-[1.03]"
            />
            {/* Smooth gradient masks creating an invisible transition into the paper background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FDFBF7] via-[#FDFBF7]/40 to-transparent dark:from-[#121316] dark:via-[#121316]/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FDFBF7] via-transparent to-transparent dark:from-[#121316]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FDFBF7]/40 via-transparent to-[#FDFBF7] dark:from-[#121316]/40 dark:to-[#121316]" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Region (38-42% desktop width) */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              
              {/* Category / Mission Eyebrow Tag */}
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-[#EAE4D8]/80 dark:bg-neutral-800 text-[#5A544C] dark:text-[#D4D4D8] text-[11px] font-semibold tracking-wider uppercase">
                  HatchPen — A Serialized Fiction Retreat
                </span>
              </div>

              {/* Signature Headline */}
              <h1 className="text-[44px] sm:text-[56px] lg:text-[58px] xl:text-[64px] font-black tracking-[-0.035em] leading-[0.96] text-[#201F1D] dark:text-[#F4F4F5] uppercase mb-5">
                A QUIETER<br />
                PLACE FOR<br />
                <span className="text-[#B94F37]">BOLDER</span><br />
                STORIES.
              </h1>

              {/* Supporting Copy */}
              <p className="text-[16px] sm:text-[17.5px] leading-[1.58] text-[#5A544C] dark:text-[#A1A1AA] max-w-[350px] mb-8 font-normal">
                Discover fresh voices, unexpected worlds, and original stories that stay with you on HatchPen.
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

              {/* Community Metrics */}
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

            {/* Right Visual & Testimonial Cards Region */}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* TWO OVERLAPPING TESTIMONIAL CARDS */}
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
          2. MOOD DISCOVERY CAROUSEL
          ========================================================================= */}
      <section className="relative w-full bg-[#0B0C0E] text-white py-10 sm:py-12 lg:py-14 overflow-hidden border-t border-neutral-900 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(200,90,50,0.06),rgba(0,0,0,0))] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(200,90,50,0.08),rgba(0,0,0,0))] pointer-events-none" />

        <div className="w-full pl-5 sm:pl-8 lg:pl-10 xl:pl-14 pr-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-6 xl:gap-8">
            
            {/* Left Editorial Text Column */}
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

            {/* Right Horizontal Card Carousel */}
            <div className="w-full flex-1 min-w-0 relative">
              <div
                ref={moodScrollRef}
                className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-2 pr-6 scrollbar-none snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {MOOD_DATA.map((mood, index) => {
                  const isActive = index === activeMoodIndex
                  return (
                    <Link
                      key={mood.id}
                      to={mood.link}
                      onClick={() => setActiveMoodIndex(index)}
                      className="group block relative shrink-0 w-[240px] sm:w-[260px] h-[340px] sm:h-[370px] rounded-2xl overflow-hidden snap-start no-underline border border-white/10 hover:border-white/25 transition-all duration-300"
                    >
                      <img
                        src={mood.image}
                        alt={mood.title}
                        width={260}
                        height={370}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      
                      <div className="absolute inset-0 p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono uppercase tracking-wider text-white/70">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-[#C85A32]' : 'bg-white/20'}`} />
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-white mb-1.5 group-hover:text-[#F5F2EB] transition-colors">
                            {mood.title}
                          </h3>
                          <p className="text-xs text-neutral-300 leading-relaxed mb-3">
                            {mood.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {mood.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/90 backdrop-blur-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center gap-2 mt-3 pl-1">
                <button
                  type="button"
                  onClick={() => handleMoodStep(-1)}
                  className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  aria-label="Previous mood"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoodStep(1)}
                  className="p-2 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  aria-label="Next mood"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          3. TOP SHELF (COMMUNITY'S TOP 10 MOST-SAVED MASTERPIECES)
          ========================================================================= */}
      <div className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-[#D7CFC3]/50 dark:border-neutral-800">
        <TopShelfSection works={works} id="top-shelf" />
      </div>

      {/* =========================================================================
          4. THREE PRINCIPLES SECTION
          ========================================================================= */}
      <section className="py-16 sm:py-20 lg:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.2em] uppercase text-[#B94F37] mb-3 block">
            HOW WE DO THINGS DIFFERENTLY
          </span>
          <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight text-[#201F1D] dark:text-[#F4F4F5]">
            Built for writers. Crafted for readers.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1 */}
          <div className="rounded-2xl border border-[#D7CFC3] dark:border-neutral-800 bg-[#FAF7F0] dark:bg-[#18191C] p-6 flex flex-col justify-between">
            <div>
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-[#EAE3D6] dark:bg-neutral-800">
                <img
                  src={principle1Img}
                  alt="Quiet focus"
                  width={400}
                  height={300}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#B94F37]" />
                <h3 className="text-lg font-bold text-[#201F1D] dark:text-[#F4F4F5]">A Quieter Feed</h3>
              </div>
              <p className="text-sm text-[#5A544C] dark:text-[#A1A1AA] leading-relaxed">
                No algorithmic outrage or doomscrolling. Just chapter-by-chapter serials with space to breathe.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-[#D7CFC3] dark:border-neutral-800 bg-[#FAF7F0] dark:bg-[#18191C] p-6 flex flex-col justify-between">
            <div>
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-[#EAE3D6] dark:bg-neutral-800">
                <img
                  src={principle2Img}
                  alt="Audience discovery"
                  width={400}
                  height={300}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#B94F37]" />
                <h3 className="text-lg font-bold text-[#201F1D] dark:text-[#F4F4F5]">New Voices First</h3>
              </div>
              <p className="text-sm text-[#5A544C] dark:text-[#A1A1AA] leading-relaxed">
                Every new writer gets dedicated reach in their first 5 months. No pay-to-play discovery.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-[#D7CFC3] dark:border-neutral-800 bg-[#FAF7F0] dark:bg-[#18191C] p-6 flex flex-col justify-between">
            <div>
              <div className="aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-[#EAE3D6] dark:bg-neutral-800">
                <img
                  src={principle3Img}
                  alt="Sustainable craft"
                  width={400}
                  height={300}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Sprout className="w-4 h-4 text-[#B94F37]" />
                <h3 className="text-lg font-bold text-[#201F1D] dark:text-[#F4F4F5]">Respect for the Craft</h3>
              </div>
              <p className="text-sm text-[#5A544C] dark:text-[#A1A1AA] leading-relaxed">
                Clean typographic reader with marginalia notes, zero ads, and full writer ownership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. COMMUNITY VOICE & FINAL CTA
          ========================================================================= */}
      <section className="py-16 sm:py-24 border-t border-[#D7CFC3]/50 dark:border-neutral-800" style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8ECE8] text-[#B94F37] text-xs font-bold uppercase tracking-wider mb-6">
            <Shield className="w-3.5 h-3.5" />
            <span>Join the Community</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#201F1D] dark:text-[#F4F4F5] mb-5">
            Ready to find your next obsession?
          </h2>

          <p className="text-base sm:text-lg text-[#5A544C] dark:text-[#A1A1AA] max-w-xl mx-auto mb-8 font-normal">
            Whether reading in quiet coffee breaks or serializing your debut novel, HatchPen is your literary home. Read in any browser across desktop, tablet, and mobile.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#201F1D] text-[#F2EDE3] text-sm font-semibold hover:bg-black transition-colors shadow-sm no-underline"
            >
              <span>Start reading now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={openAuthModal}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full border border-[#201F1D]/30 hover:border-[#201F1D] text-[#201F1D] dark:text-[#F4F4F5] text-sm font-semibold transition-colors cursor-pointer"
            >
              Create free account
            </button>
          </div>
        </div>
      </section>

    </div>
    </>
  )
}
