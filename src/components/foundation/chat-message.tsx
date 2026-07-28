import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CitationControl } from '@/components/foundation/citation-control';
import { MarkdownContent } from '@/components/foundation/markdown-content';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import type { ChatMessage as StoredChatMessage, StoredCitation } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export const ChatMessage = memo(function ChatMessage({
  message,
  onCitationPress,
}: {
  message: StoredChatMessage;
  onCitationPress: (citation: StoredCitation) => void;
}) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const unavailable =
    message.role === 'assistant' &&
    (message.content.includes('can’t answer that from this material') ||
      message.content.includes('couldn’t find enough information'));

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.primary }]}>
          <ThemedText selectable style={{ color: theme.textOnPrimary }}>
            {message.content}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <View style={styles.assistantIdentity}>
        <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="book-outline" color={theme.primary} size={16} />
        </View>
        <ThemedText type="smallBold">Soma</ThemedText>
        <View style={[styles.offlineDot, { backgroundColor: theme.secondary }]} />
        <ThemedText type="caption" themeColor="textMuted">
          On device
        </ThemedText>
      </View>

      <View
        style={[
          styles.assistantContent,
          unavailable && {
            backgroundColor: theme.warningSoft,
            borderColor: theme.warning,
          },
        ]}>
        {!message.content ? (
          <View
            accessibilityLabel="Finding the most relevant passages"
            accessibilityLiveRegion="polite"
            style={styles.typing}>
            <ActivityIndicator color={theme.primary} size="small" />
            <View style={styles.flex}>
              <ThemedText type="smallBold">Reading the relevant passages</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Your answer is being prepared locally.
              </ThemedText>
            </View>
          </View>
        ) : (
          <MarkdownContent
            content={message.content}
            isStreaming={message.status === 'pending'}
          />
        )}
        {message.status === 'interrupted' ? (
          <View style={styles.statusRow}>
            <Ionicons name="pause-circle-outline" color={theme.textMuted} size={15} />
            <ThemedText type="caption" themeColor="textSecondary">
              Response stopped. The partial answer is saved.
            </ThemedText>
          </View>
        ) : null}
        {message.status === 'failed' ? (
          <View style={styles.statusRow}>
            <Ionicons name="alert-circle-outline" color={theme.error} size={15} />
            <ThemedText type="caption" style={{ color: theme.error }}>
              The answer was interrupted. Ask again when the offline AI is ready.
            </ThemedText>
          </View>
        ) : null}

        {message.citations.length > 0 ? (
          <View style={[styles.citations, { borderTopColor: theme.border }]}>
            <View style={styles.sourcesHeading}>
              <Ionicons name="shield-checkmark-outline" color={theme.secondary} size={15} />
              <ThemedText type="caption" themeColor="textSecondary">
                Sources used
              </ThemedText>
            </View>
            <View style={styles.citationRow}>
              {message.citations.map((citation) => (
                <CitationControl
                  compact
                  key={`${message.id}-${citation.chunkId}`}
                  citation={citation}
                  onPress={() => onCitationPress(citation)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  userRow: { alignItems: 'flex-end', width: '100%' },
  userBubble: {
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    borderBottomRightRadius: Radius.small,
    maxWidth: '82%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  assistantRow: { alignSelf: 'stretch', gap: Spacing.two },
  assistantIdentity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.oneHalf,
  },
  avatar: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: Radius.small,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  offlineDot: { borderRadius: Radius.full, height: 6, marginLeft: Spacing.half, width: 6 },
  assistantContent: {
    borderColor: 'transparent',
    borderCurve: 'continuous',
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.two,
    paddingLeft: 36,
    paddingRight: Spacing.one,
  },
  typing: { alignItems: 'center', flexDirection: 'row', gap: Spacing.two, minHeight: 48 },
  flex: { flex: 1 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one },
  citations: { borderTopWidth: StyleSheet.hairlineWidth, gap: Spacing.two, marginTop: Spacing.one, paddingTop: Spacing.two },
  sourcesHeading: { alignItems: 'center', flexDirection: 'row', gap: Spacing.one },
  citationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
