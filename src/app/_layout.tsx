import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import { Colors, Fonts } from '@/constants/theme';
import { DATABASE_NAME, migrateDatabase } from '@/db/database';

void SplashScreen.preventAutoHideAsync();
initializeExecutorch();

function AppNavigator() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="setup" options={{ title: 'Offline model setup' }} />
      <Stack.Screen name="material/new" options={{ title: 'Import material' }} />
      <Stack.Screen name="material/[materialId]/index" options={{ title: 'Material' }} />
      <Stack.Screen name="material/[materialId]/chat" options={{ title: 'Chat with material' }} />
      <Stack.Screen name="topic/[topicId]/index" options={{ title: 'Study topic' }} />
      <Stack.Screen name="topic/[topicId]/quiz" options={{ headerShown: false }} />
      <Stack.Screen name="progress" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    [Fonts.regular]: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
    [Fonts.medium]: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
    [Fonts.semibold]: require('@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf'),
    [Fonts.bold]: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
  });
  const isDark = colorScheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.divider,
      primary: palette.primary,
    },
  };

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider value={navigationTheme}>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
              <AppNavigator />
              <StatusBar style={isDark ? 'light' : 'dark'} />
            </SQLiteProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
