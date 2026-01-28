-- ============================================
-- Migration 007: Trash (Soft Delete)
-- ============================================
-- 휴지통 기능 지원

-- ============================================
-- 1. trashed_at 컬럼 추가
-- ============================================

ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ DEFAULT NULL;

-- trashed_at 인덱스 (휴지통 조회용)
CREATE INDEX IF NOT EXISTS idx_distillations_trashed_at
ON distillai.distillations(trashed_at)
WHERE trashed_at IS NOT NULL;

-- ============================================
-- 2. get_page_tree 함수 수정 (휴지통 제외)
-- ============================================

CREATE OR REPLACE FUNCTION distillai.get_page_tree(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  title TEXT,
  page_icon TEXT,
  is_folder BOOLEAN,
  collapsed BOOLEAN,
  "position" INTEGER,
  status TEXT,
  source_type TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  depth INTEGER
) AS $$
WITH RECURSIVE page_tree AS (
  -- 루트 페이지 (parent_id가 NULL, 휴지통 제외)
  SELECT
    d.id,
    d.parent_id,
    d.title,
    d.page_icon,
    d.is_folder,
    d.collapsed,
    d."position",
    d.status,
    d.source_type,
    d.audio_url,
    d.duration_seconds,
    d.created_at,
    d.updated_at,
    0 as depth
  FROM distillai.distillations d
  WHERE d.user_id = p_user_id
    AND d.parent_id IS NULL
    AND d.trashed_at IS NULL

  UNION ALL

  -- 자식 페이지 (재귀, 휴지통 제외)
  SELECT
    d.id,
    d.parent_id,
    d.title,
    d.page_icon,
    d.is_folder,
    d.collapsed,
    d."position",
    d.status,
    d.source_type,
    d.audio_url,
    d.duration_seconds,
    d.created_at,
    d.updated_at,
    pt.depth + 1
  FROM distillai.distillations d
  INNER JOIN page_tree pt ON d.parent_id = pt.id
  WHERE d.user_id = p_user_id
    AND d.trashed_at IS NULL
)
SELECT * FROM page_tree
ORDER BY depth, "position", created_at;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- 3. 코멘트
-- ============================================

COMMENT ON COLUMN distillai.distillations.trashed_at IS
  '휴지통 이동 시간. NULL이면 정상 페이지, 값이 있으면 휴지통에 있음.';
