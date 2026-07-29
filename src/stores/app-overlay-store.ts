import { create } from 'zustand';

export type ActionSheetRequest = {
  actionLabel: string;
  cancelLabel?: string;
  description: string;
  destructive?: boolean;
  onAction: () => void;
  title: string;
};

type AppOverlayStore = {
  actionSheet: ActionSheetRequest | null;
  importMaterialOpen: boolean;
  offlineAiOpen: boolean;
  closeActionSheet: () => void;
  closeImportMaterial: () => void;
  closeOfflineAi: () => void;
  openImportMaterial: () => void;
  openOfflineAi: () => void;
  showActionSheet: (request: ActionSheetRequest) => void;
};

export const useAppOverlayStore = create<AppOverlayStore>((set) => ({
  actionSheet: null,
  importMaterialOpen: false,
  offlineAiOpen: false,
  closeActionSheet: () => set({ actionSheet: null }),
  closeImportMaterial: () => set({ importMaterialOpen: false }),
  closeOfflineAi: () => set({ offlineAiOpen: false }),
  openImportMaterial: () =>
    set({
      actionSheet: null,
      importMaterialOpen: true,
      offlineAiOpen: false,
    }),
  openOfflineAi: () =>
    set({
      actionSheet: null,
      importMaterialOpen: false,
      offlineAiOpen: true,
    }),
  showActionSheet: (request) =>
    set({
      actionSheet: request,
      importMaterialOpen: false,
      offlineAiOpen: false,
    }),
}));

export function showActionSheet(request: ActionSheetRequest) {
  useAppOverlayStore.getState().showActionSheet(request);
}
