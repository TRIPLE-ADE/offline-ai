import { act, renderHook } from '@testing-library/react-native';

import { useModelInstallationStore } from '@/ai/model-installation-state';
import { useLearningFeatureAccess } from '@/hooks/use-learning-feature-access';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useRuntimeStore } from '@/stores/runtime-store';

const mockInspectOfflineResources = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();

jest.mock('@/ai/offline-resource-state', () => ({
  inspectOfflineResources: () => mockInspectOfflineResources(),
}));

jest.mock('@/utils/app-toast', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}));

describe('learning feature access prompts', () => {
  beforeEach(() => {
    mockInspectOfflineResources.mockReset();
    mockInspectOfflineResources.mockResolvedValue({
      embeddingInstalled: false,
      generationInstalled: false,
    });
    mockToastError.mockReset();
    mockToastInfo.mockReset();
    useAppOverlayStore.setState({
      actionSheet: null,
      importMaterialOpen: false,
      offlineAiOpen: false,
    });
    useRuntimeStore.setState({
      embedding: {
        residency: 'unloaded',
        activity: 'idle',
        progress: 0,
        error: null,
      },
      generation: {
        residency: 'unloaded',
        activity: 'idle',
        progress: 0,
        error: null,
      },
    });
    useModelInstallationStore.setState({
      message: null,
      phase: 'skipped',
      updatedAt: new Date(0).toISOString(),
      availability: 'unavailable',
      availabilityMessage: null,
      availabilityUpdatedAt: new Date(0).toISOString(),
      resourceRemovalActive: false,
    });
  });

  it('shows the offline AI download prompt without starting the action', async () => {
    const { result } = await renderHook(() => useLearningFeatureAccess());
    let allowed = true;

    await act(() => {
      allowed = result.current.ensureAccess({ hasMaterial: true });
    });

    expect(allowed).toBe(false);
    const options = useAppOverlayStore.getState().actionSheet;
    expect(options).toEqual(
      expect.objectContaining({
        actionLabel: 'Download offline AI',
        title: 'Download offline AI',
      })
    );
    expect(options).not.toBeNull();
    if (!options) throw new Error('Expected an offline AI action sheet');
    await act(() => options.onAction());
    expect(useAppOverlayStore.getState().offlineAiOpen).toBe(true);
  });

  it('guides source-dependent actions to import a file first', async () => {
    useModelInstallationStore.setState({
      message: null,
      phase: 'ready',
      updatedAt: new Date().toISOString(),
      availability: 'available',
      availabilityMessage: null,
      availabilityUpdatedAt: new Date().toISOString(),
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());
    let allowed = true;

    await act(() => {
      allowed = result.current.ensureAccess({ hasMaterial: false });
    });

    expect(allowed).toBe(false);
    const options = useAppOverlayStore.getState().actionSheet;
    expect(options).toEqual(
      expect.objectContaining({
        actionLabel: 'Import material',
        description: expect.stringContaining('PDF or TXT'),
        title: 'Import material to begin',
      })
    );
    expect(options).not.toBeNull();
    if (!options) throw new Error('Expected an import-material action sheet');
    await act(() => options.onAction());
    expect(useAppOverlayStore.getState().importMaterialOpen).toBe(true);
  });

  it('does not expose ready features when runtime state disagrees with installation truth', async () => {
    useRuntimeStore.setState({
      embedding: {
        residency: 'loaded',
        activity: 'idle',
        progress: 1,
        error: null,
      },
      generation: {
        residency: 'loaded',
        activity: 'idle',
        progress: 1,
        error: null,
      },
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.modelInstalled).toBe(false);
    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(false);
    expect(useAppOverlayStore.getState().actionSheet?.title).toBe(
      'Download offline AI'
    );
  });

  it('allows on-demand loading when files are available but runtimes are unloaded', async () => {
    useModelInstallationStore.setState({ availability: 'available' });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(useRuntimeStore.getState().generation.residency).toBe('unloaded');
    expect(useRuntimeStore.getState().embedding.residency).toBe('unloaded');
    expect(result.current.modelInstalled).toBe(true);
    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(true);
  });

  it('does not expose a persisted ready state before the startup file check completes', async () => {
    useModelInstallationStore.setState({
      message: null,
      phase: 'ready',
      updatedAt: new Date().toISOString(),
      availability: 'checking',
      availabilityMessage: null,
      availabilityUpdatedAt: new Date(0).toISOString(),
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.modelInstalled).toBe(false);

    await act(() => {
      useModelInstallationStore.setState({ availability: 'available' });
    });

    expect(result.current.modelInstalled).toBe(true);
  });

  it('does not offer another download while resource verification is running', async () => {
    useModelInstallationStore.setState({ availability: 'checking' });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(false);
    expect(useAppOverlayStore.getState().actionSheet).toBeNull();
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Checking offline AI',
      expect.objectContaining({
        description: expect.stringContaining('confirming'),
      })
    );
  });

  it('blocks conflicting AI actions while model resources are being removed', async () => {
    useModelInstallationStore.setState({
      availability: 'available',
      resourceRemovalActive: true,
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.modelInstalled).toBe(false);
    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(false);
    expect(useAppOverlayStore.getState().actionSheet).toBeNull();
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Removing offline AI',
      expect.objectContaining({
        description: expect.stringContaining('finish being removed'),
      })
    );
  });

  it('offers a resource check instead of a download when verification failed', async () => {
    useModelInstallationStore.setState({
      availability: 'error',
      availabilityMessage: 'Unable to read the resource directory.',
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(false);
    const options = useAppOverlayStore.getState().actionSheet;
    expect(options).toEqual(
      expect.objectContaining({
        actionLabel: 'Check again',
        title: 'Check offline AI',
      })
    );
    if (!options) throw new Error('Expected an offline AI check action sheet');

    await act(() => options.onAction());
    expect(mockInspectOfflineResources).toHaveBeenCalledTimes(1);
    expect(useAppOverlayStore.getState().offlineAiOpen).toBe(false);
  });
});
