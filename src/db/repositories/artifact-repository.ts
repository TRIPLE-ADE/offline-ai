import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  GeneratedArtifact,
  GeneratedArtifactKind,
} from '@/db/types';

type ArtifactRow = {
  id: string;
  material_id: string;
  topic_id: string | null;
  kind: GeneratedArtifactKind;
  payload_json: string;
  prompt_version: string;
  model_version: string;
  created_at: string;
  updated_at: string;
};

function mapArtifact(row: ArtifactRow): GeneratedArtifact {
  return {
    id: row.id,
    materialId: row.material_id,
    topicId: row.topic_id,
    kind: row.kind,
    payloadJson: row.payload_json,
    promptVersion: row.prompt_version,
    modelVersion: row.model_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ArtifactRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async create(input: {
    materialId: string;
    topicId?: string | null;
    kind: GeneratedArtifactKind;
    payload: unknown;
    promptVersion: string;
    modelVersion: string;
  }): Promise<GeneratedArtifact> {
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO generated_artifacts (
        id,
        material_id,
        topic_id,
        kind,
        payload_json,
        prompt_version,
        model_version,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.materialId,
        input.topicId ?? null,
        input.kind,
        JSON.stringify(input.payload),
        input.promptVersion,
        input.modelVersion,
        now,
        now,
      ]
    );

    const artifact = await this.getById(id);
    if (!artifact) {
      throw new Error('Generated artifact was saved but could not be read back.');
    }
    return artifact;
  }

  async getById(id: string): Promise<GeneratedArtifact | null> {
    const row = await this.db.getFirstAsync<ArtifactRow>(
      'SELECT * FROM generated_artifacts WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? mapArtifact(row) : null;
  }

  async getLatest(
    kind: GeneratedArtifactKind,
    materialId: string,
    topicId: string | null = null
  ): Promise<GeneratedArtifact | null> {
    const row = topicId
      ? await this.db.getFirstAsync<ArtifactRow>(
          `SELECT *
           FROM generated_artifacts
           WHERE kind = ? AND material_id = ? AND topic_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [kind, materialId, topicId]
        )
      : await this.db.getFirstAsync<ArtifactRow>(
          `SELECT *
           FROM generated_artifacts
           WHERE kind = ? AND material_id = ? AND topic_id IS NULL
           ORDER BY created_at DESC
           LIMIT 1`,
          [kind, materialId]
        );
    return row ? mapArtifact(row) : null;
  }
}
