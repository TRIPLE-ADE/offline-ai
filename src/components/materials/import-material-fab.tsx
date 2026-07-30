import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import {
  Elevation,
  Radius,
  Spacing,
  TouchTarget,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const FAB_SIZE = 60;

export function ImportMaterialFab({
  bottomInset,
  onPress,
}: {
  bottomInset: number;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityHint="Opens the material import sheet"
      accessibilityLabel="Import material"
      accessibilityRole="button"
      hitSlop={Spacing.two}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
          bottom: Math.max(bottomInset, Spacing.two) + Spacing.three,
          shadowColor: theme.shadow,
        },
        pressed && styles.pressed,
      ]}>
      <Ionicons
        accessibilityElementsHidden
        color={theme.textOnPrimary}
        importantForAccessibility="no-hide-descendants"
        name="add"
        size={30}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    ...Elevation.floating,
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    height: FAB_SIZE,
    justifyContent: 'center',
    minHeight: TouchTarget,
    minWidth: TouchTarget,
    position: 'absolute',
    right: Spacing.four,
    width: FAB_SIZE,
    zIndex: 10,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
