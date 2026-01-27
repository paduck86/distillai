import { query, queryOne } from '../config/db.js';
import { NotFoundError } from '../middleware/error.middleware.js';
import type {
  Distillation,
  CreateDistillation,
  UpdateDistillation,
  DistillationRow,
  DistillationStatus,
} from '../types/index.js';
import { mapDistillationRow } from '../types/index.js';

interface ListOptions {
  folderId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  sourceType?: string;
  page: number;
  limit: number;
}

export async function getDistillations(
  userId: string,
  options: ListOptions
): Promise<{ distillations: Distillation[]; total: number }> {
  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (options.folderId) {
    conditions.push(`folder_id = $${paramIndex++}`);
    params.push(options.folderId);
  }

  if (options.categoryId) {
    conditions.push(`ai_suggested_category_id = $${paramIndex++}`);
    params.push(options.categoryId);
  }

  if (options.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(options.status);
  }

  if (options.search) {
    conditions.push(`title ILIKE $${paramIndex++}`);
    params.push(`%${options.search}%`);
  }

  if (options.sourceType) {
    conditions.push(`source_type = $${paramIndex++}`);
    params.push(options.sourceType);
  }

  const whereClause = conditions.join(' AND ');
  const offset = (options.page - 1) * options.limit;

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM distillai.distillations WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get paginated data
  const rows = await query<DistillationRow>(
    `SELECT * FROM distillai.distillations
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, options.limit, offset]
  );

  return {
    distillations: rows.map(mapDistillationRow),
    total,
  };
}

// Legacy alias
export const getLectures = getDistillations;

export async function getDistillation(userId: string, distillationId: string): Promise<Distillation> {
  const row = await queryOne<DistillationRow>(
    `SELECT * FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

// Legacy alias
export const getLecture = getDistillation;

export async function createDistillation(userId: string, input: CreateDistillation): Promise<Distillation> {
  // categoryId가 있으면 사용자가 직접 선택한 카테고리이므로 category_confirmed = true
  const hasCategoryId = !!input.categoryId;

  const row = await queryOne<DistillationRow>(
    `INSERT INTO distillai.distillations (user_id, title, description, folder_id, tags, source_type, source_url, ai_suggested_category_id, category_confirmed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.folderId ?? null,
      input.tags ?? [],
      input.sourceType ?? 'recording',
      input.sourceUrl ?? null,
      input.categoryId ?? null,
      hasCategoryId,
    ]
  );

  if (!row) {
    throw new Error('Failed to create distillation');
  }

  return mapDistillationRow(row);
}

// Legacy alias
export const createLecture = createDistillation;

export async function updateDistillation(
  userId: string,
  distillationId: string,
  input: UpdateDistillation
): Promise<Distillation> {
  // First verify ownership
  await getDistillation(userId, distillationId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(input.description);
  }
  if (input.folderId !== undefined) {
    updates.push(`folder_id = $${paramIndex++}`);
    params.push(input.folderId);
  }
  if (input.summaryMd !== undefined) {
    updates.push(`summary_md = $${paramIndex++}`);
    params.push(input.summaryMd);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    params.push(input.tags);
  }

  updates.push(`updated_at = NOW()`);

  const row = await queryOne<DistillationRow>(
    `UPDATE distillai.distillations
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    [...params, distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

// Legacy alias
export const updateLecture = updateDistillation;

export async function deleteDistillation(userId: string, distillationId: string): Promise<void> {
  // First verify ownership
  await getDistillation(userId, distillationId);

  await query(
    `DELETE FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );
}

// Legacy alias
export const deleteLecture = deleteDistillation;

export async function updateStatus(
  userId: string,
  distillationId: string,
  status: DistillationStatus,
  errorMessage?: string
): Promise<void> {
  const processedAt = status === 'crystallized' ? 'NOW()' : 'NULL';

  await query(
    `UPDATE distillai.distillations
     SET status = $1, error_message = $2, processed_at = ${processedAt}, updated_at = NOW()
     WHERE id = $3 AND user_id = $4`,
    [status, errorMessage ?? null, distillationId, userId]
  );
}

export async function updateAudioInfo(
  userId: string,
  distillationId: string,
  info: { audioPath: string; fileSize: number; durationSeconds?: number }
): Promise<Distillation> {
  const row = await queryOne<DistillationRow>(
    `UPDATE distillai.distillations
     SET audio_path = $1, file_size = $2, duration_seconds = $3, status = 'pending', updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING *`,
    [info.audioPath, info.fileSize, info.durationSeconds ?? null, distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

export async function updateSummary(
  userId: string,
  distillationId: string,
  summary: { summaryMd: string; fullTranscript: string }
): Promise<Distillation> {
  const row = await queryOne<DistillationRow>(
    `UPDATE distillai.distillations
     SET summary_md = $1, full_transcript = $2, status = 'crystallized', processed_at = NOW(), updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [summary.summaryMd, summary.fullTranscript, distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

/**
 * AI 요약과 카테고리 정보를 함께 업데이트
 */
export async function updateSummaryWithCategory(
  userId: string,
  distillationId: string,
  summary: {
    summaryMd: string;
    fullTranscript: string;
    aiCategoryId?: string;
    aiSuggestedTags?: string[];
    aiConfidence?: number;
    aiReasoning?: string;
    title?: string;  // AI 추천 제목 (텍스트 입력 시)
  }
): Promise<Distillation> {
  // title이 있으면 포함, 없으면 제외하는 동적 쿼리
  const hasTitle = !!summary.title;
  const query = hasTitle
    ? `UPDATE distillai.distillations
       SET
         title = $1,
         summary_md = $2,
         full_transcript = $3,
         ai_suggested_category_id = $4,
         ai_suggested_tags = $5,
         ai_confidence = $6,
         ai_reasoning = $7,
         category_confirmed = false,
         status = 'crystallized',
         processed_at = NOW(),
         updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`
    : `UPDATE distillai.distillations
       SET
         summary_md = $1,
         full_transcript = $2,
         ai_suggested_category_id = $3,
         ai_suggested_tags = $4,
         ai_confidence = $5,
         ai_reasoning = $6,
         category_confirmed = false,
         status = 'crystallized',
         processed_at = NOW(),
         updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`;

  const params = hasTitle
    ? [
        summary.title,
        summary.summaryMd,
        summary.fullTranscript,
        summary.aiCategoryId ?? null,
        summary.aiSuggestedTags ?? [],
        summary.aiConfidence ?? null,
        summary.aiReasoning ?? null,
        distillationId,
        userId,
      ]
    : [
        summary.summaryMd,
        summary.fullTranscript,
        summary.aiCategoryId ?? null,
        summary.aiSuggestedTags ?? [],
        summary.aiConfidence ?? null,
        summary.aiReasoning ?? null,
        distillationId,
        userId,
      ];

  const row = await queryOne<DistillationRow>(query, params);

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

/**
 * AI 추천 카테고리 확인/수정
 */
export async function confirmCategory(
  userId: string,
  distillationId: string,
  options: {
    categoryId?: string;
    tags?: string[];
  }
): Promise<Distillation> {
  // First verify ownership
  const existing = await getDistillation(userId, distillationId);

  // 카테고리 ID가 없으면 기존 AI 추천 카테고리 사용
  const categoryId = options.categoryId ?? existing.aiSuggestedCategoryId;
  // 태그가 없으면 기존 AI 추천 태그 사용
  const tags = options.tags ?? existing.aiSuggestedTags;

  const row = await queryOne<DistillationRow>(
    `UPDATE distillai.distillations
     SET
       ai_suggested_category_id = $1,
       tags = $2,
       category_confirmed = true,
       updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [categoryId, tags, distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

/**
 * 텍스트와 함께 Distillation 생성 (텍스트 요약용)
 */
export async function createDistillationWithText(
  userId: string,
  input: CreateDistillation & { text: string }
): Promise<Distillation> {
  const hasCategoryId = !!input.categoryId;

  const row = await queryOne<DistillationRow>(
    `INSERT INTO distillai.distillations (user_id, title, description, folder_id, tags, source_type, source_url, ai_suggested_category_id, category_confirmed, full_transcript, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     RETURNING *`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.folderId ?? null,
      input.tags ?? [],
      'text',
      null,
      input.categoryId ?? null,
      hasCategoryId,
      input.text,
    ]
  );

  if (!row) {
    throw new Error('Failed to create distillation');
  }

  return mapDistillationRow(row);
}

/**
 * 미분류 Distillation 목록 조회
 */
export async function getUncategorizedDistillations(
  userId: string,
  options: { page: number; limit: number }
): Promise<{ distillations: Distillation[]; total: number }> {
  const offset = (options.page - 1) * options.limit;

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM distillai.distillations
     WHERE user_id = $1 AND category_confirmed = false AND status = 'crystallized'`,
    [userId]
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  const rows = await query<DistillationRow>(
    `SELECT * FROM distillai.distillations
     WHERE user_id = $1 AND category_confirmed = false AND status = 'crystallized'
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, options.limit, offset]
  );

  return {
    distillations: rows.map(mapDistillationRow),
    total,
  };
}

/**
 * 사용자 노트 업데이트
 */
export async function updateUserNotes(
  userId: string,
  distillationId: string,
  userNotes: string
): Promise<Distillation> {
  const row = await queryOne<DistillationRow>(
    `UPDATE distillai.distillations
     SET user_notes = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [userNotes, distillationId, userId]
  );

  if (!row) {
    throw new NotFoundError('Distillation');
  }

  return mapDistillationRow(row);
}

/**
 * X (Twitter) 콘텐츠와 함께 Distillation 생성
 */
export async function createDistillationWithXContent(
  userId: string,
  input: CreateDistillation & {
    text: string;
    xAuthorHandle: string;
    xAuthorName: string;
    xTweetId: string;
    xMediaUrls: string[];
  }
): Promise<Distillation> {
  const hasCategoryId = !!input.categoryId;

  const row = await queryOne<DistillationRow>(
    `INSERT INTO distillai.distillations (
      user_id, title, description, folder_id, tags,
      source_type, source_url, ai_suggested_category_id, category_confirmed,
      full_transcript, status,
      x_author_handle, x_author_name, x_tweet_id, x_media_urls
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14)
    RETURNING *`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.folderId ?? null,
      input.tags ?? [],
      input.sourceType ?? 'x_thread',
      input.sourceUrl ?? null,
      input.categoryId ?? null,
      hasCategoryId,
      input.text,
      input.xAuthorHandle,
      input.xAuthorName,
      input.xTweetId,
      input.xMediaUrls,
    ]
  );

  if (!row) {
    throw new Error('Failed to create distillation');
  }

  return mapDistillationRow(row);
}
