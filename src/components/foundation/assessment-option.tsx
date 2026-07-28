import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AssessmentOption({
  index,
  label,
  selected,
  onPress,
}: {
  index: number;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={`Option ${String.fromCharCode(65 + index)}, ${label}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected
            ? theme.primarySoft
            : pressed
              ? theme.surfaceSelected
              : theme.surfaceElevated,
          borderColor: selected ? theme.primary : theme.borderStrong,
        },
      ]}>
      <View
        style={[
          styles.letter,
          { backgroundColor: selected ? theme.primary : theme.backgroundElement },
        ]}>
        <ThemedText
          type="smallBold"
          style={selected ? { color: theme.textOnPrimary } : undefined}>
          {String.fromCharCode(65 + index)}
        </ThemedText>
      </View>
      <ThemedText style={styles.flex}>{label}</ThemedText>
      {selected ? <Ionicons name="checkmark-circle" color={theme.primary} size={22} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 68,
    padding: Spacing.three,
  },
  letter: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  flex: { flex: 1 },
});
