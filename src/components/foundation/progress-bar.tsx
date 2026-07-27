import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  value: number;
  color?: string;
  accessibilityLabel?: string;
};

export function ProgressBar({ value, color, accessibilityLabel = 'Progress' }: ProgressBarProps) {
  const theme = useTheme();
  const percentage = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <View
      accessibilityLabel={`${accessibilityLabel}, ${percentage}%`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percentage }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: color ?? theme.primary, width: `${percentage}%` },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: Radius.full, height: 7, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: Radius.full, height: '100%', minWidth: 3 },
});
