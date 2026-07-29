import { StyleSheet, View } from 'react-native';

import { LearnGuideMark } from '@/components/brand/learn-guide-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function BrandContext({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.row}>
      <LearnGuideMark size={compact ? 32 : 40} showName />
      <View style={styles.copy}>
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
