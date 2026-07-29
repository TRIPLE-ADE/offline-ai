import { useCallback } from 'react';

import { evaluateLearningFeatureAccess } from '@/onboarding/first-run-policy';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useRuntimeStore, type RuntimeState } from '@/stores/runtime-store';

export function isOfflineAiInstalled(
  generation: RuntimeState,
  embedding: RuntimeState
) {
  const installed = (state: RuntimeState) =>
    state.phase === 'downloaded' || state.phase === 'ready';
  return installed(generation) && installed(embedding);
}

export function useLearningFeatureAccess() {
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial
  );
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const showActionSheet = useAppOverlayStore((state) => state.showActionSheet);
  const modelInstalled = isOfflineAiInstalled(generation, embedding);

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
