-- Distillai Database Migration: AI 카테고리 분류 기능
-- 마이그레이션 002: 카테고리 테이블 및 AI 추천 필드 추가
-- Supabase Dashboard SQL Editor에서 실행하세요

-- ============================================
-- 1. CATEGORIES TABLE (카테고리)
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES distillai.profiles(id) ON DELETE CASCADE,  -- NULL이면 시스템 카테고리
  name TEXT NOT NULL,
  name_en TEXT,  -- 영문명 (i18n 지원)
  slug TEXT NOT NULL,  -- 'lecture', 'meeting', 'podcast' 등
  color TEXT DEFAULT '#6366F1',
  icon TEXT DEFAULT 'tag',
  is_system BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 사용자별 slug 고유 (시스템 카테고리는 user_id가 NULL)
  CONSTRAINT categories_slug_unique UNIQUE NULLS NOT DISTINCT (user_id, slug),
  CONSTRAINT categories_name_not_empty CHECK (char_length(name) > 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON distillai.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON distillai.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON distillai.categories(is_system);

-- ============================================
-- 2. DISTILLATIONS 테이블에 AI 추천 필드 추가
-- ============================================
ALTER TABLE distillai.distillations
ADD COLUMN IF NOT EXISTS ai_suggested_category_id UUID REFERENCES distillai.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_suggested_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) DEFAULT 0,  -- 0.00 ~ 1.00
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,  -- AI 판단 근거
ADD COLUMN IF NOT EXISTS category_confirmed BOOLEAN DEFAULT false;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_distillations_ai_category ON distillai.distillations(ai_suggested_category_id);
CREATE INDEX IF NOT EXISTS idx_distillations_category_confirmed ON distillai.distillations(category_confirmed);
CREATE INDEX IF NOT EXISTS idx_distillations_ai_tags ON distillai.distillations USING gin(ai_suggested_tags);

-- ============================================
-- 3. UPDATED_AT TRIGGER FOR CATEGORIES
-- ============================================
DROP TRIGGER IF EXISTS categories_updated_at ON distillai.categories;
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON distillai.categories
  FOR EACH ROW
  EXECUTE FUNCTION distillai.update_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) FOR CATEGORIES
-- ============================================
ALTER TABLE distillai.categories ENABLE ROW LEVEL SECURITY;

-- 시스템 카테고리는 모든 인증 사용자가 조회 가능
CREATE POLICY "Anyone can view system categories"
  ON distillai.categories FOR SELECT
  USING (is_system = true);

-- 사용자 정의 카테고리는 본인만 조회 가능
CREATE POLICY "Users can view own categories"
  ON distillai.categories FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자 정의 카테고리 생성
CREATE POLICY "Users can create own categories"
  ON distillai.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_system = false);

-- 사용자 정의 카테고리 수정
CREATE POLICY "Users can update own categories"
  ON distillai.categories FOR UPDATE
  USING (auth.uid() = user_id AND is_system = false);

-- 사용자 정의 카테고리 삭제
CREATE POLICY "Users can delete own categories"
  ON distillai.categories FOR DELETE
  USING (auth.uid() = user_id AND is_system = false);

-- ============================================
-- 5. 시스템 기본 카테고리 삽입
-- ============================================
INSERT INTO distillai.categories (user_id, name, name_en, slug, color, icon, is_system, position)
VALUES
  (NULL, '강의/교육', 'Lecture/Education', 'lecture', '#3B82F6', 'graduation-cap', true, 1),
  (NULL, '회의/미팅', 'Meeting', 'meeting', '#10B981', 'users', true, 2),
  (NULL, '팟캐스트', 'Podcast', 'podcast', '#8B5CF6', 'headphones', true, 3),
  (NULL, '인터뷰', 'Interview', 'interview', '#F59E0B', 'message-circle', true, 4),
  (NULL, '기술/개발', 'Tech/Development', 'tech', '#06B6D4', 'code', true, 5),
  (NULL, '기타', 'Other', 'other', '#6B7280', 'file', true, 6)
ON CONFLICT (user_id, slug) DO NOTHING;

-- ============================================
-- 6. VIEWS 업데이트
-- ============================================

-- 카테고리별 통계 뷰
CREATE OR REPLACE VIEW distillai.category_stats AS
SELECT
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  c.color,
  c.icon,
  c.is_system,
  d.user_id,
  COUNT(d.id) as distillation_count
FROM distillai.categories c
LEFT JOIN distillai.distillations d ON d.ai_suggested_category_id = c.id AND d.category_confirmed = true
GROUP BY c.id, c.name, c.slug, c.color, c.icon, c.is_system, d.user_id;

-- 미분류 distillation 뷰
CREATE OR REPLACE VIEW distillai.uncategorized_distillations AS
SELECT d.*
FROM distillai.distillations d
WHERE d.category_confirmed = false
  AND d.status = 'crystallized'
ORDER BY d.created_at DESC;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- 사용자별 카테고리 목록 조회 (시스템 + 사용자 정의)
CREATE OR REPLACE FUNCTION distillai.get_user_categories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_en TEXT,
  slug TEXT,
  color TEXT,
  icon TEXT,
  is_system BOOLEAN,
  "position" INTEGER,
  distillation_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.name_en,
    c.slug,
    c.color,
    c.icon,
    c.is_system,
    c."position",
    COUNT(d.id) FILTER (WHERE d.category_confirmed = true) as distillation_count
  FROM distillai.categories c
  LEFT JOIN distillai.distillations d ON d.ai_suggested_category_id = c.id AND d.user_id = p_user_id
  WHERE c.is_system = true OR c.user_id = p_user_id
  GROUP BY c.id, c.name, c.name_en, c.slug, c.color, c.icon, c.is_system, c."position"
  ORDER BY c.is_system DESC, c."position" ASC, c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- AI 카테고리 확인 함수
CREATE OR REPLACE FUNCTION distillai.confirm_category(
  p_distillation_id UUID,
  p_category_id UUID,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS distillai.distillations AS $$
DECLARE
  v_distillation distillai.distillations;
BEGIN
  UPDATE distillai.distillations
  SET
    ai_suggested_category_id = COALESCE(p_category_id, ai_suggested_category_id),
    tags = COALESCE(p_tags, ai_suggested_tags, tags),
    category_confirmed = true,
    updated_at = NOW()
  WHERE id = p_distillation_id
  RETURNING * INTO v_distillation;

  RETURN v_distillation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON distillai.category_stats TO anon, authenticated;
GRANT SELECT ON distillai.uncategorized_distillations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION distillai.get_user_categories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION distillai.confirm_category(UUID, UUID, TEXT[]) TO authenticated;
