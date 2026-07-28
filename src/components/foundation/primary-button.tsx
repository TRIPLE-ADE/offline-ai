import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  leading,
  variant = 'primary',
  accessibilityLabel,
}: PrimaryButtonProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || loading;
  const filled = variant === 'primary' || variant === 'destructive';
  const foreground = isDisabled
    ? filled
      ? theme.textOnDisabled
      : theme.textMuted
    : filled
      ? theme.textOnPrimary
      : theme.primary;
  const background = isDisabled
    ? filled
      ? theme.primaryDisabled
      : 'transparent'
    : variant === 'primary'
      ? theme.primary
      : variant === 'destructive'
        ? theme.error
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === 'secondary' && !isDisabled && {
          backgroundColor: pressed ? theme.surfaceSelected : theme.surfaceElevated,
          borderColor: theme.borderStrong,
          borderWidth: 1,
        },
        variant === 'tertiary' && styles.tertiary,
        focused && { borderColor: theme.focusRing, borderWidth: 2 },
        pressed &&
          !isDisabled &&
          (filled
            ? {
                backgroundColor: variant === 'destructive' ? theme.error : theme.primaryPressed,
              }
            : styles.pressed),
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

export function SecondaryButton(props: Omit<PrimaryButtonProps, 'variant'>) {
  return <PrimaryButton {...props} variant="secondary" />;
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderCurve: 'continuous',
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
  pressed: { transform: [{ scale: 0.99 }] },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
  },
});
