import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/foundation/progress-bar';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import type { Material, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

function materialStatus(material: Material) {
  if (material.sourceFileState !== 'available') {
    return { label: 'Source missing', tone: 'error' as const };
  }
  if (material.status === 'ready') return { label: 'Ready offline', tone: 'ready' as const };
  if (material.status === 'failed') return { label: 'Needs attention', tone: 'error' as const };
  if (material.status === 'imported') return { label: 'Not prepared', tone: 'neutral' as const };
  return { label: 'Preparing locally', tone: 'working' as const };
}

export function MaterialCard({
  material,
  topics,
  onOptionsPress,
  onPress,
}: {
  material: Material;
  topics: Topic[];
  onOptionsPress: () => void;
  onPress: () => void;
}) {
  const theme = useTheme();
  const completed = topics.filter((topic) => topic.status === 'completed').length;
  const progress = topics.length > 0 ? completed / topics.length : 0;
  const status = materialStatus(material);

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityHint="Opens the material overview"
        accessibilityLabel={`${material.title}. ${status.label}`}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? theme.surfaceSelected : theme.background,
            borderColor: pressed ? theme.borderStrong : theme.border,
          },
        ]}>
        <View style={styles.top}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="document-text-outline" color={theme.primary} size={24} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="subtitle" numberOfLines={2}>
              {material.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {material.fileType.toUpperCase()}
              {material.fileSize ? ` · ${(material.fileSize / 1_048_576).toFixed(1)} MB` : ''}
            </ThemedText>
          </View>
          <View style={styles.optionsSpace} />
        </View>
        <StatusBadge label={status.label} tone={status.tone} />
        {topics.length > 0 ? (
          <View style={styles.progress}>
            <ProgressBar value={progress} accessibilityLabel={`${material.title} progress`} />
            <ThemedText type="caption" themeColor="textSecondary">
              {completed} of {topics.length} topics completed
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {material.sourceFileState !== 'available'
              ? 'Import the source again or remove this material.'
              : material.statusMessage ?? 'Open this material to prepare it for study.'}
          </ThemedText>
        )}
      </Pressable>
      <Pressable
        accessibilityHint={`Shows options for ${material.title}`}
        accessibilityLabel={`Options for ${material.title}`}
        accessibilityRole="button"
        hitSlop={Spacing.two}
        onPress={onOptionsPress}
        style={({ pressed }) => [
          styles.options,
          {
            backgroundColor: pressed ? theme.surfaceSelected : theme.backgroundElement,
          },
        ]}>
        <Ionicons
          accessibilityElementsHidden
          color={theme.textSecondary}
          importantForAccessibility="no-hide-descendants"
          name="ellipsis-vertical"
          size={22}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  card: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  top: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  flex: { flex: 1, gap: Spacing.one },
  optionsSpace: {
    width: TouchTarget,
  },
  options: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: TouchTarget / 2,
    height: TouchTarget,
    justifyContent: 'center',
    position: 'absolute',
    right: Spacing.three,
    top: Spacing.three,
    width: TouchTarget,
    zIndex: 1,
  },
  progress: { gap: Spacing.two },
});
