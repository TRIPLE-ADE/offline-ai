import {
  BottomSheet,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

import { ImportMaterialContent } from '@/components/materials/import-material-content';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useTheme } from '@/hooks/use-theme';

export function ImportMaterialSheet() {
  const router = useRouter();
  const theme = useTheme();
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
      <BottomSheetView
        style={{ backgroundColor: theme.surfaceElevated, flex: 1 }}
      >
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
