import '@/global.css';

import { Platform } from 'react-native';

export const BrandColors = {
  indigo: '#2F46B3',
  warmWhite: '#FAF8F2',
  amber: '#FBC264',
} as const;

/**
 * Soma's semantic palette. Compatibility aliases remain while the existing
 * screens are migrated, but all new UI should use the semantic token names.
 */
export const Colors = {
  light: {
    background: '#FAFAFA',
    surface: '#FFFDF8',
    surfaceElevated: '#FFFFFF',
    surfaceSelected: '#E7EBFB',
    surfaceTint: '#F1F3FC',
    surfaceInverse: '#151A2F',
    textPrimary: '#151A2F',
    textSecondary: '#4C5264',
    textMuted: '#676D7C',
    textOnPrimary: '#FFFFFF',
    textOnDisabled: '#32394F',
    textOnInverse: '#F8F5EC',
    border: '#D9D8D2',
    borderStrong: '#A9A9A4',
    primary: BrandColors.indigo,
    primaryPressed: '#23358B',
    primaryDisabled: '#B9C0DB',
    primarySoft: '#E5E9FA',
    secondary: '#147B75',
    secondarySoft: '#DDF1ED',
    accent: '#9B681C',
    accentSoft: '#F7E8C8',
    success: '#1F7448',
    successSoft: '#E1F2E8',
    warning: '#875900',
    warningSoft: '#FFF0C7',
    error: '#A93636',
    errorSoft: '#FBE7E6',
    info: '#255E9E',
    infoSoft: '#E3EEFA',
    focusRing: '#425CC7',
    scrim: 'rgba(18, 21, 29, 0.52)',
    shadow: 'rgba(21, 26, 47, 0.12)',
    white: '#FFFFFF',

    // Transitional aliases used by the existing offline-learning screens.
    text: '#151A2F',
    textTertiary: '#676D7C',
    surfaceRaised: '#FFFFFF',
    backgroundElement: '#EEEDE7',
    backgroundSelected: '#E7EBFB',
    divider: '#D9D8D2',
    danger: '#A93636',
    dangerSoft: '#FBE7E6',
  },
  dark: {
    background: '#0E1325',
    surface: '#171D32',
    surfaceElevated: '#202740',
    surfaceSelected: '#29345D',
    surfaceTint: '#1C2443',
    surfaceInverse: '#F8F5EC',
    textPrimary: '#F8F5EC',
    textSecondary: '#CCD1DF',
    textMuted: '#AAB1C1',
    textOnPrimary: '#11172A',
    textOnDisabled: '#D8DCE8',
    textOnInverse: '#151A2F',
    border: '#353D59',
    borderStrong: '#606A86',
    primary: '#B9C4FF',
    primaryPressed: '#D6DCFF',
    primaryDisabled: '#525B79',
    primarySoft: '#27325D',
    secondary: '#79D4CC',
    secondarySoft: '#173D3B',
    accent: '#F0C36A',
    accentSoft: '#433618',
    success: '#80D6A1',
    successSoft: '#173A27',
    warning: '#F5C56B',
    warningSoft: '#463614',
    error: '#FFAAA5',
    errorSoft: '#4A2222',
    info: '#91C7FF',
    infoSoft: '#1C344E',
    focusRing: '#C2CBFF',
    scrim: 'rgba(0, 0, 0, 0.68)',
    shadow: 'rgba(0, 0, 0, 0.34)',
    white: '#FFFFFF',

    // Transitional aliases used by the existing offline-learning screens.
    text: '#F6F7FA',
    textTertiary: '#A8AFBD',
    surfaceRaised: '#222630',
    backgroundElement: '#242A3D',
    backgroundSelected: '#29345D',
    divider: '#353D59',
    danger: '#FFAAA5',
    dangerSoft: '#4A2222',
  },
} as const;

export type AppTheme = typeof Colors.light | typeof Colors.dark;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  mono:
    Platform.select({
      ios: 'ui-monospace',
      android: 'monospace',
      web: 'var(--font-mono)',
    }) ?? 'monospace',
} as const;

export const TypeScale = {
  display: { fontSize: 36, lineHeight: 42 },
  title: { fontSize: 28, lineHeight: 34 },
  heading: { fontSize: 22, lineHeight: 28 },
  subheading: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;

export const Spacing = {
  none: 0,
  half: 2,
  one: 4,
  oneHalf: 6,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

export const Radius = {
  small: 7,
  medium: 12,
  large: 18,
  xlarge: 28,
  full: 999,
} as const;

export const Elevation = {
  card: {
    elevation: 2,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  floating: {
    elevation: 5,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
} as const;

export const TouchTarget = 48;
export const MaxContentWidth = 720;
