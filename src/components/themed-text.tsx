import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, TypeScale, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'subtitle'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  maxFontSizeMultiplier = 1.6,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        { color: theme[themeColor ?? 'text'] },
        styles[type],
        type === 'linkPrimary' && { color: theme.primary },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...TypeScale.body,
    fontFamily: Fonts.regular,
  },
  display: {
    ...TypeScale.display,
    fontFamily: Fonts.bold,
    letterSpacing: -0.7,
  },
  title: {
    ...TypeScale.title,
    fontFamily: Fonts.bold,
    letterSpacing: -0.4,
  },
  subtitle: {
    ...TypeScale.heading,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.2,
  },
  heading: {
    ...TypeScale.subheading,
    fontFamily: Fonts.semibold,
  },
  small: {
    ...TypeScale.label,
    fontFamily: Fonts.regular,
  },
  smallBold: {
    ...TypeScale.label,
    fontFamily: Fonts.semibold,
  },
  caption: {
    ...TypeScale.caption,
    fontFamily: Fonts.medium,
  },
  link: {
    ...TypeScale.label,
    fontFamily: Fonts.medium,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    ...TypeScale.label,
    fontFamily: Fonts.semibold,
  },
  code: {
    ...TypeScale.caption,
    fontFamily: Fonts.mono,
  },
});
