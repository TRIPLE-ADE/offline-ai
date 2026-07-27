import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const destinations = [
  { label: 'Library', path: '/', icon: 'library-outline', activeIcon: 'library' },
  { label: 'Progress', path: '/progress', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
  { label: 'Settings', path: '/settings', icon: 'settings-outline', activeIcon: 'settings' },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.divider,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      {destinations.map((item) => {
        const active = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
        return (
          <Pressable
            key={item.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.replace(item.path)}
            style={styles.item}>
            <View style={[styles.iconBox, active && { backgroundColor: theme.primarySoft }]}>
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                color={active ? theme.primary : theme.textSecondary}
                size={22}
              />
            </View>
            <ThemedText
              type="caption"
              style={{ color: active ? theme.primary : theme.textSecondary }}>
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: TouchTarget + 8,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: 32,
    justifyContent: 'center',
    width: 52,
  },
});
