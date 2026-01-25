import { query, queryOne } from '../config/db.js';
import { NotFoundError } from '../middleware/error.middleware.js';
import type { Folder, CreateFolder, UpdateFolder, FolderRow } from '../types/index.js';
import { mapFolderRow } from '../types/index.js';

export async function getFolders(userId: string): Promise<Folder[]> {
  const rows = await query<FolderRow>(
    `SELECT * FROM distillai.folders
     WHERE user_id = $1
     ORDER BY position, created_at`,
    [userId]
  );

  return rows.map(mapFolderRow);
}

export async function getFolder(userId: string, folderId: string): Promise<Folder> {
  const row = await queryOne<FolderRow>(
    `SELECT * FROM distillai.folders WHERE id = $1 AND user_id = $2`,
    [folderId, userId]
  );

  if (!row) {
    throw new NotFoundError('Folder');
  }

  return mapFolderRow(row);
}

export async function createFolder(userId: string, input: CreateFolder): Promise<Folder> {
  const row = await queryOne<FolderRow>(
    `INSERT INTO distillai.folders (user_id, title, description, parent_id, color, icon)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      input.title,
      input.description ?? null,
      input.parentId ?? null,
      input.color ?? '#4F46E5',
      input.icon ?? 'folder',
    ]
  );

  if (!row) {
    throw new Error('Failed to create folder');
  }

  return mapFolderRow(row);
}

export async function updateFolder(
  userId: string,
  folderId: string,
  input: UpdateFolder
): Promise<Folder> {
  // First verify ownership
  await getFolder(userId, folderId);

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
  if (input.parentId !== undefined) {
    updates.push(`parent_id = $${paramIndex++}`);
    params.push(input.parentId);
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

  updates.push(`updated_at = NOW()`);

  const row = await queryOne<FolderRow>(
    `UPDATE distillai.folders
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`,
    [...params, folderId, userId]
  );

  if (!row) {
    throw new NotFoundError('Folder');
  }

  return mapFolderRow(row);
}

export async function deleteFolder(userId: string, folderId: string): Promise<void> {
  // First verify ownership
  await getFolder(userId, folderId);

  await query(
    `DELETE FROM distillai.folders WHERE id = $1 AND user_id = $2`,
    [folderId, userId]
  );
}
