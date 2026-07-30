import { Platform } from 'react-native';

export const BrandColors = {
  indigo: '#2F46B3',
  warmWhite: '#F8F5EC',
  amber: '#FBC264',
} as const;

/**
 * LearnGuide's semantic palette. Compatibility aliases remain while the existing
 * screens are migrated, but all new UI should use the semantic token names.
 */
export const Colors = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceSelected: '#EEF0FB',
    surfaceTint: '#F7F8FC',
    surfaceInverse: '#151A2F',
    textPrimary: '#151A2F',
    textSecondary: '#676D7C',
    textMuted: '#767C8C',
    textOnPrimary: '#FFFFFF',
    textOnDisabled: '#32394F',
    textOnInverse: '#F8F5EC',
    border: '#E6E7EB',
    borderStrong: '#C9CBD2',
    primary: BrandColors.indigo,
    primaryPressed: '#23358B',
    primaryDisabled: '#B9C0DB',
    primarySoft: '#EEF0FB',
    secondary: BrandColors.indigo,
    secondarySoft: '#EEF0FB',
    milestone: BrandColors.amber,
    milestoneSoft: '#FFF6E3',
    accent: '#7A5200',
    accentSoft: '#FFF6E3',
    success: '#1F7448',
    successSoft: '#E1F2E8',
    warning: '#875900',
    warningSoft: '#FFF4DA',
    error: '#A93636',
    errorSoft: '#FBE7E6',
    info: '#255E9E',
    infoSoft: '#E3EEFA',
    focusRing: '#425CC7',
    scrim: 'rgba(18, 21, 29, 0.52)',
    shadow: 'rgba(21, 26, 47, 0.08)',
    white: '#FFFFFF',
    codeSurface: '#151A2F',
    codeText: '#F8F5EC',

    // Transitional aliases used by the existing offline-learning screens.
    text: '#151A2F',
    textTertiary: '#676D7C',
    surfaceRaised: '#FFFFFF',
    backgroundElement: '#F4F5F7',
    backgroundSelected: '#EEF0FB',
    divider: '#E6E7EB',
    danger: '#A93636',
    dangerSoft: '#FBE7E6',
  },
  dark: {
    // A restrained charcoal-navy scale keeps long reading sessions calm.
    // Indigo is reserved for selection and action rather than every surface.
    background: '#0F1219',
    surface: '#151922',
    surfaceElevated: '#1B202B',
    surfaceSelected: '#242D49',
    surfaceTint: '#181E2A',
    surfaceInverse: '#F4F5F7',
    textPrimary: '#F4F5F7',
    textSecondary: '#B8BFCC',
    textMuted: '#8F98AA',
    textOnPrimary: '#111624',
    textOnDisabled: '#D0D4DE',
    textOnInverse: '#151A2F',
    border: '#2A303D',
    borderStrong: '#3B4454',
    primary: '#AEBEFF',
    primaryPressed: '#C6D0FF',
    primaryDisabled: '#4C556C',
    primarySoft: '#202945',
    secondary: '#AEBEFF',
    secondarySoft: '#202945',
    milestone: '#E2B65F',
    milestoneSoft: '#30291C',
    accent: '#E2B65F',
    accentSoft: '#30291C',
    success: '#78C99E',
    successSoft: '#183126',
    warning: '#E3B65D',
    warningSoft: '#332A19',
    error: '#F09A98',
    errorSoft: '#3A2023',
    info: '#86B8E8',
    infoSoft: '#1B2C3E',
    focusRing: '#B6C2FF',
    scrim: 'rgba(5, 7, 12, 0.74)',
    shadow: 'rgba(0, 0, 0, 0.44)',
    white: '#FFFFFF',
    codeSurface: '#0A0D12',
    codeText: '#E6E9EF',

    // Transitional aliases used by the existing offline-learning screens.
    text: '#F4F5F7',
    textTertiary: '#8F98AA',
    surfaceRaised: '#1B202B',
    backgroundElement: '#202531',
    backgroundSelected: '#242D49',
    divider: '#252B37',
    danger: '#F09A98',
    dangerSoft: '#3A2023',
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
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  floating: {
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
} as const;

export const TouchTarget = 48;
export const MaxContentWidth = 720;
