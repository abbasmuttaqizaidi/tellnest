-- ==============================================================================
-- HatchPen Migration 32: Home Page Section Query Performance Indexes
-- Creates partial composite B-Tree indexes on public, published works
-- for sub-millisecond query execution across all home sections at scale.
-- ==============================================================================

-- 1. Bingeable Reads Index: Fast seek for single-sitting reads (1-2 chapters)
CREATE INDEX IF NOT EXISTS idx_works_bingeable
ON public.works (chapter_count, like_count DESC, view_count DESC)
WHERE visibility = 'public' AND publication_status = 'published';

-- 2. New Voices Showcase Index: Fast seek for debut works by publication recency
CREATE INDEX IF NOT EXISTS idx_works_new_voices
ON public.works (published_at DESC, chapter_count)
WHERE visibility = 'public' AND publication_status = 'published';

-- 3. Trending Serials Index: Fast seek for admin marked or highest view serials
CREATE INDEX IF NOT EXISTS idx_works_trending_rank
ON public.works (trending_marked_by_admin DESC, view_count DESC, like_count DESC)
WHERE visibility = 'public' AND publication_status = 'published';
