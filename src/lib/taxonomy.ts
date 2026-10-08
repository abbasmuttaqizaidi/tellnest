// ==============================================================================
// Tellnest Global Taxonomy (Single Source of Truth)
// Canonical Categories, Genres, and Suggested Tags strictly defined in live_instructions.md
// ==============================================================================

export interface GlobalCategory {
  id: string
  name: string
  slug: string
  description: string
  accentLetter: string
  displayOrder: number
  worksCount?: number
}

export interface GlobalGenre {
  id: string
  name: string
  slug: string
  group: string
  description: string
  displayOrder: number
  worksCount?: number
}

/**
 * 16 Canonical Categories strictly from live_instructions.md
 */
export const GLOBAL_CATEGORIES: GlobalCategory[] = [
  {
    id: 'cat-novels',
    name: 'Novels',
    slug: 'novels',
    description: 'Long-form narrative architecture with deep character psychology and continuous arcs.',
    accentLetter: 'N',
    displayOrder: 1,
    worksCount: 890,
  },
  {
    id: 'cat-short-stories',
    name: 'Short Stories',
    slug: 'short-stories',
    description: 'Compressed, sharp, and impactful singular narratives designed for solitary reading.',
    accentLetter: 'S',
    displayOrder: 2,
    worksCount: 2310,
  },
  {
    id: 'cat-flash-fiction',
    name: 'Flash Fiction',
    slug: 'flash-fiction',
    description: 'Micro-narratives and ultra-short fiction delivering swift emotional impact.',
    accentLetter: 'F',
    displayOrder: 3,
    worksCount: 520,
  },
  {
    id: 'cat-serialized-fiction',
    name: 'Serialized Fiction',
    slug: 'serialized-fiction',
    description: 'Episodic storytelling released installment by installment with evolving arcs.',
    accentLetter: 'Z',
    displayOrder: 4,
    worksCount: 1420,
  },
  {
    id: 'cat-poetry',
    name: 'Poetry',
    slug: 'poetry',
    description: 'Verse, cadence, and measured brevity exploring memory, form, and quiet revelations.',
    accentLetter: 'P',
    displayOrder: 5,
    worksCount: 940,
  },
  {
    id: 'cat-essays',
    name: 'Essays',
    slug: 'essays',
    description: 'Thoughtful cultural critiques, literary philosophy, and meditations on contemporary life.',
    accentLetter: 'E',
    displayOrder: 6,
    worksCount: 1640,
  },
  {
    id: 'cat-non-fiction',
    name: 'Non‑Fiction',
    slug: 'non-fiction',
    description: 'Fact-based accounts, investigative analysis, journalism, and historical scholarship.',
    accentLetter: 'X',
    displayOrder: 7,
    worksCount: 780,
  },
  {
    id: 'cat-memoir-autobiography',
    name: 'Memoir / Autobiography',
    slug: 'memoir-autobiography',
    description: 'Firsthand dispatches of transformation, grief, lived memory, and human endurance.',
    accentLetter: 'M',
    displayOrder: 8,
    worksCount: 650,
  },
  {
    id: 'cat-childrens-fiction',
    name: 'Children’s Fiction',
    slug: 'childrens-fiction',
    description: 'Fables, wonder, and moral architecture crafted for young minds and early readers.',
    accentLetter: 'C',
    displayOrder: 9,
    worksCount: 410,
  },
  {
    id: 'cat-middle-grade',
    name: 'Middle Grade',
    slug: 'middle-grade',
    description: 'Rich adventures, family dynamics, and identity discoveries for young adolescent readers.',
    accentLetter: 'G',
    displayOrder: 10,
    worksCount: 380,
  },
  {
    id: 'cat-young-adult',
    name: 'Young Adult (YA)',
    slug: 'young-adult-ya',
    description: 'Intense journeys of identity, belonging, first love, and boundary-testing youth.',
    accentLetter: 'Y',
    displayOrder: 11,
    worksCount: 1190,
  },
  {
    id: 'cat-new-adult',
    name: 'New Adult',
    slug: 'new-adult',
    description: 'Stories navigating early adulthood, collegiate life, independence, and career crossroads.',
    accentLetter: 'A',
    displayOrder: 12,
    worksCount: 470,
  },
  {
    id: 'cat-fan-fiction',
    name: 'Fan Fiction',
    slug: 'fan-fiction',
    description: 'Reimagined mythologies and character explorations set in established fictional universes.',
    accentLetter: 'K',
    displayOrder: 13,
    worksCount: 1850,
  },
  {
    id: 'cat-anthologies-collections',
    name: 'Anthologies / Collections',
    slug: 'anthologies-collections',
    description: 'Themed compilations, polyphonic voices, and curated suites of interconnected prose.',
    accentLetter: 'O',
    displayOrder: 14,
    worksCount: 310,
  },
  {
    id: 'cat-graphic-novels-comics',
    name: 'Graphic Novels / Comics',
    slug: 'graphic-novels-comics',
    description: 'Visual storytelling manuscripts, comic scripts, and graphic narrative compositions.',
    accentLetter: 'V',
    displayOrder: 15,
    worksCount: 290,
  },
  {
    id: 'cat-scripts-screenplays',
    name: 'Scripts / Screenplays',
    slug: 'scripts-screenplays',
    description: 'Theatrical manuscripts, teleplays, radio dramas, and cinematic screenplay drafts.',
    accentLetter: 'D',
    displayOrder: 16,
    worksCount: 320,
  },
]

/**
 * 32 Canonical Genres strictly grouped from live_instructions.md
 */
export const GLOBAL_GENRES: GlobalGenre[] = [
  // ── Literary / General ──────────────────────────────────────────────
  {
    id: 'genre-literary-fiction',
    name: 'Literary Fiction',
    slug: 'literary-fiction',
    group: 'Literary / General',
    description: 'Focus on prose craftsmanship, deep interiority, and philosophical nuance.',
    displayOrder: 1,
    worksCount: 1840,
  },
  {
    id: 'genre-contemporary-fiction',
    name: 'Contemporary Fiction',
    slug: 'contemporary-fiction',
    group: 'Literary / General',
    description: 'Realist storytelling situated firmly in modern society and everyday life.',
    displayOrder: 2,
    worksCount: 1210,
  },
  {
    id: 'genre-general-fiction',
    name: 'General Fiction',
    slug: 'general-fiction',
    group: 'Literary / General',
    description: 'Broad narrative prose exploring human relationships, life changes, and communities.',
    displayOrder: 3,
    worksCount: 890,
  },

  // ── Thriller / Mystery ─────────────────────────────────────────────
  {
    id: 'genre-thriller',
    name: 'Thriller',
    slug: 'thriller',
    group: 'Thriller / Mystery',
    description: 'High-tension pacing, relentless suspense, and high-stakes survival.',
    displayOrder: 4,
    worksCount: 820,
  },
  {
    id: 'genre-mystery',
    name: 'Mystery',
    slug: 'mystery',
    group: 'Thriller / Mystery',
    description: 'Procedural deductions, unresolved riddles, and secrets buried beneath civility.',
    displayOrder: 5,
    worksCount: 960,
  },
  {
    id: 'genre-psychological-thriller',
    name: 'Psychological Thriller',
    slug: 'psychological-thriller',
    group: 'Thriller / Mystery',
    description: 'Unreliable minds, claustrophobic mind games, paranoia, and internal dread.',
    displayOrder: 6,
    worksCount: 710,
  },
  {
    id: 'genre-crime',
    name: 'Crime',
    slug: 'crime',
    group: 'Thriller / Mystery',
    description: 'Underworld dynamics, detective investigations, moral gray zones, and law enforcement.',
    displayOrder: 7,
    worksCount: 640,
  },
  {
    id: 'genre-espionage-spy',
    name: 'Espionage / Spy',
    slug: 'espionage-spy',
    group: 'Thriller / Mystery',
    description: 'Clandestine intelligence agencies, tradecraft, geopolitical subterfuge, and double agents.',
    displayOrder: 8,
    worksCount: 390,
  },

  // ── Speculative ────────────────────────────────────────────────────
  {
    id: 'genre-science-fiction',
    name: 'Science Fiction',
    slug: 'science-fiction',
    group: 'Speculative',
    description: 'Technological futures, speculative physics, planetary solitude, and synthetic consciousness.',
    displayOrder: 9,
    worksCount: 1140,
  },
  {
    id: 'genre-dystopian',
    name: 'Dystopian',
    slug: 'dystopian',
    group: 'Speculative',
    description: 'Totalitarian regimes, environmental collapse, surveillance states, and resistance.',
    displayOrder: 10,
    worksCount: 730,
  },
  {
    id: 'genre-cyberpunk',
    name: 'Cyberpunk',
    slug: 'cyberpunk',
    group: 'Speculative',
    description: 'High tech, low life: neon-soaked megacities, neural nets, and cybernetic survival.',
    displayOrder: 11,
    worksCount: 450,
  },
  {
    id: 'genre-space-opera',
    name: 'Space Opera',
    slug: 'space-opera',
    group: 'Speculative',
    description: 'Grand interstellar empires, massive fleets, galactic voyages, and heroic conflicts.',
    displayOrder: 12,
    worksCount: 380,
  },
  {
    id: 'genre-fantasy',
    name: 'Fantasy',
    slug: 'fantasy',
    group: 'Speculative',
    description: 'Ancient archives, subtle magics, mythic dynasties, and cartographic voyages.',
    displayOrder: 13,
    worksCount: 1390,
  },
  {
    id: 'genre-dark-fantasy',
    name: 'Dark Fantasy',
    slug: 'dark-fantasy',
    group: 'Speculative',
    description: 'Grim magical worlds fraught with dread, moral ambiguity, and monstrous powers.',
    displayOrder: 14,
    worksCount: 520,
  },
  {
    id: 'genre-magical-realism',
    name: 'Magical Realism',
    slug: 'magical-realism',
    group: 'Speculative',
    description: 'Subtle enchantments seamlessly blended into otherwise grounded and realistic daily life.',
    displayOrder: 15,
    worksCount: 610,
  },
  {
    id: 'genre-horror',
    name: 'Horror',
    slug: 'horror',
    group: 'Speculative',
    description: 'Visceral fear, supernatural entities, uncanny dread, and cosmic vulnerability.',
    displayOrder: 16,
    worksCount: 540,
  },

  // ── Romance ────────────────────────────────────────────────────────
  {
    id: 'genre-romance',
    name: 'Romance',
    slug: 'romance',
    group: 'Romance',
    description: 'Intimacy, longing, fragile pacts, and the magnetic pull between two people.',
    displayOrder: 17,
    worksCount: 1580,
  },
  {
    id: 'genre-dark-romance',
    name: 'Dark Romance',
    slug: 'dark-romance',
    group: 'Romance',
    description: 'Complex, morally ambiguous romantic dynamics with intense and forbidden stakes.',
    displayOrder: 18,
    worksCount: 420,
  },
  {
    id: 'genre-contemporary-romance',
    name: 'Contemporary Romance',
    slug: 'contemporary-romance',
    group: 'Romance',
    description: 'Modern love stories featuring relatable conflicts, witty banter, and heartfelt resolutions.',
    displayOrder: 19,
    worksCount: 890,
  },
  {
    id: 'genre-historical-romance',
    name: 'Historical Romance',
    slug: 'historical-romance',
    group: 'Romance',
    description: 'Period-accurate courtships, aristocratic secrets, ballrooms, and period passion.',
    displayOrder: 20,
    worksCount: 460,
  },
  {
    id: 'genre-lgbtq-romance',
    name: 'LGBTQ+ Romance',
    slug: 'lgbtq-romance',
    group: 'Romance',
    description: 'Queer love stories celebrating diversity, emotional vulnerability, and connection.',
    displayOrder: 21,
    worksCount: 680,
  },
  {
    id: 'genre-erotic-romance',
    name: 'Erotic Romance',
    slug: 'erotic-romance',
    group: 'Romance',
    description: 'Sensual, highly intimate romantic narratives where physical desire drives emotional arcs.',
    displayOrder: 22,
    worksCount: 310,
  },
  {
    id: 'genre-paranormal-romance',
    name: 'Paranormal Romance',
    slug: 'paranormal-romance',
    group: 'Romance',
    description: 'Passionate entanglements between mortals and supernatural or folkloric beings.',
    displayOrder: 23,
    worksCount: 340,
  },

  // ── Historical / War ────────────────────────────────────────────────
  {
    id: 'genre-historical-fiction',
    name: 'Historical Fiction',
    slug: 'historical-fiction',
    group: 'Historical / War',
    description: 'Faithful recreations of vanished centuries, archives, eras, and cultural milestones.',
    displayOrder: 24,
    worksCount: 670,
  },
  {
    id: 'genre-war-fiction',
    name: 'War Fiction',
    slug: 'war-fiction',
    group: 'Historical / War',
    description: 'Combat realism, home-front endurance, tactical history, and the human cost of conflict.',
    displayOrder: 25,
    worksCount: 290,
  },
  {
    id: 'genre-alternate-history',
    name: 'Alternate History',
    slug: 'alternate-history',
    group: 'Historical / War',
    description: 'Divergent timelines exploring how world events might have unfolded differently.',
    displayOrder: 26,
    worksCount: 330,
  },

  // ── Young / Coming‑of‑Age ───────────────────────────────────────────
  {
    id: 'genre-young-adult',
    name: 'Young Adult (YA)',
    slug: 'young-adult-ya',
    group: 'Young / Coming‑of‑Age',
    description: 'Narratives dealing with high-school horizons, identity tests, and adolescent discovery.',
    displayOrder: 27,
    worksCount: 820,
  },
  {
    id: 'genre-new-adult-genre',
    name: 'New Adult',
    slug: 'new-adult',
    group: 'Young / Coming‑of‑Age',
    description: 'Navigating post-academic choices, independence, early heartbreak, and vocational grit.',
    displayOrder: 28,
    worksCount: 390,
  },
  {
    id: 'genre-coming-of-age',
    name: 'Coming‑of‑Age',
    slug: 'coming-of-age',
    group: 'Young / Coming‑of‑Age',
    description: 'The tender and painful passage from innocence to experience and self-definition.',
    displayOrder: 29,
    worksCount: 610,
  },

  // ── Other ───────────────────────────────────────────────────────────
  {
    id: 'genre-slice-of-life',
    name: 'Slice of Life',
    slug: 'slice-of-life',
    group: 'Other',
    description: 'Quiet, observant vignettes capturing the beauty and rhythm of mundane daily moments.',
    displayOrder: 30,
    worksCount: 440,
  },
  {
    id: 'genre-family-drama',
    name: 'Family Drama',
    slug: 'family-drama',
    group: 'Other',
    description: 'Generational tensions, buried domestic grievances, and reconciliation across lineage.',
    displayOrder: 31,
    worksCount: 510,
  },
  {
    id: 'genre-political-fiction',
    name: 'Political Fiction',
    slug: 'political-fiction',
    group: 'Other',
    description: 'Power struggles, ideological debates, statecraft, and elections behind closed doors.',
    displayOrder: 32,
    worksCount: 360,
  },
  {
    id: 'genre-philosophical-fiction',
    name: 'Philosophical Fiction',
    slug: 'philosophical-fiction',
    group: 'Other',
    description: 'Narrative meditations exploring ontology, ethics, existential purpose, and truth.',
    displayOrder: 33,
    worksCount: 490,
  },
]

/**
 * Unique Genre Groups for UI categorization (Dropdown optgroups, tabs, etc.)
 */
export const GENRE_GROUPS: string[] = [
  'Literary / General',
  'Thriller / Mystery',
  'Speculative',
  'Romance',
  'Historical / War',
  'Young / Coming‑of‑Age',
  'Other',
]

/**
 * Suggested Discovery Tags grouped strictly from live_instructions.md
 */
export const SUGGESTED_TAGS = {
  Themes: [
    'Memory',
    'Isolation',
    'Identity',
    'Betrayal',
    'Revenge',
    'Redemption',
    'Survival',
    'Power & Corruption',
    'Family Secrets',
    'Forbidden Love',
    'Obsession',
    'Trauma',
    'Healing',
    'Ambition',
    'Loss',
    'Friendship',
    'Coming‑of‑Age',
    'Social Justice',
    'Class Divide',
    'Immigration / Diaspora',
  ],
  Settings: [
    'Urban',
    'Small Town',
    'Rural',
    'Arctic / High Latitude',
    'Desert',
    'Coastal',
    'Mountain',
    'Historical Setting',
    'Futuristic City',
    'Space / Space Station',
    'School / College',
    'Workplace',
    'Hospital',
    'Prison',
    'Bunker / Underground',
    'Virtual World / Metaverse',
  ],
  CharacterTypes: [
    'Engineer Protagonist',
    'Detective / Investigator',
    'Anti‑Hero',
    'Unreliable Narrator',
    'Strong Female Lead',
    'LGBTQ+ Lead',
    'Multiple POV',
    'Ensemble Cast',
    'Villain Protagonist',
    'Child Protagonist',
  ],
  PlotAndStructure: [
    'Slow‑Burn',
    'Fast‑Paced',
    'Multiple Timelines',
    'Non‑Linear Narrative',
    'Epistolary (letters, emails, logs)',
    'Found Footage / Logs',
    'Mystery Box',
    'Twist Ending',
    'Open Ending',
    'Series / Saga',
    'Standalone',
  ],
  ToneAndMood: [
    'Dark',
    'Gritty',
    'Paranoid Atmosphere',
    'Hopeful',
    'Melancholic',
    'Humorous',
    'Satirical',
    'Romantic',
    'Erotic',
    'Horror‑Tinged',
    'Dreamlike',
  ],
  ContentNotes: [
    'Violence',
    'Gore',
    'Sexual Content',
    'Strong Language',
    'Mental Health Themes',
    'Substance Use',
    'Abuse Themes',
  ],
} as const

/**
 * Flat list of all suggested tags for easy autocomplete / validation
 */
export const ALL_SUGGESTED_TAGS: string[] = [
  ...SUGGESTED_TAGS.Themes,
  ...SUGGESTED_TAGS.Settings,
  ...SUGGESTED_TAGS.CharacterTypes,
  ...SUGGESTED_TAGS.PlotAndStructure,
  ...SUGGESTED_TAGS.ToneAndMood,
  ...SUGGESTED_TAGS.ContentNotes,
]

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Helper to normalize slug from name
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Look up a category by either name or slug
 */
export function findCategory(identifier: string): GlobalCategory | undefined {
  const clean = identifier.trim().toLowerCase()
  return GLOBAL_CATEGORIES.find(
    (c) => c.slug === clean || c.name.toLowerCase() === clean
  )
}

/**
 * Look up a genre by either name or slug
 */
export function findGenre(identifier: string): GlobalGenre | undefined {
  const clean = identifier.trim().toLowerCase()
  return GLOBAL_GENRES.find(
    (g) => g.slug === clean || g.name.toLowerCase() === clean
  )
}
