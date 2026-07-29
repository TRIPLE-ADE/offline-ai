import { useCallback } from 'react';

import {
  useModelInstallationStore,
  type ModelInstallationPhase,
  type ModelInstallationVerification,
} from '@/ai/model-installation-state';
import { evaluateLearningFeatureAccess } from '@/onboarding/first-run-policy';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export function isOfflineAiInstalled(
  phase: ModelInstallationPhase,
  verification: ModelInstallationVerification
) {
  return verification === 'complete' && phase === 'ready';
}

export function useLearningFeatureAccess() {
  const installationPhase = useModelInstallationStore((state) => state.phase);
  const installationVerification = useModelInstallationStore(
    (state) => state.verification
  );
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial
  );
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const showActionSheet = useAppOverlayStore((state) => state.showActionSheet);
  const modelInstalled = isOfflineAiInstalled(
    installationPhase,
    installationVerification
  );

  const ensureAccess = useCallback(
    ({
      hasMaterial,
      requiresMaterial = true,
      requiresModel = true,
    }: {
      hasMaterial: boolean;
      requiresMaterial?: boolean;
      requiresModel?: boolean;
    }) => {
      const decision = evaluateLearningFeatureAccess({
        hasMaterial,
        modelInstalled,
        requiresMaterial,
        requiresModel,
      });

      if (decision.allowed) {
        return true;
      }

      if (decision.prompt === 'import_material') {
        showActionSheet({
          actionLabel: 'Import material',
          description:
            'Lessons, quizzes, chat, and summaries are grounded in a PDF or TXT file you choose.',
          onAction: openImportMaterial,
          title: 'Import material to begin',
        });
        return false;
      }

      showActionSheet({
        actionLabel: 'Download offline AI',
        description:
          'This feature needs the private AI model on your device. Download it now or come back later.',
        onAction: openOfflineAi,
        title: 'Download offline AI',
      });
      return false;
    },
    [modelInstalled, openImportMaterial, openOfflineAi, showActionSheet]
  );

  return { ensureAccess, modelInstalled };
}
