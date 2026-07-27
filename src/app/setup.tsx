import { Ionicons } from '@expo/vector-icons';
import { Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { generationRuntime } from '@/ai/generation-runtime';
import { embeddingRuntime } from '@/ai/embedding-runtime';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { RuntimeCard } from '@/components/foundation/runtime-card';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { completeOnboarding } from '@/onboarding/onboarding-state';
import { useRuntimeStore } from '@/stores/runtime-store';

type SetupStep = 'welcome' | 'privacy' | 'resources';

function formatStorage(bytes: number) {
  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}

export default function SetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [installing, setInstalling] = useState(false);
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const ready = generation.phase === 'ready' && embedding.phase === 'ready';
  const openLibrary = () => {
    completeOnboarding();
    router.replace('/');
  };

  const install = async () => {
    setInstalling(true);
    try {
      await embeddingRuntime.load();
      await generationRuntime.load();
    } catch {
      // Each resource card exposes a specific recovery state.
    } finally {
      setInstalling(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'welcome' ? (
            <>
              <View style={[styles.heroIcon, { backgroundColor: theme.primary }]}>
                <ThemedText type="display" style={styles.heroLetter}>S</ThemedText>
              </View>
              <ScreenHeader
                eyebrow="Soma Offline"
                title="Study clearly, even when the internet isn’t reliable"
                subtitle="Turn your own notes and course PDFs into a guided study path—right on your phone."
                compact
              />
              <View style={styles.benefits}>
                {[
                  ['map-outline', 'See a clear roadmap through large materials'],
                  ['chatbubble-ellipses-outline', 'Ask questions and see the supporting passages'],
                  ['shield-checkmark-outline', 'Keep your files and progress on this device'],
                ].map(([icon, label]) => (
                  <View key={label} style={styles.benefit}>
                    <Ionicons name={icon as never} color={theme.secondary} size={24} />
                    <ThemedText style={styles.flex}>{label}</ThemedText>
                  </View>
                ))}
              </View>
              <PrimaryButton label="Continue" onPress={() => setStep('privacy')} />
              <PrimaryButton label="Go to library" onPress={openLibrary} variant="tertiary" />
            </>
          ) : null}

          {step === 'privacy' ? (
            <>
              <ScreenHeader
                eyebrow="Private by design"
                title="Your material stays on this device"
                subtitle="Soma does not require an account or send your files, conversations, or study progress to a server."
              />
              <View style={[styles.privacyPanel, { backgroundColor: theme.secondarySoft }]}>
                <Ionicons name="phone-portrait-outline" color={theme.secondary} size={32} />
                <ThemedText type="heading">One phone. One private library.</ThemedText>
                <ThemedText themeColor="textSecondary">
                  You can delete a material, its conversation, or all local learning data whenever you choose.
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                An initial resource download needs internet access. After setup, importing, searching, lessons, chat, and assessments work offline.
              </ThemedText>
              <PrimaryButton label="Set up offline AI" onPress={() => setStep('resources')} />
              <PrimaryButton label="Back" onPress={() => setStep('welcome')} variant="tertiary" />
            </>
          ) : null}

          {step === 'resources' ? (
            <>
              <ScreenHeader
                eyebrow="One-time setup"
                title="Install offline AI"
                subtitle="Keep Soma open during the initial download. Wi-Fi is recommended, and you can return later if the download is interrupted."
              />
              <View style={styles.setupFacts}>
                <StatusBadge label="About 2.4 GB" tone="neutral" />
                <StatusBadge
                  label={`${formatStorage(Paths.availableDiskSpace)} available`}
                  tone={Paths.availableDiskSpace > 3_000_000_000 ? 'ready' : 'error'}
                />
              </View>
              <RuntimeCard
                title="Offline material search"
                detail="Finds relevant passages inside your notes without an internet connection."
                state={embedding}
                actionLabel={embedding.phase === 'ready' ? undefined : 'Install search resource'}
                onAction={() => void embeddingRuntime.load().catch(() => undefined)}
              />
              <RuntimeCard
                title="Offline explanations"
                detail="Creates roadmaps, lessons, questions, and grounded answers on this device."
                state={generation}
                actionLabel={generation.phase === 'ready' ? undefined : 'Install study resource'}
                onAction={() => void generationRuntime.load().catch(() => undefined)}
              />
              <View style={styles.actions}>
                {ready ? (
                  <PrimaryButton label="Setup complete — open library" onPress={openLibrary} />
                ) : (
                  <PrimaryButton
                    disabled={installing}
                    label={installing ? 'Installing offline AI…' : 'Install all resources'}
                    loading={installing}
                    onPress={() => void install()}
                  />
                )}
                <PrimaryButton label="Continue later" onPress={openLibrary} variant="tertiary" />
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, gap: Spacing.four, justifyContent: 'center', padding: Spacing.four },
  heroIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: Radius.xlarge,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  heroLetter: { color: '#FFFFFF' },
  benefits: { gap: Spacing.three },
  benefit: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  privacyPanel: { gap: Spacing.three, padding: Spacing.four },
  setupFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  actions: { gap: Spacing.two },
});
