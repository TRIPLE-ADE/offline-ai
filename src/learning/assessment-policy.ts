import type { TopicStatus } from '@/db/types';
import type { QuizArtifact } from '@/learning/schemas';

export type NextRecommendation = {
  action: 'review_topic' | 'review_and_retry' | 'continue';
  title: string;
  reason: string;
  topicStatus: TopicStatus;
};

export function scoreQuiz(quiz: QuizArtifact, answers: number[]) {
  const correct = quiz.questions.reduce(
    (count, question, index) =>
      count + (answers[index] === question.correctOptionIndex ? 1 : 0),
    0
  );
  return Math.round((correct / quiz.questions.length) * 100);
}

export function recommendForScore(score: number): NextRecommendation {
  if (score < 50) {
    return {
      action: 'review_topic',
      title: 'Review this topic',
      reason: `Your score was ${score}%. Revisit the lesson before trying again.`,
      topicStatus: 'needs_review',
    };
  }
  if (score < 80) {
    return {
      action: 'review_and_retry',
      title: 'Review missed concepts and retry',
      reason: `Your score was ${score}%. Check the grounded explanations for the questions you missed.`,
      topicStatus: 'needs_review',
    };
  }
  return {
    action: 'continue',
    title: 'Continue to the next topic',
    reason: `Your score was ${score}%. You demonstrated a strong grasp of this topic.`,
    topicStatus: 'completed',
  };
}
