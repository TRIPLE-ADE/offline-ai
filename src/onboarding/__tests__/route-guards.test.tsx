import { render } from '@testing-library/react-native';

import SetupRoute from '@/app/(screens)/setup';
import TabsLayout from '@/app/(tabs)/_layout';

const mockHasCompletedOnboarding = jest.fn<boolean, []>();

jest.mock('@/onboarding/onboarding-state', () => ({
  hasCompletedOnboarding: () => mockHasCompletedOnboarding(),
}));

jest.mock('@/screens/setup-screen', () => {
  const { Text } =
    jest.requireActual('react-native') as typeof import('react-native');

  return function MockSetupScreen() {
    return <Text>Setup content</Text>;
  };
});

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    border: '#E6E7EB',
    primary: '#2F46B3',
    shadow: '#000000',
    surfaceElevated: '#FFFFFF',
    surfaceSelected: '#EEF0FA',
    textSecondary: '#676D7C',
  }),
}));

jest.mock('@/constants/theme', () => ({
  Fonts: { medium: 'DMSans-Medium', semibold: 'DMSans-Semibold' },
}));

jest.mock('expo-router', () => {
  const { Text } =
    jest.requireActual('react-native') as typeof import('react-native');

  return {
    Redirect: ({ href }: { href: string }) => (
      <Text>{`Redirect:${href}`}</Text>
    ),
    Stack: {
      Screen: () => null,
    },
  };
});

jest.mock('expo-router/unstable-native-tabs', () => {
  const { View } =
    jest.requireActual('react-native') as typeof import('react-native');

  const Trigger = ({ children }: { children?: React.ReactNode }) => (
    <View>{children}</View>
  );
  function MockTriggerIcon() {
    return null;
  }
  function MockTriggerLabel({
    children,
  }: {
    children?: React.ReactNode;
  }) {
    return <View>{children}</View>;
  }
  Trigger.Icon = MockTriggerIcon;
  Trigger.Label = MockTriggerLabel;

  return {
    NativeTabs: Object.assign(
      ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
      { Trigger },
    ),
  };
});

describe('declarative onboarding route guards', () => {
  beforeEach(() => {
    mockHasCompletedOnboarding.mockReset();
  });

  it('redirects a completed learner away from setup without an effect route', async () => {
    mockHasCompletedOnboarding.mockReturnValue(true);

    const screen = await render(<SetupRoute />);

    expect(screen.getByText('Redirect:/home')).toBeTruthy();
    expect(screen.queryByText('Setup content')).toBeNull();
  });

  it('renders setup for a learner who has not completed onboarding', async () => {
    mockHasCompletedOnboarding.mockReturnValue(false);

    const screen = await render(<SetupRoute />);

    expect(screen.getByText('Setup content')).toBeTruthy();
    expect(screen.queryByText('Redirect:/home')).toBeNull();
  });

  it('guards every tab declaratively until onboarding is complete', async () => {
    mockHasCompletedOnboarding.mockReturnValue(false);

    const screen = await render(<TabsLayout />);

    expect(screen.getByText('Redirect:/setup')).toBeTruthy();
  });
});
