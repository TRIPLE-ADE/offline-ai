import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  leading,
  variant = 'primary',
}: PrimaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const filled = variant === 'primary' || variant === 'destructive';
  const foreground = filled ? theme.white : theme.primary;
  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'destructive'
        ? theme.danger
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === 'secondary' && { borderColor: theme.primary, borderWidth: 1.5 },
        variant === 'tertiary' && styles.tertiary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}>
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={foreground} size="small" /> : leading}
        <ThemedText type="smallBold" style={{ color: foreground }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    justifyContent: 'center',
    minHeight: TouchTarget + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  tertiary: {
    alignSelf: 'flex-start',
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
  },
});
