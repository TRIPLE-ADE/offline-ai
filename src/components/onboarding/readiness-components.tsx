import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ReadinessTone = 'ready' | 'warning' | 'error' | 'checking' | 'neutral';

type StatusBannerProps = {
  tone: Exclude<ReadinessTone, 'checking'>;
  title: string;
  message: string;
};

export function StatusBanner({ tone, title, message }: StatusBannerProps) {
  const theme = useTheme();
  const treatment = {
    ready: {
      background: theme.successSoft,
      foreground: theme.success,
      icon: 'checkmark-circle' as const,
    },
    warning: {
      background: theme.warningSoft,
      foreground: theme.warning,
      icon: 'warning' as const,
    },
    error: {
      background: theme.errorSoft,
      foreground: theme.error,
      icon: 'alert-circle' as const,
    },
    neutral: {
      background: theme.infoSoft,
      foreground: theme.info,
      icon: 'information-circle' as const,
    },
  }[tone];

  return (
    <View
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: treatment.background }]}>
      <Ionicons name={treatment.icon} color={treatment.foreground} size={22} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" style={{ color: treatment.foreground }}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: treatment.foreground }}>
          {message}
        </ThemedText>
      </View>
    </View>
  );
}

export type ReadinessRow = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone: ReadinessTone;
};

export function DeviceReadinessCard({
  rows,
  checking,
}: {
  rows: ReadinessRow[];
  checking?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText type="heading">Readiness check</ThemedText>
        {checking ? <ActivityIndicator accessibilityLabel="Checking device readiness" color={theme.primary} /> : null}
      </View>
      {rows.map((row, index) => {
        const foreground =
          row.tone === 'ready'
            ? theme.success
            : row.tone === 'warning'
              ? theme.warning
              : row.tone === 'error'
                ? theme.error
                : theme.textSecondary;
        return (
          <View
            key={row.label}
            style={[
              styles.row,
              index > 0 && {
                borderTopColor: theme.border,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}>
            <View style={[styles.rowIcon, { backgroundColor: theme.surfaceElevated }]}>
              {row.tone === 'checking' ? (
                <ActivityIndicator color={theme.primary} size="small" />
              ) : (
                <Ionicons name={row.icon} color={foreground} size={21} />
              )}
            </View>
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textSecondary">
                {row.label}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: foreground }}>
                {row.value}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

type SetupStepProps = {
  index: number;
  label: string;
  status: 'pending' | 'current' | 'complete' | 'error';
};

export function SetupStep({ index, label, status }: SetupStepProps) {
  const theme = useTheme();
  const foreground =
    status === 'complete'
      ? theme.success
      : status === 'error'
        ? theme.error
        : status === 'current'
          ? theme.primary
          : theme.textMuted;

  return (
    <View accessibilityLabel={`${label}, ${status}`} style={styles.setupStep}>
      <View
        style={[
          styles.stepIcon,
          {
            backgroundColor:
              status === 'current'
                ? theme.primarySoft
                : status === 'complete'
                  ? theme.successSoft
                  : status === 'error'
                    ? theme.errorSoft
                    : theme.surfaceElevated,
            borderColor: foreground,
          },
        ]}>
        {status === 'complete' ? (
          <Ionicons name="checkmark" color={foreground} size={17} />
        ) : status === 'error' ? (
          <Ionicons name="alert" color={foreground} size={17} />
        ) : (
          <ThemedText type="caption" style={{ color: foreground }}>
            {index}
          </ThemedText>
        )}
      </View>
      <ThemedText
        type={status === 'current' ? 'smallBold' : 'small'}
        style={{ color: foreground }}>
        {label}
      </ThemedText>
    </View>
  );
}

type DownloadProgressProps = {
  progress: number;
  downloadedLabel: string;
  totalLabel: string;
  currentStatus: string;
};

export function DownloadProgress({
  progress,
  downloadedLabel,
  totalLabel,
  currentStatus,
}: DownloadProgressProps) {
  const theme = useTheme();
  const percentage = Math.round(progress * 100);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.download,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <View style={styles.downloadHeading}>
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="textSecondary">
            {currentStatus}
          </ThemedText>
          <ThemedText type="title">{percentage}%</ThemedText>
        </View>
        <View style={[styles.downloadIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="download-outline" color={theme.primary} size={24} />
        </View>
      </View>
      <ProgressBar accessibilityLabel="Offline AI installation progress" value={progress} />
      <ThemedText type="small" themeColor="textSecondary">
        {downloadedLabel} of {totalLabel}
      </ThemedText>
    </View>
  );
}

export function RetryState({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.feedback}>
      <StatusBanner
        tone="error"
        title="Setup needs your attention"
        message={message}
      />
      {onRetry ? (
        <PrimaryButton
          label="Retry"
          loading={retrying}
          onPress={onRetry}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

export function SuccessState({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.success}>
      <View style={[styles.successIcon, { backgroundColor: theme.successSoft }]}>
        <Ionicons name="checkmark" color={theme.success} size={34} />
      </View>
      <ThemedText type="title" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: {
    alignItems: 'flex-start',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    ...Elevation.card,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: TouchTarget + 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  setupStep: { alignItems: 'center', flexDirection: 'row', gap: Spacing.three },
  stepIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  download: {
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.four,
    ...Elevation.card,
  },
  downloadHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  downloadIcon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  feedback: { gap: Spacing.three },
  success: {
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
  successIcon: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  center: { textAlign: 'center' },
});
