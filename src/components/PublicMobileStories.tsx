import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, X, Sparkles, Compass, PenLine, LogIn, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { HatchpenLogo } from './HatchpenLogo'

interface PublicMobileStoriesProps {
  onOpenAuth: () => void
  onOpenWriteModal: () => void
}

export function PublicMobileStories({ onOpenAuth, onOpenWriteModal }: PublicMobileStoriesProps) {
  const navigate = useNavigate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const totalSlides = 4

  const goToSlide = useCallback((target: number) => {
    setCurrentSlide((prev) => {
      setDirection(target > prev ? 1 : -1)
      return target
    })
  }, [])

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev < totalSlides - 1) {
        setDirection(1)
        return prev + 1
      }
      return prev
    })
  }, [totalSlides])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      if (prev > 0) {
        setDirection(-1)
        return prev - 1
      }
      return prev
    })
  }, [])

  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      className="block md:hidden fixed inset-0 z-30 h-screen supports-[height:100dvh]:h-[100dvh] supports-[height:100svh]:h-[100svh] w-full overflow-hidden bg-[#111417] text-[#161513] select-none touch-none"
      style={{ height: '100svh' }}
      role="region"
      aria-label="Hatchpen Mobile Story Presentation"
    >
      {/* =====================================================================
          SVG DEF: Proportional Artisan Bookbinding Seam Curve
          Keeps cream panel <= 60% of width, leaving artwork visible on tall/short screens
          ===================================================================== */}
      <svg className="absolute" height="0" width="0" aria-hidden="true">
        <defs>
          <clipPath id="book-seam-clip" clipPathUnits="objectBoundingBox">
            <path
              d="
                M 0,0 
                L 0.15,0
                C 0.19,0.06 0.29,0.14 0.39,0.22
                C 0.49,0.30 0.54,0.38 0.56,0.48
                C 0.58,0.57 0.60,0.64 0.60,0.70
                C 0.60,0.77 0.61,0.84 0.61,0.88
                C 0.60,0.93 0.59,0.97 0.59,1.0
                L 0,1.0 
                Z"
            />
          </clipPath>
        </defs>
      </svg>

      {/* =====================================================================
          ANIMATED STORY SLIDES CAROUSEL WITH NATIVE TOUCH & POINTER DRAG
          ===================================================================== */}
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={
            shouldReduceMotion
              ? undefined
              : {
                  enter: (dir: number) => ({
                    x: dir > 0 ? '100%' : dir < 0 ? '-100%' : '0%',
                    opacity: 0.95,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                  },
                  exit: (dir: number) => ({
                    x: dir > 0 ? '-100%' : dir < 0 ? '100%' : '0%',
                    opacity: 0.95,
                  }),
                }
          }
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 320, damping: 32 },
            opacity: { duration: 0.2 },
          }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_e, { offset, velocity }) => {
            const swipeThreshold = 40
            const velocityThreshold = 0.25
            if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
              nextSlide()
            } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
              prevSlide()
            }
          }}
          className="absolute inset-0 w-full h-full overflow-hidden flex flex-col justify-between touch-none"
        >
          {/* =====================================================================
              SLIDE 0: OPTION 3 STITCHED BOOKBINDING PERFORATION (FIRST PAGE)
              ===================================================================== */}
          {currentSlide === 0 && (
        <div className="relative w-full h-full overflow-hidden flex flex-col justify-between">
          {/* Layer 1: Illustrated sunset cliff mountain artwork behind paper */}
          <div className="absolute inset-0 w-full h-full z-1 bg-[#10151c]">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiMbi1xnPDZtlnQZfiFQB1J_xAMrh6Ywbf3HpDHxm7IzmC1vq2wEPBBd_yWrCzTMdHDmZVlOdcZn3P17Vw3cFEUmqDIoNzA9ntx6WgZ5QcW_JFDCAD2cxCKvqpw7DT8c6Dw5dgPGY_iia0Z74pdxh9UIt9zNutIGOFHZ1QIjKUY7V0ABfc1p6HVeuLLCYYrpc2XixtZ8p0QyT26iSL6TMfwqluJVLvbUeVJlAEjCpgyycp33UK9FWXfERfPGgmhzXxZGA"
              alt="Sunset cliff mountain vista artwork"
              className="absolute inset-0 w-full h-full object-cover object-[78%_center]"
            />
            {/* Soft vignette over image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
          </div>

          {/* Layer 2: Foreground Stitched Bookbinding Paper Layer (Curved Folio Mask) */}
          <div
            className="absolute inset-0 z-10 [clip-path:url(#book-seam-clip)]"
            style={{
              backgroundColor: '#f7efe4',
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.95) 0%, transparent 60%), radial-gradient(circle at 80% 90%, rgba(210, 195, 175, 0.3) 0%, transparent 65%)',
              filter: 'drop-shadow(6px 0 16px rgba(0, 0, 0, 0.38))',
            }}
          />

          {/* Layer 3: Artisan Bookbinding Stitches, Perforations & Seam Indent Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-15"
            preserveAspectRatio="none"
            viewBox="0 0 412 874"
            aria-hidden="true"
          >
            <defs>
              <filter id="stitch-emboss" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0.5" dy="1" stdDeviation="0.6" floodColor="#3d2c1c" floodOpacity="0.45" />
              </filter>
            </defs>
            {/* Embossed pressed seam groove */}
            <path
              d="M 59,-2 C 75,50 117,120 159,190 C 197,260 219,330 229,418 C 237,496 245,558 245,610 C 245,670 249,730 247,770 C 245,815 242,850 239,876"
              fill="none"
              stroke="#d5c7b3"
              strokeWidth="4.5"
              opacity="0.65"
            />
            <path
              d="M 60,-2 C 76,50 118,120 160,190 C 198,260 220,330 230,418 C 238,496 246,558 246,610 C 246,670 250,730 248,770 C 246,815 243,850 240,876"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.9"
            />
            {/* Perforated Tear-Line (laser-cut micro punch slits / pinholes) */}
            <path
              d="M 53,-2 C 69,50 111,120 153,190 C 191,260 213,330 223,418 C 231,496 239,558 239,610 C 239,670 243,730 241,770 C 239,815 236,850 233,876"
              fill="none"
              stroke="#524335"
              strokeWidth="1.8"
              strokeDasharray="1.5,4"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M 54,-1 C 70,51 112,121 154,191 C 192,261 214,331 224,419 C 232,497 240,559 240,611 C 240,671 244,731 242,771 C 240,816 237,851 234,877"
              fill="none"
              stroke="#ffffff"
              strokeWidth="0.8"
              strokeDasharray="1.5,4"
              strokeLinecap="round"
              opacity="0.65"
            />
            {/* Artisan Wax-Thread Saddle-Stitch Line */}
            <path
              d="M 41,-2 C 57,50 99,120 141,190 C 179,260 201,330 211,418 C 219,496 227,558 227,610 C 227,670 231,730 229,770 C 227,815 224,850 221,876"
              fill="none"
              stroke="#23170c"
              strokeWidth="2.6"
              strokeDasharray="9,7"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M 40,-3 C 56,49 98,119 140,189 C 178,259 200,329 210,417 C 218,495 226,557 226,609 C 226,669 230,729 228,769 C 226,814 223,849 220,875"
              fill="none"
              stroke="#9e5b28"
              strokeWidth="2.1"
              strokeDasharray="8.5,7.5"
              strokeLinecap="round"
              filter="url(#stitch-emboss)"
            />
            {/* Wax thread specular fiber highlights */}
            <path
              d="M 40,-3 C 56,49 98,119 140,189 C 178,259 200,329 210,417 C 218,495 226,557 226,609 C 226,669 230,729 228,769 C 226,814 223,849 220,875"
              fill="none"
              stroke="#f0cf98"
              strokeWidth="1.2"
              strokeDasharray="3,13"
              strokeLinecap="round"
              opacity="0.8"
            />
            {/* Needle punch holes */}
            <path
              d="M 40,-3 C 56,49 98,119 140,189 C 178,259 200,329 210,417 C 218,495 226,557 226,609 C 226,669 230,729 228,769 C 226,814 223,849 220,875"
              fill="none"
              stroke="#332415"
              strokeWidth="2.8"
              strokeDasharray="1.2,14.8"
              strokeLinecap="round"
              opacity="0.75"
            />
          </svg>

          {/* Layer 4: Top Navigation & Header */}
          <header className="relative z-20 pt-[max(0.85rem,env(safe-area-inset-top,0px))] px-5 sm:px-6 flex items-center justify-between shrink-0">
            {/* Logo: Official Inverted Hatchpen Brand Identity */}
            <Link
              to="/"
              className="inline-flex items-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] no-underline focus:outline-none"
              aria-label="Hatchpen Home"
            >
              <HatchpenLogo size="sm" variant="inverted" />
            </Link>

            {/* Hamburger Icon -> opens mobile drawer */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-black/35 backdrop-blur-md text-white border border-white/10 shadow-sm focus:outline-none cursor-pointer active:scale-95 motion-reduce:transform-none motion-reduce:transition-none transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <line x1="4" x2="20" y1="7" y2="7" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="17" y2="17" />
              </svg>
            </button>
          </header>

          {/* Layer 5: Main Editorial Content Area (Proportionally centered in folio) */}
          <main className="relative z-20 flex-1 px-5 sm:px-6 flex flex-col justify-center min-h-0">
            <div className="w-full max-w-[250px] min-[380px]:max-w-[275px] flex flex-col space-y-3 min-[380px]:space-y-4 sm:space-y-5 my-auto py-2">
              {/* Editorial Vertical Stack Headline - 100% Brand Matched (Outfit) */}
              <h1 className="font-serif font-extrabold text-[35px] min-[380px]:text-[40px] sm:text-[44px] leading-[0.96] tracking-[-0.035em] text-[#161513] flex flex-col">
                <span>A</span>
                <span>quieter</span>
                <span>place</span>
                <span>for</span>
                <span className="italic text-[#c84b25]">bolder</span>
                <span>stories.</span>
              </h1>

              {/* Lavender Highlight Sub-text Pills */}
              <div className="flex flex-col items-start space-y-1.5 font-sans">
                <span className="bg-[#cec4db]/85 px-2.5 py-0.5 rounded text-[12.5px] min-[380px]:text-[13.5px] leading-snug font-medium text-[#222120] backdrop-blur-xs">
                  Different worlds.
                </span>
                <span className="bg-[#cec4db]/85 px-2.5 py-0.5 rounded text-[12.5px] min-[380px]:text-[13.5px] leading-snug font-medium text-[#222120] backdrop-blur-xs">
                  Different perspectives.
                </span>
                <span className="bg-[#cec4db]/85 px-2.5 py-0.5 rounded text-[12.5px] min-[380px]:text-[13.5px] leading-snug font-medium text-[#222120] backdrop-blur-xs">
                  A fairer place for stories.
                </span>
              </div>

              {/* Call to Action Section */}
              <div className="pt-1 min-[380px]:pt-2">
                <div className="flex items-center space-x-3.5">
                  {/* Terracotta Circle Button with Arrow */}
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/discover' })}
                    aria-label="Explore Hatchpen"
                    className="w-[52px] h-[52px] min-[380px]:w-[56px] min-[380px]:h-[56px] rounded-full bg-[#c84b25] flex items-center justify-center text-white shadow-lg shadow-[#c84b25]/35 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer shrink-0 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <svg className="w-5 h-5 min-[380px]:w-6 min-[380px]:h-6" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                      <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* CTA Label */}
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/discover' })}
                    className="flex flex-col justify-center text-left cursor-pointer bg-transparent border-0 p-0"
                  >
                    <span className="text-[16px] min-[380px]:text-[17px] font-medium leading-tight text-[#222120]">Explore</span>
                    <span className="text-[16px] min-[380px]:text-[17px] font-medium leading-tight text-[#222120]">Hatchpen</span>
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* Layer 6: Bottom Pagination Indicator (Safely inside cream folio) */}
          <footer className="relative z-20 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pt-1 px-5 sm:px-6 w-full shrink-0">
            <div className="w-full max-w-[250px] min-[380px]:max-w-[275px] flex items-center justify-start space-x-2.5 min-[380px]:space-x-3 text-xs tracking-wider font-semibold text-[#5a554e]" aria-label="Story Slide Navigation">
              {/* Active Slide: 01 */}
              <div className="flex flex-col items-center">
                <span className="text-[#1a1918] font-bold">01</span>
                <span className="w-3.5 h-[1.5px] bg-[#c84b25] mt-0.5 rounded-full" />
              </div>
              <span className="text-stone-400 font-light text-[11px] pb-1">|</span>
              {/* Inactive Slides */}
              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                02
              </button>
              <button
                type="button"
                onClick={() => goToSlide(2)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                03
              </button>
              <button
                type="button"
                onClick={() => goToSlide(3)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                04
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* =====================================================================
          SLIDE 1 (PAGE 02): "WHAT MOVES YOU TODAY?" - MOOD RIBBONS
          ===================================================================== */}
      {currentSlide === 1 && (
        <div className="relative w-full h-full overflow-hidden flex flex-col justify-between bg-[#f6efe6]">
          {/* Subtle parchment grain & radial gradients */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage:
                'radial-gradient(at 10% 20%, rgba(226, 214, 196, 0.45) 0px, transparent 50%), radial-gradient(at 90% 80%, rgba(216, 201, 180, 0.35) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(248, 243, 235, 0.6) 0px, transparent 80%)',
            }}
          />

          {/* Background Botanical branch watercolor artwork top right */}
          <div className="absolute -top-4 -right-6 w-52 sm:w-56 h-72 sm:h-80 pointer-events-none opacity-90 z-10" aria-hidden="true">
            <svg className="w-full h-full drop-shadow-sm" fill="none" viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg">
              <path d="M165,300 C150,250 145,200 135,140 C130,105 140,70 145,15" stroke="#2e2722" strokeLinecap="round" strokeWidth="2.2" />
              <path d="M142,175 C125,160 100,165 85,158" stroke="#3b332b" strokeLinecap="round" strokeWidth="1.6" />
              <path d="M136,132 C148,118 165,115 178,110" stroke="#3b332b" strokeLinecap="round" strokeWidth="1.5" />
              <path d="M140,92 C125,75 105,72 88,68" stroke="#3b332b" strokeLinecap="round" strokeWidth="1.4" />
              <ellipse cx="146" cy="40" fill="#d5c8b7" fillOpacity="0.85" rx="14" ry="10" transform="rotate(-20 146 40)" />
              <ellipse cx="160" cy="48" fill="#ded2c3" fillOpacity="0.8" rx="12" ry="9" transform="rotate(35 160 48)" />
              <ellipse cx="152" cy="60" fill="#cfc2b1" fillOpacity="0.85" rx="13" ry="10" transform="rotate(85 152 60)" />
              <ellipse cx="137" cy="55" fill="#dacdbd" fillOpacity="0.75" rx="12" ry="8" transform="rotate(-50 137 55)" />
              <circle cx="148" cy="50" fill="#544c42" r="4.5" />
              <ellipse cx="178" cy="80" fill="#786c5f" fillOpacity="0.9" rx="7" ry="5.5" transform="rotate(40 178 80)" />
              <circle cx="177" cy="79" fill="#2b2621" r="2" />
              <path d="M136,140 C120,135 110,142 105,155 C115,165 130,160 136,140 Z" fill="#464a3e" fillOpacity="0.9" />
              <path d="M138,155 C148,162 165,165 172,158 C168,148 152,145 138,155 Z" fill="#585c4e" fillOpacity="0.85" />
              <path d="M85,158 C72,152 62,159 58,170 C68,178 80,172 85,158 Z" fill="#3c4035" fillOpacity="0.88" />
              <path d="M135,100 C118,92 108,100 102,112 C114,120 128,114 135,100 Z" fill="#505646" fillOpacity="0.9" />
              <path d="M165,115 C178,118 190,126 195,135 C192,142 178,138 165,115 Z" fill="#626857" fillOpacity="0.8" />
              <circle cx="95" cy="88" fill="#873527" fillOpacity="0.85" r="3.2" />
              <circle cx="90" cy="95" fill="#a14232" fillOpacity="0.75" r="2.5" />
              <circle cx="102" cy="98" fill="#5a221a" fillOpacity="0.85" r="2.8" />
            </svg>
          </div>

          {/* Background Botanical Branch accent bottom left */}
          <div className="absolute bottom-40 -left-6 w-28 h-40 pointer-events-none opacity-85 z-10" aria-hidden="true">
            <svg className="w-full h-full" fill="none" viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,130 C25,120 38,90 48,50 C52,30 55,10 60,0" stroke="#332d26" strokeLinecap="round" strokeWidth="1.8" />
              <path d="M25,110 C40,105 55,112 60,120" stroke="#332d26" strokeWidth="1.2" />
              <ellipse cx="62" cy="118" fill="#a44b36" fillOpacity="0.85" rx="6" ry="4" />
              <ellipse cx="48" cy="85" fill="#933e2d" fillOpacity="0.85" rx="7" ry="4.5" transform="rotate(-30 48 85)" />
              <ellipse cx="56" cy="50" fill="#7a3426" fillOpacity="0.9" rx="8" ry="5" transform="rotate(-20 56 50)" />
              <circle cx="38" cy="92" fill="#b0523d" r="3" />
              <circle cx="28" cy="100" fill="#843222" r="2.2" />
            </svg>
          </div>

          {/* Top Navigation Row */}
          <header className="relative z-30 pt-[max(0.85rem,env(safe-area-inset-top,0px))] px-5 sm:px-6 flex items-center justify-between shrink-0">
            {/* Back Button -> returns to Slide 0 */}
            <button
              type="button"
              onClick={() => goToSlide(0)}
              aria-label="Back to Slide 01"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 text-[#191715] transition-colors cursor-pointer active:scale-95 motion-reduce:transform-none"
            >
              <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Step Indicator & Menu */}
            <div className="flex items-center gap-3">
              <div className="flex items-center text-[13px] font-sans tracking-tight font-medium text-[#191715] leading-none">
                <span className="font-bold text-[#191715]">02</span>
                <span className="mx-0.5 text-stone-400">/</span>
                <span className="text-stone-500 font-normal">04</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 text-[#191715] transition-colors cursor-pointer active:scale-95 motion-reduce:transform-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="4" x2="20" y1="7" y2="7" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="17" y2="17" />
                </svg>
              </button>
            </div>
          </header>

          {/* Main Headline Section - 100% Brand Typography (Outfit + Inter) */}
          <div className="relative z-20 px-6 sm:px-7 flex-1 flex flex-col justify-center min-h-0 pt-6 min-[380px]:pt-10 pb-2">
            <div className="max-w-[270px]">
              <h1 className="font-serif font-extrabold text-[36px] min-[380px]:text-[40px] sm:text-[44px] leading-[1.02] tracking-[-0.03em] text-[#191715]">
                What<br />moves<br />you today?
              </h1>
              <p className="mt-3 text-[#5c5650] text-[13px] min-[380px]:text-[13.5px] leading-relaxed font-sans font-normal">
                Explore by feeling. Each mood opens a different side of storytelling.
              </p>
            </div>
          </div>

          {/* Mood Ribbon Slices Stack */}
          <div className="relative w-full shrink-0 select-none pb-1 z-20" role="list" aria-label="Mood options">
            {/* Slice 1: Melancholic */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Select Melancholic mood"
              onClick={() => navigate({ to: '/discover' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate({ to: '/discover' })
                }
              }}
              className="relative -mb-6 z-40 group cursor-pointer active:scale-[0.985] motion-reduce:transform-none transition-transform"
            >
              <div className="relative w-full h-[120px] min-[380px]:h-[126px] drop-shadow-[0_8px_18px_rgba(20,25,35,0.22)]">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 126">
                  <defs>
                    <clipPath id="wave1-path">
                      <path d="M 0,42 C 45,62 105,62 165,32 C 225,2 295,-2 400,28 L 400,126 C 300,136 210,132 140,112 C 80,95 30,102 0,120 Z" />
                    </clipPath>
                    <radialGradient cx="72%" cy="42%" id="moonGlow" r="28%">
                      <stop offset="0%" stopColor="#ffffea" stopOpacity="0.95" />
                      <stop offset="35%" stopColor="#b6cde2" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0b1724" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="nightSky" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#07111c" />
                      <stop offset="45%" stopColor="#14263b" />
                      <stop offset="100%" stopColor="#08101a" />
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#wave1-path)">
                    <rect fill="url(#nightSky)" height="126" width="400" />
                    <circle cx="290" cy="48" fill="url(#moonGlow)" r="42" />
                    <circle cx="290" cy="48" fill="#e8edf2" r="19" />
                    <circle cx="286" cy="45" fill="#cad5e0" opacity="0.6" r="5" />
                    <circle cx="294" cy="51" fill="#cad5e0" opacity="0.5" r="7" />
                    <circle cx="297" cy="43" fill="#bcccd9" opacity="0.5" r="3.5" />
                    <path d="M120,110 L160,78 L200,95 L245,65 L285,88 L340,68 L400,90 L400,126 L120,126 Z" fill="#0c1d2e" opacity="0.8" />
                    <path d="M0,120 L30,95 L65,108 L110,82 L150,105 L210,84 L270,108 L340,94 L400,110 L400,126 L0,126 Z" fill="#04090f" />
                    <ellipse cx="290" cy="115" fill="#a4c2db" opacity="0.35" rx="28" ry="4" />
                    <ellipse cx="286" cy="120" fill="#d9e6f2" opacity="0.4" rx="16" ry="2" />
                  </g>
                  <path d="M 0,42 C 45,62 105,62 165,32 C 225,2 295,-2 400,28" fill="none" opacity="0.5" stroke="#685642" strokeWidth="0.75" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-between px-6 min-[380px]:px-7 pt-4 pointer-events-none">
                  <span className="font-serif text-[21px] min-[380px]:text-[23px] font-bold text-stone-100 tracking-wide drop-shadow-md">
                    Melancholic
                  </span>
                  <div className="w-8 h-8 rounded-full border border-stone-300/40 bg-stone-900/30 backdrop-blur-sm flex items-center justify-center text-stone-200 transition-transform duration-200 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Slice 2: Hopeful */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Select Hopeful mood"
              onClick={() => navigate({ to: '/discover' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate({ to: '/discover' })
                }
              }}
              className="relative -mb-6 z-30 group cursor-pointer active:scale-[0.985] motion-reduce:transform-none transition-transform"
            >
              <div className="relative w-full h-[120px] min-[380px]:h-[126px] drop-shadow-[0_8px_16px_rgba(40,25,15,0.2)]">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 126">
                  <defs>
                    <clipPath id="wave2-path">
                      <path d="M 0,22 C 75,-3 175,10 255,34 C 315,52 368,48 400,30 L 400,126 C 335,145 265,140 180,112 C 110,88 50,96 0,118 Z" />
                    </clipPath>
                    <linearGradient id="sunsetGrad" x1="0%" x2="100%" y1="0%" y2="80%">
                      <stop offset="0%" stopColor="#e08e53" />
                      <stop offset="40%" stopColor="#f5ba78" />
                      <stop offset="75%" stopColor="#df8a56" />
                      <stop offset="100%" stopColor="#4e311f" />
                    </linearGradient>
                    <radialGradient cx="55%" cy="35%" id="sunHaze" r="45%">
                      <stop offset="0%" stopColor="#ffeaaf" stopOpacity="0.8" />
                      <stop offset="60%" stopColor="#e28a4c" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#e28a4c" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <g clipPath="url(#wave2-path)">
                    <rect fill="url(#sunsetGrad)" height="126" width="400" />
                    <rect fill="url(#sunHaze)" height="126" width="400" />
                    <ellipse cx="140" cy="50" fill="#f8cf9c" opacity="0.6" rx="55" ry="18" />
                    <ellipse cx="230" cy="45" fill="#ffd8a6" opacity="0.7" rx="70" ry="22" />
                    <ellipse cx="280" cy="55" fill="#f3af76" opacity="0.5" rx="45" ry="16" />
                    <path d="M60,126 C110,80 180,95 240,78 C300,62 360,82 400,75 L400,126 Z" fill="#b06437" opacity="0.75" />
                    <path d="M0,126 C40,95 100,105 170,98 C240,90 320,110 400,95 L400,126 Z" fill="#5c4328" />
                    <path d="M0,115 C45,102 110,115 160,110 C210,105 280,120 360,112 L400,118 L400,126 L0,126 Z" fill="#2d2b1f" />
                  </g>
                  <path d="M 0,22 C 75,-3 175,10 255,34 C 315,52 368,48 400,30" fill="none" opacity="0.6" stroke="#e8c99e" strokeWidth="0.8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-between px-6 min-[380px]:px-7 pt-3.5 pointer-events-none">
                  <span className="font-serif text-[21px] min-[380px]:text-[23px] font-bold text-stone-100 tracking-wide drop-shadow-md">
                    Hopeful
                  </span>
                  <div className="w-8 h-8 rounded-full border border-stone-200/50 bg-stone-900/35 backdrop-blur-sm flex items-center justify-center text-stone-100 transition-transform duration-200 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Slice 3: Dreamlike */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Select Dreamlike mood"
              onClick={() => navigate({ to: '/discover' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate({ to: '/discover' })
                }
              }}
              className="relative -mb-6 z-20 group cursor-pointer active:scale-[0.985] motion-reduce:transform-none transition-transform"
            >
              <div className="relative w-full h-[120px] min-[380px]:h-[126px] drop-shadow-[0_8px_16px_rgba(30,15,35,0.2)]">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 126">
                  <defs>
                    <clipPath id="wave3-path">
                      <path d="M 0,22 C 75,5 150,2 230,22 C 295,38 355,35 400,18 L 400,112 C 340,132 250,132 170,110 C 90,88 40,96 0,116 Z" />
                    </clipPath>
                    <linearGradient id="dreamSky" x1="0%" x2="100%" y1="0%" y2="90%">
                      <stop offset="0%" stopColor="#495579" />
                      <stop offset="30%" stopColor="#736b92" />
                      <stop offset="65%" stopColor="#c19ab7" />
                      <stop offset="100%" stopColor="#e3a79d" />
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#wave3-path)">
                    <rect fill="url(#dreamSky)" height="126" width="400" />
                    <circle cx="270" cy="55" fill="#f8d6d6" opacity="0.65" r="38" />
                    <circle cx="230" cy="62" fill="#eed0e2" opacity="0.75" r="30" />
                    <circle cx="310" cy="68" fill="#fad7cb" opacity="0.6" r="32" />
                    <circle cx="185" cy="70" fill="#b99ec2" opacity="0.7" r="28" />
                    <path d="M0,126 L30,95 C60,80 90,85 120,98 C160,115 200,90 250,105 C300,120 360,100 400,115 L400,126 Z" fill="#3b3353" opacity="0.85" />
                    <path d="M0,115 C45,100 80,118 120,112 C160,106 200,122 250,118 C300,114 360,125 400,120 L400,126 L0,126 Z" fill="#251f33" />
                  </g>
                  <path d="M 0,22 C 75,5 150,2 230,22 C 295,38 355,35 400,18" fill="none" opacity="0.55" stroke="#d5bad4" strokeWidth="0.8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-between px-6 min-[380px]:px-7 pt-3.5 pointer-events-none">
                  <span className="font-serif text-[21px] min-[380px]:text-[23px] font-bold text-stone-100 tracking-wide drop-shadow-md">
                    Dreamlike
                  </span>
                  <div className="w-8 h-8 rounded-full border border-stone-200/50 bg-stone-900/35 backdrop-blur-sm flex items-center justify-center text-stone-100 transition-transform duration-200 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Slice 4: Unsettling */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Select Unsettling mood"
              onClick={() => navigate({ to: '/discover' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate({ to: '/discover' })
                }
              }}
              className="relative z-10 group cursor-pointer active:scale-[0.985] motion-reduce:transform-none transition-transform"
            >
              <div className="relative w-full h-[120px] min-[380px]:h-[126px]">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 126">
                  <defs>
                    <clipPath id="wave4-path">
                      <path d="M 0,22 C 80,2 170,5 250,28 C 315,46 365,42 400,26 L 400,126 L 0,126 Z" />
                    </clipPath>
                    <linearGradient id="darkCrimson" x1="50%" x2="50%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#4a0f12" />
                      <stop offset="35%" stopColor="#801c1c" />
                      <stop offset="70%" stopColor="#3c0b0f" />
                      <stop offset="100%" stopColor="#120406" />
                    </linearGradient>
                  </defs>
                  <g clipPath="url(#wave4-path)">
                    <rect fill="url(#darkCrimson)" height="126" width="400" />
                    <ellipse cx="270" cy="50" fill="#a82323" opacity="0.5" rx="85" ry="35" />
                    <ellipse cx="280" cy="65" fill="#ff4d4d" opacity="0.25" rx="45" ry="25" />
                    <path d="M190,126 L195,65 M195,85 L180,68 M195,78 L208,62 M240,126 L245,55 M245,72 L230,55 M245,68 L260,50" stroke="#250508" strokeLinecap="round" strokeWidth="2.5" />
                    <path d="M280,68 C278,68 274,73 273,82 C271,94 269,112 268,126 L292,126 C291,112 289,94 287,82 C286,73 282,68 280,68 Z" fill="#0d0203" />
                    <circle cx="280" cy="66" fill="#0d0203" r="4.2" />
                    <path d="M305,126 L312,45 M312,68 L295,50 M312,75 L332,58 M360,126 L365,58 M365,80 L350,65 M365,72 L380,55" stroke="#120204" strokeLinecap="round" strokeWidth="3" />
                    <path d="M85,126 L92,55 M92,75 L75,60 M92,85 L108,70" stroke="#150305" strokeWidth="3" />
                    <path d="M0,105 C40,95 80,112 130,100 C180,88 230,110 270,102 C310,95 360,115 400,105 L400,126 L0,126 Z" fill="#080102" />
                  </g>
                  <path d="M 0,22 C 80,2 170,5 250,28 C 315,46 365,42 400,26" fill="none" opacity="0.6" stroke="#993d3d" strokeWidth="0.8" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-between px-6 min-[380px]:px-7 pt-4 pointer-events-none">
                  <span className="font-serif text-[21px] min-[380px]:text-[23px] font-bold text-stone-100 tracking-wide drop-shadow-md">
                    Unsettling
                  </span>
                  <div className="w-8 h-8 rounded-full border border-stone-200/50 bg-stone-900/35 backdrop-blur-sm flex items-center justify-center text-stone-100 transition-transform duration-200 group-hover:translate-x-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Pagination Indicator */}
          <footer className="relative z-20 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] w-full flex justify-center items-center shrink-0">
            <div className="flex items-center space-x-3 text-xs tracking-wider font-semibold text-[#5a554e]" aria-label="Story Slide Navigation">
              <button
                type="button"
                onClick={() => goToSlide(0)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                01
              </button>
              <div className="flex flex-col items-center">
                <span className="text-[#1a1918] font-bold">02</span>
                <span className="w-3.5 h-[1.5px] bg-[#c84b25] mt-0.5 rounded-full" />
              </div>
              <span className="text-stone-400 font-light text-[11px] pb-1">|</span>
              <button
                type="button"
                onClick={() => goToSlide(2)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                03
              </button>
              <button
                type="button"
                onClick={() => goToSlide(3)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                04
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* =====================================================================
          SLIDE 2 (PAGE 03): "EXPLORE GENRES." - ASYMMETRIC BENTO GRID
          ===================================================================== */}
      {currentSlide === 2 && (
        <div className="relative w-full h-full overflow-hidden flex flex-col justify-between bg-[#0c0e11] text-[#fbf9f5]">
          {/* Top Navigation Row */}
          <header className="relative z-30 pt-[max(0.85rem,env(safe-area-inset-top,0px))] px-5 sm:px-6 flex items-center justify-between shrink-0">
            {/* Back Button -> returns to Slide 01 */}
            <button
              type="button"
              onClick={() => goToSlide(1)}
              aria-label="Back to Slide 02"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer active:scale-95 motion-reduce:transform-none"
            >
              <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Step Indicator & Menu */}
            <div className="flex items-center gap-3">
              <div className="flex items-center text-[13px] font-sans tracking-tight font-medium text-white/90 leading-none">
                <span className="font-bold text-white">03</span>
                <span className="mx-0.5 text-stone-500">/</span>
                <span className="text-stone-400 font-normal">04</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer active:scale-95 motion-reduce:transform-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="4" x2="20" y1="7" y2="7" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="17" y2="17" />
                </svg>
              </button>
            </div>
          </header>

          {/* Scrollable / Flexible Bento Content View */}
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-2 pb-3 scrollbar-none flex flex-col justify-between min-h-0">
            {/* Hero Editorial Typography - 100% Brand Matched (Outfit + Inter) */}
            <section className="mb-3 min-[380px]:mb-4 shrink-0">
              <h1 className="font-serif font-extrabold text-[34px] min-[380px]:text-[38px] sm:text-[42px] leading-[1.05] tracking-tight text-white">
                Explore<br />
                <span className="text-[#df562c] italic">genres</span>.
              </h1>
              <p className="mt-1.5 font-sans text-[13px] min-[380px]:text-[13.5px] leading-snug text-neutral-400 font-normal">
                Different worlds.<br />
                Different perspectives.
              </p>
            </section>

            {/* Asymmetric Genre Bento Grid (6 Cards) */}
            <section className="grid grid-cols-2 gap-2.5 min-[380px]:gap-3 pb-2 my-auto">
              {/* CARD 1: Literary Fiction */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '90px 75px 42px 70px',
                  background: 'radial-gradient(circle at 75% 20%, #f4e9d6 0%, #d8c3a5 60%, #bca585 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Botanical Branch Illustration Silhouette */}
                <div className="absolute inset-0 pointer-events-none opacity-85" aria-hidden="true">
                  <svg className="w-full h-full text-[#382b20]" fill="currentColor" viewBox="0 0 200 240">
                    <path d="M95,240 C95,210 105,170 110,130 C114,98 122,65 130,40 C131,37 128,35 126,38 C120,55 105,85 102,110 C98,135 90,185 88,240 Z" opacity="0.9" />
                    <path d="M110,130 C125,120 145,105 160,85 C162,82 158,80 155,82 C140,95 125,110 112,122 Z" opacity="0.8" />
                    <circle cx="160" cy="85" opacity="0.8" r="3.5" />
                    <circle cx="152" cy="78" opacity="0.7" r="2" />
                    <circle cx="140" cy="98" opacity="0.75" r="2.5" />
                    <path d="M104,155 C88,140 70,128 50,118 C47,117 46,120 48,122 C65,132 80,145 98,160 Z" opacity="0.8" />
                    <circle cx="50" cy="118" opacity="0.8" r="3" />
                    <circle cx="62" cy="122" opacity="0.7" r="2" />
                    <path d="M124,70 C140,58 152,42 165,22 C166,20 163,18 161,20 C149,36 138,50 124,64 Z" opacity="0.8" />
                    <circle cx="165" cy="22" opacity="0.85" r="3" />
                    <circle cx="150" cy="35" opacity="0.7" r="2.5" />
                  </svg>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-[#1c1712] font-bold tracking-tight">
                    Literary<br />Fiction
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>

              {/* CARD 2: Fantasy */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '88px 88px 24px 24px',
                  background: 'radial-gradient(circle at 50% 10%, #203a5c 0%, #0d1b2a 55%, #050a10 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Citadel and Night Sky Illustration Backdrop */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-28 bg-blue-400/10 rounded-full blur-xl" />
                  <div className="absolute top-6 left-6 w-1 h-1 bg-white/70 rounded-full" />
                  <div className="absolute top-12 right-8 w-1 h-1 bg-white/50 rounded-full" />
                  <div className="absolute top-4 right-14 w-0.5 h-0.5 bg-white/80 rounded-full" />
                  <svg className="w-full h-full" fill="none" viewBox="0 0 180 220">
                    <path d="M90 25 L102 65 L112 120 L135 150 L145 220 L35 220 L45 150 L68 120 L78 65 Z" fill="#09131d" />
                    <path d="M90 25 L93 60 L104 110 L108 170 L115 220 L80 220 L83 170 L87 110 L89 60 Z" fill="#14263a" />
                    <polygon fill="#070e16" points="90,15 87,40 93,40" />
                    <polygon fill="#09131d" points="65,80 62,110 68,110" />
                    <polygon fill="#09131d" points="115,80 112,110 118,110" />
                    <circle cx="90" cy="110" fill="#f7b731" r="1.5" />
                    <circle cx="92" cy="135" fill="#f7b731" r="1.5" />
                    <circle cx="102" cy="150" fill="#e17055" r="1.5" />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#050a10] via-[#050a10]/80 to-transparent" />
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-white font-bold tracking-tight pb-0.5">
                    Fantasy
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/95 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>

              {/* CARD 3: Romance */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '80px 70px 24px 24px',
                  background: 'radial-gradient(circle at 60% 40%, #ea5c30 0%, #872818 55%, #2a0a07 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Sun Disc and Crimson Botanical Flower Motif */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-5 left-8 w-20 h-20 rounded-full bg-[#f35728]/80 blur-[2px] opacity-90" />
                  <div className="absolute bottom-0 inset-x-0 h-24 bg-[#1f0604] [clip-path:polygon(0_65%,35%_45%,70%_70%,100%_40%,100%_100%,0_100%)] opacity-95" />
                  <svg className="absolute bottom-4 right-2 w-24 h-28" fill="none" viewBox="0 0 100 120">
                    <path d="M42 120 C42 90 48 70 54 48" stroke="#100302" strokeLinecap="round" strokeWidth="2.5" />
                    <ellipse cx="56" cy="38" fill="#db3a1b" rx="14" ry="11" transform="rotate(-15 56 38)" />
                    <ellipse cx="48" cy="36" fill="#e84c2a" rx="13" ry="10" transform="rotate(20 48 36)" />
                    <circle cx="53" cy="38" fill="#240502" r="4.5" />
                    <circle cx="34" cy="74" fill="#bf2e13" r="3.5" />
                    <path d="M34 74 L45 84" stroke="#100302" strokeWidth="1.5" />
                  </svg>
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#120202] to-transparent" />
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-white font-bold tracking-tight pb-0.5">
                    Romance
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/95 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>

              {/* CARD 4: Mystery */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '28px 28px 24px 24px',
                  background: 'radial-gradient(circle at 50% 45%, #42464c 0%, #15181e 65%, #08090b 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Vaulted Gothic Arches Backdrop */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <svg className="w-full h-full" fill="none" viewBox="0 0 160 200">
                    <path d="M62 135 C62 90 98 90 98 135 L98 150 L62 150 Z" fill="#b9bec6" opacity="0.85" />
                    <path d="M40 180 C40 80 120 80 120 180 L140 180 C140 60 20 60 20 180 Z" fill="#1e2229" />
                    <path d="M10 200 C10 40 150 40 150 200 L160 200 C160 25 0 25 0 200 Z" fill="#0d0f13" />
                    <ellipse cx="80" cy="116" fill="#111317" rx="2.5" ry="3" />
                    <path d="M76 122 L84 122 L83 144 L77 144 Z" fill="#111317" />
                  </svg>
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-10 h-14 bg-white/35 blur-md" />
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#08090b] via-[#08090b]/80 to-transparent" />
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-white font-bold tracking-tight pb-0.5">
                    Mystery
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/95 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>

              {/* CARD 5: Science Fiction */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '24px 24px 24px 50px',
                  background: 'radial-gradient(circle at 90% 80%, #30587e 0%, #0c1825 50%, #02060b 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Cosmic Earth Planet Rim and Blazing Star Flare */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <div className="absolute top-5 left-10 w-0.5 h-0.5 bg-white/70 rounded-full" />
                  <div className="absolute top-8 right-8 w-1 h-1 bg-white/80 rounded-full" />
                  <div className="absolute top-16 right-5 w-0.5 h-0.5 bg-white/50 rounded-full" />
                  <div className="absolute -bottom-16 -left-12 w-48 h-48 rounded-full border-[1.5px] border-[#93c5fd]/50 bg-gradient-to-tr from-[#02060b] via-[#091f37] to-[#1e486f] shadow-[0_0_25px_rgba(96,165,250,0.3)]" />
                  <div className="absolute top-[70px] left-[60px] w-5 h-5 rounded-full bg-white blur-[2px] shadow-[0_0_16px_8px_rgba(255,255,255,0.7)]" />
                  <div className="absolute top-[78px] left-[45px] w-12 h-[1px] bg-white blur-[0.5px] rotate-[-25deg]" />
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#02060b] via-[#02060b]/70 to-transparent" />
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-white font-bold tracking-tight">
                    Science<br />Fiction
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/95 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>

              {/* CARD 6: Poetry */}
              <article
                onClick={() => navigate({ to: '/discover' })}
                style={{
                  borderRadius: '40px 75px 36px 36px',
                  background: 'radial-gradient(circle at 50% 50%, #f5ece0 0%, #dfd3c1 70%, #ccbfa9 100%)',
                }}
                className="h-[128px] min-[380px]:h-[142px] min-[420px]:h-[155px] relative overflow-hidden shadow-lg p-3 min-[380px]:p-3.5 flex flex-col justify-end group cursor-pointer transition-transform duration-300 active:scale-[0.98]"
              >
                {/* Pressed Botanical Herb / Wildflower Ink Silhouette */}
                <div className="absolute inset-0 pointer-events-none opacity-85" aria-hidden="true">
                  <svg className="w-full h-full text-[#302820]" fill="currentColor" viewBox="0 0 180 220">
                    <path d="M96 220 C96 160 92 110 88 40" stroke="#302820" strokeLinecap="round" strokeWidth="1.8" />
                    <path d="M88 40 L88 20" stroke="#302820" strokeWidth="1.2" />
                    <circle cx="88" cy="20" r="3" />
                    <circle cx="83" cy="26" r="2.2" />
                    <circle cx="94" cy="24" r="2.5" />
                    <path d="M93 140 C80 120 62 105 52 80" fill="none" stroke="#302820" strokeLinecap="round" strokeWidth="1.5" />
                    <circle cx="52" cy="80" r="3.2" />
                    <circle cx="45" cy="86" r="2" />
                    <circle cx="58" cy="74" r="2" />
                    <path d="M91 100 C110 85 125 70 142 50" fill="none" stroke="#302820" strokeLinecap="round" strokeWidth="1.4" />
                    <circle cx="142" cy="50" r="3" />
                    <circle cx="135" cy="58" r="2" />
                    <circle cx="148" cy="44" r="2" />
                    <circle cx="74" cy="115" r="2" />
                    <circle cx="118" cy="85" r="2.2" />
                    <circle cx="68" cy="148" r="2" />
                  </svg>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <h2 className="font-serif text-[17px] min-[380px]:text-[18px] leading-[20px] text-[#1f1914] font-bold tracking-tight pb-0.5">
                    Poetry
                  </h2>
                  <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/95 group-hover:scale-105 transition-transform">
                    <svg className="w-3.5 h-3.5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </article>
            </section>
          </div>

          {/* Bottom Pagination Indicator */}
          <footer className="relative z-20 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] w-full flex justify-center items-center shrink-0">
            <div className="flex items-center space-x-3 text-xs tracking-wider font-semibold text-neutral-400" aria-label="Story Slide Navigation">
              <button
                type="button"
                onClick={() => goToSlide(0)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                01
              </button>
              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                02
              </button>
              <div className="flex flex-col items-center">
                <span className="text-white font-bold">03</span>
                <span className="w-3.5 h-[1.5px] bg-[#df562c] mt-0.5 rounded-full" />
              </div>
              <span className="text-neutral-600 font-light text-[11px] pb-1">|</span>
              <button
                type="button"
                onClick={() => goToSlide(3)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                04
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* =====================================================================
          SLIDE 3 (PAGE 04): "HAVE A STORY TO TELL?" - FINAL ONBOARDING SLIDE
          ===================================================================== */}
      {currentSlide === 3 && (
        <div className="relative w-full h-full overflow-hidden flex flex-col justify-between bg-[#f8f6f0] text-[#1a1d1a]">
          {/* Background Artwork Image & Seamless Gradient Overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlpng-KXV8GmEMYKEe4TXw-e0UzzSLEQxmt1c69PqnD7KXiJCyuYK2TksE0HoF8S98Fz-jo2DZRQ354TOeqTyE9bKxy2FQkpP3L8IvGBSS04a5HHMqdBdDvZ6J9e9futwfz5RPzkjaQMMBmnwQQve2AxkI3uub9TO19Wqg2sAqns-THw7wvzcuoWomtMEBhGNNPtwB8JRRiYg5Z47rBBLbfK5mBYj1nxaP-i1O5ih_1ss5T7YikHMiMw"
              alt="Luminous warm stone archway with ascending mossy steps, floating origami paper cranes and golden morning light"
              className="w-full h-[58%] min-[380px]:h-[60%] sm:h-[62%] object-cover object-top"
            />
            {/* Atmospheric parchment gradient overlay fading down into warm cream */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(248, 246, 240, 0) 0%, rgba(248, 246, 240, 0.05) 30%, rgba(248, 246, 240, 0.6) 48%, rgba(248, 246, 240, 0.95) 60%, #f8f6f0 70%, #f8f6f0 100%)',
              }}
            />
          </div>

          {/* Top Navigation Row */}
          <header className="relative z-20 pt-[max(0.85rem,env(safe-area-inset-top,0px))] px-5 sm:px-6 flex items-center justify-between shrink-0">
            {/* Back Button -> returns to Slide 03 / prev */}
            <button
              type="button"
              onClick={() => goToSlide(2)}
              aria-label="Back to Slide 03"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#f8f6f0]/80 backdrop-blur-md text-[#1a1d1a] border border-white/60 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Step Indicator & Menu */}
            <div className="flex items-center gap-3">
              <div className="flex items-center text-[13px] font-sans tracking-tight font-medium text-[#1a1d1a] leading-none px-3 py-2 rounded-full bg-[#f8f6f0]/80 backdrop-blur-md border border-white/60 shadow-sm">
                <span className="font-bold text-[#1a1d1a]">04</span>
                <span className="mx-0.5 text-stone-400">/</span>
                <span className="text-stone-500 font-normal">04</span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#f8f6f0]/80 backdrop-blur-md text-[#1a1d1a] border border-white/60 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="4" x2="20" y1="7" y2="7" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="17" y2="17" />
                </svg>
              </button>
            </div>
          </header>

          {/* Main Editorial Content & Action CTAs */}
          <section className="relative z-20 flex-1 flex flex-col justify-end px-6 sm:px-7 pb-4 min-[380px]:pb-6">
            {/* Headline & Subtitle - 100% Brand Matched (Outfit + Inter) */}
            <div className="mb-6 min-[380px]:mb-7">
              <h1 className="font-serif font-extrabold text-[36px] min-[380px]:text-[42px] sm:text-[46px] leading-[1.06] tracking-tight text-[#1a1d1a]">
                Have a<br />
                <span className="italic text-[#d35427]">story</span> to tell?
              </h1>
              <p className="mt-2.5 min-[380px]:mt-3 text-[14px] min-[380px]:text-[15.5px] leading-relaxed font-sans font-normal text-[#3d453b] max-w-[320px]">
                Whether you're here to read or to write, there's a place for you at HatchPen.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2.5 min-[380px]:space-y-3">
              {/* Primary: Create account */}
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full h-[52px] min-[380px]:h-[56px] rounded-full flex items-center justify-center bg-[#d35427] hover:bg-[#be481e] text-white font-sans font-medium text-[16px] min-[380px]:text-[16.5px] shadow-[0_8px_24px_rgba(211,84,39,0.32)] active:scale-[0.99] transition-all cursor-pointer group"
              >
                <span className="mr-2">Create your account</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Secondary: Learn more */}
              <button
                type="button"
                onClick={() => navigate({ to: '/discover' })}
                className="w-full h-[50px] min-[380px]:h-[54px] rounded-full flex items-center justify-center bg-[#f0ece2] hover:bg-[#e8e2d4] border border-[#dfd9cb] text-[#2d332a] font-sans font-medium text-[15px] min-[380px]:text-[15.5px] active:scale-[0.99] transition-all cursor-pointer"
              >
                Learn more
              </button>
            </div>
          </section>

          {/* Bottom Pagination Indicator */}
          <footer className="relative z-20 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] w-full flex justify-center items-center shrink-0">
            <div className="flex items-center space-x-3 text-xs tracking-wider font-semibold text-[#5a554e]" aria-label="Story Slide Navigation">
              <button
                type="button"
                onClick={() => goToSlide(0)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                01
              </button>
              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                02
              </button>
              <button
                type="button"
                onClick={() => goToSlide(2)}
                className="text-[#8e877e] hover:text-[#1a1918] transition-colors cursor-pointer pb-1 bg-transparent border-0"
              >
                03
              </button>
              <span className="text-stone-400 font-light text-[11px] pb-1">|</span>
              <div className="flex flex-col items-center">
                <span className="text-[#1a1918] font-bold">04</span>
                <span className="w-3.5 h-[1.5px] bg-[#d35427] mt-0.5 rounded-full" />
              </div>
            </div>
          </footer>
        </div>
      )}
    </motion.div>
  </AnimatePresence>

      {/* =====================================================================
          MOBILE DRAWER / MENU
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
              transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 28, stiffness: 280 }}
              className="w-full bg-[#1C1D21] border-t border-neutral-800 rounded-t-3xl p-6 space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <HatchpenLogo size="xs" variant="inverted" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">Menu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
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
