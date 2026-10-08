-- ==============================================================================
-- Tellnest Migration 11: Align Content Taxonomy with live_instructions.md
-- Canonical 16 Categories, 32 Genres (Grouped), and Suggested Tags
-- ==============================================================================

-- 1. Ensure columns exist on categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS accent_letter TEXT DEFAULT 'A';

-- 2. Ensure columns exist on genres table
ALTER TABLE genres
  ADD COLUMN IF NOT EXISTS genre_group TEXT DEFAULT 'Other';

-- 3. Upsert Canonical 16 Categories from live_instructions.md
INSERT INTO categories (name, slug, description, display_order, accent_letter, is_active, is_indexable)
VALUES
    ('Novels', 'novels', 'Long-form narrative architecture with deep character psychology and continuous arcs.', 1, 'N', true, true),
    ('Short Stories', 'short-stories', 'Compressed, sharp, and impactful singular narratives designed for solitary reading.', 2, 'S', true, true),
    ('Flash Fiction', 'flash-fiction', 'Micro-narratives and ultra-short fiction delivering swift emotional impact.', 3, 'F', true, true),
    ('Serialized Fiction', 'serialized-fiction', 'Episodic storytelling released installment by installment with evolving arcs.', 4, 'Z', true, true),
    ('Poetry', 'poetry', 'Verse, cadence, and measured brevity exploring memory, form, and quiet revelations.', 5, 'P', true, true),
    ('Essays', 'essays', 'Thoughtful cultural critiques, literary philosophy, and meditations on contemporary life.', 6, 'E', true, true),
    ('Non‑Fiction', 'non-fiction', 'Fact-based accounts, investigative analysis, journalism, and historical scholarship.', 7, 'X', true, true),
    ('Memoir / Autobiography', 'memoir-autobiography', 'Firsthand dispatches of transformation, grief, lived memory, and human endurance.', 8, 'M', true, true),
    ('Children’s Fiction', 'childrens-fiction', 'Fables, wonder, and moral architecture crafted for young minds and early readers.', 9, 'C', true, true),
    ('Middle Grade', 'middle-grade', 'Rich adventures, family dynamics, and identity discoveries for young adolescent readers.', 10, 'G', true, true),
    ('Young Adult (YA)', 'young-adult-ya', 'Intense journeys of identity, belonging, first love, and boundary-testing youth.', 11, 'Y', true, true),
    ('New Adult', 'new-adult', 'Stories navigating early adulthood, collegiate life, independence, and career crossroads.', 12, 'A', true, true),
    ('Fan Fiction', 'fan-fiction', 'Reimagined mythologies and character explorations set in established fictional universes.', 13, 'K', true, true),
    ('Anthologies / Collections', 'anthologies-collections', 'Themed compilations, polyphonic voices, and curated suites of interconnected prose.', 14, 'O', true, true),
    ('Graphic Novels / Comics', 'graphic-novels-comics', 'Visual storytelling manuscripts, comic scripts, and graphic narrative compositions.', 15, 'V', true, true),
    ('Scripts / Screenplays', 'scripts-screenplays', 'Theatrical manuscripts, teleplays, radio dramas, and cinematic screenplay drafts.', 16, 'D', true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    accent_letter = EXCLUDED.accent_letter,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;

-- 4. Upsert Canonical 32 Genres grouped by type from live_instructions.md
INSERT INTO genres (name, slug, genre_group, description, display_order, is_active, is_indexable)
VALUES
    -- Literary / General
    ('Literary Fiction', 'literary-fiction', 'Literary / General', 'Focus on prose craftsmanship, deep interiority, and philosophical nuance.', 1, true, true),
    ('Contemporary Fiction', 'contemporary-fiction', 'Literary / General', 'Realist storytelling situated firmly in modern society and everyday life.', 2, true, true),
    ('General Fiction', 'general-fiction', 'Literary / General', 'Broad narrative prose exploring human relationships, life changes, and communities.', 3, true, true),

    -- Thriller / Mystery
    ('Thriller', 'thriller', 'Thriller / Mystery', 'High-tension pacing, relentless suspense, and high-stakes survival.', 4, true, true),
    ('Mystery', 'mystery', 'Thriller / Mystery', 'Procedural deductions, unresolved riddles, and secrets buried beneath civility.', 5, true, true),
    ('Psychological Thriller', 'psychological-thriller', 'Thriller / Mystery', 'Unreliable minds, claustrophobic mind games, paranoia, and internal dread.', 6, true, true),
    ('Crime', 'crime', 'Thriller / Mystery', 'Underworld dynamics, detective investigations, moral gray zones, and law enforcement.', 7, true, true),
    ('Espionage / Spy', 'espionage-spy', 'Thriller / Mystery', 'Clandestine intelligence agencies, tradecraft, geopolitical subterfuge, and double agents.', 8, true, true),

    -- Speculative
    ('Science Fiction', 'science-fiction', 'Speculative', 'Technological futures, speculative physics, planetary solitude, and synthetic consciousness.', 9, true, true),
    ('Dystopian', 'dystopian', 'Speculative', 'Totalitarian regimes, environmental collapse, surveillance states, and resistance.', 10, true, true),
    ('Cyberpunk', 'cyberpunk', 'Speculative', 'High tech, low life: neon-soaked megacities, neural nets, and cybernetic survival.', 11, true, true),
    ('Space Opera', 'space-opera', 'Speculative', 'Grand interstellar empires, massive fleets, galactic voyages, and heroic conflicts.', 12, true, true),
    ('Fantasy', 'fantasy', 'Speculative', 'Ancient archives, subtle magics, mythic dynasties, and cartographic voyages.', 13, true, true),
    ('Dark Fantasy', 'dark-fantasy', 'Speculative', 'Grim magical worlds fraught with dread, moral ambiguity, and monstrous powers.', 14, true, true),
    ('Magical Realism', 'magical-realism', 'Speculative', 'Subtle enchantments seamlessly blended into otherwise grounded and realistic daily life.', 15, true, true),
    ('Horror', 'horror', 'Speculative', 'Visceral fear, supernatural entities, uncanny dread, and cosmic vulnerability.', 16, true, true),

    -- Romance
    ('Romance', 'romance', 'Romance', 'Intimacy, longing, fragile pacts, and the magnetic pull between two people.', 17, true, true),
    ('Dark Romance', 'dark-romance', 'Romance', 'Complex, morally ambiguous romantic dynamics with intense and forbidden stakes.', 18, true, true),
    ('Contemporary Romance', 'contemporary-romance', 'Romance', 'Modern love stories featuring relatable conflicts, witty banter, and heartfelt resolutions.', 19, true, true),
    ('Historical Romance', 'historical-romance', 'Romance', 'Period-accurate courtships, aristocratic secrets, ballrooms, and period passion.', 20, true, true),
    ('LGBTQ+ Romance', 'lgbtq-romance', 'Romance', 'Queer love stories celebrating diversity, emotional vulnerability, and connection.', 21, true, true),
    ('Erotic Romance', 'erotic-romance', 'Romance', 'Sensual, highly intimate romantic narratives where physical desire drives emotional arcs.', 22, true, true),
    ('Paranormal Romance', 'paranormal-romance', 'Romance', 'Passionate entanglements between mortals and supernatural or folkloric beings.', 23, true, true),

    -- Historical / War
    ('Historical Fiction', 'historical-fiction', 'Historical / War', 'Faithful recreations of vanished centuries, archives, eras, and cultural milestones.', 24, true, true),
    ('War Fiction', 'war-fiction', 'Historical / War', 'Combat realism, home-front endurance, tactical history, and the human cost of conflict.', 25, true, true),
    ('Alternate History', 'alternate-history', 'Historical / War', 'Divergent timelines exploring how world events might have unfolded differently.', 26, true, true),

    -- Young / Coming‑of‑Age
    ('Young Adult (YA)', 'young-adult-ya', 'Young / Coming‑of‑Age', 'Narratives dealing with high-school horizons, identity tests, and adolescent discovery.', 27, true, true),
    ('New Adult', 'new-adult', 'Young / Coming‑of‑Age', 'Navigating post-academic choices, independence, early heartbreak, and vocational grit.', 28, true, true),
    ('Coming‑of‑Age', 'coming-of-age', 'Young / Coming‑of‑Age', 'The tender and painful passage from innocence to experience and self-definition.', 29, true, true),

    -- Other
    ('Slice of Life', 'slice-of-life', 'Other', 'Quiet, observant vignettes capturing the beauty and rhythm of mundane daily moments.', 30, true, true),
    ('Family Drama', 'family-drama', 'Other', 'Generational tensions, buried domestic grievances, and reconciliation across lineage.', 31, true, true),
    ('Political Fiction', 'political-fiction', 'Other', 'Power struggles, ideological debates, statecraft, and elections behind closed doors.', 32, true, true),
    ('Philosophical Fiction', 'philosophical-fiction', 'Other', 'Narrative meditations exploring ontology, ethics, existential purpose, and truth.', 33, true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    genre_group = EXCLUDED.genre_group,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;

-- 5. Seed Core Suggested Tags into tags table for quick lookup and suggestions
INSERT INTO tags (name, slug)
VALUES
    ('Memory', 'memory'),
    ('Isolation', 'isolation'),
    ('Identity', 'identity'),
    ('Betrayal', 'betrayal'),
    ('Revenge', 'revenge'),
    ('Redemption', 'redemption'),
    ('Survival', 'survival'),
    ('Power & Corruption', 'power-corruption'),
    ('Family Secrets', 'family-secrets'),
    ('Forbidden Love', 'forbidden-love'),
    ('Obsession', 'obsession'),
    ('Trauma', 'trauma'),
    ('Healing', 'healing'),
    ('Ambition', 'ambition'),
    ('Loss', 'loss'),
    ('Friendship', 'friendship'),
    ('Coming‑of‑Age', 'coming-of-age'),
    ('Social Justice', 'social-justice'),
    ('Class Divide', 'class-divide'),
    ('Immigration / Diaspora', 'immigration-diaspora'),
    ('Urban', 'urban'),
    ('Small Town', 'small-town'),
    ('Rural', 'rural'),
    ('Arctic / High Latitude', 'arctic-high-latitude'),
    ('Desert', 'desert'),
    ('Coastal', 'coastal'),
    ('Mountain', 'mountain'),
    ('Historical Setting', 'historical-setting'),
    ('Futuristic City', 'futuristic-city'),
    ('Space / Space Station', 'space-space-station'),
    ('School / College', 'school-college'),
    ('Workplace', 'workplace'),
    ('Hospital', 'hospital'),
    ('Prison', 'prison'),
    ('Bunker / Underground', 'bunker-underground'),
    ('Virtual World / Metaverse', 'virtual-world-metaverse'),
    ('Engineer Protagonist', 'engineer-protagonist'),
    ('Detective / Investigator', 'detective-investigator'),
    ('Anti‑Hero', 'anti-hero'),
    ('Unreliable Narrator', 'unreliable-narrator'),
    ('Strong Female Lead', 'strong-female-lead'),
    ('LGBTQ+ Lead', 'lgbtq-lead'),
    ('Multiple POV', 'multiple-pov'),
    ('Ensemble Cast', 'ensemble-cast'),
    ('Villain Protagonist', 'villain-protagonist'),
    ('Child Protagonist', 'child-protagonist'),
    ('Slow‑Burn', 'slow-burn'),
    ('Fast‑Paced', 'fast-paced'),
    ('Multiple Timelines', 'multiple-timelines'),
    ('Non‑Linear Narrative', 'non-linear-narrative'),
    ('Epistolary', 'epistolary'),
    ('Found Footage / Logs', 'found-footage-logs'),
    ('Mystery Box', 'mystery-box'),
    ('Twist Ending', 'twist-ending'),
    ('Open Ending', 'open-ending'),
    ('Series / Saga', 'series-saga'),
    ('Standalone', 'standalone'),
    ('Dark', 'dark'),
    ('Gritty', 'gritty'),
    ('Paranoid Atmosphere', 'paranoid-atmosphere'),
    ('Hopeful', 'hopeful'),
    ('Melancholic', 'melancholic'),
    ('Humorous', 'humorous'),
    ('Satirical', 'satirical'),
    ('Romantic', 'romantic'),
    ('Erotic', 'erotic'),
    ('Horror‑Tinged', 'horror-tinged'),
    ('Dreamlike', 'dreamlike')
ON CONFLICT (slug) DO NOTHING;
