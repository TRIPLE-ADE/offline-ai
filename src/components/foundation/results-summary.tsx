import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ResultsSummary({
  score,
  correct,
  total,
}: {
  score: number;
  correct: number;
  total: number;
}) {
  const theme = useTheme();
  const strong = score >= 80;

  return (
    <View
      accessibilityLabel={`Knowledge check complete. Score ${score} percent. ${correct} of ${total} correct.`}
      style={[
        styles.summary,
        {
          backgroundColor: strong ? theme.successSoft : theme.surfaceTint,
          borderColor: strong ? theme.success : theme.primarySoft,
        },
      ]}>
      <ThemedText type="caption" style={{ color: strong ? theme.success : theme.primary }}>
        KNOWLEDGE CHECK COMPLETE
      </ThemedText>
      <ThemedText type="display">{score}%</ThemedText>
      <ThemedText type="subtitle">
        {correct} correct · {total - correct} to review
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {strong
          ? 'You showed a strong understanding of this topic.'
          : score >= 50
            ? 'You understand the main idea. Review the missed concepts before trying again.'
            : 'A simpler review will help strengthen the foundations.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
});
