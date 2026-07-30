import { useCallback } from 'react';

import { isOfflineAiAvailable } from '@/ai/model-capability';
import { useModelInstallationStore } from '@/ai/model-installation-state';
import { inspectOfflineResources } from '@/ai/offline-resource-state';

export function useOfflineAiCapability() {
  const availability = useModelInstallationStore((state) => state.availability);
  const availabilityMessage = useModelInstallationStore(
    (state) => state.availabilityMessage
  );
  const installationMessage = useModelInstallationStore((state) => state.message);
  const installationPhase = useModelInstallationStore((state) => state.phase);
  const downloadActive = useModelInstallationStore(
    (state) => state.downloadActive
  );
  const downloadProgress = useModelInstallationStore(
    (state) => state.downloadProgress
  );
  const resourceRemovalActive = useModelInstallationStore(
    (state) => state.resourceRemovalActive
  );
  const retryVerification = useCallback(
    () => inspectOfflineResources(),
    []
  );

  return {
    availability,
    availabilityMessage,
    available:
      !resourceRemovalActive && isOfflineAiAvailable(availability),
    checking:
      resourceRemovalActive || availability === 'checking',
    downloadActive,
    downloadProgress,
    installationMessage,
    installationPhase,
    resourceRemovalActive,
    retryVerification,
  };
}
