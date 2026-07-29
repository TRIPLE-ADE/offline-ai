import {
  BottomSheet,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { useRouter } from 'expo-router';

import { ImportMaterialContent } from '@/screens/import-material-screen';
import { useAppOverlayStore } from '@/stores/app-overlay-store';
import { useTheme } from '@/hooks/use-theme';

export function ImportMaterialSheet() {
  const router = useRouter();
  const theme = useTheme();
  const close = useAppOverlayStore((state) => state.closeImportMaterial);

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
          onClose={close}
          onImported={(materialId) => {
            close();
            requestAnimationFrame(() => {
              router.navigate({
                pathname: '/material/[materialId]',
                params: { materialId },
              });
            });
          }}
          presentation="sheet"
        />
      </BottomSheetView>
    </BottomSheet>
  );
}
