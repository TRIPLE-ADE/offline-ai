import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaterialCard } from '@/components/foundation/material-card';
import { BrandContext } from '@/components/brand/brand-context';
import { FirstStudyPath } from '@/components/library/first-study-path';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { SectionHeader } from '@/components/foundation/section-header';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Material, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useRuntimeStore } from '@/stores/runtime-store';
import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';

type LibraryItem = { material: Material; topics: Topic[] };

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const generation = useRuntimeStore((state) => state.generation);
  const embedding = useRuntimeStore((state) => state.embedding);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete] = useState(hasCompletedOnboarding);

  useEffect(() => {
    if (!onboardingComplete) {
      router.replace('/setup');
    }
  }, [onboardingComplete, router]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void new MaterialRepository(db)
        .list()
        .then(async (materials) =>
          Promise.all(
            materials.map(async (material) => ({
              material,
              topics: await new TopicRepository(db).listForMaterial(material.id),
            }))
          )
        )
        .then((rows) => {
          if (active) setItems(rows);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db])
  );

  const current = items
    .flatMap(({ material, topics }) =>
      topics
        .filter((topic) => topic.status === 'learning' || topic.status === 'needs_review')
        .map((topic) => ({ material, topic }))
    )
    .sort((a, b) => b.topic.updatedAt.localeCompare(a.topic.updatedAt))[0];
  const offlineReady = generation.phase === 'ready' && embedding.phase === 'ready';

  if (!onboardingComplete) {
    return <ThemedView style={styles.container} />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
          <View>
            <BrandContext message="Your private workspace for turning source material into a clear study path." />
          </View>

          <View style={styles.statusRow}>
            <StatusBadge
              label={offlineReady ? 'Offline AI ready' : 'Offline AI setup'}
              tone={offlineReady ? 'offline' : 'working'}
            />
            {!offlineReady ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate('/setup')}
                style={styles.setupLink}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Finish setup
                </ThemedText>
                <Ionicons name="arrow-forward" color={theme.primary} size={16} />
              </Pressable>
            ) : null}
          </View>

          {current ? (
            <View
              style={[
                styles.recommendation,
                {
                  backgroundColor: theme.surfaceTint,
                  borderColor: theme.primarySoft,
                  borderLeftColor: theme.secondary,
                },
              ]}>
              <View style={styles.recommendationTop}>
                <View style={styles.flex}>
                  <ThemedText type="caption" style={{ color: theme.primary }}>
                    CONTINUE STUDYING
                  </ThemedText>
                  <ThemedText type="subtitle">{current.topic.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {current.material.title}
                  </ThemedText>
                </View>
                <View style={[styles.roundIcon, { backgroundColor: theme.surfaceElevated }]}>
                  <Ionicons name="arrow-forward" color={theme.primary} size={22} />
                </View>
              </View>
              <ThemedText themeColor="textSecondary" numberOfLines={2}>
                {current.topic.status === 'needs_review'
                  ? 'Review this topic before moving on.'
                  : current.topic.summary}
              </ThemedText>
              <PrimaryButton
                label={current.topic.status === 'needs_review' ? 'Review topic' : 'Continue lesson'}
                onPress={() =>
                  router.navigate({
                    pathname: '/material/[materialId]/topic/[topicId]',
                    params: {
                      materialId: current.material.id,
                      origin: 'library',
                      topicId: current.topic.id,
                    },
                  })
                }
              />
            </View>
          ) : null}

          {items.length === 0 && !loading ? (
            <FirstStudyPath
              onImport={() => router.navigate('/import')}
              onSetup={() => router.navigate('/setup')}
            />
          ) : (
            <View style={styles.librarySection}>
              <SectionHeader
                action={
                  <Pressable
                    accessibilityLabel="Import material"
                    accessibilityRole="button"
                    onPress={() => router.navigate('/import')}
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        backgroundColor: pressed ? theme.surfaceSelected : 'transparent',
                        borderColor: theme.border,
                      },
                    ]}>
                    <Ionicons name="add" color={theme.primary} size={22} />
                    <ThemedText type="smallBold" style={{ color: theme.primary }}>
                      Import
                    </ThemedText>
                  </Pressable>
                }
                description={`${items.length} private material${items.length === 1 ? '' : 's'} on this device`}
                title="Materials"
              />

              {items.map(({ material, topics }) => {
                return (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onPress={() =>
                      router.navigate({
                        pathname: '/material/[materialId]',
                        params: { materialId: material.id },
                      })
                    }
                    topics={topics}
                  />
                );
              })}
            </View>
          )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setupLink: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one, minHeight: TouchTarget },
  recommendation: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  recommendationTop: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  roundIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.full,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  flex: { flex: 1, gap: Spacing.one },
  librarySection: { gap: Spacing.three },
  addButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
  },
});
