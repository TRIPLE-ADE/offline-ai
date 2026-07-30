import { OPSQLiteVectorStore } from '@react-native-rag/op-sqlite';
import type { Embeddings, QueryResult } from 'react-native-rag';

import { embeddingRuntime } from '@/ai/embedding-runtime';
import type { AiOperationLease } from '@/ai/runtime-coordinator';
import type { MaterialChunk } from '@/db/types';

const VECTOR_DATABASE_NAME = 'offline-study-vectors.sqlite';

class RuntimeEmbeddingsAdapter implements Embeddings {
  constructor(
    private readonly getActiveLease: () => AiOperationLease
  ) {}

  async load() {
    await embeddingRuntime.load();
    return this;
  }

  async unload() {
    await embeddingRuntime.unload();
  }

  embed(text: string) {
    return embeddingRuntime.embed(text, this.getActiveLease());
  }
}

type IndexProgress = {
  completed: number;
  total: number;
};

class OfflineVectorIndex {
  private store: OPSQLiteVectorStore | null = null;
  private loadPromise: Promise<OPSQLiteVectorStore> | null = null;
  private activeLease: AiOperationLease | null = null;

  private getActiveLease() {
    if (!this.activeLease) {
      throw new Error('An AI operation lease is required for vector inference.');
    }
    return this.activeLease;
  }

  private async withLease<T>(
    lease: AiOperationLease,
    task: () => Promise<T>
  ) {
    lease.assertActive();
    if (
      this.activeLease &&
      this.activeLease.operation.id !== lease.operation.id
    ) {
      throw new Error('Another vector operation is already active.');
    }

    this.activeLease = lease;
    try {
      const result = await task();
      lease.assertActive();
      return result;
    } finally {
      if (this.activeLease?.operation.id === lease.operation.id) {
        this.activeLease = null;
      }
    }
  }

  private async getStore() {
    if (this.store) {
      return this.store;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const store = new OPSQLiteVectorStore({
      name: VECTOR_DATABASE_NAME,
      embeddings: new RuntimeEmbeddingsAdapter(() => this.getActiveLease()),
    });

    this.loadPromise = store
      .load()
      .then((loadedStore) => {
        this.store = loadedStore;
        return loadedStore;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async replaceMaterial(
    materialId: string,
    chunks: MaterialChunk[],
    lease: AiOperationLease,
    onProgress?: (progress: IndexProgress) => void
  ) {
    return this.withLease(lease, async () => {
      const store = await this.getStore();

      await store.delete({
        predicate: (value) => value.metadata?.materialId === materialId,
      });

      for (const [index, chunk] of chunks.entries()) {
        lease.assertActive();
        const embedding = await embeddingRuntime.embed(chunk.content, lease);
        await store.add({
          id: chunk.id,
          document: chunk.content,
          embedding,
          metadata: {
            materialId,
            ordinal: chunk.ordinal,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            sectionTitle: chunk.sectionTitle,
            contentHash: chunk.contentHash,
          },
        });
        if (lease.isActive()) {
          onProgress?.({ completed: index + 1, total: chunks.length });
        }
      }
    });
  }

  async queryMaterial(
    materialId: string,
    query: string,
    lease: AiOperationLease,
    limit = 4
  ): Promise<QueryResult[]> {
    return this.withLease(lease, async () => {
      const store = await this.getStore();
      const queryEmbedding = await embeddingRuntime.embed(query, lease);

      return store.query({
        queryEmbedding,
        nResults: limit,
        predicate: (value) => value.metadata?.materialId === materialId,
      });
    });
  }

  async deleteMaterial(materialId: string) {
    const store = await this.getStore();
    await store.delete({
      predicate: (value) => value.metadata?.materialId === materialId,
    });
  }
}

export const offlineVectorIndex = new OfflineVectorIndex();
