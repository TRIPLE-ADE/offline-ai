import type { Material } from '@/db/types';
import {
  beginOptimisticLearningDataDeletion,
  beginOptimisticMaterialDeletion,
  endOptimisticLearningDataDeletion,
  endOptimisticMaterialDeletion,
  restoreOptimisticLearningDataDeletion,
  restoreOptimisticMaterialDeletion,
  useLearningOverviewStore,
} from '@/stores/learning-overview-store';

const material: Material = {
  id: 'material-1',
  title: 'Computer Networks',
  sourceUri: 'file:///documents/materials/material-1.pdf',
  localUri: 'file:///documents/materials/material-1.pdf',
  fileType: 'pdf',
  fileSize: 1024,
  sourceFileState: 'available',
  status: 'ready',
  statusMessage: null,
  chunkCount: 12,
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

const attempt = {
  id: 'attempt-1',
  topicId: 'topic-1',
  answers: [1, 0],
  score: 0.5,
  createdAt: '2026-07-30T00:00:00.000Z',
};

describe('optimistic material deletion', () => {
  beforeEach(() => {
    useLearningOverviewStore.setState({
      attempts: [],
      db: null,
      deletingMaterialIds: [],
      error: null,
      materials: [{ material, topics: [] }],
      status: 'ready',
    });
  });

  it('removes a material immediately and tracks one pending deletion', () => {
    beginOptimisticMaterialDeletion(material.id);
    beginOptimisticMaterialDeletion(material.id);

    expect(useLearningOverviewStore.getState().materials).toEqual([]);
    expect(
      useLearningOverviewStore.getState().deletingMaterialIds
    ).toEqual([material.id]);
  });

  it('releases the pending deletion so a failed operation can be refreshed', () => {
    beginOptimisticMaterialDeletion(material.id);
    endOptimisticMaterialDeletion(material.id);

    expect(
      useLearningOverviewStore.getState().deletingMaterialIds
    ).toEqual([]);
  });

  it('restores the optimistically removed card when deletion fails', () => {
    const snapshot = beginOptimisticMaterialDeletion(material.id);
    expect(snapshot).not.toBeNull();

    restoreOptimisticMaterialDeletion(snapshot!);

    expect(useLearningOverviewStore.getState().materials).toEqual([
      { material, topics: [] },
    ]);
    expect(
      useLearningOverviewStore.getState().deletingMaterialIds
    ).toEqual([]);
  });
});

describe('optimistic all-learning-data deletion', () => {
  beforeEach(() => {
    useLearningOverviewStore.setState({
      attempts: [attempt],
      db: null,
      deletingMaterialIds: [],
      error: null,
      materials: [{ material, topics: [] }],
      status: 'ready',
    });
  });

  it('clears learning data immediately and suppresses refresh races', () => {
    const snapshot = beginOptimisticLearningDataDeletion();

    expect(useLearningOverviewStore.getState()).toMatchObject({
      attempts: [],
      deletingMaterialIds: [material.id],
      materials: [],
    });

    endOptimisticLearningDataDeletion(snapshot);
    expect(
      useLearningOverviewStore.getState().deletingMaterialIds
    ).toEqual([]);
  });

  it('restores materials and attempts when the database delete fails', () => {
    const snapshot = beginOptimisticLearningDataDeletion();
    restoreOptimisticLearningDataDeletion(snapshot);

    expect(useLearningOverviewStore.getState()).toMatchObject({
      attempts: [attempt],
      deletingMaterialIds: [],
      materials: [{ material, topics: [] }],
    });
  });
});
