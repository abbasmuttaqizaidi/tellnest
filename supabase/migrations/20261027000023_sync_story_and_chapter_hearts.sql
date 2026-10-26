-- ==============================================================================
-- HatchPen Migration 23: Unified Total Hearts (Per-Story + Per-Chapter Sum)
-- ==============================================================================

-- 1. Helper Function to recalculate Total Hearts on a work:
-- Total Hearts = (Count of work_likes) + (Count of chapter_likes across all chapters of the work)
CREATE OR REPLACE FUNCTION sync_work_total_hearts(target_work_id UUID)
RETURNS VOID AS $$
DECLARE
    v_story_hearts BIGINT := 0;
    v_chapter_hearts BIGINT := 0;
BEGIN
    IF target_work_id IS NULL THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_story_hearts 
    FROM work_likes 
    WHERE work_id = target_work_id;

    SELECT COUNT(*) INTO v_chapter_hearts 
    FROM chapter_likes 
    WHERE work_id = target_work_id;

    UPDATE works 
    SET like_count = (COALESCE(v_story_hearts, 0) + COALESCE(v_chapter_hearts, 0)) 
    WHERE id = target_work_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger Function on chapter_likes
CREATE OR REPLACE FUNCTION update_chapter_like_count()
RETURNS TRIGGER AS $$
DECLARE
    target_chapter_id UUID;
    target_work_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        target_chapter_id := NEW.chapter_id;
        target_work_id := NEW.work_id;
    ELSE
        target_chapter_id := OLD.chapter_id;
        target_work_id := OLD.work_id;
    END IF;

    -- Update individual chapter count
    UPDATE chapters 
    SET like_count = (SELECT COUNT(*) FROM chapter_likes WHERE chapter_id = target_chapter_id) 
    WHERE id = target_chapter_id;

    -- Update work total hearts (sum of story hearts + chapter hearts)
    PERFORM sync_work_total_hearts(target_work_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chapter_like_count ON chapter_likes;
CREATE TRIGGER trg_update_chapter_like_count
AFTER INSERT OR DELETE ON chapter_likes
FOR EACH ROW EXECUTE FUNCTION update_chapter_like_count();

-- 3. Trigger Function on work_likes
CREATE OR REPLACE FUNCTION update_work_like_count()
RETURNS TRIGGER AS $$
DECLARE
    target_work_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        target_work_id := NEW.work_id;
    ELSE
        target_work_id := OLD.work_id;
    END IF;

    PERFORM sync_work_total_hearts(target_work_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_work_like_count ON work_likes;
CREATE TRIGGER trg_update_work_like_count
AFTER INSERT OR DELETE ON work_likes
FOR EACH ROW EXECUTE FUNCTION update_work_like_count();

-- 4. Initial Backfill: Synchronize all existing chapters and works
DO $$
DECLARE
    c RECORD;
    w RECORD;
BEGIN
    FOR c IN SELECT id FROM chapters LOOP
        UPDATE chapters 
        SET like_count = (SELECT COUNT(*) FROM chapter_likes WHERE chapter_id = c.id) 
        WHERE id = c.id;
    END LOOP;

    FOR w IN SELECT id FROM works LOOP
        PERFORM sync_work_total_hearts(w.id);
    END LOOP;
END $$;
