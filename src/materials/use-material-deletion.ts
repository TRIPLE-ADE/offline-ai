import { File } from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef } from 'react';

import { MaterialRepository } from '@/db/repositories/material-repository';
import type { Material } from '@/db/types';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';
import { showActionSheet } from '@/stores/app-overlay-store';
import {
  beginOptimisticMaterialDeletion,
  endOptimisticMaterialDeletion,
  refreshLearningOverview,
  restoreOptimisticMaterialDeletion,
} from '@/stores/learning-overview-store';
import { toast } from '@/utils/app-toast';

export function useMaterialDeletion() {
  const db = useSQLiteContext();
  const deletingIdsRef = useRef(new Set<string>());

  return useCallback(
    (material: Material) => {
      if (deletingIdsRef.current.has(material.id)) {
        return;
      }

      showActionSheet({
        actionLabel: 'Delete material',
        cancelLabel: 'Keep material',
        description: `This permanently deletes “${material.title}”, its progress, lessons, questions, and chat history.`,
        destructive: true,
        onAction: () => {
          if (deletingIdsRef.current.has(material.id)) {
            return;
          }

          deletingIdsRef.current.add(material.id);
          const optimisticSnapshot = beginOptimisticMaterialDeletion(
            material.id
          );
          const deletion = (async () => {
            try {
              await offlineVectorIndex.deleteMaterial(material.id);
              await new MaterialRepository(db).delete(material.id);
              try {
                const file = new File(material.localUri);
                if (file.exists) {
                  file.delete();
                }
              } catch (fileError) {
                console.warn(
                  'Deleted material file cleanup will be retried on launch.',
                  fileError
                );
              }
              endOptimisticMaterialDeletion(material.id);
              await refreshLearningOverview();
            } catch (caught) {
              if (optimisticSnapshot) {
                restoreOptimisticMaterialDeletion(optimisticSnapshot);
              } else {
                endOptimisticMaterialDeletion(material.id);
              }
              await refreshLearningOverview();
              throw caught;
            } finally {
              deletingIdsRef.current.delete(material.id);
            }
          })();

          toast.promise(deletion, {
            loading: `Deleting “${material.title}”…`,
            success: () => 'Material deleted',
            error: () =>
              'Material could not be deleted. It has been restored.',
          });
        },
        title: 'Delete this material?',
      });
    },
    [db]
  );
}
