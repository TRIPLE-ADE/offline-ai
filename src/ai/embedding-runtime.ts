import { models, TextEmbeddingsModule } from 'react-native-executorch';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import { useRuntimeStore } from '@/stores/runtime-store';

class EmbeddingRuntime {
  private module: TextEmbeddingsModule | null = null;
  private loadPromise: Promise<void> | null = null;

  async load() {
    if (this.module) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    initializeExecutorch();
    useRuntimeStore.getState().setEmbedding({ phase: 'loading', error: null });

    this.loadPromise = TextEmbeddingsModule.fromModelName(
      models.text_embedding.all_minilm_l6_v2(),
      (progress) =>
        useRuntimeStore.getState().setEmbedding({
          phase: progress < 1 ? 'downloading' : 'loading',
          progress,
        })
    )
      .then((module) => {
        this.module = module;
        useRuntimeStore.getState().setEmbedding({ phase: 'ready', progress: 1, error: null });
      })
      .catch((error: unknown) => {
        useRuntimeStore.getState().setEmbedding({
          phase: 'error',
          error: error instanceof Error ? error.message : 'Unable to load MiniLM.',
        });
        throw error;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async embed(text: string) {
    if (!this.module) {
      await this.load();
    }
    if (!this.module) {
      throw new Error('MiniLM is not loaded.');
    }

    return Array.from(await this.module.forward(text));
  }

  unload() {
    this.module?.delete();
    this.module = null;
    useRuntimeStore.getState().setEmbedding({
      phase: 'downloaded',
      progress: 1,
      error: null,
    });
  }
}

export const embeddingRuntime = new EmbeddingRuntime();
