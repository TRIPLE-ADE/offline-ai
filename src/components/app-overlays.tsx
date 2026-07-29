import { OfflineAiSheet } from '@/components/ai/offline-ai-sheet';
import { ActionSheet } from '@/components/foundation/action-sheet';
import { ImportMaterialSheet } from '@/components/materials/import-material-sheet';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export function AppOverlays() {
  const importMaterialOpen = useAppOverlayStore(
    (state) => state.importMaterialOpen
  );
  const offlineAiOpen = useAppOverlayStore((state) => state.offlineAiOpen);

  return (
    <>
      {importMaterialOpen ? <ImportMaterialSheet /> : null}
      {offlineAiOpen ? <OfflineAiSheet /> : null}
      <ActionSheet />
    </>
  );
}
