import type { SQLiteDatabase } from 'expo-sqlite';

import { MaterialChunkRepository } from '@/db/repositories/material-chunk-repository';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { Material, MaterialStatus } from '@/db/types';
import { extractMaterialText } from '@/materials/extract-material-text';
import { prepareMaterialChunks } from '@/materials/prepare-material-chunks';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';

export type ProcessingUpdate = {
  status: MaterialStatus;
  message: string;
};

type ProcessingListener = (update: ProcessingUpdate) => void;

type ActiveJob = {
  promise: Promise<Material>;
  listeners: Set<ProcessingListener>;
};

class MaterialProcessingService {
  private activeJobs = new Map<string, ActiveJob>();

  process(db: SQLiteDatabase, materialId: string, onUpdate?: ProcessingListener) {
    const activeJob = this.activeJobs.get(materialId);
    if (activeJob) {
      if (onUpdate) {
        activeJob.listeners.add(onUpdate);
      }
      return activeJob.promise;
    }

    const listeners = new Set<ProcessingListener>();
    if (onUpdate) {
      listeners.add(onUpdate);
    }
    const emit = (update: ProcessingUpdate) => {
      for (const listener of listeners) {
        listener(update);
      }
    };

    const promise = this.run(db, materialId, emit).finally(() => {
      this.activeJobs.delete(materialId);
    });
    this.activeJobs.set(materialId, { promise, listeners });
    return promise;
  }

  private async run(db: SQLiteDatabase, materialId: string, emit: ProcessingListener) {
    const materials = new MaterialRepository(db);
    const chunks = new MaterialChunkRepository(db);
    const material = await materials.getById(materialId);

    if (!material) {
      throw new Error('Material not found.');
    }

    const setStatus = async (status: MaterialStatus, message: string) => {
      await materials.updateStatus(materialId, status, message);
      emit({ status, message });
    };

    try {
      await setStatus('extracting', 'Reading text from the local source…');
      const extracted = await extractMaterialText(material);

      await setStatus('chunking', 'Building deterministic source passages…');
      const preparedChunks = await prepareMaterialChunks(materialId, extracted.text);
      if (preparedChunks.length === 0) {
        throw new Error('No indexable source passages were produced.');
      }

      await chunks.replaceForMaterial(materialId, preparedChunks);
      await materials.updateChunkCount(materialId, preparedChunks.length);

      await setStatus('indexing', 'Loading MiniLM and preparing the local vector index…');
      const storedChunks = await chunks.listForMaterial(materialId);
      await offlineVectorIndex.replaceMaterial(materialId, storedChunks, ({ completed, total }) => {
        const message = `Embedding source passage ${completed} of ${total}…`;
        emit({ status: 'indexing', message });
      });

      await chunks.markMaterialIndexed(materialId);

      const readyMessage = extracted.warning
        ? `Indexed ${preparedChunks.length} passages. ${extracted.warning}`
        : `Indexed ${preparedChunks.length} source passages for offline retrieval.`;
      await setStatus('ready', readyMessage);

      const readyMaterial = await materials.getById(materialId);
      if (!readyMaterial) {
        throw new Error('Indexed material could not be read back.');
      }
      return readyMaterial;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to index this material.';
      await materials.updateStatus(materialId, 'failed', message);
      emit({ status: 'failed', message });
      throw error;
    }
  }
}

export const materialProcessingService = new MaterialProcessingService();
