import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Material, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { topicRoadmapService } from '@/learning/topic-roadmap-service';
import { materialProcessingService } from '@/materials/process-material';
import {
  retrieveGroundedPassages,
  type GroundedPassage,
} from '@/retrieval/grounded-retrieval';
import { useRuntimeStore } from '@/stores/runtime-store';

function statusIcon(topic: Topic) {
  switch (topic.status) {
    case 'completed':
      return 'checkmark-circle';
    case 'needs_review':
      return 'refresh-circle';
    case 'learning':
      return 'play-circle';
    default:
      return 'ellipse-outline';
  }
}

export default function MaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const embedding = useRuntimeStore((state) => state.embedding);
  const generation = useRuntimeStore((state) => state.generation);
  const [material, setMaterial] = useState<Material | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroundedPassage[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const coverage = useMemo(
    () => new Set(topics.flatMap((topic) => topic.sourceChunkIds)).size,
    [topics]
  );
  const continueTopic =
    topics.find((topic) => topic.status !== 'completed') ?? topics[0];

  const handleProcess = async () => {
    setError(null);
    setResults([]);
    setIsProcessing(true);
    try {
      const indexedMaterial = await materialProcessingService.process(
        db,
        materialId,
        ({ status, message }) => {
          setProcessingMessage(message);
          setMaterial((current) =>
            current ? { ...current, status, statusMessage: message } : current
          );
        }
      );
      setMaterial(indexedMaterial);
      setProcessingMessage(indexedMaterial.statusMessage);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to index this material.'
      );
      await load();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setError(null);
    setIsGeneratingRoadmap(true);
    setProcessingMessage('Preparing the local topic roadmap…');
    try {
      setTopics(await topicRoadmapService.generate(db, materialId));
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to generate the learning roadmap.'
      );
      await load();
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleSearch = async () => {
    setError(null);
    setIsSearching(true);
    try {
      setResults(await retrieveGroundedPassages(materialId, query));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to search this material.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const openTopic = (topicId: string) =>
    router.push({
      pathname: '/topic/[topicId]',
      params: { topicId },
    });

  if (!material) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color="#4A50CE" />
        <ThemedText themeColor="textSecondary">Loading material…</ThemedText>
      </ThemedView>
    );
  }

  const isReady =
    material.status === 'ready' || material.status === 'generating_topics';
  const isBusy = isProcessing || isGeneratingRoadmap;
  const displayMessage = error ?? processingMessage ?? material.statusMessage;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`${material.fileType.toUpperCase()} · Offline`}
          title={material.title}
          subtitle="A private learning roadmap, grounded lessons, knowledge checks, and material-only chat."
        />

        <ThemedView type="backgroundElement" style={styles.statusCard}>
          <View style={styles.row}>
            {isBusy ? (
              <ActivityIndicator color="#4A50CE" />
            ) : (
              <Ionicons
                name={isReady ? 'shield-checkmark' : 'document-lock-outline'}
                color={theme.text}
                size={24}
              />
            )}
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {isReady
                  ? `${material.chunkCount} private source passages`
                  : 'Stored privately on this device'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {displayMessage ??
                  'Prepare a local index before creating the learning journey.'}
              </ThemedText>
              {isBusy &&
              (embedding.progress > 0 || generation.progress > 0) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {isGeneratingRoadmap ? 'Gemma' : 'MiniLM'} ·{' '}
                  {Math.round(
                    (isGeneratingRoadmap
                      ? generation.progress
                      : embedding.progress) * 100
                  )}
                  %
                </ThemedText>
              ) : null}
            </View>
          </View>
        </ThemedView>

        {!isReady ? (
          <PrimaryButton
            disabled={isBusy}
            label={
              isBusy
                ? 'Preparing offline search…'
                : material.status === 'failed'
                  ? 'Retry offline preparation'
                  : 'Prepare material offline'
            }
            onPress={() => void handleProcess()}
          />
        ) : null}

        {isReady && topics.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.heroCard}>
            <Ionicons name="map-outline" color="#4A50CE" size={30} />
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Build your learning roadmap
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Gemma will organize the indexed passages into ordered, traceable topics.
              If structured generation fails, the app falls back to the material’s
              stored sections.
            </ThemedText>
            <PrimaryButton
              disabled={isGeneratingRoadmap}
              label={
                isGeneratingRoadmap
                  ? 'Generating roadmap locally…'
                  : 'Generate topic roadmap'
              }
              leading={
                isGeneratingRoadmap ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : undefined
              }
              onPress={() => void handleGenerateRoadmap()}
            />
          </ThemedView>
        ) : null}

        {topics.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.flex}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Learning roadmap
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {topics.length} topics · {coverage} of {material.chunkCount} passages
                  covered
                </ThemedText>
              </View>
              <Ionicons name="git-network-outline" color={theme.text} size={24} />
            </View>

            {topics.map((topic) => (
              <Pressable key={topic.id} onPress={() => openTopic(topic.id)}>
                <ThemedView type="backgroundElement" style={styles.topicCard}>
                  <Ionicons
                    name={statusIcon(topic)}
                    color={topic.status === 'needs_review' ? '#C77D00' : '#4A50CE'}
                    size={24}
                  />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">
                      {topic.position + 1}. {topic.title}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {topic.summary}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {topic.sourceChunkIds.length} source passage
                      {topic.sourceChunkIds.length === 1 ? '' : 's'}
                      {topic.bestScore !== null
                        ? ` · Best score ${Math.round(topic.bestScore)}%`
                        : ''}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" color={theme.textSecondary} size={20} />
                </ThemedView>
              </Pressable>
            ))}

            {continueTopic ? (
              <PrimaryButton
                label={
                  continueTopic.status === 'not_started'
                    ? 'Start learning'
                    : 'Continue learning'
                }
                onPress={() => openTopic(continueTopic.id)}
              />
            ) : null}
          </View>
        ) : null}

        {isReady ? (
          <ThemedView type="backgroundElement" style={styles.searchCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="search-outline" color={theme.text} size={22} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Inspect local retrieval</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Optional diagnostic: see the exact passages later used by lessons and
                  chat.
                </ThemedText>
              </View>
            </View>
            <TextInput
              accessibilityLabel="Question or search terms"
              multiline
              onChangeText={setQuery}
              placeholder="What does Second Normal Form add?"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { borderColor: theme.backgroundSelected, color: theme.text },
              ]}
              value={query}
            />
            <PrimaryButton
              disabled={isSearching || query.trim().length < 3}
              label={isSearching ? 'Searching locally…' : 'Find source passages'}
              onPress={() => void handleSearch()}
              variant="secondary"
            />
          </ThemedView>
        ) : null}

        {results.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Most relevant local evidence</ThemedText>
            {results.map((result) => (
              <ThemedView
                key={result.chunkId}
                type="backgroundElement"
                style={styles.resultCard}>
                <ThemedText type="smallBold">{result.sourceLabel}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {result.content}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}

        {isReady ? (
          <PrimaryButton
            label="Ask this material"
            onPress={() =>
              router.push({
                pathname: '/material/[materialId]/chat',
                params: { materialId },
              })
            }
            variant="secondary"
          />
        ) : null}

        <ThemedView type="backgroundElement" style={styles.limitCard}>
          <ThemedText type="smallBold">Private and offline after setup</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Files, learning history, and answers stay on this device. Generated content
            can be wrong, so factual views expose their stored source excerpts. Scanned
            PDFs are not supported in this build.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
  },
  statusCard: {
    borderRadius: 18,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  heroCard: {
    borderRadius: 22,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: { flex: 1, gap: Spacing.one },
  cardTitle: { fontSize: 24, lineHeight: 30 },
  section: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  sectionTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  topicCard: {
    alignItems: 'flex-start',
    borderRadius: 18,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  searchCard: {
    borderRadius: 18,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 82,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  resultCard: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  limitCard: {
    borderRadius: 18,
    gap: Spacing.one,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
});
