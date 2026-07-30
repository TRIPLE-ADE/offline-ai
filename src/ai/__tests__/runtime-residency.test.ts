import { EmbeddingRuntime } from '@/ai/embedding-runtime';
import {
  AiGenerationTimeoutError,
  GenerationRuntime,
} from '@/ai/generation-runtime';
import { evaluateModelMemoryPolicy } from '@/ai/model-memory-policy';
import { RuntimeMemoryController } from '@/ai/runtime-memory-controller';
import {
  AiOperationCancelledError,
  type AiOperationLease,
} from '@/ai/runtime-coordinator';
import {
  isRuntimeBusy,
  isRuntimeLoaded,
  useRuntimeStore,
  type RuntimeState,
} from '@/stores/runtime-store';

const mockInitializeExecutorch = jest.fn();
const mockLoadGenerationModule = jest.fn();
const mockLoadEmbeddingModule = jest.fn();

jest.mock('@/ai/initialize-executorch', () => ({
  initializeExecutorch: () => mockInitializeExecutorch(),
}));

jest.mock('react-native-executorch', () => ({
  LLMModule: {
    fromModelName: (...args: unknown[]) => mockLoadGenerationModule(...args),
  },
  TextEmbeddingsModule: {
    fromModelName: (...args: unknown[]) => mockLoadEmbeddingModule(...args),
  },
  models: {
    llm: {
      gemma4_e2b: () => ({ modelName: 'gemma4_e2b' }),
    },
    text_embedding: {
      all_minilm_l6_v2: () => ({ modelName: 'all_minilm_l6_v2' }),
    },
  },
}));

function runtimeState(
  patch: Partial<RuntimeState> = {}
): RuntimeState {
  return {
    residency: 'unloaded',
    activity: 'idle',
    progress: 0,
    error: null,
    ...patch,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function activeLease(): AiOperationLease {
  return {
    operation: {
      id: 'operation-1',
      kind: 'chatting',
      owner: { type: 'material-chat', id: 'material-1' },
      status: 'running',
      startedAt: new Date(0).toISOString(),
    },
    cancellationRequested: false,
    isActive: () => true,
    assertActive: () => undefined,
  };
}

function cancellableLease() {
  let active = true;
  const lease: AiOperationLease = {
    operation: {
      id: 'operation-cancellable',
      kind: 'chatting',
      owner: { type: 'material-chat', id: 'material-1' },
      status: 'running',
      startedAt: new Date(0).toISOString(),
    },
    get cancellationRequested() {
      return !active;
    },
    isActive: () => active,
    assertActive: () => {
      if (!active) {
        throw new AiOperationCancelledError('operation-cancellable');
      }
    },
  };
  return {
    cancel: () => {
      active = false;
    },
    lease,
  };
}

describe('AI runtime residency', () => {
  beforeEach(() => {
    mockInitializeExecutorch.mockReset();
    mockLoadGenerationModule.mockReset();
    mockLoadEmbeddingModule.mockReset();
    useRuntimeStore.setState({
      generation: runtimeState(),
      embedding: runtimeState(),
    });
  });

  it('tracks generation loading separately from loaded residency', async () => {
    const load = deferred<{
      configure: jest.Mock;
      delete: jest.Mock;
      generate: jest.Mock;
      interrupt: jest.Mock;
      setTokenCallback: jest.Mock;
    }>();
    const module = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(),
    };
    mockLoadGenerationModule.mockImplementation(
      (_model, onProgress: (progress: number) => void) => {
        onProgress(0.4);
        return load.promise;
      }
    );
    const runtime = new GenerationRuntime();

    const firstLoad = runtime.load();
    const secondLoad = runtime.load();

    expect(mockLoadGenerationModule).toHaveBeenCalledTimes(1);
    expect(useRuntimeStore.getState().generation).toEqual(
      runtimeState({ residency: 'loading', progress: 0.4 })
    );

    load.resolve(module);
    await Promise.all([firstLoad, secondLoad]);

    const state = useRuntimeStore.getState().generation;
    expect(isRuntimeLoaded(state)).toBe(true);
    expect(isRuntimeBusy(state)).toBe(false);
  });

  it('publishes generation activity without changing residency', async () => {
    const generation = deferred<string>();
    const module = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(() => generation.promise),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(),
    };
    mockLoadGenerationModule.mockResolvedValue(module);
    const runtime = new GenerationRuntime();
    await runtime.load();

    const output = runtime.generate(
      [{ role: 'user', content: 'Explain TCP.' }],
      activeLease()
    );
    expect(useRuntimeStore.getState().generation).toEqual(
      runtimeState({
        residency: 'loaded',
        activity: 'running',
        progress: 1,
      })
    );

    runtime.interrupt();
    expect(module.interrupt).toHaveBeenCalledTimes(1);
    expect(useRuntimeStore.getState().generation.activity).toBe(
      'interrupting'
    );

    generation.resolve('TCP explanation');
    await expect(output).resolves.toBe('TCP explanation');
    expect(useRuntimeStore.getState().generation).toEqual(
      runtimeState({ residency: 'loaded', progress: 1 })
    );
  });

  it('interrupts an overlong generation and reports a timeout after native inference settles', async () => {
    jest.useFakeTimers();
    try {
      const generation = deferred<string>();
      const module = {
        configure: jest.fn(),
        delete: jest.fn(),
        generate: jest.fn(() => generation.promise),
        interrupt: jest.fn(),
        setTokenCallback: jest.fn(),
      };
      mockLoadGenerationModule.mockResolvedValue(module);
      const runtime = new GenerationRuntime();
      await runtime.load();

      const output = runtime.generate(
        [{ role: 'user', content: 'Generate a long response.' }],
        activeLease(),
        undefined,
        { timeoutMs: 1_000 }
      );
      jest.advanceTimersByTime(1_000);

      expect(module.interrupt).toHaveBeenCalledTimes(1);
      expect(useRuntimeStore.getState().generation.activity).toBe(
        'interrupting'
      );
      generation.resolve('partial response');
      await expect(output).rejects.toBeInstanceOf(AiGenerationTimeoutError);
      expect(useRuntimeStore.getState().generation.activity).toBe('idle');
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps load failure retryable', async () => {
    const module = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(),
    };
    mockLoadGenerationModule
      .mockRejectedValueOnce(new Error('Memory allocation failed'))
      .mockResolvedValueOnce(module);
    const runtime = new GenerationRuntime();

    await expect(runtime.load()).rejects.toThrow('Memory allocation failed');
    expect(useRuntimeStore.getState().generation).toEqual(
      runtimeState({
        residency: 'failed',
        error: 'Memory allocation failed',
      })
    );

    await expect(runtime.load()).resolves.toBeUndefined();
    expect(useRuntimeStore.getState().generation).toEqual(
      runtimeState({ residency: 'loaded', progress: 1 })
    );
  });

  it('does not unload generation while inference is active', async () => {
    const generation = deferred<string>();
    const module = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(() => generation.promise),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(),
    };
    mockLoadGenerationModule.mockResolvedValue(module);
    const runtime = new GenerationRuntime();
    await runtime.load();

    const output = runtime.generate(
      [{ role: 'user', content: 'Explain DNS.' }],
      activeLease()
    );
    await expect(runtime.unload()).rejects.toThrow(
      'Stop the active generation'
    );
    expect(module.delete).not.toHaveBeenCalled();

    generation.resolve('DNS explanation');
    await output;
    await runtime.unload();
    expect(module.delete).toHaveBeenCalledTimes(1);
    expect(useRuntimeStore.getState().generation).toEqual(runtimeState());
  });

  it('ignores generation tokens after its lease is cancelled', async () => {
    const generation = deferred<string>();
    let emitToken: (token: string) => void = () => undefined;
    const module = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(() => generation.promise),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(
        ({ tokenCallback }: { tokenCallback: (token: string) => void }) => {
          emitToken = tokenCallback;
        }
      ),
    };
    mockLoadGenerationModule.mockResolvedValue(module);
    const runtime = new GenerationRuntime();
    const { cancel, lease } = cancellableLease();
    const received: string[] = [];
    await runtime.load();

    const output = runtime.generate(
      [{ role: 'user', content: 'Explain routing.' }],
      lease,
      (token) => received.push(token)
    );
    emitToken('before cancellation');
    cancel();
    emitToken('late token');
    generation.resolve('completed too late');

    await expect(output).rejects.toBeInstanceOf(
      AiOperationCancelledError
    );
    expect(received).toEqual(['before cancellation']);
  });

  it('tracks embedding work and leaves unload retryable', async () => {
    const embedding = deferred<Float32Array>();
    const module = {
      delete: jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('Native unload failed');
        })
        .mockImplementationOnce(() => undefined),
      forward: jest.fn(() => embedding.promise),
    };
    mockLoadEmbeddingModule.mockResolvedValue(module);
    const runtime = new EmbeddingRuntime();
    await runtime.load();

    const output = runtime.embed('Routing', activeLease());
    expect(useRuntimeStore.getState().embedding.activity).toBe('running');
    await expect(runtime.unload()).rejects.toThrow(
      'Wait for the active embedding operation'
    );

    embedding.resolve(new Float32Array([0.1, 0.2]));
    await expect(output).resolves.toEqual([
      expect.closeTo(0.1),
      expect.closeTo(0.2),
    ]);
    expect(useRuntimeStore.getState().embedding.activity).toBe('idle');

    await expect(runtime.unload()).rejects.toThrow('Native unload failed');
    expect(useRuntimeStore.getState().embedding.residency).toBe('failed');
    await expect(runtime.unload()).resolves.toBeUndefined();
    expect(useRuntimeStore.getState().embedding).toEqual(runtimeState());
  });

  it('switches from embedding to generation without keeping both resident on constrained devices', async () => {
    const embeddingModule = {
      delete: jest.fn(),
      forward: jest.fn(),
    };
    const generationModule = {
      configure: jest.fn(),
      delete: jest.fn(),
      generate: jest.fn(),
      interrupt: jest.fn(),
      setTokenCallback: jest.fn(),
    };
    mockLoadEmbeddingModule.mockResolvedValue(embeddingModule);
    mockLoadGenerationModule.mockResolvedValue(generationModule);
    const memoryController = new RuntimeMemoryController({
      getPolicy: () =>
        evaluateModelMemoryPolicy({
          isPhysicalDevice: true,
          totalMemory: 6_000_000_000,
        }),
      hasActiveOperation: () => false,
    });
    const embeddingRuntime = new EmbeddingRuntime(memoryController);
    const generationRuntime = new GenerationRuntime(memoryController);

    await embeddingRuntime.load();
    await generationRuntime.load();

    expect(embeddingModule.delete).toHaveBeenCalledTimes(1);
    expect(useRuntimeStore.getState().embedding.residency).toBe('unloaded');
    expect(useRuntimeStore.getState().generation.residency).toBe('loaded');
  });
});
