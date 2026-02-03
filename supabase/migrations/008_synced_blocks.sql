-- ============================================
-- Migration 008: Synced Blocks
-- ============================================
-- Notion-style synced blocks (동기화 블록)
-- 여러 페이지에서 동일한 콘텐츠를 참조하고 동기화

-- ============================================
-- 1. synced_blocks 테이블 (원본 동기화 블록)
-- ============================================

CREATE TABLE IF NOT EXISTS distillai.synced_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 소유자
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 원본 콘텐츠 (blocks 테이블의 JSON 배열)
  content JSONB NOT NULL DEFAULT '[]',

  -- 메타데이터
  title TEXT,  -- 선택적 제목 (관리 용이성)

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. blocks 테이블에 synced_block_id 컬럼 추가
-- ============================================

-- synced_block_id가 있으면 이 블록은 동기화 블록의 참조
-- content는 synced_blocks.content를 사용
ALTER TABLE distillai.blocks
ADD COLUMN IF NOT EXISTS synced_block_id UUID REFERENCES distillai.synced_blocks(id) ON DELETE SET NULL;

-- ============================================
-- 3. 인덱스
-- ============================================

-- synced_blocks 조회 성능
CREATE INDEX IF NOT EXISTS idx_synced_blocks_user ON distillai.synced_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_blocks_updated ON distillai.synced_blocks(updated_at DESC);

-- blocks에서 synced_block 참조 조회
CREATE INDEX IF NOT EXISTS idx_blocks_synced_block ON distillai.blocks(synced_block_id);

-- ============================================
-- 4. RLS 정책
-- ============================================

ALTER TABLE distillai.synced_blocks ENABLE ROW LEVEL SECURITY;

-- synced_blocks 조회: 소유자만
CREATE POLICY "Users can view their own synced blocks"
ON distillai.synced_blocks FOR SELECT
USING (user_id = auth.uid());

-- synced_blocks 생성: 소유자만
CREATE POLICY "Users can create their own synced blocks"
ON distillai.synced_blocks FOR INSERT
WITH CHECK (user_id = auth.uid());

-- synced_blocks 수정: 소유자만
CREATE POLICY "Users can update their own synced blocks"
ON distillai.synced_blocks FOR UPDATE
USING (user_id = auth.uid());

-- synced_blocks 삭제: 소유자만
CREATE POLICY "Users can delete their own synced blocks"
ON distillai.synced_blocks FOR DELETE
USING (user_id = auth.uid());

-- ============================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION distillai.update_synced_block_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_synced_block_timestamp ON distillai.synced_blocks;
CREATE TRIGGER trigger_update_synced_block_timestamp
BEFORE UPDATE ON distillai.synced_blocks
FOR EACH ROW
EXECUTE FUNCTION distillai.update_synced_block_timestamp();

-- ============================================
-- 6. 헬퍼 함수: 동기화 블록 참조 수 조회
-- ============================================

CREATE OR REPLACE FUNCTION distillai.get_synced_block_reference_count(p_synced_block_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM distillai.blocks
  WHERE synced_block_id = p_synced_block_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 헬퍼 함수: 동기화 블록을 참조하는 모든 페이지 ID 조회
-- ============================================

CREATE OR REPLACE FUNCTION distillai.get_synced_block_pages(p_synced_block_id UUID)
RETURNS TABLE(distillation_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.distillation_id
  FROM distillai.blocks b
  WHERE b.synced_block_id = p_synced_block_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Realtime 활성화
-- ============================================

-- synced_blocks 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE distillai.synced_blocks;

-- ============================================
-- 9. 코멘트
-- ============================================

COMMENT ON TABLE distillai.synced_blocks IS
  'Synced blocks that can be referenced from multiple pages. Changes propagate to all references.';

COMMENT ON COLUMN distillai.synced_blocks.content IS
  'JSON array of block data. Same structure as blocks table but stored as JSON for flexibility.';

COMMENT ON COLUMN distillai.synced_blocks.title IS
  'Optional title for easier management in synced blocks list.';

COMMENT ON COLUMN distillai.blocks.synced_block_id IS
  'Reference to a synced block. If set, this block displays content from synced_blocks.content.';
