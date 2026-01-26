-- Add source_type column to distillations
-- source_type: 콘텐츠 소스 유형 (youtube, audio, video, url, recording)

ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'recording'
CHECK (source_type IN ('youtube', 'audio', 'video', 'url', 'recording', 'pdf', 'website', 'text'));

-- Add source_url column for youtube/url imports
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_distillations_source_type ON distillai.distillations(source_type);

-- Update existing records based on audio_path
UPDATE distillai.distillations
SET source_type = CASE
  WHEN audio_path LIKE '%.webm' THEN 'recording'
  WHEN audio_path LIKE '%.mp3' THEN 'audio'
  WHEN audio_path LIKE '%.m4a' THEN 'audio'
  WHEN audio_path LIKE '%.wav' THEN 'audio'
  WHEN audio_path LIKE '%.mp4' THEN 'video'
  ELSE 'recording'
END
WHERE source_type IS NULL OR source_type = 'recording';
