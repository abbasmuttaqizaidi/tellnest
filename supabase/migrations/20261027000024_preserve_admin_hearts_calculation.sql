-- ==============================================================================
-- HatchPen Migration 24: Preserve Admin Hearts Adjustments & Calculation Integrity
-- ==============================================================================
-- Replaces row-count overwrite triggers with relative increments/decrements (+1 / -1).
-- This guarantees that when an admin manually sets or adjusts hearts for a work or
-- individual chapters, subsequent reader hearts never wipe out the admin adjustment.
-- The formula Total Hearts = Story Hearts + Sum(Chapter Hearts) is always maintained.

-- 1. Redefine update_chapter_like_count()
CREATE OR REPLACE FUNCTION update_chapter_like_count()
RETURNS TRIGGER AS $$
DECLARE
    target_chapter_id UUID;
    target_work_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        target_chapter_id := NEW.chapter_id;
        target_work_id := NEW.work_id;

        -- Relative +1 increment on chapter
        UPDATE chapters 
        SET like_count = GREATEST(0, COALESCE(like_count, 0) + 1) 
        WHERE id = target_chapter_id;

        -- Relative +1 increment on work total hearts
        IF target_work_id IS NOT NULL THEN
            UPDATE works 
            SET like_count = GREATEST(0, COALESCE(like_count, 0) + 1) 
            WHERE id = target_work_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        target_chapter_id := OLD.chapter_id;
        target_work_id := OLD.work_id;

        -- Relative -1 decrement on chapter
        UPDATE chapters 
        SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) 
        WHERE id = target_chapter_id;

        -- Relative -1 decrement on work total hearts
        IF target_work_id IS NOT NULL THEN
            UPDATE works 
            SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) 
            WHERE id = target_work_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_chapter_like_count ON chapter_likes;
CREATE TRIGGER trg_update_chapter_like_count
AFTER INSERT OR DELETE ON chapter_likes
FOR EACH ROW EXECUTE FUNCTION update_chapter_like_count();

-- 2. Redefine update_work_like_count()
CREATE OR REPLACE FUNCTION update_work_like_count()
RETURNS TRIGGER AS $$
DECLARE
    target_work_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        target_work_id := NEW.work_id;

        -- Relative +1 increment on work total hearts
        IF target_work_id IS NOT NULL THEN
            UPDATE works 
            SET like_count = GREATEST(0, COALESCE(like_count, 0) + 1) 
            WHERE id = target_work_id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        target_work_id := OLD.work_id;

        -- Relative -1 decrement on work total hearts
        IF target_work_id IS NOT NULL THEN
            UPDATE works 
            SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1) 
            WHERE id = target_work_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_work_like_count ON work_likes;
CREATE TRIGGER trg_update_work_like_count
AFTER INSERT OR DELETE ON work_likes
FOR EACH ROW EXECUTE FUNCTION update_work_like_count();
