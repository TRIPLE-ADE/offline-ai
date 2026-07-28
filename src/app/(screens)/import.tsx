import { Stack } from 'expo-router';

import ImportMaterialScreen from '@/screens/import-material-screen';

export default function ImportMaterialRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Import material' }} />
      <ImportMaterialScreen />
    </>
  );
}
