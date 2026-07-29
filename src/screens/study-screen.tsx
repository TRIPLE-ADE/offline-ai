import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/foundation/primary-button";
import { RecommendationCard } from "@/components/foundation/recommendation-card";
import { SectionHeader } from "@/components/foundation/section-header";
import { StatePanel } from "@/components/foundation/state-panel";
import { StatusBadge } from "@/components/foundation/status-badge";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, TouchTarget } from "@/constants/theme";
import type { Material, Topic } from "@/db/types";
import { useModelInstallationStore } from "@/ai/model-installation-state";
import { useTheme } from "@/hooks/use-theme";
import { isOfflineAiInstalled } from "@/hooks/use-learning-feature-access";
import { useAppOverlayStore } from "@/stores/app-overlay-store";
import { useLearningOverviewStore } from "@/stores/learning-overview-store";

type StudyItem = { material: Material; topic: Topic };

function recommendationPriority(topic: Topic) {
  if (topic.status === "needs_review") return 0;
  if (topic.status === "learning") return 1;
  if (topic.status === "not_started") return 2;
  return 3;
}

function recommendationCopy(topic: Topic) {
  if (topic.status === "needs_review") {
    return {
      eyebrow: "REVIEW RECOMMENDED",
      action: "Review weak concept",
      body: "Your latest knowledge check suggests another pass will strengthen this topic.",
      icon: "refresh-circle-outline" as const,
    };
  }
  if (topic.status === "learning") {
    return {
      eyebrow: "CONTINUE LEARNING",
      action: "Continue lesson",
      body: "Resume where you left off. Your material and learning context are already available offline.",
      icon: "play-circle-outline" as const,
    };
  }
  return {
    eyebrow: "START NEXT",
    action: "Start lesson",
    body: "This is the next available topic in your prepared material.",
    icon: "arrow-forward-circle-outline" as const,
  };
}

export default function StudyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial,
  );
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const modelInstallationPhase = useModelInstallationStore(
    (state) => state.phase,
  );
  const modelInstallationVerification = useModelInstallationStore(
    (state) => state.verification,
  );
  const overviewMaterials = useLearningOverviewStore(
    (state) => state.materials,
  );
  const overviewStatus = useLearningOverviewStore((state) => state.status);
  const loading = overviewStatus === "idle" || overviewStatus === "loading";
  const items = useMemo(
    () =>
      overviewMaterials
        .filter(({ material }) => material.status === "ready")
        .flatMap(({ material, topics }) =>
          topics.map((topic) => ({ material, topic })),
        ),
    [overviewMaterials],
  );

  const recommendation = useMemo(
    () =>
      [...items]
        .filter((item) => item.topic.status !== "completed")
        .sort((a, b) => {
          const priority =
            recommendationPriority(a.topic) - recommendationPriority(b.topic);
          if (priority !== 0) return priority;
          if (
            a.topic.status === "not_started" &&
            b.topic.status === "not_started"
          ) {
            return a.topic.position - b.topic.position;
          }
          return b.topic.updatedAt.localeCompare(a.topic.updatedAt);
        })[0],
    [items],
  );
  const recentlyStudied = useMemo(
    () =>
      [...items]
        .filter((item) => item.topic.status !== "not_started")
        .sort((a, b) => b.topic.updatedAt.localeCompare(a.topic.updatedAt))
        .slice(0, 3),
    [items],
  );
  const modelStatusChecked = modelInstallationVerification === "complete";
  const offlineReady = isOfflineAiInstalled(
    modelInstallationPhase,
    modelInstallationVerification,
  );
  const copy = recommendation ? recommendationCopy(recommendation.topic) : null;
  const recommendationTopicCount = recommendation
    ? items.filter((item) => item.material.id === recommendation.material.id).length
    : 0;

  const openTopic = (item: StudyItem) =>
    router.navigate({
      pathname: "/material/[materialId]/topic/[topicId]",
      params: {
        materialId: item.material.id,
        origin: "study",
        topicId: item.topic.id,
      },
    });

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <ThemedText themeColor="textSecondary">
            One clear next step, based on your prepared materials and recent
            results.
          </ThemedText>
          <StatusBadge
            label={
              !modelStatusChecked
                ? "Checking offline AI…"
                : offlineReady
                ? "Private and ready offline"
                : "Offline AI available when you’re ready"
            }
            tone={
              !modelStatusChecked
                ? "neutral"
                : offlineReady
                  ? "offline"
                  : "working"
            }
          />
        </View>

        {!loading && !recommendation ? (
          <StatePanel
            actionLabel="Import material"
            body="Add a PDF or TXT file when you are ready. LearnGuide will use it to create grounded lessons, quizzes, chat, and your next study action."
            icon="book-outline"
            onAction={openImportMaterial}
            secondaryLabel={
              !modelStatusChecked || offlineReady
                ? undefined
                : "Download offline AI"
            }
            onSecondary={
              !modelStatusChecked || offlineReady ? undefined : openOfflineAi
            }
            title="Your next study action will appear here"
          />
        ) : recommendation && copy ? (
          <>
            <RecommendationCard
              actionLabel={copy.action}
              body={`${copy.body} Topic ${recommendation.topic.position + 1} of ${recommendationTopicCount}.`}
              eyebrow={copy.eyebrow}
              icon={copy.icon}
              onAction={() => openTopic(recommendation)}
              secondaryAction={
                <PrimaryButton
                  label="Chat with this material"
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/chat",
                      params: { materialId: recommendation.material.id },
                    })
                  }
                  variant="secondary"
                />
              }
              subtitle={recommendation.material.title}
              title={recommendation.topic.title}
            />

            {recentlyStudied.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  description="Return to a recent topic without losing your place."
                  title="Recently studied"
                />
                {recentlyStudied.map((item) => (
                  <Pressable
                    key={item.topic.id}
                    accessibilityHint="Opens this topic"
                    accessibilityRole="button"
                    onPress={() => openTopic(item)}
                    style={({ pressed }) => [
                      styles.recentRow,
                      {
                        backgroundColor: pressed
                          ? theme.surfaceSelected
                          : "transparent",
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {item.topic.title}
                      </ThemedText>
                      <ThemedText
                        type="caption"
                        themeColor="textSecondary"
                        numberOfLines={1}
                      >
                        {item.material.title}
                      </ThemedText>
                    </View>
                    <StatusBadge
                      label={
                        item.topic.status === "needs_review"
                          ? "Review"
                          : item.topic.status === "completed"
                            ? "Completed"
                            : "In progress"
                      }
                      tone={
                        item.topic.status === "needs_review"
                          ? "working"
                          : item.topic.status === "completed"
                            ? "ready"
                            : "neutral"
                      }
                    />
                    <Ionicons
                      name="chevron-forward"
                      color={theme.textMuted}
                      size={20}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  intro: { 
    gap: Spacing.three 
  },
  flex: { 
    flex: 1, 
    gap: Spacing.one 
  },
  section: { 
    gap: Spacing.two,
  },
  recentRow: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: TouchTarget + 16,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
  },
});
