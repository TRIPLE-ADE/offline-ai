import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import { models } from 'react-native-executorch';

import { useRuntimeStore } from '@/stores/runtime-store';

type ResourceGroups = {
  embedding: string[];
  generation: string[];
};

function filename(source: string) {
  return source.split('/').pop()?.split('?')[0] ?? source;
}

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

  const downloadedNames = new Set(downloaded.map(filename));
  const hasEveryResource = (sources: string[]) =>
    sources.every((source) => downloadedNames.has(filename(source)));
  const embeddingInstalled = hasEveryResource(groups.embedding);
  const generationInstalled = hasEveryResource(groups.generation);

  const store = useRuntimeStore.getState();
  if (embeddingInstalled && store.embedding.phase !== 'ready') {
    store.setEmbedding({ phase: 'downloaded', progress: 1, error: null });
  }
  if (generationInstalled && store.generation.phase !== 'ready') {
    store.setGeneration({ phase: 'downloaded', progress: 1, error: null });
  }

  return { embeddingInstalled, generationInstalled };
}

export async function getOfflineResourceSizes() {
  const groups = getOfflineResourceGroups();
  const [embedding, generation] = await Promise.all([
    ExpoResourceFetcher.getFilesTotalSize(...groups.embedding),
    ExpoResourceFetcher.getFilesTotalSize(...groups.generation),
  ]);

  return { embedding, generation, total: embedding + generation };
}
