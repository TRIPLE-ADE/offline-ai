import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheet,
  BottomSheetView,
} from '@expo/ui/community/bottom-sheet';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/foundation/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

export function ActionSheet() {
  const theme = useTheme();
  const request = useAppOverlayStore((state) => state.actionSheet);
  const close = useAppOverlayStore((state) => state.closeActionSheet);
  const confirming = useRef(false);

  if (!request) return null;

  const confirm = () => {
    if (confirming.current) {
      return;
    }
    confirming.current = true;
    close();
    requestAnimationFrame(() => {
      try {
        request.onAction();
      } finally {
        confirming.current = false;
      }
    });
  };

  return (
    <BottomSheet
      backgroundStyle={{ backgroundColor: theme.surface }}
      enableDynamicSizing
      enablePanDownToClose
      index={0}
      onClose={close}
      onDismiss={close}
    >
      <BottomSheetView
        style={styles.container}
      >
        <View
          style={[
            styles.icon,
            {
              backgroundColor: request.destructive
                ? theme.errorSoft
                : theme.primarySoft,
            },
          ]}
        >
          <Ionicons
            color={request.destructive ? theme.error : theme.primary}
            name={
              request.destructive
                ? 'warning-outline'
                : 'information-circle-outline'
            }
            size={28}
          />
        </View>
        <View style={styles.copy}>
          <ThemedText type="heading">{request.title}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {request.description}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label={request.actionLabel}
            onPress={confirm}
            variant={request.destructive ? 'destructive' : 'primary'}
          />
          <PrimaryButton
            label={request.cancelLabel ?? 'Not now'}
            onPress={close}
            variant="tertiary"
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  icon: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  copy: { gap: Spacing.two },
  actions: { gap: Spacing.one },
});
