import { LLMModule, models, type Message } from 'react-native-executorch';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import { useRuntimeStore } from '@/stores/runtime-store';

class GenerationRuntime {
  private module: LLMModule | null = null;
  private loadPromise: Promise<void> | null = null;
  private isGenerating = false;

  async load() {
    if (this.module) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    initializeExecutorch();
    useRuntimeStore.getState().setGeneration({ phase: 'loading', error: null });

    this.loadPromise = LLMModule.fromModelName(
      models.llm.gemma4_e2b(),
      (progress) =>
        useRuntimeStore.getState().setGeneration({
          phase: progress < 1 ? 'downloading' : 'loading',
          progress,
        })
    )
      .then((module) => {
        this.module = module;
        useRuntimeStore.getState().setGeneration({ phase: 'ready', progress: 1, error: null });
      })
      .catch((error: unknown) => {
        useRuntimeStore.getState().setGeneration({
          phase: 'error',
          error: error instanceof Error ? error.message : 'Unable to load Gemma.',
        });
        throw error;
      })
      .finally(() => {
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  async generate(messages: Message[], onToken: (token: string) => void = () => undefined) {
    if (this.isGenerating) {
      throw new Error('Another local generation is already in progress.');
    }
    this.isGenerating = true;

    try {
      if (!this.module) {
        await this.load();
      }
      if (!this.module) {
        throw new Error('Gemma is not loaded.');
      }

      useRuntimeStore.getState().setGeneration({ phase: 'generating', error: null });
      this.module.setTokenCallback({ tokenCallback: onToken });
      return await this.module.generate(messages);
    } finally {
      this.isGenerating = false;
      if (this.module) {
        useRuntimeStore.getState().setGeneration({ phase: 'ready' });
      }
    }
  }

  interrupt() {
    if (!this.module) {
      return;
    }

    useRuntimeStore.getState().setGeneration({ phase: 'interrupting' });
    this.module.interrupt();
  }

  unload() {
    if (!this.module) {
      return;
    }

    this.module.delete();
    this.module = null;
    useRuntimeStore.getState().setGeneration({
      phase: 'downloaded',
      progress: 1,
      error: null,
    });
  }
}

export const generationRuntime = new GenerationRuntime();
