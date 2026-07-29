import { Redirect, Stack } from 'expo-router';

import { hasCompletedOnboarding } from '@/onboarding/onboarding-state';
import SetupScreen from '@/screens/setup-screen';
import { StatusBar } from 'expo-status-bar';

export default function SetupRoute() {
  if (hasCompletedOnboarding()) {
    return <Redirect href="/home" />;
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
