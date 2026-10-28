-- Migration 29: Add Religion & Spirituality Category and Faith & Spirituality Genre
-- Expands platform taxonomy for spiritual literature, theological essays, and faith-inspired fiction.

-- 1. Insert Religion & Spirituality Category
INSERT INTO categories (name, slug, description, display_order, accent_letter, is_active, is_indexable)
VALUES
    ('Religion & Spirituality', 'religion-spirituality', 'Sacred texts, theological monographs, contemplative spiritual treatises, and faith-inspired prose.', 17, 'R', true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    accent_letter = EXCLUDED.accent_letter,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;

-- 2. Insert Faith & Spirituality Genre
INSERT INTO genres (name, slug, genre_group, description, display_order, is_active, is_indexable)
VALUES
    ('Faith & Spirituality', 'faith-spirituality', 'Other', 'Sacred journeys, theological dilemmas, divine wonder, and deep explorations of personal faith.', 34, true, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    genre_group = EXCLUDED.genre_group,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    is_indexable = EXCLUDED.is_indexable;
