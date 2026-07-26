import { OPSQLiteVectorStore } from '@react-native-rag/op-sqlite';
import type { Embeddings, QueryResult } from 'react-native-rag';

import { embeddingRuntime } from '@/ai/embedding-runtime';
import type { MaterialChunk } from '@/db/types';

const VECTOR_DATABASE_NAME = 'offline-study-vectors.sqlite';

class RuntimeEmbeddingsAdapter implements Embeddings {
  async load() {
    await embeddingRuntime.load();
    return this;
  }

  async unload() {
    embeddingRuntime.unload();
  }

  embed(text: string) {
    return embeddingRuntime.embed(text);
  }
}

type IndexProgress = {
  completed: number;
  total: number;
};

class OfflineVectorIndex {
  private store: OPSQLiteVectorStore | null = null;
  private loadPromise: Promise<OPSQLiteVectorStore> | null = null;

  private async getStore() {
    if (this.store) {
      return this.store;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const store = new OPSQLiteVectorStore({
      name: VECTOR_DATABASE_NAME,
      embeddings: new RuntimeEmbeddingsAdapter(),
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
    onProgress?: (progress: IndexProgress) => void
  ) {
    const store = await this.getStore();

    await store.delete({
      predicate: (value) => value.metadata?.materialId === materialId,
    });

    for (const [index, chunk] of chunks.entries()) {
      const embedding = await embeddingRuntime.embed(chunk.content);
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
      onProgress?.({ completed: index + 1, total: chunks.length });
    }
  }

  async queryMaterial(materialId: string, query: string, limit = 4): Promise<QueryResult[]> {
    const store = await this.getStore();
    const queryEmbedding = await embeddingRuntime.embed(query);

    return store.query({
      queryEmbedding,
      nResults: limit,
      predicate: (value) => value.metadata?.materialId === materialId,
    });
  }
}

export const offlineVectorIndex = new OfflineVectorIndex();
