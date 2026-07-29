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

type LearningOverviewStatus = 'idle' | 'loading' | 'ready' | 'error';

type LearningOverviewStore = {
  attempts: QuizAttempt[];
  db: SQLiteDatabase | null;
  error: string | null;
  materials: LearningOverviewMaterial[];
  status: LearningOverviewStatus;
};

const initialState: LearningOverviewStore = {
  attempts: [],
  db: null,
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

  return { attempts, materials };
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
