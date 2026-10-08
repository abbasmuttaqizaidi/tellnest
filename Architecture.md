# Technical Architecture & System Design — Stories by Relay (Hatchpen)

**Document Version:** 1.0.0  
**Status:** Living Canonical Architecture Document  
**System:** High-Craft Serialized Publishing & Editorial Reading Platform  
**Last Updated:** October 2026  

---

## 1. Executive System Overview

**Stories by Relay (Hatchpen)** is built with a modern Full-Stack TypeScript architecture designed for extreme responsiveness, type-safe routing, physics-grounded animations, and distraction-free editorial reading.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT / BROWSER RUNTIME                        │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  @tanstack/react-     │  │  motion/react    │  │  Tailwind CSS   │  │
│  │  router (Type-Safe)   │  │  (Spring Physics)│  │  (Design Tokens)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └────────┬────────┘  │
│              │                       │                     │           │
│              ▼                       ▼                     ▼           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │      Centralized Design System (src/design-system/index.ts)       │  │
│  │      - AnimatedTabs / DiscreteDisclosureTabs / OmniSearch        │  │
│  │      - TactileSliders / SpotlightCard / ActivitiesCard / Modal   │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │                                 │
│                                      ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Global Application Context (AppContext)             │  │
│  │    (Reading Settings, Progress, Author States, Offline Cache)     │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ RPC / Server Functions
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NITRO / SERVER RUNTIME                          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Server Functions (`createServerFn`)                  │  │
│  │       - /src/server/works.ts      - /src/server/admin.ts         │  │
│  │       - /src/server/chapters.ts   - /src/server/taxonomy.ts      │  │
│  │       - /src/server/reader.ts     - /src/server/authors.ts       │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
│                                      │                                 │
│                                      ▼                                 │
│  ┌─────────────────────────┐                 ┌──────────────────────┐  │
│  │  Supabase Postgres DB   │                 │   Clerk Auth Cloud   │  │
│  │  (RLS, Works, Chapters) │                 │   (Sessions & JWT)   │  │
│  └─────────────────────────┘                 └──────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Meta-Framework** | TanStack React Start / Nitro | Hybrid SSR/client hydration, edge-ready Nitro server engine, zero-overhead API endpoints. |
| **UI Library** | React 19 (`react`, `react-dom`) | Modern concurrent rendering, actions, and optimistic state updates. |
| **Routing** | `@tanstack/react-router` | Fully type-safe file-based router, search param validation, loader hooks, and nested layouts. |
| **Animations** | `motion` (Framer Motion v14) | Shared layout FLIP transitions, spring physics (`SPRINGS.snappy`, `SPRINGS.smooth`), gesture physics. |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite`) | Next-gen CSS-first configuration, semantic CSS custom properties (`--ink-*`, `--bg-*`). |
| **Identity & Auth**| Clerk (`@clerk/react`) | Secure JWT auth, session management, social login, user profile synchronization. |
| **Database** | Supabase (`@supabase/supabase-js`) | PostgreSQL relational database with Row Level Security (RLS) and storage buckets. |
| **Build & Bundler**| Vite v8 (`vite`) | Instant HMR, Rolldown integration, production code splitting. |
| **Type Safety** | TypeScript v6 | End-to-end type validation from database tables to UI components. |
| **Icons** | Lucide React & Hugeicons | Monoline editorial iconography. |

---

## 3. Application Flow & User Journeys

### 3.1. Reading & Discovery Flow
```
User Enters (/)
   │
   ├──► Explore Catalog (/discover)
   │       ├── Select Collection Tab (e.g. "New Chapters This Week")
   │       ├── Open Discrete Disclosure Tab (Sort / Status / Genre)
   │       └── Select Category Pill Strip (Novels, Flash Fiction, etc.)
   │
   └──► Open Manuscript Overview (/works/$workId)
           │
           └──► Enter Serialized Reader (/read/$workId/$chapterId)
                   ├── Live Typography Customization (Font Size / Column Width Sliders)
                   ├── Reading Theme Engine (Light / Dark Obsidian / Sepia)
                   ├── Auto-save Reading Progress to AppContext & DB
                   └── End-of-Chapter Critique / Rating (`FeedbackComponent`)
```

### 3.2. Writer Studio Flow
```
Author Dashboard (/write)
   │
   ├── View Manuscripts Ledger (Drafts, Editorial Review, Published)
   ├── Create New Project (/write/new)
   │      └── Assign Canonical Category & Grouped Genre
   │
   └── Manage Manuscript (/write/manage/$workId)
          ├── Organize Structure: Work ➔ Acts ➔ Chapters
          ├── Write Prose in Editor (/write/editor/$workId/$chapterId)
          │      └── Auto-word count, status toggle, markdown rendering
          └── Inspect Retention Analytics (/write/analytics/$workId)
```

### 3.3. Administrative Publishing & Collections Flow
```
Secret Admin Portal (/secret-adminpanel)
   │
   ├── Token-based session verification (`verifyAdminSessionServerFn`)
   ├── Manuscript Global Ledger & Chapter Ingestion
   │      └── Add / Edit Acts & Chapters
   │
   └── Automatic Collection Calculation:
          ├── `new_this_week`: First publication within Monday–Sunday
          └── `new_chapters_this_week`: Triggered ONLY when a new Act or Chapter is published
```

---

## 4. Directory & File Structure

```
stories-by-relay/
├── public/                      # Static assets, fonts, icons, manifest
├── src/
│   ├── assets/                  # Logos and vector illustrations
│   │   └── logo/
│   ├── components/              # Domain-specific UI assemblies
│   │   ├── watermelon/          # Specialized tactile card sub-modules
│   │   ├── AuthModal.tsx        # Clerk login & signup modal
│   │   ├── AuthorCard.tsx       # Standard author folio card
│   │   ├── ChapterDrawer.tsx    # Slide-over table of contents drawer
│   │   ├── ClerkSync.tsx        # Clerk-to-Supabase user sync bridge
│   │   ├── CommentsSection.tsx  # Reader discussions and chapter comments
│   │   ├── DesignSystemSidebar.tsx # Quick-jump nav for design system
│   │   ├── EmptyState.tsx       # Archival empty state displays
│   │   ├── Footer.tsx           # Editorial footer
│   │   ├── Header.tsx           # Global navigation bar & omni-search trigger
│   │   ├── MobileNav.tsx        # Mobile bottom navigation bar
│   │   ├── ReaderSettingsModal.tsx # Typography & theme dialog
│   │   ├── StoryCard.tsx        # Storybook presentation wrapper
│   │   ├── Toast.tsx            # Global notification toast
│   │   ├── UserOnboardingModal.tsx # New author profile setup modal
│   │   └── WorkCard.tsx         # Catalog manuscript preview card
│   │
│   ├── context/
│   │   └── AppContext.tsx       # Global state (theme, reader settings, library, taxonomy)
│   │
│   ├── data/
│   │   └── mockData.ts          # Mock seed data, interfaces, and fallback records
│   │
│   ├── design-system/           # CENTRALIZED DESIGN SYSTEM (Zero raw HTML allowed elsewhere)
│   │   ├── ActivitiesCard.tsx   # Floating/drawer activity ledger (zero layout shift)
│   │   ├── AnimatedSearch.tsx   # 7 editorial search variants (curtain, pill, minimal)
│   │   ├── AnimatedTabs.tsx     # Continuous layoutId animated sliding tabs
│   │   ├── Badge.tsx            # Monospace status badges
│   │   ├── BottomSheet.tsx      # Mobile gesture bottom sheet
│   │   ├── Button.tsx           # Tactile button with spring tap downscale
│   │   ├── CardAccordion.tsx    # Spring card accordion
│   │   ├── CardSwipe.tsx        # Swipeable card deck with drag physics
│   │   ├── ContextualAiBar.tsx  # Floating contextual AI reading assistant
│   │   ├── ContinuousPagination.tsx # Sliding fluid pagination
│   │   ├── CreateCommunity.tsx  # Literary salon creation modal card
│   │   ├── CreateNewDisclosure.tsx # Spring grid quick action menu
│   │   ├── DeploymentCard.tsx   # Status card with terminal logs
│   │   ├── DiscreteDisclosureTabs.tsx # Expanding tabs with anchored dropdown
│   │   ├── DiscreteTabs.tsx     # Discrete expanding tab pills
│   │   ├── Dock.tsx             # macOS-style magnification dock
│   │   ├── Drawer.tsx           # Bidirectional slide-over drawer
│   │   ├── DropdownSelect.tsx   # Custom single select dropdown
│   │   ├── EditProfile.tsx      # Author profile editor card
│   │   ├── EventReminders.tsx   # Literary event reminder card
│   │   ├── ExpandableEventCard.tsx # Expandable timeline card
│   │   ├── ExpandableProfile.tsx # Author profile card with vertical expansion
│   │   ├── ExpandableProfileCard.tsx # FLIP modal expandable author card
│   │   ├── ExtendedToolbar.tsx  # Floating extended toolbar
│   │   ├── FeatureTour.tsx      # Spotlight onboarding tour
│   │   ├── Feedback.tsx         # End-of-chapter sentiment & critique widget
│   │   ├── FilterDisclosure.tsx # Morphing filter pill into drawer
│   │   ├── FrequencySelector.tsx # Serial release schedule selector
│   │   ├── ListStack.tsx        # Interactive stacked list
│   │   ├── MeetingCard.tsx      # Literary salon schedule card
│   │   ├── MetricProgressCard.tsx # Quota & reading progress card
│   │   ├── Modal.tsx            # Backdrop modal overlay with spring physics
│   │   ├── MultiDropdownSelect.tsx # Multi-tag select dropdown
│   │   ├── OmniSearch.tsx       # Compound filter search component
│   │   ├── PaletteSearch.tsx    # Cmd+K keyboard command palette
│   │   ├── QuickOptionPicker.tsx # Segmented typography & mode selector
│   │   ├── QuickSwitcher.tsx    # Compact mode switcher
│   │   ├── RevealingCards.tsx   # Layered disclosure card stack
│   │   ├── SpotlightCard.tsx    # Feature manuscript spotlight card
│   │   ├── TactileProfileCard.tsx # Author card with SVG sparkline
│   │   ├── TactileSlider.tsx    # Live mechanical range slider
│   │   ├── Tags.tsx             # Interactive tag pills
│   │   ├── TaskWidgetDisclosure.tsx # Editorial checklist widget
│   │   ├── tokens.ts            # Spring physics & tap scale tokens
│   │   ├── WigglingCards.tsx    # Tilt / wiggle interactive card deck
│   │   └── index.ts             # Central export barrel for design system
│   │
│   ├── lib/
│   │   ├── supabase/            # Client initialization, schemas, and query helpers
│   │   │   ├── queries/
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   ├── image.ts             # Image optimization & fallback utilities
│   │   ├── seo.ts               # Metadata & Schema.org JSON-LD generators
│   │   ├── taxonomy.ts          # 16 Canonical categories & grouped genres (Source of Truth)
│   │   └── utils.ts             # `cn` (clsx + tailwind-merge) helper
│   │
│   ├── routes/                  # File-based routes (@tanstack/react-router)
│   │   ├── __root.tsx           # Root route with Theme Script, ClerkProvider, AppProvider
│   │   ├── index.tsx            # Home / Curated Editorial Showcase
│   │   ├── discover.tsx         # Discover page with AnimatedTabs & DiscreteDisclosureTabs
│   │   ├── read.$workId.$chapterId.tsx # Serialized Chapter Reader Room
│   │   ├── works.$workId.tsx    # Work overview, acts, and chapter table of contents
│   │   ├── author.$authorId.tsx # Author public folio
│   │   ├── category.$slug.tsx   # Category-specific catalog
│   │   ├── genre.$slug.tsx      # Genre-specific catalog
│   │   ├── library.tsx          # Personal reader archives
│   │   ├── following.tsx        # Subscribed author chapter feed
│   │   ├── search.tsx           # Comprehensive search view
│   │   ├── notifications.tsx    # Reader activity notifications
│   │   ├── profile.tsx          # User profile settings & bookshelf
│   │   ├── settings.tsx         # Account & appearance preferences
│   │   ├── design-system.tsx    # Interactive Design System Laboratory
│   │   ├── secret-adminpanel.tsx # Administrative management portal
│   │   ├── admin-work-editor.$workId.tsx # Admin act/chapter management
│   │   ├── write.index.tsx      # Writer Studio dashboard
│   │   ├── write.new.tsx        # Project creation wizard
│   │   ├── write.manage.$workId.tsx # Manuscript structure manager
│   │   ├── write.editor.$workId.$chapterId.tsx # Chapter prose editor
│   │   └── write.analytics.$workId.tsx # Reader retention analytics
│   │
│   ├── server/                  # TanStack Start Server Functions (`createServerFn`)
│   │   ├── admin.ts             # Admin session verification & bulk operations
│   │   ├── authors.ts           # Author query & profile operations
│   │   ├── chapters.ts          # Chapter content retrieval & publishing
│   │   ├── reader.ts            # Reading progress & feedback storage
│   │   ├── taxonomy.ts          # Taxonomy DB synchronization
│   │   └── works.ts             # Public discovery feed & manuscript CRUD
│   │
│   ├── main.tsx                 # Client entry point
│   ├── router.tsx               # TanStack Router instance initialization
│   └── styles.css               # Core CSS variables, typography imports, tailwind setup
│
├── live_instructions.md         # Strict business rules, taxonomy, and collection logic
├── Description.md               # Design system rules, executive aesthetic, guidelines
├── PRD.md                       # Canonical Product Requirements Document
├── Architecture.md              # Technical Architecture & System Design Document
├── package.json                 # Dependencies and build scripts
├── vite.config.ts               # Vite configuration with React & TanStack Start plugins
└── tsconfig.json                # TypeScript strict configuration
```

---

## 5. State Management & Data Architecture

### 5.1. Global React Context (`AppContext`)
- **Theme Engine**: Syncs with localStorage and `data-theme` on `<html>` (`'light' | 'dark' | 'sepia'`).
- **Reader Settings**: Font size, font family (`serif`, `sans`, `mono`), line height, reading width (`narrow`, `medium`, `wide`).
- **User Library State**: `savedWorkIds`, `readingProgress`, `followedAuthorIds`.
- **Taxonomy Cache**: `categories` (16 canonical categories) and `genres` (grouped).

### 5.2. Server Functions Layer (`src/server/`)
- All server queries use `@tanstack/react-start`'s `createServerFn`.
- Inputs validated via type guards and runtime validators.
- Zero raw database queries on the client side; all database operations pass through Supabase server clients with role checks.

---

## 6. Design System Implementation Rules

1. **Strict Re-use Directive**: Raw HTML controls (`<button>`, unstyled inputs) are strictly prohibited in application routes. Everything must be imported from `src/design-system`.
2. **CSS Token Directives**: Colors must use defined semantic tokens (`--bg-canvas`, `--bg-surface`, `--ink-primary`, `--ink-secondary`, `--ink-muted`, `--border-subtle`). Hardcoded Tailwind colors are banned.
3. **Motion Directives**: Transitions must use centralized springs (`SPRINGS.snappy`, `SPRINGS.smooth`, `SPRINGS.bouncy`).
4. **Layout Shift Directives**: Floating menus, drawers, and disclosure cards must use anchored absolute positioning or slide-overs to guarantee zero unintended layout shifts.
