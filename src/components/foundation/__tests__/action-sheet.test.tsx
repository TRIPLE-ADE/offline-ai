import { act, fireEvent, render } from '@testing-library/react-native';

import { ActionSheet } from '@/components/foundation/action-sheet';
import { useAppOverlayStore } from '@/stores/app-overlay-store';

jest.mock('@expo/ui/community/bottom-sheet', () => {
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    BottomSheet: ({
      children,
    }: {
      children?: import('react').ReactNode;
    }) => <View>{children}</View>,
    BottomSheetView: ({
      children,
    }: {
      children?: import('react').ReactNode;
    }) => <View>{children}</View>,
  };
});

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    error: '#B3261E',
    errorSoft: '#FCE8E6',
    primary: '#2F46B3',
    primaryDisabled: '#A9B2D8',
    primaryPressed: '#24378D',
    primarySoft: '#EEF0FA',
    surfaceElevated: '#FFFFFF',
    textMuted: '#8A8F9C',
    textOnDisabled: '#FFFFFF',
    textOnPrimary: '#FFFFFF',
  }),
}));

jest.mock('@/constants/theme', () => ({
  Fonts: {
    bold: 'System',
    medium: 'System',
    mono: 'monospace',
    regular: 'System',
    semibold: 'System',
  },
  Radius: { medium: 12 },
  Spacing: { one: 4, two: 8, three: 16, four: 24 },
  TouchTarget: 48,
  TypeScale: {
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 12, lineHeight: 16 },
    display: { fontSize: 36, lineHeight: 42 },
    heading: { fontSize: 22, lineHeight: 28 },
    label: { fontSize: 14, lineHeight: 20 },
    subheading: { fontSize: 18, lineHeight: 24 },
    title: { fontSize: 28, lineHeight: 34 },
  },
}));

describe('ActionSheet', () => {
  beforeEach(() => {
    useAppOverlayStore.setState({
      actionSheet: null,
      importMaterialOpen: false,
      offlineAiOpen: false,
    });
  });

  it('runs a confirmed action only once during rapid repeated presses', async () => {
    const action = jest.fn();
    let scheduled: FrameRequestCallback | null = null;
    const requestAnimationFrameSpy = jest
      .spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        scheduled = callback;
        return 1;
      });
    useAppOverlayStore.getState().showActionSheet({
      actionLabel: 'Continue',
      description: 'Confirm this action.',
      onAction: action,
      title: 'Continue?',
    });
    const screen = await render(<ActionSheet />);
    const button = screen.getByRole('button', { name: 'Continue' });

    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(action).not.toHaveBeenCalled();

    const scheduledAction = scheduled as FrameRequestCallback | null;
    if (!scheduledAction) {
      throw new Error('Expected the action to be scheduled');
    }
    await act(() => {
      scheduledAction(0);
    });

    expect(action).toHaveBeenCalledTimes(1);
    requestAnimationFrameSpy.mockRestore();
  });
});
