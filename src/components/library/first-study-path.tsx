import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const steps = [
  {
    icon: 'document-text-outline' as const,
    title: 'Bring your material',
    detail: 'Import a PDF or TXT file from your device.',
  },
  {
    icon: 'map-outline' as const,
    title: 'Get a clear roadmap',
    detail: 'Soma organizes the source into a practical topic order.',
  },
  {
    icon: 'sparkles-outline' as const,
    title: 'Learn, ask, and check',
    detail: 'Study a grounded lesson, chat with the material, then test yourself.',
  },
];

export function FirstStudyPath({
  onImport,
  onSetup,
}: {
  onImport: () => void;
  onSetup: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.heading}>
        <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="book-outline" color={theme.primary} size={28} />
        </View>
        <View style={styles.flex}>
          <ThemedText type="heading">Create your first study path</ThemedText>
          <ThemedText themeColor="textSecondary">
            One source becomes a guided learning flow that stays private on this device.
          </ThemedText>
        </View>
      </View>

      <View
        accessibilityLabel="Import a material, get a topic roadmap, then learn, chat, and check your understanding"
        style={styles.steps}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.stepRail}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      index === steps.length - 1 ? theme.secondarySoft : theme.surfaceTint,
                  },
                ]}>
                <Ionicons
                  name={step.icon}
                  color={index === steps.length - 1 ? theme.secondary : theme.primary}
                  size={20}
                />
              </View>
              {index < steps.length - 1 ? (
                <View style={[styles.connector, { backgroundColor: theme.border }]} />
              ) : null}
            </View>
            <View style={styles.stepCopy}>
              <ThemedText type="smallBold">{step.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {step.detail}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      <PrimaryButton
        label="Import your first material"
        leading={<Ionicons name="add" color={theme.textOnPrimary} size={20} />}
        onPress={onImport}
      />
      <Pressable
        accessibilityRole="button"
        onPress={onSetup}
        style={({ pressed }) => [styles.setupAction, pressed && styles.pressed]}>
        <Ionicons name="hardware-chip-outline" color={theme.primary} size={19} />
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          Manage offline AI setup
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderWidth: 1,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  heading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  heroIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  flex: { flex: 1, gap: Spacing.one },
  steps: { gap: 0 },
  step: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 72,
  },
  stepRail: { alignItems: 'center', width: 40 },
  stepIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  connector: { flex: 1, width: 1 },
  stepCopy: { flex: 1, gap: Spacing.half, paddingBottom: Spacing.three },
  setupAction: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: TouchTarget,
    paddingHorizontal: Spacing.two,
  },
  pressed: { opacity: 0.65 },
});
