import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import type { StoredCitation } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export function CitationControl({
  citation,
  onPress,
  compact = false,
}: {
  citation: StoredCitation;
  onPress: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityHint="Opens the supporting passage"
      accessibilityLabel={`Source ${citation.label}`}
      accessibilityRole="button"
      hitSlop={compact ? 4 : 0}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        compact && styles.compact,
        {
          backgroundColor: pressed ? theme.surfaceSelected : theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <Ionicons name="document-text-outline" color={theme.primary} size={compact ? 15 : 16} />
      <ThemedText type="caption" numberOfLines={1} style={styles.label}>
        {citation.label}
      </ThemedText>
      <Ionicons name="chevron-forward" color={theme.textMuted} size={compact ? 13 : 14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    maxWidth: 260,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
  },
  compact: {
    minHeight: 40,
    paddingHorizontal: Spacing.two,
  },
  label: { flexShrink: 1 },
});
