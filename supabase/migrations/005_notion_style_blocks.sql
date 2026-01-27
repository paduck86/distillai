-- ============================================
-- Migration 005: Notion-style Block System
-- ============================================
-- Distillai를 노션 스타일 블록 기반 에디터로 확장
-- 기존 Markdown 콘텐츠와 병행 운영 가능

-- ============================================
-- 1. 블록 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS distillai.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 부모 관계
  distillation_id UUID NOT NULL REFERENCES distillai.distillations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES distillai.blocks(id) ON DELETE CASCADE,

  -- 블록 내용
  type TEXT NOT NULL CHECK (type IN (
    'text', 'heading1', 'heading2', 'heading3',
    'bullet', 'numbered', 'todo', 'toggle',
    'quote', 'callout', 'divider', 'code',
    'timestamp', 'ai_summary', 'embed'
  )),
  content TEXT DEFAULT '',

  -- 블록별 속성 (JSON)
  properties JSONB DEFAULT '{}' NOT NULL,
  -- Example properties:
  -- { "checked": true }                    -- todo
  -- { "collapsed": false }                 -- toggle
  -- { "icon": "💡", "color": "yellow" }   -- callout
  -- { "language": "typescript" }           -- code
  -- { "timestamp": "00:15:30" }            -- timestamp
  -- { "aiGenerated": true }                -- ai_summary

  -- 순서 (같은 레벨 내)
  position INT NOT NULL DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. 페이지 아이콘/커버 컬럼 추가
-- ============================================

ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS page_icon TEXT,
ADD COLUMN IF NOT EXISTS page_cover TEXT;

-- ============================================
-- 3. 인덱스
-- ============================================

-- 블록 조회 성능
CREATE INDEX IF NOT EXISTS idx_blocks_distillation ON distillai.blocks(distillation_id);
CREATE INDEX IF NOT EXISTS idx_blocks_parent ON distillai.blocks(parent_id);
CREATE INDEX IF NOT EXISTS idx_blocks_position ON distillai.blocks(distillation_id, position);
CREATE INDEX IF NOT EXISTS idx_blocks_type ON distillai.blocks(type);

-- properties 내 특정 필드 검색 (예: timestamp 블록)
CREATE INDEX IF NOT EXISTS idx_blocks_properties ON distillai.blocks USING GIN (properties);

-- ============================================
-- 4. RLS 정책
-- ============================================

ALTER TABLE distillai.blocks ENABLE ROW LEVEL SECURITY;

-- 블록 조회: 해당 distillation의 소유자만
CREATE POLICY "Users can view blocks of their distillations"
ON distillai.blocks FOR SELECT
USING (
  distillation_id IN (
    SELECT id FROM distillai.distillations
    WHERE user_id = auth.uid()
  )
);

-- 블록 생성: 해당 distillation의 소유자만
CREATE POLICY "Users can create blocks in their distillations"
ON distillai.blocks FOR INSERT
WITH CHECK (
  distillation_id IN (
    SELECT id FROM distillai.distillations
    WHERE user_id = auth.uid()
  )
);

-- 블록 수정: 해당 distillation의 소유자만
CREATE POLICY "Users can update blocks of their distillations"
ON distillai.blocks FOR UPDATE
USING (
  distillation_id IN (
    SELECT id FROM distillai.distillations
    WHERE user_id = auth.uid()
  )
);

-- 블록 삭제: 해당 distillation의 소유자만
CREATE POLICY "Users can delete blocks of their distillations"
ON distillai.blocks FOR DELETE
USING (
  distillation_id IN (
    SELECT id FROM distillai.distillations
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION distillai.update_block_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_block_timestamp ON distillai.blocks;
CREATE TRIGGER trigger_update_block_timestamp
BEFORE UPDATE ON distillai.blocks
FOR EACH ROW
EXECUTE FUNCTION distillai.update_block_timestamp();

-- ============================================
-- 6. 헬퍼 함수: 블록 순서 재정렬
-- ============================================

CREATE OR REPLACE FUNCTION distillai.reorder_blocks(
  p_distillation_id UUID,
  p_block_ids UUID[]
)
RETURNS VOID AS $$
DECLARE
  v_position INT := 0;
  v_block_id UUID;
BEGIN
  -- 각 블록 ID에 대해 순서대로 position 업데이트
  FOREACH v_block_id IN ARRAY p_block_ids
  LOOP
    UPDATE distillai.blocks
    SET position = v_position
    WHERE id = v_block_id
      AND distillation_id = p_distillation_id;
    v_position := v_position + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 기존 Markdown을 블록으로 마이그레이션 준비
-- ============================================

-- 마이그레이션 상태 플래그 추가
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS blocks_migrated BOOLEAN DEFAULT FALSE;

-- 나중에 백그라운드 작업으로 기존 summary_md를 blocks로 변환할 때 사용
-- blocks_migrated = true 인 경우 blocks 테이블 사용
-- blocks_migrated = false 인 경우 summary_md 사용 (fallback)

-- ============================================
-- 8. 코멘트
-- ============================================

COMMENT ON TABLE distillai.blocks IS
  'Notion-style block-based content for distillations. Supports nested blocks via parent_id.';

COMMENT ON COLUMN distillai.blocks.type IS
  'Block type: text, heading1-3, bullet, numbered, todo, toggle, quote, callout, divider, code, timestamp, ai_summary, embed';

COMMENT ON COLUMN distillai.blocks.properties IS
  'Type-specific properties in JSON: checked (todo), collapsed (toggle), icon/color (callout), language (code), timestamp (timestamp), aiGenerated (ai_summary)';

COMMENT ON COLUMN distillai.distillations.page_icon IS
  'Page icon (emoji or URL) for Notion-style display';

COMMENT ON COLUMN distillai.distillations.page_cover IS
  'Cover image URL for Notion-style display';

COMMENT ON COLUMN distillai.distillations.blocks_migrated IS
  'Flag indicating if summary_md has been migrated to blocks table';
