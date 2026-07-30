import type { MaterialChunk } from '@/db/types';
import type { GroundedContext } from '@/retrieval/context-builder';
import type { GroundedPassage } from '@/retrieval/context-selection';

const DEFAULT_MAX_PASSAGES = 4;
const DEFAULT_MAX_CONTEXT_CHARACTERS = 3_200;

type TopicContextOptions = {
  maxPassages?: number;
  maxContextCharacters?: number;
};

function sourceLabel(chunk: MaterialChunk) {
  if (chunk.pageStart !== null) {
    return chunk.pageEnd !== null && chunk.pageEnd !== chunk.pageStart
      ? `Pages ${chunk.pageStart}–${chunk.pageEnd}`
      : `Page ${chunk.pageStart}`;
  }
  return chunk.sectionTitle || `Source passage ${chunk.ordinal + 1}`;
}

function sampleEvenly(chunks: MaterialChunk[], maximum: number) {
  if (chunks.length <= maximum) {
    return chunks;
  }
  if (maximum === 1) {
    return [chunks[0]];
  }

  const selected = Array.from({ length: maximum }, (_, index) => {
    const sourceIndex = Math.floor(
      (index * (chunks.length - 1)) / (maximum - 1)
    );
    return chunks[sourceIndex];
  });
  return [...new Map(selected.map((chunk) => [chunk.id, chunk])).values()];
}

function truncateAtWord(content: string, maximum: number) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximum) {
    return normalized;
  }

  const shortened = normalized.slice(0, maximum);
  const lastWhitespace = shortened.lastIndexOf(' ');
  return shortened
    .slice(0, lastWhitespace > maximum * 0.7 ? lastWhitespace : maximum)
    .trim();
}

export function buildTopicGroundedContext(
  chunks: MaterialChunk[],
  query: string,
  options: TopicContextOptions = {}
): GroundedContext {
  const maxPassages = Math.max(
    1,
    options.maxPassages ?? DEFAULT_MAX_PASSAGES
  );
  const maxContextCharacters = Math.max(
    400,
    options.maxContextCharacters ?? DEFAULT_MAX_CONTEXT_CHARACTERS
  );
  const selected = sampleEvenly(chunks, maxPassages);
  const passages: GroundedPassage[] = [];
  let usedCharacters = 0;

  for (const [index, chunk] of selected.entries()) {
    const remainingPassages = selected.length - index;
    const remainingBudget = maxContextCharacters - usedCharacters;
    const passageBudget = Math.max(
      1,
      Math.floor(remainingBudget / remainingPassages)
    );
    const content = truncateAtWord(chunk.content, passageBudget);
    usedCharacters += content.length;
    passages.push({
      chunkId: chunk.id,
      ordinal: chunk.ordinal,
      content,
      sectionTitle: chunk.sectionTitle,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      similarity: 1,
      sourceLabel: sourceLabel(chunk),
    });
  }

  return {
    query,
    passages,
    context: passages
      .map(
        (passage, index) =>
          `[Source ${index + 1}: ${passage.sourceLabel}]\n${passage.content}`
      )
      .join('\n\n'),
  };
}
