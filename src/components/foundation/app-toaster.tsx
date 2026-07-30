import { Toaster } from 'sonner-native';

import { Fonts } from '@/constants/theme';
import { useResolvedAppearance } from '@/theme/appearance';
import { useTheme } from '@/hooks/use-theme';

export function AppToaster() {
  const theme = useTheme();
  const appearance = useResolvedAppearance();

  return (
    <Toaster
      allowFontScaling
      closeButton
      duration={5000}
      gap={8}
      offset={16}
      position="bottom-center"
      richColors={true}
      swipeToDismissDirection="left"
      theme={appearance}
      toastOptions={{
        descriptionStyle: {
          color: theme.textSecondary,
          fontFamily: Fonts.regular,
          fontSize: 14,
        },
        style: {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.borderStrong,
          borderRadius: 14,
          borderWidth: 1,
        },
        titleStyle: {
          color: theme.textPrimary,
          fontFamily: Fonts.semibold,
          fontSize: 15,
        },
      }}
      visibleToasts={3}
    />
  );
}
