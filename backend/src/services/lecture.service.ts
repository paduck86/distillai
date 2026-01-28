import { query, queryOne } from '../config/db.js';
import { NotFoundError } from '../middleware/error.middleware.js';
import type {
  Distillation,
  CreateDistillation,
  UpdateDistillation,
  DistillationRow,
  DistillationStatus,
  PageTreeNode,
  PageTreeRow,
  CreatePage,
  MovePage,
  DistillationWithHierarchy,
  DistillationRowWithHierarchy,
} from '../types/index.js';
import { mapDistillationRow, mapPageTreeRow, mapDistillationRowWithHierarchy } from '../types/index.js';

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

// ============================================
// Page Hierarchy Functions
// ============================================

/**
 * 페이지 트리 조회
 */
export async function getPageTree(userId: string): Promise<PageTreeNode[]> {
  const rows = await query<PageTreeRow>(
    `SELECT * FROM distillai.get_page_tree($1)`,
    [userId]
  );

  // Build tree structure from flat list
  const nodeMap = new Map<string, PageTreeNode>();
  const roots: PageTreeNode[] = [];

  // First pass: create all nodes
  for (const row of rows) {
    const node: PageTreeNode = {
      ...mapPageTreeRow(row),
      children: [],
    };
    nodeMap.set(node.id, node);
  }

  // Second pass: build tree
  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parent_id && nodeMap.has(row.parent_id)) {
      nodeMap.get(row.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by position recursively
  const sortChildren = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(roots);

  return roots;
}

/**
 * 빈 페이지 생성 (노션 스타일)
 */
export async function createPage(userId: string, input: CreatePage): Promise<DistillationWithHierarchy> {
  const title = input.title?.trim() || 'Untitled';
  const sourceType = input.sourceType || 'note';

  const row = await queryOne<DistillationRowWithHierarchy>(
    `INSERT INTO distillai.distillations (
      user_id, title, parent_id, is_folder, page_icon, source_type, status, position
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'crystallized', COALESCE(
      (SELECT MAX(position) + 1 FROM distillai.distillations WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $3),
      0
    ))
    RETURNING *`,
    [
      userId,
      title,
      input.parentId ?? null,
      input.isFolder ?? false,
      input.pageIcon ?? null,
      sourceType,
    ]
  );

  if (!row) {
    throw new Error('Failed to create page');
  }

  return mapDistillationRowWithHierarchy(row);
}

/**
 * 페이지 이동 (부모 변경 + 위치 변경)
 */
export async function movePage(
  userId: string,
  pageId: string,
  move: MovePage
): Promise<void> {
  // DB 함수 호출
  await query(
    `SELECT distillai.move_page($1, $2, $3, $4)`,
    [userId, pageId, move.parentId, move.position]
  );
}

/**
 * 페이지 접힘 상태 토글
 */
export async function toggleCollapse(
  userId: string,
  pageId: string
): Promise<DistillationWithHierarchy> {
  const row = await queryOne<DistillationRowWithHierarchy>(
    `UPDATE distillai.distillations
     SET collapsed = NOT collapsed, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [pageId, userId]
  );

  if (!row) {
    throw new NotFoundError('Page');
  }

  return mapDistillationRowWithHierarchy(row);
}

/**
 * 페이지 업데이트 (제목, 아이콘, 부모 등)
 */
export async function updatePageHierarchy(
  userId: string,
  pageId: string,
  updates: {
    title?: string;
    parentId?: string | null;
    pageIcon?: string | null;
    pageCover?: string | null;
    isFolder?: boolean;
    position?: number;
  }
): Promise<DistillationWithHierarchy> {
  // First verify ownership
  await getDistillation(userId, pageId);

  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    setClauses.push(`title = $${paramIndex++}`);
    params.push(updates.title);
  }
  if (updates.parentId !== undefined) {
    setClauses.push(`parent_id = $${paramIndex++}`);
    params.push(updates.parentId);
  }
  if (updates.pageIcon !== undefined) {
    setClauses.push(`page_icon = $${paramIndex++}`);
    params.push(updates.pageIcon);
  }
  if (updates.pageCover !== undefined) {
    setClauses.push(`page_cover = $${paramIndex++}`);
    params.push(updates.pageCover);
  }
  if (updates.isFolder !== undefined) {
    setClauses.push(`is_folder = $${paramIndex++}`);
    params.push(updates.isFolder);
  }
  if (updates.position !== undefined) {
    setClauses.push(`position = $${paramIndex++}`);
    params.push(updates.position);
  }

  setClauses.push(`updated_at = NOW()`);

  const row = await queryOne<DistillationRowWithHierarchy>(
    `UPDATE distillai.distillations
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    [...params, pageId, userId]
  );

  if (!row) {
    throw new NotFoundError('Page');
  }

  return mapDistillationRowWithHierarchy(row);
}

/**
 * 페이지 순서 일괄 업데이트
 */
export async function reorderPages(
  userId: string,
  pageIds: string[],
  parentId: string | null
): Promise<void> {
  // 각 페이지의 position을 순서대로 업데이트
  for (let i = 0; i < pageIds.length; i++) {
    await query(
      `UPDATE distillai.distillations
       SET position = $1, parent_id = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4`,
      [i, parentId, pageIds[i], userId]
    );
  }
}

// ============================================
// Trash Functions
// ============================================

interface TrashedPage {
  id: string;
  title: string;
  trashedAt: string;
  sourceType?: string;
}

/**
 * 휴지통 페이지 목록 조회
 */
export async function getTrashPages(userId: string): Promise<TrashedPage[]> {
  const rows = await query<{
    id: string;
    title: string;
    trashed_at: string;
    source_type: string | null;
  }>(
    `SELECT id, title, trashed_at, source_type
     FROM distillai.distillations
     WHERE user_id = $1 AND trashed_at IS NOT NULL
     ORDER BY trashed_at DESC`,
    [userId]
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    trashedAt: row.trashed_at,
    sourceType: row.source_type ?? undefined,
  }));
}

/**
 * 페이지를 휴지통으로 이동
 */
export async function moveToTrash(userId: string, pageId: string): Promise<void> {
  // First verify ownership
  await getDistillation(userId, pageId);

  await query(
    `UPDATE distillai.distillations
     SET trashed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [pageId, userId]
  );
}

/**
 * 휴지통에서 페이지 복원
 */
export async function restoreFromTrash(userId: string, pageId: string): Promise<void> {
  await query(
    `UPDATE distillai.distillations
     SET trashed_at = NULL, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NOT NULL`,
    [pageId, userId]
  );
}

/**
 * 페이지 영구 삭제
 */
export async function deletePermanently(userId: string, pageId: string): Promise<void> {
  await query(
    `DELETE FROM distillai.distillations
     WHERE id = $1 AND user_id = $2 AND trashed_at IS NOT NULL`,
    [pageId, userId]
  );
}

/**
 * 휴지통 비우기
 */
export async function emptyTrash(userId: string): Promise<void> {
  await query(
    `DELETE FROM distillai.distillations
     WHERE user_id = $1 AND trashed_at IS NOT NULL`,
    [userId]
  );
}
