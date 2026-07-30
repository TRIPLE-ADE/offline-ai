import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { MaterialCard } from '@/components/foundation/material-card';
import { BrandContext } from '@/components/brand/brand-context';
import { FirstStudyPath } from '@/components/library/first-study-path';
import { PrimaryButton } from '@/components/foundation/primary-button';
import { SectionHeader } from '@/components/foundation/section-header';
import { StatusBadge } from '@/components/foundation/status-badge';
import { ImportMaterialFab } from '@/components/materials/import-material-fab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { Brand } from '@/constants/brand';
import { useOfflineAiCapability } from '@/hooks/use-offline-ai-capability';
import { useTheme } from '@/hooks/use-theme';
import { useMaterialDeletion } from '@/materials/use-material-deletion';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useLearningOverviewStore } from '@/stores/learning-overview-store';
import { toast } from '@/utils/app-toast';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const confirmMaterialDeletion = useMaterialDeletion();
  const openImportMaterial = useAppOverlayStore((state) => state.openImportMaterial);
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);
  const {
    availability,
    available: offlineReady,
    checking: modelStatusChecking,
    installationPhase: modelInstallationPhase,
    resourceRemovalActive,
    retryVerification,
  } = useOfflineAiCapability();
  const items = useLearningOverviewStore((state) => state.materials);
  const overviewStatus = useLearningOverviewStore((state) => state.status);
  const loading = overviewStatus === 'idle' || overviewStatus === 'loading';

  const current = items
    .flatMap(({ material, topics }) =>
      topics
        .filter((topic) => topic.status === 'learning' || topic.status === 'needs_review')
        .map((topic) => ({ material, topic }))
    )
    .sort((a, b) => b.topic.updatedAt.localeCompare(a.topic.updatedAt))[0];
  const totalTopics = items.reduce((sum, item) => sum + item.topics.length, 0);
  const completedTopics = items.reduce(
    (sum, item) => sum + item.topics.filter((topic) => topic.status === 'completed').length,
    0
  );
  const modelActionLabel =
    availability === 'error'
      ? 'Check offline AI'
      : modelInstallationPhase === 'failed' ||
          modelInstallationPhase === 'downloading' ||
          modelInstallationPhase === 'retrying'
      ? 'Retry offline AI'
      : 'Download offline AI';
  const handleModelAction =
    availability === 'error'
      ? () => {
          void retryVerification().catch(() => {
            toast.error('Offline AI could not be checked');
          });
        }
      : openOfflineAi;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 112 },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}>
          <View>
            <BrandContext message={Brand.tagline} />
          </View>

          <View style={styles.statusRow}>
            <StatusBadge
              label={
                resourceRemovalActive
                  ? 'Removing offline AI…'
                  : modelStatusChecking
                  ? 'Checking offline AI…'
                  : availability === 'error'
                    ? 'Offline AI check needs attention'
                  : offlineReady
                    ? 'Offline AI ready'
                    : 'AI available when you’re ready'
              }
              tone={
                resourceRemovalActive
                  ? 'working'
                  : modelStatusChecking
                  ? 'neutral'
                  : availability === 'error'
                    ? 'error'
                  : offlineReady
                    ? 'offline'
                    : 'working'
              }
            />
            {!modelStatusChecking && !offlineReady ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleModelAction}
                style={styles.setupLink}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {modelActionLabel}
                </ThemedText>
                <Ionicons name="arrow-forward" color={theme.primary} size={16} />
              </Pressable>
            ) : null}
          </View>

          {items.length > 0 ? (
            <View
              accessibilityLabel={`${items.length} materials. ${totalTopics} topics. ${completedTopics} completed.`}
              style={[
                styles.summary,
                { borderBottomColor: theme.border, borderTopColor: theme.border },
              ]}>
              {[
                ['Materials', items.length],
                ['Topics', totalTopics],
                ['Complete', completedTopics],
              ].map(([label, value], index) => (
                <View
                  key={label}
                  style={[
                    styles.summaryMetric,
                    index > 0 && { borderLeftColor: theme.border, borderLeftWidth: 1 },
                  ]}>
                  <ThemedText type="heading">{value}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {label}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {current ? (
            <View
              style={[
                styles.recommendation,
                {
                  backgroundColor: theme.milestoneSoft,
                  borderColor: theme.milestone,
                  borderLeftColor: theme.milestone,
                },
              ]}>
              <View style={styles.recommendationTop}>
                <View style={styles.flex}>
                  <ThemedText type="caption" style={{ color: theme.warning }}>
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
                      origin: 'home',
                      topicId: current.topic.id,
                    },
                  })
                }
              />
            </View>
          ) : null}

          {items.length === 0 && !loading ? (
            <FirstStudyPath
              downloadAiLabel={modelActionLabel}
              onDownloadAi={
                modelStatusChecking || offlineReady ? undefined : handleModelAction
              }
            />
          ) : (
            <View style={styles.materialsSection}>
              <SectionHeader
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
                    onOptionsPress={() => confirmMaterialDeletion(material)}
                    topics={topics}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
        <ImportMaterialFab
          bottomInset={insets.bottom}
          onPress={openImportMaterial}
        />
      </SafeAreaView>
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
  summary: {
    borderBottomWidth: 1,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: Spacing.three,
  },
  summaryMetric: {
    flex: 1,
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
  },
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
  materialsSection: { gap: Spacing.three },
});
