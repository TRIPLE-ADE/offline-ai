import {
  DEFAULT_MAX_CONTEXT_CHARACTERS,
  DEFAULT_MAX_PASSAGES,
  selectGroundedPassages,
  type RetrievalCandidate,
} from '@/retrieval/context-selection';

function result(
  id: string,
  document: string,
  similarity: number,
  contentHash = id
): RetrievalCandidate {
  return {
    id,
    document,
    metadata: {
      contentHash,
      materialId: 'material-a',
      ordinal: Number(id.replace(/\D/g, '')) || 0,
    },
    similarity,
  };
}

describe('selectGroundedPassages', () => {
  it('filters weak matches and removes duplicate source content', () => {
    const selected = selectGroundedPassages(
      [
        result('chunk-1', 'First useful passage.', 0.81, 'same-content'),
        result('chunk-2', 'Duplicated passage.', 0.79, 'same-content'),
        result('chunk-3', 'Weak passage.', 0.1),
        result('chunk-4', 'Second useful passage.', 0.72),
      ],
      { minSimilarity: 0.2 }
    );

    expect(selected.map((passage) => passage.chunkId)).toEqual([
      'chunk-1',
      'chunk-4',
    ]);
  });

  it('enforces passage and context budgets', () => {
    const selected = selectGroundedPassages(
      [
        result('chunk-1', 'a'.repeat(100), 0.9),
        result('chunk-2', 'b'.repeat(100), 0.8),
        result('chunk-3', 'c'.repeat(100), 0.7),
      ],
      {
        maxContextCharacters: 210,
        maxPassages: 2,
      }
    );

    expect(selected).toHaveLength(2);
    expect(selected.map((passage) => passage.chunkId)).toEqual([
      'chunk-1',
      'chunk-2',
    ]);
  });

  it('uses a bounded default context suitable for the local model', () => {
    const selected = selectGroundedPassages(
      Array.from({ length: 5 }, (_, index) =>
        result(
          `chunk-${index + 1}`,
          String.fromCharCode(97 + index).repeat(900),
          0.9 - index * 0.05
        )
      )
    );

    expect(selected).toHaveLength(DEFAULT_MAX_PASSAGES - 1);
    expect(
      selected.reduce(
        (total, passage) => total + passage.content.length,
        0
      )
    ).toBeLessThanOrEqual(DEFAULT_MAX_CONTEXT_CHARACTERS);
  });
});
