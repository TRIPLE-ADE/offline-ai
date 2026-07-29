import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import { models, ResourceFetcherUtils } from 'react-native-executorch';

import {
  completeModelInstallationVerification,
  reconcileModelInstallationState,
} from '@/ai/model-installation-state';
import { hasEveryDownloadedResource } from '@/ai/offline-resource-files';
import { useRuntimeStore } from '@/stores/runtime-store';

type ResourceGroups = {
  embedding: string[];
  generation: string[];
};

export function getOfflineResourceGroups(): ResourceGroups {
  const embedding = models.text_embedding.all_minilm_l6_v2();
  const generation = models.llm.gemma4_e2b();

  return {
    embedding: [embedding.modelSource, embedding.tokenizerSource],
    generation: [
      generation.modelSource,
      generation.tokenizerSource,
      generation.tokenizerConfigSource,
    ],
  };
}

export async function inspectOfflineResources() {
  const groups = getOfflineResourceGroups();
  let downloaded: string[] = [];

  try {
    downloaded = await ExpoResourceFetcher.listDownloadedFiles();
  } catch {
    // The resource directory is created lazily on the first download.
  }

  const embeddingInstalled = hasEveryDownloadedResource(
    downloaded,
    groups.embedding,
    ResourceFetcherUtils.getFilenameFromUri
  );
  const generationInstalled = hasEveryDownloadedResource(
    downloaded,
    groups.generation,
    ResourceFetcherUtils.getFilenameFromUri
  );

  const store = useRuntimeStore.getState();
  if (embeddingInstalled && store.embedding.phase !== 'ready') {
    store.setEmbedding({ phase: 'downloaded', progress: 1, error: null });
  } else if (!embeddingInstalled && store.embedding.phase === 'downloaded') {
    store.setEmbedding({
      phase: 'not_downloaded',
      progress: 0,
      error: null,
    });
  }
  if (generationInstalled && store.generation.phase !== 'ready') {
    store.setGeneration({ phase: 'downloaded', progress: 1, error: null });
  } else if (!generationInstalled && store.generation.phase === 'downloaded') {
    store.setGeneration({
      phase: 'not_downloaded',
      progress: 0,
      error: null,
    });
  }

  const installation = reconcileModelInstallationState(
    embeddingInstalled && generationInstalled
  );
  completeModelInstallationVerification();

  return { embeddingInstalled, generationInstalled, installation };
}

export async function getOfflineResourceSizes() {
  const groups = getOfflineResourceGroups();
  const [embedding, generation] = await Promise.all([
    ExpoResourceFetcher.getFilesTotalSize(...groups.embedding),
    ExpoResourceFetcher.getFilesTotalSize(...groups.generation),
  ]);

  return { embedding, generation, total: embedding + generation };
}
