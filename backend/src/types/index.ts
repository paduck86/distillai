import { User } from '@supabase/supabase-js';

// Express Request 확장
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ============================================
// Domain Types
// ============================================

// Profile
export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Folder
export interface Folder {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  parentId: string | null;
  color: string;
  icon: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolder {
  title: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateFolder {
  title?: string;
  description?: string;
  parentId?: string;
  color?: string;
  icon?: string;
  position?: number;
}

// Source Type (콘텐츠 소스 유형)
export type SourceType = 'youtube' | 'audio' | 'video' | 'url' | 'recording' | 'pdf' | 'website' | 'text';

// Distillation (노트)
export interface Distillation {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  description: string | null;
  audioPath: string | null;
  audioUrl: string | null;
  durationSeconds: number | null;
  fileSize: number | null;
  summaryMd: string | null;
  fullTranscript: string | null;
  status: DistillationStatus;
  errorMessage: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 소스 유형
  sourceType: SourceType;
  sourceUrl: string | null;
  // AI 카테고리 필드
  aiSuggestedCategoryId: string | null;
  aiSuggestedTags: string[];
  aiConfidence: number | null;
  aiReasoning: string | null;
  categoryConfirmed: boolean;
}

export type DistillationStatus = 'pending' | 'uploading' | 'processing' | 'crystallized' | 'failed';

export interface CreateDistillation {
  title: string;
  description?: string;
  folderId?: string;
  categoryId?: string;
  tags?: string[];
  sourceType?: SourceType;
  sourceUrl?: string;
}

export interface UpdateDistillation {
  title?: string;
  description?: string;
  folderId?: string | null;
  summaryMd?: string;
  tags?: string[];
}

// Legacy aliases for backward compatibility
export type Lecture = Distillation;
export type LectureStatus = DistillationStatus;
export type CreateLecture = CreateDistillation;
export type UpdateLecture = UpdateDistillation;

// Chat Message
export interface ChatMessage {
  id: string;
  userId: string;
  distillationId: string;
  role: 'user' | 'assistant';
  content: string;
  model: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface CreateChatMessage {
  distillationId: string;
  content: string;
}

// ============================================
// Category Types
// ============================================
export interface Category {
  id: string;
  userId: string | null;
  name: string;
  nameEn: string | null;
  slug: string;
  color: string;
  icon: string;
  isSystem: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithCount extends Category {
  distillationCount: number;
}

export interface CreateCategory {
  name: string;
  nameEn?: string;
  slug: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategory {
  name?: string;
  nameEn?: string;
  color?: string;
  icon?: string;
  position?: number;
}

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  name_en: string | null;
  slug: string;
  color: string;
  icon: string;
  is_system: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    nameEn: row.name_en,
    slug: row.slug,
    color: row.color,
    icon: row.icon,
    isSystem: row.is_system,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// AI Category Extraction Types
// ============================================
export interface CategoryExtractionResult {
  category: string;           // slug
  confidence: number;         // 0-1
  suggestedTags: string[];    // 추천 태그 5개
  reasoning: string;          // AI 판단 근거
}

// ============================================
// Gemini Types
// ============================================
export interface SummarizeResult {
  summary: string;
  transcript: string;
  aiCategory?: CategoryExtractionResult;  // AI 카테고리 추천
}

export interface ChatCompletionResult {
  content: string;
  tokensUsed: number;
  model: string;
}

// ============================================
// Database Row Types (snake_case)
// ============================================
export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FolderRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  parent_id: string | null;
  color: string;
  icon: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DistillationRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  audio_path: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  file_size: number | null;
  summary_md: string | null;
  full_transcript: string | null;
  status: string;
  error_message: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
  // 소스 유형
  source_type: string;
  source_url: string | null;
  // AI 카테고리 필드
  ai_suggested_category_id: string | null;
  ai_suggested_tags: string[];
  ai_confidence: number | null;
  ai_reasoning: string | null;
  category_confirmed: boolean;
}

// Legacy alias
export type LectureRow = DistillationRow;

export interface ChatMessageRow {
  id: string;
  user_id: string;
  distillation_id: string;
  role: string;
  content: string;
  model: string | null;
  tokens_used: number | null;
  created_at: string;
}

// ============================================
// Mapper Functions
// ============================================
export function mapFolderRow(row: FolderRow): Folder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    parentId: row.parent_id,
    color: row.color,
    icon: row.icon,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDistillationRow(row: DistillationRow): Distillation {
  return {
    id: row.id,
    userId: row.user_id,
    folderId: row.folder_id,
    title: row.title,
    description: row.description,
    audioPath: row.audio_path,
    audioUrl: row.audio_url,
    durationSeconds: row.duration_seconds,
    fileSize: row.file_size,
    summaryMd: row.summary_md,
    fullTranscript: row.full_transcript,
    status: row.status as DistillationStatus,
    errorMessage: row.error_message,
    tags: row.tags ?? [],
    metadata: row.metadata ?? {},
    processedAt: row.processed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // 소스 유형
    sourceType: (row.source_type as SourceType) ?? 'recording',
    sourceUrl: row.source_url,
    // AI 카테고리 필드
    aiSuggestedCategoryId: row.ai_suggested_category_id,
    aiSuggestedTags: row.ai_suggested_tags ?? [],
    aiConfidence: row.ai_confidence,
    aiReasoning: row.ai_reasoning,
    categoryConfirmed: row.category_confirmed ?? false,
  };
}

// Legacy alias
export const mapLectureRow = mapDistillationRow;

export function mapChatMessageRow(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    distillationId: row.distillation_id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    model: row.model,
    tokensUsed: row.tokens_used,
    createdAt: row.created_at,
  };
}
