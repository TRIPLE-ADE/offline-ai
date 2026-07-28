import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radius, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  destructive = false,
}: IconButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.surfaceSelected : theme.surfaceElevated,
          borderColor: theme.borderStrong,
        },
        disabled && { backgroundColor: theme.backgroundElement },
      ]}>
      <Ionicons
        color={disabled ? theme.textMuted : destructive ? theme.error : theme.textSecondary}
        name={icon}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
});
