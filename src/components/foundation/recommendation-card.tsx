import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function RecommendationCard({
  eyebrow,
  title,
  subtitle,
  body,
  icon,
  actionLabel,
  onAction,
  secondaryAction,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  body: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  actionLabel: string;
  onAction: () => void;
  secondaryAction?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`${eyebrow}. ${title}. ${body}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceTint,
          borderColor: theme.primarySoft,
          borderLeftColor: theme.secondary,
        },
      ]}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name={icon} color={theme.primary} size={28} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="caption" style={{ color: theme.primary }}>
            {eyebrow}
          </ThemedText>
          <ThemedText type="heading">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <ThemedText themeColor="textSecondary">{body}</ThemedText>
      <PrimaryButton label={actionLabel} onPress={onAction} />
      {secondaryAction}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderLeftWidth: 4,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  icon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  flex: { flex: 1, gap: Spacing.one },
});
