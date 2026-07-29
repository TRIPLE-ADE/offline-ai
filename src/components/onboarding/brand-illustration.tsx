import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Elevation, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function BrandIllustration() {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel="A private document becoming a clear learning path"
      accessibilityRole="image"
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceInverse,
          borderColor: theme.borderStrong,
          shadowColor: theme.shadow,
        },
      ]}>
      <Image
        accessibilityElementsHidden
        contentFit="cover"
        source={require('@/assets/images/learn-guide-onboarding.png')}
        style={StyleSheet.absoluteFill}
        transition={180}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1.9,
    borderRadius: Radius.large,
    borderWidth: 1,
    maxHeight: 210,
    minHeight: 150,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    ...Elevation.card,
  },
});
