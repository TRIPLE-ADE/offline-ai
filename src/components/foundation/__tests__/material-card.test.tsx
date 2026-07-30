import { fireEvent, render } from '@testing-library/react-native';

import { MaterialCard } from '@/components/foundation/material-card';
import type { Material } from '@/db/types';

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    background: '#FFFFFF',
    backgroundElement: '#F4F5F7',
    border: '#E6E7EB',
    borderStrong: '#C9CBD2',
    danger: '#A93636',
    dangerSoft: '#FBE7E6',
    primary: '#2F46B3',
    primarySoft: '#EEF0FB',
    success: '#1F7448',
    successSoft: '#E1F2E8',
    surfaceSelected: '#EEF0FB',
    textPrimary: '#151A2F',
    textSecondary: '#676D7C',
    warning: '#875900',
    warningSoft: '#FFF4DA',
  }),
}));

const material: Material = {
  id: 'material-1',
  title: 'Computer Networks',
  sourceUri: 'file:///source.pdf',
  localUri: 'file:///material.pdf',
  fileType: 'pdf',
  fileSize: 1_048_576,
  sourceFileState: 'available',
  status: 'ready',
  statusMessage: null,
  chunkCount: 10,
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
};

describe('MaterialCard', () => {
  it('opens material options without also opening the material', async () => {
    const onOptionsPress = jest.fn();
    const onPress = jest.fn();
    const screen = await render(
      <MaterialCard
        material={material}
        onOptionsPress={onOptionsPress}
        onPress={onPress}
        topics={[]}
      />
    );

    await fireEvent.press(
      screen.getByRole('button', { name: 'Options for Computer Networks' })
    );

    expect(onOptionsPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Computer Networks. Ready offline',
      })
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
