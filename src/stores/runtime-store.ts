import { create } from 'zustand';

export type RuntimeResidencyPhase =
  | 'unloaded'
  | 'loading'
  | 'loaded'
  | 'unloading'
  | 'failed';

export type RuntimeActivityPhase =
  | 'idle'
  | 'running'
  | 'interrupting';

export type RuntimeState = {
  residency: RuntimeResidencyPhase;
  activity: RuntimeActivityPhase;
  progress: number;
  error: string | null;
};

type RuntimeStore = {
  generation: RuntimeState;
  embedding: RuntimeState;
  setGeneration: (patch: Partial<RuntimeState>) => void;
  setEmbedding: (patch: Partial<RuntimeState>) => void;
};

const initialRuntimeState: RuntimeState = {
  residency: 'unloaded',
  activity: 'idle',
  progress: 0,
  error: null,
};

export function isRuntimeLoaded(state: RuntimeState) {
  return state.residency === 'loaded';
}

export function isRuntimeBusy(state: RuntimeState) {
  return (
    state.residency === 'loading' ||
    state.residency === 'unloading' ||
    state.activity !== 'idle'
  );
}

export const useRuntimeStore = create<RuntimeStore>((set) => ({
  generation: { ...initialRuntimeState },
  embedding: { ...initialRuntimeState },
  setGeneration: (patch) =>
    set((state) => ({
      generation: { ...state.generation, ...patch },
    })),
  setEmbedding: (patch) =>
    set((state) => ({
      embedding: { ...state.embedding, ...patch },
    })),
}));
