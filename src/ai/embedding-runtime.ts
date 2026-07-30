import { models, TextEmbeddingsModule } from 'react-native-executorch';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import type { AiOperationLease } from '@/ai/runtime-coordinator';
import { useRuntimeStore } from '@/stores/runtime-store';

export class EmbeddingRuntime {
  private module: TextEmbeddingsModule | null = null;
  private loadPromise: Promise<void> | null = null;
  private unloadPromise: Promise<void> | null = null;
  private activeEmbeddings = 0;

  async load() {
    if (this.module) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    if (this.unloadPromise) {
      await this.unloadPromise;
      if (this.module) {
        return;
      }
      if (this.loadPromise) {
        return this.loadPromise;
      }
    }

    initializeExecutorch();
    useRuntimeStore.getState().setEmbedding({
      residency: 'loading',
      progress: 0,
      error: null,
    });

    this.loadPromise = TextEmbeddingsModule.fromModelName(
      models.text_embedding.all_minilm_l6_v2(),
      (progress) =>
        useRuntimeStore.getState().setEmbedding({
          residency: 'loading',
          progress,
        })
    )
      .then((module) => {
        this.module = module;
        useRuntimeStore.getState().setEmbedding({
          residency: 'loaded',
          progress: 1,
          error: null,
        });
      })
      .catch((error: unknown) => {
        useRuntimeStore.getState().setEmbedding({
          residency: 'failed',
          error: error instanceof Error ? error.message : 'Unable to load MiniLM.',
        });
        throw error;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async embed(text: string, lease: AiOperationLease) {
    lease.assertActive();
    if (!this.module) {
      await this.load();
    }
    lease.assertActive();
    if (!this.module) {
      throw new Error('MiniLM is not loaded.');
    }

    this.activeEmbeddings += 1;
    useRuntimeStore.getState().setEmbedding({
      activity: 'running',
      error: null,
    });
    try {
      const embedding = Array.from(await this.module.forward(text));
      lease.assertActive();
      return embedding;
    } finally {
      this.activeEmbeddings -= 1;
      if (this.activeEmbeddings === 0) {
        useRuntimeStore.getState().setEmbedding({ activity: 'idle' });
      }
    }
  }

  async unload() {
    if (this.unloadPromise) {
      return this.unloadPromise;
    }

    const work = (async () => {
      if (this.loadPromise) {
        await this.loadPromise;
      }
      if (!this.module) {
        useRuntimeStore.getState().setEmbedding({
          residency: 'unloaded',
          activity: 'idle',
          progress: 0,
          error: null,
        });
        return;
      }
      if (this.activeEmbeddings > 0) {
        throw new Error(
          'Wait for the active embedding operation before unloading MiniLM.'
        );
      }

      useRuntimeStore.getState().setEmbedding({
        residency: 'unloading',
        error: null,
      });
      try {
        this.module.delete();
        this.module = null;
        useRuntimeStore.getState().setEmbedding({
          residency: 'unloaded',
          activity: 'idle',
          progress: 0,
          error: null,
        });
      } catch (error) {
        useRuntimeStore.getState().setEmbedding({
          residency: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to unload MiniLM.',
        });
        throw error;
      }
    })().finally(() => {
      this.unloadPromise = null;
    });

    this.unloadPromise = work;
    return work;
  }
}

export const embeddingRuntime = new EmbeddingRuntime();
