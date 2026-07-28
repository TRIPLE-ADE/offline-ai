import { Platform } from 'react-native';

export const FALLBACK_DOWNLOAD_BYTES = 2_400_000_000;
export const INSTALLATION_HEADROOM_BYTES = 600_000_000;
export const MINIMUM_MEMORY_BYTES = 4_000_000_000;

export type ReadinessInput = {
  availableStorage: number;
  totalMemory: number | null;
  isPhysicalDevice: boolean;
  networkConnected: boolean | null;
  internetReachable: boolean | null;
  connectionType: string | null;
};

export type ReadinessResult = {
  compatible: boolean;
  hasStorage: boolean;
  online: boolean;
  cellular: boolean;
  canInstall: boolean;
};

export function evaluateReadiness(
  input: ReadinessInput,
  downloadBytes = FALLBACK_DOWNLOAD_BYTES
): ReadinessResult {
  const requiredStorage = downloadBytes + INSTALLATION_HEADROOM_BYTES;
  const compatible =
    !input.isPhysicalDevice ||
    input.totalMemory === null ||
    input.totalMemory >= MINIMUM_MEMORY_BYTES;
  const hasStorage = input.availableStorage >= requiredStorage;
  const online = input.networkConnected === true && input.internetReachable !== false;
  const cellular = input.connectionType === 'CELLULAR';

  return {
    compatible,
    hasStorage,
    online,
    cellular,
    canInstall: compatible && hasStorage && online,
  };
}

export function formatBytes(bytes: number, fractionDigits = 1) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 GB';
  }
  return `${(bytes / 1_000_000_000).toFixed(fractionDigits)} GB`;
}

export function deviceCompatibilityLabel(
  compatible: boolean,
  isPhysicalDevice: boolean,
  modelName?: string | null
) {
  if (!isPhysicalDevice) {
    return 'Development device';
  }
  if (!compatible) {
    return 'More memory required';
  }
  return modelName ? `${modelName} is compatible` : `${Platform.OS === 'ios' ? 'iPhone' : 'Device'} is compatible`;
}
