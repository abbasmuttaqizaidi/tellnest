-- ==============================================================================
-- Tellnest Migration 08: Idempotent Seed Data for Categories, Genres & Content Warnings
-- ==============================================================================

-- 1. Seed Categories (Controlled Platform Taxonomy)
INSERT INTO categories (name, slug, description, display_order, is_active, is_indexable)
VALUES
    ('Fiction', 'fiction', 'General literary and narrative fiction across contemporary and timeless settings.', 1, true, true),
    ('Novels', 'novels', 'Full-length episodic books, epics, and character-driven serials.', 2, true, true),
    ('Short Stories', 'short-stories', 'Concise, focused prose works designed for single-sitting reading.', 3, true, true),
    ('Poetry', 'poetry', 'Verse, lyrical folios, experimental stanzas, and rhythmic writing.', 4, true, true),
    ('Essays', 'essays', 'Reflective cultural critique, philosophical inquiries, and personal commentary.', 5, true, true),
    ('Creative Non-Fiction', 'creative-non-fiction', 'True stories told with literary craft, vivid observation, and reportage.', 6, true, true),
    ('Personal Narratives', 'personal-narratives', 'First-person memoirs, personal journals, and lived experiences.', 7, true, true),
    ('Children''s Stories', 'childrens-stories', 'Illustrated narratives, moral fables, and young-reader fiction.', 8, true, true),
    ('Scripts', 'scripts', 'Theatrical plays, teleplays, radio scripts, and screenwriting drafts.', 9, true, true),
    ('Fan Fiction', 'fan-fiction', 'Community-created extensions and alternative timelines of beloved worlds.', 10, true, true),
    ('Serialized Stories', 'serialized-stories', 'Installment-based fiction released chapter by chapter on an episodic cadence.', 11, true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;

-- 2. Seed Genres (Controlled Platform Taxonomy)
INSERT INTO genres (name, slug, description, display_order, is_active, is_indexable)
VALUES
    ('Romance', 'romance', 'Stories of emotional intimacy, romantic tension, partnership, and affection.', 1, true, true),
    ('Fantasy', 'fantasy', 'Worlds of mythical magic, enchanted lore, surreal cosmology, and ancient powers.', 2, true, true),
    ('Mystery', 'mystery', 'Puzzles, investigative inquiries, unsolved crimes, and cerebral whodunits.', 3, true, true),
    ('Horror', 'horror', 'Psychological dread, visceral terror, atmospheric unease, and supernatural suspense.', 4, true, true),
    ('Science Fiction', 'science-fiction', 'Speculative futures, cosmic voyages, technological horizons, and cyberpunk noir.', 5, true, true),
    ('Thriller', 'thriller', 'High-stakes pacing, psychological games, geopolitical intrigue, and escalating danger.', 6, true, true),
    ('Historical', 'historical', 'Narratives grounded in past epochs, historical turning points, and period detail.', 7, true, true),
    ('Adventure', 'adventure', 'Expeditions into uncharted frontiers, survival odysseys, and relentless journeys.', 8, true, true),
    ('Drama', 'drama', 'Deep character studies, emotional crossroads, interpersonal conflict, and family sagas.', 9, true, true),
    ('Comedy', 'comedy', 'Satire, wit, absurdity, humorous sketches, and comedic relief.', 10, true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;

-- 3. Seed Content Warnings (Standardized Reader Safety Flags)
INSERT INTO content_warnings (name, slug, description, is_active)
VALUES
    ('Violence', 'violence', 'Depictions of physical combat, warfare, or graphic injury.', true),
    ('Self-harm', 'self-harm', 'References to or depictions of intentional self-harm or suicide.', true),
    ('Sexual Themes', 'sexual-themes', 'Mature romance, explicit intimacy, or sexual content.', true),
    ('Strong Language', 'strong-language', 'Profanity, crude dialogue, or vulgarity.', true),
    ('Abuse', 'abuse', 'Depictions of emotional, domestic, or physical mistreatment.', true),
    ('Disturbing Themes', 'disturbing-themes', 'Intense psychological distress, trauma, or horror.', true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;
