import {
  buildGroundedContext,
  type GroundedPassage,
} from '@/retrieval/context-builder';

export type { GroundedPassage } from '@/retrieval/context-builder';

export async function retrieveGroundedPassages(
  materialId: string,
  query: string,
  limit = 4
): Promise<GroundedPassage[]> {
  const result = await buildGroundedContext(materialId, query, {
    maxPassages: limit,
  });
  return result.passages;
}
