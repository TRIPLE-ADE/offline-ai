import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { generationRuntime } from '@/ai/generation-runtime';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Material, MaterialStatus, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { topicRoadmapService } from '@/learning/topic-roadmap-service';
import { materialProcessingService } from '@/materials/process-material';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';
import { useRuntimeStore } from '@/stores/runtime-store';
import { userFacingError } from '@/utils/user-facing-error';

const PROCESS_STEPS: { status: MaterialStatus; label: string }[] = [
  { status: 'imported', label: 'Stored privately' },
  { status: 'extracting', label: 'Reading selectable text' },
  { status: 'chunking', label: 'Organizing passages' },
  { status: 'indexing', label: 'Preparing offline search' },
  { status: 'ready', label: 'Ready to study' },
];

function topicIcon(status: Topic['status']) {
  if (status === 'completed') return 'checkmark-circle';
  if (status === 'needs_review') return 'refresh-circle';
  if (status === 'learning') return 'play-circle';
  return 'ellipse-outline';
}

function currentStep(status: MaterialStatus) {
  if (status === 'generating_topics' || status === 'ready') return 4;
  if (status === 'failed') return 0;
  return Math.max(0, PROCESS_STEPS.findIndex((step) => step.status === status));
}

export default function MaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const embedding = useRuntimeStore((state) => state.embedding);
  const [material, setMaterial] = useState<Material | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
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
  }, [db, materialId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const coverage = useMemo(() => new Set(topics.flatMap((topic) => topic.sourceChunkIds)).size, [topics]);
  const completed = topics.filter((topic) => topic.status === 'completed').length;
  const recommended =
    topics.find((topic) => topic.status === 'needs_review') ??
    topics.find((topic) => topic.status === 'learning') ??
    topics.find((topic) => topic.status === 'not_started') ??
    topics[topics.length - 1];
  const lastStudied = [...topics]
    .filter((topic) => topic.status !== 'not_started')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  const process = async () => {
    setError(null);
    setIsProcessing(true);
    try {
      const next = await materialProcessingService.process(db, materialId, ({ status, message }) => {
        setProcessingMessage(message);
        setMaterial((value) => (value ? { ...value, status, statusMessage: message } : value));
      });
      setMaterial(next);
      setProcessingMessage('Offline search is ready. Create a roadmap when you are ready.');
    } catch (caught) {
      setError(userFacingError(caught, 'This material could not be prepared. Retry without importing it again.'));
      await load();
    } finally {
      setIsProcessing(false);
    }
  };

  const generateRoadmap = async () => {
    setError(null);
    setIsGeneratingRoadmap(true);
    setProcessingMessage('Organizing your material into a recommended study order…');
    try {
      setTopics(await topicRoadmapService.generate(db, materialId));
      await load();
    } catch (caught) {
      setError(userFacingError(caught, 'The roadmap could not be created. Retry without preparing the material again.'));
      await load();
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const confirmDelete = () => {
    if (!material) return;
    Alert.alert(
      'Delete this material?',
      `This permanently deletes “${material.title}”, its study progress, lessons, questions, and chat history from this device.`,
      [
        { text: 'Keep material', style: 'cancel' },
        {
          text: 'Delete material',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await offlineVectorIndex.deleteMaterial(material.id);
              await new MaterialRepository(db).delete(material.id);
              const file = new File(material.localUri);
              if (file.exists) file.delete();
              router.replace('/');
            })().catch((caught) =>
              setError(caught instanceof Error ? caught.message : 'The material could not be deleted.')
            );
          },
        },
      ]
    );
  };

  if (!material) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
        <ThemedText themeColor="textSecondary">Opening material…</ThemedText>
      </ThemedView>
    );
  }

  const isReady = material.status === 'ready' || material.status === 'generating_topics';
  const busy = isProcessing || isGeneratingRoadmap;
  const stepIndex = currentStep(material.status);
  const processProgress =
    material.status === 'indexing' && embedding.progress > 0
      ? 0.58 + embedding.progress * 0.32
      : Math.max(0.08, stepIndex / (PROCESS_STEPS.length - 1));

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`${material.fileType.toUpperCase()} · On this device`}
          title={material.title}
          subtitle={
            topics.length > 0
              ? `${completed} of ${topics.length} topics completed`
              : 'Prepare this material once, then study and ask questions without internet.'
          }
          action={
            <Pressable
              accessibilityLabel="Material options"
              accessibilityRole="button"
              onPress={confirmDelete}
              style={[styles.iconButton, { borderColor: theme.border }]}>
              <Ionicons name="ellipsis-horizontal" color={theme.text} size={22} />
            </Pressable>
          }
        />

        {!isReady ? (
          <View style={[styles.processing, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <ThemedText type="subtitle">
                  {material.status === 'failed' ? 'Preparation needs attention' : 'Preparing for offline study'}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {error ?? processingMessage ?? 'Your imported file is safe and ready to prepare.'}
                </ThemedText>
              </View>
              {busy ? <ActivityIndicator color={theme.primary} /> : null}
            </View>
            {busy ? <ProgressBar value={processProgress} accessibilityLabel="Material preparation" /> : null}
            <View style={styles.stepList}>
              {PROCESS_STEPS.map((step, index) => {
                const done = index < stepIndex || material.status === 'ready';
                const active = index === stepIndex && busy;
                return (
                  <View key={step.label} style={styles.step}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : active ? 'sync-circle' : 'ellipse-outline'}
                      color={done ? theme.success : active ? theme.primary : theme.textTertiary}
                      size={20}
                    />
                    <ThemedText type="small" style={{ color: active ? theme.text : theme.textSecondary }}>
                      {step.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              You may leave this screen. Keep Soma open while preparation is running.
            </ThemedText>
            <PrimaryButton
              disabled={busy}
              label={
                busy
                  ? 'Preparing material…'
                  : material.status === 'failed'
                    ? 'Retry preparation'
                    : 'Prepare material'
              }
              loading={busy}
              onPress={() => void process()}
            />
          </View>
        ) : null}

        {isReady && topics.length === 0 ? (
          <StatePanel
            actionLabel={isGeneratingRoadmap ? 'Creating roadmap…' : 'Create topic roadmap'}
            body="Soma will organize the material into a recommended order. You will still be free to open any topic."
            icon="map-outline"
            onAction={() => void generateRoadmap()}
            secondaryLabel={isGeneratingRoadmap ? 'Stop generation' : 'Chat with material'}
            onSecondary={() =>
              isGeneratingRoadmap
                ? generationRuntime.interrupt()
                : router.push({ pathname: '/material/[materialId]/chat', params: { materialId } })
            }
            title="Offline search is ready"
          />
        ) : null}

        {topics.length > 0 ? (
          <>
            <View style={styles.metrics}>
              {[
                ['Topics', topics.length],
                ['Passages', material.chunkCount],
                ['Progress', `${Math.round((completed / topics.length) * 100)}%`],
              ].map(([label, value]) => (
                <View key={label as string} style={[styles.metric, { borderColor: theme.border }]}>
                  <ThemedText type="heading">{value}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">{label}</ThemedText>
                </View>
              ))}
            </View>

            {recommended ? (
              <View style={[styles.recommendation, { backgroundColor: theme.primarySoft }]}>
                <ThemedText type="caption" style={{ color: theme.primary }}>RECOMMENDED NEXT</ThemedText>
                <ThemedText type="heading">{recommended.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {recommended.status === 'needs_review'
                    ? 'A recent check suggests reviewing this topic.'
                    : recommended.summary}
                </ThemedText>
                <PrimaryButton
                  label={recommended.status === 'needs_review' ? 'Review topic' : 'Continue studying'}
                  onPress={() =>
                    router.push({ pathname: '/topic/[topicId]', params: { topicId: recommended.id } })
                  }
                />
              </View>
            ) : null}

            <View style={styles.quickActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/material/[materialId]/chat', params: { materialId } })}
                style={[styles.quickAction, { borderColor: theme.border }]}>
                <Ionicons name="chatbubble-ellipses-outline" color={theme.primary} size={22} />
                <ThemedText type="smallBold">Chat</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/progress')}
                style={[styles.quickAction, { borderColor: theme.border }]}>
                <Ionicons name="stats-chart-outline" color={theme.primary} size={22} />
                <ThemedText type="smallBold">Progress</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmDelete}
                style={[styles.quickAction, { borderColor: theme.border }]}>
                <Ionicons name="trash-outline" color={theme.danger} size={22} />
                <ThemedText type="smallBold">Options</ThemedText>
              </Pressable>
            </View>

            {lastStudied ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.horizontal}>
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
                <Pressable
                  key={topic.id}
                  accessibilityHint="Opens this topic"
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/topic/[topicId]', params: { topicId: topic.id } })
                  }
                  style={({ pressed }) => [
                    styles.topic,
                    { borderBottomColor: theme.divider, opacity: pressed ? 0.72 : 1 },
                  ]}>
                  <Ionicons
                    name={topicIcon(topic.status)}
                    color={
                      topic.status === 'completed'
                        ? theme.success
                        : topic.status === 'needs_review'
                          ? theme.warning
                          : theme.primary
                    }
                    size={24}
                  />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{topic.position + 1}. {topic.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                      {topic.summary}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textTertiary">
                      About {Math.max(5, topic.sourceChunkIds.length * 3)} min · {topic.sourceChunkIds.length} source passage{topic.sourceChunkIds.length === 1 ? '' : 's'}
                      {topic.bestScore === null ? '' : ` · Latest ${Math.round(topic.bestScore)}%`}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" color={theme.textTertiary} size={20} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {error && isReady ? (
          <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="smallBold" style={{ color: theme.danger }}>This step needs attention</ThemedText>
            <ThemedText type="small" style={{ color: theme.danger }}>{error}</ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.four, paddingBottom: Spacing.six },
  centered: { alignItems: 'center', flex: 1, gap: Spacing.two, justifyContent: 'center' },
  iconButton: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  processing: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  stepList: { gap: Spacing.two },
  step: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  metrics: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four },
  metric: {
    borderBottomWidth: 2,
    flex: 1,
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  recommendation: { gap: Spacing.three, marginHorizontal: Spacing.four, padding: Spacing.four },
  quickActions: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four },
  quickAction: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flex: 1,
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 72,
    padding: Spacing.two,
  },
  horizontal: { paddingHorizontal: Spacing.four },
  roadmap: { gap: Spacing.one, paddingHorizontal: Spacing.four },
  sectionHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  topic: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 88,
    paddingVertical: Spacing.three,
  },
  error: { gap: Spacing.one, marginHorizontal: Spacing.four, padding: Spacing.three },
});
