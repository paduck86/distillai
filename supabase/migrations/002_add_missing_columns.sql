-- Add missing columns to distillations table
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'recording',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS ai_suggested_category_id UUID REFERENCES distillai.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_suggested_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS category_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Add index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_distillations_source_type ON distillai.distillations(source_type);

-- Add index for category filtering
CREATE INDEX IF NOT EXISTS idx_distillations_category ON distillai.distillations(ai_suggested_category_id);

-- Add index for uncategorized queries
CREATE INDEX IF NOT EXISTS idx_distillations_uncategorized ON distillai.distillations(user_id, category_confirmed, status);

COMMENT ON COLUMN distillai.distillations.source_type IS 'Type of source: youtube, audio, video, url, recording, pdf, website, text';
COMMENT ON COLUMN distillai.distillations.source_url IS 'Original URL for youtube/url sources';
COMMENT ON COLUMN distillai.distillations.ai_suggested_category_id IS 'AI-suggested category ID';
COMMENT ON COLUMN distillai.distillations.ai_confidence IS 'AI confidence score (0-1)';
COMMENT ON COLUMN distillai.distillations.category_confirmed IS 'Whether user confirmed the AI category';
