import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProcessingStepper({
  steps,
  current,
  complete = false,
}: {
  steps: string[];
  current: number;
  complete?: boolean;
}) {
  const theme = useTheme();

  return (
    <View accessibilityLabel={`Processing step ${current + 1} of ${steps.length}`} style={styles.list}>
      {steps.map((step, index) => {
        const done = complete || index < current;
        const active = !complete && index === current;
        return (
          <View key={step} style={styles.step}>
            <Ionicons
              name={done ? 'checkmark-circle' : active ? 'sync-circle' : 'ellipse-outline'}
              color={done ? theme.success : active ? theme.primary : theme.textMuted}
              size={20}
            />
            <ThemedText
              type="small"
              style={{ color: active ? theme.textPrimary : theme.textSecondary }}>
              {step}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
  step: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
});
