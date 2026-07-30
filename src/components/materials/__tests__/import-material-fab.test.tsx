import { fireEvent, render } from '@testing-library/react-native';

import { ImportMaterialFab } from '@/components/materials/import-material-fab';

jest.mock('@/constants/theme', () => ({
  Elevation: { floating: {} },
  Radius: { full: 999 },
  Spacing: { two: 8, three: 16, four: 24 },
  TouchTarget: 48,
}));

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    primary: '#2F46B3',
    primaryPressed: '#23358B',
    shadow: 'rgba(21, 26, 47, 0.08)',
    textOnPrimary: '#FFFFFF',
  }),
}));

describe('Import material floating action', () => {
  it('opens material import from a tab-aware bottom position', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <ImportMaterialFab bottomInset={72} onPress={onPress} />
    );

    const button = screen.getByRole('button', { name: 'Import material' });
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bottom: 88 }),
      ])
    );

    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
