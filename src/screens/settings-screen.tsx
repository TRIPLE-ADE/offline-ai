import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/foundation/status-badge';
import { inspectOfflineResources } from '@/ai/offline-resource-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { useTheme } from '@/hooks/use-theme';
import { isOfflineAiInstalled } from '@/hooks/use-learning-feature-access';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';
import { useRuntimeStore } from '@/stores/runtime-store';
import { useModelInstallationStore } from '@/ai/model-installation-state';
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

const APPEARANCE_OPTIONS: { label: string; value: AppearancePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function offlineAiCopy(
  phase: ReturnType<typeof useModelInstallationStore.getState>['phase'],
  installed: boolean
) {
  if (installed) {
    return {
      badge: 'Ready offline',
      description: 'Material search and explanations are ready without internet.',
    };
  }
  if (phase === 'downloading' || phase === 'retrying') {
    return {
      badge: phase === 'retrying' ? 'Retrying download' : 'Downloading',
      description: 'The offline resources are downloading. You can keep exploring the app.',
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
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const modelInstallationPhase = useModelInstallationStore((state) => state.phase);
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const ready = isOfflineAiInstalled(generation, embedding);
  const resourceCopy = offlineAiCopy(modelInstallationPhase, ready);
  const [materialStorage, setMaterialStorage] = useState('Calculating…');
  const appearance = useAppearanceStore((state) => state.preference);

  const updateAppearance = (preference: AppearancePreference) => {
    setAppearancePreference(preference);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void inspectOfflineResources().catch(() => null);
      void new MaterialRepository(db).list().then((materials) => {
        if (!active) return;
        const bytes = materials.reduce((sum, material) => sum + (material.fileSize ?? 0), 0);
        setMaterialStorage(
          bytes >= 1_048_576
            ? `${(bytes / 1_048_576).toFixed(1)} MB across ${materials.length} material${materials.length === 1 ? '' : 's'}`
            : `${Math.round(bytes / 1024)} KB across ${materials.length} material${materials.length === 1 ? '' : 's'}`
        );
      });
      return () => {
        active = false;
      };
    }, [db])
  );

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
          router.replace('/home');
          toast.success('Local learning data deleted');
        })().catch(() => toast.error('Local learning data could not be deleted'));
      },
      title: 'Delete all local learning data?',
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
              <View style={[styles.resourceIcon, { backgroundColor: ready ? theme.successSoft : theme.primarySoft }]}>
                <Ionicons
                  name={ready ? 'checkmark-circle-outline' : 'download-outline'}
                  color={ready ? theme.success : theme.primary}
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
              tone={ready ? 'offline' : 'working'}
            />
            <Pressable
              accessibilityRole="button"
              onPress={openOfflineAi}
              style={styles.manageAction}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {ready ? 'Manage offline resources' : 'Download or retry'}
              </ThemedText>
              <Ionicons name="arrow-forward" color={theme.primary} size={18} />
            </Pressable>
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
