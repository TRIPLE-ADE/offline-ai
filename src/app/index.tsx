import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/components/foundation/bottom-navigation';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ScreenHeader } from '@/components/foundation/screen-header';
import { StatePanel } from '@/components/foundation/state-panel';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { MaterialRepository } from '@/db/repositories/material-repository';
import { TopicRepository } from '@/db/repositories/topic-repository';
import type { Material, Topic } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { useRuntimeStore } from '@/stores/runtime-store';
import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';

type LibraryItem = { material: Material; topics: Topic[] };

function materialStatus(material: Material) {
  if (material.status === 'ready') return { label: 'Ready offline', tone: 'ready' as const };
  if (material.status === 'failed') return { label: 'Needs attention', tone: 'error' as const };
  if (material.status === 'imported') return { label: 'Not prepared', tone: 'neutral' as const };
  return { label: 'Preparing locally', tone: 'working' as const };
}

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <ScreenHeader
            eyebrow="Private study coach"
            title="Your library"
            subtitle="Import a material, understand what it contains, and always know what to study next."
            action={
              <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={styles.brandLetter}>
                  S
                </ThemedText>
              </View>
            }
          />

          <View style={styles.statusRow}>
            <StatusBadge
              label={offlineReady ? 'Offline AI ready' : 'Offline AI setup'}
              tone={offlineReady ? 'offline' : 'working'}
            />
            {!offlineReady ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/setup')}
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
                { backgroundColor: theme.primarySoft, borderColor: theme.primary },
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
                <View style={[styles.roundIcon, { backgroundColor: theme.surface }]}>
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
                  router.push({ pathname: '/topic/[topicId]', params: { topicId: current.topic.id } })
                }
              />
            </View>
          ) : null}

          {items.length === 0 && !loading ? (
            <StatePanel
              actionLabel="Import your first material"
              body="Choose a TXT file or a PDF with selectable text. The file is copied into private app storage and prepared entirely on this device."
              icon="document-text-outline"
              onAction={() => router.push('/material/new')}
              secondaryLabel="Set up offline AI"
              onSecondary={() => router.push('/setup')}
              title="Turn a large document into a clear study path"
            />
          ) : (
            <View style={styles.librarySection}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Materials</ThemedText>
                <Pressable
                  accessibilityLabel="Import material"
                  onPress={() => router.push('/material/new')}
                  style={[styles.addButton, { borderColor: theme.border }]}>
                  <Ionicons name="add" color={theme.primary} size={22} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    Import
                  </ThemedText>
                </Pressable>
              </View>

              {items.map(({ material, topics }) => {
                const completed = topics.filter((topic) => topic.status === 'completed').length;
                const progress = topics.length > 0 ? completed / topics.length : 0;
                const status = materialStatus(material);
                return (
                  <Pressable
                    key={material.id}
                    accessibilityHint="Opens the material overview"
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({
                        pathname: '/material/[materialId]',
                        params: { materialId: material.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.material,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: pressed ? 0.78 : 1,
                      },
                    ]}>
                    <View style={styles.materialTop}>
                      <View style={[styles.fileIcon, { backgroundColor: theme.secondarySoft }]}>
                        <Ionicons name="document-text-outline" color={theme.secondary} size={24} />
                      </View>
                      <View style={styles.flex}>
                        <ThemedText type="heading" numberOfLines={2}>
                          {material.title}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {material.fileType.toUpperCase()}
                          {material.fileSize ? ` · ${(material.fileSize / 1_048_576).toFixed(1)} MB` : ''}
                        </ThemedText>
                      </View>
                      <Ionicons name="chevron-forward" color={theme.textTertiary} size={22} />
                    </View>
                    <StatusBadge label={status.label} tone={status.tone} />
                    {topics.length > 0 ? (
                      <View style={styles.progressBlock}>
                        <ProgressBar value={progress} accessibilityLabel={`${material.title} progress`} />
                        <ThemedText type="caption" themeColor="textSecondary">
                          {completed} of {topics.length} topics completed
                        </ThemedText>
                      </View>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        {material.statusMessage ?? 'Open this material to prepare it for study.'}
                      </ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { gap: Spacing.four, paddingBottom: BottomTabInset },
  brandMark: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  brandLetter: { color: '#FFFFFF', fontSize: 19 },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  setupLink: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one, minHeight: TouchTarget },
  recommendation: {
    borderLeftWidth: 3,
    gap: Spacing.three,
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
  },
  recommendationTop: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  roundIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  flex: { flex: 1, gap: Spacing.one },
  librarySection: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  addButton: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.three,
  },
  material: { borderRadius: Radius.large, borderWidth: 1, gap: Spacing.three, padding: Spacing.three },
  materialTop: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  fileIcon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  progressBlock: { gap: Spacing.two },
});
