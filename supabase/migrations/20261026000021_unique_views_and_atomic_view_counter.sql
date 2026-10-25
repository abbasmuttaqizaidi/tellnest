-- ==============================================================================
-- Tellnest Migration 21: Unique Views Table & Atomic View Counter Functions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS unique_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_key TEXT NOT NULL,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    view_type TEXT NOT NULL CHECK (view_type IN ('work', 'chapter')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to prevent duplicate views for the same viewer on the same work
CREATE UNIQUE INDEX IF NOT EXISTS uq_unique_views_work 
    ON unique_views(viewer_key, work_id) 
    WHERE chapter_id IS NULL;

-- Unique index to prevent duplicate views for the same viewer on the same chapter
CREATE UNIQUE INDEX IF NOT EXISTS uq_unique_views_chapter 
    ON unique_views(viewer_key, work_id, chapter_id) 
    WHERE chapter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unique_views_work ON unique_views(work_id);
CREATE INDEX IF NOT EXISTS idx_unique_views_chapter ON unique_views(chapter_id);

-- Enable RLS (Service role strictly)
ALTER TABLE unique_views ENABLE ROW LEVEL SECURITY;

-- Atomic increment stored procedures to prevent lost updates under concurrency
CREATE OR REPLACE FUNCTION increment_work_view(work_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_views BIGINT;
BEGIN
    UPDATE works
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = work_id
    RETURNING view_count INTO v_views;
    RETURN COALESCE(v_views, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION increment_chapter_view(chapter_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_views BIGINT;
BEGIN
    UPDATE chapters
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = chapter_id
    RETURNING view_count INTO v_views;
    RETURN COALESCE(v_views, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Restrict RPC execution strictly to service_role to prevent public client PostgREST exploitation
REVOKE ALL ON FUNCTION increment_work_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_work_view(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION increment_work_view(UUID) TO service_role;

REVOKE ALL ON FUNCTION increment_chapter_view(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_chapter_view(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION increment_chapter_view(UUID) TO service_role;

