import Constants from 'expo-constants';
import { ScrollView, StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const packageRows = [
  ['Expo', Constants.expoConfig?.sdkVersion ?? '57'],
  ['Runtime', 'React Native 0.86'],
  ['Generation', 'ExecuTorch 0.9.2'],
  ['Retrieval', 'React Native RAG 0.9.0'],
  ['Vector storage', 'OP-SQLite 15.2.14'],
  ['Relational storage', 'Expo SQLite 57'],
] as const;

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Development foundation"
          title="Local runtime"
          subtitle="No account, backend, or cloud sync is included in the deadline build."
        />

        <ThemedView type="backgroundElement" style={styles.card}>
          {packageRows.map(([label, value]) => (
            <ThemedView key={label} type="backgroundElement" style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
              <ThemedText type="smallBold">{value}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    borderRadius: 18,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
