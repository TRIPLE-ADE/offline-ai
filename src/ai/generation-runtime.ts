import { LLMModule, models, type Message } from 'react-native-executorch';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import type { AiOperationLease } from '@/ai/runtime-coordinator';
import {
  runtimeMemoryController,
  type RuntimeMemoryController,
} from '@/ai/runtime-memory-controller';
import { useRuntimeStore } from '@/stores/runtime-store';

export class GenerationRuntime {
  private module: LLMModule | null = null;
  private loadPromise: Promise<void> | null = null;
  private unloadPromise: Promise<void> | null = null;
  private isGenerating = false;

  constructor(
    private readonly memoryController?: RuntimeMemoryController
  ) {
    this.memoryController?.register('generation', {
      unload: () => this.unload(),
    });
  }

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

    const loadNativeModule = async () => {
      initializeExecutorch();
      useRuntimeStore.getState().setGeneration({
        residency: 'loading',
        progress: 0,
        error: null,
      });

      try {
        const module = await LLMModule.fromModelName(
          models.llm.gemma4_e2b(),
          (progress) =>
            useRuntimeStore.getState().setGeneration({
              residency: 'loading',
              progress,
            })
        );
        this.module = module;
        useRuntimeStore.getState().setGeneration({
          residency: 'loaded',
          progress: 1,
          error: null,
        });
      } catch (error) {
        useRuntimeStore.getState().setGeneration({
          residency: 'failed',
          error: error instanceof Error ? error.message : 'Unable to load Gemma.',
        });
        throw error;
      }
    };

    const work = this.memoryController
      ? this.memoryController.load('generation', loadNativeModule)
      : loadNativeModule();
    const loadPromise = work.finally(() => {
      if (this.loadPromise === loadPromise) {
        this.loadPromise = null;
      }
    });
    this.loadPromise = loadPromise;

    return this.loadPromise;
  }

  async generate(
    messages: Message[],
    lease: AiOperationLease,
    onToken: (token: string) => void = () => undefined
  ) {
    lease.assertActive();
    if (this.isGenerating) {
      throw new Error('Another local generation is already in progress.');
    }
    this.isGenerating = true;

    try {
      if (!this.module) {
        await this.load();
      }
      lease.assertActive();
      if (!this.module) {
        throw new Error('Gemma is not loaded.');
      }

      useRuntimeStore.getState().setGeneration({
        activity: 'running',
        error: null,
      });
      this.module.setTokenCallback({
        tokenCallback: (token) => {
          if (lease.isActive()) {
            onToken(token);
          }
        },
      });
      const output = await this.module.generate(messages);
      lease.assertActive();
      return output;
    } finally {
      this.isGenerating = false;
      if (this.module) {
        useRuntimeStore.getState().setGeneration({ activity: 'idle' });
      }
    }
  }

  interrupt() {
    if (!this.module || !this.isGenerating) {
      return;
    }

    useRuntimeStore.getState().setGeneration({ activity: 'interrupting' });
    this.module.interrupt();
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
        useRuntimeStore.getState().setGeneration({
          residency: 'unloaded',
          activity: 'idle',
          progress: 0,
          error: null,
        });
        return;
      }
      if (this.isGenerating) {
        throw new Error(
          'Stop the active generation before unloading the local model.'
        );
      }

      useRuntimeStore.getState().setGeneration({
        residency: 'unloading',
        error: null,
      });
      try {
        this.module.delete();
        this.module = null;
        useRuntimeStore.getState().setGeneration({
          residency: 'unloaded',
          activity: 'idle',
          progress: 0,
          error: null,
        });
      } catch (error) {
        useRuntimeStore.getState().setGeneration({
          residency: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'Unable to unload Gemma.',
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

export const generationRuntime = new GenerationRuntime(
  runtimeMemoryController
);
