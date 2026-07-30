import {
  buildGroundedContext,
  type GroundedPassage,
} from '@/retrieval/context-builder';
import type { AiOperationLease } from '@/ai/runtime-coordinator';

export type { GroundedPassage } from '@/retrieval/context-builder';

export async function retrieveGroundedPassages(
  materialId: string,
  query: string,
  lease: AiOperationLease,
  limit = 4
): Promise<GroundedPassage[]> {
  const result = await buildGroundedContext(materialId, query, lease, {
    maxPassages: limit,
  });
  return result.passages;
}
