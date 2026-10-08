-- ==============================================================================
-- Tellnest Migration 10: Acts Architecture & Hierarchy (Works -> Acts -> Chapters)
-- ==============================================================================

-- 1. Create Acts Table (Thematic/Narrative Volume or Major Installment Tier)
CREATE TABLE IF NOT EXISTS acts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    act_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    status publication_status NOT NULL DEFAULT 'published',
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_act_number UNIQUE (work_id, act_number),
    CONSTRAINT uq_work_act_slug UNIQUE (work_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_acts_work_id ON acts(work_id, act_number ASC);
CREATE INDEX IF NOT EXISTS idx_acts_slug ON acts(slug);

CREATE TRIGGER trg_acts_updated_at
BEFORE UPDATE ON acts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Link Chapters to Acts (Nullable at first for zero-downtime backward compatibility)
ALTER TABLE chapters 
ADD COLUMN IF NOT EXISTS act_id UUID REFERENCES acts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chapters_act_id ON chapters(act_id);

-- 3. Automatic Backfill: Create a default "Act I: Inception" for existing works and link existing chapters
DO $$
DECLARE
    r_work RECORD;
    v_act_id UUID;
BEGIN
    FOR r_work IN SELECT id, title FROM works LOOP
        -- Check if an act already exists for this work
        SELECT id INTO v_act_id FROM acts WHERE work_id = r_work.id LIMIT 1;
        
        -- If no act exists, generate default Act 1
        IF v_act_id IS NULL THEN
            INSERT INTO acts (work_id, act_number, title, slug, description, status, display_order)
            VALUES (
                r_work.id, 
                1, 
                'Act I', 
                'act-1', 
                'Primary narrative cycle and opening movement.', 
                'published', 
                1
            )
            RETURNING id INTO v_act_id;
        END IF;

        -- Associate unlinked chapters of this work to the act
        UPDATE chapters
        SET act_id = v_act_id
        WHERE work_id = r_work.id AND act_id IS NULL;
    END LOOP;
END $$;

-- 4. Enable RLS on Acts Table
ALTER TABLE acts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published acts of visible works"
ON acts FOR SELECT
USING (
    status = 'published'
    AND EXISTS (
        SELECT 1 FROM works 
        WHERE works.id = acts.work_id 
        AND works.visibility IN ('public', 'unlisted')
    )
);

CREATE POLICY "Authors can manage acts for their works"
ON acts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM works 
        WHERE works.id = acts.work_id 
        AND works.author_id = (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub')
    )
);

CREATE POLICY "Service role full access on acts"
ON acts FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
