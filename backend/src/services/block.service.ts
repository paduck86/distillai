/**
 * Block Service
 *
 * Notion-style 블록 CRUD 및 관리 서비스
 */

import { query, queryOne } from '../config/db.js';
import { NotFoundError, AppError } from '../middleware/error.middleware.js';
import type {
  Block,
  BlockRow,
  CreateBlock,
  UpdateBlock,
  BlockType,
  BlockProperties,
} from '../types/index.js';
import { mapBlockRow } from '../types/index.js';

// ============================================
// Block CRUD
// ============================================

/**
 * 특정 Distillation의 모든 블록 조회
 */
export async function getBlocks(
  userId: string,
  distillationId: string
): Promise<Block[]> {
  // 먼저 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  const rows = await query<BlockRow>(
    `SELECT * FROM distillai.blocks
     WHERE distillation_id = $1
     ORDER BY position ASC`,
    [distillationId]
  );

  // 블록을 트리 구조로 변환
  const blocks = rows.map(mapBlockRow);
  return buildBlockTree(blocks);
}

/**
 * 특정 Distillation의 모든 블록 텍스트 추출 (요약용)
 */
export async function getBlocksText(
  userId: string,
  distillationId: string
): Promise<string> {
  const blocks = await getBlocks(userId, distillationId);
  return flattenBlocksText(blocks);
}

function flattenBlocksText(blocks: Block[]): string {
  let text = '';
  for (const block of blocks) {
    if (block.content) {
      text += block.content + '\n';
    }
    if (block.children && block.children.length > 0) {
      text += flattenBlocksText(block.children);
    }
  }
  return text;
}

/**
 * 단일 블록 조회
 */
export async function getBlock(
  userId: string,
  blockId: string
): Promise<Block> {
  const row = await queryOne<BlockRow>(
    `SELECT b.* FROM distillai.blocks b
     JOIN distillai.distillations d ON b.distillation_id = d.id
     WHERE b.id = $1 AND d.user_id = $2`,
    [blockId, userId]
  );

  if (!row) {
    throw new NotFoundError('Block');
  }

  return mapBlockRow(row);
}

/**
 * 블록 생성
 */
export async function createBlock(
  userId: string,
  input: CreateBlock
): Promise<Block> {
  // 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [input.distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  // position이 없으면 마지막에 추가
  let position = input.position;
  if (position === undefined) {
    const lastBlock = await queryOne<{ max_position: number }>(
      `SELECT COALESCE(MAX(position), -1) as max_position
       FROM distillai.blocks
       WHERE distillation_id = $1 AND parent_id IS NOT DISTINCT FROM $2`,
      [input.distillationId, input.parentId ?? null]
    );
    position = (lastBlock?.max_position ?? -1) + 1;
  }

  const row = await queryOne<BlockRow>(
    `INSERT INTO distillai.blocks (distillation_id, parent_id, type, content, properties, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.distillationId,
      input.parentId ?? null,
      input.type,
      input.content,
      input.properties ?? {},
      position,
    ]
  );

  if (!row) {
    throw new AppError(500, 'BLOCK_CREATE_FAILED', '블록 생성 실패');
  }

  return mapBlockRow(row);
}

/**
 * 여러 블록 일괄 생성
 */
export async function createBlocks(
  userId: string,
  distillationId: string,
  blocks: Array<Omit<CreateBlock, 'distillationId'>>
): Promise<Block[]> {
  // 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  const createdBlocks: Block[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;

    const row = await queryOne<BlockRow>(
      `INSERT INTO distillai.blocks (distillation_id, parent_id, type, content, properties, position)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        distillationId,
        block.parentId ?? null,
        block.type,
        block.content,
        block.properties ?? {},
        block.position ?? i,
      ]
    );

    if (row) {
      createdBlocks.push(mapBlockRow(row));
    }
  }

  return createdBlocks;
}

/**
 * 블록 수정
 */
export async function updateBlock(
  userId: string,
  blockId: string,
  input: UpdateBlock
): Promise<Block> {
  // 소유권 확인
  const existing = await getBlock(userId, blockId);

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    params.push(input.type);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    params.push(input.content);
  }
  if (input.properties !== undefined) {
    // 기존 properties와 병합
    updates.push(`properties = properties || $${paramIndex++}`);
    params.push(input.properties);
  }
  if (input.position !== undefined) {
    updates.push(`position = $${paramIndex++}`);
    params.push(input.position);
  }
  if (input.parentId !== undefined) {
    updates.push(`parent_id = $${paramIndex++}`);
    params.push(input.parentId);
  }

  if (updates.length === 0) {
    return existing;
  }

  const row = await queryOne<BlockRow>(
    `UPDATE distillai.blocks
     SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    [...params, blockId]
  );

  if (!row) {
    throw new NotFoundError('Block');
  }

  return mapBlockRow(row);
}

/**
 * 블록 삭제
 */
export async function deleteBlock(
  userId: string,
  blockId: string
): Promise<void> {
  // 소유권 확인
  await getBlock(userId, blockId);

  // 자식 블록도 함께 삭제됨 (ON DELETE CASCADE)
  await query(
    `DELETE FROM distillai.blocks WHERE id = $1`,
    [blockId]
  );
}

/**
 * 모든 블록 삭제 (특정 Distillation)
 */
export async function deleteAllBlocks(
  userId: string,
  distillationId: string
): Promise<void> {
  // 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  await query(
    `DELETE FROM distillai.blocks WHERE distillation_id = $1`,
    [distillationId]
  );
}

/**
 * 블록 순서 재정렬
 */
export async function reorderBlocks(
  userId: string,
  distillationId: string,
  blockIds: string[]
): Promise<void> {
  // 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  // 각 블록의 position 업데이트
  for (let i = 0; i < blockIds.length; i++) {
    await query(
      `UPDATE distillai.blocks
       SET position = $1, updated_at = NOW()
       WHERE id = $2 AND distillation_id = $3`,
      [i, blockIds[i], distillationId]
    );
  }
}

/**
 * 여러 블록 일괄 업데이트 (Auto-save)
 */
export async function updateBlocksBatch(
  userId: string,
  distillationId: string,
  blocks: Block[]
): Promise<Block[]> {
  // 소유권 확인
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT id FROM distillai.distillations WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!ownerCheck) {
    throw new NotFoundError('Distillation');
  }

  // 1. 현재 DB에 있는 블록 ID들 가져오기
  const currentBlockRows = await query<{ id: string }>(
    `SELECT id FROM distillai.blocks WHERE distillation_id = $1`,
    [distillationId]
  );
  const currentIds = new Set(currentBlockRows.map(r => r.id));

  // 2. 입력된 블록들 업데이트 또는 생성 (Upsert)
  const inputIds = new Set(blocks.map(b => b.id));
  const updatedBlocks: Block[] = [];

  for (const block of blocks) {
    if (currentIds.has(block.id)) {
      // 업데이트
      const row = await queryOne<BlockRow>(
        `UPDATE distillai.blocks
         SET type = $1, content = $2, properties = $3, position = $4, parent_id = $5, updated_at = NOW()
         WHERE id = $6 AND distillation_id = $7
         RETURNING *`,
        [
          block.type,
          block.content,
          block.properties || {},
          block.position,
          block.parentId || null,
          block.id,
          distillationId
        ]
      );
      if (row) updatedBlocks.push(mapBlockRow(row));
    } else {
      // 생성
      const row = await queryOne<BlockRow>(
        `INSERT INTO distillai.blocks (id, distillation_id, parent_id, type, content, properties, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          block.id,
          distillationId,
          block.parentId || null,
          block.type,
          block.content,
          block.properties || {},
          block.position
        ]
      );
      if (row) updatedBlocks.push(mapBlockRow(row));
    }
  }

  // 3. 입력에 없는 블록들은 삭제
  for (const id of currentIds) {
    if (!inputIds.has(id)) {
      await query(
        `DELETE FROM distillai.blocks WHERE id = $1 AND distillation_id = $2`,
        [id, distillationId]
      );
    }
  }

  // 트리 구조로 변환하여 반환
  // updatedBlocks에는 자식 블록들이 포함되어 있지 않을 수 있으므로 DB에서 다시 조회
  const finalRows = await query<BlockRow>(
    `SELECT * FROM distillai.blocks
     WHERE distillation_id = $1
     ORDER BY position ASC`,
    [distillationId]
  );

  return buildBlockTree(finalRows.map(mapBlockRow));
}

/**
 * 블록 이동 (다른 부모로 이동)
 */
export async function moveBlock(
  userId: string,
  blockId: string,
  newParentId: string | null,
  newPosition: number
): Promise<Block> {
  return updateBlock(userId, blockId, {
    parentId: newParentId,
    position: newPosition,
  });
}

// ============================================
// Markdown ↔ Blocks 변환
// ============================================

/**
 * Markdown을 블록 배열로 변환
 */
export function markdownToBlocks(markdown: string): Array<Omit<CreateBlock, 'distillationId'>> {
  if (!markdown) return [];

  const blocks: Array<Omit<CreateBlock, 'distillationId'>> = [];
  const lines = markdown.split('\n');
  let currentIndex = 0;
  let position = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex] ?? '';

    // Skip empty lines
    if (!line.trim()) {
      currentIndex++;
      continue;
    }

    let block: Omit<CreateBlock, 'distillationId'> | null = null;

    // Heading 1
    if (line.startsWith('# ')) {
      block = { type: 'heading1', content: line.slice(2).trim(), position };
    }
    // Heading 2
    else if (line.startsWith('## ')) {
      block = { type: 'heading2', content: line.slice(3).trim(), position };
    }
    // Heading 3
    else if (line.startsWith('### ')) {
      block = { type: 'heading3', content: line.slice(4).trim(), position };
    }
    // Bullet list
    else if (line.match(/^[-*]\s/)) {
      block = { type: 'bullet', content: line.slice(2).trim(), position };
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '').trim();
      block = { type: 'numbered', content, position };
    }
    // Todo
    else if (line.match(/^-\s*\[[ x]\]/i)) {
      const checked = line.match(/^-\s*\[x\]/i) !== null;
      const content = line.replace(/^-\s*\[[ x]\]\s*/i, '').trim();
      block = { type: 'todo', content, properties: { checked }, position };
    }
    // Quote
    else if (line.startsWith('> ')) {
      // Callout 체크 (> 💡 형식)
      if (line.match(/^>\s*[💡⚠️📌✅❌🔥💭📝🎯🚀]/)) {
        const iconMatch = line.match(/^>\s*([💡⚠️📌✅❌🔥💭📝🎯🚀])/);
        const icon = iconMatch ? iconMatch[1] : '💡';
        const content = line.replace(/^>\s*[💡⚠️📌✅❌🔥💭📝🎯🚀]\s*/, '').trim();
        block = { type: 'callout', content, properties: { icon }, position };
      } else {
        block = { type: 'quote', content: line.slice(2).trim(), position };
      }
    }
    // Code block
    else if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      currentIndex++;
      while (currentIndex < lines.length) {
        const codeLine = lines[currentIndex] ?? '';
        if (codeLine.startsWith('```')) break;
        codeLines.push(codeLine);
        currentIndex++;
      }
      block = { type: 'code', content: codeLines.join('\n'), properties: { language }, position };
    }
    // Divider
    else if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      block = { type: 'divider', content: '', position };
    }
    // Timestamp
    else if (/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/.test(line)) {
      const match = line.match(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]/);
      if (match && match[1]) {
        const content = line.replace(match[0], '').trim();
        block = { type: 'timestamp', content, properties: { timestamp: match[1] }, position };
      }
    }
    // Plain text
    else {
      block = { type: 'text', content: line.trim(), position };
    }

    if (block) {
      blocks.push(block);
      position++;
    }

    currentIndex++;
  }

  return blocks;
}

/**
 * 블록 배열을 Markdown으로 변환
 */
export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(block => blockToMarkdown(block)).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading1':
      return `# ${block.content}`;
    case 'heading2':
      return `## ${block.content}`;
    case 'heading3':
      return `### ${block.content}`;
    case 'bullet':
      return `- ${block.content}`;
    case 'numbered':
      return `1. ${block.content}`;
    case 'todo':
      const checked = block.properties?.checked ? 'x' : ' ';
      return `- [${checked}] ${block.content}`;
    case 'quote':
      return `> ${block.content}`;
    case 'callout':
      const icon = block.properties?.icon || '💡';
      return `> ${icon} ${block.content}`;
    case 'code':
      const lang = block.properties?.language || '';
      return `\`\`\`${lang}\n${block.content}\n\`\`\``;
    case 'divider':
      return '---';
    case 'timestamp':
      const ts = block.properties?.timestamp || '00:00:00';
      return `[${ts}] ${block.content}`;
    case 'ai_summary':
      return `> ✨ **AI Summary**\n> ${block.content}`;
    case 'embed':
      return block.properties?.embedUrl || block.content;
    case 'toggle':
      const collapsed = block.properties?.collapsed ? '▶' : '▼';
      return `${collapsed} ${block.content}`;
    default:
      return block.content;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * 플랫 블록 배열을 트리 구조로 변환
 */
function buildBlockTree(blocks: Block[]): Block[] {
  const blockMap = new Map<string, Block>();
  const rootBlocks: Block[] = [];

  // 모든 블록을 맵에 등록
  for (const block of blocks) {
    blockMap.set(block.id, { ...block, children: [] });
  }

  // 부모-자식 관계 구축
  for (const block of blocks) {
    const current = blockMap.get(block.id)!;
    if (block.parentId) {
      const parent = blockMap.get(block.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(current);
      } else {
        rootBlocks.push(current);
      }
    } else {
      rootBlocks.push(current);
    }
  }

  // 각 레벨에서 position 기준 정렬
  const sortByPosition = (a: Block, b: Block) => a.position - b.position;
  rootBlocks.sort(sortByPosition);

  const sortChildren = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.children && block.children.length > 0) {
        block.children.sort(sortByPosition);
        sortChildren(block.children);
      }
    }
  };
  sortChildren(rootBlocks);

  return rootBlocks;
}

/**
 * 기존 Distillation의 Markdown을 블록으로 마이그레이션
 */
export async function migrateDistillationToBlocks(
  userId: string,
  distillationId: string
): Promise<Block[]> {
  // 기존 데이터 조회
  const distillation = await queryOne<{ summary_md: string; blocks_migrated: boolean }>(
    `SELECT summary_md, blocks_migrated FROM distillai.distillations
     WHERE id = $1 AND user_id = $2`,
    [distillationId, userId]
  );

  if (!distillation) {
    throw new NotFoundError('Distillation');
  }

  // 이미 마이그레이션된 경우
  if (distillation.blocks_migrated) {
    return getBlocks(userId, distillationId);
  }

  // Markdown → 블록 변환
  const blocksToCreate = markdownToBlocks(distillation.summary_md || '');

  // 기존 블록 삭제 (혹시 있다면)
  await deleteAllBlocks(userId, distillationId);

  // 새 블록 생성
  const createdBlocks = await createBlocks(userId, distillationId, blocksToCreate);

  // 마이그레이션 완료 플래그 설정
  await query(
    `UPDATE distillai.distillations
     SET blocks_migrated = true, updated_at = NOW()
     WHERE id = $1`,
    [distillationId]
  );

  return createdBlocks;
}
