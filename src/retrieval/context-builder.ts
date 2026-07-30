import {
  selectGroundedPassages,
  type ContextSelectionOptions,
  type GroundedPassage,
} from '@/retrieval/context-selection';
import type { AiOperationLease } from '@/ai/runtime-coordinator';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';

const DEFAULT_CANDIDATE_LIMIT = 8;

export type GroundedContext = {
  query: string;
  context: string;
  passages: GroundedPassage[];
};

type ContextBuilderOptions = ContextSelectionOptions & {
  candidateLimit?: number;
};

export async function buildGroundedContext(
  materialId: string,
  query: string,
  lease: AiOperationLease,
  options: ContextBuilderOptions = {}
): Promise<GroundedContext> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 3) {
    throw new Error('Enter at least three characters to search this material.');
  }

  const candidateLimit = options.candidateLimit ?? DEFAULT_CANDIDATE_LIMIT;
  const candidates = await offlineVectorIndex.queryMaterial(
    materialId,
    normalizedQuery,
    lease,
    candidateLimit
  );
  const passages = selectGroundedPassages(candidates, options);
  const context = passages
    .map(
      (passage, index) =>
        `[Source ${index + 1}: ${passage.sourceLabel}]\n${passage.content}`
    )
    .join('\n\n');

  return {
    query: normalizedQuery,
    context,
    passages,
  };
}

export type { GroundedPassage } from '@/retrieval/context-selection';
