import { query, queryOne } from '../config/db.js';
import type { ChatMessage, ChatMessageRow } from '../types/index.js';
import { mapChatMessageRow } from '../types/index.js';

export async function getChatHistory(
  userId: string,
  distillationId: string,
  limit = 50
): Promise<ChatMessage[]> {
  const rows = await query<ChatMessageRow>(
    `SELECT * FROM distillai.chat_messages
     WHERE user_id = $1 AND distillation_id = $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [userId, distillationId, limit]
  );

  return rows.map(mapChatMessageRow);
}

export async function saveMessage(
  userId: string,
  distillationId: string,
  role: 'user' | 'assistant',
  content: string,
  model?: string,
  tokensUsed?: number
): Promise<ChatMessage> {
  const row = await queryOne<ChatMessageRow>(
    `INSERT INTO distillai.chat_messages (user_id, distillation_id, role, content, model, tokens_used)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, distillationId, role, content, model ?? null, tokensUsed ?? null]
  );

  if (!row) {
    throw new Error('Failed to save message');
  }

  return mapChatMessageRow(row);
}

export async function clearChatHistory(
  userId: string,
  distillationId: string
): Promise<void> {
  await query(
    `DELETE FROM distillai.chat_messages WHERE user_id = $1 AND distillation_id = $2`,
    [userId, distillationId]
  );
}
