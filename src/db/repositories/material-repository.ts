import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateMaterialInput,
  Material,
  MaterialFileType,
  MaterialStatus,
} from '@/db/types';

type MaterialRow = {
  id: string;
  title: string;
  source_uri: string;
  local_uri: string;
  file_type: MaterialFileType;
  file_size: number | null;
  status: MaterialStatus;
  status_message: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
};

function mapMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    title: row.title,
    sourceUri: row.source_uri,
    localUri: row.local_uri,
    fileType: row.file_type,
    fileSize: row.file_size,
    status: row.status,
    statusMessage: row.status_message,
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MaterialRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async create(input: CreateMaterialInput): Promise<Material> {
    const now = new Date().toISOString();

    await this.db.runAsync(
      `INSERT INTO materials (
        id,
        title,
        source_uri,
        local_uri,
        file_type,
        file_size,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'imported', ?, ?)`,
      [
        input.id,
        input.title,
        input.sourceUri,
        input.localUri,
        input.fileType,
        input.fileSize,
        now,
        now,
      ]
    );

    const material = await this.getById(input.id);
    if (!material) {
      throw new Error('Material was inserted but could not be read back.');
    }

    return material;
  }

  async list(): Promise<Material[]> {
    const rows = await this.db.getAllAsync<MaterialRow>(
      'SELECT * FROM materials ORDER BY updated_at DESC'
    );
    return rows.map(mapMaterial);
  }

  async getById(id: string): Promise<Material | null> {
    const row = await this.db.getFirstAsync<MaterialRow>(
      'SELECT * FROM materials WHERE id = ? LIMIT 1',
      [id]
    );
    return row ? mapMaterial(row) : null;
  }

  async updateStatus(id: string, status: MaterialStatus, message: string | null = null) {
    await this.db.runAsync(
      `UPDATE materials
       SET status = ?, status_message = ?, updated_at = ?
       WHERE id = ?`,
      [status, message, new Date().toISOString(), id]
    );
  }

  async updateChunkCount(id: string, chunkCount: number) {
    await this.db.runAsync(
      `UPDATE materials
       SET chunk_count = ?, updated_at = ?
       WHERE id = ?`,
      [chunkCount, new Date().toISOString(), id]
    );
  }
}
