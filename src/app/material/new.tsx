import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { importMaterial } from '@/materials/import-material';

export default function ImportMaterialScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    setIsImporting(true);

    try {
      const draft = await importMaterial();
      if (!draft) {
        return;
      }

      const material = await new MaterialRepository(db).create(draft);
      router.replace({
        pathname: '/material/[materialId]',
        params: { materialId: material.id },
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to import material.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        eyebrow="Stage 3"
        title="Import one material"
        subtitle="The file is copied into private storage first. You can then extract, chunk, and index it entirely on this device."
      />

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Supported now</ThemedText>
        <ThemedText themeColor="textSecondary">Plain text (.txt)</ThemedText>
        <ThemedText type="smallBold">Compatibility candidate</ThemedText>
        <ThemedText themeColor="textSecondary">
          Clean, selectable-text PDF (.pdf). Scanned PDFs are not supported.
        </ThemedText>
      </ThemedView>

      {error ? (
        <ThemedView type="backgroundElement" style={styles.errorCard}>
          <ThemedText type="smallBold">Import failed</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {error}
          </ThemedText>
        </ThemedView>
      ) : null}

      <PrimaryButton
        disabled={isImporting}
        label={isImporting ? 'Importing…' : 'Choose TXT or PDF'}
        onPress={() => void handleImport()}
        leading={isImporting ? <ActivityIndicator color="#FFFFFF" /> : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  card: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  errorCard: {
    borderRadius: 18,
    gap: Spacing.one,
    padding: Spacing.three,
  },
});
