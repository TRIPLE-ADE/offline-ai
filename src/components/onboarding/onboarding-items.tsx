import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ItemProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  detail: string;
  index?: number;
};

export function BenefitItem({ icon, title, detail, index }: ItemProps) {
  const theme = useTheme();

  return (
    <View style={styles.item}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: theme.primarySoft,
            borderColor: theme.border,
          },
        ]}>
        {index ? (
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {index}
          </ThemedText>
        ) : (
          <Ionicons name={icon} color={theme.primary} size={22} />
        )}
      </View>
      <View style={styles.copy}>
        <ThemedText type="heading">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      </View>
    </View>
  );
}

export function PrivacyItem(props: ItemProps) {
  const theme = useTheme();

  return (
    <View style={styles.item}>
      <View
        style={[
          styles.icon,
          { backgroundColor: theme.secondarySoft, borderColor: theme.border },
        ]}>
        <Ionicons name={props.icon} color={theme.secondary} size={22} />
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold">{props.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {props.detail}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  copy: { flex: 1, gap: Spacing.one },
});
