-- ==============================================================================
-- Tellnest Migration 12: Work Activity Bubble-Up Propagation
-- Tracks real-time narrative activity when acts or chapters are created/edited.
-- ==============================================================================

-- 1. Create Activity Type Enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_activity_type') THEN
        CREATE TYPE work_activity_type AS ENUM (
            'work_created',
            'work_metadata_updated',
            'act_created',
            'act_updated',
            'chapter_drafted',
            'chapter_updated',
            'chapter_published'
        );
    END IF;
END $$;

-- 2. Add Bubble-Up Activity Columns to works table
ALTER TABLE works 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_activity_type work_activity_type NOT NULL DEFAULT 'work_created',
ADD COLUMN IF NOT EXISTS last_activity_detail JSONB DEFAULT '{}'::jsonb;

-- 3. Create High-Performance Indexes for Recent Works Queries
CREATE INDEX IF NOT EXISTS idx_works_last_activity_at 
ON works(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_works_public_recent 
ON works(visibility, publication_status, last_activity_at DESC);

-- 4. Trigger Function: Bubble up chapter changes to parent work
CREATE OR REPLACE FUNCTION bubble_up_chapter_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_act_number INTEGER := NULL;
    v_act_title TEXT := NULL;
    v_activity_type work_activity_type;
BEGIN
    -- Fetch parent act details if chapter is linked to an act
    IF NEW.act_id IS NOT NULL THEN
        SELECT act_number, title INTO v_act_number, v_act_title
        FROM acts
        WHERE id = NEW.act_id;
    END IF;

    -- Determine activity type
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'published' THEN
            v_activity_type := 'chapter_published';
        ELSE
            v_activity_type := 'chapter_drafted';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status <> 'published' AND NEW.status = 'published' THEN
            v_activity_type := 'chapter_published';
        ELSE
            v_activity_type := 'chapter_updated';
        END IF;
    END IF;

    -- Update parent work record atomically
    UPDATE works
    SET 
        last_activity_at = COALESCE(NEW.updated_at, NOW()),
        last_activity_type = v_activity_type,
        last_activity_detail = jsonb_build_object(
            'chapter_id', NEW.id,
            'chapter_number', NEW.chapter_number,
            'chapter_title', NEW.title,
            'chapter_status', NEW.status,
            'act_id', NEW.act_id,
            'act_number', v_act_number,
            'act_title', v_act_title,
            'updated_at', COALESCE(NEW.updated_at, NOW())
        )
    WHERE id = NEW.work_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger on Chapters Table
DROP TRIGGER IF EXISTS trg_chapters_bubble_up_activity ON chapters;
CREATE TRIGGER trg_chapters_bubble_up_activity
AFTER INSERT OR UPDATE ON chapters
FOR EACH ROW
EXECUTE FUNCTION bubble_up_chapter_activity();

-- 6. Trigger Function: Bubble up act changes to parent work
CREATE OR REPLACE FUNCTION bubble_up_act_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_activity_type work_activity_type;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_activity_type := 'act_created';
    ELSE
        v_activity_type := 'act_updated';
    END IF;

    UPDATE works
    SET 
        last_activity_at = COALESCE(NEW.updated_at, NOW()),
        last_activity_type = v_activity_type,
        last_activity_detail = jsonb_build_object(
            'act_id', NEW.id,
            'act_number', NEW.act_number,
            'act_title', NEW.title,
            'act_status', NEW.status,
            'updated_at', COALESCE(NEW.updated_at, NOW())
        )
    WHERE id = NEW.work_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger on Acts Table
DROP TRIGGER IF EXISTS trg_acts_bubble_up_activity ON acts;
CREATE TRIGGER trg_acts_bubble_up_activity
AFTER INSERT OR UPDATE ON acts
FOR EACH ROW
EXECUTE FUNCTION bubble_up_act_activity();

-- 8. Backfill existing works: Set last_activity_at based on latest chapter or act timestamp
UPDATE works w
SET 
    last_activity_at = COALESCE(
        (SELECT MAX(updated_at) FROM chapters WHERE work_id = w.id),
        (SELECT MAX(updated_at) FROM acts WHERE work_id = w.id),
        w.updated_at,
        w.created_at
    ),
    last_activity_type = CASE 
        WHEN EXISTS (SELECT 1 FROM chapters WHERE work_id = w.id AND status = 'published') THEN 'chapter_published'::work_activity_type
        WHEN EXISTS (SELECT 1 FROM chapters WHERE work_id = w.id) THEN 'chapter_updated'::work_activity_type
        ELSE 'work_created'::work_activity_type
    END,
    last_activity_detail = COALESCE(
        (
            SELECT jsonb_build_object(
                'chapter_id', c.id,
                'chapter_number', c.chapter_number,
                'chapter_title', c.title,
                'chapter_status', c.status,
                'act_id', c.act_id,
                'updated_at', c.updated_at
            )
            FROM chapters c 
            WHERE c.work_id = w.id 
            ORDER BY c.updated_at DESC 
            LIMIT 1
        ),
        '{}'::jsonb
    );
