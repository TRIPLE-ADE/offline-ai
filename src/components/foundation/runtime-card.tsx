import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
  const isBusy = state.phase === 'downloading' || state.phase === 'loading';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        </View>
        {isBusy ? <ActivityIndicator color="#4A50CE" /> : null}
      </View>

      <ThemedText type="small">
        {state.phase.replaceAll('_', ' ')}
        {state.progress > 0 && state.progress < 1
          ? ` · ${Math.round(state.progress * 100)}%`
          : ''}
      </ThemedText>
      {state.error ? (
        <ThemedText type="small" themeColor="textSecondary">
          {state.error}
        </ThemedText>
      ) : null}
      {actionLabel ? (
        <PrimaryButton disabled={isBusy} label={actionLabel} onPress={onAction} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    gap: Spacing.three,
    padding: Spacing.three,
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
});
