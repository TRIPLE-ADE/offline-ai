import '@/global.css';

import { Platform } from 'react-native';

const shared = {
  primary: '#3346B8',
  primaryPressed: '#273795',
  primarySoft: '#E8EBFB',
  secondary: '#247A78',
  secondarySoft: '#DFF2EF',
  success: '#237A4B',
  successSoft: '#E0F2E7',
  warning: '#986300',
  warningSoft: '#FFF0CC',
  danger: '#B33A3A',
  dangerSoft: '#FBE7E6',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    ...shared,
    text: '#1A1C24',
    textSecondary: '#5D606D',
    textTertiary: '#787B87',
    background: '#FAF8F3',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    backgroundElement: '#F1EFE9',
    backgroundSelected: '#E5E3DD',
    border: '#DEDCD5',
    divider: '#E8E5DE',
    scrim: 'rgba(21, 22, 28, 0.44)',
  },
  dark: {
    ...shared,
    primary: '#A9B3FF',
    primaryPressed: '#C1C8FF',
    primarySoft: '#252B4F',
    secondary: '#78CDC8',
    secondarySoft: '#173D3B',
    success: '#72C991',
    successSoft: '#173A27',
    warning: '#F0C36A',
    warningSoft: '#463614',
    danger: '#F2A09B',
    dangerSoft: '#4A2222',
    text: '#F4F2EE',
    textSecondary: '#C2C0BA',
    textTertiary: '#9C9A95',
    background: '#17181D',
    surface: '#202127',
    surfaceRaised: '#292A31',
    backgroundElement: '#26272D',
    backgroundSelected: '#32343C',
    border: '#3B3D45',
    divider: '#303139',
    scrim: 'rgba(0, 0, 0, 0.62)',
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
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 24,
  full: 999,
} as const;

export const TouchTarget = 48;
export const BottomTabInset = Platform.select({ ios: 82, android: 88 }) ?? 88;
export const MaxContentWidth = 720;
