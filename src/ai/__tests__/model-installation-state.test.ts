import {
  beginModelResourceVerification,
  completeModelResourceVerification,
  failModelResourceVerification,
  useModelInstallationStore,
} from '@/ai/model-installation-state';

describe('model installation history and verified availability', () => {
  beforeEach(() => {
    useModelInstallationStore.setState({
      availability: 'checking',
      availabilityMessage: null,
      availabilityUpdatedAt: new Date(0).toISOString(),
      downloadActive: false,
      downloadProgress: 0,
      message: null,
      phase: 'skipped',
      updatedAt: new Date(0).toISOString(),
    });
  });

  it('does not rewrite installation history when resources are available', () => {
    completeModelResourceVerification(true);

    const state = useModelInstallationStore.getState();
    expect(state.availability).toBe('available');
    expect(state.phase).toBe('skipped');
  });

  it('does not rewrite installation history when resources are unavailable', () => {
    useModelInstallationStore.setState({ phase: 'ready' });

    completeModelResourceVerification(false);

    const state = useModelInstallationStore.getState();
    expect(state.availability).toBe('unavailable');
    expect(state.phase).toBe('ready');
  });

  it('keeps inspection failure separate from unavailable resources', () => {
    useModelInstallationStore.setState({ phase: 'ready' });

    failModelResourceVerification('Unable to inspect resources.');

    const state = useModelInstallationStore.getState();
    expect(state.availability).toBe('error');
    expect(state.availabilityMessage).toBe('Unable to inspect resources.');
    expect(state.phase).toBe('ready');
  });

  it('clears an earlier verification error when checking again', () => {
    failModelResourceVerification('Unable to inspect resources.');

    beginModelResourceVerification();

    const state = useModelInstallationStore.getState();
    expect(state.availability).toBe('checking');
    expect(state.availabilityMessage).toBeNull();
  });
});
