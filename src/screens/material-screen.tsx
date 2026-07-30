import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { isAiOperationCancelledError } from "@/ai/runtime-coordinator";
import { PrimaryButton } from "@/components/foundation/primary-button";
import { ProcessingStepper } from "@/components/foundation/processing-stepper";
import { ProgressBar } from "@/components/foundation/progress-bar";
import { StatePanel } from "@/components/foundation/state-panel";
import { StatusBadge } from "@/components/foundation/status-badge";
import { TopicCard } from "@/components/foundation/topic-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { MaterialRepository } from "@/db/repositories/material-repository";
import { TopicRepository } from "@/db/repositories/topic-repository";
import type { Material, MaterialStatus, Topic } from "@/db/types";
import { useTheme } from "@/hooks/use-theme";
import { useLearningFeatureAccess } from "@/hooks/use-learning-feature-access";
import { topicRoadmapService } from "@/learning/topic-roadmap-service";
import { MISSING_SOURCE_MESSAGE } from "@/materials/import-material";
import { materialProcessingService } from "@/materials/process-material";
import { useAppOverlayStore } from "@/stores/app-overlay-store";
import { useRuntimeStore } from "@/stores/runtime-store";
import { userFacingError } from "@/utils/user-facing-error";

const PROCESS_STEPS: { status: MaterialStatus; label: string }[] = [
  { status: "imported", label: "Stored privately" },
  { status: "extracting", label: "Reading selectable text" },
  { status: "chunking", label: "Organizing passages" },
  { status: "indexing", label: "Preparing offline search" },
  { status: "ready", label: "Ready to study" },
];

function currentStep(status: MaterialStatus) {
  if (status === "generating_topics" || status === "ready") return 4;
  if (status === "failed") return 0;
  return Math.max(
    0,
    PROCESS_STEPS.findIndex((step) => step.status === status),
  );
}

export default function MaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial,
  );
  const { ensureAccess } = useLearningFeatureAccess();
  const embedding = useRuntimeStore((state) => state.embedding);
  const [material, setMaterial] = useState<Material | null>(null);
  const [loadedMaterialId, setLoadedMaterialId] = useState<string | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  const load = useCallback(async () => {
    const [nextMaterial, nextTopics] = await Promise.all([
      new MaterialRepository(db).getById(materialId),
      new TopicRepository(db).listForMaterial(materialId),
    ]);
    setMaterial(nextMaterial);
    setTopics(nextTopics);
    setProcessingMessage(nextMaterial?.statusMessage ?? null);
    setLoadedMaterialId(materialId);
  }, [db, materialId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        topicRoadmapService.stop(materialId);
      };
    }, [load, materialId]),
  );

  const coverage = useMemo(
    () => new Set(topics.flatMap((topic) => topic.sourceChunkIds)).size,
    [topics],
  );
  const completed = topics.filter(
    (topic) => topic.status === "completed",
  ).length;
  const recommended =
    topics.find((topic) => topic.status === "needs_review") ??
    topics.find((topic) => topic.status === "learning") ??
    topics.find((topic) => topic.status === "not_started") ??
    topics[topics.length - 1];
  const lastStudied = [...topics]
    .filter((topic) => topic.status !== "not_started")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const process = async () => {
    if (material?.sourceFileState !== "available") {
      setError(MISSING_SOURCE_MESSAGE);
      return;
    }
    if (!ensureAccess({ hasMaterial: true })) {
      return;
    }
    setError(null);
    setIsProcessing(true);
    try {
      const next = await materialProcessingService.process(
        db,
        materialId,
        ({ status, message }) => {
          setProcessingMessage(message);
          setMaterial((value) =>
            value ? { ...value, status, statusMessage: message } : value,
          );
        },
      );
      setMaterial(next);
      setProcessingMessage(
        "Offline search is ready. Create a roadmap when you are ready.",
      );
    } catch (caught) {
      setError(
        userFacingError(
          caught,
          "This material could not be prepared. Retry without importing it again.",
        ),
      );
      await load();
    } finally {
      setIsProcessing(false);
    }
  };

  const generateRoadmap = async () => {
    if (!ensureAccess({ hasMaterial: true })) {
      return;
    }
    setError(null);
    setIsGeneratingRoadmap(true);
    setProcessingMessage(
      "Organizing your material into a recommended study order…",
    );
    try {
      setTopics(await topicRoadmapService.generate(db, materialId));
      await load();
    } catch (caught) {
      if (!isAiOperationCancelledError(caught)) {
        setError(
          userFacingError(
            caught,
            "The roadmap could not be created. Retry without preparing the material again.",
          ),
        );
      }
      await load();
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  if (loadedMaterialId !== materialId) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText themeColor="textSecondary">Opening material…</ThemedText>
      </ThemedView>
    );
  }

  if (!material) {
    return (
      <ThemedView style={styles.missingMaterial}>
        <StatePanel
          actionLabel="Import material"
          body="This study page no longer has a PDF or TXT source on this device."
          icon="document-text-outline"
          onAction={openImportMaterial}
          secondaryLabel="Go Home"
          onSecondary={() => router.replace("/home")}
          title="Import a file to continue"
        />
      </ThemedView>
    );
  }

  const isReady =
    material.status === "ready" || material.status === "generating_topics";
  const sourceUnavailable = material.sourceFileState !== "available";
  const busy = isProcessing || isGeneratingRoadmap;
  const stepIndex = currentStep(material.status);
  const processProgress =
    material.status === "indexing" && embedding.progress > 0
      ? 0.58 + embedding.progress * 0.32
      : Math.max(0.08, stepIndex / (PROCESS_STEPS.length - 1));

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: material.title }} />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailHeader}>
          <ThemedText type="caption" themeColor="textSecondary">
            {material.fileType.toUpperCase()} · ON THIS DEVICE
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {topics.length > 0
              ? `${completed} of ${topics.length} topics completed`
              : "Prepare this material once, then study and ask questions without internet."}
          </ThemedText>
        </View>

        {sourceUnavailable ? (
          <StatePanel
            actionLabel="Import as new material"
            body={
              isReady
                ? "The original private file is missing, but your prepared lessons, topics, and cited passages remain available. Importing again creates a new material."
                : MISSING_SOURCE_MESSAGE
            }
            icon="document-text-outline"
            onAction={openImportMaterial}
            onSecondary={() => router.replace("/home")}
            secondaryLabel="Go Home"
            title="Source file is unavailable"
          />
        ) : null}

        {!sourceUnavailable && !isReady ? (
          <View
            style={[
              styles.processing,
              {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  borderTopColor: theme.primary,
                },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="subtitle">
                  {material.status === "failed"
                    ? "Preparation needs attention"
                    : "Preparing for offline study"}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {error ??
                    processingMessage ??
                    "Your imported file is safe and ready to prepare."}
                </ThemedText>
              </View>
              {busy ? <ActivityIndicator color={theme.primary} /> : null}
            </View>
            {busy ? (
              <ProgressBar
                value={processProgress}
                accessibilityLabel="Material preparation"
              />
            ) : null}
            <ProcessingStepper
              complete={material.status === "ready"}
              current={stepIndex}
              steps={PROCESS_STEPS.map((step) => step.label)}
            />
            <ThemedText type="caption" themeColor="textSecondary">
              You may leave this screen. Keep LearnGuide open while preparation is
              running.
            </ThemedText>
            <PrimaryButton
              disabled={busy}
              label={
                busy
                  ? "Preparing material…"
                  : material.status === "failed"
                    ? "Retry preparation"
                    : "Prepare material"
              }
              loading={busy}
              onPress={() => void process()}
            />
          </View>
        ) : null}

        {isReady && topics.length === 0 ? (
          <StatePanel
            actionLabel={
              isGeneratingRoadmap ? "Creating roadmap…" : "Create topic roadmap"
            }
            body="LearnGuide will organize the material into a recommended order. You will still be free to open any topic."
            icon="map-outline"
            onAction={() => void generateRoadmap()}
            secondaryLabel={
              isGeneratingRoadmap ? "Stop generation" : "Chat with material"
            }
            onSecondary={() =>
              isGeneratingRoadmap
                ? topicRoadmapService.stop(materialId)
                : router.navigate({
                    pathname: "/material/[materialId]/chat",
                    params: { materialId },
                  })
            }
            title="Offline search is ready"
          />
        ) : null}

        {topics.length > 0 ? (
          <>
            <View style={styles.metrics}>
              {[
                ["Topics", topics.length],
                ["Passages", material.chunkCount],
                [
                  "Progress",
                  `${Math.round((completed / topics.length) * 100)}%`,
                ],
              ].map(([label, value]) => (
                <View
                  key={label as string}
                  style={[styles.metric, { borderColor: theme.border }]}
                >
                  <ThemedText type="heading">{value}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>

            {recommended ? (
              <View
                style={[
                  styles.recommendation,
                  {
                    backgroundColor: theme.milestoneSoft,
                    borderColor: theme.milestone,
                    borderLeftColor: theme.milestone,
                  },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.warning }}>
                  RECOMMENDED NEXT
                </ThemedText>
                <ThemedText type="heading">{recommended.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {recommended.status === "needs_review"
                    ? "A recent check suggests reviewing this topic."
                    : recommended.summary}
                </ThemedText>
                <PrimaryButton
                  label={
                    recommended.status === "needs_review"
                      ? "Review topic"
                      : "Continue studying"
                  }
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/topic/[topicId]",
                      params: {
                        materialId,
                        origin: "material",
                        topicId: recommended.id,
                      },
                    })
                  }
                />
              </View>
            ) : null}

            <View style={styles.quickActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.navigate({
                    pathname: "/material/[materialId]/chat",
                    params: { materialId },
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
                  name="chatbubble-ellipses-outline"
                  color={theme.primary}
                  size={22}
                />
                <ThemedText type="smallBold">Chat</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate("/progress")}
                style={[
                  styles.quickAction,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="stats-chart-outline"
                  color={theme.primary}
                  size={22}
                />
                <ThemedText type="smallBold">Progress</ThemedText>
              </Pressable>
            </View>

            {lastStudied ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.horizontal}
              >
                Last studied: {lastStudied.title}
              </ThemedText>
            ) : null}

            <View style={styles.roadmap}>
              <View style={styles.sectionHeading}>
                <View style={styles.flex}>
                  <ThemedText type="subtitle">Topic roadmap</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {coverage} of {material.chunkCount} source passages covered
                  </ThemedText>
                </View>
                <StatusBadge label="Recommended order" tone="neutral" />
              </View>
              {topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/topic/[topicId]",
                      params: {
                        materialId,
                        origin: "material",
                        topicId: topic.id,
                      },
                    })
                  }
                  topic={topic}
                />
              ))}
            </View>
          </>
        ) : null}

        {error && isReady ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              This step needs attention
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
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
  detailHeader: {
    gap: Spacing.one,
  },
  processing: {
    borderCurve: "continuous",
    borderRadius: Radius.large,
    borderWidth: 1,
    borderTopWidth: 4,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
  },
  flex: { flex: 1 },
  metrics: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  metric: {
    borderBottomWidth: 2,
    flex: 1,
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  recommendation: {
    borderCurve: "continuous",
    borderRadius: Radius.large,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  quickAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Radius.medium,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.one,
    justifyContent: "center",
    minHeight: 72,
    padding: Spacing.two,
  },
  horizontal: {},
  roadmap: { gap: Spacing.one },
  sectionHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  error: {
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
