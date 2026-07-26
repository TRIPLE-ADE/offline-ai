import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { generationRuntime } from '@/ai/generation-runtime';
import { embeddingRuntime } from '@/ai/embedding-runtime';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { RuntimeCard } from '@/components/foundation/runtime-card';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRuntimeStore } from '@/stores/runtime-store';

export default function SetupScreen() {
  const router = useRouter();
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="One-time download"
          title="Private models, stored locally"
          subtitle="The simulator and emulator can verify the native application. Download and inference should be validated on your physical Android device last."
        />

        <RuntimeCard
          title="MiniLM embeddings"
          detail="Creates the local search index used for source-grounded retrieval."
          state={embedding}
          actionLabel={embedding.phase === 'ready' ? undefined : 'Load MiniLM'}
          onAction={() => void embeddingRuntime.load().catch(() => undefined)}
        />

        <RuntimeCard
          title="Gemma 4 E2B"
          detail="Generates topic maps, lessons, quizzes, recommendations, and material answers."
          state={generation}
          actionLabel={generation.phase === 'ready' ? undefined : 'Load Gemma'}
          onAction={() => void generationRuntime.load().catch(() => undefined)}
        />

        <PrimaryButton label="Continue to library" onPress={() => router.replace('/')} />
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
  note: {
    borderRadius: 16,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
