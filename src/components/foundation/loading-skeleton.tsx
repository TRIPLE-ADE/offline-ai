import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  const theme = useTheme();

  return (
    <View accessibilityLabel="Loading content" accessibilityRole="progressbar" style={styles.group}>
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[
            styles.line,
            {
              backgroundColor: theme.backgroundElement,
              width: index === lines - 1 ? '62%' : '100%',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two },
  line: { borderRadius: Radius.small, height: 14 },
});
