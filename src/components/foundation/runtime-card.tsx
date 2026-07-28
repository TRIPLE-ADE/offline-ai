import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RuntimeState } from '@/stores/runtime-store';

type RuntimeCardProps = {
  title: string;
  detail: string;
  state: RuntimeState;
  actionLabel?: string;
  onAction: () => void;
};

export function RuntimeCard({
  title,
  detail,
  state,
  actionLabel,
  onAction,
}: RuntimeCardProps) {
  const theme = useTheme();
  const isBusy = state.phase === 'downloading' || state.phase === 'loading';
  const isReady = state.phase === 'ready';
  const status =
    state.phase === 'not_downloaded'
      ? 'Not installed'
      : state.phase === 'downloading'
        ? `Downloading · ${Math.round(state.progress * 100)}%`
        : state.phase === 'loading'
          ? 'Verifying on this device'
          : state.phase === 'ready'
            ? 'Ready offline'
            : state.phase === 'downloaded'
              ? 'Installed · loads when needed'
              : state.phase === 'error'
                ? 'Installation needs attention'
                : 'In use';

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <View style={styles.titleRow}>
        <View
          style={[
            styles.icon,
            { backgroundColor: isReady ? theme.successSoft : theme.primarySoft },
          ]}>
          <Ionicons
            name={isReady ? 'checkmark' : 'download-outline'}
            color={isReady ? theme.success : theme.primary}
            size={22}
          />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        </View>
        {isBusy ? <ActivityIndicator color={theme.primary} /> : null}
      </View>

      <ThemedText type="smallBold" style={{ color: isReady ? theme.success : theme.text }}>
        {status}
      </ThemedText>
      {isBusy ? (
        <ProgressBar
          accessibilityLabel={`${title} download progress`}
          value={state.progress}
        />
      ) : null}
      {state.error ? (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            The download could not be completed. Check your connection and available storage, then retry.
          </ThemedText>
        </View>
      ) : null}
      {actionLabel ? (
        <PrimaryButton disabled={isBusy} label={actionLabel} onPress={onAction} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.three,
    ...Elevation.card,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  error: {
    borderRadius: Radius.small,
    padding: Spacing.two,
  },
});
