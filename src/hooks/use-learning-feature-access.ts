import { useCallback } from 'react';

import { getDeviceModelMemoryPolicy } from '@/ai/model-memory-policy';
import { useOfflineAiCapability } from '@/hooks/use-offline-ai-capability';
import { evaluateLearningFeatureAccess } from '@/onboarding/first-run-policy';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { toast } from '@/utils/app-toast';

export function useLearningFeatureAccess() {
  const memoryPolicy = getDeviceModelMemoryPolicy();
  const {
    availability,
    available: modelInstalled,
    resourceRemovalActive,
    retryVerification,
  } = useOfflineAiCapability();
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial
  );
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const showActionSheet = useAppOverlayStore((state) => state.showActionSheet);

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

      if (requiresModel && memoryPolicy.support === 'unsupported') {
        showActionSheet({
          actionLabel: 'Got it',
          description:
            'This device does not have enough memory to run LearnGuide’s local models safely. Your imported material and existing study records remain available.',
          onAction: () => undefined,
          title: 'Offline AI isn’t supported',
        });
        return false;
      }

      if (decision.allowed) {
        return true;
      }

      if (resourceRemovalActive) {
        toast.info('Removing offline AI', {
          description:
            'Wait for the private model files to finish being removed before starting another offline AI task.',
        });
        return false;
      }

      if (availability === 'checking') {
        toast.info('Checking offline AI', {
          description:
            'LearnGuide is confirming the private AI resources stored on this device.',
        });
        return false;
      }

      if (availability === 'error') {
        showActionSheet({
          actionLabel: 'Check again',
          description:
            'LearnGuide could not confirm the offline AI resources. Check them again without leaving this page.',
          onAction: () => {
            void retryVerification().catch(() => {
              toast.error('Offline AI could not be checked');
            });
          },
          title: 'Check offline AI',
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
    [
      availability,
      memoryPolicy.support,
      modelInstalled,
      openImportMaterial,
      openOfflineAi,
      resourceRemovalActive,
      retryVerification,
      showActionSheet,
    ]
  );

  return { ensureAccess, modelInstalled };
}
