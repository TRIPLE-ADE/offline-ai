import type { StoredCitation } from '@/db/types';
import type { GroundedPassage } from '@/retrieval/context-builder';

function sourceNumber(label: string) {
  const match = label.match(/source\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export function passageToCitation(passage: GroundedPassage): StoredCitation {
  return {
    chunkId: passage.chunkId,
    label: passage.sourceLabel,
    excerpt: passage.content,
    pageStart: passage.pageStart,
    pageEnd: passage.pageEnd,
  };
}

export function resolveCitations(
  labels: string[],
  passages: GroundedPassage[]
): StoredCitation[] {
  const resolved = new Map<string, StoredCitation>();

  for (const label of labels) {
    const number = sourceNumber(label);
    const passage =
      number !== null
        ? passages[number - 1]
        : passages.find(
            (candidate) =>
              candidate.sourceLabel.toLowerCase() === label.toLowerCase()
          );
    if (passage) {
      resolved.set(passage.chunkId, passageToCitation(passage));
    }
  }

  return [...resolved.values()];
}

export function citationsMentionedInAnswer(
  answer: string,
  passages: GroundedPassage[]
) {
  const labels = [...answer.matchAll(/\[Source\s+(\d+)\]/gi)].map(
    (match) => `Source ${match[1]}`
  );
  const resolved = resolveCitations(labels, passages);
  return resolved.length > 0
    ? resolved
    : passages.map(passageToCitation);
}
