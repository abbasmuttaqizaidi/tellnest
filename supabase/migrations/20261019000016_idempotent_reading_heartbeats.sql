-- ==============================================================================
-- HatchPen Migration 16: Idempotent Reading Heartbeats & Event Deduplication
-- STATUS: PREPARED FOR APPROVAL (UNAPPLIED TO REMOTE PRODUCTION)
-- ==============================================================================

-- 1. Heartbeat Deduplication Log
-- Guarantees that duplicate, retried, or out-of-order client heartbeats cannot double-count reading duration
CREATE TABLE IF NOT EXISTS reading_heartbeats (
    heartbeat_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    active_seconds_delta INTEGER NOT NULL CHECK (active_seconds_delta >= 0 AND active_seconds_delta <= 60),
    progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    end_marker_reached BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reading_heartbeats_user_chapter ON reading_heartbeats(user_id, chapter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_heartbeats_session ON reading_heartbeats(session_id, sequence_number);

-- Enable Row Level Security on heartbeat ledger (default deny, accessible strictly to service_role)
ALTER TABLE reading_heartbeats ENABLE ROW LEVEL SECURITY;

-- 2. Atomic Stored Procedure for Idempotent Heartbeat Accounting
CREATE OR REPLACE FUNCTION record_reading_heartbeat_atomic(
    p_heartbeat_id TEXT,
    p_user_id UUID,
    p_work_id UUID,
    p_chapter_id UUID,
    p_session_id TEXT,
    p_sequence_number INTEGER,
    p_active_seconds_delta INTEGER,
    p_progress_percent NUMERIC,
    p_end_marker_reached BOOLEAN,
    p_position TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_delta INTEGER := LEAST(GREATEST(COALESCE(p_active_seconds_delta, 0), 0), 60);
    v_history_id UUID;
    v_existing_duration INTEGER := 0;
    v_existing_completed BOOLEAN := FALSE;
    v_next_duration INTEGER;
    v_meets_completion BOOLEAN;
    v_is_completed_now BOOLEAN;
    v_resolved_percent NUMERIC;
    v_curr_chapter_id UUID;
    v_curr_ch_num INT := 0;
    v_inc_ch_num INT := 0;
    v_existing_user_id UUID;
    v_existing_work_id UUID;
    v_existing_chapter_id UUID;
BEGIN
    -- Transaction-level advisory lock serializes concurrent initial inserts for the same user and chapter,
    -- eliminating the race condition where concurrent initial requests both see 0 history rows.
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || ':' || p_chapter_id::text));

    -- Idempotency check with atomic insert:
    -- If heartbeat already exists in reading_heartbeats, do nothing and return duplicate response immediately
    INSERT INTO reading_heartbeats (
        heartbeat_id, user_id, work_id, chapter_id,
        session_id, sequence_number, active_seconds_delta,
        progress_percent, end_marker_reached, created_at
    ) VALUES (
        p_heartbeat_id, p_user_id, p_work_id, p_chapter_id,
        p_session_id, p_sequence_number, v_delta,
        p_progress_percent, p_end_marker_reached, v_now
    )
    ON CONFLICT (heartbeat_id) DO NOTHING;

    IF NOT FOUND THEN
        SELECT user_id, work_id, chapter_id
        INTO v_existing_user_id, v_existing_work_id, v_existing_chapter_id
        FROM reading_heartbeats
        WHERE heartbeat_id = p_heartbeat_id;

        -- Prevent cross-user information leakage or cross-chapter duration manipulation
        IF v_existing_user_id != p_user_id OR v_existing_work_id != p_work_id OR v_existing_chapter_id != p_chapter_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'duplicate', true,
                'error', 'conflicting_heartbeat_identity',
                'duration', 0,
                'is_completed', false
            );
        END IF;

        SELECT duration_seconds, (completed_at IS NOT NULL) INTO v_existing_duration, v_existing_completed
        FROM reading_history
        WHERE user_id = p_user_id AND chapter_id = p_chapter_id
        ORDER BY last_read_at DESC LIMIT 1;

        RETURN jsonb_build_object(
            'success', true,
            'duplicate', true,
            'duration', COALESCE(v_existing_duration, 0),
            'is_completed', COALESCE(v_existing_completed, false)
        );
    END IF;

    -- Enable Row Level Security (default deny, accessible strictly to service_role)
    -- (Configured at table level below)


    -- Find active reading session (within last 4 hours) with row-level lock
    SELECT id, duration_seconds, (completed_at IS NOT NULL)
    INTO v_history_id, v_existing_duration, v_existing_completed
    FROM reading_history
    WHERE user_id = p_user_id AND work_id = p_work_id AND chapter_id = p_chapter_id
      AND last_read_at >= (v_now - INTERVAL '4 hours')
    ORDER BY last_read_at DESC
    LIMIT 1
    FOR UPDATE;

    v_existing_duration := COALESCE(v_existing_duration, 0);
    v_next_duration := v_existing_duration + v_delta;
    v_meets_completion := (NOT COALESCE(v_existing_completed, false)) AND p_end_marker_reached AND (v_next_duration >= 20);
    v_is_completed_now := COALESCE(v_existing_completed, false) OR v_meets_completion;
    v_resolved_percent := CASE WHEN v_is_completed_now THEN 100 ELSE GREATEST(0, LEAST(100, p_progress_percent)) END;

    IF v_history_id IS NOT NULL THEN
        UPDATE reading_history SET
            duration_seconds = v_next_duration,
            last_read_at = v_now,
            completed_at = CASE WHEN completed_at IS NOT NULL THEN completed_at WHEN v_is_completed_now THEN v_now ELSE NULL END
        WHERE id = v_history_id;
    ELSE
        INSERT INTO reading_history (
            user_id, work_id, chapter_id, duration_seconds,
            started_at, last_read_at, completed_at, created_at
        ) VALUES (
            p_user_id, p_work_id, p_chapter_id, v_delta,
            v_now, v_now, CASE WHEN v_is_completed_now THEN v_now ELSE NULL END, v_now
        );
    END IF;

    -- Atomically upsert reading_progress with high-water mark protection and chapter isolation
    SELECT chapter_id INTO v_curr_chapter_id
    FROM reading_progress
    WHERE user_id = p_user_id AND work_id = p_work_id;

    IF v_curr_chapter_id IS NULL THEN
        INSERT INTO reading_progress (
            user_id, work_id, chapter_id, progress_percent, position, last_read_at, created_at, updated_at
        ) VALUES (
            p_user_id, p_work_id, p_chapter_id, v_resolved_percent, p_position, v_now, v_now, v_now
        );
    ELSIF v_curr_chapter_id = p_chapter_id THEN
        UPDATE reading_progress SET
            progress_percent = GREATEST(reading_progress.progress_percent, v_resolved_percent),
            position = CASE
                WHEN v_resolved_percent >= reading_progress.progress_percent THEN COALESCE(p_position, reading_progress.position)
                ELSE reading_progress.position
            END,
            last_read_at = v_now,
            updated_at = v_now
        WHERE user_id = p_user_id AND work_id = p_work_id;
    ELSE
        -- Different chapter: inspect chapter_number so newer chapters advance cursor,
        -- while delayed heartbeats from older chapters never rewind the active cursor.
        BEGIN
            SELECT COALESCE(chapter_number, 0) INTO v_curr_ch_num FROM chapters WHERE id = v_curr_chapter_id;
            SELECT COALESCE(chapter_number, 0) INTO v_inc_ch_num FROM chapters WHERE id = p_chapter_id;
        EXCEPTION WHEN undefined_column THEN
            v_curr_ch_num := 0;
            v_inc_ch_num := 1;
        END;

        IF v_inc_ch_num >= v_curr_ch_num THEN
            UPDATE reading_progress SET
                chapter_id = p_chapter_id,
                progress_percent = v_resolved_percent,
                position = p_position,
                last_read_at = v_now,
                updated_at = v_now
            WHERE user_id = p_user_id AND work_id = p_work_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'duplicate', false,
        'duration', v_next_duration,
        'is_completed', v_is_completed_now
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Strict Permissions: Restrict execution to service_role (backend server only)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON FUNCTION record_reading_heartbeat_atomic FROM PUBLIC;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON FUNCTION record_reading_heartbeat_atomic FROM anon;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON FUNCTION record_reading_heartbeat_atomic FROM authenticated;
    END IF;
    GRANT EXECUTE ON FUNCTION record_reading_heartbeat_atomic TO service_role;
  END IF;
END
$$;

-- 4. Retention Policy: Cleanup heartbeats older than retention threshold (default: 90 days)
CREATE OR REPLACE FUNCTION purge_expired_reading_heartbeats(p_retention_days INT DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM reading_heartbeats
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    REVOKE ALL ON FUNCTION purge_expired_reading_heartbeats FROM PUBLIC;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      REVOKE ALL ON FUNCTION purge_expired_reading_heartbeats FROM anon;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      REVOKE ALL ON FUNCTION purge_expired_reading_heartbeats FROM authenticated;
    END IF;
    GRANT EXECUTE ON FUNCTION purge_expired_reading_heartbeats TO service_role;
  END IF;
END
$$;
