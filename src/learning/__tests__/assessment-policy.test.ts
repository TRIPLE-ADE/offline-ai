import {
  recommendForScore,
  scoreQuiz,
} from '@/learning/assessment-policy';
import type { QuizArtifact } from '@/learning/schemas';

const quiz: QuizArtifact = {
  schemaVersion: 1,
  questions: Array.from({ length: 5 }, (_, index) => ({
    question: `Grounded question number ${index + 1}?`,
    options: ['A', 'B', 'C', 'D'],
    correctOptionIndex: index % 4,
    explanation: 'The stored material supports this answer.',
    sourceLabel: 'Source passage 1',
    concept: `Concept ${index + 1}`,
  })),
  citations: [
    {
      chunkId: 'chunk-1',
      label: 'Source passage 1',
      excerpt: 'Grounded source excerpt.',
      pageStart: null,
      pageEnd: null,
    },
  ],
};

describe('deterministic assessment policy', () => {
  it('scores without model inference', () => {
    expect(scoreQuiz(quiz, [0, 1, 2, 0, 0])).toBe(80);
  });

  it.each([
    [49, 'review_topic', 'needs_review'],
    [50, 'review_and_retry', 'needs_review'],
    [79, 'review_and_retry', 'needs_review'],
    [80, 'continue', 'completed'],
  ] as const)(
    'applies the threshold at %i',
    (score, action, topicStatus) => {
      const recommendation = recommendForScore(score);
      expect(recommendation.action).toBe(action);
      expect(recommendation.topicStatus).toBe(topicStatus);
      expect(recommendation.reason).toContain(`${score}%`);
    }
  );
});
