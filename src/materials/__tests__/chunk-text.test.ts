import { chunkText, DEFAULT_MAX_CHUNK_CHARACTERS } from '@/materials/chunk-text';

declare const __dirname: string;

type ExpectedResults = {
  expectedTopics: string[];
  answerableQuestions: {
    expectedTerms: string[];
    expectedSection: string;
  }[];
};

const { readFileSync } = jest.requireActual('node:fs') as {
  readFileSync(path: string, encoding: 'utf8'): string;
};
const { resolve } = jest.requireActual('node:path') as {
  resolve(...segments: string[]): string;
};

const projectRoot = resolve(__dirname, '../../..');
const fixtureText = readFileSync(
  resolve(projectRoot, 'fixtures/demo/database-normalization.txt'),
  'utf8'
);
const expectedResults = JSON.parse(
  readFileSync(resolve(projectRoot, 'fixtures/demo/expected-results.json'), 'utf8')
) as ExpectedResults;

describe('chunkText', () => {
  it('produces deterministic, bounded passages from the Stage 0 fixture', () => {
    const first = chunkText(fixtureText);
    const second = chunkText(fixtureText);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(5);
    expect(first.every((chunk) => chunk.content.length <= DEFAULT_MAX_CHUNK_CHARACTERS)).toBe(
      true
    );
    expect(first.map((chunk) => chunk.ordinal)).toEqual(
      first.map((_, index) => index)
    );
  });

  it('preserves the expected evidence and its section provenance', () => {
    const chunks = chunkText(fixtureText);

    for (const answer of expectedResults.answerableQuestions) {
      const sectionChunks = chunks.filter(
        (chunk) => chunk.sectionTitle === answer.expectedSection
      );
      const sectionText = sectionChunks.map((chunk) => chunk.content).join('\n');

      expect(sectionChunks.length).toBeGreaterThan(0);
      for (const term of answer.expectedTerms) {
        expect(sectionText.toLowerCase()).toContain(term.toLowerCase());
      }
    }
  });

  it('returns no passages for blank input', () => {
    expect(chunkText(' \n\n ')).toEqual([]);
  });
});
