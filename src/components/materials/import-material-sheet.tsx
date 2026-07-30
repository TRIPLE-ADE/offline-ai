import {
  BottomSheet,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

import { ImportMaterialContent } from '@/components/materials/import-material-content';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export function ImportMaterialSheet() {
  const router = useRouter();
  const close = useAppOverlayStore((state) => state.closeImportMaterial);
  const navigationPending = useRef(false);

  return (
    <BottomSheet
      enableDynamicSizing={true}
      enablePanDownToClose
      index={0}
      onClose={close}
      onDismiss={close}

    >
      <BottomSheetView style={{  flex: 1 }}>
        <ImportMaterialContent
          onImported={(materialId) => {
            if (navigationPending.current) {
              return;
            }
            navigationPending.current = true;
            close();
            requestAnimationFrame(() => {
              router.navigate({
                pathname: '/material/[materialId]',
                params: { materialId },
              });
            });
          }}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}
