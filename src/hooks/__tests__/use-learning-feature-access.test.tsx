import { act, renderHook } from '@testing-library/react-native';

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
    useRuntimeStore.setState({
      embedding: { phase: 'downloaded', progress: 1, error: null },
      generation: { phase: 'downloaded', progress: 1, error: null },
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
});
