import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Button,
  Badge,
  AnimatedTabs,
  CardAccordion,
  TactileSlider,
  PaletteSearch,
  Modal,
  Drawer,
  ExpandableProfile,
  FilterDisclosure,
  AnimatedSearch,
  OmniSearch,
  CardSwipe,
  RevealingCards,
  WigglingCards,
  ActivitiesCard,
  TactileProfileCard,
  ExpandableEventCard,
  MetricProgressCard,
  MeetingCard,
  DeploymentCard,
  UnisexAvatar,
  UnisexAvatarIcon,
} from '../design-system'
import DesignSystemSidebar from '../components/DesignSystemSidebar'
import { cn } from '../lib/utils'
import {
  Sparkles,
  BookOpen,
  Search,
  Sliders,
  Layers,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  Bookmark,
  Share2,
} from 'lucide-react'

export const Route = createFileRoute('/design-system')({
  component: DesignSystemShowcasePage,
})

function DesignSystemShowcasePage() {
  // Activities Card Mode State
  const [activitiesMode, setActivitiesMode] = useState<'popover' | 'inline' | 'drawer'>('popover')

  // Mobile Nav State
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Tabs State
  const [activeTab, setActiveTab] = useState('all')

  // Slider State
  const [fontSize, setFontSize] = useState(18)
  const [readingWidth, setReadingWidth] = useState(680)

  // Palette Search State
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Button Loading State
  const [btnLoading, setBtnLoading] = useState(false)

  // Follow author state
  const [followed, setFollowed] = useState(false)

  // Filter Disclosure State
  const [filterSelection, setFilterSelection] = useState('fiction')

  // Animated Search States
  const [searchExpandable, setSearchExpandable] = useState('')
  const [searchSpotlight, setSearchSpotlight] = useState('')
  const [searchPill, setSearchPill] = useState('')
  const [searchMinimal, setSearchMinimal] = useState('')
  const [searchSplit, setSearchSplit] = useState('')
  const [splitScope, setSplitScope] = useState('all')
  const [searchTypewriter, setSearchTypewriter] = useState('')
  const [searchCurtain, setSearchCurtain] = useState('')

  // OmniSearch State
  const [omniFixedQuery, setOmniFixedQuery] = useState('')
  const [omniFixedScope, setOmniFixedScope] = useState('all')
  const [omniRespQuery, setOmniRespQuery] = useState('')

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const headerOffset = 84
      const elementPosition = el.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-8">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-2">
          <Sparkles className="h-4 w-4" />
          <span>Relay Stories • Component Architecture</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[var(--ink-primary)]">
          Design System & Animated Primitives
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          A modular, cohesive library of tactile, spring-animated UI components built on 
          <strong> React 19</strong>, <strong>Motion</strong>, and <strong>Watermelon UI</strong>, 
          strictly adhering to the <strong>Monochrome Executive & Literary</strong> design standards.
        </p>
      </div>

      {/* Mobile Sticky Quick Navigation Bar */}
      <div className="lg:hidden sticky top-14 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-y border-[var(--border-subtle)] flex items-center justify-between gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono font-medium text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-colors shadow-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Architecture Index</span>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => scrollToSection('sec-buttons')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Buttons
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-tabs')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Tabs
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-omnisearch')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-cards-suite')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Cards
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Sticky Side Navigation (lg:col-span-3) + Content (lg:col-span-9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Desktop Sticky Side Nav */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 z-20">
          <DesignSystemSidebar />
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-9 space-y-16 min-w-0">
          {/* SECTION 1: BUTTONS */}
          <section id="sec-buttons" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Buttons & Interactive Taps
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Spring scale on click</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Button variant="primary" leftIcon={<BookOpen className="h-4 w-4" />}>
            Primary Action
          </Button>

          <Button variant="secondary" leftIcon={<Bookmark className="h-4 w-4" />}>
            Secondary Action
          </Button>

          <Button variant="outline" rightIcon={<Share2 className="h-4 w-4" />}>
            Outline Action
          </Button>

          <Button variant="ghost">Ghost Button</Button>

          <Button variant="danger">Destructive</Button>

          <Button
            variant="primary"
            isLoading={btnLoading}
            onClick={() => {
              setBtnLoading(true)
              setTimeout(() => setBtnLoading(false), 1500)
            }}
          >
            {btnLoading ? 'Publishing...' : 'Click for Loading State'}
          </Button>
        </div>
      </section>

      {/* SECTION 2: BADGES & STATUSES */}
      <section id="sec-badges" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Badges & Status Chips
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Badge variant="default">Editorial</Badge>
          <Badge variant="ongoing">Ongoing (Serialized)</Badge>
          <Badge variant="completed">Completed</Badge>
          <Badge variant="draft">Draft Mode</Badge>
          <Badge variant="subtle">Chapter 18</Badge>
          <Badge variant="outline">Poetry • 12k Words</Badge>
        </div>
      </section>

      {/* SECTION 3: ANIMATED TABS (WATERMELON CONTINUOUS TABS) */}
      <section id="sec-tabs" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Liquid Animated Tabs
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Continuous Tabs</span>
        </div>
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <AnimatedTabs
            activeId={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'all', label: 'All Manuscripts', badge: 148 },
              { id: 'trending', label: 'Trending', badge: 24 },
              { id: 'rising', label: 'New & Rising' },
              { id: 'recent', label: 'Recently Updated' },
              { id: 'completed', label: 'Completed Works' },
            ]}
          />
          <p className="text-xs font-mono text-[var(--ink-muted)]">
            Current active selection: <strong className="text-[var(--ink-primary)]">{activeTab}</strong>
          </p>
        </div>
      </section>

      {/* SECTION 4: CARD ACCORDION (WATERMELON SPLIT ACCORDION) */}
      <section id="sec-accordion" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Split Card Accordion
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Card Split Accordion</span>
        </div>
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <CardAccordion
            defaultOpenId="c1"
            items={[
              {
                id: 'c1',
                title: '01. The Arrival at Sector 9',
                subtitle: 'Published • 3,420 words • 12 min read',
                badge: 'Chapter 01',
                content: (
                  <p>
                    The drizzle clung to the asphalt outside Station Seven like silver dust. Julian tightened his trench coat and double-checked the coordinates encoded into his mechanical pocket watch. The contact had promised a key, but in this district, keys were rarely meant for doors.
                  </p>
                ),
              },
              {
                id: 'c2',
                title: '02. Transcripts of the Protocol',
                subtitle: 'Published • 2,890 words • 9 min read',
                badge: 'Chapter 02',
                content: (
                  <p>
                    Within the archive vault, thirty-six copper reels rotated in silent synchrony. Every syllable uttered across the metropolitan exchange was inscribed into micro-film. He touched the third cylinder and felt the heat of recent transcription.
                  </p>
                ),
              },
              {
                id: 'c3',
                title: '03. The Blackout Cipher',
                subtitle: 'Draft • 4,110 words • In Review',
                badge: 'Draft',
                content: (
                  <p>
                    When power severed across the fifth ring, the sound was not explosive, but a sudden, terrifying absence of hum. The digital library went dark, leaving only paper, ink, and the memory of what had been promised.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* SECTION 5: TACTILE SLIDERS (WATERMELON ADAPTIVE SLIDER) */}
      <section id="sec-sliders" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Tactile Sliders
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Adaptive Slider</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <TactileSlider
            label="Reading Typography Font Size"
            min={14}
            max={32}
            step={1}
            unit="px"
            value={fontSize}
            onChange={setFontSize}
          />

          <TactileSlider
            label="Column Reading Width"
            min={480}
            max={960}
            step={20}
            unit="px"
            value={readingWidth}
            onChange={setReadingWidth}
          />
        </div>
      </section>

      {/* SECTION 6: COMMAND SEARCH (WATERMELON COMMAND SEARCH) */}
      <section id="sec-command" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Command Search Palette
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Command Search</span>
        </div>
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">
              Quick Command Palette (`Cmd + K`)
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Instant keyboard navigation across manuscripts, authors, tags, and settings.
            </p>
          </div>
          <Button
            variant="outline"
            leftIcon={<Search className="h-4 w-4" />}
            onClick={() => setPaletteOpen(true)}
          >
            Open Palette <kbd className="ml-2 font-mono text-[10px] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">⌘K</kbd>
          </Button>
        </div>
      </section>

      {/* SECTION 7: MODAL & DRAWER DIALOGS */}
      <section id="sec-overlays" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Animated Overlays & Drawers
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Animated Modal
          </Button>

          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Open Slide-Over Drawer
          </Button>
        </div>
      </section>

      {/* SECTION 8: EXPANDABLE AUTHOR DOSSIER */}
      <section id="sec-author-dossier" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Expandable Author Dossier
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Expandable Card</span>
        </div>
        <div className="max-w-md">
          <ExpandableProfile
            author={{
              id: 'a1',
              name: 'Elena Vance',
              handle: 'elenavance',
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
              bio: 'Speculative noir fiction novelist and essayist exploring post-industrial archives and high-finance intrigue.',
              worksCount: 4,
              followersCount: 14200,
              lifetimeReads: '184k',
              tags: ['Noir', 'Cyberpunk', 'Institutional Fiction'],
            }}
            isFollowed={followed}
            onToggleFollow={() => setFollowed(!followed)}
          />
        </div>
      </section>

      {/* SECTION 9: FILTER DISCLOSURE (WATERMELON EXPANDING FILTER) */}
      <section id="sec-filter" className="scroll-mt-24 space-y-4">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Expanding Filter Disclosure
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Watermelon Filter Disclosure</span>
        </div>
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-6 min-h-[160px]">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">
              Morphing Filter Pill & Selection Menu
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5 max-w-md">
              A tactile filter button that morphs into a vertically stacked selection drawer with staggered entry and active checkmark springs.
            </p>
            <p className="text-xs font-mono text-[var(--ink-muted)] mt-2">
              Current filter: <strong className="text-[var(--ink-primary)]">{filterSelection}</strong>
            </p>
          </div>

          <div className="relative">
            <FilterDisclosure
              label="Select Genre / Category"
              activeId={filterSelection}
              onChange={setFilterSelection}
              items={[
                { id: 'all', label: 'All Manuscripts', badge: '148' },
                { id: 'fiction', label: 'Serialized Fiction', badge: '54' },
                { id: 'essays', label: 'Critical Essays', badge: '28' },
                { id: 'poetry', label: 'Poetry Folios', badge: '19' },
                { id: 'scripts', label: 'Screenplays & Scripts', badge: '12' },
                { id: 'memoir', label: 'Personal Narratives', badge: '35' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* SECTION 10: ANIMATED SEARCH (4 VARIANTS) */}
      <section id="sec-search-variants" className="scroll-mt-24 space-y-6">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Animated Search Components
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Tactile, spring-physics search components designed for toolbars, hero headers, and reading archives.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--ink-muted)]">7 Animated Variants</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Variant 1: Expandable Pill */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                1. Expandable Capsule
              </span>
              <kbd className="font-mono text-[10px] text-[var(--ink-muted)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded">
                Press [/]
              </kbd>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Starts as a compact trigger pill and smoothly springs open horizontally on click or shortcut key press.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="expandable"
                placeholder="Search catalog..."
                value={searchExpandable}
                onChange={setSearchExpandable}
                shortcut="/"
              />
            </div>
            {searchExpandable && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Query: <span className="text-[var(--ink-primary)] font-semibold">{searchExpandable}</span>
              </p>
            )}
          </div>

          {/* Variant 2: Docked Pill */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                2. Docked Capsule Pill
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">Fixed Width</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Persistent pill with micro-scale on focus, clear button, and live count indicator.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="pill"
                placeholder="Search manuscripts..."
                value={searchPill}
                onChange={setSearchPill}
                resultsCount={searchPill ? 14 : undefined}
                shortcut="⌘F"
              />
            </div>
            {searchPill && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Query: <span className="text-[var(--ink-primary)] font-semibold">{searchPill}</span>
              </p>
            )}
          </div>

          {/* Variant 3: Spotlight Island */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                3. Spotlight Island
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">Elevated Depth</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Floating island with shadow elevation, optional category scope tag, and active ring spring.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="spotlight"
                badge="All Genres"
                placeholder="Search authors, tags, and chapters..."
                value={searchSpotlight}
                onChange={setSearchSpotlight}
                resultsCount={searchSpotlight ? 8 : undefined}
              />
            </div>
            {searchSpotlight && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Query: <span className="text-[var(--ink-primary)] font-semibold">{searchSpotlight}</span>
              </p>
            )}
          </div>

          {/* Variant 4: Minimal Underline */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                4. Minimalist Underline
              </span>
              <span className="font-mono text-xs italic font-serif text-[var(--ink-muted)]">Newsreader</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Understated literary underline with an animated horizontal border that expands outward on focus.
            </p>
            <div className="pt-4">
              <AnimatedSearch
                variant="minimal"
                placeholder="Type title or theme..."
                value={searchMinimal}
                onChange={setSearchMinimal}
                shortcut="/"
              />
            </div>
            {searchMinimal && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Query: <span className="text-[var(--ink-primary)] font-semibold">{searchMinimal}</span>
              </p>
            )}
          </div>

          {/* Variant 5: Split-Pill Compound Search */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                5. Split-Pill Compound Scope
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">Multi-Segment</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Segmented capsule combining an animated search input with an integrated scope dropdown filter.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="split-pill"
                placeholder="Query in scope..."
                value={searchSplit}
                onChange={setSearchSplit}
                activeScope={splitScope}
                onScopeChange={setSplitScope}
                scopes={[
                  { id: 'all', label: 'All Catalog' },
                  { id: 'novels', label: 'Novels' },
                  { id: 'essays', label: 'Essays' },
                  { id: 'authors', label: 'Writers' },
                ]}
              />
            </div>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Scope: <span className="text-[var(--ink-primary)] font-semibold">{splitScope}</span>
              {searchSplit && <> • Query: <span className="text-[var(--ink-primary)] font-semibold">{searchSplit}</span></>}
            </p>
          </div>

          {/* Variant 6: Typewriter Ghost Cycle */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                6. Typewriter Ghost Cycle
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">Editorial Caret</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Types and deletes curated literary titles with a blinking monospace caret. Halts automatically on focus.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="typewriter"
                value={searchTypewriter}
                onChange={setSearchTypewriter}
                shortcut="/"
                placeholders={[
                  "Search 'The Silent Meridian'...",
                  "Search 'An Inventory of Baltic Fog'...",
                  "Search 'Elena Rostova'...",
                  "Search 'Station Nine cold war'...",
                ]}
              />
            </div>
            {searchTypewriter && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Query: <span className="text-[var(--ink-primary)] font-semibold">{searchTypewriter}</span>
              </p>
            )}
          </div>

          {/* Variant 7: Curtain-Reveal Quick Jump */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                7. Curtain-Reveal Quick Jump
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">Spring Drawer</span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Focusing the search bar reveals an animated quick query curtain with spring-tapped editorial suggestions.
            </p>
            <div className="pt-2">
              <AnimatedSearch
                variant="curtain-reveal"
                placeholder="Click to reveal quick editorial queries..."
                value={searchCurtain}
                onChange={setSearchCurtain}
                suggestions={[
                  '✨ Editor’s Picks',
                  '📖 Serialized Novels',
                  '✍️ Elena Rostova',
                  '🏔️ Nordic Noir',
                  '☕ 15-Min Reads',
                  '📜 Archival Essays',
                ]}
              />
            </div>
            {searchCurtain && (
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Active Query: <span className="text-[var(--ink-primary)] font-semibold">{searchCurtain}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 11: OMNISEARCH (EXPANDABLE ICON WITH COMPOUND SCOPES & TYPEWRITER GHOST) */}
      <section id="sec-omnisearch" className="scroll-mt-24 space-y-6">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              OmniSearch Component
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Rest state renders as an unobtrusive simple icon button. On click or keyboard trigger (<kbd className="font-mono bg-[var(--bg-subtle)] px-1 py-0.5 rounded border border-[var(--border-subtle)]">/</kbd>), it expands seamlessly with spring physics into either a fixed-width capsule or a responsive full-width container, featuring an optional compound scope dropdown partition and continuous typewriter ghost query cycle.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--ink-muted)] whitespace-nowrap">
            Interactive OmniSearch Sandbox
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Showcase 1: Fixed Width + Compound Scopes + Typewriter Ghost */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Fixed Width with Compound Scopes
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                expandMode="fixed"
              </span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Expands from an icon button to a fixed-width capsule (<code className="font-mono text-[11px]">w-72 sm:w-84</code>) featuring a split-pill compound scope dropdown and typewriter ghost cycle.
            </p>
            <div className="pt-2 flex items-center justify-between border-y border-[var(--border-subtle)]/50 py-4">
              <span className="font-mono text-xs text-[var(--ink-muted)]">Click icon to expand:</span>
              <OmniSearch
                expandMode="fixed"
                size="md"
                value={omniFixedQuery}
                onChange={setOmniFixedQuery}
                scopes={[
                  { id: 'all', label: 'All Library' },
                  { id: 'novels', label: 'Novels' },
                  { id: 'essays', label: 'Essays' },
                  { id: 'poetry', label: 'Poetry' },
                  { id: 'authors', label: 'Authors' },
                ]}
                activeScope={omniFixedScope}
                onScopeChange={setOmniFixedScope}
                shortcut="/"
                placeholders={[
                  "Search 'The Cold Perimeter'...",
                  "Search 'Elena Vance'...",
                  "Search 'Nordic Noir essays'...",
                  "Search 'Chronicles of Kyoto'...",
                ]}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
              <span>Active Scope: <strong className="text-[var(--ink-primary)] uppercase">{omniFixedScope}</strong></span>
              <span>Query: <strong className="text-[var(--ink-primary)]">{omniFixedQuery || '(none)'}</strong></span>
            </div>
          </div>

          {/* Showcase 2: Responsive Full-Width + No Scopes + Typewriter Ghost */}
          <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Responsive Expansion (No Scopes)
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                expandMode="responsive"
              </span>
            </div>
            <p className="text-xs text-[var(--ink-secondary)]">
              Expands from a single icon button to occupy the entire available width of its parent container, with search icon on the left and typewriter ghost placeholder cycle.
            </p>
            <div className="pt-2 border-y border-[var(--border-subtle)]/50 py-4 flex items-center justify-between gap-4">
              <span className="font-mono text-xs text-[var(--ink-muted)] whitespace-nowrap">Header Bar:</span>
              <OmniSearch
                expandMode="responsive"
                size="md"
                value={omniRespQuery}
                onChange={setOmniRespQuery}
                shortcut="k"
                placeholders={[
                  "Inquire across entire bibliography...",
                  "Type a literary theme or author...",
                  "Search 'Baltic telemetry'...",
                ]}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
              <span>Responsive Behavior: <strong>100% Flex Width</strong></span>
              <span>Query: <strong className="text-[var(--ink-primary)]">{omniRespQuery || '(none)'}</strong></span>
            </div>
          </div>

        </div>

        {/* Sizes row */}
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Scale & Size Spectrum (sm, md, lg)
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
              Tactile Sizing
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--ink-muted)]">sm:</span>
              <OmniSearch
                size="sm"
                placeholders={["Find chapter...", "Search..."]}
                scopes={[
                  { id: 'all', label: 'All' },
                  { id: 'ch', label: 'Chapters' },
                ]}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--ink-muted)]">md:</span>
              <OmniSearch
                size="md"
                placeholders={["Search manuscripts...", "Inquire..."]}
                scopes={[
                  { id: 'all', label: 'All' },
                  { id: 'works', label: 'Works' },
                ]}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--ink-muted)]">lg:</span>
              <OmniSearch
                size="lg"
                placeholders={["Hero search inquiry...", "Type title or author..."]}
                scopes={[
                  { id: 'all', label: 'All' },
                  { id: 'works', label: 'Works' },
                  { id: 'authors', label: 'Authors' },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 12: WATERMELON UI CARD SUITE */}
      <section id="sec-cards-suite" className="scroll-mt-24 space-y-8 pt-8 border-t border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] pb-3 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
              Watermelon UI Card Suite
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              High-fidelity interactive card components built with React 19, Motion spring dynamics, and architectural monochrome styling.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--ink-muted)] border border-[var(--border-subtle)] rounded px-2 py-0.5 bg-[var(--bg-surface)]">
            Watermelon Components
          </span>
        </div>

        {/* 1. Card Swipe 3D Carousel */}
        <div id="card-swipe" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              1. 3D Gestural Card Swipe Carousel
            </h3>
            <span className="font-mono text-[11px] text-[var(--ink-faint)]">CardSwipe</span>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Drag left or right to swipe through cards with dynamic 3D <code className="font-mono bg-[var(--bg-subtle)] px-1 py-0.5 rounded text-[11px]">rotateY</code> transforms and spring momentum.
          </p>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 sm:p-6">
            <CardSwipe />
          </div>
        </div>

        {/* 2 & 3: Revealing Cards & Wiggling Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Revealing Stack Cards */}
          <div id="card-revealing" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                2. Stacked Revealing Cards
              </h3>
              <span className="font-mono text-[11px] text-[var(--ink-faint)]">RevealingCards</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Flick or drag the top card beyond the threshold to send it to the back of the deck with depth scaling.
            </p>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex items-center justify-center min-h-[380px]">
              <RevealingCards />
            </div>
          </div>

          {/* Wiggling Cards */}
          <div id="card-wiggling" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                3. Tactile Tilt & Blur Cards
              </h3>
              <span className="font-mono text-[11px] text-[var(--ink-faint)]">WigglingCards</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Dynamic distance-based rotation tilt and depth-of-field blur as the user navigates metrics.
            </p>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
              <WigglingCards />
            </div>
          </div>
        </div>

        {/* 4 & 5: Activities Card & Tactile Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Activities Card */}
          <div id="card-activities" className="scroll-mt-24 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                4. Expandable Activity Ledger Card
              </h3>
              <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-[10px] font-mono self-start sm:self-auto">
                {(['popover', 'inline', 'drawer'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActivitiesMode(mode)}
                    className={cn(
                      'px-2 py-0.5 rounded capitalize transition-colors',
                      activitiesMode === mode
                        ? 'bg-[var(--bg-surface)] text-[var(--ink-primary)] font-semibold shadow-xs'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                    )}
                  >
                    {mode === 'popover' ? 'Popover (No Shift)' : mode}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Tactile ledger card with 3 display modes: floating <strong>Popover</strong> (zero lower content shift), <strong>Drawer</strong> (side sheet), or <strong>Inline</strong> (accordion).
            </p>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex justify-center">
              <ActivitiesCard displayMode={activitiesMode} className="w-full max-w-sm" />
            </div>
          </div>

          {/* Tactile Profile Card */}
          <div id="card-profile" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                5. Author Profile with Sparkline
              </h3>
              <span className="font-mono text-[11px] text-[var(--ink-faint)]">TactileProfileCard</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Author overview card with inline SVG activity sparkline, verified badge, and expandable metrics drawer.
            </p>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex justify-center">
              <TactileProfileCard
                profile={{
                  name: 'Dr. Julian Thorne',
                  handle: 'julianthorne',
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
                  bio: 'Investigative essayist and historian documenting maritime architecture, cold-war communications, and state archives.',
                  location: 'Stockholm, Sweden',
                  website: 'julianthorne.com',
                  readsScore: 98,
                  followersCount: '28.4k',
                  worksCount: 7,
                  categories: ['Historical Fiction', 'Essays', 'Nordic Noir'],
                }}
              />
            </div>
          </div>
        </div>

        {/* 6, 7 & 8: Expandable Event, Metric Progress & Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Expandable Event Card */}
          <div id="card-expandable" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                6. FLIP Shared-Layout Modal Card
              </h3>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Click to open shared-layout modal with zero page pop or unmount lag.
            </p>
            <ExpandableEventCard
              id="salon-1"
              title="Midnight Salon: The Baltic Meridian"
              subtitle="Live Reading & Pacing Analysis"
              description="Join verified author Elena Rostova and fellow readers for an intimate live analysis of serialized chapter pacing, tension, and narrative reveals."
              imageSrc="https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80"
              date="Thursday, Nov 12"
              time="20:00 UTC"
            />
          </div>

          {/* Metric Progress Card */}
          <div id="card-progress" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                7. Segmented Arc Metric Card
              </h3>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Reading quota visualizer with 40-segment capacity gauge and export button.
            </p>
            <MetricProgressCard />
          </div>

          {/* Meeting / Salon Card */}
          <div id="card-meeting" className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                8. Literary Salon Session Card
              </h3>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              Roundtable session card with stacked participant avatars and expandable agenda.
            </p>
            <MeetingCard />
          </div>
        </div>

        {/* 9. Deployment Pipeline Card */}
        <div id="card-deployment" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              9. Synchronized Publishing Pipeline Card
            </h3>
            <span className="font-mono text-[11px] text-[var(--ink-faint)]">DeploymentCard</span>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            Folio distribution status with live pipeline stages, environment indicators, and animated terminal logs.
          </p>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 flex justify-center">
            <DeploymentCard />
          </div>
        </div>

      </section>

      {/* SECTION 18: UNISEX AVATAR & ICON SUITE */}
      <section id="sec-avatar" className="scroll-mt-24 space-y-6">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Unisex Avatar & Icon Suite
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Core Asset • Editorial Minimal</span>
        </div>
        <p className="text-xs text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          Clean, gender-neutral vector avatar silhouette tailored for the Tellnest monochrome design system. Automatically provides fallback rendering when profile pictures are absent or loading.
        </p>

        {/* Size Spectrum Showcase */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Size Hierarchy (Circular & Rounded)
            </h3>
            <span className="font-mono text-[10px] text-[var(--ink-faint)]">xs • sm • md • lg • xl • 2xl • 3xl</span>
          </div>

          <div className="flex flex-wrap items-end gap-6 pt-2">
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="xs" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">xs (20px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="sm" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">sm (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="md" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">md (40px)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="lg" showStatus statusColor="bg-emerald-500" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">lg + status</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="xl" shape="rounded" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">xl (rounded)</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <UnisexAvatar size="2xl" showStatus statusColor="bg-amber-500" />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">2xl (80px)</span>
            </div>
          </div>
        </div>

        {/* Standalone SVG Icon Preview */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Standalone Unisex Avatar Vector Icon
            </h3>
            <span className="font-mono text-[10px] text-[var(--ink-faint)]">&lt;UnisexAvatarIcon /&gt;</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-16 w-16">
              <UnisexAvatarIcon />
            </div>
            <div className="space-y-1 text-xs text-[var(--ink-muted)]">
              <p className="font-medium text-[var(--ink-primary)]">Asset Path: <code className="font-mono text-[11px] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">/unisex-avatar.svg</code></p>
              <p>Scalable, zero-dependency SVG with adaptive <code className="font-mono text-[11px]">var(--bg-subtle)</code> fill and <code className="font-mono text-[11px]">var(--ink-muted)</code> geometry.</p>
            </div>
          </div>
        </div>
      </section>
        </main>
      </div>

      {/* Mobile Architecture Index Drawer */}
      <Drawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        side="left"
        title="Architecture Index"
      >
        <div className="p-1">
          <DesignSystemSidebar layoutIdPrefix="mobile" onSelect={() => setMobileNavOpen(false)} />
        </div>
      </Drawer>

      {/* Overlays Rendered in Portals */}
      <PaletteSearch
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Editorial Publication Notice"
        description="Review licensing terms prior to publishing Chapter 19."
      >
        <div className="space-y-4 text-xs text-[var(--ink-secondary)]">
          <p>
            By publishing this chapter, your manuscript becomes instantly accessible across the Relay digital library. Readers who have bookmarked your work will receive notifications in their Following feed.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm & Publish
            </Button>
          </div>
        </div>
      </Modal>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Manuscript Table of Contents"
      >
        <div className="space-y-3 text-xs">
          <p className="text-[var(--ink-muted)]">
            Quick jump to any published or draft chapter within this volume.
          </p>
          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div
                key={num}
                className="flex items-center justify-between p-3 hover:bg-[var(--bg-subtle)] cursor-pointer"
                onClick={() => setDrawerOpen(false)}
              >
                <span className="font-serif font-semibold text-[var(--ink-primary)]">
                  Chapter {String(num).padStart(2, '0')} — Section Protocol
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                  ~12 min
                </span>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

    </div>
  )
}
