import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { Material } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function MaterialScreen() {
  const { materialId } = useLocalSearchParams<{ materialId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [material, setMaterial] = useState<Material | null>(null);

  useEffect(() => {
    void new MaterialRepository(db).getById(materialId).then(setMaterial);
  }, [db, materialId]);

  if (!material) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">Loading material…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader
        eyebrow={`${material.fileType.toUpperCase()} material`}
        title={material.title}
        subtitle={`Current state: ${material.status.replaceAll('_', ' ')}`}
      />

      <ThemedView type="backgroundElement" style={styles.statusCard}>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark-outline" color={theme.text} size={24} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">Stored locally</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              This source is now in app-controlled storage and registered in SQLite.
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.placeholder}>
        <ThemedText type="smallBold">Next increment: grounded ingestion</ThemedText>
        <ThemedText themeColor="textSecondary">
          Stage 3 will extract, chunk, embed, and index this material. Topic generation remains
          intentionally disabled until retrieval is proven.
        </ThemedText>
      </ThemedView>

      <PrimaryButton
        disabled
        label="Continue learning — available after Stage 4"
        onPress={() => undefined}
      />
      <PrimaryButton
        variant="secondary"
        label="Open Chat with Material shell"
        onPress={() =>
          router.push({
            pathname: '/material/[materialId]/chat',
            params: { materialId },
          })
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusCard: {
    borderRadius: 18,
    padding: Spacing.three,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  placeholder: {
    borderRadius: 18,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
