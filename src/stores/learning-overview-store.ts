import type { SQLiteDatabase } from 'expo-sqlite';
import { create } from 'zustand';

import { MaterialRepository } from '@/db/repositories/material-repository';
import { QuizAttemptRepository } from '@/db/repositories/quiz-attempt-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Material, QuizAttempt, Topic } from '@/db/types';

export type LearningOverviewMaterial = {
  material: Material;
  topics: Topic[];
};

export type OptimisticMaterialDeletionSnapshot = {
  entry: LearningOverviewMaterial;
  index: number;
};

export type OptimisticLearningDataDeletionSnapshot = {
  attempts: QuizAttempt[];
  materialIds: string[];
  materials: LearningOverviewMaterial[];
};

type LearningOverviewStatus = 'idle' | 'loading' | 'ready' | 'error';

type LearningOverviewStore = {
  attempts: QuizAttempt[];
  db: SQLiteDatabase | null;
  deletingMaterialIds: string[];
  error: string | null;
  materials: LearningOverviewMaterial[];
  status: LearningOverviewStatus;
};

const initialState: LearningOverviewStore = {
  attempts: [],
  db: null,
  deletingMaterialIds: [],
  error: null,
  materials: [],
  status: 'idle',
};

export const useLearningOverviewStore =
  create<LearningOverviewStore>(() => initialState);

let refreshPromise: Promise<void> | null = null;

async function readLearningOverview(db: SQLiteDatabase) {
  const [materials, attempts] = await Promise.all([
    new MaterialRepository(db).list().then((rows) =>
      Promise.all(
        rows.map(async (material) => ({
          material,
          topics: await new TopicRepository(db).listForMaterial(material.id),
        }))
      )
    ),
    new QuizAttemptRepository(db).listRecent(6),
  ]);

  const deletingMaterialIds = new Set(
    useLearningOverviewStore.getState().deletingMaterialIds
  );

  return {
    attempts,
    materials: materials.filter(
      ({ material }) => !deletingMaterialIds.has(material.id)
    ),
  };
}

export async function initializeLearningOverview(db: SQLiteDatabase) {
  useLearningOverviewStore.setState({ db });
  await refreshLearningOverview();
}

export function refreshLearningOverview() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const snapshot = useLearningOverviewStore.getState();
  if (!snapshot.db) {
    return Promise.resolve();
  }

  if (snapshot.status === 'idle') {
    useLearningOverviewStore.setState({ error: null, status: 'loading' });
  }

  refreshPromise = readLearningOverview(snapshot.db)
    .then(({ attempts, materials }) => {
      useLearningOverviewStore.setState({
        attempts,
        error: null,
        materials,
        status: 'ready',
      });
    })
    .catch((caught: unknown) => {
      const message =
        caught instanceof Error
          ? caught.message
          : 'Local learning data could not be loaded.';
      useLearningOverviewStore.setState({ error: message, status: 'error' });
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function beginOptimisticMaterialDeletion(materialId: string) {
  const state = useLearningOverviewStore.getState();
  const index = state.materials.findIndex(
    ({ material }) => material.id === materialId
  );
  const snapshot =
    index >= 0
      ? {
          entry: state.materials[index],
          index,
        }
      : null;

  useLearningOverviewStore.setState((state) => ({
    deletingMaterialIds: state.deletingMaterialIds.includes(materialId)
      ? state.deletingMaterialIds
      : [...state.deletingMaterialIds, materialId],
    materials: state.materials.filter(
      ({ material }) => material.id !== materialId
    ),
  }));
  return snapshot;
}

export function endOptimisticMaterialDeletion(materialId: string) {
  useLearningOverviewStore.setState((state) => ({
    deletingMaterialIds: state.deletingMaterialIds.filter(
      (id) => id !== materialId
    ),
  }));
}

export function restoreOptimisticMaterialDeletion(
  snapshot: OptimisticMaterialDeletionSnapshot
) {
  useLearningOverviewStore.setState((state) => {
    const materialId = snapshot.entry.material.id;
    if (
      state.materials.some(({ material }) => material.id === materialId)
    ) {
      return {
        deletingMaterialIds: state.deletingMaterialIds.filter(
          (id) => id !== materialId
        ),
      };
    }

    const materials = [...state.materials];
    materials.splice(
      Math.min(snapshot.index, materials.length),
      0,
      snapshot.entry
    );
    return {
      deletingMaterialIds: state.deletingMaterialIds.filter(
        (id) => id !== materialId
      ),
      materials,
    };
  });
}

export function beginOptimisticLearningDataDeletion() {
  const state = useLearningOverviewStore.getState();
  const materialIds = state.materials.map(({ material }) => material.id);
  const snapshot: OptimisticLearningDataDeletionSnapshot = {
    attempts: state.attempts,
    materialIds,
    materials: state.materials,
  };

  useLearningOverviewStore.setState((state) => ({
    attempts: [],
    deletingMaterialIds: [
      ...new Set([...state.deletingMaterialIds, ...materialIds]),
    ],
    materials: [],
  }));
  return snapshot;
}

export function endOptimisticLearningDataDeletion(
  snapshot: OptimisticLearningDataDeletionSnapshot
) {
  const deletedMaterialIds = new Set(snapshot.materialIds);
  useLearningOverviewStore.setState((state) => ({
    deletingMaterialIds: state.deletingMaterialIds.filter(
      (id) => !deletedMaterialIds.has(id)
    ),
  }));
}

export function restoreOptimisticLearningDataDeletion(
  snapshot: OptimisticLearningDataDeletionSnapshot
) {
  const restoredMaterialIds = new Set(snapshot.materialIds);
  useLearningOverviewStore.setState((state) => ({
    attempts: snapshot.attempts,
    deletingMaterialIds: state.deletingMaterialIds.filter(
      (id) => !restoredMaterialIds.has(id)
    ),
    materials: [
      ...snapshot.materials,
      ...state.materials.filter(
        ({ material }) => !restoredMaterialIds.has(material.id)
      ),
    ],
  }));
}
