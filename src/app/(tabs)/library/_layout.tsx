import { Stack } from 'expo-router/stack';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LibraryLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontFamily: Fonts.semibold },
      }}>
      <Stack.Screen name="index" options={{ headerLargeTitle: true, title: 'Library' }} />
    </Stack>
  );
}
