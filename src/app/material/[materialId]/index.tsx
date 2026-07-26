import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import type { Material } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { materialProcessingService } from '@/materials/process-material';
import {
  retrieveGroundedPassages,
  type GroundedPassage,
} from '@/retrieval/grounded-retrieval';
import { useRuntimeStore } from '@/stores/runtime-store';

export default function MaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const embedding = useRuntimeStore((state) => state.embedding);
  const [material, setMaterial] = useState<Material | null>(null);
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroundedPassage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadMaterial = useCallback(async () => {
    const nextMaterial = await new MaterialRepository(db).getById(materialId);
    setMaterial(nextMaterial);
    setProcessingMessage(nextMaterial?.statusMessage ?? null);
  }, [db, materialId]);

  useEffect(() => {
    let active = true;

    void new MaterialRepository(db).getById(materialId).then((nextMaterial) => {
      if (active) {
        setMaterial(nextMaterial);
        setProcessingMessage(nextMaterial?.statusMessage ?? null);
      }
    });

    return () => {
      active = false;
    };
  }, [db, materialId]);

  const handleProcess = async () => {
    setProcessingError(null);
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to index this material.';
      setProcessingError(message);
      await loadMaterial();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = async () => {
    setSearchError(null);
    setIsSearching(true);

    try {
      setResults(await retrieveGroundedPassages(materialId, query));
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : 'Unable to search this material.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  if (!material) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Loading material…</ThemedText>
      </ThemedView>
    );
  }

  const isBusy = isProcessing;
  const isReady = material.status === 'ready';
  const displayMessage = processingError ?? processingMessage ?? material.statusMessage;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`${material.fileType.toUpperCase()} material`}
          title={material.title}
          subtitle={`Current state: ${material.status.replaceAll('_', ' ')}`}
        />

        <ThemedView type="backgroundElement" style={styles.statusCard}>
          <View style={styles.row}>
            {isBusy ? (
              <ActivityIndicator color="#4A50CE" />
            ) : (
              <Ionicons
                name={isReady ? 'checkmark-circle-outline' : 'shield-checkmark-outline'}
                color={theme.text}
                size={24}
              />
            )}
            <View style={styles.flex}>
              <ThemedText type="smallBold">
                {isReady
                  ? `${material.chunkCount} source passages indexed`
                  : 'Stored privately on this device'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {displayMessage ??
                  'Build a local semantic index before searching this material.'}
              </ThemedText>
              {isBusy &&
              embedding.progress > 0 &&
              embedding.progress < 1 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  MiniLM download · {Math.round(embedding.progress * 100)}%
                </ThemedText>
              ) : null}
            </View>
          </View>
        </ThemedView>

        <PrimaryButton
          disabled={isBusy}
          label={
            isBusy
              ? 'Preparing offline search…'
              : isReady
                ? 'Rebuild offline index'
                : material.status === 'failed'
                  ? 'Retry offline indexing'
                  : ['extracting', 'chunking', 'indexing'].includes(material.status)
                    ? 'Resume offline indexing'
                  : 'Prepare for offline search'
          }
          onPress={() => void handleProcess()}
          variant={isReady ? 'secondary' : 'primary'}
        />

        {isReady ? (
          <ThemedView type="backgroundElement" style={styles.searchCard}>
            <View style={styles.sectionHeading}>
              <Ionicons name="search-outline" color={theme.text} size={22} />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Search grounded passages</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Retrieval runs locally and returns the source text used by later lessons
                  and chat.
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
                {
                  borderColor: theme.backgroundSelected,
                  color: theme.text,
                },
              ]}
              value={query}
            />
            <PrimaryButton
              disabled={isSearching || query.trim().length < 3}
              label={isSearching ? 'Searching locally…' : 'Find source passages'}
              leading={isSearching ? <ActivityIndicator color="#FFFFFF" /> : undefined}
              onPress={() => void handleSearch()}
            />

            {searchError ? (
              <ThemedText type="small" themeColor="textSecondary">
                {searchError}
              </ThemedText>
            ) : null}
          </ThemedView>
        ) : null}

        {results.length > 0 ? (
          <View style={styles.results}>
            <ThemedText type="smallBold">Most relevant local evidence</ThemedText>
            {results.map((result) => (
              <ThemedView
                key={result.chunkId}
                type="backgroundElement"
                style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <ThemedText type="smallBold" style={styles.resultLabel}>
                    {result.sourceLabel}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Math.round(Math.max(0, Math.min(1, result.similarity)) * 100)}%
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {result.content}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : null}

        <PrimaryButton
          variant="secondary"
          label="Open Chat with Material shell"
          onPress={() =>
            router.push({
              pathname: '/material/[materialId]/chat',
              params: { materialId },
            })
          }
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusCard: {
    borderRadius: 18,
    padding: Spacing.three,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  searchCard: {
    borderRadius: 18,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  sectionHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 92,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  results: {
    gap: Spacing.two,
  },
  resultCard: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  resultHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  resultLabel: {
    flex: 1,
  },
});
