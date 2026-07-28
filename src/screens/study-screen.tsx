import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/foundation/primary-button";
import { RecommendationCard } from "@/components/foundation/recommendation-card";
import { SectionHeader } from "@/components/foundation/section-header";
import { StatePanel } from "@/components/foundation/state-panel";
import { StatusBadge } from "@/components/foundation/status-badge";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, TouchTarget } from "@/constants/theme";
import { MaterialRepository } from "@/db/repositories/material-repository";
import { TopicRepository } from "@/db/repositories/topic-repository";
import type { Material, Topic } from "@/db/types";
import { useTheme } from "@/hooks/use-theme";
import { useRuntimeStore } from "@/stores/runtime-store";

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
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      void new MaterialRepository(db)
        .list()
        .then(async (materials) => {
          const prepared = materials.filter(
            (material) => material.status === "ready",
          );
          return (
            await Promise.all(
              prepared.map(async (material) => {
                const topics = await new TopicRepository(db).listForMaterial(
                  material.id,
                );
                return topics.map((topic) => ({ material, topic }));
              }),
            )
          ).flat();
        })
        .then((nextItems) => {
          if (active) setItems(nextItems);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [db]),
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
  const offlineReady =
    generation.phase === "ready" && embedding.phase === "ready";
  const copy = recommendation ? recommendationCopy(recommendation.topic) : null;
  const recommendationTopicCount = recommendation
    ? items.filter((item) => item.material.id === recommendation.material.id).length
    : 0;

  const openTopic = (item: StudyItem) =>
    router.push({
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
              offlineReady
                ? "Private and ready offline"
                : "Offline AI setup needed"
            }
            tone={offlineReady ? "offline" : "working"}
          />
        </View>

        {!loading && !recommendation ? (
          <StatePanel
            actionLabel="Open library"
            body="Import and prepare a material. Soma will then recommend the next topic to learn or review."
            icon="book-outline"
            onAction={() => router.replace("/library")}
            secondaryLabel="Manage offline AI"
            onSecondary={() => router.push("/setup")}
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
                    router.push({
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
