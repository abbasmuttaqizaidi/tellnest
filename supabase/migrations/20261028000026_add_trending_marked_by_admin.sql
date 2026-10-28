-- ==============================================================================
-- HatchPen Migration 26: Add trending_marked_by_admin to works table
-- Allows administrative editorial force-override for Trending discovery
-- ==============================================================================

ALTER TABLE public.works 
ADD COLUMN IF NOT EXISTS trending_marked_by_admin BOOLEAN NOT NULL DEFAULT false;

-- Create partial index for rapid lookup of admin-pinned trending stories
CREATE INDEX IF NOT EXISTS idx_works_trending_admin 
ON public.works(trending_marked_by_admin) 
WHERE trending_marked_by_admin = true;

-- Drop and recreate view to cleanly incorporate newly added table columns
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
