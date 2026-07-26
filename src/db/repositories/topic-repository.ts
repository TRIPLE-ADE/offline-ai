import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateTopicInput,
  Topic,
  TopicStatus,
} from '@/db/types';

type TopicRow = {
  id: string;
  material_id: string;
  position: number;
  title: string;
  summary: string;
  source_chunk_ids_json: string;
  status: TopicStatus;
  best_score: number | null;
  created_at: string;
  updated_at: string;
};

function mapTopic(row: TopicRow): Topic {
  return {
    id: row.id,
    materialId: row.material_id,
    position: row.position,
    title: row.title,
    summary: row.summary,
    sourceChunkIds: JSON.parse(row.source_chunk_ids_json) as string[],
    status: row.status,
    bestScore: row.best_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TopicRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async replaceForMaterial(materialId: string, topics: CreateTopicInput[]) {
    const now = new Date().toISOString();

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM topics WHERE material_id = ?', [materialId]);

      for (const topic of topics) {
        await this.db.runAsync(
          `INSERT INTO topics (
            id,
            material_id,
            position,
            title,
            summary,
            source_chunk_ids_json,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?, ?)`,
          [
            topic.id,
            topic.materialId,
            topic.position,
            topic.title,
            topic.summary,
            JSON.stringify(topic.sourceChunkIds),
            now,
            now,
          ]
        );
      }
    });
  }

  async listForMaterial(materialId: string): Promise<Topic[]> {
    const rows = await this.db.getAllAsync<TopicRow>(
      `SELECT *
       FROM topics
       WHERE material_id = ?
       ORDER BY position ASC`,
      [materialId]
    );
    return rows.map(mapTopic);
  }

  async getById(id: string): Promise<Topic | null> {
    const row = await this.db.getFirstAsync<TopicRow>(
      'SELECT * FROM topics WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? mapTopic(row) : null;
  }

  async updateProgress(id: string, score: number, status: TopicStatus) {
    await this.db.runAsync(
      `UPDATE topics
       SET best_score = CASE
         WHEN best_score IS NULL OR ? > best_score THEN ?
         ELSE best_score
       END,
       status = ?,
       updated_at = ?
       WHERE id = ?`,
      [score, score, status, new Date().toISOString(), id]
    );
  }

  async markLearning(id: string) {
    await this.db.runAsync(
      `UPDATE topics
       SET status = CASE WHEN status = 'not_started' THEN 'learning' ELSE status END,
           updated_at = ?
       WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  }
}
