import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ThemedView } from '@/components/themed-view';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export default function ImportMaterialRoute() {
  const router = useRouter();
  const openImportMaterial = useAppOverlayStore(
    (state) => state.openImportMaterial
  );

  useEffect(() => {
    openImportMaterial();
    router.replace('/home');
  }, [openImportMaterial, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Import material' }} />
      <ThemedView style={{ flex: 1 }} />
    </>
  );
}
