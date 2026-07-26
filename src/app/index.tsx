import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import type { Material } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const [materials, setMaterials] = useState<Material[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void new MaterialRepository(db).list().then((rows) => {
        if (active) {
          setMaterials(rows);
        }
      });

      return () => {
        active = false;
      };
    }, [db])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Offline learning"
          title="Your materials"
          subtitle="Turn one source into a roadmap, lessons, assessments, and grounded answers."
          action={
            <Pressable
              accessibilityLabel="Open settings"
              hitSlop={12}
              onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" color={theme.text} size={24} />
            </Pressable>
          }
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {materials.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="document-text-outline" color={theme.text} size={30} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                Start with one material
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centered}>
                TXT is guaranteed for the first build. Clean, text-based PDF remains behind its
                native compatibility gate.
              </ThemedText>
              <PrimaryButton
                label="Import learning material"
                onPress={() => router.push('/material/new')}
              />
              <Pressable onPress={() => router.push('/setup')}>
                <ThemedText type="linkPrimary">Check offline model setup</ThemedText>
              </Pressable>
            </ThemedView>
          ) : (
            <>
              {materials.map((material) => (
                <Pressable
                  key={material.id}
                  onPress={() =>
                    router.push({
                      pathname: '/material/[materialId]',
                      params: { materialId: material.id },
                    })
                  }>
                  <ThemedView type="backgroundElement" style={styles.materialCard}>
                    <View style={styles.materialRow}>
                      <View style={styles.materialText}>
                        <ThemedText type="smallBold">{material.title}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {material.fileType.toUpperCase()} · {material.status.replaceAll('_', ' ')}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" color={theme.textSecondary} size={20} />
                    </View>
                  </ThemedView>
                </Pressable>
              ))}
              <PrimaryButton
                label="Import another material"
                onPress={() => router.push('/material/new')}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 24,
    gap: Spacing.three,
    marginTop: Spacing.five,
    padding: Spacing.four,
  },
  emptyIcon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyTitle: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  materialCard: {
    borderRadius: 18,
    padding: Spacing.three,
  },
  materialRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  materialText: {
    flex: 1,
    gap: Spacing.one,
  },
});
