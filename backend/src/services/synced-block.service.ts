/**
 * Synced Block Service
 *
 * 동기화 블록 CRUD 및 관리 서비스
 * 여러 페이지에서 동일한 콘텐츠를 참조하고 실시간 동기화
 */

import { query, queryOne } from '../config/db.js';
import { NotFoundError, AppError } from '../middleware/error.middleware.js';
import type {
  SyncedBlock,
  SyncedBlockRow,
  SyncedBlockContent,
  CreateSyncedBlock,
  UpdateSyncedBlock,
  SyncedBlockWithRefs,
} from '../types/index.js';
import { mapSyncedBlockRow } from '../types/index.js';

// ============================================
// Synced Block CRUD
// ============================================

/**
 * 사용자의 모든 동기화 블록 조회
 */
export async function getSyncedBlocks(
  userId: string
): Promise<SyncedBlock[]> {
  const rows = await query<SyncedBlockRow>(
    `SELECT * FROM distillai.synced_blocks
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  );

  return rows.map(mapSyncedBlockRow);
}

/**
 * 동기화 블록 상세 조회 (참조 수 포함)
 */
export async function getSyncedBlock(
  userId: string,
  syncedBlockId: string
): Promise<SyncedBlockWithRefs> {
  const row = await queryOne<SyncedBlockRow>(
    `SELECT * FROM distillai.synced_blocks
     WHERE id = $1 AND user_id = $2`,
    [syncedBlockId, userId]
  );

  if (!row) {
    throw new NotFoundError('SyncedBlock');
  }

  // 참조 수 조회
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM distillai.blocks
     WHERE synced_block_id = $1`,
    [syncedBlockId]
  );

  // 참조하는 페이지 ID 목록 조회
  const pageRows = await query<{ distillation_id: string }>(
    `SELECT DISTINCT distillation_id FROM distillai.blocks
     WHERE synced_block_id = $1`,
    [syncedBlockId]
  );

  return {
    ...mapSyncedBlockRow(row),
    referenceCount: parseInt(countResult?.count ?? '0', 10),
    referencedPages: pageRows.map(r => r.distillation_id),
  };
}

/**
 * 동기화 블록 생성
 */
export async function createSyncedBlock(
  userId: string,
  input: CreateSyncedBlock
): Promise<SyncedBlock> {
  const row = await queryOne<SyncedBlockRow>(
    `INSERT INTO distillai.synced_blocks (user_id, content, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      userId,
      JSON.stringify(input.content),
      input.title ?? null,
    ]
  );

  if (!row) {
    throw new AppError(500, 'SYNCED_BLOCK_CREATE_FAILED', '동기화 블록 생성 실패');
  }

  return mapSyncedBlockRow(row);
}

/**
 * 동기화 블록 업데이트
 */
export async function updateSyncedBlock(
  userId: string,
  syncedBlockId: string,
  input: UpdateSyncedBlock
): Promise<SyncedBlock> {
  // 소유권 확인
  const existing = await queryOne<SyncedBlockRow>(
    `SELECT id FROM distillai.synced_blocks
     WHERE id = $1 AND user_id = $2`,
    [syncedBlockId, userId]
  );

  if (!existing) {
    throw new NotFoundError('SyncedBlock');
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    params.push(JSON.stringify(input.content));
  }
  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(input.title);
  }

  if (updates.length === 0) {
    return getSyncedBlock(userId, syncedBlockId);
  }

  const row = await queryOne<SyncedBlockRow>(
    `UPDATE distillai.synced_blocks
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    [...params, syncedBlockId]
  );

  if (!row) {
    throw new NotFoundError('SyncedBlock');
  }

  return mapSyncedBlockRow(row);
}

/**
 * 동기화 블록 삭제
 * 참조하는 모든 blocks의 synced_block_id가 NULL로 설정됨 (ON DELETE SET NULL)
 */
export async function deleteSyncedBlock(
  userId: string,
  syncedBlockId: string
): Promise<void> {
  // 소유권 확인
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.synced_blocks
     WHERE id = $1 AND user_id = $2`,
    [syncedBlockId, userId]
  );

  if (!existing) {
    throw new NotFoundError('SyncedBlock');
  }

  await query(
    `DELETE FROM distillai.synced_blocks WHERE id = $1`,
    [syncedBlockId]
  );
}

// ============================================
// Block ↔ Synced Block 연결
// ============================================

/**
 * 블록을 동기화 블록으로 변환 (새 synced_block 생성)
 */
export async function convertBlockToSyncedBlock(
  userId: string,
  blockId: string
): Promise<SyncedBlock> {
  // 블록 조회 및 소유권 확인
  const blockRow = await queryOne<{
    id: string;
    type: string;
    content: string;
    properties: object;
  }>(
    `SELECT b.id, b.type, b.content, b.properties
     FROM distillai.blocks b
     JOIN distillai.distillations d ON b.distillation_id = d.id
     WHERE b.id = $1 AND d.user_id = $2`,
    [blockId, userId]
  );

  if (!blockRow) {
    throw new NotFoundError('Block');
  }

  // 동기화 블록 생성
  const syncedContent: SyncedBlockContent[] = [{
    type: blockRow.type as any,
    content: blockRow.content,
    properties: blockRow.properties as any,
  }];

  const syncedBlock = await createSyncedBlock(userId, {
    content: syncedContent,
  });

  // 원본 블록에 synced_block_id 연결
  await query(
    `UPDATE distillai.blocks
     SET synced_block_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [syncedBlock.id, blockId]
  );

  return syncedBlock;
}

/**
 * 블록에 기존 동기화 블록 참조 연결
 */
export async function linkBlockToSyncedBlock(
  userId: string,
  blockId: string,
  syncedBlockId: string
): Promise<void> {
  // 블록 소유권 확인
  const blockRow = await queryOne<{ id: string }>(
    `SELECT b.id
     FROM distillai.blocks b
     JOIN distillai.distillations d ON b.distillation_id = d.id
     WHERE b.id = $1 AND d.user_id = $2`,
    [blockId, userId]
  );

  if (!blockRow) {
    throw new NotFoundError('Block');
  }

  // 동기화 블록 소유권 확인
  const syncedRow = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.synced_blocks
     WHERE id = $1 AND user_id = $2`,
    [syncedBlockId, userId]
  );

  if (!syncedRow) {
    throw new NotFoundError('SyncedBlock');
  }

  // 연결
  await query(
    `UPDATE distillai.blocks
     SET synced_block_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [syncedBlockId, blockId]
  );
}

/**
 * 블록에서 동기화 블록 연결 해제
 */
export async function unlinkBlockFromSyncedBlock(
  userId: string,
  blockId: string
): Promise<void> {
  // 블록 소유권 확인
  const blockRow = await queryOne<{ id: string }>(
    `SELECT b.id
     FROM distillai.blocks b
     JOIN distillai.distillations d ON b.distillation_id = d.id
     WHERE b.id = $1 AND d.user_id = $2`,
    [blockId, userId]
  );

  if (!blockRow) {
    throw new NotFoundError('Block');
  }

  // 연결 해제
  await query(
    `UPDATE distillai.blocks
     SET synced_block_id = NULL, updated_at = NOW()
     WHERE id = $1`,
    [blockId]
  );
}

/**
 * 동기화 블록을 참조하는 모든 블록 조회
 */
export async function getSyncedBlockReferences(
  userId: string,
  syncedBlockId: string
): Promise<Array<{ blockId: string; distillationId: string; pageTitle: string }>> {
  // 소유권 확인
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.synced_blocks
     WHERE id = $1 AND user_id = $2`,
    [syncedBlockId, userId]
  );

  if (!existing) {
    throw new NotFoundError('SyncedBlock');
  }

  const rows = await query<{
    block_id: string;
    distillation_id: string;
    page_title: string;
  }>(
    `SELECT b.id as block_id, b.distillation_id, d.title as page_title
     FROM distillai.blocks b
     JOIN distillai.distillations d ON b.distillation_id = d.id
     WHERE b.synced_block_id = $1`,
    [syncedBlockId]
  );

  return rows.map(r => ({
    blockId: r.block_id,
    distillationId: r.distillation_id,
    pageTitle: r.page_title,
  }));
}
