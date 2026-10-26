-- ==============================================================================
-- HatchPen Migration 22: Chapter Likes / Hearts & Counter Triggers
-- ==============================================================================

-- 1. Ensure like_count column exists on chapters
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS like_count BIGINT NOT NULL DEFAULT 0;

-- 2. Create chapter_likes table
CREATE TABLE IF NOT EXISTS chapter_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chapter_likes UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_likes_chapter ON chapter_likes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_likes_work ON chapter_likes(work_id);
CREATE INDEX IF NOT EXISTS idx_chapter_likes_user ON chapter_likes(user_id);

-- 3. Row Level Security
ALTER TABLE chapter_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Chapter likes are publicly readable" ON chapter_likes;
    CREATE POLICY "Chapter likes are publicly readable" ON chapter_likes
        FOR SELECT USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can like chapters" ON chapter_likes;
    CREATE POLICY "Authenticated users can like chapters" ON chapter_likes
        FOR INSERT WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can remove chapter likes" ON chapter_likes;
    CREATE POLICY "Users can remove chapter likes" ON chapter_likes
        FOR DELETE USING (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 4. Trigger to maintain accurate like_count on chapters and works
CREATE OR REPLACE FUNCTION update_chapter_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chapters SET like_count = like_count + 1 WHERE id = NEW.chapter_id;
        UPDATE works SET like_count = like_count + 1 WHERE id = NEW.work_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE chapters SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.chapter_id;
        UPDATE works SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.work_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chapter_like_count ON chapter_likes;
CREATE TRIGGER trg_update_chapter_like_count
AFTER INSERT OR DELETE ON chapter_likes
FOR EACH ROW EXECUTE FUNCTION update_chapter_like_count();
