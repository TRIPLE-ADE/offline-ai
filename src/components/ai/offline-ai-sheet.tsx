import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheet,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { embeddingRuntime } from '@/ai/embedding-runtime';
import { generationRuntime } from '@/ai/generation-runtime';
import {
  saveModelInstallationState,
} from '@/ai/model-installation-state';
import { inspectOfflineResources } from '@/ai/offline-resource-state';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useOfflineAiCapability } from '@/hooks/use-offline-ai-capability';
import { useTheme } from '@/hooks/use-theme';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useRuntimeStore } from '@/stores/runtime-store';
import { toast } from '@/utils/app-toast';

function DownloadWakeLock() {
  useKeepAwake('learn-guide-offline-ai-sheet');
  return null;
}

export function OfflineAiSheet() {
  const theme = useTheme();
  const close = useAppOverlayStore((state) => state.closeOfflineAi);
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const {
    availability,
    availabilityMessage,
    available: installed,
    checking,
    installationMessage,
    installationPhase,
    retryVerification,
  } = useOfflineAiCapability();
  const installPromise = useRef<Promise<void> | null>(null);
  const verificationFailed = availability === 'error';
  const installing =
    generation.phase === 'loading' ||
    generation.phase === 'downloading' ||
    embedding.phase === 'loading' ||
    embedding.phase === 'downloading';
  const progress = useMemo(
    () =>
      installed
        ? 1
        : Math.max(
            0,
            Math.min(1, (generation.progress + embedding.progress) / 2)
          ),
    [embedding.progress, generation.progress, installed]
  );

  const install = useCallback(() => {
    if (installPromise.current) {
      return installPromise.current;
    }
    if (installed) {
      close();
      return Promise.resolve();
    }

    saveModelInstallationState(
      installationPhase === 'failed' ? 'retrying' : 'downloading'
    );
    const work = embeddingRuntime
      .load()
      .then(() => generationRuntime.load())
      .then(() => inspectOfflineResources())
      .then(({ embeddingInstalled, generationInstalled }) => {
        if (!embeddingInstalled || !generationInstalled) {
          throw new Error('The offline AI resources could not be verified.');
        }
        saveModelInstallationState('ready');
        toast.success('Offline AI is ready', {
          description: 'Lessons, quizzes, summaries, and chat can now run privately.',
        });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error
            ? error.message
            : 'The download paused. Check your connection and try again.';
        saveModelInstallationState('failed', message);
        toast.error('Offline AI download paused', { description: message });
      })
      .finally(() => {
        installPromise.current = null;
      });

    installPromise.current = work;
    return work;
  }, [close, installationPhase, installed]);

  const retryCheck = useCallback(() => {
    void retryVerification().catch(() => {
      toast.error('Offline AI could not be checked');
    });
  }, [retryVerification]);

  return (
    <BottomSheet
      enablePanDownToClose
      index={0}
      onClose={close}
      onDismiss={close}
      enableDynamicSizing={true}
    >
      <BottomSheetView
        style={[
          styles.container,
          { backgroundColor: theme.surfaceElevated },
        ]}
      >
        {installing ? <DownloadWakeLock /> : null}
        <View style={styles.heading}>
          <View
            style={[styles.icon, { backgroundColor: theme.primarySoft }]}
          >
            <Ionicons
              color={
                installed
                  ? theme.success
                  : verificationFailed
                    ? theme.danger
                    : theme.primary
              }
              name={
                installed
                  ? 'checkmark-circle'
                  : verificationFailed
                    ? 'alert-circle-outline'
                    : 'hardware-chip-outline'
              }
              size={30}
            />
          </View>
          <View style={styles.flex}>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              PRIVATE · ON DEVICE
            </ThemedText>
            <ThemedText type="title">Offline AI</ThemedText>
          </View>
        </View>

        {checking ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText themeColor="textSecondary">
              Checking offline resources…
            </ThemedText>
          </View>
        ) : installed ? (
          <View style={styles.content}>
            <ThemedText type="heading">Ready for private study</ThemedText>
            <ThemedText themeColor="textSecondary">
              Your local models are installed. Imported material can be prepared,
              searched, explained, and tested without sending it to a server.
            </ThemedText>
            <PrimaryButton label="Done" onPress={close} />
          </View>
        ) : (
          <View style={styles.content}>
            <ThemedText type="heading">
              {verificationFailed
                ? 'Check the stored resources'
                : installationPhase === 'failed' ||
                    installationPhase === 'downloading' ||
                    installationPhase === 'retrying'
                ? 'Ready to retry'
                : 'Download when you are ready'}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {verificationFailed
                ? 'Check the private AI files already stored on this device. If they are missing, LearnGuide will offer the download afterward.'
                : 'The one-time download enables grounded lessons, quizzes, summaries, and chat entirely on this device. You can dismiss this sheet and continue exploring at any time.'}
            </ThemedText>

            {installing ? (
              <View style={styles.progress}>
                <ProgressBar
                  accessibilityLabel="Offline AI download progress"
                  value={progress}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {progress > 0
                    ? `${Math.round(progress * 100)}% downloaded`
                    : 'Preparing download…'}
                </ThemedText>
              </View>
            ) : availabilityMessage || installationMessage ? (
              <View
                style={[
                  styles.note,
                  {
                    backgroundColor: theme.warningSoft,
                    borderColor: theme.milestone,
                  },
                ]}
              >
                <Ionicons
                  color={theme.warning}
                  name="information-circle-outline"
                  size={20}
                />
                <ThemedText type="small" style={styles.flex}>
                  {availabilityMessage ?? installationMessage}
                </ThemedText>
              </View>
            ) : null}

            <PrimaryButton
              disabled={installing}
              label={
                installing
                  ? 'Downloading offline AI…'
                  : verificationFailed
                    ? 'Check again'
                  : installationPhase === 'failed' ||
                      installationPhase === 'downloading' ||
                      installationPhase === 'retrying'
                    ? 'Retry download'
                    : 'Download offline AI'
              }
              loading={installing}
              onPress={verificationFailed ? retryCheck : () => void install()}
            />
            <PrimaryButton
              label={installing ? 'Continue exploring' : 'Not now'}
              onPress={close}
              variant="tertiary"
            />
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.four,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  flex: { flex: 1 },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  progress: { gap: Spacing.two },
  note: {
    alignItems: 'flex-start',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
