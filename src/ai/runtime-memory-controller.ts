import {
  getDeviceModelMemoryPolicy,
  UnsupportedDeviceMemoryError,
  type ModelMemoryPolicy,
} from '@/ai/model-memory-policy';
import { runtimeCoordinator } from '@/ai/runtime-coordinator';

export type AiRuntimeKind = 'embedding' | 'generation';

type RuntimeHandle = {
  unload: () => Promise<void>;
};

type RuntimeMemoryControllerOptions = {
  getPolicy?: () => ModelMemoryPolicy;
  hasActiveOperation?: () => boolean;
};

export class RuntimeMemoryController {
  private readonly runtimes = new Map<AiRuntimeKind, RuntimeHandle>();
  private transition: Promise<void> = Promise.resolve();
  private appActive = true;
  private memoryReleaseRequested = false;
  private readonly getPolicy: () => ModelMemoryPolicy;
  private readonly hasActiveOperation: () => boolean;

  constructor(options: RuntimeMemoryControllerOptions = {}) {
    this.getPolicy = options.getPolicy ?? getDeviceModelMemoryPolicy;
    this.hasActiveOperation =
      options.hasActiveOperation ??
      (() => {
        const operation = runtimeCoordinator.getSnapshot().activeOperation;
        return operation !== null && operation.kind !== 'removing-resources';
      });
  }

  register(kind: AiRuntimeKind, handle: RuntimeHandle) {
    this.runtimes.set(kind, handle);
  }

  async load(kind: AiRuntimeKind, loader: () => Promise<void>) {
    return this.enqueue(async () => {
      const policy = this.getPolicy();
      if (policy.support === 'unsupported') {
        throw new UnsupportedDeviceMemoryError(policy);
      }

      if (policy.residencyMode === 'exclusive') {
        await this.unloadKinds(
          kind === 'embedding' ? ['generation'] : ['embedding']
        );
      }

      await loader();

      if (this.shouldRelease() && !this.hasActiveOperation()) {
        await this.unloadKinds(['generation', 'embedding']);
        this.memoryReleaseRequested = false;
      }
    });
  }

  setAppActive(active: boolean) {
    this.appActive = active;
    return this.releaseIfNeeded();
  }

  handleMemoryWarning() {
    this.memoryReleaseRequested = true;
    return this.releaseIfNeeded();
  }

  releaseIfNeeded() {
    if (!this.shouldRelease() || this.hasActiveOperation()) {
      return Promise.resolve();
    }

    return this.releaseAll().then(() => {
      this.memoryReleaseRequested = false;
    });
  }

  releaseAll() {
    if (this.hasActiveOperation()) {
      return Promise.reject(
        new Error('Wait for the active offline AI task before releasing memory.')
      );
    }
    return this.enqueue(() =>
      this.unloadKinds(['generation', 'embedding'])
    );
  }

  private shouldRelease() {
    return !this.appActive || this.memoryReleaseRequested;
  }

  private enqueue(task: () => Promise<void>) {
    const work = this.transition.then(task);
    this.transition = work.catch(() => undefined);
    return work;
  }

  private async unloadKinds(kinds: AiRuntimeKind[]) {
    let firstError: unknown;

    for (const kind of kinds) {
      const runtime = this.runtimes.get(kind);
      if (!runtime) {
        continue;
      }
      try {
        await runtime.unload();
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError) {
      throw firstError;
    }
  }
}

export const runtimeMemoryController = new RuntimeMemoryController();
