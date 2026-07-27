import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'offline' | 'ready' | 'working' | 'review' | 'error' | 'neutral';

const toneIcon: Record<Tone, keyof typeof Ionicons.glyphMap> = {
  offline: 'cloud-offline-outline',
  ready: 'checkmark-circle-outline',
  working: 'sync-outline',
  review: 'refresh-outline',
  error: 'alert-circle-outline',
  neutral: 'ellipse-outline',
};

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const color =
    tone === 'ready' || tone === 'offline'
      ? theme.success
      : tone === 'review'
        ? theme.warning
        : tone === 'error'
          ? theme.danger
          : tone === 'working'
            ? theme.primary
            : theme.textSecondary;
  const background =
    tone === 'ready' || tone === 'offline'
      ? theme.successSoft
      : tone === 'review'
        ? theme.warningSoft
        : tone === 'error'
          ? theme.dangerSoft
          : tone === 'working'
            ? theme.primarySoft
            : theme.backgroundElement;
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Ionicons name={toneIcon[tone]} color={color} size={14} />
      <ThemedText type="caption" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Radius.small,
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
