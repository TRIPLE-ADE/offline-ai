import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import type { StoredCitation } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export function SourcePreviewSheet({
  citation,
  materialTitle,
  onClose,
}: {
  citation: StoredCitation | null;
  materialTitle?: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={citation !== null}>
      <View style={[styles.scrim, { backgroundColor: theme.scrim }]}>
        <Pressable accessibilityLabel="Close source preview" onPress={onClose} style={styles.dismiss} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surfaceElevated,
              borderTopColor: theme.primary,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <View style={styles.header}>
            <View style={styles.flex}>
              <ThemedText type="caption" style={{ color: theme.primary }}>
                SUPPORTING SOURCE
              </ThemedText>
              <ThemedText type="subtitle">{materialTitle ?? citation?.label}</ThemedText>
              {citation ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {citation.label}
                  {citation.pageStart ? ` · Page ${citation.pageStart}` : ''}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              accessibilityLabel="Close source preview"
              hitSlop={8}
              onPress={onClose}
              style={[styles.close, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="close" color={theme.text} size={22} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText themeColor="textSecondary">Relevant passage</ThemedText>
            <View style={[styles.quote, { borderLeftColor: theme.primary }]}>
              <ThemedText>{citation?.excerpt}</ThemedText>
            </View>
            <ThemedText type="small" themeColor="textTertiary">
              This passage was stored when the material was prepared offline.
            </ThemedText>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  dismiss: { flex: 1 },
  sheet: {
    borderTopWidth: 4,
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    maxHeight: '76%',
    minHeight: 320,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    borderRadius: Radius.full,
    height: 4,
    marginBottom: Spacing.three,
    width: 40,
  },
  header: { alignItems: 'flex-start', flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1, gap: Spacing.one },
  close: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
  content: { gap: Spacing.three, paddingVertical: Spacing.four },
  quote: { borderLeftWidth: 3, paddingLeft: Spacing.three },
});
