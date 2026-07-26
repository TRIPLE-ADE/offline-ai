import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  ChatMessage,
  ChatMessageRole,
  ChatMessageStatus,
  ChatThread,
  StoredCitation,
} from '@/db/types';

type ThreadRow = {
  id: string;
  material_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  role: ChatMessageRole;
  content: string;
  citations_json: string | null;
  status: ChatMessageStatus;
  created_at: string;
};

function mapThread(row: ThreadRow): ChatThread {
  return {
    id: row.id,
    materialId: row.material_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    citations: row.citations_json
      ? (JSON.parse(row.citations_json) as StoredCitation[])
      : [],
    status: row.status,
    createdAt: row.created_at,
  };
}

export class ChatRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getOrCreateThread(materialId: string): Promise<ChatThread> {
    const existing = await this.db.getFirstAsync<ThreadRow>(
      'SELECT * FROM chat_threads WHERE material_id = ? LIMIT 1',
      [materialId]
    );
    if (existing) {
      return mapThread(existing);
    }

    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO chat_threads (id, material_id, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [id, materialId, now, now]
    );
    return { id, materialId, createdAt: now, updatedAt: now };
  }

  async listMessages(threadId: string, limit?: number): Promise<ChatMessage[]> {
    const rows = limit
      ? await this.db.getAllAsync<MessageRow>(
          `SELECT *
           FROM (
             SELECT * FROM chat_messages
             WHERE thread_id = ?
             ORDER BY created_at DESC
             LIMIT ?
           )
           ORDER BY created_at ASC`,
          [threadId, limit]
        )
      : await this.db.getAllAsync<MessageRow>(
          `SELECT *
           FROM chat_messages
           WHERE thread_id = ?
           ORDER BY created_at ASC`,
          [threadId]
        );
    return rows.map(mapMessage);
  }

  async createMessage(input: {
    threadId: string;
    role: ChatMessageRole;
    content: string;
    status: ChatMessageStatus;
    citations?: StoredCitation[];
  }): Promise<ChatMessage> {
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO chat_messages (
        id,
        thread_id,
        role,
        content,
        citations_json,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.threadId,
        input.role,
        input.content,
        input.citations ? JSON.stringify(input.citations) : null,
        input.status,
        now,
      ]
    );
    await this.db.runAsync(
      'UPDATE chat_threads SET updated_at = ? WHERE id = ?',
      [now, input.threadId]
    );
    return {
      id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      citations: input.citations ?? [],
      status: input.status,
      createdAt: now,
    };
  }

  async updateMessage(
    id: string,
    content: string,
    status: ChatMessageStatus,
    citations: StoredCitation[] = []
  ) {
    await this.db.runAsync(
      `UPDATE chat_messages
       SET content = ?, status = ?, citations_json = ?
       WHERE id = ?`,
      [content, status, JSON.stringify(citations), id]
    );
  }
}
