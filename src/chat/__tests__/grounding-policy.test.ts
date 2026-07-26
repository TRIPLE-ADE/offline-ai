import {
  buildNextMessages,
  shouldRefuseQuestion,
} from '@/chat/grounding-policy';
import type { ChatMessage } from '@/db/types';
import type { GroundedPassage } from '@/retrieval/context-builder';

const passage: GroundedPassage = {
  chunkId: 'chunk-1',
  ordinal: 0,
  content:
    'Second Normal Form removes a partial dependency on part of a composite key.',
  sectionTitle: 'Second Normal Form',
  pageStart: null,
  pageEnd: null,
  similarity: 0.41,
  sourceLabel: 'Second Normal Form',
};

function message(
  id: string,
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role,
    content,
    citations: [],
    status: 'complete',
    createdAt: '2026-07-26T00:00:00.000Z',
  };
}

describe('material chat grounding policy', () => {
  it('includes the current question exactly once and keeps four prior turns', () => {
    const prior = [
      message('1', 'user', 'first'),
      message('2', 'assistant', 'second'),
      message('3', 'user', 'third'),
      message('4', 'assistant', 'fourth'),
      message('5', 'user', 'fifth'),
    ];
    const currentQuestion = 'What does Second Normal Form add?';
    const next = buildNextMessages(prior, currentQuestion, '[Source 1]\nText');

    expect(next).toHaveLength(6);
    expect(next.filter((item) => item.content === currentQuestion)).toHaveLength(1);
    expect(next.at(-1)).toEqual({ role: 'user', content: currentQuestion });
    expect(next.some((item) => item.content === 'first')).toBe(false);
  });

  it('accepts a source-supported question', () => {
    expect(
      shouldRefuseQuestion('What is a partial dependency?', [passage])
    ).toBe(false);
  });

  it('refuses an unrelated low-evidence question', () => {
    expect(
      shouldRefuseQuestion('Who invented the telephone?', [passage])
    ).toBe(true);
  });
});
