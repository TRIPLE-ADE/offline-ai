import {
  BottomSheet,
  BottomSheetScrollView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { ImportMaterialContent } from '@/components/materials/import-material-content';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export function ImportMaterialSheet() {
  const router = useRouter();
  const close = useAppOverlayStore((state) => state.closeImportMaterial);
  const sheetRef = useRef<BottomSheetMethods | null>(null);
  const pendingMaterialId = useRef<string | null>(null);
  const navigationPending = useRef(false);
  const [busy, setBusy] = useState(false);

  const finishDismissal = () => {
    close();
    const materialId = pendingMaterialId.current;
    pendingMaterialId.current = null;
    if (!materialId || navigationPending.current) {
      return;
    }
    navigationPending.current = true;
    router.navigate({
      pathname: '/material/[materialId]',
      params: { materialId },
    });
  };

  return (
    <BottomSheet
      ref={sheetRef}
      enableDynamicSizing={true}
      enablePanDownToClose={!busy}
      index={0}
      onDismiss={finishDismissal}
    >
      <BottomSheetScrollView>
        <ImportMaterialContent
          onBusyChange={setBusy}
          onImported={(materialId) => {
            if (navigationPending.current) {
              return;
            }
            pendingMaterialId.current = materialId;
            sheetRef.current?.close();
          }}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
