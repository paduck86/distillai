import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

// GET /api/categories - 사용자별 카테고리 목록
router.get('/', categoryController.getCategories);

// GET /api/categories/system - 시스템 카테고리만
router.get('/system', categoryController.getSystemCategories);

// POST /api/categories - 카테고리 생성
router.post('/', categoryController.createCategory);

// PUT /api/categories/reorder - 카테고리 순서 변경 (/:id 보다 먼저 정의해야 함)
router.put('/reorder', categoryController.reorderCategories);

// PUT /api/categories/:id - 카테고리 수정
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id - 카테고리 삭제
router.delete('/:id', categoryController.deleteCategory);

export default router;
