import { StyleSheet, View } from 'react-native';

import { SomaMark } from '@/components/brand/soma-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandContext({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <SomaMark size={compact ? 32 : 40} />
      <View style={styles.copy}>
        <ThemedText type="caption" style={{ color: theme.primary }}>
          SOMA OFFLINE
        </ThemedText>
        <ThemedText
          type={compact ? 'small' : 'default'}
          themeColor="textSecondary">
          {message}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  copy: { flex: 1, gap: Spacing.half },
});
