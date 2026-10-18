import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Compass, PenLine, ChevronRight, ArrowLeft, ArrowRight, Dices, Sparkles, BookOpen, Bookmark } from 'lucide-react'
import { HatchpenLogo } from './HatchpenLogo'

// Hero Section Image
import screen01WomanImg from '../assets/home-screen/screen01-woman.webp'

// 12 Curated Mood Artworks
import adventurousMoodImg from '../assets/moods/adventurous.webp'
import melancholicMoodImg from '../assets/moods/melancholic.webp'
import mysteriousMoodImg from '../assets/moods/Mysterious.webp'
import intenseMoodImg from '../assets/moods/intense.webp'
import romanticMoodImg from '../assets/moods/romantic.webp'
import whimsicalMoodImg from '../assets/moods/whimsical.webp'
import eerieMoodImg from '../assets/moods/Eerie.webp'
import thoughtfulMoodImg from '../assets/moods/thoughtful.webp'
import calmMoodImg from '../assets/moods/Calm.webp'
import upliftingMoodImg from '../assets/moods/Uplifting.webp'
import wittyMoodImg from '../assets/moods/witty.webp'
import nostalgicMoodImg from '../assets/moods/Nostalgiac_or_Meloncholic.webp'
import surpriseRandomBookImg from '../assets/surprise-with-a-random-book/surprise-with-a-random-book.webp'
import bookIdleImg from '../assets/surprise-with-a-random-book/book-idle-9x16.png'
import bookIdleWebp from '../assets/surprise-with-a-random-book/book-idle-9x16.webp'
import animatedBookVideoOptimized from '../assets/surprise-with-a-random-book/animated-book-video-optimized.mp4'

interface PublicMobileStoriesProps {
  onOpenAuth: () => void
  onOpenWriteModal: () => void
}

export interface CuratedStoryItem {
  id: string
  title: string
  category: string
  readTime: string
}

interface MoodItem {
  name: string
  count: string
  genreSlug: string
  img: string
  hook: string
  glow: string
  icon: string
  story: {
    title: string
    author: string
    chapters: string
    category: string
    synopsis: string
  }
  curatedStories: CuratedStoryItem[]
}

const MOODS: MoodItem[] = [
  {
    name: 'Adventurous',
    count: '2,480+ Serials',
    genreSlug: 'fantasy',
    img: adventurousMoodImg,
    hook: '“The map ended where the fog began, which was exactly where they aimed.”',
    glow: 'rgba(34, 197, 94, 0.22)',
    icon: '🏔️',
    story: {
      title: 'The Cartographer of Lost Ships',
      author: 'Julian Montgomery',
      chapters: '10 Chapters • Complete',
      category: 'Nautical Myth & Adventure',
      synopsis: 'A surveyor charts phantom reefs in the Outer Hebrides to safeguard sacred sanctuaries from whaling fleets.',
    },
    curatedStories: [
      { id: 'adv-1', title: 'The Cartographer of Lost Ships', category: 'Nautical Myth', readTime: '12 min' },
      { id: 'adv-2', title: 'Beyond the Silver Trees', category: 'Alpine Fantasy', readTime: '14 min' },
      { id: 'adv-3', title: 'The North Watch', category: 'Polar Adventure', readTime: '10 min' },
      { id: 'adv-4', title: 'Isle of Whispering Pines', category: 'Lost Frontiers', readTime: '15 min' },
      { id: 'adv-5', title: 'The Sunken Citadel', category: 'Ocean Expedition', readTime: '11 min' },
    ],
  },
  {
    name: 'Melancholic',
    count: '1,210+ Serials',
    genreSlug: 'literary-fiction',
    img: melancholicMoodImg,
    hook: '“The rain had a habit of arriving only after everyone had already left.”',
    glow: 'rgba(217, 119, 6, 0.22)',
    icon: '🌧️',
    story: {
      title: 'Letters from the Rainmaker',
      author: 'Kenji Takahashi',
      chapters: '8 Chapters • Ongoing',
      category: 'Literary & Solitary',
      synopsis: 'A translator in Kyoto chronicles storms that only arrive after the ancient city has already surrendered its secrets.',
    },
    curatedStories: [
      { id: 'mel-1', title: 'Letters from the Rainmaker', category: 'Kyoto Solitary', readTime: '11 min' },
      { id: 'mel-2', title: 'The Last Letter', category: 'Epistolary Drama', readTime: '12 min' },
      { id: 'mel-3', title: 'An Autumn in Vienna', category: 'Classical Solitude', readTime: '9 min' },
      { id: 'mel-4', title: 'House of Quiet Clocks', category: 'Literary Drama', readTime: '14 min' },
      { id: 'mel-5', title: 'Before the Snow Falls', category: 'Memoir & Loss', readTime: '10 min' },
    ],
  },
  {
    name: 'Mysterious',
    count: '1,940+ Serials',
    genreSlug: 'mystery',
    img: mysteriousMoodImg,
    hook: '“Three people knew where the key lay. None survived until dawn.”',
    glow: 'rgba(147, 51, 234, 0.22)',
    icon: '🕯️',
    story: {
      title: 'Sub-Ministry of Impossible Affairs',
      author: 'Soren Vance',
      chapters: '9 Chapters • Complete',
      category: 'Bureaucratic Noir & Mystery',
      synopsis: 'Civil servants in Section 18-C audit events violating Newtonian physics, ensuring miracles pay proper municipal tax.',
    },
    curatedStories: [
      { id: 'mys-1', title: 'Sub-Ministry of Impossible Affairs', category: 'Bureaucratic Noir', readTime: '13 min' },
      { id: 'mys-2', title: 'The Keyhole Society', category: 'Secret Archives', readTime: '15 min' },
      { id: 'mys-3', title: 'The Shadow at Table 4', category: 'London Mystery', readTime: '10 min' },
      { id: 'mys-4', title: 'Curator of Forgotten Sins', category: 'Gothic Noir', readTime: '14 min' },
      { id: 'mys-5', title: 'Cipher of the Red Abbey', category: 'Ancient Enigma', readTime: '12 min' },
    ],
  },
  {
    name: 'Intense',
    count: '1,530+ Serials',
    genreSlug: 'thriller',
    img: intenseMoodImg,
    hook: '“Every breath felt borrowed, and time was running out of mercy.”',
    glow: 'rgba(239, 68, 68, 0.22)',
    icon: '⚡',
    story: {
      title: 'The Last Signal from Station 9',
      author: 'Elena Rostova',
      chapters: '12 Chapters • Ongoing',
      category: 'Cold War Thriller',
      synopsis: 'An isolated operator in the Arctic Circle catches radio transmissions from a submarine declared lost 40 years ago.',
    },
    curatedStories: [
      { id: 'int-1', title: 'The Last Signal from Station 9', category: 'Cold War Thriller', readTime: '12 min' },
      { id: 'int-2', title: 'Terminal Altitude', category: 'Aviation Suspense', readTime: '10 min' },
      { id: 'int-3', title: 'Redacted Flight 404', category: 'Political Noir', readTime: '14 min' },
      { id: 'int-4', title: 'Zero Hour at Verkhoyansk', category: 'Arctic Espionage', readTime: '11 min' },
      { id: 'int-5', title: 'The Diver’s Dilemma', category: 'Deep Sea Pressure', readTime: '13 min' },
    ],
  },
  {
    name: 'Romantic',
    count: '2,030+ Serials',
    genreSlug: 'romance',
    img: romanticMoodImg,
    hook: '“They said nothing, but in the silence between them, everything shifted.”',
    glow: 'rgba(244, 63, 94, 0.22)',
    icon: '🌹',
    story: {
      title: 'Autumn at Lake Como',
      author: 'Julian Montgomery',
      chapters: '7 Chapters • Complete',
      category: 'Slow-Burn Romance',
      synopsis: 'Two estranged art restorers reunite on a secluded lakeside villa terrace to preserve a forgotten 18th-century fresco.',
    },
    curatedStories: [
      { id: 'rom-1', title: 'Autumn at Lake Como', category: 'Slow-Burn Romance', readTime: '12 min' },
      { id: 'rom-2', title: 'Letters to a Stranger', category: 'Epistolary Romance', readTime: '11 min' },
      { id: 'rom-3', title: 'The Botanist’s Vow', category: 'Historical Romance', readTime: '15 min' },
      { id: 'rom-4', title: 'Coffee at Saint-Germain', category: 'Parisian Romance', readTime: '9 min' },
      { id: 'rom-5', title: 'Midnight at the Alhambra', category: 'Mediterranean Drama', readTime: '13 min' },
    ],
  },
  {
    name: 'Enchanting',
    count: '3,120+ Serials',
    genreSlug: 'magical-realism',
    img: whimsicalMoodImg,
    hook: '“Doors appeared only for those who had stopped looking for answers.”',
    glow: 'rgba(168, 85, 247, 0.22)',
    icon: '✨',
    story: {
      title: 'The Clockwork Forest',
      author: 'Mara Lindqvist',
      chapters: '14 Chapters • Ongoing',
      category: 'Magical Realism',
      synopsis: 'In an ancient pine valley where time behaves like water, brass foliage and clockwork moss whisper forgotten destinies.',
    },
    curatedStories: [
      { id: 'enc-1', title: 'The Clockwork Forest', category: 'Magical Realism', readTime: '14 min' },
      { id: 'enc-2', title: 'The Lantern Weaver', category: 'Folklore Fantasy', readTime: '11 min' },
      { id: 'enc-3', title: 'Spirits of the Tea House', category: 'Eastern Myth', readTime: '13 min' },
      { id: 'enc-4', title: 'The Mapmaker’s Garden', category: 'Enchanted Flora', readTime: '12 min' },
      { id: 'enc-5', title: 'A Parlour of Whispers', category: 'Parisian Sorcery', readTime: '10 min' },
    ],
  },
  {
    name: 'Eerie',
    count: '1,060+ Serials',
    genreSlug: 'horror',
    img: eerieMoodImg,
    hook: '“Something was breathing in rhythm with the house, and it wasn’t him.”',
    glow: 'rgba(75, 85, 99, 0.25)',
    icon: '🌘',
    story: {
      title: 'The House That Kept Time',
      author: 'Soren Vance',
      chapters: '6 Chapters • Complete',
      category: 'Psychological Horror',
      synopsis: 'Every grandfather clock in the manor strikes thirteen at midnight. On the third night, the thirteenth hour refuses to end.',
    },
    curatedStories: [
      { id: 'eer-1', title: 'The House That Kept Time', category: 'Psychological Horror', readTime: '11 min' },
      { id: 'eer-2', title: 'The Thirteenth Bell', category: 'Gothic Dread', readTime: '9 min' },
      { id: 'eer-3', title: 'Footsteps in the Conservatory', category: 'Manor Haunting', readTime: '12 min' },
      { id: 'eer-4', title: 'The Black Lighthouse', category: 'Coastal Macabre', readTime: '14 min' },
      { id: 'eer-5', title: 'The Pale Marionette', category: 'Victorian Terror', readTime: '10 min' },
    ],
  },
  {
    name: 'Thoughtful',
    count: '1,780+ Serials',
    genreSlug: 'philosophical-fiction',
    img: thoughtfulMoodImg,
    hook: '“We are all just stories waiting for someone patient enough to read us.”',
    glow: 'rgba(59, 130, 246, 0.22)',
    icon: '📖',
    story: {
      title: 'The Architecture of Forgetting',
      author: 'Elena Rostova',
      chapters: '11 Chapters • Ongoing',
      category: 'Philosophical Fiction',
      synopsis: 'An archivist constructs memory blueprints for clients desperate to cleanly erase a single grief from their past.',
    },
    curatedStories: [
      { id: 'tho-1', title: 'Philosophy of the Second Cup', category: 'Philosophical Fiction', readTime: '10 min' },
      { id: 'tho-2', title: 'The Bookseller of Tangier', category: 'Solitary Drama', readTime: '13 min' },
      { id: 'tho-3', title: 'Conversations with Solitude', category: 'Meditative Essays', readTime: '12 min' },
      { id: 'tho-4', title: 'The Memory Cartographer', category: 'Speculative Fiction', readTime: '15 min' },
      { id: 'tho-5', title: 'Echoes in Empty Theatres', category: 'Artistic Reflection', readTime: '11 min' },
    ],
  },
  {
    name: 'Calm',
    count: '1,420+ Serials',
    genreSlug: 'slice-of-life',
    img: calmMoodImg,
    hook: '“The afternoon kettle whistled softly, forgiving everything that came before.”',
    glow: 'rgba(20, 184, 166, 0.22)',
    icon: '☕',
    story: {
      title: 'Tea at the End of the World',
      author: 'Kenji Takahashi',
      chapters: '5 Chapters • Complete',
      category: 'Slice-of-Life & Serenity',
      synopsis: 'A tranquil seaside teahouse serves warm jasmine infusions while the rushing world outside softly quiets down.',
    },
    curatedStories: [
      { id: 'cal-1', title: 'Tea House on the Bamboo Ridge', category: 'Zen Fiction', readTime: '9 min' },
      { id: 'cal-2', title: 'Morning Mist in Kyoto', category: 'Quiet Realism', readTime: '10 min' },
      { id: 'cal-3', title: 'The Lavender Distiller', category: 'Pastoral Life', readTime: '12 min' },
      { id: 'cal-4', title: 'Still Waters of Como', category: 'Meditative Fiction', readTime: '11 min' },
      { id: 'cal-5', title: 'The Carpenter’s Solace', category: 'Contemplation', readTime: '8 min' },
    ],
  },
  {
    name: 'Uplifting',
    count: '1,650+ Serials',
    genreSlug: 'contemporary-fiction',
    img: upliftingMoodImg,
    hook: '“Even the narrowest alleyways eventually opened up to the morning sky.”',
    glow: 'rgba(234, 179, 8, 0.22)',
    icon: '☀️',
    story: {
      title: 'Where the Streetlamps Lead',
      author: 'Julian Montgomery',
      chapters: '9 Chapters • Ongoing',
      category: 'Contemporary Hope',
      synopsis: 'A night-shift baker discovers secret handwritten notes tucked inside glass bottles left on doorsteps at dawn.',
    },
    curatedStories: [
      { id: 'upl-1', title: 'A Bakery at the Edge of Dawn', category: 'Heartwarming Drama', readTime: '11 min' },
      { id: 'upl-2', title: 'The Choir of Bell Street', category: 'Community Fiction', readTime: '12 min' },
      { id: 'upl-3', title: 'A Second Spring in Seville', category: 'Second Chances', readTime: '14 min' },
      { id: 'upl-4', title: 'The Gardener Who Painted Stars', category: 'Whimsical Life', readTime: '10 min' },
      { id: 'upl-5', title: 'Letters to Tomorrow', category: 'Hopeful Fiction', readTime: '9 min' },
    ],
  },
  {
    name: 'Witty',
    count: '1,120+ Serials',
    genreSlug: 'general-fiction',
    img: wittyMoodImg,
    hook: '“He had a talent for arriving late with precisely the wrong apology.”',
    glow: 'rgba(249, 115, 22, 0.22)',
    icon: '🍸',
    story: {
      title: 'A Gentleman’s Guide to Ruin',
      author: 'Arthur Klein',
      chapters: '8 Chapters • Complete',
      category: 'Satirical Fiction',
      synopsis: 'A bankrupt aristocrat with impeccably tailored suits schemes to repay his creditors by inventing a brilliant society scandal.',
    },
    curatedStories: [
      { id: 'wit-1', title: 'A Gentleman’s Guide to Ruin', category: 'Satirical Fiction', readTime: '11 min' },
      { id: 'wit-2', title: 'The Polite Extortionist', category: 'High-Society Comedy', readTime: '10 min' },
      { id: 'wit-3', title: 'Rules for Crashing an Embassy', category: 'Farce & Manners', readTime: '13 min' },
      { id: 'wit-4', title: 'The Aristocrat Who Refused to Pay', category: 'Witty Romance', readTime: '12 min' },
      { id: 'wit-5', title: 'Scandal at the Lawn Club', category: 'British Comedy', readTime: '9 min' },
    ],
  },
  {
    name: 'Nostalgic',
    count: '1,290+ Serials',
    genreSlug: 'historical-fiction',
    img: nostalgicMoodImg,
    hook: '“The smell of old paper and summer dusk brought that distant year back.”',
    glow: 'rgba(180, 83, 9, 0.22)',
    icon: '📻',
    story: {
      title: 'Summer of the Old Radios',
      author: 'Mara Lindqvist',
      chapters: '10 Chapters • Complete',
      category: 'Historical Memory',
      synopsis: 'Two teenagers repair vacuum-tube transmitters in an attic, inadvertently catching music broadcasts from thirty years prior.',
    },
    curatedStories: [
      { id: 'nos-1', title: 'Radio Transmissions from 1974', category: 'Retrospective Drama', readTime: '13 min' },
      { id: 'nos-2', title: 'The Vinyl Shop on 4th Street', category: 'Vintage Coming-of-Age', readTime: '11 min' },
      { id: 'nos-3', title: 'Gramophone in the Attic', category: 'Family Sagas', readTime: '14 min' },
      { id: 'nos-4', title: 'The Summer of Analog Cameras', category: 'Kodak Memories', readTime: '12 min' },
      { id: 'nos-5', title: 'Postcards from a Forgotten Pier', category: 'Coastal Nostalgia', readTime: '10 min' },
    ],
  },
]

export function PublicMobileStories({ onOpenAuth, onOpenWriteModal }: PublicMobileStoriesProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const [slideDirection, setSlideDirection] = useState<number>(1)
  const [selectedMoodForStories, setSelectedMoodForStories] = useState<MoodItem | null>(null)
  const [extraStoriesCount, setExtraStoriesCount] = useState<number>(0)
  const [activeStoryIdx, setActiveStoryIdx] = useState<number>(0)

  // Ensure page always starts at top (Slide 01) on reload or initial visit
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual'
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [])

  // Prevent background scroll and support Escape key when 80% curated sheet is open
  useEffect(() => {
    if (selectedMoodForStories) {
      const origOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedMoodForStories(null)
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = origOverflow
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [selectedMoodForStories])

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)

  const prevIndex = (currentIndex - 1 + MOODS.length) % MOODS.length
  const nextIndex = (currentIndex + 1) % MOODS.length

  const currentMood = MOODS[currentIndex]
  const prevMood = MOODS[prevIndex]
  const nextMood = MOODS[nextIndex]

  const triggerHaptic = useCallback((duration = 10) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration)
      } catch {
        // Safe fallback
      }
    }
  }, [])

  const updateMood = useCallback((direction: 'next' | 'prev') => {
    triggerHaptic(10)
    setSlideDirection(direction === 'next' ? 1 : -1)
    setCurrentIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % MOODS.length
      }
      return (prev - 1 + MOODS.length) % MOODS.length
    })
  }, [triggerHaptic])

  const goToMood = useCallback((targetIndex: number) => {
    if (targetIndex === currentIndex) return
    triggerHaptic(12)
    setSlideDirection(targetIndex > currentIndex ? 1 : -1)
    setCurrentIndex(targetIndex)
  }, [currentIndex, triggerHaptic])

  // Section 2: Serendipity / Surprise Me States
  const [surpriseState, setSurpriseState] = useState<'idle' | 'flipping' | 'revealed'>('idle')
  const [surpriseIndex, setSurpriseIndex] = useState<number>(() => Math.floor(Math.random() * MOODS.length))
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const surprisedMood = MOODS[surpriseIndex] || MOODS[0]

  // Clean up video decoder on component unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
  }, [])

  // Prevent background scrolling completely on all mobile & desktop browsers
  useEffect(() => {
    if (surpriseState === 'revealed') {
      const scrollY = window.scrollY
      const origBodyPosition = document.body.style.position
      const origBodyTop = document.body.style.top
      const origBodyWidth = document.body.style.width
      const origBodyOverflow = document.body.style.overflow
      const origBodyTouchAction = document.body.style.touchAction
      const origHtmlOverflow = document.documentElement.style.overflow

      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.documentElement.style.overflow = 'hidden'

      const preventScroll = (e: Event) => {
        e.preventDefault()
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (videoRef.current) {
            videoRef.current.pause()
            videoRef.current.currentTime = 0
          }
          setSurpriseState('idle')
        }
      }

      window.addEventListener('touchmove', preventScroll, { passive: false })
      window.addEventListener('wheel', preventScroll, { passive: false })
      window.addEventListener('keydown', handleKeyDown)

      return () => {
        document.body.style.position = origBodyPosition
        document.body.style.top = origBodyTop
        document.body.style.width = origBodyWidth
        document.body.style.overflow = origBodyOverflow
        document.body.style.touchAction = origBodyTouchAction
        document.documentElement.style.overflow = origHtmlOverflow

        window.removeEventListener('touchmove', preventScroll)
        window.removeEventListener('wheel', preventScroll)
        window.removeEventListener('keydown', handleKeyDown)

        window.scrollTo(0, scrollY)
      }
    }
  }, [surpriseState])

  const triggerSurprise = useCallback(() => {
    triggerHaptic(20)

    let nextIdx = Math.floor(Math.random() * MOODS.length)
    if (nextIdx === surpriseIndex && MOODS.length > 1) {
      nextIdx = (surpriseIndex + 1) % MOODS.length
    }
    setSurpriseIndex(nextIdx)

    // Low-end mobile / accessibility optimization: skip video playback if motion reduction requested
    if (shouldReduceMotion) {
      setSurpriseState('revealed')
      triggerHaptic(25)
      return
    }

    setSurpriseState('flipping')

    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    }

    const tick1 = setTimeout(() => triggerHaptic(8), 350)
    const tick2 = setTimeout(() => triggerHaptic(8), 850)
    const tick3 = setTimeout(() => triggerHaptic(8), 1350)
    const tick4 = setTimeout(() => triggerHaptic(12), 1850)

    const timer = setTimeout(() => {
      // Release mobile video hardware decoder resources
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
      setSurpriseState('revealed')
      triggerHaptic(25)
    }, 2400)

    return () => {
      clearTimeout(tick1)
      clearTimeout(tick2)
      clearTimeout(tick3)
      clearTimeout(tick4)
      clearTimeout(timer)
    }
  }, [surpriseIndex, triggerHaptic, shouldReduceMotion])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
    touchStartY.current = e.changedTouches[0].screenY
    touchEndX.current = e.changedTouches[0].screenX
    touchEndY.current = e.changedTouches[0].screenY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
    touchEndY.current = e.changedTouches[0].screenY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
    touchEndY.current = e.changedTouches[0].screenY
    const swipeDistanceX = touchEndX.current - touchStartX.current
    const swipeDistanceY = touchEndY.current - touchStartY.current

    // If swipe was mostly vertical, allow normal document scroll and don't change mood
    if (Math.abs(swipeDistanceY) > Math.abs(swipeDistanceX)) {
      return
    }

    if (swipeDistanceX < -40) {
      updateMood('next')
    } else if (swipeDistanceX > 40) {
      updateMood('prev')
    }
  }

  const handleSelectMood = () => {
    navigate({
      to: '/discover',
      search: { genre: currentMood.genreSlug },
    })
  }

  const scrollToSlide2 = () => {
    const section = document.getElementById('serendipity-section')
    if (section) {
      const headerOffset = 56
      const elementPosition = section.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  const scrollToSlide3 = () => {
    const section = document.getElementById('feelings-carousel-section')
    if (section) {
      const headerOffset = 56
      const elementPosition = section.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  const viewMoodInCarousel = (moodIndex: number) => {
    setSlideDirection(moodIndex > currentIndex ? 1 : -1)
    setCurrentIndex(moodIndex)
    scrollToSlide3()
  }

  return (
    <div
      className="block md:hidden w-full min-h-screen bg-white text-[#191d16] select-none pt-14"
      role="region"
      aria-label="Hatchpen Mobile Experience"
    >
      {/* =====================================================================
          Fixed Top Navigation Header
          Exception 1: Left mein icon
          Exception 2: Right mein hamburger
          Exception 3: 100% existing app font-family
          ===================================================================== */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] pt-safe">
        <div className="h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between">
          {/* Exception 1: Left mein icon */}
          <Link
            to="/"
            className="flex items-center space-x-2 focus:outline-none"
            aria-label="Hatchpen Home"
          >
            <HatchpenLogo size="xs" variant="compact" forceTheme="light" />
          </Link>

          {/* Exception 2: Right mein hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#191d16] hover:bg-black/5 active:scale-95 transition-all focus:outline-none cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
            >
              <line x1="4" x2="20" y1="7" y2="7" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="17" y2="17" />
            </svg>
          </button>
        </div>
      </header>

      {/* =====================================================================
          SECTION 1: HERO (SLIDE 01)
          Precisely 100% of visible viewport (Header + Section = 100dvh).
          Image ALWAYS centered.
          On taller screens: Actions naturally shift to bottom.
          ===================================================================== */}
      <section className="h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] max-h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] w-full flex flex-col justify-between items-center px-6 pt-1 pb-4 max-w-md mx-auto overflow-hidden">
        {/* Narrative Center Editorial Section — ALWAYS VERTICALLY CENTERED */}
        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center my-auto">
          {/* Centered Image Container: increased size to fill vertical space prominently */}
          <div className="relative w-full flex-1 min-h-0 max-h-[50vh] sm:max-h-[54vh] flex items-center justify-center my-auto scale-[1.14] sm:scale-[1.18] origin-center">
            <img
              alt="Portrait of creative woman reading an open book"
              className="w-auto h-full max-h-full max-w-full object-contain object-center pointer-events-none mx-auto"
              src={screen01WomanImg}
              style={{
                WebkitMaskImage: 'linear-gradient(black 76%, transparent 100%)',
                maskImage: 'linear-gradient(black 76%, transparent 100%)',
              }}
            />
          </div>
          <div className="w-full text-center px-4 pt-1 pb-1 shrink-0">
            <h1 className="font-serif text-[26px] sm:text-[32px] text-[#161c14] leading-[1.18] tracking-tight mx-auto max-w-[320px]">
              You haven’t met<br />your next <span className="italic font-normal">favourite</span> story.
            </h1>
          </div>
        </div>

        {/* Bottom Action Module — Pins to bottom, sits safely above Safari browser bar */}
        <div className="w-full shrink-0 flex flex-col items-center space-y-2.5 pt-1 pb-2">
          <div className="w-full max-w-xs mx-auto">
            <button
              type="button"
              onClick={scrollToSlide2}
              className="w-full inline-flex items-center justify-center space-x-2.5 bg-[#1e241c] text-[#f7f5ef] px-8 py-3.5 rounded-full shadow-lg active:scale-95 transition-all duration-200 group hover:bg-[#2b3328] focus:outline-none cursor-pointer"
            >
              <span className="font-serif text-[17px] sm:text-[18px] font-medium text-[#f7f5ef] tracking-tight">
                Begin your journey
              </span>
              <ArrowRight className="w-4 h-4 text-[#f7f5ef] transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToSlide2}
            className="flex flex-col items-center space-y-1 pt-0.5 pb-0.5 opacity-75 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0"
          >
            <span className="font-sans text-xs tracking-wider text-[#545e4e]">
              Scroll to explore
            </span>
            <svg
              className="w-4 h-4 text-[#545e4e] animate-bounce"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: TONIGHT’S BLIND DATE (SLIDE 02)
          "Blind Date with a Story" — Hatchpen Editorial Literary Aesthetic.
          Warm book-cloth texture, refined serif typography, zero text flickering.
          ===================================================================== */}
      <section
        id="serendipity-section"
        className="relative h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] max-h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] flex flex-col justify-between items-center px-4 sm:px-6 py-2.5 max-w-md mx-auto w-full bg-white border-none overflow-hidden"
      >


        {/* ============================================================
           BASE LAYER: 9:16 Book Image + Video Page Turn (Always in DOM)
           When revealed, the open book remains visibly grounded on the table,
           serving as the foundation from which the library bookmark emerges.
           ============================================================ */}
        <div
          className={`w-full flex-1 flex flex-col justify-center items-center my-auto min-h-0 pt-0 pb-1 transition-all duration-500 ease-out ${
            surpriseState === 'revealed'
              ? 'scale-[1.02] blur-[0.5px] opacity-85 pointer-events-none select-none'
              : 'scale-100 blur-0 opacity-100'
          }`}
        >
          {/* Natural Book Container with 9:16 Vertical Ratio & Balanced Sizing */}
          <div className="relative w-full flex items-center justify-center flex-1 min-h-0 max-h-[40vh] sm:max-h-[44vh] overflow-hidden scale-[1.08] sm:scale-[1.12] origin-center">
            <div className="relative w-auto h-full max-h-full max-w-full aspect-[9/16] flex items-center justify-center">
              {/* Resting State Image (Exact Frame 0 of video, WebP + PNG fallback) */}
              <picture className="w-full h-full flex items-center justify-center">
                <source srcSet={bookIdleWebp} type="image/webp" />
                <img
                  alt="Surprise with a random book"
                  decoding="async"
                  loading="eager"
                  className={`w-full h-full object-contain object-center pointer-events-none mx-auto block transition-opacity duration-150 will-change-[opacity] ${
                    surpriseState === 'flipping' ? 'opacity-0' : 'opacity-100'
                  }`}
                  src={bookIdleImg}
                />
              </picture>

              {/* Photorealistic Page-Turn Video (467KB trimmed, 60fps native GPU decode) */}
              <video
                ref={videoRef}
                src={animatedBookVideoOptimized}
                muted
                playsInline
                preload="auto"
                disablePictureInPicture
                disableRemotePlayback
                className={`absolute inset-0 w-full h-full object-contain object-center pointer-events-none transition-opacity duration-150 will-change-[opacity] ${
                  surpriseState === 'flipping' ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Lightweight GPU-composited feathering overlays for seamless background blending */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-gradient-to-l from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white to-transparent z-10" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent z-10" />
            </div>
          </div>

          {/* Surrounding Editorial Typography Below Image */}
          <div
            className={`w-full text-center px-4 pt-1.5 pb-1 shrink-0 relative z-20 transition-opacity duration-300 ${
              surpriseState === 'revealed' ? 'opacity-15' : 'opacity-100'
            }`}
          >
            <span className="block font-sans text-[11px] font-semibold text-[#c84b25] uppercase tracking-[0.2em]">
              ✦ Curated by Fate
            </span>
            <h2 className="font-serif text-[26px] sm:text-[30px] text-[#161c14] leading-[1.18] tracking-tight mx-auto max-w-[320px] mt-0.5">
              Tonight’s Blind Date
            </h2>
            <p className="font-sans text-[13px] text-[#55624e] mt-1 tracking-normal max-w-xs mx-auto">
              Leave algorithms behind. Let serendipity choose your read.
            </p>
          </div>
        </div>

        {/* Bottom Action Module — Pins to bottom */}
        <div
          className={`w-full shrink-0 flex flex-col items-center space-y-2.5 pt-1 pb-2 transition-all duration-300 ${
            surpriseState === 'revealed' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="w-full max-w-xs mx-auto">
            <button
              type="button"
              disabled={surpriseState === 'flipping'}
              onClick={triggerSurprise}
              className="w-full inline-flex items-center justify-center space-x-2.5 bg-[#1e241c] text-[#f7f5ef] px-8 py-3.5 rounded-full shadow-lg active:scale-95 transition-all duration-200 group hover:bg-[#2b3328] focus:outline-none cursor-pointer disabled:opacity-90 disabled:cursor-wait"
            >
              <span className="font-serif text-[17px] sm:text-[18px] font-medium text-[#f7f5ef] tracking-tight">
                {surpriseState === 'flipping' ? 'Turning pages...' : 'Surprise me'}
              </span>
              <ArrowRight
                className={`w-4 h-4 text-white transition-transform duration-200 ${
                  surpriseState === 'flipping' ? 'translate-x-1' : 'group-hover:translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={scrollToSlide3}
            className="flex flex-col items-center space-y-1 pt-0.5 pb-0.5 opacity-75 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-0"
          >
            <span className="font-sans text-xs tracking-wider text-[#545e4e]">
              Let me choose a mood
            </span>
            <svg
              className="w-4 h-4 text-[#545e4e] animate-bounce"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* ============================================================
           DIRECTION 2: THE VINTAGE BOOKMARK / LIBRARY LENDING SLIP
           Slides out from the open book's center crease like a tactile keepsake
           ============================================================ */}
        <AnimatePresence>
          {surpriseState === 'revealed' && (
            <div
              onTouchMove={(e) => e.preventDefault()}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 touch-none overscroll-none select-none"
            >
              {/* Ultra-soft ambient backdrop catching outside taps to tuck bookmark back */}
              <motion.div
                onTouchMove={(e) => e.preventDefault()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => {
                  triggerHaptic(8)
                  if (videoRef.current) {
                    videoRef.current.pause()
                    videoRef.current.currentTime = 0
                  }
                  setSurpriseState('idle')
                }}
                className="absolute inset-0 bg-stone-900/20 backdrop-blur-[1.5px] cursor-pointer"
              />

              {/* Physical Bookmark Slip Container */}
              <motion.div
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.94 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 70, scale: 0.94 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative z-50 w-full max-w-sm mx-auto flex flex-col items-center"
              >
                {/* Physical Crimson Bookmark Ribbon Tab peeking from top */}
                <div className="relative z-10 -mb-2.5 flex items-center justify-center">
                  <div className="w-5 h-5 bg-[#c84b25] rounded-t-sm shadow-[0_2px_6px_rgba(200,75,37,0.4)] flex items-center justify-center border-t border-x border-[#df643f]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FAF7F0]/80 shadow-inner" />
                  </div>
                </div>

                {/* Atmospheric Ambient Glow */}
                <div
                  className="absolute -inset-4 rounded-3xl blur-2xl opacity-40 pointer-events-none transition-all duration-700 -z-10"
                  style={{ backgroundColor: surprisedMood.glow || 'rgba(200, 75, 37, 0.25)' }}
                />

                {/* Tactile Library Card Body */}
                <div className="w-full rounded-2xl bg-[#FAF6EE] border border-[#E5DEC9] shadow-[0_24px_50px_rgba(28,24,18,0.22),0_8px_20px_rgba(28,24,18,0.1)] p-4 sm:p-5 flex flex-col relative overflow-hidden">
                  {/* Subtle Vintage Dashed Border Inset */}
                  <div className="absolute inset-2.5 rounded-xl border border-dashed border-[#DCD3BD]/70 pointer-events-none" />

                  {/* Top Header: Mood Badge on Left, Vintage Catalog Slip in Center, Cross Close Button on Right */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EAE3D2] relative z-10">
                    {/* Left: Mood Badge */}
                    <div className="inline-flex items-center gap-1.5 min-w-0 bg-[#EFE8D8] px-2.5 py-1 rounded-full border border-[#DFD7C2]">
                      <span className="text-sm shrink-0">{surprisedMood.icon}</span>
                      <span className="font-sans text-[11px] font-semibold text-[#55624e] uppercase tracking-wider">
                        {surprisedMood.name}
                      </span>
                    </div>

                    {/* Center: Vintage Library Catalog Reference */}
                    <span className="font-mono text-[9.5px] font-medium tracking-[0.18em] text-[#8b5a3c]/75 uppercase hidden xs:inline-block">
                      FATE SLIP № {410 + surpriseIndex * 17}
                    </span>

                    {/* Right: Close X Button */}
                    <button
                      type="button"
                      aria-label="Tuck bookmark back into book"
                      onClick={() => {
                        triggerHaptic(8)
                        if (videoRef.current) {
                          videoRef.current.pause()
                          videoRef.current.currentTime = 0
                        }
                        setSurpriseState('idle')
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[#717b6a] hover:text-[#161c14] bg-[#EFE8D8]/70 hover:bg-[#EAE1CB] active:scale-90 transition-all cursor-pointer border border-[#DFD7C2]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Book Jacket + Story Details Row */}
                  <div className="flex items-center gap-3.5 pt-3 pb-2 relative z-10">
                    {/* Mini 3D Hardcover Book Jacket */}
                    <div className="relative shrink-0 w-[84px] h-[122px] sm:w-[92px] sm:h-[132px] rounded-r-md rounded-l-xs overflow-hidden shadow-[-4px_6px_20px_rgba(22,28,20,0.28),0_2px_4px_rgba(22,28,20,0.12)] border-r-2 border-b-2 border-[#E2DBCB]">
                      <img
                        src={surprisedMood.img}
                        alt={surprisedMood.story.title}
                        className="w-full h-full object-cover object-center"
                        loading="eager"
                        decoding="async"
                      />
                      {/* Spine Crease & Shadow */}
                      <div className="absolute inset-y-0 left-0 w-[9px] bg-gradient-to-r from-black/35 via-white/20 to-transparent pointer-events-none border-r border-black/10" />
                      {/* Soft Book Cover Gloss */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/25 pointer-events-none" />
                      {/* Physical Paper Page Rim on Right */}
                      <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-l from-[#ded8c4] to-[#f4efe1] pointer-events-none" />
                    </div>

                    {/* Story Metadata */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="font-sans text-[10px] font-semibold text-[#8b5a3c] uppercase tracking-wider block mb-0.5 truncate">
                        {surprisedMood.story.category}
                      </span>
                      <h3 className="font-serif text-[18px] sm:text-[20px] font-bold text-[#161c14] leading-[1.22] tracking-tight line-clamp-2">
                        {surprisedMood.story.title}
                      </h3>
                      <p className="font-sans text-[12px] text-[#55624e] font-medium mt-0.5">
                        by {surprisedMood.story.author}
                      </p>
                      <div className="flex items-center gap-2 mt-2 pt-1 border-t border-[#EAE3D2] text-[10.5px] font-sans text-[#717b6a]">
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-[#c84b25]" />
                          {surprisedMood.story.chapters}
                        </span>
                        <span>•</span>
                        <span>~12 min read</span>
                      </div>
                    </div>
                  </div>

                  {/* Whisper from Chapter 1 (The Hook) */}
                  <div className="my-2 pl-3 border-l-2 border-[#c84b25] py-0.5 relative z-10">
                    <span className="font-sans text-[9.5px] font-semibold text-[#8b5a3c] uppercase tracking-wider block mb-0.5">
                      Whisper from Chapter 1
                    </span>
                    <p className="italic font-serif text-[12.5px] sm:text-[13px] text-[#2c3527] leading-relaxed line-clamp-3">
                      {surprisedMood.hook ? surprisedMood.hook : `“${surprisedMood.story.synopsis}”`}
                    </p>
                  </div>

                  {/* Primary Card CTA */}
                  <div className="pt-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(14)
                        navigate({
                          to: '/discover',
                          search: { genre: surprisedMood.genreSlug },
                        })
                      }}
                      className="w-full inline-flex items-center justify-center space-x-2 bg-[#1e241c] text-[#f7f5ef] py-3.5 rounded-full shadow-md active:scale-95 transition-all text-[15px] font-serif font-medium cursor-pointer hover:bg-[#2b3328] group"
                    >
                      <span>Begin this story</span>
                      <ArrowRight className="w-4 h-4 text-[#d48356] group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Tactile Tuck Back hint below card */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(8)
                    if (videoRef.current) {
                      videoRef.current.pause()
                      videoRef.current.currentTime = 0
                    }
                    setSurpriseState('idle')
                  }}
                  className="mt-3 text-[11.5px] font-sans font-medium text-[#717b6a] hover:text-[#161c14] transition-colors py-1 px-3 rounded-full hover:bg-black/5 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Tuck bookmark into book</span>
                  <span className="text-[10px]">✕</span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>

      {/* =====================================================================
          SECTION 3: 12-MOOD FEELINGS CAROUSEL / CURATED STORIES VIEW (SLIDE 03)
          Instruction 1: Tap any mood slide to reveal 5 curated stories + Load more button
          Instruction 2: Tabs pills ("Adventurous", "Melancholic", etc.) removed
          Instruction 3: Monochrome black & white on bg-white matching Slide 01
          Instruction 4: "Explore {mood_name}" button removed from dock
          ===================================================================== */}
      <section
        id="feelings-carousel-section"
        className="relative min-h-[calc(100svh-3.5rem-env(safe-area-inset-top,0px))] flex flex-col justify-between px-4 sm:px-6 py-4 max-w-md mx-auto w-full bg-white border-none overflow-hidden"
      >
        <div className="flex flex-col w-full select-none my-auto">
          {/* Editorial Headline Section (App Serif) */}
          <div className="flex flex-col pt-1 pb-2">
            <h2 className="font-serif text-[28px] sm:text-[32px] text-[#191d16] font-normal leading-[1.15] tracking-tight whitespace-nowrap">
              I’d Like to feel..
            </h2>
            <p className="font-sans text-[13.5px] text-[#55624e] mt-0.5 tracking-normal">
              Swipe cards or tap to explore curated stories
            </p>
          </div>

          {/* 3D Peek Card Deck (Tabs pills removed as requested) */}
          <div className="relative w-full overflow-hidden py-2 flex items-center justify-center">
            <div
              className="relative flex items-center justify-center w-full touch-pan-y transition-transform duration-500 ease-out"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Left Peek Card */}
              <div
                onClick={() => updateMood('prev')}
                role="button"
                tabIndex={0}
                aria-label={`Previous: ${prevMood.name}`}
                className="w-[72%] max-w-[250px] aspect-[9/15] rounded-[22px] overflow-hidden bg-neutral-100 shadow-sm shrink-0 -mr-16 scale-90 opacity-40 blur-[0.5px] cursor-pointer transition-all duration-300 relative select-none"
              >
                <img
                  src={prevMood.img}
                  alt={prevMood.name}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4">
                  <span className="font-serif text-[18px] italic text-white font-normal tracking-wide text-center drop-shadow-sm">
                    {prevMood.name}
                  </span>
                </div>
              </div>

              {/* Center Active Card: Tapping opens Curated Stories UI in an 80% bottom sheet */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  triggerHaptic(15)
                  setSelectedMoodForStories(currentMood)
                  setExtraStoriesCount(0)
                  setActiveStoryIdx(0)
                }}
                aria-label={`Current: ${currentMood.name}. Tap to explore 5 stories.`}
                className="relative z-20 w-[78%] max-w-[285px] aspect-[9/15] rounded-[26px] overflow-hidden shadow-2xl bg-neutral-900 shrink-0 cursor-pointer select-none group"
              >
                <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
                  <motion.div
                    key={currentMood.name}
                    custom={slideDirection}
                    variants={{
                      enter: (dir: number) => ({
                        x: dir > 0 ? 80 : -80,
                        opacity: 0,
                        scale: 0.92,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          x: { type: 'spring', stiffness: 280, damping: 26 },
                          opacity: { duration: 0.28 },
                          scale: { duration: 0.3 },
                        },
                      },
                      exit: (dir: number) => ({
                        x: dir > 0 ? -80 : 80,
                        opacity: 0,
                        scale: 0.92,
                        transition: {
                          x: { type: 'spring', stiffness: 280, damping: 26 },
                          opacity: { duration: 0.22 },
                          scale: { duration: 0.26 },
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="absolute inset-0 w-full h-full"
                  >
                    <img
                      src={currentMood.img}
                      alt={currentMood.name}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-transform duration-700 ease-out group-hover:scale-105"
                    />

                    {/* Soft atmospheric gradient vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#191d16] via-[#191d16]/45 to-transparent pointer-events-none" />

                    {/* Bottom Label Overlay with Opening Hook */}
                    <div className="absolute inset-x-0 bottom-0 z-20 pb-6 pt-12 flex flex-col items-center justify-end text-center bg-gradient-to-t from-[#191d16] via-[#191d16]/80 to-transparent px-4">
                      <motion.p
                        key={`hook-${currentMood.name}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.04 }}
                        className="font-serif italic text-white/85 text-[12px] min-[380px]:text-[13px] leading-snug text-center drop-shadow-md mb-2 font-normal line-clamp-2 max-w-[230px]"
                      >
                        {currentMood.hook}
                      </motion.p>

                      <motion.h3
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.08 }}
                        className="font-serif text-[26px] sm:text-[30px] italic font-normal text-white drop-shadow-sm tracking-wide"
                      >
                        {currentMood.name}
                      </motion.h3>

                      <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.12 }}
                        className="font-sans text-[11px] font-medium text-white/75 uppercase tracking-[0.2em] mt-0.5"
                      >
                        {currentMood.count} • Tap to view stories
                      </motion.span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Right Peek Card */}
              <div
                onClick={() => updateMood('next')}
                role="button"
                tabIndex={0}
                aria-label={`Next: ${nextMood.name}`}
                className="w-[72%] max-w-[250px] aspect-[9/15] rounded-[22px] overflow-hidden bg-neutral-100 shadow-sm shrink-0 -ml-16 scale-90 opacity-40 blur-[0.5px] cursor-pointer transition-all duration-300 relative select-none"
              >
                <img
                  src={nextMood.img}
                  alt={nextMood.name}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4">
                  <span className="font-serif text-[18px] italic text-white font-normal tracking-wide text-center drop-shadow-sm">
                    {nextMood.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Dock: Only Clean < 1 / 12 > controls ("Explore {mood}" removed as requested) */}
          <div className="flex flex-col items-center justify-center mt-3">
            <div className="inline-flex items-center bg-neutral-100 border border-neutral-200/70 rounded-full px-2 py-1 shadow-sm">
              <button
                type="button"
                onClick={() => updateMood('prev')}
                aria-label="Previous mood"
                className="w-10 h-9 flex items-center justify-center text-[#191d16] hover:text-black active:scale-95 transition-all rounded-l-full cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="px-3 text-[11.5px] font-sans font-medium text-neutral-600 tracking-wider select-none">
                {currentIndex + 1} / {MOODS.length}
              </div>

              <button
                type="button"
                onClick={() => updateMood('next')}
                aria-label="Next mood"
                className="w-10 h-9 flex items-center justify-center text-[#191d16] hover:text-black active:scale-95 transition-all rounded-r-full cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          80% BOTTOM SHEET DRAWER: CURATED MOOD STORIES VIEW (live_instructions.md)
          Appears from browser bottom, covering 80% screen area
          ===================================================================== */}
      <AnimatePresence>
        {selectedMoodForStories && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => {
                triggerHaptic(10)
                setSelectedMoodForStories(null)
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              aria-label="Close sheet overlay"
            />

            {/* Bottom Sheet Modal (80% Height) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e, info) => {
                if (info.offset.y > 80 || info.velocity.y > 400) {
                  triggerHaptic(10)
                  setSelectedMoodForStories(null)
                }
              }}
              className="relative z-50 w-full max-w-md h-[80dvh] max-h-[80vh] min-h-[500px] bg-white rounded-t-[32px] shadow-[0_-16px_48px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden border-t border-neutral-100"
            >
              {/* Pull handle indicator */}
              <div className="pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none">
                <div className="w-12 h-1.5 bg-neutral-300 rounded-full" />
              </div>

              {/* Utility Bar */}
              <div className="flex items-center justify-between px-4 sm:px-6 pt-1 pb-2 shrink-0 z-20 border-b border-neutral-100">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10)
                    setSelectedMoodForStories(null)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-sans font-medium text-neutral-600 hover:text-black py-1 px-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All vibes</span>
                </button>

                <span className="font-sans text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                  Curated Selection
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => triggerHaptic(12)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all text-neutral-800 text-[11.5px] font-medium cursor-pointer"
                    aria-label="Save for later"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span className="hidden min-[380px]:inline">Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(10)
                      setSelectedMoodForStories(null)
                    }}
                    className="w-7 h-7 rounded-full bg-neutral-100 hover:bg-neutral-200 active:scale-95 transition-all flex items-center justify-center text-neutral-600 hover:text-black cursor-pointer"
                    aria-label="Close sheet"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sheet Scrollable / Flex Body */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 flex flex-col justify-between select-none">
                {/* Narrative Header */}
                <div className="pt-2 pb-1 z-20 relative shrink-0">
                  <h2 className="font-serif text-[26px] sm:text-[30px] text-[#191d16] leading-[1.08] tracking-tight">
                    Stories<br />
                    for your<br />
                    kind of <span className="italic font-normal text-black">{selectedMoodForStories.name.toLowerCase()}.</span>
                  </h2>
                  <p className="font-sans text-[13px] text-neutral-600 mt-1 max-w-[280px]">
                    A few handpicked reads based on what you love.
                  </p>
                </div>

                {/* Hero Backdrop with Atmospheric Artwork & Story Reel */}
                <div className="relative w-full z-10 flex flex-col justify-end pt-10 pb-2 my-auto">
                  {/* Seamless white fade overlay at top */}
                  <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-white via-white/40 to-transparent h-16" />

                  {/* Mood illustration / photography image */}
                  <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
                    <img
                      src={selectedMoodForStories.img}
                      alt={selectedMoodForStories.name}
                      className="w-full h-full object-cover object-center opacity-65 grayscale contrast-110 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white/90 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent pointer-events-none" />
                  </div>

                  {/* Recommended Story Cards Horizontal Carousel */}
                  <div className="relative z-20 w-full pt-14">
                    <div
                      className="flex gap-2.5 px-1 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 no-scrollbar"
                      style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                    >
                      {selectedMoodForStories.curatedStories
                        .slice(0, 5 + extraStoriesCount)
                        .map((story, sIdx) => {
                          const isActiveCard = sIdx === activeStoryIdx
                          return (
                            <article
                              key={story.id}
                              onClick={() => {
                                triggerHaptic(12)
                                setActiveStoryIdx(sIdx)
                                setSelectedMoodForStories(null)
                                navigate({
                                  to: '/discover',
                                  search: { genre: selectedMoodForStories.genreSlug },
                                })
                              }}
                              className={`flex-shrink-0 w-[142px] snap-center rounded-xl bg-[#191d16] text-white shadow-xl p-3 flex flex-col justify-between h-[126px] relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform ${
                                isActiveCard ? 'ring-2 ring-white/40 shadow-2xl scale-[1.02]' : ''
                              }`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-white/10 pointer-events-none" />
                              <div className="relative z-10">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/70 mb-1.5" />
                                <h3 className="font-serif text-[15px] leading-tight font-semibold text-white drop-shadow-sm line-clamp-2">
                                  {story.title}
                                </h3>
                              </div>
                              <div className="relative z-10 flex items-center justify-between mt-auto pt-1.5 border-t border-white/10">
                                <span className="font-sans text-[10px] tracking-normal text-white/70 truncate pr-1">
                                  {story.category} • {story.readTime}
                                </span>
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                                  <ArrowRight className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            </article>
                          )
                        })}
                    </div>

                    {/* Pagination Indicators */}
                    <div className="flex items-center justify-center gap-1.5 pt-2">
                      {selectedMoodForStories.curatedStories.slice(0, 5).map((_, dotIdx) => (
                        <span
                          key={dotIdx}
                          className={`h-1.5 rounded-full transition-all ${
                            dotIdx === activeStoryIdx ? 'w-4 bg-[#191d16]' : 'w-1.5 bg-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Primary Bottom Call to Action: "Load more" */}
                <div className="pt-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))] z-20 flex flex-col items-center w-full shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(12)
                      if (extraStoriesCount < 3) {
                        setExtraStoriesCount((prev) => prev + 2)
                      } else {
                        setSelectedMoodForStories(null)
                        navigate({
                          to: '/discover',
                          search: { genre: selectedMoodForStories.genreSlug },
                        })
                      }
                    }}
                    className="w-full max-w-sm h-12 py-3 px-6 rounded-full bg-[#191d16] text-[#f7f5ef] hover:bg-[#2b3328] shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span className="font-serif text-[15px] font-medium tracking-tight">Load more</span>
                    <ArrowRight className="w-4 h-4 text-[#f7f5ef] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          Mobile Drawer / Menu (Preserved with all actions intact)
          ===================================================================== */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMenuOpen(false)
            }}
          >
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.01 }
                  : { type: 'spring', damping: 28, stiffness: 280 }
              }
              className="w-full bg-[#1C1D21] border-t border-neutral-800 rounded-t-3xl p-6 space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <HatchpenLogo size="xs" variant="inverted" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                    Menu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate({ to: '/discover' })
                  }}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Compass className="h-4 w-4 text-[#c84b25]" />
                    <span>Explore Stories</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenWriteModal()
                  }}
                  className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-900 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <PenLine className="h-4 w-4 text-[#c84b25]" />
                    <span>Write on HatchPen</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                </button>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenAuth()
                  }}
                  className="flex-1 py-3 rounded-xl bg-white text-black font-semibold text-xs text-center cursor-pointer"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenAuth()
                  }}
                  className="flex-1 py-3 rounded-xl bg-[#c84b25] text-white font-semibold text-xs text-center cursor-pointer"
                >
                  Join HatchPen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PublicMobileStories
