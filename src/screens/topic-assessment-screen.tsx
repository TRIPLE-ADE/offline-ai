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
import { SafeAreaView } from 'react-native-safe-area-context';

import { generationRuntime } from '@/ai/generation-runtime';
import { AssessmentOption } from '@/components/foundation/assessment-option';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ResultsSummary } from '@/components/foundation/results-summary';
import { StatePanel } from '@/components/foundation/state-panel';
import { SourcePreviewSheet } from '@/components/foundation/source-preview-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { StoredCitation, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useLearningFeatureAccess } from '@/hooks/use-learning-feature-access';
import type { NextRecommendation } from '@/learning/assessment-policy';
import type { QuizArtifact } from '@/learning/schemas';
import { quizService } from '@/learning/quiz-service';
import {
  showActionSheet,
  useAppOverlayStore,
} from '@/stores/app-overlay-store';
import { useRuntimeStore } from '@/stores/runtime-store';
import { userFacingError } from '@/utils/user-facing-error';

type Result = { score: number; recommendation: NextRecommendation };

type RouteOrigin = 'home' | 'material' | 'progress' | 'study';

export default function TopicQuizScreen() {
  const { origin, topicId } = useLocalSearchParams<{
    origin?: RouteOrigin;
    topicId: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const openImportMaterial = useAppOverlayStore((state) => state.openImportMaterial);
  const { ensureAccess } = useLearningFeatureAccess();
  const generation = useRuntimeStore((state) => state.generation);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loadedTopicId, setLoadedTopicId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizArtifact | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<StoredCitation | null>(null);

  const load = useCallback(async () => {
    const nextTopic = await new TopicRepository(db).getById(topicId);
    const cached = await quizService.getCached(db, topicId);
    setTopic(nextTopic);
    setLoadedTopicId(topicId);
    setQuiz(cached);
    if (cached) {
      setAnswers((value) =>
        value.length === cached.questions.length ? value : Array(cached.questions.length).fill(-1)
      );
    }
  }, [db, topicId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  const generate = async () => {
    if (!ensureAccess({ hasMaterial: Boolean(topic) })) {
      return;
    }
    setError(null);
    setResult(null);
    setCurrentIndex(0);
    setIsGenerating(true);
    try {
      const generated = await quizService.generate(db, topicId);
      setQuiz(generated);
      setAnswers(Array(generated.questions.length).fill(-1));
    } catch (caught) {
      setError(userFacingError(caught, 'The knowledge check could not be prepared. Retry when you are ready.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const select = (option: number) => {
    setAnswers((value) => {
      const next = [...value];
      next[currentIndex] = option;
      return next;
    });
  };

  const submit = async () => {
    if (!quiz) return;
    setError(null);
    setIsSubmitting(true);
    try {
      setResult(await quizService.submit(db, topicId, quiz, answers));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your answers could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSubmit = () =>
    showActionSheet({
      actionLabel: 'Submit answers',
      cancelLabel: 'Keep reviewing',
      description:
        'You can review every answer and its supporting source after submission.',
      onAction: () => void submit(),
      title: 'Submit your answers?',
    });

  const exit = () => {
    const hasAnswers = answers.some((answer) => answer >= 0) && !result;
    if (!hasAnswers) {
      router.back();
      return;
    }
    showActionSheet({
      actionLabel: 'Leave check',
      cancelLabel: 'Keep answering',
      description: 'Your selected answers are kept while this app remains open.',
      destructive: true,
      onAction: () => router.back(),
      title: 'Leave this knowledge check?',
    });
  };

  const continueAfterAssessment = () => {
    if (!topic) return;
    if (origin === 'study') {
      router.replace('/study');
      return;
    }
    if (origin === 'progress') {
      router.replace('/progress');
      return;
    }
    router.replace({
      pathname: '/material/[materialId]',
      params: { materialId: topic.materialId },
    });
  };

  if (loadedTopicId !== topicId) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText themeColor="textSecondary">Opening knowledge check…</ThemedText>
      </ThemedView>
    );
  }

  if (!topic) {
    return (
      <ThemedView style={styles.missingMaterial}>
        <StatePanel
          actionLabel="Import material"
          body="Knowledge checks need a PDF or TXT source so every question and answer can be verified."
          icon="document-text-outline"
          onAction={openImportMaterial}
          secondaryLabel="Go Home"
          onSecondary={() => router.replace('/home')}
          title="Import a file to create a quiz"
        />
      </ThemedView>
    );
  }

  const allAnswered = quiz !== null && answers.every((answer) => answer >= 0);
  const question = quiz?.questions[currentIndex];
  const correct = result && quiz
    ? quiz.questions.filter((item, index) => answers[index] === item.correctOptionIndex).length
    : 0;
  const weakConcepts = result && quiz
    ? [...new Set(quiz.questions.filter((item, index) => answers[index] !== item.correctOptionIndex).map((item) => item.concept))]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.divider }]}>
          <Pressable accessibilityLabel="Exit knowledge check" onPress={exit} style={styles.headerButton}>
            <Ionicons name="close" color={theme.text} size={24} />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="smallBold" numberOfLines={1}>{topic.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {result ? 'Results' : quiz ? `Question ${currentIndex + 1} of ${quiz.questions.length}` : 'Knowledge check'}
            </ThemedText>
          </View>
          <View style={styles.headerButton} />
        </View>

        {!quiz ? (
          <ScrollView contentContainerStyle={styles.prepareContent}>
            <View style={[styles.prepareIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="help-circle-outline" color={theme.primary} size={32} />
            </View>
            <ThemedText type="heading">Check what you understand</ThemedText>
            <ThemedText themeColor="textSecondary">
              LearnGuide will create five questions from the passages used for this topic. Correct answers stay hidden until you submit.
            </ThemedText>
            {error ? (
              <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
            ) : null}
            <PrimaryButton
              disabled={isGenerating}
              label={
                isGenerating
                  ? generation.phase === 'downloading'
                    ? `Installing offline AI · ${Math.round(generation.progress * 100)}%`
                    : 'Preparing questions…'
                  : 'Prepare knowledge check'
              }
              loading={isGenerating}
              onPress={() => void generate()}
            />
            {isGenerating && generation.phase === 'generating' ? (
              <PrimaryButton label="Stop generation" onPress={() => generationRuntime.interrupt()} variant="secondary" />
            ) : null}
          </ScrollView>
        ) : result ? (
          <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
            <ResultsSummary correct={correct} score={result.score} total={quiz.questions.length} />

            {weakConcepts.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="subtitle">Concepts to review</ThemedText>
                <View style={styles.weakList}>
                  {weakConcepts.map((concept) => (
                    <View key={concept} style={[styles.weak, { backgroundColor: theme.warningSoft }]}>
                      <Ionicons name="refresh-outline" color={theme.warning} size={19} />
                      <ThemedText type="smallBold" style={styles.flex}>{concept}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.recommendation,
                {
                  backgroundColor: theme.milestoneSoft,
                  borderColor: theme.milestone,
                  borderLeftColor: theme.milestone,
                },
              ]}>
              <ThemedText type="caption" style={{ color: theme.warning }}>RECOMMENDED NEXT</ThemedText>
              <ThemedText type="heading">{result.recommendation.title}</ThemedText>
              <ThemedText themeColor="textSecondary">{result.recommendation.reason}</ThemedText>
              <PrimaryButton
                label={
                  result.recommendation.action === 'continue'
                    ? 'Continue to next topic'
                    : result.recommendation.action === 'review_topic'
                      ? 'Review with a simpler explanation'
                      : 'Review weak concepts'
                }
                onPress={() =>
                  result.recommendation.action === 'continue'
                    ? continueAfterAssessment()
                    : router.back()
                }
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Answer review</ThemedText>
              {quiz.questions.map((item, index) => {
                const isCorrect = answers[index] === item.correctOptionIndex;
                const citation = quiz.citations.find((source) => source.label === item.sourceLabel);
                return (
                  <View key={`${index}-${item.question}`} style={[styles.review, { borderBottomColor: theme.divider }]}>
                    <View style={styles.reviewHeading}>
                      <Ionicons
                        name={isCorrect ? 'checkmark-circle' : 'refresh-circle'}
                        color={isCorrect ? theme.success : theme.warning}
                        size={22}
                      />
                      <ThemedText type="smallBold" style={styles.flex}>{index + 1}. {item.question}</ThemedText>
                    </View>
                    {!isCorrect ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Your answer: {item.options[answers[index]]}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="smallBold">
                      Correct answer: {item.options[item.correctOptionIndex]}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{item.explanation}</ThemedText>
                    {citation ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSelectedCitation(citation)}
                        style={styles.sourceAction}>
                        <Ionicons name="document-text-outline" color={theme.primary} size={17} />
                        <ThemedText type="smallBold" style={{ color: theme.primary }}>View supporting source</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
            <PrimaryButton label="Try another check" onPress={() => void generate()} variant="secondary" />
          </ScrollView>
        ) : question ? (
          <>
            <ScrollView contentContainerStyle={styles.questionContent} showsVerticalScrollIndicator={false}>
              <ProgressBar
                accessibilityLabel="Assessment progress"
                value={(currentIndex + 1) / quiz.questions.length}
              />
              <ThemedText type="caption" style={{ color: theme.primary }}>
                QUESTION {currentIndex + 1} OF {quiz.questions.length}
              </ThemedText>
              <ThemedText type="heading">{question.question}</ThemedText>
              <View accessibilityRole="radiogroup" style={styles.options}>
                {question.options.map((option, index) => {
                  const selected = answers[currentIndex] === index;
                  return (
                    <AssessmentOption
                      key={`${index}-${option}`}
                      index={index}
                      label={option}
                      onPress={() => select(index)}
                      selected={selected}
                    />
                  );
                })}
              </View>
            </ScrollView>
            <View style={[styles.bottom, { backgroundColor: theme.background, borderTopColor: theme.divider }]}>
              <PrimaryButton
                disabled={currentIndex === 0}
                label="Previous"
                onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                variant="tertiary"
              />
              <View style={styles.flex} />
              {currentIndex < quiz.questions.length - 1 ? (
                <PrimaryButton
                  disabled={answers[currentIndex] < 0}
                  label="Next question"
                  onPress={() => setCurrentIndex((value) => value + 1)}
                />
              ) : (
                <PrimaryButton
                  disabled={!allAnswered || isSubmitting}
                  label={isSubmitting ? 'Submitting…' : 'Review and submit'}
                  loading={isSubmitting}
                  onPress={confirmSubmit}
                />
              )}
            </View>
          </>
        ) : null}
      </SafeAreaView>
      <SourcePreviewSheet
        citation={selectedCitation}
        materialTitle={topic.title}
        onClose={() => setSelectedCitation(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', flex: 1, gap: Spacing.two, justifyContent: 'center' },
  missingMaterial: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: Spacing.two,
  },
  headerButton: {
    alignItems: 'center',
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  headerTitle: { alignItems: 'center', flex: 1 },
  prepareContent: { flexGrow: 1, gap: Spacing.three, justifyContent: 'center', padding: Spacing.four },
  prepareIcon: {
    alignItems: 'center',
    borderRadius: Radius.large,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  questionContent: { gap: Spacing.four, padding: Spacing.four },
  options: { gap: Spacing.two },
  flex: { flex: 1 },
  bottom: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  results: { gap: Spacing.four, paddingBottom: Spacing.six },
  section: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  weakList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  weak: {
    alignItems: 'center',
    borderRadius: Radius.small,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  recommendation: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  review: { borderBottomWidth: 1, gap: Spacing.two, paddingVertical: Spacing.three },
  reviewHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.two },
  sourceAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: TouchTarget,
  },
});
