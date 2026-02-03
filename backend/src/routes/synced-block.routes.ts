/**
 * Synced Block Routes
 *
 * 동기화 블록 API 라우트
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as syncedBlockController from '../controllers/synced-block.controller.js';

const router = Router();

// 모든 동기화 블록 라우트는 인증 필요
router.use(authMiddleware);

// ============================================
// 동기화 블록 CRUD
// ============================================

// GET /synced-blocks - 모든 동기화 블록 조회
router.get('/', syncedBlockController.getSyncedBlocks);

// GET /synced-blocks/:id - 동기화 블록 상세 조회
router.get('/:id', syncedBlockController.getSyncedBlock);

// POST /synced-blocks - 동기화 블록 생성
router.post('/', syncedBlockController.createSyncedBlock);

// PUT /synced-blocks/:id - 동기화 블록 업데이트
router.put('/:id', syncedBlockController.updateSyncedBlock);

// DELETE /synced-blocks/:id - 동기화 블록 삭제
router.delete('/:id', syncedBlockController.deleteSyncedBlock);

// ============================================
// 블록 ↔ 동기화 블록 연결
// ============================================

// POST /synced-blocks/from-block/:blockId - 블록을 동기화 블록으로 변환
router.post('/from-block/:blockId', syncedBlockController.convertBlockToSynced);

// POST /synced-blocks/:id/link/:blockId - 블록에 동기화 블록 참조 연결
router.post('/:id/link/:blockId', syncedBlockController.linkBlockToSynced);

// DELETE /synced-blocks/unlink/:blockId - 블록에서 동기화 블록 연결 해제
router.delete('/unlink/:blockId', syncedBlockController.unlinkBlockFromSynced);

// ============================================
// 참조 조회
// ============================================

// GET /synced-blocks/:id/references - 동기화 블록 참조 목록
router.get('/:id/references', syncedBlockController.getSyncedBlockReferences);

export default router;
