import { z } from 'zod';

export const topicDraftSchema = z.object({
  title: z.string().trim().min(2).max(100),
  summary: z.string().trim().min(8).max(320),
  sourceChunkIds: z.array(z.string().trim().min(1)).min(1),
});

export const topicRoadmapSchema = z.object({
  topics: z.array(topicDraftSchema).min(1).max(24),
});

export const modelLessonSchema = z.object({
  objective: z.string().trim().min(8),
  explanation: z.string().trim().min(40),
  example: z.string().trim().min(20),
  keyPoints: z.array(z.string().trim().min(4)).min(3).max(7),
  commonMistake: z.string().trim().min(12),
  quickChecks: z
    .array(
      z.object({
        question: z.string().trim().min(8),
        answer: z.string().trim().min(2),
      })
    )
    .length(3),
  sourceLabels: z.array(z.string().trim().min(1)).min(1),
});

export const storedCitationSchema = z.object({
  chunkId: z.string(),
  label: z.string(),
  excerpt: z.string(),
  pageStart: z.number().nullable(),
  pageEnd: z.number().nullable(),
});

export const lessonArtifactSchema = modelLessonSchema.extend({
  schemaVersion: z.literal(1),
  citations: z.array(storedCitationSchema).min(1),
});

export const quizQuestionSchema = z
  .object({
    question: z.string().trim().min(8),
    options: z.array(z.string().trim().min(1)).length(4),
    correctOptionIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().min(8),
    sourceLabel: z.string().trim().min(1),
    concept: z.string().trim().min(2).max(100),
  })
  .refine(
    (question) =>
      new Set(question.options.map((option) => option.toLowerCase())).size === 4,
    { message: 'Every question must contain four distinct options.' }
  );

export const modelQuizSchema = z.object({
  questions: z.array(quizQuestionSchema).length(5),
});

export const quizArtifactSchema = modelQuizSchema.extend({
  schemaVersion: z.literal(1),
  citations: z.array(storedCitationSchema).min(1),
});

export type TopicDraft = z.infer<typeof topicDraftSchema>;
export type TopicRoadmap = z.infer<typeof topicRoadmapSchema>;
export type LessonArtifact = z.infer<typeof lessonArtifactSchema>;
export type QuizArtifact = z.infer<typeof quizArtifactSchema>;
