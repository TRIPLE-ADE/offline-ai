import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { ArtifactRepository } from '@/db/repositories/artifact-repository';
import { MaterialChunkRepository } from '@/db/repositories/material-chunk-repository';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { MaterialChunk, Topic } from '@/db/types';
import {
  buildDeterministicTopicDrafts,
  capTopicDrafts,
} from '@/learning/roadmap-fallback';
import { topicRoadmapSchema } from '@/learning/schemas';

const PROMPT_VERSION = 'deterministic-roadmap-v2';
const MODEL_VERSION = 'deterministic';

function createGroundedDrafts(chunks: MaterialChunk[]) {
  return topicRoadmapSchema.parse({
    topics: capTopicDrafts(buildDeterministicTopicDrafts(chunks)),
  }).topics;
}

class TopicRoadmapService {
  async generate(db: SQLiteDatabase, materialId: string): Promise<Topic[]> {
    const materials = new MaterialRepository(db);
    const chunkRepository = new MaterialChunkRepository(db);
    const topicRepository = new TopicRepository(db);
    const artifactRepository = new ArtifactRepository(db);
    const material = await materials.getById(materialId);

    if (
      !material ||
      (material.status !== 'ready' && material.status !== 'generating_topics')
    ) {
      throw new Error('Prepare this material for offline search first.');
    }

    const chunks = await chunkRepository.listForMaterial(materialId);
    if (chunks.length === 0) {
      throw new Error('This material has no stored source passages.');
    }

    try {
      await materials.updateStatus(
        materialId,
        'generating_topics',
        'Organizing the stored source passages into a learning roadmap…'
      );

      // Roadmap structure is deliberately deterministic. Running the local LLM
      // once per chunk group plus a consolidation pass caused long Vulkan
      // workloads, thermal throttling, and a coordinator lease that could
      // remain occupied when native generation failed to settle.
      const drafts = createGroundedDrafts(chunks);
      const topics = drafts.map((draft, position) => ({
        id: Crypto.randomUUID(),
        materialId,
        position,
        title: draft.title,
        summary: draft.summary,
        sourceChunkIds: draft.sourceChunkIds,
      }));

      await topicRepository.replaceForMaterial(materialId, topics);
      await artifactRepository.create({
        materialId,
        kind: 'topic_map',
        payload: {
          schemaVersion: 1,
          topics: drafts,
          coveredChunkCount: new Set(
            drafts.flatMap((topic) => topic.sourceChunkIds)
          ).size,
        },
        promptVersion: PROMPT_VERSION,
        modelVersion: MODEL_VERSION,
      });
      await materials.updateStatus(
        materialId,
        'ready',
        `Roadmap ready with ${topics.length} grounded topics.`
      );
      return topicRepository.listForMaterial(materialId);
    } catch (error) {
      try {
        await materials.updateStatus(
          materialId,
          'ready',
          'Roadmap creation was interrupted. Your offline search remains ready.'
        );
      } catch {
        // Preserve the original error if database recovery also fails.
      }
      throw error;
    }
  }
}

export const topicRoadmapService = new TopicRoadmapService();
