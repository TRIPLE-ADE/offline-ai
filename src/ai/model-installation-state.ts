import { File, Paths } from 'expo-file-system';
import { create } from 'zustand';

import {
  reconcileModelInstallationPhase,
  type ModelInstallationPhase,
} from '@/onboarding/first-run-policy';

export type { ModelInstallationPhase } from '@/onboarding/first-run-policy';

export type ModelInstallationState = {
  phase: ModelInstallationPhase;
  message: string | null;
  updatedAt: string;
};

export type ModelInstallationVerification = 'pending' | 'complete';

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
  verification: ModelInstallationVerification;
  setState: (state: ModelInstallationState) => void;
};

export const useModelInstallationStore = create<ModelInstallationStore>(
  (set) => ({
    ...readPersistedState(),
    verification: 'pending',
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

export function completeModelInstallationVerification() {
  useModelInstallationStore.setState({ verification: 'complete' });
}

export function failModelInstallationVerification() {
  const current = getModelInstallationState();
  const installationCouldBeIncomplete =
    current.phase === 'ready' ||
    current.phase === 'downloading' ||
    current.phase === 'retrying';

  useModelInstallationStore.setState({
    ...current,
    message: installationCouldBeIncomplete
      ? 'The offline AI resources could not be checked. Retry from Settings when you are ready.'
      : current.message,
    phase: installationCouldBeIncomplete ? 'failed' : current.phase,
    updatedAt: new Date().toISOString(),
    verification: 'complete',
  });
}

export function reconcileModelInstallationState(resourcesInstalled: boolean) {
  const current = getModelInstallationState();
  const nextPhase = reconcileModelInstallationPhase(
    current.phase,
    resourcesInstalled
  );

  if (nextPhase === 'ready') {
    return saveModelInstallationState('ready');
  }

  if (
    nextPhase === 'failed' &&
    (current.phase === 'downloading' || current.phase === 'retrying')
  ) {
    return saveModelInstallationState(
      'failed',
      'The previous download was interrupted. Ready when you are to retry.'
    );
  }

  if (nextPhase === 'failed' && current.phase === 'ready') {
    return saveModelInstallationState(
      'failed',
      'The offline AI resources are incomplete. Download them again when you are ready.'
    );
  }

  return current;
}
