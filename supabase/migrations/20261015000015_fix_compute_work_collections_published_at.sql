-- ==============================================================================
-- Migration 15: Fix compute_work_collections to use published_at for weekly flags
-- ==============================================================================
-- Replaces technical debt from Migration 13 where created_at was checked instead of published_at.
--
-- Rules:
-- 1. Explicit UTC Week Boundaries:
--    Computes Monday 00:00:00.000 UTC to next Monday 00:00:00.000 UTC using:
--    (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
--    Guaranteeing strict UTC calendar week boundaries regardless of session TimeZone.
-- 2. new_this_week (BOOLEAN):
--    Brand-new work first published during the current calendar week [week_start, next_week_start).
--    - Evaluates immutable published_at timestamp, NOT created_at.
--    - Drafts (publication_status <> 'published') exit early with empty collections.
--    - Published works with null or future published_at do not qualify for new_this_week.
--    - Works created earlier as drafts but first published this week DO qualify.
-- 3. new_chapters_this_week (BOOLEAN):
--    Existing work published BEFORE current week (published_at < week_start)
--    that had a new act or chapter published during the current week.
-- 4. Preserves All Collections:
--    Trending Now, Rising Stories, and curated editorial collections (editor_picks,
--    spotlight, staff_favorites) remain completely preserved.

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
    v_work_published_at TIMESTAMPTZ;
    v_work_status public.work_status;
    v_work_pub_status public.publication_status;
    v_view_count BIGINT;
    v_like_count BIGINT;
    v_save_count BIGINT;
    v_curated TEXT[];
    v_week_start TIMESTAMPTZ;
    v_next_week_start TIMESTAMPTZ;
    v_is_new_this_week BOOLEAN := FALSE;
    v_is_new_chapters_this_week BOOLEAN := FALSE;
    v_has_recent_new_act BOOLEAN := FALSE;
    v_has_recent_new_chapter BOOLEAN := FALSE;
    v_collections_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Strict UTC calendar week boundaries: [Monday 00:00:00 UTC, next Monday 00:00:00 UTC)
    -- Explicitly truncates in UTC so session TimeZone cannot shift the boundary
    v_week_start := (date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC');
    v_next_week_start := v_week_start + INTERVAL '7 days';

    -- Fetch target work metadata
    SELECT 
        created_at, 
        published_at,
        status, 
        publication_status, 
        view_count, 
        like_count, 
        save_count, 
        COALESCE(curated_collections, ARRAY[]::TEXT[])
    INTO 
        v_work_created_at, 
        v_work_published_at,
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
    -- Drafts, private, or unlisted non-published works exit with empty collections
    IF v_work_pub_status <> 'published' THEN
        new_this_week := FALSE;
        new_chapters_this_week := FALSE;
        collections := ARRAY[]::TEXT[];
        RETURN NEXT;
        RETURN;
    END IF;

    -- 1. Check New This Week:
    -- Brand-new work first published during the current calendar week [week_start, next_week_start)
    -- Must have non-null published_at, be within the current UTC week, and not in the future
    IF v_work_published_at IS NOT NULL 
       AND v_work_published_at >= v_week_start 
       AND v_work_published_at < v_next_week_start 
       AND v_work_published_at <= NOW() THEN
        v_is_new_this_week := TRUE;
        v_is_new_chapters_this_week := FALSE; -- STRICT: brand new work does not have new_chapters_this_week = true
        v_collections_list := array_append(v_collections_list, 'new_this_week');
    ELSE
        -- 2. Check New Chapters This Week:
        -- ONLY works first published BEFORE current week qualify (v_work_published_at < v_week_start)
        -- Must have a new act OR chapter published on/after Monday of the current week
        IF v_work_published_at IS NOT NULL AND v_work_published_at < v_week_start THEN
            SELECT EXISTS (
                SELECT 1 FROM public.acts
                WHERE work_id = p_work_id
                  AND created_at >= v_week_start
                  AND created_at < v_next_week_start
                  AND status = 'published'
            ) INTO v_has_recent_new_act;

            SELECT EXISTS (
                SELECT 1 FROM public.chapters
                WHERE work_id = p_work_id
                  AND COALESCE(published_at, created_at) >= v_week_start
                  AND COALESCE(published_at, created_at) < v_next_week_start
                  AND status = 'published'
            ) INTO v_has_recent_new_chapter;

            IF v_has_recent_new_act OR v_has_recent_new_chapter THEN
                v_is_new_chapters_this_week := TRUE;
                v_collections_list := array_append(v_collections_list, 'new_chapters_this_week');
            END IF;
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

-- Refresh view to ensure it binds to updated function signature
CREATE OR REPLACE VIEW public.works_with_collections AS
SELECT 
    w.*,
    COALESCE(col.new_this_week, FALSE) AS new_this_week,
    COALESCE(col.new_chapters_this_week, FALSE) AS new_chapters_this_week,
    COALESCE(col.collections, ARRAY[]::TEXT[]) AS collections
FROM public.works w
CROSS JOIN LATERAL public.compute_work_collections(w.id) col;

GRANT SELECT ON public.works_with_collections TO anon, authenticated, service_role;
