import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { useTheme } from '@/hooks/use-theme';
import { offlineVectorIndex } from '@/retrieval/offline-vector-index';
import { useRuntimeStore } from '@/stores/runtime-store';

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
  const ready = generation.phase === 'ready' && embedding.phase === 'ready';
  const [materialStorage, setMaterialStorage] = useState('Calculating…');

  useFocusEffect(
    useCallback(() => {
      let active = true;
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
    Alert.alert(
      'Delete all chat history?',
      'This permanently deletes every saved question and answer. Materials, lessons, assessment results, and progress remain.',
      [
        { text: 'Keep chat history', style: 'cancel' },
        {
          text: 'Delete chat history',
          style: 'destructive',
          onPress: () => void db.runAsync('DELETE FROM chat_messages'),
        },
      ]
    );

  const deleteAll = () =>
    Alert.alert(
      'Delete all local learning data?',
      'This permanently deletes every imported material, lesson, question, answer, assessment result, recommendation, and progress record from this device. Offline AI resources remain installed.',
      [
        { text: 'Keep my data', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const materials = await new MaterialRepository(db).list();
              for (const material of materials) {
                await offlineVectorIndex.deleteMaterial(material.id);
                const file = new File(material.localUri);
                if (file.exists) file.delete();
              }
              await new MaterialRepository(db).deleteAll();
              router.replace('/library');
            })();
          },
        },
      ]
    );

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
                borderTopColor: theme.secondary,
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
                  {ready
                    ? 'Material search and explanations are ready without internet.'
                    : 'Finish the one-time setup before preparing and studying materials.'}
                </ThemedText>
              </View>
            </View>
            <StatusBadge label={ready ? 'Ready offline' : 'Setup incomplete'} tone={ready ? 'offline' : 'working'} />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/setup')}
              style={styles.manageAction}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>Manage offline resources</ThemedText>
              <Ionicons name="arrow-forward" color={theme.primary} size={18} />
            </Pressable>
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: theme.surfaceElevated, borderColor: theme.border },
            ]}>
            <ThemedText type="caption" themeColor="textSecondary">READING AND ACCESSIBILITY</ThemedText>
            <SettingsRow icon="contrast-outline" label="Appearance" value="Follows device setting" />
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
              label="Soma Offline"
              value={`Version ${Constants.expoConfig?.version ?? '1.0.0'} · Hackathon MVP`}
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
  note: {
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    gap: Spacing.two,
    marginBottom: Spacing.three,
    marginTop: Spacing.three,
    padding: Spacing.three,
  },
});
