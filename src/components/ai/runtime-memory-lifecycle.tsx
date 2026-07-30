import { useEffect } from 'react';
import { AppState } from 'react-native';

import { runtimeMemoryController } from '@/ai/runtime-memory-controller';
import { useRuntimeCoordinatorStore } from '@/ai/runtime-coordinator';

export function RuntimeMemoryLifecycle() {
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          void runtimeMemoryController.setAppActive(true);
        } else if (state === 'background') {
          void runtimeMemoryController
            .setAppActive(false)
            .catch(() => undefined);
        }
      }
    );
    const memoryWarningSubscription = AppState.addEventListener(
      'memoryWarning',
      () => {
        void runtimeMemoryController
          .handleMemoryWarning()
          .catch(() => undefined);
      }
    );
    const coordinatorSubscription = useRuntimeCoordinatorStore.subscribe(
      (state, previous) => {
        if (
          previous.activeOperation !== null &&
          state.activeOperation === null
        ) {
          void runtimeMemoryController
            .releaseIfNeeded()
            .catch(() => undefined);
        }
      }
    );

    return () => {
      appStateSubscription.remove();
      memoryWarningSubscription.remove();
      coordinatorSubscription();
    };
  }, []);

  return null;
}
