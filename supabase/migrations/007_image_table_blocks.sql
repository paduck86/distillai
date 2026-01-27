-- ============================================
-- Migration 007: Image and Table Block Support
-- ============================================
-- Distillai 블록 에디터에 이미지 및 테이블 블록 지원 추가
-- 인라인 포맷팅을 위한 HTML 콘텐츠 저장 지원

-- ============================================
-- 1. 블록 타입 확장
-- ============================================

-- 기존 체크 제약조건 삭제 후 새로운 타입 추가
ALTER TABLE distillai.blocks
DROP CONSTRAINT IF EXISTS blocks_type_check;

ALTER TABLE distillai.blocks
ADD CONSTRAINT blocks_type_check CHECK (type IN (
  -- Basic blocks
  'text', 'heading1', 'heading2', 'heading3',
  'bullet', 'numbered', 'todo', 'toggle',
  'quote', 'callout', 'divider', 'code',
  -- Distillai-specific blocks
  'timestamp', 'ai_summary', 'embed',
  -- NEW: Image and Table blocks
  'image', 'table'
));

-- ============================================
-- 2. 이미지 저장용 스토리지 버킷 생성
-- ============================================

-- 이미지 버킷 생성 (public access for images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,  -- Public access for images
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 3. 이미지 버킷 RLS 정책
-- ============================================

-- 기존 정책 삭제 (재생성을 위해)
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- 이미지 업로드 정책: 인증된 사용자만 자신의 폴더에 업로드 가능
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 이미지 읽기 정책: 모든 사용자가 읽기 가능 (public bucket)
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- 이미지 삭제 정책: 소유자만 삭제 가능
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 4. 블록 properties 예시 업데이트 (문서화)
-- ============================================

COMMENT ON COLUMN distillai.blocks.properties IS
  'Type-specific properties in JSON:
   - todo: { "checked": true }
   - toggle: { "collapsed": false }
   - callout: { "icon": "💡", "color": "yellow" }
   - code: { "language": "typescript" }
   - timestamp: { "timestamp": "00:15:30" }
   - ai_summary: { "aiGenerated": true }
   - embed: { "embedUrl": "...", "embedType": "youtube" }
   - image: { "imageUrl": "...", "imageCaption": "...", "imageWidth": "medium", "imageAlign": "center" }
   - table: { "tableData": [["A1", "B1"], ["A2", "B2"]], "tableHeaders": true, "tableColumnWidths": [100, 150] }';

-- ============================================
-- 5. HTML 콘텐츠 저장을 위한 인덱스 (full-text search 지원)
-- ============================================

-- 텍스트 검색을 위한 GIN 인덱스 (content 필드)
-- Using 'simple' configuration which is always available
CREATE INDEX IF NOT EXISTS idx_blocks_content_search
ON distillai.blocks USING GIN (to_tsvector('simple', content));

-- ============================================
-- 6. 이미지 URL 검색을 위한 인덱스
-- ============================================

CREATE INDEX IF NOT EXISTS idx_blocks_image_url
ON distillai.blocks ((properties->>'imageUrl'))
WHERE type = 'image' AND properties->>'imageUrl' IS NOT NULL;

-- ============================================
-- 7. 테이블 블록 데이터 검증 함수
-- ============================================

CREATE OR REPLACE FUNCTION distillai.validate_table_data()
RETURNS TRIGGER AS $$
BEGIN
  -- table 타입일 때만 검증
  IF NEW.type = 'table' THEN
    -- tableData가 있으면 2D 배열인지 확인
    IF NEW.properties ? 'tableData' THEN
      IF jsonb_typeof(NEW.properties->'tableData') != 'array' THEN
        RAISE EXCEPTION 'tableData must be a 2D array';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_validate_table_data ON distillai.blocks;
CREATE TRIGGER trigger_validate_table_data
BEFORE INSERT OR UPDATE ON distillai.blocks
FOR EACH ROW
EXECUTE FUNCTION distillai.validate_table_data();
