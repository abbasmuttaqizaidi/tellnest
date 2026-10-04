# Technology Stack — Stories by Relay

This document details the architectural foundation, libraries, build tools, styling systems, and design conventions powering **Stories by Relay**.

---

## 1. Core Framework & Architecture

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^19.2.0` | Modern UI library utilizing React 19's concurrent rendering, transitions, and improved server-client hydration. |
| **TanStack Start** | `1.168.60` | Full-stack SSR (Server-Side Rendering) framework built specifically for React, orchestrating server routes, streaming HTML, and data loading. |
| **TanStack Router** | `1.170.41` | Fully type-safe, file-based routing system with automatic route tree generation (`src/routeTree.gen.ts`), search param schemas, and fine-grained code-splitting. |
| **Clerk** | `^0.3.0` (`@clerk/react`) | Authentication & identity provider handling OAuth, passwords, sessions, modal sign-in/up, and secure user tokens. |
| **Supabase** | `^2.49.1` (`@supabase/supabase-js`) | PostgreSQL backend database, image storage buckets (`manuscript-covers`, `author-avatars`), and automatic Clerk profile synchronization. |

---

## 2. Build Tooling & Compilers

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Vite** | `^8.0.0` | Next-generation frontend build engine providing sub-second HMR and ESM-native production bundling. |
| **TypeScript** | `^6.0.2` | Strict end-to-end type safety across route parameters, component contracts, and domain models. |
| **@tailwindcss/vite** | `^4.1.18` | Vite plugin executing native Lightning CSS compilation for Tailwind CSS v4. |
| **@vitejs/plugin-react** | `^6.0.1` | Official Vite plugin for React Fast Refresh and JSX transformations. |
| **@tanstack/react-start/plugin/vite** | `1.168.60` | Vite build adapter for TanStack Start SSR runtime. |

---

## 3. Styling, Typography & Design Tokens

### Tailwind CSS v4 Engine
- **Tailwind CSS (`^4.1.18`)**: Configured via the CSS-first engine in `src/styles.css` using `@theme` blocks, eliminating the legacy `tailwind.config.js`.
- **@tailwindcss/typography (`^0.5.16`)**: Editorial `prose` classes tuned for serialized long-form reading.

### Design Tokens (Monochrome Executive)
Custom CSS variables declared in `src/styles.css` supporting three distinct reading environments:
- **Light Surface**: High-contrast, clean white paper canvas (`--bg-canvas: #F8FAFC`, `--ink-primary: #010611`).
- **Dark Archival**: Deep low-glare obsidian (`--bg-canvas: #090D14`, `--ink-primary: #F8FAFC`).
- **Sepia Folio**: Warm, warm-light paper simulation designed for prolonged reader sessions (`--bg-canvas: #F6F1EA`, `--ink-primary: #2C2219`).

### Class Utilities
- **clsx** (`^2.1.1`) & **tailwind-merge** (`^3.7.0`): Deterministic class merging wrapped in `src/lib/utils.ts` (`cn(...)`).
- **class-variance-authority** (`^0.7.1`): Declarative variant definitions for reusable design system components.

---

## 4. Animation & Tactile Physics

| Library | Version | Purpose |
| :--- | :--- | :--- |
| **Motion** *(formerly Framer Motion)* | `^14.0.0` | Physics-based spring animations, gesture dragging (e.g. CardSwipe), layout transitions (`layoutId`), and mounting transitions (`AnimatePresence`). |
| **react-use-measure** | `^2.1.7` | Dynamic DOM measurement for smooth height and width transitions during accordion and popover expansions. |

### Physics Standards (`src/design-system/tokens.ts`)
- **Snappy Spring**: `stiffness: 420, damping: 32, mass: 0.8` (for tabs, switches, search bars).
- **Smooth Spring**: `stiffness: 260, damping: 26, mass: 1` (for modals, slide-out drawers, large cards).
- **Bouncy Spring**: `stiffness: 500, damping: 36` (for disclosures and accordions).

---

## 5. Iconography & Web Fonts

- **Lucide React (`^1.51.0`)**: 24px and 16px geometric outline icon system.
- **Font Stack**:
  - **Inter**: Clean UI sans-serif for dashboard elements, navigation, and controls.
  - **Outfit**: Editorial serif / display font for author headers, book titles, and pull quotes.
  - **JetBrains Mono**: Monospace font for stats, timestamps, category tags, and archival ledger badges.

---

## 6. Project Architecture Overview

```
stories-by-relay/
├── src/
│   ├── components/         # Shared app layout, headers, navigation bars
│   ├── design-system/      # Self-contained Watermelon UI & Tactile Card components
│   │   ├── ActivitiesCard.tsx
│   │   ├── AnimatedSearch.tsx
│   │   ├── AnimatedTabs.tsx
│   │   ├── CardSwipe.tsx
│   │   ├── ExpandableProfile.tsx
│   │   ├── FilterDisclosure.tsx
│   │   ├── MetricProgressCard.tsx
│   │   ├── OmniSearch.tsx
│   │   ├── TactileSlider.tsx
│   │   ├── WigglingCards.tsx
│   │   └── tokens.ts       # Central spring physics and tactile scale tokens
│   ├── data/               # Editorial mock data (manuscripts, authors, reviews)
│   ├── routes/             # TanStack Router file-based pages
│   │   ├── __root.tsx      # Root layout, theme provider, and document shell
│   │   ├── index.tsx       # Discovery / Hero landing page
│   │   ├── write.*.tsx     # Writer Studio & manuscript management
│   │   ├── library.tsx     # Reader personal library and reading history
│   │   └── design-system.tsx # Interactive Design System showcase
│   ├── routeTree.gen.ts    # Auto-generated type-safe router manifest
│   └── styles.css          # Tailwind CSS v4 `@theme` and color palettes
├── package.json
├── tsconfig.json
└── vite.config.ts
```
