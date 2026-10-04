-- ==============================================================================
-- Tellnest Migration 04: Works, Chapters, and Classification Junctions
-- ==============================================================================

-- 1. Works (Core Content Entity: Novels, Stories, Essays, Serialized Fiction)
CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image_path TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    status work_status NOT NULL DEFAULT 'ongoing',
    visibility work_visibility NOT NULL DEFAULT 'draft',
    publication_status publication_status NOT NULL DEFAULT 'draft',
    is_indexable BOOLEAN NOT NULL DEFAULT true,
    content_rating content_rating NOT NULL DEFAULT 'general',
    content_warning_required BOOLEAN NOT NULL DEFAULT false,
    content_warning_text TEXT,
    reading_time_minutes INTEGER DEFAULT 0,
    word_count INTEGER NOT NULL DEFAULT 0,
    chapter_count INTEGER NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    like_count BIGINT NOT NULL DEFAULT 0,
    save_count BIGINT NOT NULL DEFAULT 0,
    comment_count BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ,
    last_published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_works_slug ON works(slug);
CREATE INDEX IF NOT EXISTS idx_works_author_id ON works(author_id);
CREATE INDEX IF NOT EXISTS idx_works_category_id ON works(category_id);
CREATE INDEX IF NOT EXISTS idx_works_public_discovery ON works(visibility, publication_status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_indexable ON works(is_indexable);
CREATE INDEX IF NOT EXISTS idx_works_search ON works USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

CREATE TRIGGER trg_works_updated_at
BEFORE UPDATE ON works
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Chapters (Serialized Chapter Text Stored in PostgreSQL)
CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt TEXT,
    word_count INTEGER NOT NULL DEFAULT 0,
    reading_time_minutes INTEGER NOT NULL DEFAULT 0,
    status chapter_status NOT NULL DEFAULT 'draft',
    is_indexable BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_chapter_number UNIQUE (work_id, chapter_number),
    CONSTRAINT uq_work_chapter_slug UNIQUE (work_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chapters_work_status ON chapters(work_id, status, chapter_number ASC);
CREATE INDEX IF NOT EXISTS idx_chapters_published_at ON chapters(published_at);

CREATE TRIGGER trg_chapters_updated_at
BEFORE UPDATE ON chapters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3. Work <-> Genre (Many-to-Many)
CREATE TABLE IF NOT EXISTS work_genres (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (work_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_work_genres_genre ON work_genres(genre_id);

-- 4. Work <-> Tag (Many-to-Many)
CREATE TABLE IF NOT EXISTS work_tags (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (work_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_work_tags_tag ON work_tags(tag_id);

-- 5. Work <-> Content Warning (Many-to-Many)
CREATE TABLE IF NOT EXISTS work_content_warnings (
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    content_warning_id UUID NOT NULL REFERENCES content_warnings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (work_id, content_warning_id)
);

CREATE INDEX IF NOT EXISTS idx_work_content_warnings_warning ON work_content_warnings(content_warning_id);
