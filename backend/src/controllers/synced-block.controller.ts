/**
 * Synced Block Controller
 *
 * 동기화 블록 API 엔드포인트 핸들러
 */

import { Request, Response, NextFunction } from 'express';
import * as syncedBlockService from '../services/synced-block.service.js';
import { AppError } from '../middleware/error.middleware.js';
import type { CreateSyncedBlock, UpdateSyncedBlock } from '../types/index.js';

/**
 * GET /synced-blocks
 * 사용자의 모든 동기화 블록 조회
 */
export async function getSyncedBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlocks = await syncedBlockService.getSyncedBlocks(userId);

    res.json({ data: syncedBlocks });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /synced-blocks/:id
 * 동기화 블록 상세 조회 (참조 수 포함)
 */
export async function getSyncedBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlockId = req.params.id;

    if (!syncedBlockId) {
      throw new AppError(400, 'MISSING_PARAM', 'syncedBlockId is required');
    }

    const syncedBlock = await syncedBlockService.getSyncedBlock(userId, syncedBlockId);

    res.json({ data: syncedBlock });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /synced-blocks
 * 동기화 블록 생성
 */
export async function createSyncedBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: CreateSyncedBlock = req.body;

    if (!input.content || !Array.isArray(input.content)) {
      throw new AppError(400, 'INVALID_INPUT', 'content array is required');
    }

    const syncedBlock = await syncedBlockService.createSyncedBlock(userId, input);

    res.status(201).json({ data: syncedBlock });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /synced-blocks/:id
 * 동기화 블록 업데이트
 */
export async function updateSyncedBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlockId = req.params.id;

    if (!syncedBlockId) {
      throw new AppError(400, 'MISSING_PARAM', 'syncedBlockId is required');
    }

    const input: UpdateSyncedBlock = req.body;
    const syncedBlock = await syncedBlockService.updateSyncedBlock(userId, syncedBlockId, input);

    res.json({ data: syncedBlock });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /synced-blocks/:id
 * 동기화 블록 삭제
 */
export async function deleteSyncedBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlockId = req.params.id;

    if (!syncedBlockId) {
      throw new AppError(400, 'MISSING_PARAM', 'syncedBlockId is required');
    }

    await syncedBlockService.deleteSyncedBlock(userId, syncedBlockId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /synced-blocks/from-block/:blockId
 * 기존 블록을 동기화 블록으로 변환
 */
export async function convertBlockToSynced(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    const syncedBlock = await syncedBlockService.convertBlockToSyncedBlock(userId, blockId);

    res.status(201).json({ data: syncedBlock });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /synced-blocks/:id/link/:blockId
 * 블록에 동기화 블록 참조 연결
 */
export async function linkBlockToSynced(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlockId = req.params.id;
    const blockId = req.params.blockId;

    if (!syncedBlockId || !blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'syncedBlockId and blockId are required');
    }

    await syncedBlockService.linkBlockToSyncedBlock(userId, blockId, syncedBlockId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /synced-blocks/unlink/:blockId
 * 블록에서 동기화 블록 연결 해제
 */
export async function unlinkBlockFromSynced(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    await syncedBlockService.unlinkBlockFromSyncedBlock(userId, blockId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /synced-blocks/:id/references
 * 동기화 블록을 참조하는 모든 블록 조회
 */
export async function getSyncedBlockReferences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const syncedBlockId = req.params.id;

    if (!syncedBlockId) {
      throw new AppError(400, 'MISSING_PARAM', 'syncedBlockId is required');
    }

    const references = await syncedBlockService.getSyncedBlockReferences(userId, syncedBlockId);

    res.json({ data: references });
  } catch (error) {
    next(error);
  }
}
