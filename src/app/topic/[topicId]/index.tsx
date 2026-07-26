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
import { lessonService } from '@/learning/lesson-service';
import type { LessonArtifact } from '@/learning/schemas';
import { useRuntimeStore } from '@/stores/runtime-store';

export default function TopicLessonScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const generation = useRuntimeStore((state) => state.generation);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [lesson, setLesson] = useState<LessonArtifact | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<string | null>(null);

  const load = useCallback(async () => {
    const nextTopic = await new TopicRepository(db).getById(topicId);
    setTopic(nextTopic);
    setLesson(await lessonService.getCached(db, topicId));
  }, [db, topicId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      setLesson(await lessonService.generate(db, topicId));
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to generate this lesson.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (!topic) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color="#4A50CE" />
        <ThemedText themeColor="textSecondary">Loading topic…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`Topic ${topic.position + 1}`}
          title={topic.title}
          subtitle={topic.summary}
        />

        {!lesson ? (
          <ThemedView type="backgroundElement" style={styles.generateCard}>
            <Ionicons name="school-outline" color="#4A50CE" size={32} />
            <ThemedText type="subtitle" style={styles.compactTitle}>
              Learn from the source
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Gemma will teach this topic from a bounded set of retrieved passages and
              attach the exact stored excerpts it used.
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
                    : 'Generating grounded lesson…'
                  : error
                    ? 'Retry lesson generation'
                    : 'Generate lesson'
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
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold" style={styles.label}>
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

            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.headingRow}>
                <Ionicons name="bulb-outline" color="#4A50CE" size={24} />
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
                  <View style={styles.bullet} />
                  <ThemedText style={styles.flex}>{point}</ThemedText>
                </View>
              ))}
            </View>

            <ThemedView type="backgroundElement" style={styles.warningCard}>
              <View style={styles.headingRow}>
                <Ionicons name="warning-outline" color="#C77D00" size={24} />
                <ThemedText type="smallBold">Common mistake</ThemedText>
              </View>
              <ThemedText>{lesson.commonMistake}</ThemedText>
            </ThemedView>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Quick checks
              </ThemedText>
              {lesson.quickChecks.map((check, index) => (
                <ThemedView
                  key={check.question}
                  type="backgroundElement"
                  style={styles.checkCard}>
                  <ThemedText type="smallBold">
                    {index + 1}. {check.question}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Answer: {check.answer}
                  </ThemedText>
                </ThemedView>
              ))}
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">Sources used</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap a citation to inspect the stored excerpt.
              </ThemedText>
              <View style={styles.chips}>
                {lesson.citations.map((citation) => (
                  <Pressable
                    key={citation.chunkId}
                    onPress={() =>
                      setExpandedCitation((current) =>
                        current === citation.chunkId ? null : citation.chunkId
                      )
                    }
                    style={[
                      styles.chip,
                      { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <Ionicons name="document-text-outline" color={theme.text} size={16} />
                    <ThemedText type="smallBold">{citation.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
              {lesson.citations
                .filter((citation) => citation.chunkId === expandedCitation)
                .map((citation) => (
                  <ThemedView
                    key={citation.chunkId}
                    type="backgroundElement"
                    style={styles.sourceCard}>
                    <ThemedText type="smallBold">{citation.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {citation.excerpt}
                    </ThemedText>
                  </ThemedView>
                ))}
            </View>

            <PrimaryButton
              label="Take five-question check"
              onPress={() =>
                router.push({
                  pathname: '/topic/[topicId]/quiz',
                  params: { topicId },
                })
              }
            />
            <PrimaryButton
              label="Regenerate lesson"
              onPress={() => void handleGenerate()}
              variant="secondary"
            />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary">
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
  card: {
    borderRadius: 18,
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  warningCard: {
    borderColor: '#C77D00',
    borderRadius: 18,
    borderWidth: 1,
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  label: { color: '#4A50CE', letterSpacing: 1 },
  section: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  sectionTitle: { fontSize: 24, lineHeight: 30 },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bulletRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bullet: {
    backgroundColor: '#4A50CE',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 99,
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  sourceCard: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
