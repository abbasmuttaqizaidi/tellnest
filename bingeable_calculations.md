# HatchPen Bingeable Reads — Architecture, Calculation Engine & Cross-Section Rules

> **Version**: 1.0.0  
> **Target Environment**: HatchPen Production (`hatchpen.com`)  
> **Target Surface**: Homepage Discovery (`LoggedInHome.tsx` & Discovery Feed)  
> **Last Verified**: October 2026

---

## 1. Executive Summary & Core Philosophy

**"Bingeable Reads for You"** is a dedicated discovery shelf designed for readers who want complete or near-complete short-format fiction that can be fully consumed in a single reading sitting.

Unlike multi-arc serials that span tens or hundreds of chapters, "Bingeable" stories deliver immediate gratification without cliffhangers that require waiting weeks for new updates.

### Core Principles:
1. **Single-Sitting Depth ($\le 2$ Chapters)**: Strictly reserved for manuscripts with **1 or 2 published chapters** (novelettes, flash fiction, complete two-chapter arcs, and standalone short fiction).
2. **Personalized Taste Matching ("For You")**: Prioritizes stories whose genres and tags align with the authenticated reader's active reading history and selected preferences.
3. **Deterministic Isolation from New Voices Showcase**: Bingeable manuscripts are strictly **prohibited from appearing in the New Voices Showcase**, preserving New Voices exclusively for developing multi-chapter serials ($> 2$ chapters).
4. **Co-existence with Recommended**: A story may appear concurrently in both "Recommended For You" and "Bingeable Reads for You" without artificial suppression.
5. **Trending Inviolability**: The global Trending V1 weekly leaderboard remains completely independent and is never modified, filtered, or displaced by Bingeable selections.

---

## 2. Eligibility Criteria

A work/story must satisfy all of the following conditions to qualify for the Bingeable Reads shelf:

| Rule | Requirement | Purpose |
| :--- | :--- | :--- |
| **Chapter Threshold** | $1 \le \text{PublishedChaptersCount} \le 2$ | Enforces the bite-sized, single-sitting reading promise. |
| **Publication Status** | $\text{publicationStatus} = \text{'published'} \land \text{status} \ne \text{'Draft'}$ | Strictly excludes unreleased drafts or unpublished works. |
| **Visibility** | $\text{visibility} = \text{'Public'} \land \text{isIndexable} \ne \text{false}$ | Strictly excludes private or unlisted works. |
| **Non-Cancelled** | $\text{status} \ne \text{'cancelled'}$ | Excludes abandoned or cancelled works. |
| **Authorship Exclusion** | $\text{authorId} \ne \text{CurrentUserId}$ | Authors never see their own works in discovery shelves. |

Stories with **3 or more chapters** ($> 2$) are disqualified from Bingeable Reads and belong to serial discovery sections (Trending, New Voices, or standard Recommended).

---

## 3. Mathematical Scoring & Personalization Formula

Candidate works meeting eligibility are ranked using an affinity and engagement score:

$$\text{BingeScore} = \text{AffinityBonus} + \text{CompletionBonus} + \text{MomentumScore}$$

### 3.1 Component Breakdown

1. **Genre & Interest Affinity ($\text{AffinityBonus}$)**:
   - Primary genre match with reader's reading history or preferences: **$+40\text{ points}$**
   - Secondary genre or tag match: **$+20\text{ points}$** per tag (capped at $+40$)
   - No affinity signal (guest/cold start): **$0\text{ points}$**

2. **Completion Status Bonus ($\text{CompletionBonus}$)**:
   - If work status is explicitly `Completed`: **$+30\text{ points}$**
   - If work status is `Ongoing` (with $\le 2$ chapters): **$+10\text{ points}$**

3. **Momentum Score ($\text{MomentumScore}$)**:
   - Logarithmically scaled engagement to avoid vanity runaways:
     $$\text{MomentumScore} = 5 \times \ln(1 + \text{totalReads}) + 3 \times \ln(1 + \text{totalSaves})$$

4. **Tie-Breaker**:
   - If two stories share the exact same $\text{BingeScore}$, ties break deterministically by:
     $$\text{PublishedAt Descending} \longrightarrow \text{Story UUID Ascending}$$

---

## 4. Cross-Section Interaction Rules Matrix

| Section | Can Bingeable Story ($\le 2$ ch) Appear Here? | Mutual Exclusion Rule |
| :--- | :--- | :--- |
| **Trending Serials** | **YES** (if qualified by 7-day algorithm) | **Independent**: Trending leaderboard integrity is preserved with zero modifications. |
| **Recommended For You** | **YES** | **Co-existence Allowed**: High-scoring short works can feature in both sections simultaneously. |
| **New Voices Showcase** | **NO (STRICTLY PROHIBITED)** | **Exclusive**: Stories with $\le 2$ chapters are excluded from New Voices. New Voices is reserved for serials with $> 2$ chapters. |
| **Saved Shelf** | **YES** | User's personal bookmarks always display regardless of length. |

---

## 5. UI/UX Specifications

- **Section Identifier**: `#bingeable-reads`
- **Section Title**: `Bingeable Reads for You`
- **Section Subtitle**: `Quick, complete stories and two-chapter arcs you can finish in one sitting.`
- **Card Badges**:
  - 1 Chapter: `⚡ 1 Chapter • Quick Read`
  - 2 Chapters: `⚡ 2 Chapters • Short Arc`
- **Layout**: Horizontal smooth-scrolling carousel with scroll-snap, responsive width (`145px` to `170px`), cover art, genre pill, bookmark toggle, and reading time indicator.
