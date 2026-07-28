import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SnackbarProps = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  tone?: 'neutral' | 'success' | 'error';
};

export function Snackbar({
  visible,
  message,
  actionLabel,
  onAction,
  onDismiss,
  tone = 'neutral',
}: SnackbarProps) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  const accent =
    tone === 'success' ? theme.success : tone === 'error' ? theme.error : theme.primary;
  const icon = tone === 'success' ? 'checkmark-circle' : tone === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.borderStrong,
          shadowColor: theme.shadow,
        },
      ]}>
      <Ionicons accessibilityElementsHidden color={accent} name={icon} size={22} />
      <ThemedText style={styles.message}>{message}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && { backgroundColor: theme.surfaceSelected }]}>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
      {onDismiss ? (
        <Pressable
          accessibilityLabel="Dismiss message"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismiss, pressed && { backgroundColor: theme.surfaceSelected }]}>
          <Ionicons color={theme.textSecondary} name="close" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    margin: Spacing.three,
    minHeight: TouchTarget + 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...Elevation.floating,
  },
  message: {
    flex: 1,
  },
  action: {
    borderRadius: Radius.small,
    justifyContent: 'center',
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
  },
  dismiss: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
});
