import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ThemedView } from '@/components/themed-view';
import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';
import SetupScreen from '@/screens/setup-screen';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { StatusBar } from 'expo-status-bar';

export default function SetupRoute() {
  const router = useRouter();
  const onboardingComplete = hasCompletedOnboarding();
  const openOfflineAi = useAppOverlayStore((state) => state.openOfflineAi);

  useEffect(() => {
    if (!onboardingComplete) return;
    openOfflineAi();
    router.replace('/home');
  }, [onboardingComplete, openOfflineAi, router]);

  if (onboardingComplete) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  return (
    <>
      <StatusBar animated />
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          title: 'Offline AI setup',
        }}
      />
      <SetupScreen />
    </>
  );
}
