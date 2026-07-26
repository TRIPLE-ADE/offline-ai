import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { QuizAttempt } from '@/db/types';

type QuizAttemptRow = {
  id: string;
  topic_id: string;
  answers_json: string;
  score: number;
  created_at: string;
};

function mapAttempt(row: QuizAttemptRow): QuizAttempt {
  return {
    id: row.id,
    topicId: row.topic_id,
    answers: JSON.parse(row.answers_json) as number[],
    score: row.score,
    createdAt: row.created_at,
  };
}

export class QuizAttemptRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async create(topicId: string, answers: number[], score: number) {
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO quiz_attempts (id, topic_id, answers_json, score, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, topicId, JSON.stringify(answers), score, now]
    );
    const row = await this.db.getFirstAsync<QuizAttemptRow>(
      'SELECT * FROM quiz_attempts WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) {
      throw new Error('Quiz attempt was saved but could not be read back.');
    }
    return mapAttempt(row);
  }

  async listForTopic(topicId: string): Promise<QuizAttempt[]> {
    const rows = await this.db.getAllAsync<QuizAttemptRow>(
      `SELECT *
       FROM quiz_attempts
       WHERE topic_id = ?
       ORDER BY created_at DESC`,
      [topicId]
    );
    return rows.map(mapAttempt);
  }
}
