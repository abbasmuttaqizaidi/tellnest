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
  DropdownSelect,
  MultiDropdownSelect,
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
  ContextualAIBar,
  FeedbackComponent,
  ExpandableProfileCard,
  OptionPicker,
  QuickSwitcher,
  Tags,
  TaskWidget,
  ContinuousPagination,
  CreateCommunity,
  CreateNewDisclosure,
  DiscreteTabs,
  Dock,
  EditProfile,
  EventReminders,
  ExtendedToolbar,
  FrequencySelector,
  FeatureTour,
  ListStack,
} from '../design-system'
import { HatchpenLogo, HatchpenEmblem } from '../components/HatchpenLogo'
import DesignSystemSidebar from '../components/DesignSystemSidebar'
import { StoryCard } from '../components/StoryCard'
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
  Music,
  Heart,
  MessageSquare,
  Terminal,
  RefreshCw,
  Compass,
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

  // Storybook state for new Interactive Studio Suite components
  const [storybookPage, setStorybookPage] = useState(1)
  const [storybookSwitcherMode, setStorybookSwitcherMode] = useState<'individual' | 'team'>('individual')
  const [storybookPickerVal, setStorybookPickerVal] = useState('serif')
  const [storybookTourStep, setStorybookTourStep] = useState(0)
  const [storybookFrequency, setStorybookFrequency] = useState('Weekly')

  // Storybook Studio Global Controls State
  const [storybookViewMode, setStorybookViewMode] = useState<'canvas' | 'docs'>('canvas')
  const [viewportMode, setViewportMode] = useState<'responsive' | 'desktop' | 'tablet' | 'mobile'>('responsive')
  const [gridOverlay, setGridOverlay] = useState(false)
  const [expandAllStories, setExpandAllStories] = useState(false)

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

  const getViewportClass = () => {
    switch (viewportMode) {
      case 'mobile':
        return 'max-w-[390px] mx-auto transition-all duration-300'
      case 'tablet':
        return 'max-w-[768px] mx-auto transition-all duration-300'
      case 'desktop':
        return 'max-w-[1024px] mx-auto transition-all duration-300'
      default:
        return 'w-full'
    }
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-[1536px] mx-auto space-y-6">
      
      {/* Storybook Global Navigation Header Bar */}
      <header className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Brand & Breadcrumbs */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)]">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-semibold">
                <Sparkles className="h-3.5 w-3.5" /> Storybook UI
              </span>
              <span>/</span>
              <span>Hatchpen Design System</span>
              <span>/</span>
              <span className="text-[var(--ink-primary)] font-medium">Stories & Architecture</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)] tracking-tight">
              Component Storybook & Primitives Explorer
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-2xl leading-relaxed">
              Living design system workbench: 19 interactive stories from <code>live_instructions.md</code>, Watermelon UI card dynamics, and editorial typography primitives.
            </p>
          </div>

          {/* Storybook Mode & Viewport Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-[var(--bg-canvas)] p-2 rounded-xl border border-[var(--border-subtle)] self-start lg:self-center">
            {/* Canvas vs Docs Toggle */}
            <div className="flex items-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setStorybookViewMode('canvas')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all',
                  storybookViewMode === 'canvas'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setStorybookViewMode('docs')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all',
                  storybookViewMode === 'docs'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-xs'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Docs</span>
              </button>
            </div>

            {/* Viewport Simulation Switcher */}
            <div className="hidden sm:flex items-center rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-0.5 text-xs font-mono text-[var(--ink-muted)]">
              <button
                type="button"
                title="100% Fluid Width"
                onClick={() => setViewportMode('responsive')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md transition-all',
                  viewportMode === 'responsive'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                    : 'hover:text-[var(--ink-primary)]'
                )}
              >
                Auto (100%)
              </button>
              <button
                type="button"
                title="Desktop Viewport (1024px)"
                onClick={() => setViewportMode('desktop')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md transition-all',
                  viewportMode === 'desktop'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                    : 'hover:text-[var(--ink-primary)]'
                )}
              >
                Desktop
              </button>
              <button
                type="button"
                title="Tablet Viewport (768px)"
                onClick={() => setViewportMode('tablet')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md transition-all',
                  viewportMode === 'tablet'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                    : 'hover:text-[var(--ink-primary)]'
                )}
              >
                Tablet
              </button>
              <button
                type="button"
                title="Mobile Viewport (390px)"
                onClick={() => setViewportMode('mobile')}
                className={cn(
                  'px-2.5 py-1.5 rounded-md transition-all',
                  viewportMode === 'mobile'
                    ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                    : 'hover:text-[var(--ink-primary)]'
                )}
              >
                Mobile
              </button>
            </div>

            {/* Grid & Expansion Utilities */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Toggle Storybook Alignment Grid"
                onClick={() => setGridOverlay(!gridOverlay)}
                className={cn(
                  'p-1.5 rounded-lg border text-xs font-mono transition-all',
                  gridOverlay
                    ? 'border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] font-bold'
                    : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                # Grid
              </button>
              <button
                type="button"
                title="Expand / Collapse Documentation Drawers"
                onClick={() => setExpandAllStories(!expandAllStories)}
                className={cn(
                  'p-1.5 rounded-lg border text-xs font-mono transition-all',
                  expandAllStories
                    ? 'border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] font-bold'
                    : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                )}
              >
                {expandAllStories ? 'Hide Docs' : 'Show All Specs'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Quick Navigation Bar */}
      <div className="lg:hidden sticky top-14 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 bg-[var(--bg-canvas)]/95 backdrop-blur-md border-y border-[var(--border-subtle)] flex items-center justify-between gap-3 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-mono font-medium text-[var(--ink-primary)] hover:border-[var(--ink-primary)] transition-colors shadow-xs"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Story Navigator</span>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => scrollToSection('sec-new-suite')}
            className="px-2.5 py-1 rounded bg-[var(--ink-primary)] text-[var(--accent-contrast)] whitespace-nowrap font-medium"
          >
            Studio Suite (18)
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-cards-suite')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Cards (9)
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-buttons')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Buttons
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('sec-omnisearch')}
            className="px-2.5 py-1 rounded bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Sticky Side Navigation (lg:col-span-3) + Content (lg:col-span-9) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Desktop Sticky Side Nav */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-20 z-20">
          <DesignSystemSidebar />
        </aside>

        {/* Main Content Area in Viewport Simulation Container */}
        <main className={cn(
          'lg:col-span-9 space-y-16 min-w-0 transition-all duration-300',
          getViewportClass(),
          gridOverlay && 'relative bg-[linear-gradient(to_right,rgba(128,128,128,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.06)_1px,transparent_1px)] bg-[size:24px_24px] p-4 rounded-2xl border border-dashed border-[var(--border-subtle)]'
        )}>
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

        {/* DropdownSelect Showcase */}
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">
              Clean Dropdown Select
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5 max-w-md">
              A standard, accessible dropdown select component built for forms, onboarding flows, and filter settings with keyboard navigation and spring transitions.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <DropdownSelect
              options={[
                { id: 'she_her', label: 'Female (she/her)' },
                { id: 'he_him', label: 'Male (he/him)' },
                { id: 'they_them', label: 'They / Them' },
                { id: 'prefer_not', label: 'I prefer not to say' },
                { id: 'any_all', label: 'Any / All Pronouns' },
              ]}
              defaultValue="she_her"
              placeholder="Select pronouns..."
            />
          </div>
        </div>

        {/* MultiDropdownSelect Showcase */}
        <div className="p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">
              Multi-Select Dropdown
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5 max-w-md">
              A tactile multi-selection dropdown component featuring removable selection badges, item checkboxes, and spring transitions.
            </p>
          </div>

          <div className="w-full sm:w-80">
            <MultiDropdownSelect
              options={[
                { id: 'fiction', label: 'Fiction' },
                { id: 'romance', label: 'Romance' },
                { id: 'fantasy', label: 'Fantasy' },
                { id: 'mystery', label: 'Mystery' },
                { id: 'scifi', label: 'Science Fiction' },
              ]}
              defaultValues={['fiction', 'fantasy']}
              placeholder="Select genres..."
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

      {/* SECTION: STORYBOOK INTERACTIVE STUDIO SUITE */}
      <section id="sec-new-suite" className="space-y-12 pt-8 border-t border-[var(--border-subtle)]">
        <div className="border-b border-[var(--border-subtle)] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] mb-1">
              <Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />
              <span>Storybook Studio Registry</span>
            </div>
            <h2 className="font-serif text-3xl font-semibold text-[var(--ink-primary)]">
              Interactive Studio Suite
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              18 isolated component stories specified in <code>live_instructions.md</code> with live canvas renderers, interactive state controls, and architectural usage guides.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-primary)] font-semibold">
            18 Live Stories
          </span>
        </div>

        {/* 1. Contextual AI Bar */}
        <StoryCard
          id="sec-ai-bar"
          title="Contextual AI Bar"
          componentName="ContextualAIBar"
          category="Editor Dock"
          badge="AI Ambient"
          description="Floating prose enhancement dock used in Writer Studio editor for inline rewrites, sensory expansion, and tone adaptation."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Writer Studio Editor (/write/editor/$workId/$chapterId)",
            workflow: "Floating prose enhancement dock at the bottom of the writing canvas. Allows authors to trigger inline literary rewrites, tone modulation, sensory imagery expansion, or soundtrack mood ambience without leaving the editor."
          }}
          codeSnippet={`<ContextualAIBar
  placeholder="Refine literary pacing, sensory imagery..."
  musicIcon={<Music className="h-4 w-4 text-[var(--ink-primary)]" />}
  sparkleIcon={<Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />}
  tools={[
    <Sparkles key="1" className="h-4 w-4" />,
    <Heart key="2" className="h-4 w-4" />,
    <MessageSquare key="3" className="h-4 w-4" />
  ]}
/>`}
        >
          <div className="w-full flex justify-center py-4">
            <ContextualAIBar
              placeholder="Refine literary pacing, sensory imagery, or prose style..."
              musicIcon={<Music className="h-4 w-4 text-[var(--ink-primary)]" />}
              sparkleIcon={<Sparkles className="h-4 w-4 text-[var(--ink-primary)]" />}
              tools={[
                <Sparkles key="1" className="h-4 w-4" />,
                <Heart key="2" className="h-4 w-4" />,
                <MessageSquare key="3" className="h-4 w-4" />
              ]}
            />
          </div>
        </StoryCard>

        {/* 2. Feedback Component */}
        <StoryCard
          id="sec-feedback"
          title="Feedback Sentiment Widget"
          componentName="FeedbackComponent"
          category="Critique & Reader"
          badge="Spring Micro-Feedback"
          description="End-of-chapter sentiment collector with animated thumb-up/down expansion for critique commentary."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Chapter Reader End-of-Chapter Ornament (/read/$workId/$chapterId)",
            workflow: "Positioned at the conclusion of a serialized chapter to capture instant reader sentiment (thumbs up/down with animated expansion for critique comments) and overall feedback to assist authors in revising drafts."
          }}
          codeSnippet={`<FeedbackComponent
  onSubmit={(data) => {
    console.log('Feedback submitted:', data.rating, data.feedback)
  }}
/>`}
        >
          <div className="py-2">
            <FeedbackComponent
              onSubmit={(data) => {
                alert(`Feedback submitted: ${data.rating} - "${data.feedback}"`)
              }}
            />
          </div>
        </StoryCard>

        {/* 3. Expandable Profile Card */}
        <StoryCard
          id="sec-expandable-profile"
          title="Expandable Profile Card"
          componentName="ExpandableProfileCard"
          category="Directory & Bio"
          badge="FLIP Shared Layout"
          description="Author and curator profile card with fluid FLIP expansion into full modal view with background, focus areas, and contact CTA."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Author Profile Directory (/discover) & Featured Curators",
            workflow: "Compact author cards that seamlessly expand into an interactive modal overlay using FLIP shared-layout animations to display the author's full background, notable manuscripts, and direct connection actions without navigating away from the catalog."
          }}
          codeSnippet={`<ExpandableProfileCard
  title="Elena Vance"
  subtitle="Investigative Novelist"
  imageSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000"
/>`}
        >
          <ExpandableProfileCard
            title="Elena Vance"
            subtitle="Investigative Novelist"
            imageSrc="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000"
          />
        </StoryCard>

        {/* 4. Quick Option Picker */}
        <StoryCard
          id="sec-option-picker"
          title="Quick Option Picker"
          componentName="OptionPicker"
          category="Settings & Controls"
          badge="Fluid Segment"
          description="Tactile segmented selection pill for typography styles, manuscript states, or reading layouts."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Reader Display Settings Drawer (/read) & Draft Publishing Modal",
            workflow: "Smooth tactile selector for single or multiple exclusive choices such as Reading Mode (Serif vs Inter vs Mono), Manuscript Status (Draft, In Review, Serialized), or Font Spacing."
          }}
          controls={
            <span>Active Selection: <strong className="text-[var(--ink-primary)]">{storybookPickerVal}</strong></span>
          }
          codeSnippet={`<OptionPicker
  options={[
    { id: 'serif', title: 'Newsreader Serif', count: 12 },
    { id: 'sans', title: 'Inter Clean', count: 8 },
    { id: 'mono', title: 'JetBrains Code', count: 4 },
  ]}
  defaultSelected="serif"
  onSelect={(opt) => setSelected(opt.id)}
/>`}
        >
          <OptionPicker
            options={[
              { id: 'serif', title: 'Newsreader Serif', count: 12 },
              { id: 'sans', title: 'Inter Clean', count: 8 },
              { id: 'mono', title: 'JetBrains Code', count: 4 },
            ]}
            defaultSelected="serif"
            onSelect={(opt) => setStorybookPickerVal(opt.id)}
          />
        </StoryCard>

        {/* 5. Quick Switcher */}
        <StoryCard
          id="sec-switcher"
          title="Quick Switcher"
          componentName="QuickSwitcher"
          category="Header & Navigation"
          badge="Continuous Pill"
          description="Sliding mode switcher for toggling between Reader Workspace and Writer Studio modes."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Main Navigation Bar / Header (Header.tsx) & Reader Header",
            workflow: "Instant mode toggle between 'Reader Mode' (distraction-free prose consumption) and 'Writer Studio' (manuscript drafts and editorial analytics), or switching between multiple literary pen-names."
          }}
          controls={
            <span>Active Scope: <strong className="text-[var(--ink-primary)] capitalize">{storybookSwitcherMode}</strong></span>
          }
          codeSnippet={`<QuickSwitcher
  initialMode="individual"
  onChange={(mode) => setMode(mode)}
/>`}
        >
          <QuickSwitcher
            initialMode={storybookSwitcherMode}
            onChange={(mode) => setStorybookSwitcherMode(mode)}
          />
        </StoryCard>

        {/* 6. Tags Component */}
        <StoryCard
          id="sec-tags"
          title="Interactive Tags"
          componentName="Tags"
          category="Inputs & Metadata"
          badge="Spring Tags"
          description="Interactive tag pills with fluid addition, deletion, and counter badges for catalog metadata and manuscript genres."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "New Manuscript Creation (/write/new) & Catalog Search Filters",
            workflow: "Interactive animated pill tags for categorizing literary works with genres, themes, and tropes with animated addition and deletion."
          }}
          codeSnippet={`<Tags
  initialTags={[
    { id: '1', label: 'Nordic Noir', count: 42 },
    { id: '2', label: 'Serialized Fiction', count: 18 },
    { id: '3', label: 'Historical Mystery', count: 27 },
  ]}
/>`}
        >
          <Tags
            initialTags={[
              { id: '1', label: 'Nordic Noir', count: 42 },
              { id: '2', label: 'Serialized Fiction', count: 18 },
              { id: '3', label: 'Historical Mystery', count: 27 },
              { id: '4', label: 'Literary Essays', count: 15 },
            ]}
          />
        </StoryCard>

        {/* 7. Task Widget Disclosure */}
        <StoryCard
          id="sec-task-widget"
          title="Task Widget Disclosure"
          componentName="TaskWidget"
          category="Editorial Dashboard"
          badge="Interactive Checklist"
          description="Expandable editorial progress widget tracking chapter deadlines, subtasks, and peer revisions with checkmarks."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Writer Studio Dashboard (/write) & Editorial Production Pipeline",
            workflow: "Expandable editorial progress card tracking chapter deadlines, developmental editing checklists, cover design reviews, and publication milestones with interactive completion checkmarks."
          }}
          codeSnippet={`<TaskWidget
  data={{
    title: 'Chapter 24 Final Developmental Review',
    progress: 75,
    completedCount: 3,
    totalCount: 4,
    status: 'In Progress',
    subtasks: [...]
  }}
/>`}
        >
          <TaskWidget
            data={{
              title: 'Chapter 24 Final Developmental Review',
              progress: 75,
              completedCount: 3,
              totalCount: 4,
              priority: 'Urgent',
              status: 'In Progress',
              subtasks: [
                { id: '1', title: 'Verify pacing in Act 2 climax', completed: true },
                { id: '2', title: 'Standardize character dialect footnotes', completed: true },
                { id: '3', title: 'Polish sensory drop cap opening', completed: true },
                { id: '4', title: 'Generate SVG chapter cover ornament', completed: false },
              ],
              assignees: [
                { name: 'Elena Rostova', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', color: 'bg-emerald-500' },
                { name: 'Julian Thorne', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', color: 'bg-indigo-500' },
              ]
            }}
          />
        </StoryCard>

        {/* 8. Continuous Pagination */}
        <StoryCard
          id="sec-pagination"
          title="Continuous Pagination"
          componentName="ContinuousPagination"
          category="Reading Navigation"
          badge="Tactile Spring"
          description="Tactile spring pagination buttons with hover elevation and spring scale transitions for long multi-chapter novels."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Serialized Chapter Browser (/works/$workId) & Reading Library",
            workflow: "High-fidelity tactile page switcher with spring animations, providing smooth linear jumping across long multi-volume serialized novels."
          }}
          controls={
            <span>Page Range: <strong>1 .. 7</strong></span>
          }
          codeSnippet={`<ContinuousPagination
  totalPages={7}
  defaultPage={1}
/>`}
        >
          <ContinuousPagination
            totalPages={7}
            defaultPage={storybookPage}
          />
        </StoryCard>

        {/* 9. Create Community */}
        <StoryCard
          id="sec-create-community"
          title="Create Community Modal Card"
          componentName="CreateCommunity"
          category="Book Clubs & Circles"
          badge="Social Guild"
          description="Interactive dialog to establish literary salons, reading circles, and critique guilds."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Reader Book Clubs & Literary Salons Hub (/community or Salon Drawer)",
            workflow: "Guided modal card allowing readers and authors to establish private or public literary reading circles, shared manuscript review circles, or genre-specific book clubs."
          }}
          codeSnippet={`<CreateCommunity />`}
        >
          <CreateCommunity />
        </StoryCard>

        {/* 10. Create New Disclosure */}
        <StoryCard
          id="sec-create-disclosure"
          title="Create New Action Disclosure"
          componentName="CreateNewDisclosure"
          category="Global Actions"
          badge="Spring Grid"
          description="Spring-animated expanding quick action menu for 1-click creation of manuscripts, essays, and salons."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Global Header Action Hub (Header.tsx) & Writer Dashboard (/write)",
            workflow: "Spring-animated expandable grid menu providing 1-click creation shortcuts: 'New Serial Manuscript', 'Draft Essay', 'Schedule Event/Salon', or 'Open Reading Circle'."
          }}
          codeSnippet={`<CreateNewDisclosure />`}
        >
          <CreateNewDisclosure />
        </StoryCard>

        {/* 11. Discrete Tabs */}
        <StoryCard
          id="sec-discrete-tabs"
          title="Discrete Tabs"
          componentName="DiscreteTabs"
          category="Navigation & Views"
          badge="Sliding Indicator"
          description="Sliding-pill tab switcher with smooth indicator transitions for user profile sub-views and author folios."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "User Profile (/profile) & Author Page (/author/$authorId)",
            workflow: "Sleek sliding-pill tab switcher for cleanly toggling between user sub-views, manuscript drafts vs published works, and reading metrics."
          }}
          codeSnippet={`<DiscreteTabs />`}
        >
          <DiscreteTabs />
        </StoryCard>

        {/* 12. Dock Component */}
        <StoryCard
          id="sec-dock"
          title="Dock Utility Component"
          componentName="Dock"
          category="Floating Utilities"
          badge="macOS Magnification"
          description="macOS-style magnification dock for reader utilities, search, and navigation with proximity spring scaling."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Desktop / Tablet Screen Edge and Reader Canvas Floating Utility",
            workflow: "macOS-style magnification dock fixed to the bottom or side of the screen providing instant access to Search, Reading Library, Writer Studio, Notifications, and Settings with physical cursor proximity magnification."
          }}
          codeSnippet={`<Dock />`}
        >
          <div className="py-6">
            <Dock />
          </div>
        </StoryCard>

        {/* 13. Edit Profile */}
        <StoryCard
          id="sec-edit-profile"
          title="Edit Profile Card"
          componentName="EditProfile"
          category="Account & Onboarding"
          badge="Form Card"
          description="Profile and onboarding form interface for updating pen name, handle, avatar, pronouns, and bio statement."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Profile Settings & Onboarding Step 1 (/settings, /profile, New User Modal)",
            workflow: "Card interface for updating user handle, pen name, avatar photo, pronouns, biographical statement, and social portfolio links."
          }}
          codeSnippet={`<EditProfile
  initialData={{
    name: 'Julian Thorne',
    role: 'Historical Essayist',
    bio: 'Documenting Cold-War maritime communication infrastructure...',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
  }}
/>`}
        >
          <EditProfile
            initialData={{
              name: 'Julian Thorne',
              role: 'Historical Essayist',
              bio: 'Documenting Cold-War maritime communication infrastructure and Northern Baltic archives.',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
            }}
          />
        </StoryCard>

        {/* 14. Event Reminders */}
        <StoryCard
          id="sec-event-reminders"
          title="Event Reminders"
          componentName="EventReminders"
          category="Scheduler & Alerts"
          badge="Release Countdown"
          description="Allows authors to schedule upcoming release alerts and live literary reading salon reminders for readers."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Author Manuscript Release Scheduler (/write/manage/$workId) & Upcoming Salons",
            workflow: "Allows authors to schedule and configure automated release notifications and countdown reminders for upcoming chapter drops or live reading salons."
          }}
          codeSnippet={`<EventReminders />`}
        >
          <EventReminders />
        </StoryCard>

        {/* 15. Extended Toolbar */}
        <StoryCard
          id="sec-extended-toolbar"
          title="Extended Toolbar"
          componentName="ExtendedToolbar"
          category="Mobile Ergonomics"
          badge="Bottom Navigation"
          description="Multi-segment tactile action bar designed for mobile screen navigation and one-thumb reading utilities."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Mobile View Bottom / Top Navigation (MobileNav.tsx) and Mobile Reader Controls",
            workflow: "Multi-segment tactile action bar designed specifically for mobile ergonomics, providing one-thumb access to chapter drawer, font size adjustments, bookmarks, search, and navigation."
          }}
          codeSnippet={`<ExtendedToolbar />`}
        >
          <ExtendedToolbar />
        </StoryCard>

        {/* 16. Frequency Selector */}
        <StoryCard
          id="sec-frequency"
          title="Frequency Selector"
          componentName="FrequencySelector"
          category="Publishing Cadence"
          badge="Interactive Cadence"
          description="Serialization cadence picker allowing authors to commit to weekly, bi-weekly, or monthly chapter release intervals."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Serialized Novel Release Schedule (/write/manage/$workId) & Preferences",
            workflow: "Interactive cadence picker allowing authors to commit to a publishing frequency (e.g., Weekly on Mondays, Bi-weekly, Monthly) and readers to choose notification intervals."
          }}
          controls={
            <span>Cadence Selected: <strong className="text-[var(--ink-primary)]">{storybookFrequency}</strong></span>
          }
          codeSnippet={`<FrequencySelector
  onChange={(data) => setFrequency(data.type)}
/>`}
        >
          <FrequencySelector
            value={{ type: (storybookFrequency as any) || 'Weekly', subValue: 'Mon' }}
            onChange={(data) => setStorybookFrequency(data.type)}
          />
        </StoryCard>

        {/* 17. Feature Tour */}
        <StoryCard
          id="sec-tour"
          title="Feature Tour"
          componentName="FeatureTour"
          category="Onboarding & Guides"
          badge="Spotlight Flow"
          description="Guided interactive spotlight tour introducing first-time readers to key platform features and layout modes."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "New User First-Time Experience / Onboarding Completion and Writer Studio Launch",
            workflow: "Guided interactive spotlight tour highlighting key platform features: 3D Book Jacket Carousel, Distraction-Free Chapter Reader, Writer Studio, and Shelves system."
          }}
          codeSnippet={`<FeatureTour />`}
        >
          <FeatureTour />
        </StoryCard>

        {/* 18. List Stack */}
        <StoryCard
          id="sec-list-stack"
          title="List Stack"
          componentName="ListStack"
          category="Queue & Deck"
          badge="Animated Deck"
          description="Stacked card deck with animated reordering and swipe dismissals for organizing reading queues and priority folios."
          viewMode={storybookViewMode}
          defaultDocsOpen={expandAllStories}
          usageNotes={{
            primaryLocation: "Reading Library (/library), Author's Works List, and Trending Serialized Folios",
            workflow: "Stacked card arrangement with animated reordering, expansion, and swipe dismissals for organizing reading queues and priority to-read manuscripts."
          }}
          codeSnippet={`<ListStack />`}
        >
          <ListStack />
        </StoryCard>

      </section>

      {/* SECTION 18: HATCHPEN BRAND MARK & INSIGNIA */}
      <section id="sec-brand" className="scroll-mt-24 space-y-6">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Hatchpen Brand Mark & Insignia
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Official Brand Asset • Vector Silhouette</span>
        </div>
        <p className="text-xs text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          The official Hatchpen brand identity: architectural 3D open-book silhouette with detailed quill feather pen and ink flourish, paired with high-contrast <strong>HATCH pen</strong> typography and the literary manifesto <em>&ldquo;Writings. Beyond the Hype.&rdquo;</em>
        </p>

        {/* Brand Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Official Book + Quill Insignia */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Book & Quill Emblem
              </h3>
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">&lt;HatchpenEmblem /&gt;</span>
            </div>
            <div className="flex items-center gap-6 pt-2">
              <HatchpenEmblem className="h-16 w-16 shadow-md" />
              <div className="space-y-1 text-xs text-[var(--ink-muted)]">
                <p className="font-semibold text-[var(--ink-primary)]">Architectural Book + Quill Feather</p>
                <p>Primary app icon and favicon mark. 3D folded pages silhouette with detailed feather quill and flowing ink flourish.</p>
              </div>
            </div>
          </div>

          {/* Official Full Logo */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Official Full Brand Lockup
              </h3>
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">&lt;HatchpenLogo variant="full" /&gt;</span>
            </div>
            <div className="flex items-center gap-4 pt-3">
              <HatchpenLogo size="lg" variant="full" />
            </div>
          </div>

          {/* Compact Logo (Navbar Optimized) */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Compact Navbar Lockup
              </h3>
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">&lt;HatchpenLogo variant="compact" /&gt;</span>
            </div>
            <div className="flex items-center gap-4 pt-3">
              <HatchpenLogo size="lg" variant="compact" />
            </div>
          </div>

          {/* Inverted Dark-Canvas Version */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
                Inverted (Dark Mode) Lockup
              </h3>
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">&lt;HatchpenLogo variant="inverted" /&gt;</span>
            </div>
            <div className="flex items-center gap-4 pt-3 bg-slate-950 p-4 rounded-lg">
              <HatchpenLogo size="lg" variant="inverted" />
            </div>
          </div>
        </div>

        {/* Wordmark & Hierarchy Spectrum */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Wordmark Scale Hierarchy
            </h3>
            <span className="font-mono text-[10px] text-[var(--ink-faint)]">xs • sm • md • lg • xl</span>
          </div>

          <div className="flex flex-wrap items-center gap-8 pt-2">
            <HatchpenLogo size="xs" variant="full" />
            <HatchpenLogo size="sm" variant="full" />
            <HatchpenLogo size="md" variant="full" />
            <HatchpenLogo size="lg" variant="full" />
          </div>
        </div>

        {/* Brand Board Reference */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
              Monochrome Brand Identity Board
            </h3>
            <span className="font-mono text-[10px] text-[var(--ink-faint)]">src/assets/logo</span>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            <img
              src="/hatchpen-brand-board.png"
              alt="Hatchpen Monochrome Brand Identity Board"
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* SECTION 19: UNISEX AVATAR & ICON SUITE */}
      <section id="sec-avatar" className="scroll-mt-24 space-y-6">
        <div className="border-b border-[var(--border-subtle)] pb-2 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-primary)]">
            Unisex Avatar & Icon Suite
          </h2>
          <span className="font-mono text-xs text-[var(--ink-muted)]">Core Asset • Editorial Minimal</span>
        </div>
        <p className="text-xs text-[var(--ink-muted)] max-w-2xl leading-relaxed">
          Clean, gender-neutral vector avatar silhouette tailored for the Hatchpen monochrome design system. Automatically provides fallback rendering when profile pictures are absent or loading.
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
