# Product Requirement Document (PRD) — Stories by Relay (Hatchpen)

**Document Version:** 1.0.0  
**Status:** Living Canonical Architecture Document  
**Target Release:** Production / v1.0  
**Last Updated:** October 2026  

---

## 1. Executive Summary & Vision

### 1.1. Product Vision
**Stories by Relay (Hatchpen)** is an editorial, high-craft digital publishing platform engineered for serialized fiction, essayistic monographs, and long-form literature. 

Designed at the intersection of classical print typography and modern reactive software, Hatchpen bridges serious authors and discerning readers. It replaces algorithm-driven, fragmented social feeds with a distraction-free reading sanctuary and an executive author studio.

### 1.2. Core Value Propositions
1. **Serialized Storytelling**: Episodic delivery with reader cadence tracking, bookmarking, and subscriber folios.
2. **Editorial Typography & Tri-Theme Engine**: Typographic layout featuring High-Contrast Light, Obsidian Dark, and Warm Sepia Folio with tactile font-size and reading-width controls.
3. **Tactile Micro-Interactions**: Physics-based spring micro-interactions powered by Motion (`motion/react`) that feel mechanical and grounded.
4. **Monochrome Executive Aesthetic**: A restrained palette of ink, paper, slate, and canvas that elevates literature above marketing decoration.
5. **Strict Design System Discipline**: Zero ad-hoc elements; 100% of the UI conforms to centralized primitives in `src/design-system/`.

---

## 2. Information Architecture & Hierarchy

### 2.1. Content Structure & Terminology
The platform strictly follows an episodic, manuscript-grade structural hierarchy:

```
Work (Manuscript / Literary Project)
└── Act (Major Arc / Phase / Installment Tier)
    └── Chapter (Episodic Prose Installment / Scene)
```

- **`Work`**: The overarching manuscript, serialized novel, essay collection, or anthology written by an author (replaces the generic term "story").
- **`Act`**: A major thematic narrative block, story arc, volume, or serialized phase (e.g., *Act I: The Inception*, *Act II: The Crossing*, *Act III: The Reckoning*).
- **`Chapter`**: The individual episodic installment delivered to readers with reading-time metrics, drop caps, and comment margins.

---

## 3. Global Taxonomy & Collections

### 3.1. Canonical Categories (16 Defined Categories)
As strictly defined in `live_instructions.md`, the platform supports exactly 16 canonical categories:
1. **Novels**
2. **Short Stories**
3. **Flash Fiction**
4. **Serialized Fiction**
5. **Poetry**
6. **Essays**
7. **Non‑Fiction**
8. **Memoir / Autobiography**
9. **Children’s Fiction**
10. **Middle Grade**
11. **Young Adult (YA)**
12. **New Adult**
13. **Fan Fiction**
14. **Anthologies / Collections**
15. **Graphic Novels / Comics**
16. **Scripts / Screenplays**

### 3.2. Grouped Literary Genres
- **Literary / General**: Literary Fiction, Contemporary Fiction, General Fiction
- **Thriller / Mystery**: Thriller, Mystery, Psychological Thriller, Crime, Espionage / Spy
- **Speculative**: Science Fiction, Dystopian, Cyberpunk, Space Opera, Fantasy, Dark Fantasy, Magical Realism, Horror
- **Romance**: Contemporary Romance, Historical Romance, Dark Romance, Slow Burn, Romantic Comedy
- **Historical**: Historical Fiction, Alternate History, Period Drama
- **Non‑Fiction & Memoir**: Memoir, Personal Essays, True Crime, Investigative Journalism, Philosophy, Creative Non-Fiction
- **Experimental & Other**: Satire / Dark Comedy, Surreal / Absurdist, Slice of Life, Adventure / Survival

### 3.3. Collections Architecture & Weekly Cadence Logic
Works include specific boolean attributes (`new_this_week`, `new_chapters_this_week`) and dynamic collection arrays (`collection: string[]`).

#### Strict Automatic Collections Rules:
- **`New Chapters This Week`**:
  - Automatically identifies works with **new content published during the current calendar week** (Monday 00:00 to Sunday 23:59).
  - **Strict Rule:** A work is included **ONLY** if a new **Act** or **Chapter** was added/published. Minor text edits, typo fixes, or act/chapter deletions do **NOT** trigger inclusion.
  - Calculated dynamically on the server or via real-time activity timestamps.
- **`New This Week`**:
  - Automatically tags brand-new works published for the first time in the current calendar week.
  - **Strict Rule:** A brand new work published this week sets `new_this_week: true`, but `new_chapters_this_week` remains `false` (until a subsequent chapter is published).
- **`Trending Now`**:
  - Time-weighted velocity calculation based on total reads, saves, and recent chapter completions.
- **`Rising Stories`**:
  - Strong upward engagement momentum, highlighting emerging works just below trending.
- **`Completed Works`**:
  - Completed serialized projects (`status === 'Completed'`).

#### Curated Editorial Collections:
- **`Editor’s Picks`**: Hand-curated standout works.
- **`Fresh Voices`**: Promising debut authors.
- **`Breakout Stories`**: Rapidly escalating readership.
- **`Spotlight`**: Themed showcases.
- **`Staff Favorites`**: Curated editorial team favorites.

---

## 4. Key Functional Modules & Routes

### 4.1. Discover & Catalog (`/discover`)
- **Primary Collection Tabs (`AnimatedTabs`)**:
  - `New Chapters This Week` (Default selected tab)
  - `New This Week`
  - `Trending`
  - `Rising Stories`
  - `Recently Updated`
  - `Completed Works`
- **Secondary Filters (`DiscreteDisclosureTabs`)**:
  - **Sort Manuscripts**: Popularity, Recently Updated, Highest Rated.
  - **Publication Status**: All Statuses, Ongoing (Serialized), Completed, On Hiatus.
  - **Genre Filter**: Dynamic taxonomy genres.
  - **Discrete Behavior**: Compact pills expand smoothly on click via spring physics, revealing the full label and rendering an anchored, boundary-aware floating dropdown without shifting surrounding elements.
- **Category Filter Pills**:
  - Horizontal scrollable strip featuring all 16 canonical categories with `whitespace-nowrap shrink-0` protection.

### 4.2. Serialized Reading Room (`/read/$workId/$chapterId`)
- **Tri-Theme Reading Engine**: Instant toggle between Light (Paper), Dark (Obsidian), and Sepia.
- **Tactile Sliders**: Live customization of font size (`14px - 32px`) and reading column width (`480px - 960px`).
- **Reading Progress & Persistence**: Automatic tracking of reading percentages, current chapter ID, and last read timestamp per user profile.
- **Chapter End Ornament**: Interactive feedback and critique widget (`FeedbackComponent`).

### 4.3. Writer Studio Suite (`/write`)
- **Dashboard (`/write`)**: Summary of author works, status badges (Draft, Review, Published), total reads, and saves.
- **Work Editor (`/write/manage/$workId`)**: Hierarchical tree management of Acts and Chapters.
- **Chapter Prose Editor (`/write/editor/$workId/$chapterId`)**: Distraction-free Markdown/prose editor with word count, status switching, and auto-save.
- **Author Analytics (`/write/analytics/$workId`)**: Readership metrics, retention, and chapter engagement drop-offs.

### 4.4. Reader Library & Following (`/library`, `/following`)
- Segmented views for *Currently Reading*, *Saved Folios*, *Completed Manuscripts*, and *Reading History*.
- Author subscription stream showing newly published chapters and dispatch events.

### 4.5. Admin Panel & Work Management (`/secret-adminpanel`, `/admin-work-editor.$workId`)
- Secure token-based administrative portal.
- Complete control to add, edit, or publish chapters and acts across all manuscripts on the platform.
- Real-time collection tags verification (`new_this_week`, `new_chapters_this_week`, `trending`, `featured`).

### 4.6. Design System Showcase (`/design-system`)
- Living interactive laboratory documenting all 19+ UI primitives and 9 Watermelon card suite components.
- Dual-mode preview: **Canvas** (live interactive rendering) vs **Docs** (code snippets, API specs, and usage guidelines).
- Viewport simulation tools (Responsive, Desktop, Tablet, Mobile).

---

## 5. Design System & Component Catalog

All components reside under `src/design-system/` and are strictly exported from `src/design-system/index.ts`.

### 5.1. Navigation & Disclosure Primitives
| Component | Purpose & Interaction |
| :--- | :--- |
| **`AnimatedTabs`** | Continuous liquid sliding-pill tab switcher using Framer Motion `layoutId`. |
| **`DiscreteTabs`** | Discrete expanding tab pills with sliding background highlights. |
| **`DiscreteDisclosureTabs`** | Expanding discrete tabs with anchored dropdown menus and auto-align boundary detection. |
| **`FilterDisclosure`** | Morphing filter pill expanding into a staggered animated item drawer. |
| **`CreateNewDisclosure`** | Spring-animated grid action menu for creating manuscripts, essays, and salons. |

### 5.2. Search Primitives
| Component | Purpose & Interaction |
| :--- | :--- |
| **`AnimatedSearch`** | Editorial search variants (curtain reveal, expandable pill, typewriter ghost, minimal underline). |
| **`OmniSearch`** | Compound expandable search with multi-scope cycling and keystroke triggers. |
| **`PaletteSearch`** | Keyboard-driven (`Cmd+K`) command palette for cross-platform navigation. |

### 5.3. Tactile Cards & Sliders
| Component | Purpose & Interaction |
| :--- | :--- |
| **`SpotlightCard`** | Executive tactile editorial card for featured manuscripts and serialized drops. |
| **`ActivitiesCard`** | Floating popover or drawer ledger tracking real-time chapter releases with zero layout shift. |
| **`CardSwipe`** | Physics-based swipeable card deck with inertia and reshuffling. |
| **`TactileProfileCard`** | Author card with SVG sparkline graph and reading stats. |
| **`ExpandableProfileCard`** | FLIP shared-layout card expanding to full profile modal. |
| **`TactileSlider`** | Mechanical slider with live typography metrics. |
| **`FeedbackComponent`** | End-of-chapter rating and critique submission widget. |

### 5.4. Dialogs, Drawers & Utilities
| Component | Purpose & Interaction |
| :--- | :--- |
| **`Modal`** | Centered backdrop dialog with spring physics and ESC keyboard trap. |
| **`Drawer`** | Slide-over drawer sheet with bidirectional physics. |
| **`Dock`** | macOS-style proximity magnification utility dock. |
| **`ContinuousPagination`**| Fluid sliding pagination control. |

---

## 6. Technical Stack & Architecture

- **Framework**: TanStack React Start / Vite / React 19 / Nitro
- **Routing**: `@tanstack/react-router` (File-based routing with full type safety)
- **Animation**: `motion` (Framer Motion v14) with unified spring physics tokens
- **Styling**: Tailwind CSS v4 with custom CSS variables for semantic ink/paper tokens
- **Authentication**: Clerk (`@clerk/react`) with user sync and metadata bridging
- **Database & Storage**: Supabase (`@supabase/supabase-js`) / PostgreSQL with server functions (`createServerFn`)
- **Icons**: Lucide React (`lucide-react`) & Hugeicons

---

## 7. Strict Non-Negotiable Directives

1. **NO RAW HTML CONTROLS**: No native unstyled `<button>`, `<input>`, or raw card divs inside feature routes. Every control must originate from `src/design-system`.
2. **TOKEN-ONLY STYLING**: No hardcoded Tailwind colors (e.g. `bg-blue-500`, `text-gray-400`). All styles must reference semantic tokens (`--ink-primary`, `--bg-canvas`, `--border-subtle`, etc.).
3. **ZERO UNINTENDED LAYOUT SHIFT**: Popups, disclosure cards, and dropdowns must use anchored absolute positioning or drawers so surrounding rows never jump or push down adjacent UI.
4. **UNIFIED SPRINGS**: All animations must use `SPRINGS.snappy`, `SPRINGS.smooth`, or `SPRINGS.bouncy` from `src/design-system/tokens.ts`. No linear easings.
5. **TAXONOMY & COLLECTIONS INTEGRITY**: Strict adherence to the 16 canonical categories and Monday-to-Sunday weekly collection computation rules.
