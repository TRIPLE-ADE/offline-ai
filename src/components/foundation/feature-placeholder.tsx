import { StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type FeaturePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
};

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  detail,
}: FeaturePlaceholderProps) {
  return (
    <ThemedView style={styles.container}>
      <ScreenHeader eyebrow={eyebrow} title={title} subtitle={description} />
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Foundation status</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.four,
  },
  card: {
    borderRadius: 18,
    gap: Spacing.one,
    marginHorizontal: Spacing.four,
    padding: Spacing.three,
  },
});
