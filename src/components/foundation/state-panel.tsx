import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatePanelProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tone?: 'neutral' | 'error' | 'success';
};

export function StatePanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone = 'neutral',
}: StatePanelProps) {
  const theme = useTheme();
  const accent =
    tone === 'error' ? theme.danger : tone === 'success' ? theme.success : theme.primary;
  const soft =
    tone === 'error'
      ? theme.dangerSoft
      : tone === 'success'
        ? theme.successSoft
        : theme.primarySoft;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Ionicons name={icon} color={accent} size={28} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="subtitle" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{body}</ThemedText>
      </View>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <PrimaryButton label={secondaryLabel} onPress={onSecondary} variant="tertiary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xlarge,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  copy: { gap: Spacing.two },
  title: { fontSize: 24, lineHeight: 30 },
});
