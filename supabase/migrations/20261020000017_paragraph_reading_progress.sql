-- ==============================================================================
-- Tellnest Migration 17: Paragraph-Based Reading Progress System (Replacement)
-- ==============================================================================
-- Completely replaces legacy heartbeat/session-token tracking with atomic,
-- paragraph-based whole-story progress, batch idempotency ledger, and
-- reversible last-position bookmarks with timestamp-ordered stale protection.
-- Retains the existing reading_progress schema and production data safely.

-- 1. Ensure reading_progress table exists with unique constraint (idempotent guard)
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    position TEXT,
    last_position_timestamp BIGINT DEFAULT 0,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reading_progress_user_work UNIQUE (user_id, work_id)
);

-- Ensure column exists if table was created in an earlier migration
ALTER TABLE reading_progress ADD COLUMN IF NOT EXISTS last_position_timestamp BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_progress_work ON reading_progress(work_id);

-- 2. Processed Batches Ledger for True Idempotency and Duplicate Rejection
CREATE TABLE IF NOT EXISTS reading_progress_batches (
    batch_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    work_id UUID NOT NULL,
    chapter_id UUID,
    progress_percent NUMERIC(5,2) NOT NULL,
    last_position TEXT,
    client_timestamp BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_batches_user_work 
    ON reading_progress_batches(user_id, work_id, client_timestamp DESC);

-- Enable Row Level Security (RLS) on reading_progress_batches
ALTER TABLE reading_progress_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'reading_progress_batches' AND policyname = 'Users can view own reading progress batches'
        ) THEN
            CREATE POLICY "Users can view own reading progress batches"
                ON reading_progress_batches
                FOR SELECT
                USING (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- Drop any previous signatures cleanly
DROP FUNCTION IF EXISTS save_reading_progress_atomic(UUID, UUID, UUID, INTEGER, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS save_reading_progress_atomic(UUID, UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, BIGINT);

-- 3. Atomic, Idempotent Function for Saving Paragraph-Based Reading Progress
CREATE OR REPLACE FUNCTION save_reading_progress_atomic(
    p_user_id UUID,
    p_work_id UUID,
    p_chapter_id UUID,
    p_order_index INTEGER,
    p_total_paragraphs INTEGER,
    p_last_position TEXT,
    p_batch_id TEXT,
    p_client_timestamp BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_calc_percent NUMERIC(5,2);
    v_final_percent NUMERIC(5,2);
    v_dup_percent NUMERIC(5,2);
    v_dup_position TEXT;
    v_client_timestamp BIGINT;
    v_existing_id UUID;
    v_existing_percent NUMERIC(5,2);
    v_existing_pos TEXT;
    v_existing_chapter UUID;
    v_existing_ts BIGINT;
    v_final_pos TEXT;
    v_final_chapter UUID;
    v_final_ts BIGINT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Validate required identifiers
    IF p_user_id IS NULL OR p_work_id IS NULL OR p_chapter_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'batch_id', p_batch_id,
            'error', 'invalid_arguments'
        );
    END IF;

    -- 1. Exact Duplicate Batch Detection (Idempotency)
    -- If this batchId was already processed, return committed result without mutating anything
    IF p_batch_id IS NOT NULL AND p_batch_id <> '' THEN
        SELECT progress_percent, last_position
        INTO v_dup_percent, v_dup_position
        FROM reading_progress_batches
        WHERE batch_id = p_batch_id;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'batch_id', p_batch_id,
                'progress_percent', v_dup_percent,
                'last_position', v_dup_position,
                'duplicate', true
            );
        END IF;
    END IF;

    -- 2. Determine Client Event Timestamp
    IF p_client_timestamp IS NOT NULL AND p_client_timestamp > 0 THEN
        v_client_timestamp := p_client_timestamp;
    ELSIF p_last_position IS NOT NULL THEN
        BEGIN
            v_client_timestamp := ((p_last_position)::jsonb->>'timestamp')::bigint;
        EXCEPTION WHEN OTHERS THEN
            v_client_timestamp := (EXTRACT(EPOCH FROM v_now) * 1000)::bigint;
        END;
    ELSE
        v_client_timestamp := (EXTRACT(EPOCH FROM v_now) * 1000)::bigint;
    END IF;

    IF v_client_timestamp IS NULL OR v_client_timestamp <= 0 THEN
        v_client_timestamp := (EXTRACT(EPOCH FROM v_now) * 1000)::bigint;
    END IF;

    -- Clock anomaly guard: client timestamp cannot be in the distant future.
    -- If client timestamp exceeds server time by more than 5 minutes (300,000ms), clamp to server time.
    IF v_client_timestamp > (EXTRACT(EPOCH FROM v_now) * 1000)::bigint + 300000 THEN
        v_client_timestamp := (EXTRACT(EPOCH FROM v_now) * 1000)::bigint;
    END IF;

    -- 3. Compute story-level progress percentage based on highest eligible order index
    IF p_total_paragraphs > 0 AND p_order_index > 0 THEN
        v_calc_percent := ROUND((p_order_index::NUMERIC / p_total_paragraphs::NUMERIC) * 100, 2);
    ELSE
        v_calc_percent := 0.00;
    END IF;
    v_calc_percent := LEAST(100.00, GREATEST(0.00, v_calc_percent));

    -- 4. Row-Lock Existing Reading Progress
    SELECT id, progress_percent, position, chapter_id, COALESCE(last_position_timestamp, 0)
    INTO v_existing_id, v_existing_percent, v_existing_pos, v_existing_chapter, v_existing_ts
    FROM reading_progress
    WHERE user_id = p_user_id AND work_id = p_work_id
    FOR UPDATE;

    IF FOUND THEN
        -- Progress percent is monotonic: NEVER regresses
        v_final_percent := GREATEST(COALESCE(v_existing_percent, 0.00), v_calc_percent);

        -- If existing row has no last_position_timestamp, try extracting from position JSON
        IF v_existing_ts = 0 AND v_existing_pos IS NOT NULL THEN
            BEGIN
                v_existing_ts := ((v_existing_pos)::jsonb->>'timestamp')::bigint;
            EXCEPTION WHEN OTHERS THEN
                v_existing_ts := 0;
            END;
        END IF;

        -- Stale / Out-of-order protection:
        -- Only update position and chapter if incoming batch's timestamp is >= existing timestamp
        IF v_client_timestamp >= COALESCE(v_existing_ts, 0) THEN
            v_final_pos := p_last_position;
            v_final_chapter := p_chapter_id;
            v_final_ts := v_client_timestamp;
        ELSE
            -- Stale or delayed batch arriving after a newer batch has committed: preserve newer position!
            v_final_pos := v_existing_pos;
            v_final_chapter := v_existing_chapter;
            v_final_ts := v_existing_ts;
        END IF;

        UPDATE reading_progress SET
            progress_percent = v_final_percent,
            position = v_final_pos,
            chapter_id = v_final_chapter,
            last_position_timestamp = v_final_ts,
            last_read_at = v_now,
            updated_at = v_now
        WHERE id = v_existing_id;
    ELSE
        v_final_percent := v_calc_percent;
        v_final_pos := p_last_position;
        v_final_chapter := p_chapter_id;
        v_final_ts := v_client_timestamp;

        INSERT INTO reading_progress (
            user_id, work_id, chapter_id, progress_percent, position,
            last_position_timestamp, last_read_at, created_at, updated_at
        ) VALUES (
            p_user_id, p_work_id, p_chapter_id, v_final_percent, v_final_pos,
            v_final_ts, v_now, v_now, v_now
        );
    END IF;

    -- 5. Record Processed Batch in Ledger for Deduplication
    IF p_batch_id IS NOT NULL AND p_batch_id <> '' THEN
        INSERT INTO reading_progress_batches (
            batch_id, user_id, work_id, chapter_id,
            progress_percent, last_position, client_timestamp, created_at
        ) VALUES (
            p_batch_id, p_user_id, p_work_id, v_final_chapter,
            v_final_percent, v_final_pos, v_final_ts, v_now
        )
        ON CONFLICT (batch_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'progress_percent', v_final_percent,
        'last_position', v_final_pos,
        'duplicate', false
    );
END;
$$;

-- Revoke public execution, restrict to authenticated and service_role in Supabase
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON FUNCTION save_reading_progress_atomic(UUID, UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, BIGINT) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION save_reading_progress_atomic(UUID, UUID, UUID, INTEGER, INTEGER, TEXT, TEXT, BIGINT) TO authenticated, service_role;
    END IF;
END $$;
