import { evaluateReadiness, FALLBACK_DOWNLOAD_BYTES } from '@/onboarding/readiness';

const readyInput = {
  availableStorage: 8_000_000_000,
  totalMemory: 8_000_000_000,
  isPhysicalDevice: true,
  networkConnected: true,
  internetReachable: true,
  connectionType: 'WIFI',
};

describe('evaluateReadiness', () => {
  it('allows setup when device, storage, and connection checks pass', () => {
    expect(evaluateReadiness(readyInput).canInstall).toBe(true);
  });

  it('blocks setup without enough installation headroom', () => {
    const result = evaluateReadiness({
      ...readyInput,
      availableStorage: FALLBACK_DOWNLOAD_BYTES,
    });

    expect(result.hasStorage).toBe(false);
    expect(result.canInstall).toBe(false);
  });

  it('blocks known low-memory physical devices', () => {
    const result = evaluateReadiness({ ...readyInput, totalMemory: 3_000_000_000 });

    expect(result.compatible).toBe(false);
    expect(result.canInstall).toBe(false);
  });

  it('allows development devices to exercise onboarding checks', () => {
    const result = evaluateReadiness({
      ...readyInput,
      isPhysicalDevice: false,
      totalMemory: 2_000_000_000,
    });

    expect(result.compatible).toBe(true);
  });

  it('identifies cellular connections without blocking a reachable download', () => {
    const result = evaluateReadiness({ ...readyInput, connectionType: 'CELLULAR' });

    expect(result.cellular).toBe(true);
    expect(result.canInstall).toBe(true);
  });
});
