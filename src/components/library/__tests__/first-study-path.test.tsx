import { fireEvent, render } from '@testing-library/react-native';

import { FirstStudyPath } from '@/components/library/first-study-path';

jest.mock('@/constants/theme', () => ({
  Radius: { full: 999, large: 20, medium: 14, small: 10 },
  Spacing: {
    half: 2,
    one: 4,
    oneHalf: 6,
    two: 8,
    three: 12,
    four: 16,
    five: 24,
    six: 32,
  },
  TouchTarget: 44,
}));

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    border: '#E6E7EB',
    primary: '#2F46B3',
    primaryPressed: '#24378D',
    primarySoft: '#EEF0FA',
    secondary: '#2F46B3',
    secondarySoft: '#EEF0FA',
    surfaceElevated: '#FFFFFF',
    surfaceTint: '#F7F7F8',
    textMuted: '#8A8F9C',
    textOnDisabled: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
  }),
}));

jest.mock('@/components/themed-text', () => {
  const { Text } = jest.requireActual('react-native') as typeof import('react-native');

  return {
    ThemedText: ({
      children,
      ...props
    }: import('react-native').TextProps) => <Text {...props}>{children}</Text>,
  };
});

describe('Home empty state', () => {
  it('welcomes a learner with optional import and model actions', async () => {
    const onImport = jest.fn();
    const onDownloadAi = jest.fn();
    const screen = await render(
      <FirstStudyPath onDownloadAi={onDownloadAi} onImport={onImport} />
    );

    expect(screen.getByText('Ready when you are')).toBeTruthy();
    expect(
      screen.getByText(
        'You can explore now and download the AI model whenever you’re ready.'
      )
    ).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Import material' })
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'Download offline AI' })
    );

    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onDownloadAi).toHaveBeenCalledTimes(1);
  });

  it('hides the model action after installation', async () => {
    const screen = await render(<FirstStudyPath onImport={jest.fn()} />);

    expect(screen.queryByText('Download offline AI')).toBeNull();
    expect(
      screen.queryByText(
        'You can explore now and download the AI model whenever you’re ready.'
      )
    ).toBeNull();
  });
});
