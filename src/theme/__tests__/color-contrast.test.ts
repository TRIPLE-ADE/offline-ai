import { Colors } from '@/constants/theme';

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string) {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16));
  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${color}`);
  }

  return (
    0.2126 * channelLuminance(channels[0]) +
    0.7152 * channelLuminance(channels[1]) +
    0.0722 * channelLuminance(channels[2])
  );
}

function contrast(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

describe('dark theme accessibility', () => {
  it.each([
    ['primary text', Colors.dark.textPrimary, Colors.dark.background],
    ['secondary text', Colors.dark.textSecondary, Colors.dark.background],
    ['muted text', Colors.dark.textMuted, Colors.dark.background],
    ['primary action', Colors.dark.textOnPrimary, Colors.dark.primary],
    ['disabled action', Colors.dark.textOnDisabled, Colors.dark.primaryDisabled],
    ['success status', Colors.dark.success, Colors.dark.successSoft],
    ['warning status', Colors.dark.warning, Colors.dark.warningSoft],
    ['error status', Colors.dark.error, Colors.dark.errorSoft],
    ['information status', Colors.dark.info, Colors.dark.infoSoft],
    ['code block', Colors.dark.codeText, Colors.dark.codeSurface],
  ])('%s meets normal-text contrast', (_name, foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps page, surface, raised, and selected states visually distinct', () => {
    expect(
      new Set([
        Colors.dark.background,
        Colors.dark.surface,
        Colors.dark.surfaceElevated,
        Colors.dark.surfaceSelected,
      ]).size
    ).toBe(4);
  });
});
