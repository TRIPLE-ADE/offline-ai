import type { SQLiteDatabase } from 'expo-sqlite';

import type { CreateMaterialChunkInput, MaterialChunk } from '@/db/types';

type MaterialChunkRow = {
  id: string;
  material_id: string;
  ordinal: number;
  content: string;
  page_start: number | null;
  page_end: number | null;
  section_title: string | null;
  content_hash: string;
  indexed_at: string | null;
};

function mapChunk(row: MaterialChunkRow): MaterialChunk {
  return {
    id: row.id,
    materialId: row.material_id,
    ordinal: row.ordinal,
    content: row.content,
    pageStart: row.page_start,
    pageEnd: row.page_end,
    sectionTitle: row.section_title,
    contentHash: row.content_hash,
    indexedAt: row.indexed_at,
  };
}

export class MaterialChunkRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async replaceForMaterial(materialId: string, chunks: CreateMaterialChunkInput[]) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync('DELETE FROM material_chunks WHERE material_id = ?', [materialId]);

      for (const chunk of chunks) {
        await this.db.runAsync(
          `INSERT INTO material_chunks (
            id,
            material_id,
            ordinal,
            content,
            page_start,
            page_end,
            section_title,
            content_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            chunk.id,
            chunk.materialId,
            chunk.ordinal,
            chunk.content,
            chunk.pageStart,
            chunk.pageEnd,
            chunk.sectionTitle,
            chunk.contentHash,
          ]
        );
      }
    });
  }

  async markMaterialIndexed(materialId: string, indexedAt = new Date().toISOString()) {
    await this.db.runAsync(
      `UPDATE material_chunks
       SET indexed_at = ?
       WHERE material_id = ?`,
      [indexedAt, materialId]
    );
  }

  async listForMaterial(materialId: string): Promise<MaterialChunk[]> {
    const rows = await this.db.getAllAsync<MaterialChunkRow>(
      `SELECT *
       FROM material_chunks
       WHERE material_id = ?
       ORDER BY ordinal ASC`,
      [materialId]
    );

    return rows.map(mapChunk);
  }
}
