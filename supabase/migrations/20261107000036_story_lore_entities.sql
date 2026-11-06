-- Migration 36: Story Lore Bible & Characters Glossary
CREATE TABLE IF NOT EXISTS story_lore_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'Character', -- 'Character' | 'Location' | 'Lore'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_entity_name UNIQUE (work_id, name)
);

CREATE INDEX IF NOT EXISTS idx_story_lore_work_id ON story_lore_entities(work_id);
CREATE INDEX IF NOT EXISTS idx_story_lore_name ON story_lore_entities(work_id, name);

-- Enable RLS
ALTER TABLE story_lore_entities ENABLE ROW LEVEL SECURITY;

-- Public read access for tooltips & lore glossaries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'story_lore_entities' AND policyname = 'Public read access for story_lore_entities'
  ) THEN
    CREATE POLICY "Public read access for story_lore_entities"
      ON story_lore_entities FOR SELECT
      USING (true);
  END IF;
END $$;
