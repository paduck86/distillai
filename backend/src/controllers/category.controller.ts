import { Request, Response, NextFunction } from 'express';
import * as categoryService from '../services/category.service.js';
import { UnauthorizedError, ValidationError } from '../middleware/error.middleware.js';
import type { ApiResponse, CategoryWithCount, Category, CreateCategory, UpdateCategory } from '../types/index.js';

/**
 * GET /api/categories
 * 사용자별 카테고리 목록 (시스템 + 사용자 정의)
 */
export async function getCategories(
  req: Request,
  res: Response<ApiResponse<CategoryWithCount[]>>,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const categories = await categoryService.getCategories(userId);

    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/categories/system
 * 시스템 카테고리만 조회
 */
export async function getSystemCategories(
  req: Request,
  res: Response<ApiResponse<Category[]>>,
  next: NextFunction
) {
  try {
    const categories = await categoryService.getSystemCategories();

    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/categories
 * 사용자 정의 카테고리 생성
 */
export async function createCategory(
  req: Request,
  res: Response<ApiResponse<Category>>,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { name, nameEn, slug, color, icon } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('name is required');
    }
    if (!slug || typeof slug !== 'string' || slug.trim().length === 0) {
      throw new ValidationError('slug is required');
    }
    // slug 형식 검증 (영문 소문자, 숫자, 하이픈만 허용)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new ValidationError('slug must contain only lowercase letters, numbers, and hyphens');
    }

    const input: CreateCategory = {
      name: name.trim(),
      nameEn: nameEn?.trim(),
      slug: slug.trim(),
      color,
      icon,
    };

    const category = await categoryService.createCategory(userId, input);

    res.status(201).json({ data: category });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/categories/:id
 * 카테고리 수정
 */
export async function updateCategory(
  req: Request,
  res: Response<ApiResponse<Category>>,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const id = req.params.id!;
    const { name, nameEn, color, icon, position } = req.body;

    const input: UpdateCategory = {};
    if (name !== undefined) input.name = name.trim();
    if (nameEn !== undefined) input.nameEn = nameEn?.trim();
    if (color !== undefined) input.color = color;
    if (icon !== undefined) input.icon = icon;
    if (position !== undefined) input.position = position;

    const category = await categoryService.updateCategory(userId, id, input);

    res.json({ data: category });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/categories/:id
 * 카테고리 삭제
 */
export async function deleteCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const id = req.params.id!;

    await categoryService.deleteCategory(userId, id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/categories/reorder
 * 카테고리 순서 변경
 */
export async function reorderCategories(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError();
    }

    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      throw new ValidationError('updates must be an array');
    }

    for (const update of updates) {
      if (!update.id || typeof update.position !== 'number') {
        throw new ValidationError('Each update must have id and position');
      }
    }

    await categoryService.reorderCategories(userId, updates);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
