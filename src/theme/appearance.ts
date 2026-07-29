import Storage from 'expo-sqlite/kv-store';
import {
  Appearance,
  useColorScheme as useNativeColorScheme,
  type ColorSchemeName,
} from 'react-native';
import { create } from 'zustand';

export type AppearancePreference = 'system' | 'light' | 'dark';

const APPEARANCE_PREFERENCE_KEY = 'learnguide.appearance';

export function getAppearancePreference(): AppearancePreference {
  const value = Storage.getItemSync(APPEARANCE_PREFERENCE_KEY);
  return value === 'light' || value === 'dark' ? value : 'system';
}

type AppearanceStore = {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
};

export const useAppearanceStore = create<AppearanceStore>((set) => ({
  preference: getAppearancePreference(),
  setPreference: (preference) => set({ preference }),
}));

export function setAppearancePreference(preference: AppearancePreference) {
  Storage.setItemSync(APPEARANCE_PREFERENCE_KEY, preference);
  // Update React state before asking the native appearance API to change. This
  // removes the one-frame color lag that was visible in text and navigation.
  useAppearanceStore.getState().setPreference(preference);
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export function initializeAppearancePreference() {
  const preference = getAppearancePreference();
  useAppearanceStore.getState().setPreference(preference);
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

export function resolveAppearance(
  preference: AppearancePreference,
  nativeScheme: ColorSchemeName
) {
  return preference === 'system'
    ? nativeScheme === 'dark'
      ? 'dark'
      : 'light'
    : preference;
}

export function useResolvedAppearance() {
  const preference = useAppearanceStore((state) => state.preference);
  const nativeScheme = useNativeColorScheme();
  return resolveAppearance(preference, nativeScheme);
}
