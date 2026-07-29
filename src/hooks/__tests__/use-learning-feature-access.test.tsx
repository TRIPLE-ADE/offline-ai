import { act, renderHook } from '@testing-library/react-native';

import { useModelInstallationStore } from '@/ai/model-installation-state';
import { useLearningFeatureAccess } from '@/hooks/use-learning-feature-access';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useRuntimeStore } from '@/stores/runtime-store';

describe('learning feature access prompts', () => {
  beforeEach(() => {
    useAppOverlayStore.setState({
      actionSheet: null,
      importMaterialOpen: false,
      offlineAiOpen: false,
    });
    useRuntimeStore.setState({
      embedding: { phase: 'not_downloaded', progress: 0, error: null },
      generation: { phase: 'not_downloaded', progress: 0, error: null },
    });
    useModelInstallationStore.setState({
      message: null,
      phase: 'skipped',
      updatedAt: new Date(0).toISOString(),
      verification: 'complete',
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
      verification: 'complete',
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
      embedding: { phase: 'ready', progress: 1, error: null },
      generation: { phase: 'ready', progress: 1, error: null },
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.modelInstalled).toBe(false);
    expect(result.current.ensureAccess({ hasMaterial: true })).toBe(false);
    expect(useAppOverlayStore.getState().actionSheet?.title).toBe(
      'Download offline AI'
    );
  });

  it('does not expose a persisted ready state before the startup file check completes', async () => {
    useModelInstallationStore.setState({
      message: null,
      phase: 'ready',
      updatedAt: new Date().toISOString(),
      verification: 'pending',
    });
    const { result } = await renderHook(() => useLearningFeatureAccess());

    expect(result.current.modelInstalled).toBe(false);

    await act(() => {
      useModelInstallationStore.setState({ verification: 'complete' });
    });

    expect(result.current.modelInstalled).toBe(true);
  });
});
