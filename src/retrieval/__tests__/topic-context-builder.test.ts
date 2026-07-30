import type { MaterialChunk } from '@/db/types';
import { buildTopicGroundedContext } from '@/retrieval/topic-context-builder';

function chunk(id: string, ordinal: number): MaterialChunk {
  return {
    id,
    materialId: 'material-1',
    ordinal,
    content: `${id} ${'grounded source text '.repeat(30)}`,
    pageStart: null,
    pageEnd: null,
    sectionTitle: `Section ${ordinal + 1}`,
    contentHash: `hash-${id}`,
    indexedAt: '2026-07-30T00:00:00.000Z',
  };
}

describe('topic source context', () => {
  it('uses the supplied topic chunks without vector similarity filtering', () => {
    const chunks = [chunk('a', 0), chunk('b', 1), chunk('c', 2)];

    const grounded = buildTopicGroundedContext(chunks, 'Normalization');

    expect(grounded.passages.map((passage) => passage.chunkId)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(grounded.context).toContain('[Source 1: Section 1]');
    expect(grounded.context).toContain('[Source 3: Section 3]');
  });

  it('samples long topic spans and enforces the context budget', () => {
    const chunks = Array.from({ length: 8 }, (_, index) =>
      chunk(`chunk-${index}`, index)
    );

    const grounded = buildTopicGroundedContext(chunks, 'Long topic', {
      maxContextCharacters: 1_200,
      maxPassages: 4,
    });

    expect(grounded.passages.map((passage) => passage.chunkId)).toEqual([
      'chunk-0',
      'chunk-2',
      'chunk-4',
      'chunk-7',
    ]);
    expect(
      grounded.passages.reduce(
        (total, passage) => total + passage.content.length,
        0
      )
    ).toBeLessThanOrEqual(1_200);
  });
});
