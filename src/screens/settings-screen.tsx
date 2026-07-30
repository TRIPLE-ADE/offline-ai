import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  refreshLearningOverview,
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
  memoryPolicy: ModelMemoryPolicy
) {
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: theme.divider }]}>
      <Ionicons name={icon} color={destructive ? theme.danger : theme.textSecondary} size={22} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" style={destructive ? { color: theme.danger } : undefined}>
          {label}
        </ThemedText>
        {value ? <ThemedText type="small" themeColor="textSecondary">{value}</ThemedText> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" color={theme.textTertiary} size={20} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const memoryPolicy = getDeviceModelMemoryPolicy();
  const [removingOfflineAi, setRemovingOfflineAi] = useState(false);
  const {
    availability,
    available: ready,
    checking,
    installationPhase: modelInstallationPhase,
    retryVerification,
  } = useOfflineAiCapability();
  const resourceCopy = offlineAiCopy(
    modelInstallationPhase,
    availability,
    memoryPolicy
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
        void db
          .runAsync('DELETE FROM chat_messages')
          .then(() => toast.success('Chat history deleted'))
          .catch(() => toast.error('Chat history could not be deleted'));
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
        void (async () => {
          const materials = await new MaterialRepository(db).list();
          for (const material of materials) {
            await offlineVectorIndex.deleteMaterial(material.id);
            const file = new File(material.localUri);
            if (file.exists) file.delete();
          }
          await new MaterialRepository(db).deleteAll();
          await refreshLearningOverview();
          router.replace('/home');
          toast.success('Local learning data deleted');
        })().catch(() => toast.error('Local learning data could not be deleted'));
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
        setRemovingOfflineAi(true);
        void removeOfflineResources()
          .then(() => {
            toast.success('Offline AI removed', {
              description:
                'You can download it again from Home or Settings whenever you are ready.',
            });
          })
          .catch((error: unknown) => {
            toast.error('Offline AI could not be removed', {
              description: userFacingError(
                error,
                'Finish any active study task, then retry.'
              ),
            });
          })
          .finally(() => setRemovingOfflineAi(false));
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
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                borderTopColor: theme.primary,
              },
            ]}>
              <View style={styles.resourceHeading}>
                <View style={[styles.resourceIcon, { backgroundColor: ready && memoryPolicy.support === 'supported' ? theme.successSoft : theme.primarySoft }]}>
                  <Ionicons
                  name={
                    ready && memoryPolicy.support === 'supported'
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
                  : availability === 'error' ||
                      memoryPolicy.support === 'unsupported'
                    ? 'error'
                    : checking
                      ? 'neutral'
                      : 'working'
              }
            />
            {!checking ? (
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
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
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
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">PRIVACY AND LOCAL DATA</ThemedText>
            <SettingsRow icon="folder-open-outline" label="Material storage" value={materialStorage} />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy"
              value="No account, cloud sync, or server-side AI"
            />
            <SettingsRow icon="chatbubbles-outline" label="Delete all chat history" onPress={clearChat} />
            {canRemoveOfflineAi ? (
              <SettingsRow
                destructive
                icon="hardware-chip-outline"
                label={
                  removingOfflineAi
                    ? 'Removing offline AI…'
                    : 'Remove downloaded offline AI'
                }
                onPress={removingOfflineAi ? undefined : removeOfflineAi}
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
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
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
