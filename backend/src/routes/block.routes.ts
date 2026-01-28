/**
 * Block Routes
 *
 * Notion-style 블록 API 라우트
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as blockController from '../controllers/block.controller.js';

const router = Router();

// 모든 블록 라우트는 인증 필요
router.use(authMiddleware);

// ============================================
// 블록 조회
// ============================================

// GET /blocks/:distillationId - 특정 Distillation의 모든 블록
router.get('/:distillationId', blockController.getBlocks);

// GET /blocks/single/:blockId - 단일 블록 조회
router.get('/single/:blockId', blockController.getBlock);

// ============================================
// 블록 생성
// ============================================

// POST /blocks - 단일 블록 생성
router.post('/', blockController.createBlock);

// POST /blocks/batch - 여러 블록 일괄 생성
router.post('/batch', blockController.createBlocks);

// ============================================
// 블록 수정
// ============================================

// PUT /blocks/:blockId - 블록 수정
router.put('/:blockId', blockController.updateBlock);

// PUT /blocks/:blockId/move - 블록 이동
router.put('/:blockId/move', blockController.moveBlock);

// PUT /blocks/reorder/:distillationId - 순서 재정렬
router.put('/reorder/:distillationId', blockController.reorderBlocks);

// PUT /blocks/batch/:distillationId - 여러 블록 일괄 업데이트
router.put('/batch/:distillationId', blockController.updateBlocks);

// ============================================
// 블록 삭제
// ============================================

// DELETE /blocks/:blockId - 단일 블록 삭제
router.delete('/:blockId', blockController.deleteBlock);

// DELETE /blocks/all/:distillationId - 모든 블록 삭제
router.delete('/all/:distillationId', blockController.deleteAllBlocks);

// ============================================
// 마이그레이션
// ============================================

// POST /blocks/migrate/:distillationId - Markdown → 블록 변환
router.post('/migrate/:distillationId', blockController.migrateToBlocks);

export default router;
