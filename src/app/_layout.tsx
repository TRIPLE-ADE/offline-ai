import { Stack } from "expo-router";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { initializeExecutorch } from "@/ai/initialize-executorch";
import { inspectOfflineResources } from "@/ai/offline-resource-state";
import { AppOverlays } from "@/components/app-overlays";
import { AppToaster } from "@/components/foundation/app-toaster";
import { Colors, Fonts } from "@/constants/theme";
import { DATABASE_NAME, migrateDatabase } from "@/db/database";
import { useTheme } from "@/hooks/use-theme";
import {
  initializeAppearancePreference,
  useResolvedAppearance,
} from "@/theme/appearance";

void SplashScreen.preventAutoHideAsync();
initializeExecutorch();
initializeAppearancePreference();

function AppNavigator() {
  const theme = useTheme();
  const appearance = useResolvedAppearance();

  return (
    <>
      <StatusBar animated style={appearance === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontFamily: Fonts.semibold },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const appearance = useResolvedAppearance();
  const [fontsLoaded] = useFonts({
    [Fonts.regular]: require("@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf"),
    [Fonts.medium]: require("@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf"),
    [Fonts.semibold]: require("@expo-google-fonts/dm-sans/600SemiBold/DMSans_600SemiBold.ttf"),
    [Fonts.bold]: require("@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf"),
  });
  const [resourcesInspected, setResourcesInspected] = useState(false);
  const isDark = appearance === "dark";
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
    if (fontsLoaded && resourcesInspected) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, resourcesInspected]);

  useEffect(() => {
    let active = true;
    void inspectOfflineResources()
      .catch(() => undefined)
      .finally(() => {
        if (active) setResourcesInspected(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!fontsLoaded || !resourcesInspected) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ backgroundColor: palette.background, flex: 1 }}
    >
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider value={navigationTheme}>
            <SQLiteProvider
              databaseName={DATABASE_NAME}
              onInit={migrateDatabase}
            >
              <AppNavigator />
              <AppOverlays />
              <AppToaster />
            </SQLiteProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
