import type { MaterialChunk } from '@/db/types';
import { buildDeterministicTopicDrafts } from '@/learning/roadmap-fallback';
import { topicRoadmapSchema } from '@/learning/schemas';

function chunk(
  id: string,
  ordinal: number,
  sectionTitle: string | null
): MaterialChunk {
  return {
    id,
    materialId: 'material-1',
    ordinal,
    content: `Source content for ${id}. It contains a grounded explanation.`,
    pageStart: null,
    pageEnd: null,
    sectionTitle,
    contentHash: `hash-${id}`,
    indexedAt: '2026-07-26T00:00:00.000Z',
  };
}

describe('deterministic roadmap fallback', () => {
  it('covers every stored source chunk exactly once', () => {
    const chunks = [
      chunk('a', 0, 'Introduction'),
      chunk('b', 1, 'Introduction'),
      chunk('c', 2, 'Second Normal Form'),
      chunk('d', 3, 'Second Normal Form'),
      chunk('e', 4, 'Third Normal Form'),
    ];

    const topics = buildDeterministicTopicDrafts(chunks);
    const sourceIds = topics.flatMap((topic) => topic.sourceChunkIds);

    expect(sourceIds).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(new Set(sourceIds).size).toBe(chunks.length);
    expect(topicRoadmapSchema.safeParse({ topics }).success).toBe(true);
  });

  it('rejects malformed generated roadmap data', () => {
    expect(
      topicRoadmapSchema.safeParse({
        topics: [{ title: 'Missing sources', summary: 'A valid-looking summary.' }],
      }).success
    ).toBe(false);
  });
});
