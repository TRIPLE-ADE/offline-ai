import { Directory, Paths } from 'expo-file-system';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import { models, ResourceFetcherUtils } from 'react-native-executorch';

import {
  beginModelResourceVerification,
  completeModelResourceVerification,
  failModelResourceVerification,
} from '@/ai/model-installation-state';
import { hasEveryDownloadedResource } from '@/ai/offline-resource-files';

type ResourceGroups = {
  embedding: string[];
  generation: string[];
};

export type OfflineResourceInspection = {
  embeddingInstalled: boolean;
  generationInstalled: boolean;
};

const RESOURCE_DIRECTORY_NAME = 'react-native-executorch';
const RESOURCE_INSPECTION_ERROR =
  'LearnGuide could not check the offline AI resources on this device.';

let inspectionPromise: Promise<OfflineResourceInspection> | null = null;

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

async function listDownloadedResources() {
  const directory = new Directory(Paths.document, RESOURCE_DIRECTORY_NAME);
  if (!directory.exists) {
    return [];
  }
  return ExpoResourceFetcher.listDownloadedFiles();
}

async function performOfflineResourceInspection() {
  const groups = getOfflineResourceGroups();
  const downloaded = await listDownloadedResources();

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

  completeModelResourceVerification(
    embeddingInstalled && generationInstalled
  );

  return { embeddingInstalled, generationInstalled };
}

export function inspectOfflineResources() {
  if (inspectionPromise) {
    return inspectionPromise;
  }

  beginModelResourceVerification();
  const work = performOfflineResourceInspection()
    .catch((error: unknown) => {
      const message =
        error instanceof Error && error.message
          ? `${RESOURCE_INSPECTION_ERROR} ${error.message}`
          : RESOURCE_INSPECTION_ERROR;
      failModelResourceVerification(message);
      throw error;
    })
    .finally(() => {
      if (inspectionPromise === work) {
        inspectionPromise = null;
      }
    });

  inspectionPromise = work;
  return work;
}

export async function getOfflineResourceSizes() {
  const groups = getOfflineResourceGroups();
  const [embedding, generation] = await Promise.all([
    ExpoResourceFetcher.getFilesTotalSize(...groups.embedding),
    ExpoResourceFetcher.getFilesTotalSize(...groups.generation),
  ]);

  return { embedding, generation, total: embedding + generation };
}
