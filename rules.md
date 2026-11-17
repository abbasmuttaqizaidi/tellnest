# Engineering & Development Rules — Stories by Relay (Hatchpen)

**Document Version:** 1.0.0  
**Status:** Living Canonical Guidelines  
**Scope:** Universal Engineering Standards, Component Lifecycle, Architecture, and Agent Workflows  
**Last Updated:** October 2026  

---

## 1. What To Do / Allowed Practices

### 1.1. Aggressive Component & Logic Reuse (Highest Priority)
- **Design System First**: Apart from elementary markup, UI components and interaction logic **must always be reused**. 
- **Centralized Primitives**: Check `src/design-system/` before writing any UI. All buttons, tabs, dropdowns, disclosures, inputs, modals, cards, sliders, and badges must be reused directly.
- **Logic & Hook Sharing**: Data fetching utilities, state hooks, and calculation algorithms (such as reading time, date formatters, and collection filtering) must be extracted and reused across pages rather than duplicated.
- **Composable Abstractions**: If a component needs minor adaptation for a new route, extend it via props/variants rather than cloning or writing a new bespoke component.

### 1.2. Filter & Taxonomy Values Reusability
- **Single Source of Truth**: All filter attributes (Categories, Genres, Statuses, Sort criteria, Collections) must strictly reuse centralized values from `src/lib/taxonomy.ts`, `live_instructions.md`, and `useApp()` in `src/context/AppContext.tsx`.
- **No Hardcoded Filter Lists**: Do not hardcode ad-hoc categories, genres, or status arrays inside route components. Always consume `categories`, `genres`, and canonical taxonomies.

---

## 2. What NOT To Do / Prohibited Practices

### 2.1. Zero Regression on Existing Features (Especially Auth Flows)
- **Strict Auth Flow Preservation**: The login, signup, user sync, and onboarding flows (`@clerk/react`, `ClerkSync.tsx`, `AuthModal.tsx`, `UserOnboardingModal.tsx`, `sso-callback.tsx`) must **never be broken or hindered**.
- **No Regression Policy**: When adding new features or modifying shared utilities, thoroughly verify that existing reader, writer, and library behaviors continue to function seamlessly without regressions.

### 2.2. Git Directives (Strict)
- **Do NOT Push to Git**: Under **no circumstances** should code be pushed to remote Git repositories (`git push`) unless the user explicitly and directly requests it.

### 2.3. No Ad-Hoc / Custom Controls
- **Exclusive Use of Design System**: You are **strictly prohibited** from creating ad-hoc buttons (`<button className="...">`), native unstyled dropdowns, bespoke search inputs, or custom card containers directly inside routes.
- **Mandatory Imports**: Tabs (`AnimatedTabs`, `DiscreteDisclosureTabs`), inputs/search (`AnimatedSearch`, `OmniSearch`), cards (`SpotlightCard`, `ActivitiesCard`, etc.), and overlays (`Modal`, `Drawer`) must originate from `src/design-system`.
- **System Expansion Protocol**: If a new interaction variant is genuinely needed, build it inside `src/design-system/`, export it in `src/design-system/index.ts`, document it in `/design-system`, and only then consume it in routes.

---

## 3. Robust Error Handling

- **Graceful Fallbacks**: Every asynchronous operation, server function (`createServerFn`), and database call must include explicit `try...catch` blocks with user-friendly error fallbacks.
- **Empty & Error UI States**: Always render graceful empty/error states (using `EmptyState.tsx` or Toast notifications) rather than crashing or leaving blank views.
- **Type Validation**: Server function inputs and mutations must use runtime validators or strict TypeScript checks before processing data.

---

## 4. Strict Separation of Public vs. Private Routes

- **Public Routes**: Accessible by unauthenticated guests (e.g. `/`, `/discover`, `/works/$workId`, `/read/$workId/$chapterId`, `/author/$authorId`, `/category/$slug`, `/genre/$slug`, `/design-system`).
- **Private / Protected Routes**: Require active user credentials and session validation (e.g. `/write/*`, `/library`, `/following`, `/settings`, `/profile`).
- **Route Guards**: Protected views must enforce authentication via `ProtectedRoute.tsx` or redirect to `AuthModal` with return-URL preservation.
- **Admin Isolation**: Admin routes (`/secret-adminpanel`, `/admin-work-editor.$workId`) must enforce server-verified admin tokens (`verifyAdminSessionServerFn`).

---

## 5. End-to-End Page SEO Orientation

- **Metadata Architecture**: Every route must implement TanStack Router `head` functions utilizing `generateMeta(...)` from `src/lib/seo.ts`.
- **Canonical URLs & OpenGraph**: Each page must provide:
  - Concise, descriptive, editorial `title`
  - High-relevance, keyword-rich `description`
  - Canonical URL (`canonicalUrl`)
  - Semantic OpenGraph tags (`ogType`, `ogImage`)
- **Structured Data (Schema.org)**: Public pages (Books, Chapters, Authors, Collections) must include valid JSON-LD (`Book`, `CollectionPage`, `ProfilePage`, `Organization`).

---

## 6. SEO-Driven Editorial Text & Content Structure

- **Search Discoverability**: All on-page headings, subtitles, descriptions, and placeholder copy must be written with SEO clarity so literary works, genres, and themes can be easily indexed by search engines and discovered via internal search.
- **Semantic HTML Hierarchy**: Pages must use strict semantic headings (`h1` for page titles, `h2` for primary content sections, `h3` for cards) and clean paragraph typography (`font-serif`, `leading-relaxed`).

---

## 7. Language & Communication Standards

- **Conversational Tone**: Conversations with the user must **always be in Hinglish** (casual, polite, and natural blend of Hindi and English).
- **Code & Documentation**: All source code, interfaces, comments, commit messages, and documentation files (`PRD.md`, `Architecture.md`, `rules.md`, `Description.md`, etc.) must **always be strictly written in professional English**.

---

## 8. Locked Feature Specification: User Onboarding Flow (Immutable)

**Status:** LOCKED / CANONICAL SPECIFICATION  
**Scope:** `src/routes/onboarding.tsx`, `src/server/authors.ts`, `src/routes/__root.tsx`  
**Rule:** No changes, refactorings, or modifications are allowed to this flow without explicit instruction from the product owner.

### 8.1. Architecture, Triggers & Incomplete State Protection
- **Full-Page Route**: Onboarding operates as a dedicated full-page route at `/onboarding` (replaces legacy popup modal).
- **Navigation Bar Preserved**: The top Header (`<Header />`) is maintained and visible on the page.
- **Center Alignment**: Onboarding card container (`max-w-lg w-full`) is vertically and horizontally centered with standard responsive padding.
- **Strictly NO Icons**: Pure, minimalist editorial typography without icons in headings, steps, or buttons.
- **Durability Guarantee**: If a user abandons mid-way, closes the browser, shuts the tab, or refreshes, `onboarding_completed` remains strictly `false` in Supabase `profiles`. No local storage completion flag is set prematurely.
- **Signup Separation**:
  - Standard signups with incomplete onboarding are routed to `/onboarding`.
  - Chapter readers (`reader_gate`) are never interrupted during chapter reading; they are guided to `/onboarding` via the persistent Warning Banner.

### 8.2. Step 1: Personal Details
- **Heading**: "Personal Details".
- **Display Name**: Prepopulated from Clerk or email prefix; editable.
- **Unique Username**: Mandatory, 3–30 chars, lowercase letters/numbers/underscores only (`^[a-z0-9_]{3,30}$`). Must be verified before proceeding.
- **Pronouns & Gender**: Optional identity dropdowns.
- **Terms Acceptance**: Mandatory checkbox for Terms of Service and Privacy Policy.
- **Continue Button**: Full width of the card container (`w-full`), strictly contained within the centered container (never spans full screen width).

### 8.3. Step 2: Reading Preferences & Completion
- **Heading**: "Reading Preferences".
- **Default State**: Starts empty (`[]`), requiring active user selection.
- **Reading Genres**: Mandatory minimum 1, strictly capped at maximum 5. Silent ceiling ignores clicks beyond 5.
- **Writer Intent**: Optional checkbox routing to `/write` upon completion.
- **Action Buttons**: Full container width (`w-full`) "Complete Profile" button, with a "Back to Personal Details" button underneath.
- **Transition**: Atomically completes onboarding, sets `signup_source = 'standard'`, sets `reader_gate_converted = true` for reader signups, invalidates router, and routes to `/` (or `/write`).
  - Silent ceiling: Clicking beyond 3 is ignored silently without error banners; excess chips are dimmed.
- **Writer Intent Card ("I want to publish my own serialized stories on Hatchpen")**:
  - Highlights the 5-month New Voices Showcase priority spotlight.
  - Checkbox state persisted to `profiles.preferences.interestedInWriting: boolean`.
- **Mobile-First Footer Layout**:
  - Primary button ("Complete & Start Reading") is 100% full-width (`w-full`), centered, with even padding on mobile.
  - Secondary button ("Back to Profile") sits neatly underneath on mobile screens (`flex-col-reverse sm:flex-row`).

### 8.4. Completion & Transition Screen (Option 1)
- **Atomic Persistence**: Persists `onboarding_completed = true`, identity fields, and `{ interests, genres, categories, interestedInWriting, termsAccepted, completedAt }` into Supabase `profiles` and Clerk public metadata.
- **1.3-Second Curation Interstitial**:
  - Reader: Pulsing Sparkles badge + *"Personalizing Your Reading Sanctuary..."* + animated progress bar.
  - Writer: Pulsing Quill/Pen badge (`PenLine`) + *"Setting Up Your Writer Studio..."* + animated progress bar.
- **Seamless Router Refresh**: Triggers `router.invalidate()` in the background to avoid hard browser flickers.
- **Routing**: Readers remain smoothly on Home (`/`) with updated recommendations; writers route to Writer Studio (`/write`).

