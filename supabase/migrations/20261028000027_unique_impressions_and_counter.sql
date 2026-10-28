-- ==============================================================================
-- HatchPen Migration 27: Unique Impressions Table & Atomic Impression Counter
-- Strictly tracks unique story overview landings per user/viewer with zero duplicates
-- ==============================================================================

-- 1. Add impression_count to works table
ALTER TABLE public.works 
ADD COLUMN IF NOT EXISTS impression_count BIGINT NOT NULL DEFAULT 0;

-- 2. Create unique_impressions tracking table
CREATE TABLE IF NOT EXISTS public.unique_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_key TEXT NOT NULL,
    work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Strict Unique Constraint: 1 impression per viewer per story across all devices
CREATE UNIQUE INDEX IF NOT EXISTS uq_unique_impressions_viewer_work 
    ON public.unique_impressions(viewer_key, work_id);

CREATE INDEX IF NOT EXISTS idx_unique_impressions_work 
    ON public.unique_impressions(work_id);

-- 4. Enable Row Level Security (Service role strictly)
ALTER TABLE public.unique_impressions ENABLE ROW LEVEL SECURITY;

-- 5. Atomic increment stored procedure to prevent lost updates under concurrency
CREATE OR REPLACE FUNCTION public.increment_work_impression(p_work_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_impressions BIGINT;
BEGIN
    UPDATE public.works
    SET impression_count = COALESCE(impression_count, 0) + 1
    WHERE id = p_work_id
    RETURNING impression_count INTO v_impressions;
    RETURN COALESCE(v_impressions, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.increment_work_impression(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_work_impression(UUID) TO service_role, postgres;

-- 6. Refresh works_with_collections view to include impression_count
DROP VIEW IF EXISTS public.works_with_collections CASCADE;

CREATE VIEW public.works_with_collections AS
SELECT 
    w.*,
    COALESCE(col.new_this_week, FALSE) AS new_this_week,
    COALESCE(col.new_chapters_this_week, FALSE) AS new_chapters_this_week,
    COALESCE(col.collections, ARRAY[]::TEXT[]) AS collections
FROM public.works w
CROSS JOIN LATERAL public.compute_work_collections(w.id) col;

GRANT SELECT ON public.works_with_collections TO anon, authenticated, service_role;
