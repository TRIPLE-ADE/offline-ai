import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PrimaryButton,
  SecondaryButton,
  type PrimaryButtonProps,
} from '@/components/foundation/primary-button';
import { LearnGuideMark } from '@/components/brand/learn-guide-mark';
import { Brand } from '@/constants/brand';
import { ProgressBar } from '@/components/foundation/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type OnboardingProgressProps = {
  current: number;
  total: number;
};

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <View
      accessibilityLabel={`Step ${current} of ${total}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      style={styles.progress}>
      <ThemedText type="caption" themeColor="textSecondary">
        STEP {current} OF {total}
      </ThemedText>
      <ProgressBar
        accessibilityLabel={`Onboarding step ${current} of ${total}`}
        value={current / total}
      />
    </View>
  );
}

type OnboardingHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
};

export function OnboardingHeader({ eyebrow, title, subtitle }: OnboardingHeaderProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="header" style={styles.header}>
      {eyebrow ? (
        <View style={styles.brandRow}>
          <LearnGuideMark size={38} showName={eyebrow === Brand.name} />
          {eyebrow !== Brand.name ? (
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {eyebrow}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{subtitle}</ThemedText>
    </View>
  );
}

type OnboardingFooterProps = {
  primary: PrimaryButtonProps;
  secondary?: Omit<PrimaryButtonProps, 'variant'>;
  tertiary?: Omit<PrimaryButtonProps, 'variant'>;
  note?: string;
};

export function OnboardingFooter({
  primary,
  secondary,
  tertiary,
  note,
}: OnboardingFooterProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.footer,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      ]}>
      <View style={styles.footerInner}>
        {note ? (
          <ThemedText type="caption" themeColor="textSecondary" style={styles.footerNote}>
            {note}
          </ThemedText>
        ) : null}
        <PrimaryButton {...primary} />
        {secondary ? <SecondaryButton {...secondary} /> : null}
        {tertiary ? <PrimaryButton {...tertiary} variant="tertiary" /> : null}
      </View>
    </View>
  );
}

type OnboardingLayoutProps = {
  children: ReactNode;
  footer: ReactNode;
  progress?: OnboardingProgressProps;
};

export function OnboardingLayout({ children, footer, progress }: OnboardingLayoutProps) {
  const [footerHeight, setFooterHeight] = useState(0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.shell}>
          <View style={styles.body}>
            {progress ? (
              <View style={styles.progressWrap}>
                <OnboardingProgress {...progress} />
              </View>
            ) : null}
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: footerHeight + Spacing.four },
              ]}
              contentInsetAdjustmentBehavior="never"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={styles.content}>{children}</View>
            </ScrollView>
          </View>
          <View
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
            style={styles.footerSlot}>
            {footer}
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  shell: { flex: 1 },
  body: { flex: 1 },
  progressWrap: {
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    width: '100%',
  },
  progress: { gap: Spacing.two },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  footerSlot: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
  header: { gap: Spacing.two },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  footerInner: {
    alignSelf: 'center',
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    width: '100%',
  },
  footerNote: { textAlign: 'center' },
});
