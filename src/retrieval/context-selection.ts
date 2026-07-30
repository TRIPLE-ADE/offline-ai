export type RetrievalCandidate = {
  id: string;
  document?: string;
  similarity: number;
  metadata?: Record<string, unknown>;
};

export type GroundedPassage = {
  chunkId: string;
  ordinal: number;
  content: string;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  similarity: number;
  sourceLabel: string;
};

export type ContextSelectionOptions = {
  maxPassages?: number;
  maxContextCharacters?: number;
  minSimilarity?: number;
};

export const DEFAULT_MAX_PASSAGES = 3;
export const DEFAULT_MAX_CONTEXT_CHARACTERS = 2_400;
const DEFAULT_MIN_SIMILARITY = 0.2;

function optionalNumber(value: unknown) {
  return typeof value === 'number' ? value : null;
}

function passageLabel(
  ordinal: number,
  sectionTitle: string | null,
  pageStart: number | null,
  pageEnd: number | null
) {
  if (pageStart !== null) {
    return pageEnd !== null && pageEnd !== pageStart
      ? `Pages ${pageStart}–${pageEnd}`
      : `Page ${pageStart}`;
  }
  if (sectionTitle) {
    return sectionTitle;
  }
  return `Source passage ${ordinal + 1}`;
}

function mapResult(result: RetrievalCandidate): GroundedPassage {
  const ordinal =
    typeof result.metadata?.ordinal === 'number' ? result.metadata.ordinal : 0;
  const sectionTitle =
    typeof result.metadata?.sectionTitle === 'string'
      ? result.metadata.sectionTitle
      : null;
  const pageStart = optionalNumber(result.metadata?.pageStart);
  const pageEnd = optionalNumber(result.metadata?.pageEnd);

  return {
    chunkId: result.id,
    ordinal,
    content: result.document ?? '',
    sectionTitle,
    pageStart,
    pageEnd,
    similarity: result.similarity,
    sourceLabel: passageLabel(ordinal, sectionTitle, pageStart, pageEnd),
  };
}

function deduplicationKey(result: RetrievalCandidate) {
  if (typeof result.metadata?.contentHash === 'string') {
    return result.metadata.contentHash;
  }
  return (result.document ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function selectGroundedPassages(
  results: RetrievalCandidate[],
  options: ContextSelectionOptions = {}
) {
  const maxPassages = options.maxPassages ?? DEFAULT_MAX_PASSAGES;
  const maxContextCharacters =
    options.maxContextCharacters ?? DEFAULT_MAX_CONTEXT_CHARACTERS;
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const selected: GroundedPassage[] = [];
  const seen = new Set<string>();
  let usedCharacters = 0;

  for (const result of results) {
    if (result.similarity < minSimilarity || !result.document?.trim()) {
      continue;
    }

    const key = deduplicationKey(result);
    if (!key || seen.has(key)) {
      continue;
    }

    const passage = mapResult(result);
    const projectedCharacters = usedCharacters + passage.content.length;
    if (selected.length > 0 && projectedCharacters > maxContextCharacters) {
      continue;
    }

    seen.add(key);
    selected.push(passage);
    usedCharacters = projectedCharacters;

    if (selected.length >= maxPassages) {
      break;
    }
  }

  return selected;
}
