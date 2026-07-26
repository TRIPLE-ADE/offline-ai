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

        <ThemedView type="backgroundElement" style={styles.infoCard}>
          <ThemedText type="smallBold">Privacy boundary</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            There is no account, analytics backend, or cloud sync. Imported files,
            embeddings, generated artifacts, quiz attempts, and conversations remain in
            application-private storage on this device.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.infoCard}>
          <ThemedText type="smallBold">Current limitations</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            TXT and clean selectable-text PDFs are supported. Scanned PDFs, OCR,
            diagrams, multi-material courses, cloud backup, and probabilistic mastery
            estimates are outside this deadline build. Local AI output can be wrong;
            inspect the source excerpts shown with factual content.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.infoCard}>
          <ThemedText type="smallBold">Open-source foundation</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Built with Expo, React Native ExecuTorch, React Native RAG, OP-SQLite,
            Expo SQLite, MiniLM embeddings, and Gemma 4 E2B. The architecture is
            informed by Software Mansion’s Private Mind production reference.
          </ThemedText>
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
  infoCard: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
