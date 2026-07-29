import { resolveAppearance } from '@/theme/appearance';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(() => null),
    setItemSync: jest.fn(),
  },
}));

describe('appearance resolution', () => {
  it('applies explicit themes without waiting for a native scheme event', () => {
    expect(resolveAppearance('dark', 'light')).toBe('dark');
    expect(resolveAppearance('light', 'dark')).toBe('light');
  });

  it('follows the device when the preference is system', () => {
    expect(resolveAppearance('system', 'dark')).toBe('dark');
    expect(resolveAppearance('system', 'light')).toBe('light');
  });
});
