import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

function iconForStatus(status: Topic['status']) {
  if (status === 'completed') return 'checkmark-circle' as const;
  if (status === 'needs_review') return 'refresh-circle' as const;
  if (status === 'learning') return 'play-circle' as const;
  return 'ellipse-outline' as const;
}

export function TopicCard({ topic, onPress }: { topic: Topic; onPress: () => void }) {
  const theme = useTheme();
  const statusText =
    topic.status === 'completed'
      ? 'Completed'
      : topic.status === 'needs_review'
        ? 'Needs review'
        : topic.status === 'learning'
          ? 'In progress'
          : 'Not started';
  const statusColor =
    topic.status === 'completed'
      ? theme.success
      : topic.status === 'needs_review'
        ? theme.warning
        : theme.primary;

  return (
    <Pressable
      accessibilityHint="Opens this topic"
      accessibilityLabel={`Topic ${topic.position + 1}, ${topic.title}. ${statusText}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.surfaceSelected : 'transparent',
          borderBottomColor: theme.border,
        },
      ]}>
      <Ionicons name={iconForStatus(topic.status)} color={statusColor} size={24} />
      <View style={styles.flex}>
        <ThemedText type="smallBold">
          {topic.position + 1}. {topic.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {topic.summary}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          About {Math.max(5, topic.sourceChunkIds.length * 3)} min ·{' '}
          {topic.sourceChunkIds.length} source passage
          {topic.sourceChunkIds.length === 1 ? '' : 's'}
          {topic.bestScore === null ? '' : ` · Latest ${Math.round(topic.bestScore)}%`}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" color={theme.textMuted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    borderCurve: 'continuous',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 88,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  flex: { flex: 1, gap: Spacing.one },
});
