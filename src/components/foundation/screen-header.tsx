import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ScreenHeader({ eyebrow, title, subtitle, action }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.heading}>
          <ThemedText type="smallBold" style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  heading: {
    flex: 1,
    gap: Spacing.one,
  },
  eyebrow: {
    color: '#4A50CE',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    maxWidth: 620,
  },
});
