# Platform Specification & Design System Architecture — Stories by Relay

> [!IMPORTANT]
> ### CANONICAL KNOWLEDGE BASE & AGENT DIRECTIVE
> To fully understand, develop, and maintain this project without regressions or design drift, **you must read and commit the following core specification documents to memory**:
> 1. **[`PRD.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/PRD.md)** — Canonical Product Requirements Document detailing product vision, the episodic structural hierarchy (`Work ➔ Act ➔ Chapter`), weekly automatic collections logic (`New Chapters This Week` vs `New This Week`), and core functional route specifications.
> 2. **[`Architecture.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/Architecture.md)** — Comprehensive technical architecture, full-stack data flow, complete directory and file structure, state management (`AppContext`), Nitro server functions (`src/server/`), and full tech stack specifications.
> 3. **[`rules.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/rules.md)** — Strict engineering and workflow rules: mandatory component and filter reuse, strict auth flow preservation (zero regression on login/signup), Git constraints (no pushing without explicit user order), robust error handling, public vs. private route boundaries, end-to-end SEO mandates, and language policy (Hinglish conversation, English code/docs).
> 4. **[`Phases.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/Phases.md)** — Project roadmap, active milestones, completed deliverables (Phases 1–3), active Writer Studio scope (Phase 4), and upcoming community/monetization gates (Phases 5–7).
> 5. **[`Design.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/Design.md)** — Complete synchronized design token matrix: typography mapping (`Outfit`, `Inter`, `JetBrains Mono`), Tri-theme colors (Light, Obsidian Dark, Sepia), spring physics tokens (`SPRINGS.snappy`, `SPRINGS.smooth`, `SPRINGS.bouncy`), card surface tokens, and centralized primitive behaviors.
> 6. **[`live_instructions.md`](file:///Users/syedabbasmuttaqizaidi/Desktop/development/stories-by-relay/live_instructions.md)** — Business rules for canonical 16 categories, grouped genres, and time-based collections logic.

---

## 1. Executive Overview

**Stories by Relay** is an editorial, high-craft digital publishing platform engineered for serialized fiction, essayistic monographs, and long-form literature. 

Designed at the intersection of classical print typography and modern reactive software, the platform bridges serious fiction writers and discerning readers. It replaces bloated, algorithm-driven social feeds with a deliberate, distraction-free reading sanctuary and an executive author studio.

### Key Pillars
- **Serialized Storytelling**: Episodic chapter delivery with reader cadence tracking, bookmarking, and subscriber folios.
- **Editorial Typography**: Typographic layout featuring the tri-theme reading engine (High-Contrast Light, Obsidian Dark, and Warm Sepia Folio).
- **Tactile Micro-Interactions**: Fluid, physics-based spring interactions powered by Motion that feel grounded and mechanical rather than artificial.
- **Monochrome Executive Aesthetic**: A restrained palette of ink, paper, slate, and canvas that elevates literature above marketing decoration.

---

## 2. Core Functional Modules

### 2.1. Discovery & Reader Room (`/` and `/read/*`)
- **Serialized Reader**: Distraction-free chapter view with dynamic font size and column width tactile sliders.
- **Tri-Theme Reading Modes**: One-click toggling between Light (Paper), Dark (Obsidian), and Sepia (Eye-strain reduction).
- **Chapter Navigation**: Type-safe sequential chapter transitions with reading progress indicators.

### 2.2. Writer Studio (`/write/*`)
- **Manuscript Dashboard**: Comprehensive ledger of serialized works categorized across drafts, editorial review, and published editions.
- **Executive Studio Activity**: Compact floating ledger (`ActivitiesCard`) reporting real-time chapter drops, reader milestones, and reflections with zero layout shifting.
- **Editor & Chapter Studio**: Streamlined interface for drafting and scheduling episodic chapter installments.
- **Readership Analytics**: High-level metrics tracking total reads, active folios, and bookmark conversion rates.

### 2.3. Personal Reader Library (`/library`)
- **Organized Reader Archives**: Segmented views for Currently Reading, Saved Folios, Completed Manuscripts, and Chronological Reading History.
- **Interactive Search & Filter**: Rapid filtering across tags, statuses, and genres.

### 2.4. Design System Showcase (`/design-system`)
- **Interactive Component Gallery**: Complete living catalog of all tactile cards, search bars, disclosure pills, sliders, modals, and drawers.
- **Quick-Jump Nav Sidebar**: Floating sidebar for instant navigation across all component categories.

### 2.5. Content Hierarchy & Literary Terminology
The platform strictly follows an episodic, manuscript-grade structural hierarchy:

```
Work (Manuscript / Literary Project)
└── Act (Major Arc / Phase / Installment Tier)
    └── Chapter (Episodic Prose Installment / Scene)
```

- **`Work`**: Replaces the generic term "Story". A *Work* represents the overarching manuscript, serialized novel, essay collection, or anthology written by an author.
- **`Act`**: A *Work* can contain multiple *Acts*. An *Act* represents a major thematic narrative block, story arc, volume, or serialized phase (e.g., *Act I: The Inception*, *Act II: The Crossing*, *Act III: The Reckoning*).
- **`Chapter`**: An *Act* contains multiple *Chapters*. A *Chapter* is the individual episodic installment delivered to readers with reading-time metrics, drop caps, and comment margins.

---

## 3. Design System Component Catalog (`src/design-system`)

All UI elements are centralized in `src/design-system/` and exported via `src/design-system/index.ts`.

### 3.1. Navigation & Search Primitives
| Component | Description |
| :--- | :--- |
| **`AnimatedTabs`** | Tactile sliding pill tabs with layout spring physics (`layoutId`). |
| **`AnimatedSearch`** | 7 editorial search variants (expandable pill, typewriter ghost, curtain reveal, tactile button, minimalist underline, etc.). |
| **`OmniSearch`** | Expandable search icon with compound filter scopes, category cycling, and ghost typing. |
| **`PaletteSearch`** | Global `Cmd+K` command palette for instant manuscript, author, and route navigation. |
| **`FilterDisclosure`** | Morphing filter pill that expands into a staggered selection drawer. |

### 3.2. Dialogs & Overlays
| Component | Description |
| :--- | :--- |
| **`Modal`** | Centered backdrop modal with spring entrance, keyboard ESC listener, and scroll locks. |
| **`Drawer`** | Slide-over drawer sheet with directional spring physics (left or right). |

### 3.3. Tactile Inputs & Controls
| Component | Description |
| :--- | :--- |
| **`Button`** | Tactile button with subtle spring tap feedback (`scale: 0.97`) across primary, secondary, outline, and ghost variants. |
| **`Badge`** | Monospace archival metadata badge with subtle borders and status rings. |
| **`TactileSlider`** | Smooth mechanical range slider with live feedback for typography and reading width controls. |

### 3.4. Watermelon UI Tactile Card Suite
| Component | Description |
| :--- | :--- |
| **`ActivitiesCard`** | Compact, executive activity ledger with floating popover, drawer, or inline modes (zero layout shift). Supports `size="sm"` and `size="md"`. |
| **`CardSwipe`** | Tactile swipable card stack with realistic drag physics, release thresholds, and deck reshuffling. |
| **`WigglingCards`** | Interactive multi-layer card stack with tilt/wiggle feedback on hover and drag. |
| **`RevealingCards`** | Layered card stack revealing hidden details upon expansion or hover. |
| **`TactileProfileCard`** | Author dossier card featuring an inline SVG reading sparkline, verified badge, and expandable metrics. |
| **`ExpandableProfile`** | Morphing author card that expands vertically to reveal full biography, tags, and lifetime stats. |
| **`ExpandableEventCard`** | Timeline event card with inline expansion, date tags, and location metadata. |
| **`MetricProgressCard`** | Progress card with live spring animation, percentage clamping, and quota indicators. |
| **`MeetingCard`** | Schedule card with participant avatar stacks and action triggers. |
| **`DeploymentCard`** | Infrastructure-style status card with animated ping rings, branch badges, and terminal logs. |
| **`CardAccordion`** | Spring-animated accordion for grouped editorial content. |
| **`SpotlightCard`** | Executive tactile editorial card engineered for featuring weekly manuscripts, serialized installments, or dispatches with archival pill badge. |

### 3.5. Tokens (`src/design-system/tokens.ts`)
- **`SPRINGS.snappy`**: High-frequency spring (`stiffness: 420, damping: 32`) for tabs, toggles, and compact triggers.
- **`SPRINGS.smooth`**: Gentle spring (`stiffness: 260, damping: 26`) for cards, drawers, and modal sheets.
- **`SPRINGS.bouncy`**: Elastic spring (`stiffness: 500, damping: 36`) for badges and accordion disclosures.
- **`TAPS`**: Standardized tap downscales (`button: 0.97`, `card: 0.985`, `subtle: 0.99`).

---

## 4. STRICT INSTRUCTIONS FOR CODEBASE MODIFICATIONS

> [!CAUTION]
> ### MANDATORY DESIGN SYSTEM DIRECTIVE
> Every developer and agent working on this codebase must strictly obey the following rules. Failure to do so will result in visual fragmentation, layout regressions, and design system drift.

### Rule 1: EXCLUSIVE USE OF DESIGN-SYSTEM COMPONENTS
- **NO RAW CONTROLS**: You are **strictly prohibited** from creating ad-hoc buttons (`<button className="...">`), native un-styled select boxes, raw search inputs, or bespoke cards directly inside route pages or feature components.
- **USE CENTRALIZED EXPORTS**: All interactive controls, cards, tabs, search bars, sliders, badges, modals, and drawers **MUST ONLY** be imported from `src/design-system` (or `#/*` via the package alias).
- **EXPANDING THE SYSTEM**: If a feature requires a UI control or variant that does not exist in `src/design-system`, **you must first implement that component inside `src/design-system/`**, export it via `src/design-system/index.ts`, document it in the Design System showcase, and only then consume it in the route.

### Rule 2: STRICT ADHERENCE TO THE MONOCHROME EXECUTIVE PALETTE
- **NO HARDCODED COLORS**: Do **not** use arbitrary Tailwind utility colors (e.g. `bg-blue-500`, `text-gray-400`, `bg-zinc-900`, `border-neutral-300`).
- **USE DESIGN TOKENS**: Always utilize the established CSS custom variables:
  - `--bg-canvas`: Page background (`#F8FAFC` light / `#090D14` dark / `#F6F1EA` sepia)
  - `--bg-surface`: Elevated card and container background (`#FFFFFF` light / `#111722` dark / `#FAF7F2` sepia)
  - `--bg-subtle`: Subtle hover fills and secondary tags (`#F1F5F9` light / `#172030` dark / `#EDE5DA` sepia)
  - `--border-subtle`: Hairline container borders (`#E2E8F0` light / `#1E293B` dark / `#E0D5C5` sepia)
  - `--border-strong`: Focused or active borders (`#CBD5E1` light / `#334155` dark / `#CEC0AD` sepia)
  - `--ink-primary`: Primary editorial headings and body text (`#010611` light / `#F8FAFC` dark / `#2C2219` sepia)
  - `--ink-secondary`: Secondary subheadings and metadata (`#171F2C` light / `#E2E8F0` dark / `#4A3A2C` sepia)
  - `--ink-muted`: Tertiary descriptions and helper labels (`#64748B` light / `#94A3B8` dark / `#7A6553` sepia)
  - `--ink-faint`: Timestamp and archival metadata markers (`#94A3B8` light / `#64748B` dark / `#A69280` sepia)

### Rule 3: ZERO UNINTENDED LAYOUT SHIFTS
- **FLOAT OR DRAWER BY DEFAULT**: When implementing expandable status cards, ledgers, or menus (such as `ActivitiesCard`), use floating popovers (`displayMode="popover"`) or slide-over sheets (`displayMode="drawer"`) so that the surrounding and lower content is never jarringly pushed or shifted downward.
- **ANCHORING & ALIGNMENT**: Toolbars and right-aligned action clusters must set `align="right"` on popover components to ensure dropdowns never cause horizontal viewport overflow.

### Rule 4: RESPONSIVE CONTAINER DISCIPLINE
- All primary page layouts must maintain standard responsive containment:
  ```tsx
  className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
  ```
- No component may force horizontal scrollbars or overflow the viewport on mobile devices (`max-w-[92vw]` safeguards for floating panels).

### Rule 5: MOTION & PHYSICS STANDARDS
- All animated elements must use the centralized springs from `src/design-system/tokens.ts` (`SPRINGS.snappy`, `SPRINGS.smooth`, `SPRINGS.bouncy`).
- Never use linear or abrupt easing curves for interactive elements.
- Always implement `AnimatePresence` with appropriate `initial`, `animate`, and `exit` states for conditional mounts.
