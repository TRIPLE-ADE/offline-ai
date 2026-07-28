import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ProgressBar } from "@/components/foundation/progress-bar";
import { StatePanel } from "@/components/foundation/state-panel";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { MaterialRepository } from "@/db/repositories/material-repository";
import { QuizAttemptRepository } from "@/db/repositories/quiz-attempt-repository";
import { TopicRepository } from "@/db/repositories/topic-repository";
import type { Material, QuizAttempt, Topic } from "@/db/types";
import { useTheme } from "@/hooks/use-theme";

type ProgressMaterial = { material: Material; topics: Topic[] };

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [materials, setMaterials] = useState<ProgressMaterial[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void Promise.all([
        new MaterialRepository(db).list().then((rows) =>
          Promise.all(
            rows.map(async (material) => ({
              material,
              topics: await new TopicRepository(db).listForMaterial(
                material.id,
              ),
            })),
          ),
        ),
        new QuizAttemptRepository(db).listRecent(6),
      ])
        .then(([nextMaterials, nextAttempts]) => {
          if (!active) return;
          setMaterials(nextMaterials);
          setAttempts(nextAttempts);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db]),
  );

  const allTopics = materials.flatMap((item) => item.topics);
  const completed = allTopics.filter(
    (topic) => topic.status === "completed",
  ).length;
  const review = allTopics.filter(
    (topic) => topic.status === "needs_review",
  ).length;
  const active = allTopics.find(
    (topic) => topic.status === "needs_review" || topic.status === "learning",
  );
  const activeMaterial = materials.find(
    (item) => item.material.id === active?.materialId,
  )?.material;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText themeColor="textSecondary">
          A private, on-device record of what you have learned and what needs
          review.
        </ThemedText>

        {!loading && allTopics.length === 0 ? (
          <StatePanel
            actionLabel="Go to library"
            body="Progress appears after you prepare a material and start its first topic."
            icon="stats-chart-outline"
            onAction={() => router.replace("/library")}
            title="Your learning progress will appear here"
          />
        ) : (
          <>
            <View style={styles.metrics}>
              {[
                [
                  "Materials",
                  materials.filter((item) => item.topics.length > 0).length,
                  "library-outline",
                ],
                ["Completed", completed, "checkmark-circle-outline"],
                ["Review", review, "refresh-circle-outline"],
              ].map(([label, value, icon], index) => {
                const accent =
                  index === 0
                    ? theme.primary
                    : index === 1
                      ? theme.secondary
                      : theme.accent;
                return (
                  <View
                    key={label as string}
                    style={[
                      styles.metric,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: theme.border,
                        borderTopColor: accent,
                      },
                    ]}
                  >
                    <Ionicons name={icon as never} color={accent} size={21} />
                    <ThemedText type="title">{value}</ThemedText>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>

            {active && activeMaterial ? (
              <View
                style={[
                  styles.next,
                  {
                    backgroundColor: theme.surfaceTint,
                    borderColor: theme.primarySoft,
                    borderLeftColor: theme.secondary,
                  },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  RECOMMENDED NEXT
                </ThemedText>
                <ThemedText type="heading">{active.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {active.status === "needs_review"
                    ? "Review this topic before continuing."
                    : "Continue the lesson you started."}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.navigate({
                      pathname: "/material/[materialId]/topic/[topicId]",
                      params: {
                        materialId: active.materialId,
                        origin: "progress",
                        topicId: active.id,
                      },
                    })
                  }
                  style={styles.inlineAction}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {active.status === "needs_review"
                      ? "Review topic"
                      : "Continue studying"}
                  </ThemedText>
                  <Ionicons
                    name="arrow-forward"
                    color={theme.primary}
                    size={18}
                  />
                </Pressable>
              </View>
            ) : null}

            <View style={styles.section}>
              <ThemedText type="subtitle">By material</ThemedText>
              {materials
                .filter((item) => item.topics.length > 0)
                .map(({ material, topics }) => {
                  const done = topics.filter(
                    (topic) => topic.status === "completed",
                  ).length;
                  return (
                    <Pressable
                      key={material.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.navigate({
                          pathname: "/material/[materialId]",
                          params: { materialId: material.id },
                        })
                      }
                      style={[
                        styles.material,
                        { borderBottomColor: theme.divider },
                      ]}
                    >
                      <View style={styles.row}>
                        <View style={styles.flex}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {material.title}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {done} of {topics.length} topics completed
                          </ThemedText>
                        </View>
                        <ThemedText type="smallBold">
                          {Math.round((done / topics.length) * 100)}%
                        </ThemedText>
                      </View>
                      <ProgressBar
                        value={done / topics.length}
                        accessibilityLabel={`${material.title} completion`}
                      />
                    </Pressable>
                  );
                })}
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle">Recent checks</ThemedText>
              {attempts.length === 0 ? (
                <ThemedText themeColor="textSecondary">
                  Complete a knowledge check to see recent scores.
                </ThemedText>
              ) : (
                attempts.map((attempt) => {
                  const topic = allTopics.find(
                    (item) => item.id === attempt.topicId,
                  );
                  return (
                    <View
                      key={attempt.id}
                      style={[
                        styles.activity,
                        { borderBottomColor: theme.divider },
                      ]}
                    >
                      <View
                        style={[
                          styles.score,
                          {
                            backgroundColor:
                              attempt.score >= 80
                                ? theme.successSoft
                                : theme.warningSoft,
                          },
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color:
                              attempt.score >= 80
                                ? theme.success
                                : theme.warning,
                          }}
                        >
                          {Math.round(attempt.score)}%
                        </ThemedText>
                      </View>
                      <View style={styles.flex}>
                        <ThemedText type="smallBold">
                          {topic?.title ?? "Knowledge check"}
                        </ThemedText>
                        <ThemedText type="caption" themeColor="textSecondary">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
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
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  metrics: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  metric: {
    alignItems: "flex-start",
    borderCurve: "continuous",
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderTopWidth: 3,
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
    padding: Spacing.three,
  },
  next: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.two,
    padding: Spacing.four,
  },
  inlineAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
    minHeight: 48,
  },
  section: { 
    gap: Spacing.two,
  },
  material: {
    borderBottomWidth: 1,
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  row: { 
    alignItems: "center", 
    flexDirection: "row", 
    gap: Spacing.two 
  },
  flex: { 
    flex: 1 
  },
  activity: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  score: {
    alignItems: "center",
    borderRadius: Radius.small,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 58,
    paddingHorizontal: Spacing.two,
  },
});
