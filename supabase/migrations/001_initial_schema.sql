-- Distillai Database Schema
-- 스키마: distillai
-- Supabase Dashboard SQL Editor에서 실행하세요

-- ============================================
-- 1. SCHEMA & EXTENSIONS
-- ============================================
CREATE SCHEMA IF NOT EXISTS distillai;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. PROFILES TABLE (사용자 프로필)
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 새 사용자 생성 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION distillai.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO distillai.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION distillai.handle_new_user();

-- ============================================
-- 3. FOLDERS TABLE (폴더)
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES distillai.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES distillai.folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#4F46E5',
  icon TEXT DEFAULT 'folder',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT folders_title_not_empty CHECK (char_length(title) > 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON distillai.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON distillai.folders(parent_id);

-- ============================================
-- 4. DISTILLATIONS TABLE (증류물/강의)
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.distillations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES distillai.profiles(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES distillai.folders(id) ON DELETE SET NULL,

  -- 기본 정보
  title TEXT NOT NULL DEFAULT 'Untitled Distillation',
  description TEXT,

  -- 오디오 관련
  audio_path TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  file_size BIGINT,

  -- AI 처리 결과
  summary_md TEXT,
  full_transcript TEXT,

  -- 메타데이터
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'crystallized', 'failed')),
  error_message TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT distillations_title_not_empty CHECK (char_length(title) > 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_distillations_user_id ON distillai.distillations(user_id);
CREATE INDEX IF NOT EXISTS idx_distillations_folder_id ON distillai.distillations(folder_id);
CREATE INDEX IF NOT EXISTS idx_distillations_status ON distillai.distillations(status);
CREATE INDEX IF NOT EXISTS idx_distillations_created_at ON distillai.distillations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_distillations_tags ON distillai.distillations USING gin(tags);

-- ============================================
-- 5. CHAT_MESSAGES TABLE (Agent D 채팅)
-- ============================================
CREATE TABLE IF NOT EXISTS distillai.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES distillai.profiles(id) ON DELETE CASCADE NOT NULL,
  distillation_id UUID REFERENCES distillai.distillations(id) ON DELETE CASCADE NOT NULL,

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- AI 메타데이터
  model TEXT,
  tokens_used INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_messages_distillation_id ON distillai.chat_messages(distillation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON distillai.chat_messages(distillation_id, created_at);

-- ============================================
-- 6. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION distillai.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
DROP TRIGGER IF EXISTS profiles_updated_at ON distillai.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON distillai.profiles
  FOR EACH ROW
  EXECUTE FUNCTION distillai.update_updated_at();

DROP TRIGGER IF EXISTS folders_updated_at ON distillai.folders;
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON distillai.folders
  FOR EACH ROW
  EXECUTE FUNCTION distillai.update_updated_at();

DROP TRIGGER IF EXISTS distillations_updated_at ON distillai.distillations;
CREATE TRIGGER distillations_updated_at
  BEFORE UPDATE ON distillai.distillations
  FOR EACH ROW
  EXECUTE FUNCTION distillai.update_updated_at();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles
ALTER TABLE distillai.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON distillai.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON distillai.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Folders
ALTER TABLE distillai.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders"
  ON distillai.folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
  ON distillai.folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
  ON distillai.folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
  ON distillai.folders FOR DELETE
  USING (auth.uid() = user_id);

-- Distillations
ALTER TABLE distillai.distillations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own distillations"
  ON distillai.distillations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own distillations"
  ON distillai.distillations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own distillations"
  ON distillai.distillations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own distillations"
  ON distillai.distillations FOR DELETE
  USING (auth.uid() = user_id);

-- Chat Messages
ALTER TABLE distillai.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON distillai.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat messages"
  ON distillai.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. STORAGE BUCKET (Supabase Dashboard에서 생성)
-- ============================================
-- 1. Storage → New bucket → 'audio' (Private)
-- 2. Policies:
--    - INSERT: auth.uid()::text = (storage.foldername(name))[1]
--    - SELECT: auth.uid()::text = (storage.foldername(name))[1]
--    - DELETE: auth.uid()::text = (storage.foldername(name))[1]

-- ============================================
-- 9. VIEWS
-- ============================================

-- 사용자별 통계
CREATE OR REPLACE VIEW distillai.user_stats AS
SELECT
  p.id as user_id,
  p.email,
  p.subscription_tier,
  COUNT(DISTINCT f.id) as folder_count,
  COUNT(DISTINCT d.id) as distillation_count,
  COALESCE(SUM(d.duration_seconds), 0) as total_duration_seconds,
  COALESCE(SUM(d.file_size), 0) as total_storage_bytes
FROM distillai.profiles p
LEFT JOIN distillai.folders f ON f.user_id = p.id
LEFT JOIN distillai.distillations d ON d.user_id = p.id
GROUP BY p.id, p.email, p.subscription_tier;

-- 최근 증류물
CREATE OR REPLACE VIEW distillai.recent_distillations AS
SELECT
  d.*,
  f.title as folder_title,
  p.display_name as user_name
FROM distillai.distillations d
LEFT JOIN distillai.folders f ON d.folder_id = f.id
LEFT JOIN distillai.profiles p ON d.user_id = p.id
ORDER BY d.created_at DESC;

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA distillai TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA distillai TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA distillai TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA distillai TO anon, authenticated;
