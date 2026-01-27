-- Knowledge Base Expansion Migration
-- Adds support for: notes, X threads, clipboard capture, highlights, bidirectional links

-- ============================================
-- 1. Expand source_type enum
-- ============================================
-- Drop existing constraint and add new one with expanded types
ALTER TABLE distillai.distillations
DROP CONSTRAINT IF EXISTS distillations_source_type_check;

ALTER TABLE distillai.distillations
ADD CONSTRAINT distillations_source_type_check
CHECK (source_type IN (
  'youtube', 'audio', 'video', 'url', 'recording', 'pdf', 'website', 'text',
  'note', 'x_thread', 'clipboard'
));

-- ============================================
-- 2. Add user_notes column for personal annotations
-- ============================================
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS user_notes TEXT;

-- ============================================
-- 3. Add X (Twitter) specific metadata
-- ============================================
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS x_author_handle TEXT,
ADD COLUMN IF NOT EXISTS x_author_name TEXT,
ADD COLUMN IF NOT EXISTS x_tweet_id TEXT,
ADD COLUMN IF NOT EXISTS x_media_urls TEXT[];

-- ============================================
-- 4. Create note_links table for bidirectional linking
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES distillai.distillations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES distillai.distillations(id) ON DELETE CASCADE,
  link_type TEXT DEFAULT 'related' CHECK (link_type IN ('related', 'parent', 'reference', 'quote')),
  context TEXT, -- Optional context/note about the link
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate links
  UNIQUE(source_id, target_id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_note_links_source ON distillai.note_links(source_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON distillai.note_links(target_id);
CREATE INDEX IF NOT EXISTS idx_note_links_user ON distillai.note_links(user_id);

-- ============================================
-- 5. Create highlights table
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  distillation_id UUID NOT NULL REFERENCES distillai.distillations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  note TEXT,
  color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'red', 'purple')),
  position_start INT,
  position_end INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_highlights_distillation ON distillai.highlights(distillation_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user ON distillai.highlights(user_id);

-- ============================================
-- 6. Row Level Security for new tables
-- ============================================

-- note_links RLS
ALTER TABLE distillai.note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note links"
  ON distillai.note_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own note links"
  ON distillai.note_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own note links"
  ON distillai.note_links FOR DELETE
  USING (auth.uid() = user_id);

-- highlights RLS
ALTER TABLE distillai.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own highlights"
  ON distillai.highlights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own highlights"
  ON distillai.highlights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON distillai.highlights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON distillai.highlights FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. Update trigger for highlights
-- ============================================
CREATE OR REPLACE FUNCTION distillai.update_highlights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS highlights_updated_at ON distillai.highlights;
CREATE TRIGGER highlights_updated_at
  BEFORE UPDATE ON distillai.highlights
  FOR EACH ROW
  EXECUTE FUNCTION distillai.update_highlights_timestamp();
