import {
  EnrichedMarkdownText,
  type LinkPressEvent,
  type MarkdownStyle,
} from 'react-native-enriched-markdown';
import { useCallback, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { showActionSheet } from '@/stores/app-overlay-store';
import { toast } from '@/utils/app-toast';

const MARKDOWN_FLAGS = {
  highlight: true,
  latexMath: false,
} as const;

const STREAMING_CONFIG = {
  tableMode: 'progressive',
} as const;

const SELECTION_MENU_CONFIG = {
  copy: { label: 'Copy' },
  copyAsMarkdown: { enabled: true, label: 'Copy as Markdown' },
  copyImageUrl: { enabled: false },
} as const;

/**
 * Generated answers should not silently load remote images in an offline-first
 * chat. Preserve the alternative text while removing the network-bearing image.
 */
export function prepareMarkdownForDisplay(markdown: string) {
  return markdown
    .replace(/!\[([^\]]*)\]\(([^)\n]+)\)/g, (_, alt: string) =>
      alt.trim() ? `_[Image: ${alt.trim()}]_` : '_[Image omitted]_',
    )
    .replace(/<img\b[^>]*>/gi, '_[Image omitted]_');
}

function isSupportedExternalLink(url: string) {
  const normalizedUrl = url.trim().toLowerCase();
  return normalizedUrl.startsWith('https://') || normalizedUrl.startsWith('http://');
}

export function MarkdownContent({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const theme = useTheme();
  const markdown = useMemo(() => prepareMarkdownForDisplay(content), [content]);
  const markdownStyle = useMemo<MarkdownStyle>(
    () => ({
      paragraph: {
        ...TypeScale.body,
        color: theme.textPrimary,
        fontFamily: Fonts.regular,
        marginBottom: Spacing.three,
      },
      h1: {
        color: theme.textPrimary,
        fontFamily: Fonts.bold,
        fontSize: 25,
        lineHeight: 31,
        marginBottom: Spacing.two,
        marginTop: Spacing.four,
      },
      h2: {
        color: theme.textPrimary,
        fontFamily: Fonts.bold,
        fontSize: 21,
        lineHeight: 27,
        marginBottom: Spacing.two,
        marginTop: Spacing.three,
      },
      h3: {
        color: theme.textPrimary,
        fontFamily: Fonts.semibold,
        fontSize: 18,
        lineHeight: 24,
        marginBottom: Spacing.one,
        marginTop: Spacing.three,
      },
      h4: {
        color: theme.textPrimary,
        fontFamily: Fonts.semibold,
        fontSize: 16,
        lineHeight: 22,
        marginBottom: Spacing.one,
        marginTop: Spacing.two,
      },
      h5: {
        color: theme.textSecondary,
        fontFamily: Fonts.semibold,
        fontSize: 15,
        lineHeight: 21,
        marginBottom: Spacing.one,
        marginTop: Spacing.two,
      },
      h6: {
        color: theme.textSecondary,
        fontFamily: Fonts.semibold,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: Spacing.one,
        marginTop: Spacing.two,
      },
      blockquote: {
        ...TypeScale.body,
        backgroundColor: theme.secondarySoft,
        borderColor: theme.secondary,
        borderWidth: 3,
        color: theme.textPrimary,
        fontFamily: Fonts.regular,
        gapWidth: Spacing.three,
        marginBottom: Spacing.three,
      },
      list: {
        ...TypeScale.body,
        bulletColor: theme.primary,
        bulletSize: 5,
        color: theme.textPrimary,
        fontFamily: Fonts.regular,
        gapWidth: Spacing.two,
        marginBottom: Spacing.three,
        marginLeft: Spacing.three,
        markerColor: theme.primary,
        markerFontWeight: '600',
        markerMinWidth: Spacing.four,
      },
      codeBlock: {
        backgroundColor: theme.codeSurface,
        borderColor: theme.border,
        borderRadius: Radius.medium,
        borderWidth: StyleSheet.hairlineWidth,
        color: theme.codeText,
        fontFamily: Fonts.mono,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: Spacing.three,
        padding: Spacing.three,
      },
      code: {
        backgroundColor: theme.backgroundElement,
        borderColor: theme.border,
        color: theme.textPrimary,
        fontFamily: Fonts.mono,
        fontSize: 14,
      },
      strong: {
        color: theme.textPrimary,
        fontFamily: Fonts.semibold,
        fontWeight: 'normal',
      },
      em: {
        color: theme.textPrimary,
      },
      link: {
        color: theme.primary,
        fontFamily: Fonts.semibold,
        underline: true,
      },
      strikethrough: {
        color: theme.textMuted,
      },
      thematicBreak: {
        color: theme.border,
        height: StyleSheet.hairlineWidth,
        marginBottom: Spacing.three,
        marginTop: Spacing.three,
      },
      table: {
        borderColor: theme.borderStrong,
        borderRadius: Radius.medium,
        borderWidth: StyleSheet.hairlineWidth,
        cellPaddingHorizontal: Spacing.two,
        cellPaddingVertical: Spacing.two,
        color: theme.textPrimary,
        fontFamily: Fonts.regular,
        fontSize: 14,
        headerBackgroundColor: theme.primarySoft,
        headerFontFamily: Fonts.semibold,
        headerTextColor: theme.textPrimary,
        lineHeight: 20,
        marginBottom: Spacing.three,
        rowEvenBackgroundColor: theme.surface,
        rowOddBackgroundColor: theme.surfaceElevated,
      },
      taskList: {
        borderColor: theme.borderStrong,
        checkedColor: theme.primary,
        checkedStrikethrough: true,
        checkedTextColor: theme.textSecondary,
        checkboxBorderRadius: 4,
        checkboxSize: 18,
        checkmarkColor: theme.textOnPrimary,
      },
      highlight: {
        backgroundColor: theme.primarySoft,
        color: theme.textPrimary,
      },
    }),
    [theme],
  );

  const handleLinkPress = useCallback(({ url }: LinkPressEvent) => {
    if (!isSupportedExternalLink(url)) {
      toast.error('Link unavailable', {
        description: 'Only web links can be opened from answers.',
      });
      return;
    }

    showActionSheet({
      actionLabel: 'Open',
      cancelLabel: 'Cancel',
      description: url,
      onAction: () => {
        void Linking.openURL(url).catch(() => {
          toast.error('Could not open link', {
            description: 'Try opening the link again from your browser.',
          });
        });
      },
      title: 'Open external link?',
    });
  }, []);

  return (
    <EnrichedMarkdownText
      allowTrailingMargin={false}
      containerStyle={styles.container}
      enableLinkPreview={false}
      flavor="github"
      markdown={markdown}
      markdownStyle={markdownStyle}
      md4cFlags={MARKDOWN_FLAGS}
      onLinkPress={handleLinkPress}
      selectable
      selectionColor={theme.primarySoft}
      selectionHandleColor={theme.primary}
      selectionMenuConfig={SELECTION_MENU_CONFIG}
      streamingAnimation={isStreaming}
      streamingConfig={STREAMING_CONFIG}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
