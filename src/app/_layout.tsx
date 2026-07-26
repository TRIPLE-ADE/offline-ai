import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeExecutorch } from '@/ai/initialize-executorch';
import { DATABASE_NAME, migrateDatabase } from '@/db/database';

void SplashScreen.preventAutoHideAsync();
initializeExecutorch();

function AppNavigator() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

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
      <Stack.Screen name="topic/[topicId]/quiz" options={{ title: 'Knowledge check' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
              <AppNavigator />
            </SQLiteProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
