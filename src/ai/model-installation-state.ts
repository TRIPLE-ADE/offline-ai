import { File, Paths } from 'expo-file-system';
import { create } from 'zustand';

import {
  type ModelInstallationPhase,
} from '@/onboarding/first-run-policy';
import type { OfflineAiAvailability } from '@/ai/model-capability';

export type { ModelInstallationPhase } from '@/onboarding/first-run-policy';

export type ModelInstallationState = {
  phase: ModelInstallationPhase;
  message: string | null;
  updatedAt: string;
};

const MODEL_INSTALLATION_STATE = new File(
  Paths.document,
  'learn-guide-model-installation-v1.json'
);

const validPhases = new Set<ModelInstallationPhase>([
  'not_started',
  'skipped',
  'downloading',
  'retrying',
  'ready',
  'failed',
]);

const initialState: ModelInstallationState = {
  phase: 'not_started',
  message: null,
  updatedAt: new Date(0).toISOString(),
};

function readPersistedState(): ModelInstallationState {
  if (!MODEL_INSTALLATION_STATE.exists) {
    return initialState;
  }

  try {
    const parsed = JSON.parse(
      MODEL_INSTALLATION_STATE.textSync()
    ) as Partial<ModelInstallationState>;
    if (
      typeof parsed.phase === 'string' &&
      validPhases.has(parsed.phase as ModelInstallationPhase)
    ) {
      return {
        phase: parsed.phase as ModelInstallationPhase,
        message: typeof parsed.message === 'string' ? parsed.message : null,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : initialState.updatedAt,
      };
    }
  } catch {
    // A malformed status file should never block access to the app.
  }

  return initialState;
}

type ModelInstallationStore = ModelInstallationState & {
  availability: OfflineAiAvailability;
  availabilityMessage: string | null;
  availabilityUpdatedAt: string;
  downloadActive: boolean;
  downloadProgress: number;
  setDownloadState: (state: {
    active?: boolean;
    progress?: number;
  }) => void;
  setState: (state: ModelInstallationState) => void;
};

export const useModelInstallationStore = create<ModelInstallationStore>(
  (set) => ({
    ...readPersistedState(),
    availability: 'checking',
    availabilityMessage: null,
    availabilityUpdatedAt: initialState.updatedAt,
    downloadActive: false,
    downloadProgress: 0,
    setDownloadState: ({ active, progress }) =>
      set((state) => ({
        downloadActive: active ?? state.downloadActive,
        downloadProgress:
          progress === undefined
            ? state.downloadProgress
            : Math.max(0, Math.min(1, progress)),
      })),
    setState: (state) => set(state),
  })
);

export function getModelInstallationState() {
  const { phase, message, updatedAt } = useModelInstallationStore.getState();
  return { phase, message, updatedAt };
}

export function saveModelInstallationState(
  phase: ModelInstallationPhase,
  message: string | null = null
) {
  const state: ModelInstallationState = {
    phase,
    message,
    updatedAt: new Date().toISOString(),
  };

  if (!MODEL_INSTALLATION_STATE.exists) {
    MODEL_INSTALLATION_STATE.create({ intermediates: true });
  }
  MODEL_INSTALLATION_STATE.write(JSON.stringify(state));
  useModelInstallationStore.getState().setState(state);
  return state;
}

export function setModelDownloadState(state: {
  active?: boolean;
  progress?: number;
}) {
  useModelInstallationStore.getState().setDownloadState(state);
}

export function beginModelResourceVerification() {
  useModelInstallationStore.setState({
    availability: 'checking',
    availabilityMessage: null,
  });
}

export function completeModelResourceVerification(resourcesInstalled: boolean) {
  useModelInstallationStore.setState({
    availability: resourcesInstalled ? 'available' : 'unavailable',
    availabilityMessage: null,
    availabilityUpdatedAt: new Date().toISOString(),
  });
}

export function failModelResourceVerification(message: string) {
  useModelInstallationStore.setState({
    availability: 'error',
    availabilityMessage: message,
    availabilityUpdatedAt: new Date().toISOString(),
  });
}
