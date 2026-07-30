import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  getDeviceModelMemoryPolicy,
  type ModelMemoryPolicy,
} from '@/ai/model-memory-policy';
import { removeOfflineResources } from '@/ai/offline-resource-state';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { OfflineAiAvailability } from '@/ai/model-capability';
import type { ModelInstallationPhase } from '@/ai/model-installation-state';
import { useOfflineAiCapability } from '@/hooks/use-offline-ai-capability';
import { useTheme } from '@/hooks/use-theme';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';
import {
  showActionSheet,
  useAppOverlayStore,
} from '@/stores/app-overlay-store';
import {
  setAppearancePreference,
  useAppearanceStore,
  type AppearancePreference,
} from '@/theme/appearance';
import { toast } from '@/utils/app-toast';
import { userFacingError } from '@/utils/user-facing-error';
import {
  beginOptimisticLearningDataDeletion,
  endOptimisticLearningDataDeletion,
  refreshLearningOverview,
  restoreOptimisticLearningDataDeletion,
  useLearningOverviewStore,
} from '@/stores/learning-overview-store';

const APPEARANCE_OPTIONS: { label: string; value: AppearancePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function offlineAiCopy(
  phase: ModelInstallationPhase,
  availability: OfflineAiAvailability,
  memoryPolicy: ModelMemoryPolicy,
  removing: boolean
) {
  if (removing) {
    return {
      badge: 'Removing',
      description:
        'Releasing model memory and removing the private AI files from this device.',
    };
  }
  if (memoryPolicy.support === 'unsupported') {
    return {
      badge: 'Not supported',
      description:
        'This device does not have enough memory to run the offline AI safely.',
    };
  }
  if (availability === 'checking') {
    return {
      badge: 'Checking resources',
      description: 'Confirming the private AI resources stored on this device.',
    };
  }
  if (availability === 'error') {
    return {
      badge: 'Check needed',
      description: 'LearnGuide could not confirm the stored offline AI resources.',
    };
  }
  if (availability === 'available') {
    return {
      badge: 'Ready offline',
      description: 'Material search and explanations are ready without internet.',
    };
  }
  if (phase === 'downloading' || phase === 'retrying') {
    return {
      badge: 'Download incomplete',
      description:
        'The previous download did not finish. Retry whenever it suits you.',
    };
  }
  if (phase === 'failed') {
    return {
      badge: 'Ready to retry',
      description: 'The last download paused. Retry whenever it suits you.',
    };
  }
  if (phase === 'skipped') {
    return {
      badge: 'Download later',
      description: 'Explore now and download the private AI model when you are ready.',
    };
  }
  return {
    badge: 'Not downloaded',
    description: 'Download the private AI model whenever you want offline study features.',
  };
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  busy = false,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || !onPress;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ busy, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.row,
        { borderBottomColor: theme.divider },
        disabled && styles.disabledRow,
      ]}>
      <Ionicons name={icon} color={destructive ? theme.danger : theme.textSecondary} size={22} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" style={destructive ? { color: theme.danger } : undefined}>
          {label}
        </ThemedText>
        {value ? <ThemedText type="small" themeColor="textSecondary">{value}</ThemedText> : null}
      </View>
      {busy ? (
        <ActivityIndicator
          color={destructive ? theme.danger : theme.primary}
          size="small"
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" color={theme.textTertiary} size={20} />
      ) : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const memoryPolicy = getDeviceModelMemoryPolicy();
  const [clearingChat, setClearingChat] = useState(false);
  const clearingChatRef = useRef(false);
  const deletingAllDataRef = useRef(false);
  const mountedRef = useRef(true);
  const {
    availability,
    available: ready,
    checking,
    installationPhase: modelInstallationPhase,
    resourceRemovalActive: removingOfflineAi,
    retryVerification,
  } = useOfflineAiCapability();
  const resourceCopy = offlineAiCopy(
    modelInstallationPhase,
    availability,
    memoryPolicy,
    removingOfflineAi
  );
  const canRemoveOfflineAi =
    ready ||
    modelInstallationPhase === 'ready' ||
    modelInstallationPhase === 'failed' ||
    modelInstallationPhase === 'downloading' ||
    modelInstallationPhase === 'retrying';
  const handleResourceAction =
    memoryPolicy.support === 'unsupported'
      ? openOfflineAi
      : availability === 'error'
      ? () => {
          void retryVerification().catch(() => {
            toast.error('Offline AI could not be checked');
          });
        }
      : openOfflineAi;
  const materials = useLearningOverviewStore((state) => state.materials);
  const materialStorage = useMemo(() => {
    const bytes = materials.reduce(
      (sum, item) => sum + (item.material.fileSize ?? 0),
      0
    );
    return bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1)} MB across ${materials.length} material${materials.length === 1 ? '' : 's'}`
      : `${Math.round(bytes / 1024)} KB across ${materials.length} material${materials.length === 1 ? '' : 's'}`;
  }, [materials]);
  const appearance = useAppearanceStore((state) => state.preference);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateAppearance = (preference: AppearancePreference) => {
    setAppearancePreference(preference);
  };

  const clearChat = () =>
    showActionSheet({
      actionLabel: 'Delete chat',
      cancelLabel: 'Keep chat',
      description:
        'Every saved question and answer will be removed. Materials, lessons, results, and progress remain.',
      destructive: true,
      onAction: () => {
        if (clearingChatRef.current) {
          return;
        }
        clearingChatRef.current = true;
        setClearingChat(true);
        const deletion = db.runAsync('DELETE FROM chat_messages').finally(() => {
          clearingChatRef.current = false;
          if (mountedRef.current) {
            setClearingChat(false);
          }
        });
        toast.promise(deletion, {
          loading: 'Deleting chat history…',
          success: () => 'Chat history deleted',
          error: () => 'Chat history could not be deleted',
        });
      },
      title: 'Delete all chat history?',
    });

  const deleteAll = () =>
    showActionSheet({
      actionLabel: 'Delete everything',
      cancelLabel: 'Keep my data',
      description:
        'This permanently removes every material, lesson, chat, result, recommendation, and progress record. Offline AI remains installed.',
      destructive: true,
      onAction: () => {
        if (deletingAllDataRef.current) {
          return;
        }
        deletingAllDataRef.current = true;
        const optimisticSnapshot = beginOptimisticLearningDataDeletion();
        router.replace('/home');

        const deletion = (async () => {
          try {
            const repository = new MaterialRepository(db);
            const storedMaterials = await repository.list();
            await repository.deleteAll();
            endOptimisticLearningDataDeletion(optimisticSnapshot);
            await refreshLearningOverview();

            let cleanupIncomplete = false;
            for (const material of storedMaterials) {
              try {
                await offlineVectorIndex.deleteMaterial(material.id);
              } catch (error) {
                cleanupIncomplete = true;
                console.warn(
                  `Vector cleanup failed for deleted material ${material.id}.`,
                  error
                );
              }
              try {
                const file = new File(material.localUri);
                if (file.exists) {
                  file.delete();
                }
              } catch (error) {
                cleanupIncomplete = true;
                console.warn(
                  `File cleanup failed for deleted material ${material.id}.`,
                  error
                );
              }
            }
            return { cleanupIncomplete };
          } catch (error) {
            restoreOptimisticLearningDataDeletion(optimisticSnapshot);
            await refreshLearningOverview();
            throw error;
          } finally {
            deletingAllDataRef.current = false;
          }
        })();

        toast.promise(deletion, {
          loading: 'Deleting local learning data…',
          success: ({ cleanupIncomplete }) =>
            cleanupIncomplete
              ? 'Learning data deleted; some unused storage could not be reclaimed'
              : 'Local learning data deleted',
          error: () =>
            'Local learning data could not be deleted. It has been restored.',
        });
      },
      title: 'Delete all local learning data?',
    });

  const removeOfflineAi = () =>
    showActionSheet({
      actionLabel: 'Remove offline AI',
      cancelLabel: 'Keep resources',
      description:
        'This removes the downloaded AI files and releases their memory. Your materials, lessons, results, progress, and chat stay on this device.',
      destructive: true,
      onAction: () => {
        if (removingOfflineAi) {
          return;
        }
        const removal = removeOfflineResources();
        toast.promise(removal, {
          loading: 'Removing offline AI…',
          success: () => 'Offline AI removed',
          error: (error: unknown) =>
            userFacingError(
              error,
              'Offline AI could not be removed. Finish any active study task, then retry.'
            ),
        });
      },
      title: 'Remove downloaded offline AI?',
    });

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.intro} themeColor="textSecondary">
            Manage offline resources, accessibility preferences, privacy, and local learning data.
          </ThemedText>

          <View
            style={[
              styles.resource,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopColor: theme.primary,
              },
            ]}>
              <View style={styles.resourceHeading}>
                <View style={[styles.resourceIcon, { backgroundColor: ready && memoryPolicy.support === 'supported' ? theme.successSoft : theme.primarySoft }]}>
                  <Ionicons
                  name={
                    removingOfflineAi
                      ? 'hourglass-outline'
                      : ready && memoryPolicy.support === 'supported'
                      ? 'checkmark-circle-outline'
                      : memoryPolicy.support === 'unsupported'
                        ? 'alert-circle-outline'
                      : availability === 'error'
                        ? 'alert-circle-outline'
                        : 'download-outline'
                  }
                  color={
                    ready && memoryPolicy.support === 'supported'
                      ? theme.success
                      : memoryPolicy.support === 'unsupported'
                        ? theme.danger
                      : availability === 'error'
                        ? theme.danger
                        : theme.primary
                  }
                  size={28}
                />
              </View>
              <View style={styles.flex}>
                <ThemedText type="subtitle">Offline AI</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {resourceCopy.description}
                </ThemedText>
              </View>
            </View>
            <StatusBadge
              label={resourceCopy.badge}
              tone={
                ready && memoryPolicy.support === 'supported'
                  ? 'offline'
                  : removingOfflineAi
                    ? 'working'
                  : availability === 'error' ||
                      memoryPolicy.support === 'unsupported'
                    ? 'error'
                    : checking
                      ? 'neutral'
                      : 'working'
              }
            />
            {!checking && !removingOfflineAi ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleResourceAction}
                style={styles.manageAction}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {ready
                    ? 'View offline AI'
                    : memoryPolicy.support === 'unsupported'
                      ? 'Why it’s unavailable'
                    : availability === 'error'
                      ? 'Check again'
                      : 'Download or retry'}
                </ThemedText>
                <Ionicons name="arrow-forward" color={theme.primary} size={18} />
              </Pressable>
            ) : null}
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">READING AND ACCESSIBILITY</ThemedText>
            <View style={[styles.appearanceRow, { borderBottomColor: theme.divider }]}>
              <View style={styles.appearanceHeading}>
                <Ionicons name="contrast-outline" color={theme.textSecondary} size={22} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">Appearance</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Choose a comfortable reading theme
                  </ThemedText>
                </View>
              </View>
              <View
                accessibilityLabel="Appearance"
                accessibilityRole="radiogroup"
                style={[styles.appearanceControl, { backgroundColor: theme.backgroundElement }]}>
                {APPEARANCE_OPTIONS.map((option) => {
                  const selected = appearance === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => updateAppearance(option.value)}
                      style={({ pressed }) => [
                        styles.appearanceOption,
                        selected && {
                          backgroundColor: theme.surfaceSelected,
                          borderColor: theme.primary,
                        },
                        pressed && !selected && { backgroundColor: theme.surfaceTint },
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: selected ? theme.primary : theme.textSecondary }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <SettingsRow icon="text-outline" label="Text size" value="Follows device text size" />
            <SettingsRow icon="accessibility-outline" label="Reduce motion" value="Follows device preference" />
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">PRIVACY AND LOCAL DATA</ThemedText>
            <SettingsRow icon="folder-open-outline" label="Material storage" value={materialStorage} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy"
              value="No account, cloud sync, or server-side AI"
            />
            <SettingsRow
              busy={clearingChat}
              disabled={clearingChat}
              icon="chatbubbles-outline"
              label={clearingChat ? 'Deleting chat history…' : 'Delete all chat history'}
              onPress={clearChat}
            />
            {canRemoveOfflineAi ? (
              <SettingsRow
                destructive
                icon="hardware-chip-outline"
                label={
                  removingOfflineAi
                    ? 'Removing offline AI…'
                    : 'Remove downloaded offline AI'
                }
                busy={removingOfflineAi}
                disabled={removingOfflineAi}
                onPress={removeOfflineAi}
              />
            ) : null}
            <SettingsRow
              destructive
              icon="trash-outline"
              label="Delete all local learning data"
              onPress={deleteAll}
            />
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">ABOUT</ThemedText>
            <SettingsRow
              icon="information-circle-outline"
              label={Brand.name}
              value={`Version ${Constants.expoConfig?.version ?? '1.0.0'} · ${Brand.tagline}`}
            />
            <View style={[styles.note, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Current material support</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                TXT and PDFs with selectable text. Scanned or password-protected PDFs are not supported yet. Generated explanations can be wrong; use the attached sources to verify important details.
              </ThemedText>
            </View>
          </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: Spacing.four, paddingBottom: Spacing.six, paddingTop: Spacing.three },
  intro: { paddingHorizontal: Spacing.four },
  resource: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderTopWidth: 4,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  resourceHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  resourceIcon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  flex: { flex: 1 },
  disabledRow: { opacity: 0.64 },
  manageAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: TouchTarget,
  },
  section: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    marginHorizontal: Spacing.four,
    overflow: 'hidden',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 68,
    paddingVertical: Spacing.two,
  },
  appearanceRow: {
    borderBottomWidth: 1,
    gap: Spacing.three,
    paddingBottom: Spacing.three,
    paddingTop: Spacing.three,
  },
  appearanceHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  appearanceControl: {
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    padding: Spacing.one,
  },
  appearanceOption: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
  },
  note: {
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    gap: Spacing.two,
    marginBottom: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
  },
});
