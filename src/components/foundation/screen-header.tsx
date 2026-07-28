import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
};

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
  compact = false,
}: ScreenHeaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={[styles.brandRule, { backgroundColor: theme.secondary }]} />
      <View style={styles.headingRow}>
        <View style={styles.heading}>
          {eyebrow ? (
            <View style={[styles.eyebrowRow, { backgroundColor: theme.primarySoft }]}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                {eyebrow.toUpperCase()}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText type={compact ? 'title' : 'display'}>{title}</ThemedText>
        </View>
        {action}
      </View>
      {subtitle ? (
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
  },
  brandRule: { borderRadius: 2, height: 4, width: 44 },
  compact: { paddingTop: Spacing.three },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  heading: { flex: 1, gap: Spacing.two },
  eyebrowRow: {
    alignSelf: 'flex-start',
    borderRadius: 5,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  subtitle: { maxWidth: 620 },
});
