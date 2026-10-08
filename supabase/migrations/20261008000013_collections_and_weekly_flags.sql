-- Migration 13: Collections and Weekly Flag Computation
-- Implements instructions from live_instructions.md lines 196-230
-- Every work exposes:
-- 1. new_this_week (boolean): brand-new work published in the current calendar week (Monday to Sunday)
-- 2. new_chapters_this_week (boolean): existing work published BEFORE current week that had a new act or chapter published during the current week.
--    Strict rule: Act or chapter removal or text edits MUST NOT trigger new_chapters_this_week.
-- 3. collections (TEXT[]): List of collection slugs/names that this work belongs to (e.g. ['new_this_week', 'trending_now', ...])

-- 1. Add curated collections column to works if not present
ALTER TABLE public.works
    ADD COLUMN IF NOT EXISTS curated_collections TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. Create PostgreSQL function to compute collection metadata for a work
CREATE OR REPLACE FUNCTION public.compute_work_collections(p_work_id UUID)
RETURNS TABLE (
    new_this_week BOOLEAN,
    new_chapters_this_week BOOLEAN,
    collections TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_work_created_at TIMESTAMPTZ;
    v_work_status work_status;
    v_work_pub_status publication_status;
    v_view_count BIGINT;
    v_like_count BIGINT;
    v_save_count BIGINT;
    v_curated TEXT[];
    v_week_start TIMESTAMPTZ;
    v_is_new_this_week BOOLEAN := FALSE;
    v_is_new_chapters_this_week BOOLEAN := FALSE;
    v_has_recent_new_act BOOLEAN := FALSE;
    v_has_recent_new_chapter BOOLEAN := FALSE;
    v_collections_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Current week boundaries (Monday 00:00:00 UTC to Sunday 23:59:59 UTC)
    v_week_start := date_trunc('week', NOW());

    -- Fetch target work metadata
    SELECT 
        created_at, 
        status, 
        publication_status, 
        view_count, 
        like_count, 
        save_count, 
        COALESCE(curated_collections, ARRAY[]::TEXT[])
    INTO 
        v_work_created_at, 
        v_work_status, 
        v_work_pub_status, 
        v_view_count, 
        v_like_count, 
        v_save_count, 
        v_curated
    FROM public.works
    WHERE id = p_work_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Only published works participate in public discovery collections
    IF v_work_pub_status <> 'published' THEN
        new_this_week := FALSE;
        new_chapters_this_week := FALSE;
        collections := ARRAY[]::TEXT[];
        RETURN NEXT;
        RETURN;
    END IF;

    -- 1. Check New This Week:
    -- Brand-new work created during the current week
    IF v_work_created_at >= v_week_start THEN
        v_is_new_this_week := TRUE;
        v_is_new_chapters_this_week := FALSE; -- STRICT: brand new work does not have new_chapters_this_week = true
        v_collections_list := array_append(v_collections_list, 'new_this_week');
    ELSE
        -- 2. Check New Chapters This Week:
        -- ONLY works published BEFORE current week qualify
        -- Must have a new act OR chapter created (NOT just updated) on/after Monday
        SELECT EXISTS (
            SELECT 1 FROM public.acts
            WHERE work_id = p_work_id
              AND created_at >= v_week_start
              AND status = 'published'
        ) INTO v_has_recent_new_act;

        SELECT EXISTS (
            SELECT 1 FROM public.chapters
            WHERE work_id = p_work_id
              AND created_at >= v_week_start
              AND status = 'published'
        ) INTO v_has_recent_new_chapter;

        IF v_has_recent_new_act OR v_has_recent_new_chapter THEN
            v_is_new_chapters_this_week := TRUE;
            v_collections_list := array_append(v_collections_list, 'new_chapters_this_week');
        END IF;
    END IF;

    -- 3. Automatic collection: Trending Now & Rising Stories based on reads/engagement
    IF (v_view_count >= 500 OR (v_like_count + v_save_count) >= 50) THEN
        v_collections_list := array_append(v_collections_list, 'trending_now');
    ELSIF (v_view_count >= 100 OR (v_like_count + v_save_count) >= 15) THEN
        v_collections_list := array_append(v_collections_list, 'rising_stories');
    END IF;

    -- 4. Append Curated editorial collections (e.g. editor_picks, fresh_voices, breakout_stories, spotlight, staff_favorites)
    IF array_length(v_curated, 1) > 0 THEN
        v_collections_list := array_cat(v_collections_list, v_curated);
    END IF;

    new_this_week := v_is_new_this_week;
    new_chapters_this_week := v_is_new_chapters_this_week;
    collections := v_collections_list;
    RETURN NEXT;
END;
$$;

-- 3. Create a view for public works that exposes collection flags and collections array
CREATE OR REPLACE VIEW public.works_with_collections AS
SELECT 
    w.*,
    COALESCE(col.new_this_week, FALSE) AS new_this_week,
    COALESCE(col.new_chapters_this_week, FALSE) AS new_chapters_this_week,
    COALESCE(col.collections, ARRAY[]::TEXT[]) AS collections
FROM public.works w
CROSS JOIN LATERAL public.compute_work_collections(w.id) col;

-- 4. Grant access to public view
GRANT SELECT ON public.works_with_collections TO anon, authenticated, service_role;
