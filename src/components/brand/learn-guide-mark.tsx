import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type LearnGuideMarkProps = {
  size?: number;
  showName?: boolean;
  inverse?: boolean;
};

export function LearnGuideMark({
  size = 40,
  showName = false,
  inverse = false,
}: LearnGuideMarkProps) {
  const theme = useTheme();
  const background = theme.white;
  const wordmarkPrimary = inverse ? theme.textOnInverse : theme.textPrimary;

  return (
    <View
      accessibilityLabel={Brand.name}
      style={styles.row}>
      <View
        style={[
          styles.mark,
          {
            backgroundColor: background,
            borderColor: theme.border,
            borderRadius: Math.max(Radius.small, size * 0.25),
            height: size,
            width: size,
          },
        ]}>
        <Image
          accessibilityElementsHidden
          contentFit="contain"
          source={require('@/assets/images/icon.png')}
          style={styles.image}
        />
      </View>
      {showName ? (
        <ThemedText style={[styles.name, { color: wordmarkPrimary }]}>
          {Brand.name}
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
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { height: '100%', width: '100%' },
  name: { fontFamily: Fonts.bold, fontSize: 20, letterSpacing: -0.4, lineHeight: 26 },
});
