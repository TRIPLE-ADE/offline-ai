import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SomaMarkProps = {
  size?: number;
  showName?: boolean;
  inverse?: boolean;
};

export function SomaMark({
  size = 40,
  showName = false,
  inverse = false,
}: SomaMarkProps) {
  const theme = useTheme();
  const background = inverse ? theme.surfaceInverse : BrandColors.indigo;
  const foreground = inverse ? theme.textOnInverse : BrandColors.warmWhite;

  return (
    <View
      accessibilityLabel={showName ? 'Soma Offline' : 'Soma'}
      style={styles.row}>
      <View
        style={[
          styles.mark,
          {
            backgroundColor: background,
            borderRadius: Math.max(Radius.small, size * 0.25),
            height: size,
            width: size,
          },
        ]}>
        <Image
          accessibilityElementsHidden
          contentFit="contain"
          source={require('@/assets/images/soma-mark.png')}
          style={styles.image}
          tintColor={inverse ? foreground : undefined}
        />
      </View>
      {showName ? (
        <ThemedText
          style={[
            styles.name,
            { color: inverse ? theme.textOnInverse : theme.textPrimary },
          ]}>
          Soma
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two },
  mark: {
    alignItems: 'center',
    borderCurve: 'continuous',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { height: '100%', width: '100%' },
  name: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.4, lineHeight: 26 },
});
