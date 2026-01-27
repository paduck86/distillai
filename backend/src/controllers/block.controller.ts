/**
 * Block Controller
 *
 * Notion-style 블록 API 엔드포인트 핸들러
 */

import { Request, Response, NextFunction } from 'express';
import * as blockService from '../services/block.service.js';
import { AppError } from '../middleware/error.middleware.js';
import type { CreateBlock, UpdateBlock } from '../types/index.js';

/**
 * GET /blocks/:distillationId
 * 특정 Distillation의 모든 블록 조회
 */
export async function getBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId;

    if (!distillationId) {
      throw new AppError(400, 'MISSING_PARAM', 'distillationId is required');
    }

    const blocks = await blockService.getBlocks(userId, distillationId);

    res.json({ data: blocks });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /blocks/single/:blockId
 * 단일 블록 조회
 */
export async function getBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    const block = await blockService.getBlock(userId, blockId);

    res.json({ data: block });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /blocks
 * 블록 생성
 */
export async function createBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const input: CreateBlock = req.body;

    const block = await blockService.createBlock(userId, input);

    res.status(201).json({ data: block });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /blocks/batch
 * 여러 블록 일괄 생성
 */
export async function createBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { distillationId, blocks } = req.body;

    if (!distillationId) {
      throw new AppError(400, 'MISSING_PARAM', 'distillationId is required');
    }

    const createdBlocks = await blockService.createBlocks(userId, distillationId, blocks);

    res.status(201).json({ data: createdBlocks });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /blocks/:blockId
 * 블록 수정
 */
export async function updateBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    const input: UpdateBlock = req.body;
    const block = await blockService.updateBlock(userId, blockId, input);

    res.json({ data: block });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /blocks/:blockId
 * 블록 삭제
 */
export async function deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    await blockService.deleteBlock(userId, blockId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /blocks/all/:distillationId
 * 모든 블록 삭제
 */
export async function deleteAllBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId;

    if (!distillationId) {
      throw new AppError(400, 'MISSING_PARAM', 'distillationId is required');
    }

    await blockService.deleteAllBlocks(userId, distillationId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /blocks/reorder/:distillationId
 * 블록 순서 재정렬
 */
export async function reorderBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId;

    if (!distillationId) {
      throw new AppError(400, 'MISSING_PARAM', 'distillationId is required');
    }

    const { blockIds } = req.body;
    await blockService.reorderBlocks(userId, distillationId, blockIds);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /blocks/:blockId/move
 * 블록 이동
 */
export async function moveBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const blockId = req.params.blockId;

    if (!blockId) {
      throw new AppError(400, 'MISSING_PARAM', 'blockId is required');
    }

    const { newParentId, newPosition } = req.body;
    const block = await blockService.moveBlock(userId, blockId, newParentId, newPosition);

    res.json({ data: block });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /blocks/migrate/:distillationId
 * 기존 Markdown을 블록으로 마이그레이션
 */
export async function migrateToBlocks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const distillationId = req.params.distillationId;

    if (!distillationId) {
      throw new AppError(400, 'MISSING_PARAM', 'distillationId is required');
    }

    const blocks = await blockService.migrateDistillationToBlocks(userId, distillationId);

    res.json({ data: blocks });
  } catch (error) {
    next(error);
  }
}
