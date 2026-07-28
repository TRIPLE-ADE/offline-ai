import { Stack } from 'expo-router';

import SetupScreen from '@/screens/setup-screen';

export default function SetupRoute() {
  return (
    <>
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
