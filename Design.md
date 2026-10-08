# Design System Specification & Token Architecture — Stories by Relay (Hatchpen)

**Document Version:** 1.0.0  
**Status:** Living Canonical Design System Specification  
**Design Philosophy:** Editorial High-Craft, Monochrome Print Typography & Grounded Spring Physics  
**Source Code Token Files:** `src/styles.css` & `src/design-system/tokens.ts`  
**Last Updated:** October 2026  

---

## 1. Design Vision & Philosophy

**Stories by Relay (Hatchpen)** is crafted at the intersection of classical literary typography and reactive, tactile software. 

### Core Design Pillars
1. **Monochrome Print Heritage**: High-contrast ink, unbleached paper canvas, and archival metadata replace vibrant digital accents.
2. **Tri-Theme Reading Engine**: Seamless adaptation across **Light (Warm Paper)**, **Dark (Obsidian Ledger)**, and **Sepia (Eye-Strain Reduction)**.
3. **Mechanical Tactility**: Micro-interactions rely on physics-grounded spring transitions (`motion/react`) rather than artificial, floaty easings.
4. **Zero Layout Shifts**: Expanding pills, disclosure sheets, and ledgers are strictly anchored or rendered via portals/drawers to preserve reader immersion.
5. **Strict Design Token Discipline**: Every color, border, shadow, and transition references synchronized tokens. Hardcoded values (e.g., `bg-blue-500`, `text-gray-400`) are prohibited.

---

## 2. Typography Token Architecture

Typography is mapped to three semantic layers defined in `@theme` inside `src/styles.css`:

```css
@theme {
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-serif: "Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

### Semantic Typography Classes
| Class Name | Font Family | Intended Use Case |
| :--- | :--- | :--- |
| **`font-editorial`** | `var(--font-serif)` | Book titles, manuscript headings, chapter titling, display quotes (`Outfit`). |
| **`font-editorial-italic`** | `var(--font-serif)` + *italic* | Editorial pull quotes, epigraphs, sub-headings. |
| **`font-interface`** | `var(--font-sans)` | Button labels, system navigation, reader settings, body prose (`Inter`). |
| **`font-metadata`** | `var(--font-mono)` | Word counts, read time, chapter numbers, tags, status badges (`JetBrains Mono`). |

---

## 3. Color Token System (Tri-Theme Synchronized Matrix)

Colors are strictly driven by CSS Custom Variables declared in `src/styles.css`. Below is the synchronized token matrix across all three supported themes:

| Semantic Token | High-Contrast Light (Default) | Obsidian Dark (`[data-theme="dark"]`) | Warm Sepia (`[data-theme="sepia"]`) | Purpose & Semantic Role |
| :--- | :--- | :--- | :--- | :--- |
| **`--bg-canvas`** | `#fbfaf7` *(Warm Literary Paper)* | `#090D14` *(Deep Obsidian)* | `#F6F1EA` *(Warm Book Cloth)* | Page viewport background |
| **`--bg-surface`** | `#ffffff` *(Crisp Page)* | `#111722` *(Elevated Surface)* | `#FAF7F2` *(Natural Parchment)* | Cards, Modals, Menus, Dropdowns |
| **`--bg-subtle`** | `#f4f2ec` *(Soft Warm Tint)* | `#172030` *(Subtle Layer)* | `#EDE5DA` *(Aged Paper Fill)* | Pill badges, Hover fills, Recessed areas |
| **`--border-subtle`** | `#e6e3da` *(Hairline Edge)* | `#1E293B` *(Dark Divider)* | `#E0D5C5` *(Sepia Hairline)* | Container borders, Divider rules |
| **`--border-strong`** | `#d3cfc4` *(Focused Rule)* | `#334155` *(Active Border)* | `#CEC0AD` *(Defined Stroke)* | Active tabs, Focused inputs, Hover states |
| **`--ink-primary`** | `#191c1e` *(Printer's Black)* | `#F8FAFC` *(Crisp White)* | `#2C2219` *(Warm Espresso Ink)* | Primary headings, Titles, Active tabs |
| **`--ink-secondary`**| `#2d3133` *(Charcoal Text)* | `#E2E8F0` *(Off-White Ink)* | `#4A3A2C` *(Deep Sepia Text)* | Body prose, Sub-headings, Secondary labels |
| **`--ink-muted`** | `#575f6e` *(Archival Slate)* | `#94A3B8` *(Muted Slate)* | `#7A6553` *(Muted Earth Ink)* | Metadata, Timestamps, Captions, Icons |
| **`--ink-faint`** | `#80848e` *(Watermark Ink)* | `#64748B` *(Faint Steel)* | `#A69280` *(Soft Tan Ink)* | Tertiary indicators, Subtle badges |
| **`--accent-ink`** | `#191c1e` | `#F8FAFC` | `#2C2219` | High-contrast callouts & button fills |
| **`--accent-contrast`**| `#ffffff` | `#090D14` | `#F6F1EA` | Text displayed over `--accent-ink` |

### Supplementary Material Design Tokens
| Token | Light Value | Dark Value | Role |
| :--- | :--- | :--- | :--- |
| **`--color-surface-container-low`** | `#f2f4f6` | `#141820` | Recessed background sections |
| **`--color-surface-container`** | `#eceef0` | `#1a202c` | Standard form background |
| **`--color-surface-container-high`** | `#e6e8ea` | `#242c3d` | Elevated dialog container |
| **`--color-surface-container-highest`**| `#e0e3e5` | `#2d3748` | Highest elevation layers |
| **`--color-surface-container-lowest`** | `#ffffff` | `#0d1117` | Lowest surface base |

---

## 4. Motion & Spring Physics Tokens

All physical motion parameters are centralized in `src/design-system/tokens.ts` and consumed via `motion/react`. Linear and non-physics easings are banned.

```ts
export const SPRINGS = {
  // Snappy spring for tabs, pills, and small controls
  snappy: {
    type: 'spring' as const,
    stiffness: 420,
    damping: 32,
    mass: 0.8,
  },
  // Gentle, elegant spring for cards, dialogs, and large surfaces
  smooth: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 1,
  },
  // Bouncy spring for disclosures and accordions
  bouncy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 36,
  },
}
```

### Tap Feedback Tokens
```ts
export const TAPS = {
  button: { scale: 0.97 },  // Tactile micro-press feedback
  card: { scale: 0.985 },   // Card surface click feedback
  subtle: { scale: 0.99 },  // Subtle disclosure press
}
```

---

## 5. Card & Surface Tokens (`CARD_TOKENS`)

To ensure zero visual fragmentation across all 9 Watermelon cards and feature cards:

```ts
export const CARD_TOKENS = {
  // Border standards
  border: 'border border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
  borderDefault: 'border border-[var(--border-subtle)]',
  borderHover: 'hover:border-[var(--border-strong)]',
  
  // Shadow standards
  shadow: 'shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]',
  shadowDefault: 'shadow-[0_4px_20px_rgba(0,0,0,0.03)]',
  shadowHover: 'hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)]',
  
  // Unified card container utility class
  base: 'border border-[var(--border-subtle)] hover:border-[var(--border-strong)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.06)] transition-all',
}
```

---

## 6. Primitives & Interaction Patterns

### 6.1. Navigation Tabs
1. **`AnimatedTabs` (Continuous Tabs)**:
   - Uses Framer Motion `layoutId="active-tab-indicator"` for a liquid sliding background pill.
   - Ideal for primary collection navigation (`New Chapters This Week`, `Trending`, etc.).
2. **`DiscreteTabs` (Individual Expanding Pills)**:
   - Independent pill buttons where active selection expands width (`width: auto`, `opacity: 1`) to reveal the label with sliding shine animation.
3. **`DiscreteDisclosureTabs` (Expanding Tab + Anchored Dropdown)**:
   - Designed for secondary filter toolbars (`Sort`, `Status`, `Genre`).
   - Pill expands on click and anchors a floating dropdown directly underneath (`top-full mt-2`).
   - Uses dynamic viewport boundary check (`effectiveAlign: left | right`) to prevent horizontal screen overflow.

### 6.2. Search Primitives
1. **`AnimatedSearch`**: Offers 7 editorial variants (`curtain-reveal`, `expandable`, `pill`, `minimal`, `split-pill`, `typewriter`, `spotlight`).
2. **`OmniSearch`**: Compound search combining category cycling, filter scopes, and ghost placeholder typing.
3. **`PaletteSearch`**: Floating `Cmd+K` command palette with shortcut badge indicators.

### 6.3. Overlays & Ledgers
1. **`Modal`**: Centered backdrop modal with spring entry, scroll lock, and ESC key listener.
2. **`Drawer`**: Bidirectional sheet (`left` or `right`) for reading settings and chapter navigation.
3. **`ActivitiesCard`**: Executive activity ledger with `popover` or `drawer` modes to guarantee **zero unintended layout shifts**.

---

## 7. Strict Design System Implementation Rules

1. **NO RAW CONTROLS**: No native unstyled `<button>`, `<input>`, or raw card divs inside feature routes. Everything must originate from `src/design-system/`.
2. **USE SEMANTIC CSS TOKENS**: Colors must use `var(--ink-*)`, `var(--bg-*)`, and `var(--border-*)`. Never use hardcoded Tailwind palettes (`bg-blue-500`, `text-gray-400`).
3. **PREVENT LAYOUT SHIFT**: Popups, toolbars, and filter disclosures must be anchored with absolute positioning or rendered in drawers/portals so surrounding elements are never pushed.
4. **MOTION CONSISTENCY**: Always configure `transition={SPRINGS.snappy}` or `transition={SPRINGS.smooth}`. Linear easing is strictly prohibited.
5. **ACCESSIBILITY & FOCUS**: Interactive elements must support full keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`) and provide clear `focus-visible:ring-1` focus indicators.
