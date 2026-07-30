import {
  evaluateModelMemoryPolicy,
  UnsupportedDeviceMemoryError,
} from '@/ai/model-memory-policy';
import { RuntimeMemoryController } from '@/ai/runtime-memory-controller';

const unsupportedPolicy = evaluateModelMemoryPolicy({
  isPhysicalDevice: true,
  totalMemory: 3_000_000_000,
});
const exclusivePolicy = evaluateModelMemoryPolicy({
  isPhysicalDevice: true,
  totalMemory: 6_000_000_000,
});
const sharedPolicy = evaluateModelMemoryPolicy({
  isPhysicalDevice: true,
  totalMemory: 8_000_000_000,
});

describe('model memory policy', () => {
  it('marks known low-memory physical devices unsupported', () => {
    expect(unsupportedPolicy).toMatchObject({
      support: 'unsupported',
      residencyMode: 'exclusive',
    });
  });

  it('uses exclusive residency when memory is unknown or constrained', () => {
    expect(exclusivePolicy.residencyMode).toBe('exclusive');
    expect(
      evaluateModelMemoryPolicy({
        isPhysicalDevice: true,
        totalMemory: null,
      }).residencyMode
    ).toBe('exclusive');
  });

  it('allows shared residency only on known high-memory physical devices', () => {
    expect(sharedPolicy).toMatchObject({
      support: 'supported',
      residencyMode: 'shared',
    });
  });
});

describe('runtime memory controller', () => {
  it('unloads embedding before loading generation under exclusive policy', async () => {
    const events: string[] = [];
    const controller = new RuntimeMemoryController({
      getPolicy: () => exclusivePolicy,
      hasActiveOperation: () => false,
    });
    controller.register('embedding', {
      unload: async () => {
        events.push('unload-embedding');
      },
    });
    controller.register('generation', {
      unload: async () => {
        events.push('unload-generation');
      },
    });

    await controller.load('embedding', async () => {
      events.push('load-embedding');
    });
    await controller.load('generation', async () => {
      events.push('load-generation');
    });

    expect(events).toEqual([
      'unload-generation',
      'load-embedding',
      'unload-embedding',
      'load-generation',
    ]);
  });

  it('keeps a failed unload recoverable on the next load attempt', async () => {
    const unloadEmbedding = jest
      .fn()
      .mockRejectedValueOnce(new Error('Native unload failed'))
      .mockResolvedValueOnce(undefined);
    const loadGeneration = jest.fn().mockResolvedValue(undefined);
    const controller = new RuntimeMemoryController({
      getPolicy: () => exclusivePolicy,
      hasActiveOperation: () => false,
    });
    controller.register('embedding', { unload: unloadEmbedding });

    await expect(
      controller.load('generation', loadGeneration)
    ).rejects.toThrow('Native unload failed');
    await expect(
      controller.load('generation', loadGeneration)
    ).resolves.toBeUndefined();

    expect(unloadEmbedding).toHaveBeenCalledTimes(2);
    expect(loadGeneration).toHaveBeenCalledTimes(1);
  });

  it('does not load any runtime on an unsupported device', async () => {
    const loader = jest.fn().mockResolvedValue(undefined);
    const controller = new RuntimeMemoryController({
      getPolicy: () => unsupportedPolicy,
      hasActiveOperation: () => false,
    });

    await expect(
      controller.load('generation', loader)
    ).rejects.toBeInstanceOf(UnsupportedDeviceMemoryError);
    expect(loader).not.toHaveBeenCalled();
  });

  it('defers memory-warning release until the active operation finishes', async () => {
    let active = true;
    const unloadGeneration = jest.fn().mockResolvedValue(undefined);
    const unloadEmbedding = jest.fn().mockResolvedValue(undefined);
    const controller = new RuntimeMemoryController({
      getPolicy: () => exclusivePolicy,
      hasActiveOperation: () => active,
    });
    controller.register('generation', { unload: unloadGeneration });
    controller.register('embedding', { unload: unloadEmbedding });

    await controller.handleMemoryWarning();
    expect(unloadGeneration).not.toHaveBeenCalled();

    active = false;
    await controller.releaseIfNeeded();
    expect(unloadGeneration).toHaveBeenCalledTimes(1);
    expect(unloadEmbedding).toHaveBeenCalledTimes(1);
  });
});
