import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { isAiOperationCancelledError } from "@/ai/runtime-coordinator";
import { CitationControl } from "@/components/foundation/citation-control";
import { PrimaryButton } from "@/components/foundation/primary-button";
import { StatePanel } from "@/components/foundation/state-panel";
import { SourcePreviewSheet } from "@/components/foundation/source-preview-sheet";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { TopicRepository } from "@/db/repositories/topic-repository";
import type { StoredCitation, Topic } from "@/db/types";
import { useTheme } from "@/hooks/use-theme";
import { useLearningFeatureAccess } from "@/hooks/use-learning-feature-access";
import {
  lessonService,
  type LessonGenerationStage,
} from "@/learning/lesson-service";
import type { LessonArtifact } from "@/learning/schemas";
import { useAppOverlayStore } from "@/stores/app-overlay-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { userFacingError } from "@/utils/user-facing-error";

type RouteOrigin = "home" | "material" | "progress" | "study";

type TopicLessonState = {
  lesson: LessonArtifact | null;
  loadedTopicId: string | null;
  topic: Topic | null;
};

export default function TopicLessonScreen() {
  const { origin, topicId } = useLocalSearchParams<{
    origin?: RouteOrigin;
    topicId: string;
  }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial,
  );
  const { ensureAccess } = useLearningFeatureAccess();
  const generation = useRuntimeStore((state) => state.generation);
  const [{ lesson, loadedTopicId, topic }, setTopicLessonState] =
    useState<TopicLessonState>({
      lesson: null,
      loadedTopicId: null,
      topic: null,
    });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] =
    useState<LessonGenerationStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] =
    useState<StoredCitation | null>(null);

  const load = useCallback(async () => {
    const [nextTopic, nextLesson] = await Promise.all([
      new TopicRepository(db).getById(topicId),
      lessonService.getCached(db, topicId),
    ]);
    setTopicLessonState({
      lesson: nextLesson,
      loadedTopicId: topicId,
      topic: nextTopic,
    });
  }, [db, topicId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        lessonService.stop(topicId);
      };
    }, [load, topicId]),
  );

  const handleGenerate = async () => {
    if (!ensureAccess({ hasMaterial: Boolean(topic) })) {
      return;
    }
    setError(null);
    setIsGenerating(true);
    setGenerationStage("loading-sources");
    try {
      const generatedLesson = await lessonService.generate(
        db,
        topicId,
        setGenerationStage,
      );
      setTopicLessonState((current) => ({
        ...current,
        lesson: generatedLesson,
      }));
      await load();
    } catch (caught) {
      if (!isAiOperationCancelledError(caught)) {
        setError(
          userFacingError(
            caught,
            "This lesson could not be completed. Retry when you are ready.",
          ),
        );
      }
    } finally {
      setIsGenerating(false);
      setGenerationStage(null);
    }
  };

  const generationLabel =
    generation.residency === "loading"
      ? `Loading offline AI · ${Math.round(generation.progress * 100)}%`
      : generationStage === "loading-sources"
        ? "Opening topic sources…"
        : generationStage === "loading-model"
          ? "Loading offline AI…"
          : generationStage === "saving"
            ? "Saving lesson…"
            : "Writing your lesson…";

  if (loadedTopicId !== topicId) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText themeColor="textSecondary">Loading topic…</ThemedText>
      </ThemedView>
    );
  }

  if (!topic) {
    return (
      <ThemedView style={styles.missingMaterial}>
        <StatePanel
          actionLabel="Import material"
          body="Lessons need a PDF or TXT source so every explanation can stay grounded."
          icon="document-text-outline"
          onAction={openImportMaterial}
          secondaryLabel="Go Home"
          onSecondary={() => router.replace("/home")}
          title="Import a file to create lessons"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: topic.title }} />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topicIntro}>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            TOPIC {topic.position + 1}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{topic.summary}</ThemedText>
        </View>

        {!lesson ? (
          <ThemedView
            style={[
              styles.generateCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Ionicons name="school-outline" color={theme.primary} size={32} />
            <ThemedText type="subtitle" style={styles.compactTitle}>
              Prepare this lesson
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              LearnGuide will read the relevant passages and create a focused
              explanation with sources you can inspect.
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
                  ? generationLabel
                  : error
                    ? "Retry lesson"
                    : "Generate lesson offline"
              }
              leading={
                isGenerating ? (
                  <ActivityIndicator color={theme.textOnPrimary} />
                ) : undefined
              }
              onPress={() => void handleGenerate()}
            />
            {isGenerating ? (
              <PrimaryButton
                label={
                  generation.activity === "running"
                    ? "Stop generation"
                    : "Stop preparation"
                }
                onPress={() => lessonService.stop(topicId)}
                variant="secondary"
              />
            ) : null}
          </ThemedView>
        ) : (
          <>
            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceTint,
                  borderColor: theme.primarySoft,
                },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={[styles.label, { color: theme.primary }]}
              >
                LEARNING OBJECTIVE
              </ThemedText>
              <ThemedText>{lesson.objective}</ThemedText>
            </ThemedView>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Simple explanation
              </ThemedText>
              <ThemedText>{lesson.explanation}</ThemedText>
            </View>

            <ThemedView
              style={[
                styles.card,
                {
                  backgroundColor: theme.surfaceElevated,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.headingRow}>
                <Ionicons name="bulb-outline" color={theme.primary} size={24} />
                <ThemedText type="smallBold">Practical example</ThemedText>
              </View>
              <ThemedText>{lesson.example}</ThemedText>
            </ThemedView>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Key points
              </ThemedText>
              {lesson.keyPoints.map((point) => (
                <View key={point} style={styles.bulletRow}>
                  <View
                    style={[styles.bullet, { backgroundColor: theme.primary }]}
                  />
                  <ThemedText style={styles.flex}>{point}</ThemedText>
                </View>
              ))}
            </View>

            <ThemedView
              style={[
                styles.warningCard,
                {
                  backgroundColor: theme.warningSoft,
                  borderColor: theme.warning,
                },
              ]}
            >
              <View style={styles.headingRow}>
                <Ionicons
                  name="warning-outline"
                  color={theme.warning}
                  size={24}
                />
                <ThemedText type="smallBold">Common mistake</ThemedText>
              </View>
              <ThemedText>{lesson.commonMistake}</ThemedText>
            </ThemedView>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Short recap
              </ThemedText>
              <ThemedText>{lesson.keyPoints.join(" ")}</ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">
                Need another way to understand it?
              </ThemedText>
              <View style={styles.quickActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/chat",
                      params: {
                        materialId: topic.materialId,
                        topicTitle: topic.title,
                        prompt: `Explain ${topic.title} more simply.`,
                      },
                    })
                  }
                  style={[
                    styles.quickAction,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="chatbox-outline"
                    color={theme.primary}
                    size={19}
                  />
                  <ThemedText type="smallBold">Explain more simply</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/chat",
                      params: {
                        materialId: topic.materialId,
                        topicTitle: topic.title,
                        prompt: `Give me another practical example of ${topic.title}.`,
                      },
                    })
                  }
                  style={[
                    styles.quickAction,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="bulb-outline"
                    color={theme.primary}
                    size={19}
                  />
                  <ThemedText type="smallBold">Give another example</ThemedText>
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">Sources used</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap a citation to inspect the stored excerpt.
              </ThemedText>
              <View style={styles.chips}>
                {lesson.citations.map((citation) => (
                  <CitationControl
                    key={citation.chunkId}
                    citation={citation}
                    onPress={() => setSelectedCitation(citation)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.actions}>
              <PrimaryButton
                label="Start knowledge check"
                onPress={() =>
                  router.navigate({
                    pathname:
                      "/material/[materialId]/topic/[topicId]/assessment",
                    params: {
                      materialId: topic.materialId,
                      origin: origin ?? "material",
                      topicId,
                    },
                  })
                }
              />
              <PrimaryButton
                label="Ask about this topic"
                onPress={() =>
                  router.navigate({
                    pathname: "/material/[materialId]/chat",
                    params: {
                      materialId: topic.materialId,
                      topicTitle: topic.title,
                    },
                  })
                }
                variant="secondary"
              />
              {error ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
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
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    paddingTop: Spacing.three,
  },
  topicIntro: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
  },
  missingMaterial: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
  },
  generateCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  compactTitle: { fontSize: 25, lineHeight: 31 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  warningCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  label: { letterSpacing: 1 },
  section: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  bulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  bullet: {
    borderRadius: 4,
    height: 8,
    marginTop: 8,
    width: 8,
  },
  flex: { flex: 1 },
  checkCard: {
    borderRadius: 16,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  quickAction: {
    alignItems: "center",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
});
