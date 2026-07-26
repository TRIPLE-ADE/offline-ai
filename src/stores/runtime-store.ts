import { create } from 'zustand';

export type RuntimePhase =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'loading'
  | 'ready'
  | 'generating'
  | 'interrupting'
  | 'error';

export type RuntimeState = {
  phase: RuntimePhase;
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
  phase: 'not_downloaded',
  progress: 0,
  error: null,
};

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
