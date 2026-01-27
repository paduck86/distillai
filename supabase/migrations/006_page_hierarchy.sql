-- ============================================
-- Migration 006: Page Hierarchy
-- ============================================
-- Distillai를 페이지 중심 아키텍처로 전환
-- - distillations에 중첩 페이지 지원 추가
-- - 폴더 개념을 페이지로 통합

-- ============================================
-- 1. DISTILLATIONS 테이블에 계층 구조 컬럼 추가
-- ============================================

-- 부모 페이지 ID (중첩 페이지 지원)
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES distillai.distillations(id) ON DELETE CASCADE;

-- 형제 페이지 간 정렬 순서
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- 폴더형 페이지 구분 (하위 페이지 컨테이너 역할)
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE;

-- 사이드바 접힘 상태 저장
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS collapsed BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. 인덱스 생성
-- ============================================

-- parent_id로 자식 페이지 조회
CREATE INDEX IF NOT EXISTS idx_distillations_parent_id
ON distillai.distillations(parent_id);

-- 정렬을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_distillations_hierarchy
ON distillai.distillations(user_id, parent_id, position);

-- ============================================
-- 3. 페이지 트리 조회 함수
-- ============================================

CREATE OR REPLACE FUNCTION distillai.get_page_tree(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  title TEXT,
  page_icon TEXT,
  is_folder BOOLEAN,
  collapsed BOOLEAN,
  position INTEGER,
  status TEXT,
  source_type TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  depth INTEGER
) AS $$
WITH RECURSIVE page_tree AS (
  -- 루트 페이지 (parent_id가 NULL)
  SELECT
    d.id,
    d.parent_id,
    d.title,
    d.page_icon,
    d.is_folder,
    d.collapsed,
    d.position,
    d.status,
    d.source_type,
    d.audio_url,
    d.duration_seconds,
    d.created_at,
    d.updated_at,
    0 as depth
  FROM distillai.distillations d
  WHERE d.user_id = p_user_id AND d.parent_id IS NULL

  UNION ALL

  -- 자식 페이지 (재귀)
  SELECT
    d.id,
    d.parent_id,
    d.title,
    d.page_icon,
    d.is_folder,
    d.collapsed,
    d.position,
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
)
SELECT * FROM page_tree
ORDER BY depth, position, created_at;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- 4. 페이지 순서 재정렬 함수
-- ============================================

CREATE OR REPLACE FUNCTION distillai.reorder_pages(
  p_user_id UUID,
  p_page_ids UUID[],
  p_parent_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_position INT := 0;
  v_page_id UUID;
BEGIN
  -- 각 페이지 ID에 대해 순서대로 position 업데이트
  FOREACH v_page_id IN ARRAY p_page_ids
  LOOP
    UPDATE distillai.distillations
    SET
      position = v_position,
      parent_id = p_parent_id
    WHERE id = v_page_id
      AND user_id = p_user_id;
    v_position := v_position + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 페이지 이동 함수
-- ============================================

CREATE OR REPLACE FUNCTION distillai.move_page(
  p_user_id UUID,
  p_page_id UUID,
  p_new_parent_id UUID,
  p_new_position INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_old_parent_id UUID;
  v_old_position INTEGER;
BEGIN
  -- 현재 위치 조회
  SELECT parent_id, position INTO v_old_parent_id, v_old_position
  FROM distillai.distillations
  WHERE id = p_page_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found or not owned by user';
  END IF;

  -- 이전 부모 아래 페이지들 position 조정 (빈 자리 채우기)
  UPDATE distillai.distillations
  SET position = position - 1
  WHERE user_id = p_user_id
    AND parent_id IS NOT DISTINCT FROM v_old_parent_id
    AND position > v_old_position;

  -- 새 부모 아래 페이지들 position 조정 (자리 만들기)
  UPDATE distillai.distillations
  SET position = position + 1
  WHERE user_id = p_user_id
    AND parent_id IS NOT DISTINCT FROM p_new_parent_id
    AND position >= p_new_position
    AND id != p_page_id;

  -- 페이지 이동
  UPDATE distillai.distillations
  SET
    parent_id = p_new_parent_id,
    position = p_new_position
  WHERE id = p_page_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. 자식 페이지 수 조회 함수
-- ============================================

CREATE OR REPLACE FUNCTION distillai.get_children_count(p_page_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM distillai.distillations
  WHERE parent_id = p_page_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================
-- 7. 기존 folders 데이터 마이그레이션 (선택적)
-- ============================================
-- 주의: 이 섹션은 기존 folders 데이터가 있을 때만 실행
-- 프로덕션에서는 별도 스크립트로 실행 권장

-- folders를 is_folder=true인 distillations로 마이그레이션
-- INSERT INTO distillai.distillations (
--   id, user_id, parent_id, title, page_icon, is_folder,
--   position, status, source_type, created_at, updated_at
-- )
-- SELECT
--   f.id,
--   f.user_id,
--   f.parent_id,  -- folders의 parent_id -> distillations의 parent_id
--   f.title,
--   f.icon,       -- folders의 icon -> page_icon
--   true,         -- is_folder
--   f.position,
--   'crystallized',
--   'note',
--   f.created_at,
--   f.updated_at
-- FROM distillai.folders f
-- ON CONFLICT (id) DO NOTHING;

-- 기존 folder_id를 parent_id로 복사
-- UPDATE distillai.distillations d
-- SET parent_id = d.folder_id
-- WHERE d.folder_id IS NOT NULL
--   AND d.parent_id IS NULL;

-- ============================================
-- 8. 코멘트
-- ============================================

COMMENT ON COLUMN distillai.distillations.parent_id IS
  '부모 페이지 ID. NULL이면 루트 페이지.';

COMMENT ON COLUMN distillai.distillations.position IS
  '같은 부모 아래에서의 정렬 순서 (0부터 시작).';

COMMENT ON COLUMN distillai.distillations.is_folder IS
  'true면 폴더형 페이지 (하위 페이지 컨테이너로 사용).';

COMMENT ON COLUMN distillai.distillations.collapsed IS
  '사이드바에서 이 페이지의 자식 목록이 접혀있는지 여부.';

COMMENT ON FUNCTION distillai.get_page_tree(UUID) IS
  '사용자의 전체 페이지 트리를 계층적으로 조회합니다.';

COMMENT ON FUNCTION distillai.move_page(UUID, UUID, UUID, INTEGER) IS
  '페이지를 다른 부모 아래로 이동하고 position을 설정합니다.';
