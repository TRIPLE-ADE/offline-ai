import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  search?: boolean;
};

export function TextField({ label, error, search = false, style, ...props }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: error ? theme.error : focused ? theme.focusRing : theme.borderStrong,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}>
        {search ? <Ionicons name="search" color={theme.textSecondary} size={20} /> : null}
        <TextInput
          accessibilityLabel={props.accessibilityLabel ?? label}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.textPrimary }, style]}
          {...props}
        />
      </View>
      {error ? (
        <ThemedText accessibilityLiveRegion="polite" type="small" style={{ color: theme.error }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
  inputShell: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: TouchTarget + 4,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
    minHeight: TouchTarget,
    paddingVertical: Spacing.two,
  },
});
