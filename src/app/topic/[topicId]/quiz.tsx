import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { generationRuntime } from '@/ai/generation-runtime';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import type { NextRecommendation } from '@/learning/assessment-policy';
import type { QuizArtifact } from '@/learning/schemas';
import { quizService } from '@/learning/quiz-service';
import { useRuntimeStore } from '@/stores/runtime-store';

type Result = {
  score: number;
  recommendation: NextRecommendation;
};

export default function TopicQuizScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const generation = useRuntimeStore((state) => state.generation);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [quiz, setQuiz] = useState<QuizArtifact | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const nextTopic = await new TopicRepository(db).getById(topicId);
    const cachedQuiz = await quizService.getCached(db, topicId);
    setTopic(nextTopic);
    setQuiz(cachedQuiz);
    if (cachedQuiz) {
      setAnswers((current) =>
        current.length === cachedQuiz.questions.length
          ? current
          : Array(cachedQuiz.questions.length).fill(-1)
      );
    }
  }, [db, topicId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleGenerate = async () => {
    setError(null);
    setResult(null);
    setIsGenerating(true);
    try {
      const generated = await quizService.generate(db, topicId);
      setQuiz(generated);
      setAnswers(Array(generated.questions.length).fill(-1));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to generate this quiz.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    if (result) {
      return;
    }
    setAnswers((current) => {
      const next = [...current];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quiz) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      setResult(await quizService.submit(db, topicId, quiz, answers));
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to save this attempt.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!topic) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color="#4A50CE" />
        <ThemedText themeColor="textSecondary">Loading knowledge check…</ThemedText>
      </ThemedView>
    );
  }

  const allAnswered =
    quiz !== null &&
    answers.length === quiz.questions.length &&
    answers.every((answer) => answer >= 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow="Grounded assessment"
          title={topic.title}
          subtitle="Five questions generated from this topic’s retrieved source passages. Scoring is deterministic and works offline."
        />

        {!quiz ? (
          <ThemedView type="backgroundElement" style={styles.generateCard}>
            <Ionicons name="help-circle-outline" color="#4A50CE" size={34} />
            <ThemedText type="subtitle" style={styles.compactTitle}>
              Check what you understand
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Every published question must contain four options, one correct answer, a
              grounded explanation, and a stored source reference.
            </ThemedText>
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            ) : null}
            <PrimaryButton
              disabled={isGenerating}
              label={
                isGenerating
                  ? generation.phase === 'downloading'
                    ? `Downloading Gemma · ${Math.round(generation.progress * 100)}%`
                    : 'Generating five questions…'
                  : 'Generate knowledge check'
              }
              leading={
                isGenerating ? <ActivityIndicator color="#FFFFFF" /> : undefined
              }
              onPress={() => void handleGenerate()}
            />
            {isGenerating && generation.phase === 'generating' ? (
              <PrimaryButton
                label="Stop generation"
                onPress={() => generationRuntime.interrupt()}
                variant="secondary"
              />
            ) : null}
          </ThemedView>
        ) : (
          <>
            {quiz.questions.map((question, questionIndex) => (
              <View key={`${questionIndex}-${question.question}`} style={styles.question}>
                <ThemedText type="smallBold" style={styles.questionNumber}>
                  QUESTION {questionIndex + 1} OF {quiz.questions.length}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.questionTitle}>
                  {question.question}
                </ThemedText>
                <View style={styles.options}>
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[questionIndex] === optionIndex;
                    const correct =
                      result && question.correctOptionIndex === optionIndex;
                    const incorrect =
                      result && selected && !correct;
                    return (
                      <Pressable
                        key={`${optionIndex}-${option}`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => selectAnswer(questionIndex, optionIndex)}
                        style={[
                          styles.option,
                          {
                            backgroundColor: selected
                              ? theme.backgroundSelected
                              : theme.backgroundElement,
                            borderColor: correct
                              ? '#2D8A55'
                              : incorrect
                                ? '#B94848'
                                : selected
                                  ? '#4A50CE'
                                  : 'transparent',
                          },
                        ]}>
                        <View
                          style={[
                            styles.optionLetter,
                            {
                              backgroundColor: selected
                                ? '#4A50CE'
                                : theme.backgroundSelected,
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={selected ? styles.selectedLetter : undefined}>
                            {String.fromCharCode(65 + optionIndex)}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.flex}>{option}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                {result ? (
                  <ThemedView type="backgroundElement" style={styles.explanation}>
                    <ThemedText type="smallBold">
                      {answers[questionIndex] === question.correctOptionIndex
                        ? 'Correct'
                        : `Review: ${question.concept}`}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {question.explanation}
                    </ThemedText>
                    <ThemedText type="smallBold" style={styles.sourceLabel}>
                      {question.sourceLabel}
                    </ThemedText>
                  </ThemedView>
                ) : null}
              </View>
            ))}

            {!result ? (
              <PrimaryButton
                disabled={!allAnswered || isSubmitting}
                label={isSubmitting ? 'Saving attempt…' : 'Submit answers'}
                onPress={() => void handleSubmit()}
              />
            ) : (
              <ThemedView type="backgroundElement" style={styles.resultCard}>
                <ThemedText type="smallBold" style={styles.questionNumber}>
                  YOUR RESULT
                </ThemedText>
                <ThemedText type="title" style={styles.score}>
                  {result.score}%
                </ThemedText>
                <ThemedText type="subtitle" style={styles.recommendationTitle}>
                  {result.recommendation.title}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {result.recommendation.reason}
                </ThemedText>
                <PrimaryButton
                  label={
                    result.recommendation.action === 'continue'
                      ? 'Back to learning roadmap'
                      : 'Review grounded lesson'
                  }
                  onPress={() =>
                    result.recommendation.action === 'continue'
                      ? router.replace({
                          pathname: '/material/[materialId]',
                          params: { materialId: topic.materialId },
                        })
                      : router.back()
                  }
                />
                <PrimaryButton
                  label="Try another five questions"
                  onPress={() => void handleGenerate()}
                  variant="secondary"
                />
              </ThemedView>
            )}

            {error ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.horizontal}>
                {error}
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
  },
  generateCard: {
    borderRadius: 22,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  compactTitle: { fontSize: 25, lineHeight: 31 },
  question: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  questionNumber: {
    color: '#4A50CE',
    letterSpacing: 1,
  },
  questionTitle: { fontSize: 23, lineHeight: 30 },
  options: { gap: Spacing.two },
  option: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  optionLetter: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  selectedLetter: { color: '#FFFFFF' },
  flex: { flex: 1 },
  explanation: {
    borderRadius: 16,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  sourceLabel: { color: '#4A50CE' },
  resultCard: {
    borderRadius: 22,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  score: { fontSize: 52, lineHeight: 58 },
  recommendationTitle: { fontSize: 24, lineHeight: 30 },
  horizontal: { marginHorizontal: Spacing.four },
});
