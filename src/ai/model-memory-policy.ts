import * as Device from 'expo-device';

export const MINIMUM_MODEL_MEMORY_BYTES = 4_000_000_000;
export const SHARED_RESIDENCY_MEMORY_BYTES = 8_000_000_000;

export type ModelMemorySupport = 'supported' | 'unsupported';
export type ModelResidencyMode = 'exclusive' | 'shared';

export type ModelMemoryPolicy = {
  support: ModelMemorySupport;
  residencyMode: ModelResidencyMode;
  totalMemory: number | null;
  reason: string;
};

export type ModelMemoryPolicyInput = {
  isPhysicalDevice: boolean;
  totalMemory: number | null;
};

export class UnsupportedDeviceMemoryError extends Error {
  readonly policy: ModelMemoryPolicy;

  constructor(policy: ModelMemoryPolicy) {
    super(policy.reason);
    this.name = 'UnsupportedDeviceMemoryError';
    this.policy = policy;
  }
}

export function evaluateModelMemoryPolicy({
  isPhysicalDevice,
  totalMemory,
}: ModelMemoryPolicyInput): ModelMemoryPolicy {
  if (
    isPhysicalDevice &&
    totalMemory !== null &&
    totalMemory < MINIMUM_MODEL_MEMORY_BYTES
  ) {
    return {
      support: 'unsupported',
      residencyMode: 'exclusive',
      totalMemory,
      reason:
        'This device does not have enough memory to run LearnGuide’s offline AI safely.',
    };
  }

  const canShareResidency =
    isPhysicalDevice &&
    totalMemory !== null &&
    totalMemory >= SHARED_RESIDENCY_MEMORY_BYTES;

  return {
    support: 'supported',
    residencyMode: canShareResidency ? 'shared' : 'exclusive',
    totalMemory,
    reason: canShareResidency
      ? 'This device can keep both offline AI runtimes ready.'
      : 'LearnGuide will switch between offline AI runtimes to conserve memory.',
  };
}

export function getDeviceModelMemoryPolicy() {
  return evaluateModelMemoryPolicy({
    isPhysicalDevice: Device.isDevice,
    totalMemory: Device.totalMemory,
  });
}

export function isUnsupportedDeviceMemoryError(
  error: unknown
): error is UnsupportedDeviceMemoryError {
  return error instanceof UnsupportedDeviceMemoryError;
}
