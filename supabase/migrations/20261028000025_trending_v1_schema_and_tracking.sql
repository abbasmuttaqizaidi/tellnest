-- ==============================================================================
-- HatchPen Migration 25: Trending V1 Schema, Fresh Activity Tracking & Snapshots
-- ==============================================================================

-- 1. Fresh 7-Day Chapter Opens Table
-- Records distinct chapter open events for rolling window engagement tracking.
-- Independent of legacy lifetime unique_views deduplication.
CREATE TABLE IF NOT EXISTS public.trending_chapter_opens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_key TEXT NOT NULL,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_chapter_opens_window 
ON public.trending_chapter_opens(work_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_chapter_opens_viewer 
ON public.trending_chapter_opens(viewer_key, chapter_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_chapter_opens_opened_at 
ON public.trending_chapter_opens(opened_at DESC);

-- Enable RLS (Strict server-only / service_role access; deny direct anon/authenticated access)
ALTER TABLE public.trending_chapter_opens ENABLE ROW LEVEL SECURITY;

-- 2. Trending Weekly Snapshots Table
-- Dedicated storage for immutable, audited, and atomically activated weekly rankings.
CREATE TABLE IF NOT EXISTS public.trending_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    rankings JSONB NOT NULL DEFAULT '[]'::JSONB,
    tier_a_count INTEGER NOT NULL DEFAULT 0,
    tier_b_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique partial index: Guarantees at the database engine level that AT MOST ONE snapshot can be active
CREATE UNIQUE INDEX IF NOT EXISTS uq_trending_snapshots_active 
ON public.trending_snapshots(is_active) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trending_snapshots_created_at 
ON public.trending_snapshots(created_at DESC);

-- Enable RLS (Strict server-only / service_role access; deny direct anon/authenticated modification)
ALTER TABLE public.trending_snapshots ENABLE ROW LEVEL SECURITY;

-- 3. Bookmarks Safety Definition (Align with active toggleBookmarkServerFn)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bookmarks_user_work UNIQUE (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_work ON public.bookmarks(work_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at DESC);

-- Enable RLS on bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Compatible Clerk profile-mapped RLS policy (uses current_profile_id() from migration 02/07)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'bookmarks' AND policyname = 'Users manage own bookmarks'
    ) THEN
        CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
            FOR ALL USING (user_id = current_profile_id())
            WITH CHECK (user_id = current_profile_id());
    END IF;
END $$;

-- 4. Atomic Snapshot Activation Stored Procedure
-- Guarantees transaction-safe atomic snapshot replacement under concurrency.
-- Serializes concurrent cron runs via dedicated advisory lock and prevents race conditions.
CREATE OR REPLACE FUNCTION public.activate_trending_snapshot_atomic(
    p_window_start TIMESTAMPTZ,
    p_window_end TIMESTAMPTZ,
    p_rankings JSONB,
    p_tier_a_count INTEGER,
    p_tier_b_count INTEGER,
    p_total_count INTEGER,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
BEGIN
    -- Advisory lock dedicated to weekly trending snapshot activation (lock key 84920192)
    PERFORM pg_advisory_xact_lock(84920192);

    -- Deactivate all currently active snapshots atomically
    UPDATE public.trending_snapshots
    SET is_active = FALSE
    WHERE is_active = TRUE;

    -- Insert and activate the new snapshot in the same transaction
    INSERT INTO public.trending_snapshots (
        window_start,
        window_end,
        rankings,
        tier_a_count,
        tier_b_count,
        total_count,
        is_active,
        status,
        metadata
    )
    VALUES (
        p_window_start,
        p_window_end,
        p_rankings,
        p_tier_a_count,
        p_tier_b_count,
        p_total_count,
        TRUE,
        'completed',
        p_metadata
    )
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Restrict execution to trusted service_role only
REVOKE EXECUTE ON FUNCTION public.activate_trending_snapshot_atomic FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_trending_snapshot_atomic TO service_role;

-- 5. Disconnect Legacy Lifetime Metrics from Trending Now
-- Based strictly on Migration 15 (20261015000015_fix_compute_work_collections_published_at.sql)
-- Preserves: published_at logic, publication_status early-exit, and UTC week boundaries.
-- Removes: automatic trending_now assignment (legacy lifetime view_count >= 500 / likes+saves >= 50).
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

    -- 3. Automatic collection: Rising Stories based on reads/engagement (trending_now disconnected)
    IF (v_view_count >= 100 OR (v_like_count + v_save_count) >= 15) THEN
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

-- Refresh view to ensure it binds to updated function definition
CREATE OR REPLACE VIEW public.works_with_collections AS
SELECT 
    w.*,
    COALESCE(col.new_this_week, FALSE) AS new_this_week,
    COALESCE(col.new_chapters_this_week, FALSE) AS new_chapters_this_week,
    COALESCE(col.collections, ARRAY[]::TEXT[]) AS collections
FROM public.works w
CROSS JOIN LATERAL public.compute_work_collections(w.id) col;

GRANT SELECT ON public.works_with_collections TO anon, authenticated, service_role;
