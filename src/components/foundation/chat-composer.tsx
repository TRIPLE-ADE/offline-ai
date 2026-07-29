import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  onStop,
  isGenerating,
  materialTitle,
  topicTitle,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isGenerating: boolean;
  materialTitle: string;
  topicTitle?: string;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const disabled = !isGenerating && value.trim().length < 3;

  return (
    <View
      style={[
        styles.composer,
        { backgroundColor: theme.background },
      ]}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: focused ? theme.focusRing : theme.borderStrong,
            borderWidth: focused ? 2 : 1,
          },
        ]}>
        <TextInput
          accessibilityLabel={`Ask ${materialTitle}`}
          editable={!isGenerating}
          maxLength={3000}
          multiline
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          placeholder={topicTitle ? `Ask about ${topicTitle}…` : 'Ask about this material…'}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
        />
        <Pressable
          accessibilityLabel={isGenerating ? 'Stop response' : 'Send question'}
          accessibilityRole="button"
          accessibilityState={{ busy: isGenerating, disabled }}
          disabled={disabled}
          hitSlop={4}
          onPress={isGenerating ? onStop : onSend}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: disabled
                ? theme.primaryDisabled
                : isGenerating
                  ? theme.error
                  : pressed
                    ? theme.primaryPressed
                    : theme.primary,
              transform: [{ scale: pressed && !disabled ? 0.96 : 1 }],
            },
          ]}>
          <Ionicons
            name={isGenerating ? 'stop' : 'arrow-up'}
            color={disabled ? theme.textOnDisabled : theme.textOnPrimary}
            size={20}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  inputContainer: {
    alignItems: 'flex-end',
    borderCurve: 'continuous',
    borderRadius: Radius.large,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 56,
    paddingBottom: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingTop: Spacing.one,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 128,
    minHeight: TouchTarget,
    paddingHorizontal: 0,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  send: {
    alignItems: 'center',
    borderRadius: Radius.full,
    height: TouchTarget,
    justifyContent: 'center',
    width: TouchTarget,
  },
});
