import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  isRuntimeBusy,
  isRuntimeLoaded,
  type RuntimeState,
} from '@/stores/runtime-store';

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
  const isBusy = isRuntimeBusy(state);
  const isReady = isRuntimeLoaded(state);
  const isLoading = state.residency === 'loading';
  const status =
    state.activity === 'interrupting'
      ? 'Stopping current operation'
      : state.activity === 'running'
        ? 'In use'
        : state.residency === 'unloaded'
          ? 'Not loaded'
          : state.residency === 'loading'
            ? `Loading · ${Math.round(state.progress * 100)}%`
            : state.residency === 'loaded'
              ? 'Loaded in memory'
              : state.residency === 'unloading'
                ? 'Releasing memory'
                : 'Runtime needs attention';

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
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
            name={isReady ? 'checkmark' : 'hardware-chip-outline'}
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
      {isLoading ? (
        <ProgressBar
          accessibilityLabel={`${title} load progress`}
          value={state.progress}
        />
      ) : null}
      {state.error ? (
        <View style={[styles.error, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {state.error}
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
