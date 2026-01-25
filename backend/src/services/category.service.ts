import { query, queryOne } from '../config/db.js';
import { NotFoundError } from '../middleware/error.middleware.js';
import type { Category, CategoryWithCount, CreateCategory, UpdateCategory, CategoryRow } from '../types/index.js';
import { mapCategoryRow } from '../types/index.js';

interface CategoryWithCountRow extends CategoryRow {
  distillation_count: string;
}

/**
 * 사용자별 시스템 카테고리 초기화 (처음 접속 시 복사)
 */
async function initializeUserCategories(userId: string): Promise<void> {
  // 사용자가 이미 카테고리를 가지고 있는지 확인
  const existingCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM distillai.categories WHERE user_id = $1`,
    [userId]
  );

  if (existingCount && parseInt(existingCount.count, 10) > 0) {
    return; // 이미 초기화됨
  }

  // 시스템 카테고리를 사용자별로 복사
  const systemCategories = await query<CategoryRow>(
    `SELECT * FROM distillai.categories WHERE is_system = true ORDER BY position ASC`,
    []
  );

  for (const cat of systemCategories) {
    await query(
      `INSERT INTO distillai.categories (user_id, name, name_en, slug, color, icon, position, is_system)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       ON CONFLICT DO NOTHING`,
      [userId, cat.name, cat.name_en, cat.slug, cat.color, cat.icon, cat.position]
    );
  }
}

/**
 * 사용자별 카테고리 목록 조회
 */
export async function getCategories(userId: string): Promise<CategoryWithCount[]> {
  // 사용자 카테고리 초기화 (처음 접속 시)
  await initializeUserCategories(userId);

  const rows = await query<CategoryWithCountRow>(
    `SELECT
      c.*,
      COUNT(d.id) as distillation_count
    FROM distillai.categories c
    LEFT JOIN distillai.distillations d
      ON d.ai_suggested_category_id = c.id AND d.user_id = $1
    WHERE c.user_id = $1
    GROUP BY c.id
    ORDER BY c.position ASC, c.created_at ASC`,
    [userId]
  );

  return rows.map(row => ({
    ...mapCategoryRow(row),
    distillationCount: parseInt(row.distillation_count, 10) || 0,
  }));
}

/**
 * 시스템 카테고리만 조회
 */
export async function getSystemCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT * FROM distillai.categories
     WHERE is_system = true
     ORDER BY position ASC`,
    []
  );

  return rows.map(mapCategoryRow);
}

/**
 * slug로 카테고리 조회
 */
export async function getCategoryBySlug(userId: string, slug: string): Promise<Category | null> {
  // 먼저 사용자 카테고리 초기화 확인
  await initializeUserCategories(userId);

  const row = await queryOne<CategoryRow>(
    `SELECT * FROM distillai.categories
     WHERE slug = $1 AND user_id = $2
     LIMIT 1`,
    [slug, userId]
  );

  return row ? mapCategoryRow(row) : null;
}

/**
 * ID로 카테고리 조회
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const row = await queryOne<CategoryRow>(
    `SELECT * FROM distillai.categories WHERE id = $1`,
    [categoryId]
  );

  return row ? mapCategoryRow(row) : null;
}

/**
 * 사용자 정의 카테고리 생성
 */
export async function createCategory(userId: string, input: CreateCategory): Promise<Category> {
  const row = await queryOne<CategoryRow>(
    `INSERT INTO distillai.categories (user_id, name, name_en, slug, color, icon, is_system)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING *`,
    [
      userId,
      input.name,
      input.nameEn ?? null,
      input.slug,
      input.color ?? '#6366F1',
      input.icon ?? 'tag',
    ]
  );

  if (!row) {
    throw new Error('Failed to create category');
  }

  return mapCategoryRow(row);
}

/**
 * 카테고리 수정
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategory
): Promise<Category> {
  const existing = await getCategoryById(categoryId);
  if (!existing) {
    throw new NotFoundError('Category');
  }
  if (existing.userId !== userId) {
    throw new NotFoundError('Category');
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }
  if (input.nameEn !== undefined) {
    updates.push(`name_en = $${paramIndex++}`);
    params.push(input.nameEn);
  }
  if (input.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    params.push(input.color);
  }
  if (input.icon !== undefined) {
    updates.push(`icon = $${paramIndex++}`);
    params.push(input.icon);
  }
  if (input.position !== undefined) {
    updates.push(`position = $${paramIndex++}`);
    params.push(input.position);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);

  const row = await queryOne<CategoryRow>(
    `UPDATE distillai.categories
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    [...params, categoryId, userId]
  );

  if (!row) {
    throw new NotFoundError('Category');
  }

  return mapCategoryRow(row);
}

/**
 * 카테고리 삭제
 */
export async function deleteCategory(userId: string, categoryId: string): Promise<void> {
  const existing = await getCategoryById(categoryId);
  if (!existing) {
    throw new NotFoundError('Category');
  }
  if (existing.userId !== userId) {
    throw new NotFoundError('Category');
  }

  await query(
    `DELETE FROM distillai.categories WHERE id = $1 AND user_id = $2`,
    [categoryId, userId]
  );
}

/**
 * 카테고리 순서 변경
 */
export async function reorderCategories(
  userId: string,
  updates: { id: string; position: number }[]
): Promise<void> {
  for (const { id, position } of updates) {
    await query(
      `UPDATE distillai.categories
       SET position = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3`,
      [position, id, userId]
    );
  }
}
